import { describe, it, expect } from 'vitest';
import {
  createUniformWarpGrid,
  evaluateWarpAtPoint,
  applyWarpGridToVertices,
  setControlPointOffset,
  applySquashStretch,
} from './warp-grid.js';

describe('warp-grid', () => {
  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

  it('creates uniform 4x4 grid with 16 points and zero displacement', () => {
    const grid = createUniformWarpGrid(4, 4, bounds);
    expect(grid.cols).toBe(4);
    expect(grid.rows).toBe(4);
    expect(grid.controlPoints.length).toBe(16);
    expect(grid.controlPoints.every((p) => p.dx === 0 && p.dy === 0)).toBe(true);
  });

  it('evaluates identity warp when offsets are zero', () => {
    const grid = createUniformWarpGrid(4, 4, bounds);
    const p1 = evaluateWarpAtPoint(grid, { x: 50, y: 50 });
    expect(p1.x).toBeCloseTo(50);
    expect(p1.y).toBeCloseTo(50);

    const vertices = [0, 0, 100, 100];
    const warped = applyWarpGridToVertices(grid, vertices);
    expect(warped[0]).toBeCloseTo(0);
    expect(warped[1]).toBeCloseTo(0);
    expect(warped[2]).toBeCloseTo(100);
    expect(warped[3]).toBeCloseTo(100);
  });

  it('interpolates displacement bilinearly for points inside a cell', () => {
    let grid = createUniformWarpGrid(2, 2, bounds);
    // Move top-right corner by (10, 20)
    grid = setControlPointOffset(grid, 1, 1, 10, 20);

    // Center point (50, 50) should get exactly 1/4 of the corner's offset
    const center = evaluateWarpAtPoint(grid, { x: 50, y: 50 });
    expect(center.x).toBeCloseTo(52.5); // 50 + 10 * 0.25
    expect(center.y).toBeCloseTo(55);   // 50 + 20 * 0.25
  });

  it('applies squash and stretch correctly', () => {
    const grid = createUniformWarpGrid(4, 4, bounds);
    const stretched = applySquashStretch(grid, 1.0); // full stretch

    // Top control points should move upward (dy > 0), bottom downward (dy < 0)
    const topPoint = stretched.controlPoints.find((cp) => cp.row === 3);
    const bottomPoint = stretched.controlPoints.find((cp) => cp.row === 0);

    expect(topPoint!.dy).toBeGreaterThan(0);
    expect(bottomPoint!.dy).toBeLessThan(0);
  });
});
