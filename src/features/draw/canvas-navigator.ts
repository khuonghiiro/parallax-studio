import type { Point } from './stroke-smoother.js';

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Converts screen/pointer coordinates into unscaled canvas pixel coordinates.
 */
export function screenToCanvasCoords(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  canvasWidth: number,
  canvasHeight: number,
  transform: ViewportTransform,
): Point {
  const { zoom, panX, panY } = transform;
  // Center of container
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;

  // Relative to transformed canvas center
  const screenRelX = clientX - containerRect.left - centerX - panX;
  const screenRelY = clientY - containerRect.top - centerY - panY;

  // Un-zoom and convert to top-left origin
  const canvasX = screenRelX / zoom + canvasWidth / 2;
  const canvasY = screenRelY / zoom + canvasHeight / 2;

  return {
    x: Math.round(canvasX),
    y: Math.round(canvasY),
  };
}

/**
 * Mirrors a point horizontally across a vertical symmetry axis.
 */
export function mirrorPoint(p: Point, axisX: number): Point {
  return {
    x: Math.round(2 * axisX - p.x),
    y: p.y,
  };
}
