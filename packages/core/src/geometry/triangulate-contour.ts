import earcut from 'earcut';
import type { Point2D } from '@parallax/contracts';
import type { Contour, TriangulationResult } from './mesh-validation.js';

/**
 * Triangulate a closed contour polygon using Earcut.
 * Supports outer contour with optional holes.
 *
 * @param outer The outer contour polygon (ordered 2D points).
 * @param holes Optional hole contours (inner cutouts).
 * @returns Triangulation result with flat vertices, indices, and UVs.
 */
export function triangulateContour(
  outer: Contour,
  holes: readonly Contour[] = [],
): TriangulationResult {
  if (outer.points.length < 3) {
    throw new Error(
      `Contour must have at least 3 points, got ${outer.points.length}`,
    );
  }

  // Build flat coordinate array for Earcut
  const { flatCoords, holeIndices } = buildEarcutInput(outer, holes);

  // Run Earcut triangulation
  const indices = earcut(
    flatCoords,
    holeIndices.length > 0 ? holeIndices : undefined,
  );

  // Compute bounding box for UV mapping
  const bounds = computeBounds(flatCoords);

  // Generate UV coordinates normalized to bounding box
  const uvs = computeUVs(flatCoords, bounds);

  const vertexCount = flatCoords.length / 2;
  const triangleCount = indices.length / 3;

  return {
    vertices: flatCoords,
    indices,
    uvs,
    vertexCount,
    triangleCount,
  };
}

/**
 * Build the flat coordinate array and hole indices for Earcut.
 */
function buildEarcutInput(
  outer: Contour,
  holes: readonly Contour[],
): { flatCoords: number[]; holeIndices: number[] } {
  const flatCoords: number[] = [];
  const holeIndices: number[] = [];

  // Add outer contour points
  for (const point of outer.points) {
    flatCoords.push(point.x, point.y);
  }

  // Add hole contour points
  for (const hole of holes) {
    holeIndices.push(flatCoords.length / 2);
    for (const point of hole.points) {
      flatCoords.push(point.x, point.y);
    }
  }

  return { flatCoords, holeIndices };
}

/**
 * Bounding box for a flat coordinate array.
 */
interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Compute the axis-aligned bounding box of flat coordinates.
 */
function computeBounds(flatCoords: readonly number[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < flatCoords.length; i += 2) {
    const x = flatCoords[i]!;
    const y = flatCoords[i + 1]!;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Generate UV coordinates by normalizing positions to [0, 1]
 * within the bounding box.
 */
function computeUVs(
  flatCoords: readonly number[],
  bounds: Bounds,
): number[] {
  const uvs: number[] = [];
  const safeWidth = bounds.width > 0 ? bounds.width : 1;
  const safeHeight = bounds.height > 0 ? bounds.height : 1;

  for (let i = 0; i < flatCoords.length; i += 2) {
    const x = flatCoords[i]!;
    const y = flatCoords[i + 1]!;
    const u = (x - bounds.minX) / safeWidth;
    const v = (y - bounds.minY) / safeHeight;
    uvs.push(u, v);
  }

  return uvs;
}

/**
 * Compute the signed area of a contour polygon.
 * Positive = counter-clockwise, negative = clockwise.
 */
export function computeContourArea(points: readonly Point2D[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const current = points[i]!;
    const next = points[(i + 1) % n]!;
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

/**
 * Ensure a contour is wound counter-clockwise (positive area).
 * Reverses the point order if necessary.
 */
export function ensureCCW(points: readonly Point2D[]): Point2D[] {
  const area = computeContourArea(points);

  if (area < 0) {
    return [...points].reverse();
  }

  return [...points];
}
