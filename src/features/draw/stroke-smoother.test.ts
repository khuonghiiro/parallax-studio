import { describe, it, expect } from 'vitest';
import { getMidPoint, smoothPoint } from './stroke-smoother.js';
import { mirrorPoint, screenToCanvasCoords } from './canvas-navigator.js';

describe('stroke-smoother and canvas-navigator', () => {
  it('calculates midpoints accurately', () => {
    const mid = getMidPoint({ x: 10, y: 20 }, { x: 30, y: 60 });
    expect(mid.x).toBe(20);
    expect(mid.y).toBe(40);
  });

  it('smooths points using exponential factor', () => {
    const smoothed = smoothPoint({ x: 100, y: 100 }, { x: 0, y: 0 }, 0.5);
    expect(smoothed.x).toBe(50);
    expect(smoothed.y).toBe(50);
  });

  it('mirrors point horizontally across symmetry axis', () => {
    const axisX = 300;
    // Point at x=200 is 100px left of axis -> mirror should be at x=400 (100px right)
    const mirrored = mirrorPoint({ x: 200, y: 150 }, axisX);
    expect(mirrored.x).toBe(400);
    expect(mirrored.y).toBe(150);
  });

  it('converts screen to canvas coords with zoom and pan', () => {
    const rect = {
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    } as DOMRect;

    // Center click with 1.0 zoom and 0 pan -> center of canvas (300, 300)
    const center = screenToCanvasCoords(400, 300, rect, 600, 600, {
      zoom: 1.0,
      panX: 0,
      panY: 0,
    });
    expect(center.x).toBe(300);
    expect(center.y).toBe(300);
  });
});
