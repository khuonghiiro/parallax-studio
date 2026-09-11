import type { Point2D } from '@parallax/contracts';

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
