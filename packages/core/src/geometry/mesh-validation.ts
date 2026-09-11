import type { Point2D } from '@parallax/contracts';

/**
 * Mesh contour: an ordered list of 2D points forming a closed polygon.
 */
export interface Contour {
  /** Ordered vertices. The contour is implicitly closed. */
  readonly points: readonly Point2D[];
}

/**
 * Result of contour extraction from image alpha data.
 */
export interface ContourExtractionResult {
  /** Outer contour of the shape. */
  readonly outer: Contour;
  /** Hole contours (inner cutouts). */
  readonly holes: readonly Contour[];
}

/**
 * Result of mesh triangulation.
 */
export interface TriangulationResult {
  /** Flat vertex array [x0, y0, x1, y1, ...]. */
  readonly vertices: readonly number[];
  /** Triangle indices into the vertex array (triplets). */
  readonly indices: readonly number[];
  /** UV coordinates [u0, v0, u1, v1, ...]. */
  readonly uvs: readonly number[];
  /** Number of vertices. */
  readonly vertexCount: number;
  /** Number of triangles. */
  readonly triangleCount: number;
}

/**
 * Validation result for mesh data.
 */
export interface MeshValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate mesh triangulation output.
 *
 * Checks:
 * 1. Vertices array length is even (x,y pairs).
 * 2. Indices array length is a multiple of 3 (triangles).
 * 3. All indices are within the vertex array bounds.
 * 4. UVs array has the same length as vertices.
 * 5. UV values are in [0, 1] range.
 * 6. No degenerate triangles (zero area).
 */
export function validateMesh(
  mesh: TriangulationResult,
): MeshValidationResult {
  const errors: string[] = [];

  // Check vertex pairs
  if (mesh.vertices.length % 2 !== 0) {
    errors.push('Vertex array length must be even (x,y pairs)');
  }

  // Check triangle indices
  if (mesh.indices.length % 3 !== 0) {
    errors.push('Index array length must be a multiple of 3');
  }

  // Check index bounds
  const maxIndex = mesh.vertices.length / 2 - 1;
  for (let i = 0; i < mesh.indices.length; i++) {
    const index = mesh.indices[i];
    if (index !== undefined && (index < 0 || index > maxIndex)) {
      errors.push(`Index ${i} is out of bounds: ${index} (max: ${maxIndex})`);
    }
  }

  // Check UVs match vertices
  if (mesh.uvs.length !== mesh.vertices.length) {
    errors.push(
      `UV array length (${mesh.uvs.length}) must match ` +
      `vertex array length (${mesh.vertices.length})`,
    );
  }

  // Check UV range
  for (let i = 0; i < mesh.uvs.length; i++) {
    const uv = mesh.uvs[i];
    if (uv !== undefined && (uv < 0 || uv > 1)) {
      errors.push(`UV value at index ${i} is out of [0, 1]: ${uv}`);
    }
  }

  // Check for degenerate triangles
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const i0 = mesh.indices[i];
    const i1 = mesh.indices[i + 1];
    const i2 = mesh.indices[i + 2];

    if (i0 === undefined || i1 === undefined || i2 === undefined) {
      continue;
    }

    const area = computeTriangleArea(mesh.vertices, i0, i1, i2);
    if (Math.abs(area) < 1e-10) {
      errors.push(`Degenerate triangle at indices [${i0}, ${i1}, ${i2}]`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Compute the signed area of a triangle from flat vertex array.
 */
function computeTriangleArea(
  vertices: readonly number[],
  i0: number,
  i1: number,
  i2: number,
): number {
  const x0 = vertices[i0 * 2] ?? 0;
  const y0 = vertices[i0 * 2 + 1] ?? 0;
  const x1 = vertices[i1 * 2] ?? 0;
  const y1 = vertices[i1 * 2 + 1] ?? 0;
  const x2 = vertices[i2 * 2] ?? 0;
  const y2 = vertices[i2 * 2 + 1] ?? 0;

  return 0.5 * ((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0));
}
