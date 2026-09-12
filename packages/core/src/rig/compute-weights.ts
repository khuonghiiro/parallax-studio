import type { BoneHierarchy, Point2D } from '@parallax/contracts';
import type { VertexWeight, BoneInfluence } from '@parallax/contracts';

/**
 * Compute automatic bone weights for each mesh vertex
 * using a distance-based envelope approach.
 *
 * Each vertex is influenced by nearby bones based on distance.
 * The algorithm finds the closest bones to each vertex and assigns
 * weights inversely proportional to distance.
 *
 * @param vertices Flat vertex array [x0, y0, x1, y1, ...].
 * @param hierarchy Bone hierarchy with positions.
 * @param maxInfluences Maximum bone influences per vertex (1-4).
 * @param falloff Distance falloff exponent. Higher = sharper falloff.
 * @returns Per-vertex weight assignments.
 */
export function computeAutoWeights(
  vertices: readonly number[],
  hierarchy: BoneHierarchy,
  maxInfluences: number = 4,
  falloff: number = 3.5,
): VertexWeight[] {
  const clampedMax = Math.max(1, Math.min(4, maxInfluences));
  const vertexCount = vertices.length / 2;
  const weights: VertexWeight[] = [];

  for (let vi = 0; vi < vertexCount; vi++) {
    const vx = vertices[vi * 2]!;
    const vy = vertices[vi * 2 + 1]!;
    const point: Point2D = { x: vx, y: vy };

    // Compute distance to each bone segment with anatomical zone affinity
    const boneDistances = hierarchy.bones.map((bone) => {
      let d = distanceToSegment(point, bone.head, bone.tail);
      const bName = bone.name.toLowerCase();

      // 1. Bilateral isolation (strictly isolate left and right limbs)
      if (bName.includes('_l') && point.x > 5) {
        d *= 1000;
      } else if (bName.includes('_r') && point.x < -5) {
        d *= 1000;
      }

      // 2. Head & Helmet zone (y > 330)
      if (point.y > 330) {
        if (bName.includes('head') || bName.includes('neck')) {
          d *= 0.9;
        } else {
          d *= 1000;
        }
      }

      // 3. Torso Core Zone (|x| <= 135, y >= -40 && y <= 330)
      // Protect chestplate, abdomen, and belt from being pulled by arms or legs
      if (Math.abs(point.x) <= 135 && point.y >= -40 && point.y <= 330) {
        if (bName === 'spine' || bName === 'root') {
          d *= 0.9;
        } else {
          d *= 100;
        }
      }

      // 4. Arms & Hands Zone (|x| >= 100, y >= -250 && y <= 340)
      // Hands hang at y in [-200, 0]. They MUST bind to arm/hand bones, NOT legs!
      if (Math.abs(point.x) >= 100 && point.y >= -250 && point.y <= 340) {
        if (bName.includes('arm') || bName.includes('hand')) {
          d *= 0.8;
        } else if (bName.includes('thigh') || bName.includes('shin') || bName.includes('foot')) {
          d *= 1000;
        }
      }

      // 5. Legs & Boots Zone (y < -40, |x| <= 175)
      // Legs MUST NOT be pulled by arms, hands, head, or neck
      if (point.y < -40 && Math.abs(point.x) <= 175) {
        if (bName.includes('thigh') || bName.includes('shin') || bName.includes('foot') || bName === 'root') {
          d *= 0.9;
        } else if (bName.includes('arm') || bName.includes('hand') || bName.includes('head')) {
          d *= 1000;
        }
      }

      // 6. Cape (Outer background zones: |x| > 180 and y < 200)
      // Cape hangs from shoulders/torso, should NOT be torn apart by arm/leg joints
      if (Math.abs(point.x) > 180 && point.y < 200) {
        if (bName.includes('forearm') || bName.includes('hand') || bName.includes('shin') || bName.includes('foot')) {
          d *= 20;
        }
      }

      return {
        boneId: bone.id,
        distance: d,
      };
    });

    // Sort by distance ascending
    boneDistances.sort((a, b) => a.distance - b.distance);

    // Take top N closest bones
    const topBones = boneDistances.slice(0, clampedMax);

    // Convert distances to weights using inverse distance weighting
    const influences = computeInfluences(topBones, falloff);

    weights.push({
      vertexIndex: vi,
      influences,
    });
  }

  return weights;
}

/**
 * Compute normalized influences from bone distances.
 */
function computeInfluences(
  boneDistances: readonly { boneId: string; distance: number }[],
  falloff: number,
): BoneInfluence[] {
  // Minimum distance to prevent division by zero
  const MIN_DISTANCE = 0.001;

  // Compute raw weights as inverse distance
  const rawWeights = boneDistances.map((bd) => ({
    boneId: bd.boneId,
    weight: 1.0 / Math.pow(Math.max(bd.distance, MIN_DISTANCE), falloff),
  }));

  // Normalize so sum = 1.0
  const totalWeight = rawWeights.reduce(
    (sum: number, w: { weight: number }) => sum + w.weight,
    0,
  );

  if (totalWeight === 0) {
    // Fallback: equal weight distribution
    const equal = 1.0 / rawWeights.length;
    return rawWeights.map((w) => ({
      boneId: w.boneId,
      weight: equal,
    }));
  }

  return rawWeights.map((w) => ({
    boneId: w.boneId,
    weight: w.weight / totalWeight,
  }));
}

/**
 * Compute the minimum distance from a point to a line segment.
 * The bone is treated as a segment from head to tail.
 */
function distanceToSegment(
  point: Point2D,
  segStart: Point2D,
  segEnd: Point2D,
): number {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Degenerate segment (zero length)
    const px = point.x - segStart.x;
    const py = point.y - segStart.y;
    return Math.sqrt(px * px + py * py);
  }

  // Project point onto the segment, clamped to [0, 1]
  let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  // Closest point on segment
  const closestX = segStart.x + t * dx;
  const closestY = segStart.y + t * dy;

  const diffX = point.x - closestX;
  const diffY = point.y - closestY;

  return Math.sqrt(diffX * diffX + diffY * diffY);
}
