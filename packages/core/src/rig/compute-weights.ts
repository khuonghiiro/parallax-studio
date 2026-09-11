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
  falloff: number = 2.0,
): VertexWeight[] {
  const clampedMax = Math.max(1, Math.min(4, maxInfluences));
  const vertexCount = vertices.length / 2;
  const weights: VertexWeight[] = [];

  for (let vi = 0; vi < vertexCount; vi++) {
    const vx = vertices[vi * 2]!;
    const vy = vertices[vi * 2 + 1]!;
    const point: Point2D = { x: vx, y: vy };

    // Compute distance to each bone segment
    const boneDistances = hierarchy.bones.map((bone) => ({
      boneId: bone.id,
      distance: distanceToSegment(point, bone.head, bone.tail),
    }));

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
