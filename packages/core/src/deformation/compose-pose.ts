import type { Point2D, WarpGrid } from '@parallax/contracts';
import type { MorphBlendInput } from './morph-target.js';

/**
 * Deformation order as specified in DEFORMATION_PIPELINE.md:
 * 1. Select view
 * 2. Warp/morph in rest space
 * 3. Bone skinning
 * 4. Instance transform
 * 5. Camera/shadow/render
 *
 * This module composes pose transforms in the canonical order.
 */

/**
 * A composed pose for a single mesh vertex after all deformations.
 */
export interface ComposedVertex {
  /** Final position after all deformations. */
  readonly position: Point2D;
  /** UV coordinates (unchanged by deformation). */
  readonly u: number;
  readonly v: number;
}

/**
 * Warp deformation result for a vertex.
 */
export interface WarpResult {
  readonly position: Point2D;
}

/**
 * Bone skinning result for a vertex.
 */
export interface SkinningResult {
  readonly position: Point2D;
}

/**
 * Instance transform parameters.
 */
export interface InstanceTransform {
  readonly translateX: number;
  readonly translateY: number;
  readonly rotation: number;
  readonly scale: number;
}

/**
 * Compose the full deformation pipeline for a set of vertices.
 *
 * Order:
 * 1. Apply warp/morph deformation in rest space.
 * 2. Apply bone skinning.
 * 3. Apply instance transform (position, rotation, scale).
 *
 * View selection and camera/shadow/render are handled externally.
 *
 * @param restVertices Flat array [x0, y0, x1, y1, ...] in rest space.
 * @param uvs Flat UV array [u0, v0, u1, v1, ...].
 * @param warpFn Function that applies warp deformation to a rest vertex.
 * @param skinFn Function that applies bone skinning to a warped vertex.
 * @param transform Instance transform to apply after skinning.
 * @returns Array of composed vertex positions.
 */
export function composePose(
  restVertices: readonly number[],
  uvs: readonly number[],
  warpFn: (vertex: Point2D, index: number) => WarpResult,
  skinFn: (vertex: Point2D, index: number) => SkinningResult,
  transform: InstanceTransform,
): ComposedVertex[] {
  const vertexCount = restVertices.length / 2;
  const result: ComposedVertex[] = [];

  const cosR = Math.cos(transform.rotation);
  const sinR = Math.sin(transform.rotation);

  for (let i = 0; i < vertexCount; i++) {
    const restX = restVertices[i * 2]!;
    const restY = restVertices[i * 2 + 1]!;
    const restPoint: Point2D = { x: restX, y: restY };

    // Step 1: Warp/morph in rest space
    const warped = warpFn(restPoint, i);

    // Step 2: Bone skinning
    const skinned = skinFn(warped.position, i);

    // Step 3: Instance transform (scale → rotate → translate)
    const scaled: Point2D = {
      x: skinned.position.x * transform.scale,
      y: skinned.position.y * transform.scale,
    };

    const rotated: Point2D = {
      x: scaled.x * cosR - scaled.y * sinR,
      y: scaled.x * sinR + scaled.y * cosR,
    };

    const translated: Point2D = {
      x: rotated.x + transform.translateX,
      y: rotated.y + transform.translateY,
    };

    result.push({
      position: translated,
      u: uvs[i * 2] ?? 0,
      v: uvs[i * 2 + 1] ?? 0,
    });
  }

  return result;
}

/**
 * Identity warp: no deformation.
 */
export function identityWarp(vertex: Point2D): WarpResult {
  return { position: vertex };
}

/**
 * Identity skinning: no bone deformation.
 */
export function identitySkin(vertex: Point2D): SkinningResult {
  return { position: vertex };
}

/**
 * Identity transform: no instance transformation.
 */
export const IDENTITY_TRANSFORM: InstanceTransform = {
  translateX: 0,
  translateY: 0,
  rotation: 0,
  scale: 1,
};

/**
 * Creates a warp function combining WarpGrid FFD and additive Morph Targets
 * in canonical rest space order (Warp -> Morph).
 */
export function createCombinedWarpFn(
  grid?: WarpGrid,
  morphTargets?: readonly MorphBlendInput[],
): (vertex: Point2D, index: number) => WarpResult {
  return (vertex: Point2D, index: number): WarpResult => {
    let pos = vertex;

    // Step A: Warp grid FFD
    if (grid && grid.controlPoints.length > 0) {
      const { minX, minY, maxX, maxY } = grid.bounds;
      const w = Math.max(1e-5, maxX - minX);
      const h = Math.max(1e-5, maxY - minY);
      const u = Math.max(0, Math.min(1, (pos.x - minX) / w));
      const v = Math.max(0, Math.min(1, (pos.y - minY) / h));

      const maxCol = grid.cols - 1;
      const maxRow = grid.rows - 1;
      const c = Math.min(maxCol - 1, Math.max(0, Math.floor(u * maxCol)));
      const r = Math.min(maxRow - 1, Math.max(0, Math.floor(v * maxRow)));
      const s = u * maxCol - c;
      const t = v * maxRow - r;

      const p00 = grid.controlPoints[r * grid.cols + c];
      const p10 = grid.controlPoints[r * grid.cols + (c + 1)];
      const p01 = grid.controlPoints[(r + 1) * grid.cols + c];
      const p11 = grid.controlPoints[(r + 1) * grid.cols + (c + 1)];

      const dx =
        (1 - s) * (1 - t) * (p00?.dx ?? 0) +
        s * (1 - t) * (p10?.dx ?? 0) +
        (1 - s) * t * (p01?.dx ?? 0) +
        s * t * (p11?.dx ?? 0);
      const dy =
        (1 - s) * (1 - t) * (p00?.dy ?? 0) +
        s * (1 - t) * (p10?.dy ?? 0) +
        (1 - s) * t * (p01?.dy ?? 0) +
        s * t * (p11?.dy ?? 0);

      pos = { x: pos.x + dx, y: pos.y + dy };
    }

    // Step B: Morph targets (additive deltas)
    if (morphTargets && morphTargets.length > 0) {
      let mdx = 0;
      let mdy = 0;
      for (const mt of morphTargets) {
        const weight = Math.max(0, Math.min(1, mt.weight ?? mt.target.weight));
        if (weight > 0 && mt.target.deltas[index]) {
          mdx += mt.target.deltas[index]!.x * weight;
          mdy += mt.target.deltas[index]!.y * weight;
        }
      }
      pos = { x: pos.x + mdx, y: pos.y + mdy };
    }

    return { position: pos };
  };
}
