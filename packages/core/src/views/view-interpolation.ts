import type { TriangulationResult } from '../geometry/mesh-validation.js';

/**
 * Result of resolving a transition between two view meshes.
 */
export interface ViewTransitionResult {
  /** Mode used for this transition frame. */
  readonly mode: 'interpolated' | 'discrete';
  /** The resulting mesh to display. */
  readonly mesh: TriangulationResult;
}

/**
 * Check if two meshes have compatible topology.
 * Compatible topology requires identical vertex counts and identical triangle index sequences.
 *
 * Invariant per PLAN.md:
 * Meshes can only be morphed/interpolated when their topology and correspondence match.
 *
 * @param meshA First mesh to compare.
 * @param meshB Second mesh to compare.
 * @returns True if both meshes share the exact same topology.
 */
export function isTopologyCompatible(
  meshA: TriangulationResult,
  meshB: TriangulationResult,
): boolean {
  if (meshA.vertexCount !== meshB.vertexCount) {
    return false;
  }

  if (meshA.indices.length !== meshB.indices.length) {
    return false;
  }

  const indexCount = meshA.indices.length;
  for (let i = 0; i < indexCount; i++) {
    if (meshA.indices[i] !== meshB.indices[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Linearly interpolate vertex positions and UV coordinates between two topology-compatible meshes.
 *
 * @param meshA Source mesh at alpha = 0.
 * @param meshB Target mesh at alpha = 1.
 * @param alpha Blend factor in [0, 1].
 * @returns A new TriangulationResult with interpolated vertices.
 * @throws Error if the meshes are not topology-compatible.
 */
export function interpolateMeshes(
  meshA: TriangulationResult,
  meshB: TriangulationResult,
  alpha: number,
): TriangulationResult {
  if (!isTopologyCompatible(meshA, meshB)) {
    throw new Error(
      'Cannot interpolate meshes with incompatible topology (mismatched vertices or indices)',
    );
  }

  const t = Math.max(0, Math.min(1, alpha));
  const oneMinusT = 1 - t;
  const vertexLength = meshA.vertices.length;
  const interpolatedVertices: number[] = new Array(vertexLength);

  for (let i = 0; i < vertexLength; i++) {
    const a = meshA.vertices[i]!;
    const b = meshB.vertices[i]!;
    interpolatedVertices[i] = oneMinusT * a + t * b;
  }

  const uvLength = meshA.uvs.length;
  const interpolatedUvs: number[] = new Array(uvLength);

  for (let i = 0; i < uvLength; i++) {
    const a = meshA.uvs[i]!;
    const b = meshB.uvs[i]!;
    interpolatedUvs[i] = oneMinusT * a + t * b;
  }

  return {
    vertices: interpolatedVertices,
    indices: meshA.indices,
    uvs: interpolatedUvs,
    vertexCount: meshA.vertexCount,
    triangleCount: meshA.triangleCount,
  };
}

/**
 * Resolve a transition between two view meshes.
 * If topology is compatible, smoothly interpolates vertices.
 * If topology is incompatible, performs a clean discrete switch at the threshold
 * without corrupting vertices or tearing triangles.
 *
 * @param fromMesh Source view mesh.
 * @param toMesh Target view mesh.
 * @param progress Transition progress in [0, 1].
 * @param threshold Threshold for discrete switch (default 0.5).
 * @returns Transition result with mode and active mesh.
 */
export function resolveViewTransition(
  fromMesh: TriangulationResult,
  toMesh: TriangulationResult,
  progress: number,
  threshold: number = 0.5,
): ViewTransitionResult {
  const p = Math.max(0, Math.min(1, progress));

  if (isTopologyCompatible(fromMesh, toMesh)) {
    const mesh = interpolateMeshes(fromMesh, toMesh, p);
    return { mode: 'interpolated', mesh };
  }

  // Fallback to discrete switch
  const activeMesh = p < threshold ? fromMesh : toMesh;
  return { mode: 'discrete', mesh: activeMesh };
}
