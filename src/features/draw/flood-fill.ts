/**
 * Fast 4-way BFS flood fill algorithm with color tolerance.
 * Operates directly on an HTML5 2D canvas ImageData buffer.
 */

export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parses a hex color (e.g. '#6380ff' or '#ff0000') into RGBA numbers.
 */
export function hexToRgba(hex: string, alpha = 255): RGBAColor {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: alpha,
  };
}

/**
 * Checks if color difference between pixel and target color is within tolerance.
 */
function colorMatch(
  data: Uint8ClampedArray,
  index: number,
  target: RGBAColor,
  tolerance: number,
): boolean {
  const r = data[index]!;
  const g = data[index + 1]!;
  const b = data[index + 2]!;
  const a = data[index + 3]!;

  return (
    Math.abs(r - target.r) <= tolerance &&
    Math.abs(g - target.g) <= tolerance &&
    Math.abs(b - target.b) <= tolerance &&
    Math.abs(a - target.a) <= tolerance
  );
}

/**
 * Executes flood fill on an ImageData buffer starting from (startX, startY).
 *
 * @param imgData Target ImageData buffer.
 * @param startX Starting X coordinate.
 * @param startY Starting Y coordinate.
 * @param fillColor RGBA color to fill with.
 * @param tolerance Color difference tolerance (0-255).
 * @returns boolean indicating if any pixels were modified.
 */
export function floodFill(
  imgData: ImageData,
  startX: number,
  startY: number,
  fillColor: RGBAColor,
  tolerance = 32,
): boolean {
  const { width, height, data } = imgData;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    return false;
  }

  const startIdx = (startY * width + startX) * 4;
  const targetColor: RGBAColor = {
    r: data[startIdx]!,
    g: data[startIdx + 1]!,
    b: data[startIdx + 2]!,
    a: data[startIdx + 3]!,
  };

  // If start pixel is already equal to fillColor, avoid infinite loop
  if (
    targetColor.r === fillColor.r &&
    targetColor.g === fillColor.g &&
    targetColor.b === fillColor.b &&
    targetColor.a === fillColor.a
  ) {
    return false;
  }

  const visited = new Uint8Array(width * height);
  const queue: number[] = [startX + startY * width];
  visited[startX + startY * width] = 1;

  let modified = false;

  while (queue.length > 0) {
    const curr = queue.pop()!;
    const cx = curr % width;
    const cy = Math.floor(curr / width);
    const pixelIdx = curr * 4;

    if (!colorMatch(data, pixelIdx, targetColor, tolerance)) {
      continue;
    }

    // Set pixel to fill color
    data[pixelIdx] = fillColor.r;
    data[pixelIdx + 1] = fillColor.g;
    data[pixelIdx + 2] = fillColor.b;
    data[pixelIdx + 3] = fillColor.a;
    modified = true;

    // Check 4 adjacent neighbors
    const neighbors: [number, number][] = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = nx + ny * width;
        if (!visited[nIdx]) {
          visited[nIdx] = 1;
          queue.push(nIdx);
        }
      }
    }
  }

  return modified;
}
