import type { Point2D } from '@parallax/contracts';
import type { Contour, ContourExtractionResult } from './mesh-validation.js';

/**
 * Threshold for alpha channel to consider a pixel as opaque.
 * Pixels with alpha >= this value are part of the contour.
 */
const ALPHA_THRESHOLD = 128;

/**
 * Minimum pixel count for a transparent region to be considered a hole.
 * Filters out single-pixel or micro alpha noise.
 */
const MIN_HOLE_PIXELS = 4;

/**
 * Extract the outer contour and holes from image alpha data.
 * Uses Moore neighborhood boundary tracing and exterior flood fill for hole detection.
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

  // Create binary mask: true = opaque, false = transparent
  const mask = createBinaryMask(alphaData, width, height);

  // Find first opaque pixel (top-left)
  const outerStart = findFirstPixel(mask, width, height, true);
  if (!outerStart) {
    throw new Error('No contour found in the image');
  }

  // Trace outer boundary
  const outerRaw = traceBoundary(
    (x, y) => getPixel(mask, x, y),
    outerStart.x,
    outerStart.y,
    width,
    height,
  );

  if (outerRaw.length < 3) {
    throw new Error('No contour found in the image');
  }

  // Simplify outer contour
  const outerSimplified = simplifyContour(outerRaw, simplifyTolerance);
  if (outerSimplified.length < 3) {
    throw new Error('Simplified contour has fewer than 3 points');
  }

  const outer: Contour = { points: outerSimplified };
  const outerArea = computeSignedArea(outer.points);

  // Extract interior holes (transparent regions enclosed by opaque pixels)
  const holes = extractHoles(mask, width, height, simplifyTolerance, outerArea);

  return { outer, holes };
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
 * Extract all interior holes enclosed within the opaque silhouette.
 */
function extractHoles(
  mask: boolean[][],
  width: number,
  height: number,
  simplifyTolerance: number,
  outerArea: number,
): Contour[] {
  // 1. Mark all transparent pixels connected to the image border as exterior
  const exterior = findExteriorMask(mask, width, height);

  // 2. Scan for interior transparent components that are not exterior
  const visited: boolean[][] = Array.from({ length: height }, () =>
    new Array<boolean>(width).fill(false),
  );

  const holes: Contour[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Look for unvisited, non-exterior transparent pixel
      if (!mask[y]![x] && !exterior[y]![x] && !visited[y]![x]) {
        const holeComponent = collectHoleComponent(mask, exterior, visited, x, y, width, height);

        if (holeComponent.length >= MIN_HOLE_PIXELS) {
          const holeContour = buildHoleContour(
            holeComponent,
            width,
            height,
            simplifyTolerance,
            outerArea,
          );
          if (holeContour) {
            holes.push(holeContour);
          }
        }
      }
    }
  }

  return holes;
}

/**
 * Flood-fill from image boundaries to mark exterior background pixels.
 */
function findExteriorMask(
  mask: boolean[][],
  width: number,
  height: number,
): boolean[][] {
  const exterior: boolean[][] = Array.from({ length: height }, () =>
    new Array<boolean>(width).fill(false),
  );

  const queue: Array<[number, number]> = [];

  // Seed boundary transparent pixels
  for (let x = 0; x < width; x++) {
    if (!mask[0]![x] && !exterior[0]![x]) {
      exterior[0]![x] = true;
      queue.push([x, 0]);
    }
    const bottomY = height - 1;
    if (!mask[bottomY]![x] && !exterior[bottomY]![x]) {
      exterior[bottomY]![x] = true;
      queue.push([x, bottomY]);
    }
  }

  for (let y = 0; y < height; y++) {
    if (!mask[y]![0] && !exterior[y]![0]) {
      exterior[y]![0] = true;
      queue.push([0, y]);
    }
    const rightX = width - 1;
    if (!mask[y]![rightX] && !exterior[y]![rightX]) {
      exterior[y]![rightX] = true;
      queue.push([rightX, y]);
    }
  }

  // 4-way BFS flood fill
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++]!;

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (!mask[ny]![nx] && !exterior[ny]![nx]) {
          exterior[ny]![nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
  }

  return exterior;
}

/**
 * Collect all connected pixels of an interior hole using BFS.
 */
function collectHoleComponent(
  mask: boolean[][],
  exterior: boolean[][],
  visited: boolean[][],
  startX: number,
  startY: number,
  width: number,
  height: number,
): Array<[number, number]> {
  const pixels: Array<[number, number]> = [];
  const queue: Array<[number, number]> = [[startX, startY]];
  visited[startY]![startX] = true;

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++]!;
    pixels.push([cx, cy]);

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        if (!mask[ny]![nx] && !exterior[ny]![nx] && !visited[ny]![nx]) {
          visited[ny]![nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
  }

  return pixels;
}

/**
 * Trace, simplify, and normalize a hole contour from its pixel component.
 */
function buildHoleContour(
  holePixels: Array<[number, number]>,
  width: number,
  height: number,
  simplifyTolerance: number,
  outerArea: number,
): Contour | null {
  // Build a lookup set for fast pixel checking
  const holeSet = new Set<string>();
  let startX = Infinity;
  let startY = Infinity;

  for (const [x, y] of holePixels) {
    holeSet.add(`${x},${y}`);
    if (y < startY || (y === startY && x < startX)) {
      startX = x;
      startY = y;
    }
  }

  if (startX === Infinity) {
    return null;
  }

  const rawHole = traceBoundary(
    (x, y) => holeSet.has(`${x},${y}`),
    startX,
    startY,
    width,
    height,
  );

  if (rawHole.length < 3) {
    return null;
  }

  const simplified = simplifyContour(rawHole, simplifyTolerance);
  if (simplified.length < 3) {
    return null;
  }

  // Ensure hole winding is opposite to outer winding for Earcut triangulation
  const holeArea = computeSignedArea(simplified);
  let finalPoints = [...simplified];
  if (outerArea * holeArea > 0) {
    finalPoints = finalPoints.reverse();
  }

  return { points: finalPoints };
}

/**
 * Find the first pixel in the mask matching the target state.
 */
function findFirstPixel(
  mask: boolean[][],
  width: number,
  height: number,
  target: boolean,
): Point2D | null {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (getPixel(mask, x, y) === target) {
        return { x, y };
      }
    }
  }
  return null;
}

/**
 * 8-connected boundary tracing (Moore neighborhood).
 */
function traceBoundary(
  isTarget: (x: number, y: number) => boolean,
  startX: number,
  startY: number,
  width: number,
  height: number,
): Point2D[] {
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
    const startDir = (dir + 5) % 8; // Backtrack direction

    for (let i = 0; i < 8; i++) {
      const d = (startDir + i) % 8;
      const delta = directions[d]!;
      const nx = cx + delta[0];
      const ny = cy + delta[1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && isTarget(nx, ny)) {
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

/**
 * Compute signed area of a 2D polygon.
 * Positive = counter-clockwise, Negative = clockwise.
 */
function computeSignedArea(points: readonly Point2D[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const current = points[i]!;
    const next = points[(i + 1) % n]!;
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}
