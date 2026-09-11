import type {
  Point2D,
  WarpGrid,
  WarpControlPoint,
  BoundingBox,
} from '@parallax/contracts';

/**
 * Initialize a uniform 2D Free-Form Deformation (FFD) control grid.
 *
 * @param cols Number of columns (default 4).
 * @param rows Number of rows (default 4).
 * @param bounds Bounding box of the deformer in rest space.
 * @returns An initialized WarpGrid with zero displacement offsets.
 */
export function createUniformWarpGrid(
  cols: number = 4,
  rows: number = 4,
  bounds: BoundingBox,
): WarpGrid {
  const safeCols = Math.max(2, Math.min(16, Math.floor(cols)));
  const safeRows = Math.max(2, Math.min(16, Math.floor(rows)));
  const controlPoints: WarpControlPoint[] = [];

  for (let r = 0; r < safeRows; r++) {
    const restY = safeRows > 1 ? r / (safeRows - 1) : 0.5;
    for (let c = 0; c < safeCols; c++) {
      const restX = safeCols > 1 ? c / (safeCols - 1) : 0.5;
      controlPoints.push({
        col: c,
        row: r,
        restX,
        restY,
        dx: 0,
        dy: 0,
      });
    }
  }

  return {
    cols: safeCols,
    rows: safeRows,
    bounds,
    controlPoints,
  };
}

/**
 * Evaluate the bilinear interpolation displacement for a single 2D point.
 *
 * @param grid The warp grid.
 * @param point The point in rest space coordinates.
 * @returns Displaced point after warp deformation.
 */
export function evaluateWarpAtPoint(
  grid: WarpGrid,
  point: Point2D,
): Point2D {
  const { minX, minY, maxX, maxY } = grid.bounds;
  const width = Math.max(1e-5, maxX - minX);
  const height = Math.max(1e-5, maxY - minY);

  // Normalize point to [0, 1] relative to bounds (clamped to prevent runaway extrapolation)
  const u = Math.max(0, Math.min(1, (point.x - minX) / width));
  const v = Math.max(0, Math.min(1, (point.y - minY) / height));

  const maxCol = grid.cols - 1;
  const maxRow = grid.rows - 1;

  // Identify grid cell index
  const cellCol = Math.min(maxCol - 1, Math.max(0, Math.floor(u * maxCol)));
  const cellRow = Math.min(maxRow - 1, Math.max(0, Math.floor(v * maxRow)));

  // Local coordinates within the cell [0, 1]
  const s = u * maxCol - cellCol;
  const t = v * maxRow - cellRow;

  // Retrieve 4 corner control points
  const p00 = getControlPoint(grid, cellCol, cellRow);
  const p10 = getControlPoint(grid, cellCol + 1, cellRow);
  const p01 = getControlPoint(grid, cellCol, cellRow + 1);
  const p11 = getControlPoint(grid, cellCol + 1, cellRow + 1);

  // Bilinear weights
  const w00 = (1 - s) * (1 - t);
  const w10 = s * (1 - t);
  const w01 = (1 - s) * t;
  const w11 = s * t;

  const dx = w00 * p00.dx + w10 * p10.dx + w01 * p01.dx + w11 * p11.dx;
  const dy = w00 * p00.dy + w10 * p10.dy + w01 * p01.dy + w11 * p11.dy;

  return {
    x: point.x + dx,
    y: point.y + dy,
  };
}

/**
 * Apply warp grid deformation to a flat vertex buffer.
 *
 * @param grid Warp grid with active control point offsets.
 * @param vertices Flat vertex array [x0, y0, x1, y1, ...].
 * @returns New flat vertex array after warp deformation.
 */
export function applyWarpGridToVertices(
  grid: WarpGrid,
  vertices: readonly number[],
): number[] {
  const count = vertices.length / 2;
  const result: number[] = new Array(vertices.length);

  for (let i = 0; i < count; i++) {
    const vx = vertices[i * 2]!;
    const vy = vertices[i * 2 + 1]!;
    const warped = evaluateWarpAtPoint(grid, { x: vx, y: vy });
    result[i * 2] = warped.x;
    result[i * 2 + 1] = warped.y;
  }

  return result;
}

/**
 * Safely retrieve a control point from a WarpGrid.
 */
export function getControlPoint(
  grid: WarpGrid,
  col: number,
  row: number,
): WarpControlPoint {
  const idx = row * grid.cols + col;
  const cp = grid.controlPoints[idx];
  if (!cp) {
    return { col, row, restX: 0, restY: 0, dx: 0, dy: 0 };
  }
  return cp;
}

/**
 * Create a new grid with an updated control point displacement.
 */
export function setControlPointOffset(
  grid: WarpGrid,
  col: number,
  row: number,
  dx: number,
  dy: number,
): WarpGrid {
  const updatedPoints = grid.controlPoints.map((cp) => {
    if (cp.col === col && cp.row === row) {
      return { ...cp, dx, dy };
    }
    return cp;
  });

  return {
    ...grid,
    controlPoints: updatedPoints,
  };
}

/**
 * Preset expressions: generates standard squash/stretch or facial warp offsets.
 */
export function applySquashStretch(
  grid: WarpGrid,
  factor: number, // -1.0 (squash) to 1.0 (stretch)
): WarpGrid {
  const f = Math.max(-1, Math.min(1, factor));
  const maxDy = (grid.bounds.maxY - grid.bounds.minY) * 0.15;
  const maxDx = (grid.bounds.maxX - grid.bounds.minX) * 0.15;

  const updatedPoints = grid.controlPoints.map((cp) => {
    // Stretch: height increases (top moves up, bottom moves down), width decreases
    const vOffset = (cp.restY - 0.5) * 2 * (f * maxDy);
    const hOffset = -(cp.restX - 0.5) * 2 * (f * maxDx);

    return {
      ...cp,
      dx: hOffset,
      dy: vOffset,
    };
  });

  return {
    ...grid,
    controlPoints: updatedPoints,
  };
}
