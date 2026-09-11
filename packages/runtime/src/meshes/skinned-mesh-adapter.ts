import * as THREE from 'three';
import type { TriangulationResult } from '@parallax/core';

/**
 * Create a Three.js SkinnedMesh from triangulation data and a skeleton.
 *
 * @param triangulation Mesh data from core geometry.
 * @param texture The diffuse texture.
 * @param skeleton The Three.js Skeleton (from skeleton-adapter).
 * @param skinWeights Per-vertex skin indices and weights.
 * @returns A configured SkinnedMesh ready for rendering.
 */
export function createSkinnedMesh(
  triangulation: TriangulationResult,
  texture: THREE.Texture,
  skeleton: THREE.Skeleton,
  skinWeights?: SkinWeightData,
): THREE.SkinnedMesh {
  const geometry = createGeometry(triangulation);

  // Apply skin weights if provided
  if (skinWeights) {
    applySkinWeights(geometry, skinWeights);
  }

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.01,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.add(skeleton.bones[0]!);
  mesh.bind(skeleton);

  return mesh;
}

/**
 * Create a simple (non-skinned) mesh for static layers.
 */
export function createStaticMesh(
  triangulation: TriangulationResult,
  texture: THREE.Texture,
): THREE.Mesh {
  const geometry = createGeometry(triangulation);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.01,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Create Three.js BufferGeometry from triangulation result.
 */
function createGeometry(
  triangulation: TriangulationResult,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Positions (convert 2D to 3D with z=0)
  const positions = new Float32Array(triangulation.vertexCount * 3);
  for (let i = 0; i < triangulation.vertexCount; i++) {
    positions[i * 3] = triangulation.vertices[i * 2] ?? 0;
    positions[i * 3 + 1] = triangulation.vertices[i * 2 + 1] ?? 0;
    positions[i * 3 + 2] = 0;
  }
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  );

  // UVs
  const uvs = new Float32Array(triangulation.vertexCount * 2);
  for (let i = 0; i < triangulation.uvs.length; i++) {
    uvs[i] = triangulation.uvs[i] ?? 0;
  }
  geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(uvs, 2),
  );

  // Indices
  const indices = new Uint32Array(triangulation.indices.length);
  for (let i = 0; i < triangulation.indices.length; i++) {
    indices[i] = triangulation.indices[i] ?? 0;
  }
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Skin weight data for GPU skinning.
 * Matches Three.js's 4-influence-per-vertex format.
 */
export interface SkinWeightData {
  /** Flat array of bone indices (4 per vertex). */
  readonly skinIndices: readonly number[];
  /** Flat array of bone weights (4 per vertex). */
  readonly skinWeights: readonly number[];
}

/**
 * Apply skin weights to a BufferGeometry.
 */
function applySkinWeights(
  geometry: THREE.BufferGeometry,
  data: SkinWeightData,
): void {
  const vertexCount = geometry.getAttribute('position').count;

  const indices = new Float32Array(vertexCount * 4);
  const weights = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount * 4; i++) {
    indices[i] = data.skinIndices[i] ?? 0;
    weights[i] = data.skinWeights[i] ?? 0;
  }

  geometry.setAttribute(
    'skinIndex',
    new THREE.BufferAttribute(indices, 4),
  );
  geometry.setAttribute(
    'skinWeight',
    new THREE.BufferAttribute(weights, 4),
  );
}
