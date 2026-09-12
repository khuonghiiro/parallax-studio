/**
 * Onion Skinning helper for 2D frame-by-frame animation.
 * Generates tinted ghost overlays for previous (red/warm) and next (green/cool) cels.
 */

export interface OnionSkinOptions {
  /** Opacity of the ghost overlay (0.0 to 1.0, default 0.35). */
  opacity?: number;
  /** Tint color for previous frame (default red). */
  prevTint?: { r: number; g: number; b: number };
  /** Tint color for next frame (default teal/green). */
  nextTint?: { r: number; g: number; b: number };
}

function createImageBuffer(width: number, height: number): ImageData {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(width, height);
  }
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb',
  } as unknown as ImageData;
}

/**
 * Creates a tinted ghost ImageData buffer for an onion skin frame.
 *
 * @param source Source ImageData of the adjacent cel.
 * @param tint RGB tint to apply to visible pixels.
 * @param opacity Alpha multiplier.
 * @returns Tinted ImageData ready to render.
 */
export function createTintedGhost(
  source: ImageData,
  tint: { r: number; g: number; b: number },
  opacity = 0.35,
): ImageData {
  const { width, height } = source;
  const ghost = createImageBuffer(width, height);
  const srcData = source.data;
  const dstData = ghost.data;

  for (let i = 0; i < srcData.length; i += 4) {
    const srcAlpha = srcData[i + 3]!;
    if (srcAlpha > 10) {
      dstData[i] = tint.r;
      dstData[i + 1] = tint.g;
      dstData[i + 2] = tint.b;
      // Multiply source alpha with onion skin opacity factor
      dstData[i + 3] = Math.round(srcAlpha * opacity);
    }
  }

  return ghost;
}

/**
 * Renders previous and next onion skin ghost frames onto an overlay canvas context.
 *
 * @param ctx 2D Canvas rendering context of the onion skin overlay.
 * @param prevImgData Optional ImageData of previous frame.
 * @param nextImgData Optional ImageData of next frame.
 * @param options Tint and opacity options.
 */
export function renderOnionSkin(
  ctx: CanvasRenderingContext2D,
  prevImgData?: ImageData | null,
  nextImgData?: ImageData | null,
  options: OnionSkinOptions = {},
): void {
  const {
    opacity = 0.35,
    prevTint = { r: 239, g: 68, b: 68 }, // Warm red (#ef4444)
    nextTint = { r: 16, g: 185, b: 129 }, // Cool green (#10b981)
  } = options;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // 1. Draw previous frame ghost (red/warm)
  if (prevImgData) {
    const prevGhost = createTintedGhost(prevImgData, prevTint, opacity);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = prevImgData.width;
    tempCanvas.height = prevImgData.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(prevGhost, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }

  // 2. Draw next frame ghost (green/cool)
  if (nextImgData) {
    const nextGhost = createTintedGhost(nextImgData, nextTint, opacity * 0.85);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = nextImgData.width;
    tempCanvas.height = nextImgData.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(nextGhost, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }
}
