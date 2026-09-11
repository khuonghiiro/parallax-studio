import type { MorphTarget, Point2D } from '@parallax/contracts';

/**
 * Active morph target blending input.
 */
export interface MorphBlendInput {
  readonly target: MorphTarget;
  /** Blend weight in [0, 1]. Overrides target.weight if specified. */
  readonly weight?: number;
}

/**
 * Apply additive morph targets to a flat vertex buffer in rest space.
 *
 * Invariant per DEFORMATION_PIPELINE.md:
 * 1. Accumulate every delta * weight across active targets.
 * 2. Morph targets must match the exact vertex count of the base mesh.
 * 3. Additive blending: accumulation order is commutative.
 *
 * @param baseVertices Flat vertex positions [x0, y0, x1, y1, ...] in rest space.
 * @param targets Active morph targets with their respective weights.
 * @returns Deformed flat vertex array.
 * @throws Error if any morph target delta count does not match the base mesh vertex count.
 */
export function applyMorphTargets(
  baseVertices: readonly number[],
  targets: readonly MorphBlendInput[],
): number[] {
  const vertexCount = baseVertices.length / 2;
  const result = [...baseVertices];

  for (const input of targets) {
    const { target } = input;
    const weight = Math.max(0, Math.min(1, input.weight ?? target.weight));

    if (weight === 0) {
      continue;
    }

    if (target.deltas.length !== vertexCount) {
      const msg = `Morph target '${target.name}' deltas count (${target.deltas.length}) `
        + `does not match vertex count (${vertexCount})`;
      throw new Error(msg);
    }

    for (let i = 0; i < vertexCount; i++) {
      const delta = target.deltas[i]!;
      result[i * 2] += delta.x * weight;
      result[i * 2 + 1] += delta.y * weight;
    }
  }

  return result;
}

/**
 * Synthesize standard facial morph targets based on vertex positions and center landmarks.
 *
 * @param vertices Flat vertex array [x0, y0, ...].
 * @param eyeCenter Estimated eye center in rest space.
 * @param mouthCenter Estimated mouth center in rest space.
 * @returns Array of standard morph targets: blink, smile, mouth_open.
 */
export function synthesizeFacialMorphTargets(
  vertices: readonly number[],
  eyeCenter: Point2D = { x: 0, y: 150 },
  mouthCenter: Point2D = { x: 0, y: 100 },
): MorphTarget[] {
  const count = vertices.length / 2;

  const blinkDeltas: Point2D[] = [];
  const mouthDeltas: Point2D[] = [];
  const smileDeltas: Point2D[] = [];

  for (let i = 0; i < count; i++) {
    const vx = vertices[i * 2]!;
    const vy = vertices[i * 2 + 1]!;

    // Blink: vertices above eye center move downward towards eyelid fold
    const eyeDist = Math.hypot(vx - eyeCenter.x, vy - eyeCenter.y);
    if (eyeDist < 40 && vy > eyeCenter.y - 10) {
      const influence = Math.max(0, 1 - eyeDist / 40);
      blinkDeltas.push({ x: 0, y: -8 * influence });
    } else {
      blinkDeltas.push({ x: 0, y: 0 });
    }

    // Mouth Open: lower lip vertices move downwards
    const mouthDist = Math.hypot(vx - mouthCenter.x, vy - mouthCenter.y);
    if (mouthDist < 35) {
      const influence = Math.max(0, 1 - mouthDist / 35);
      const isLower = vy < mouthCenter.y;
      mouthDeltas.push({ x: 0, y: (isLower ? -12 : 2) * influence });
    } else {
      mouthDeltas.push({ x: 0, y: 0 });
    }

    // Smile: mouth corners flare upward and outward
    if (mouthDist < 45) {
      const influence = Math.max(0, 1 - mouthDist / 45);
      const side = vx >= mouthCenter.x ? 1 : -1;
      smileDeltas.push({ x: 4 * side * influence, y: 6 * influence });
    } else {
      smileDeltas.push({ x: 0, y: 0 });
    }
  }

  return [
    { name: 'blink', deltas: blinkDeltas, weight: 0 },
    { name: 'mouth_open', deltas: mouthDeltas, weight: 0 },
    { name: 'smile', deltas: smileDeltas, weight: 0 },
  ];
}
