import type { Point2D } from '@parallax/contracts';
import type { Contour, ContourExtractionResult } from './mesh-validation.js';

/**
 * Threshold for alpha channel to consider a pixel as opaque.
 * Pixels with alpha >= this value are part of the contour.
 */
const ALPHA_THRESHOLD = 128;

/**
 * Extract the outer contour and holes from image alpha data.
 * Uses a marching-squares-like approach to trace the boundary.
 *
 * @param alphaData Flat array of alpha values (one per pixel, 0-255).
 * @param width Image width in pixels.
 * @param height Image height in pixels.
 * @param simplifyTolerance Distance tolerance for point simplification (pixels).
 * @returns The outer contour and any holes.
 */
export function extractContour(
  alphaData: Uint8Array,
  width: number,
  height: number,
  simplifyTolerance: number = 2.0,
): ContourExtractionResult {
  if (alphaData.length !== width * height) {
    throw new Error(
      `Alpha data length (${alphaData.length}) does not match ` +
      `dimensions (${width}×${height} = ${width * height})`,
    );
  }

  // Create binary mask
  const mask = createBinaryMask(alphaData, width, height);

  // Trace outer boundary
  const outerRaw = traceOuterContour(mask, width, height);

  if (outerRaw.length < 3) {
    throw new Error('No contour found in the image');
  }

  // Simplify to reduce vertex count
  const outerSimplified = simplifyContour(outerRaw, simplifyTolerance);

  const outer: Contour = { points: outerSimplified };

  // For MVP: no hole detection. Holes will be added later.
  return { outer, holes: [] };
}

/**
 * Create a binary mask from alpha channel data.
 * true = opaque pixel, false = transparent pixel.
 */
function createBinaryMask(
  alphaData: Uint8Array,
  width: number,
  height: number,
): boolean[][] {
  const mask: boolean[][] = [];

  for (let y = 0; y < height; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < width; x++) {
      const alpha = alphaData[y * width + x] ?? 0;
      row.push(alpha >= ALPHA_THRESHOLD);
    }
    mask.push(row);
  }

  return mask;
}

/**
 * Trace the outer contour of a binary mask.
 * Finds the first opaque pixel and traces the boundary clockwise.
 */
function traceOuterContour(
  mask: boolean[][],
  width: number,
  height: number,
): Point2D[] {
  // Find the first opaque pixel (top-left)
  let startX = -1;
  let startY = -1;

  outer:
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (getPixel(mask, x, y)) {
        startX = x;
        startY = y;
        break outer;
      }
    }
  }

  if (startX === -1) {
    return [];
  }

  // 8-connected boundary tracing (Moore neighborhood)
  const points: Point2D[] = [];
  const directions: [number, number][] = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];

  let cx = startX;
  let cy = startY;
  let dir = 0; // Start direction: right

  const maxSteps = width * height * 2;
  let steps = 0;

  do {
    points.push({ x: cx, y: cy });

    // Look for next boundary pixel
    let found = false;
    const startDir = (dir + 5) % 8; // Start search from dir - 3

    for (let i = 0; i < 8; i++) {
      const d = (startDir + i) % 8;
      const delta = directions[d]!;
      const nx = cx + delta[0];
      const ny = cy + delta[1];

      if (getPixel(mask, nx, ny)) {
        cx = nx;
        cy = ny;
        dir = d;
        found = true;
        break;
      }
    }

    if (!found) {
      break;
    }

    steps++;
    if (steps > maxSteps) {
      break; // Safety limit
    }
  } while (cx !== startX || cy !== startY);

  return points;
}

/**
 * Safely get a pixel value from the binary mask.
 */
function getPixel(mask: boolean[][], x: number, y: number): boolean {
  const row = mask[y];
  if (!row) {
    return false;
  }
  return row[x] ?? false;
}

/**
 * Simplify a contour using the Ramer-Douglas-Peucker algorithm.
 * Reduces the number of points while preserving the shape.
 */
function simplifyContour(
  points: readonly Point2D[],
  tolerance: number,
): Point2D[] {
  if (points.length <= 3) {
    return [...points];
  }

  return rdpSimplify(points, tolerance);
}

/**
 * Ramer-Douglas-Peucker simplification.
 */
function rdpSimplify(
  points: readonly Point2D[],
  epsilon: number,
): Point2D[] {
  if (points.length < 3) {
    return [...points];
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;

  // Find the point with maximum distance from the line
  let maxDist = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i]!, first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIndex), epsilon);

    // Combine, removing duplicate point at the junction
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * Perpendicular distance from a point to a line segment.
 */
function perpendicularDistance(
  point: Point2D,
  lineStart: Point2D,
  lineEnd: Point2D,
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const px = point.x - lineStart.x;
    const py = point.y - lineStart.y;
    return Math.sqrt(px * px + py * py);
  }

  const area = Math.abs(
    dy * point.x - dx * point.y +
    lineEnd.x * lineStart.y - lineEnd.y * lineStart.x,
  );

  return area / Math.sqrt(lengthSq);
}
