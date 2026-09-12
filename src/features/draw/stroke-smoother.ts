export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export type BrushType = 'pen' | 'pencil' | 'marker';

export interface BrushSettings {
  type: BrushType;
  size: number;
  color: string;
  smoothing: number; // 0.0 (raw) to 0.8 (high stabilization)
}

/**
 * Calculates smoothed midpoint between two points for quadratic Bezier stroke rendering.
 */
export function getMidPoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Applies exponential smoothing between raw input point and previous smoothed position.
 */
export function smoothPoint(current: Point, previous: Point, factor: number): Point {
  const f = Math.max(0, Math.min(0.9, factor));
  return {
    x: previous.x * f + current.x * (1 - f),
    y: previous.y * f + current.y * (1 - f),
  };
}

/**
 * Draws a professional smoothed stroke segment on a 2D canvas context.
 * Uses quadratic curves and brush styling (inking pen taper, sketch pencil, marker).
 */
export function drawSmoothedSegment(
  ctx: CanvasRenderingContext2D,
  p0: Point,
  p1: Point,
  p2: Point,
  settings: BrushSettings,
): void {
  const mid1 = getMidPoint(p0, p1);
  const mid2 = getMidPoint(p1, p2);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (settings.type) {
    case 'pen':
      // Crisp inking pen with high opacity
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = settings.size;
      ctx.globalAlpha = 1.0;
      break;

    case 'pencil':
      // Soft sketch pencil with subtle texture
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = Math.max(1, settings.size * 0.6);
      ctx.globalAlpha = 0.45;
      break;

    case 'marker':
      // Semi-translucent broad marker
      ctx.strokeStyle = settings.color;
      ctx.lineWidth = settings.size * 1.5;
      ctx.globalAlpha = 0.6;
      break;
  }

  ctx.beginPath();
  ctx.moveTo(mid1.x, mid1.y);
  ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
  ctx.stroke();

  ctx.restore();
}
