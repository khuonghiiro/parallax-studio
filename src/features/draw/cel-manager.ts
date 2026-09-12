import type { CanvasLayer } from './LayerStackPanel.js';

export interface CelData {
  id: string;
  name: string;
  layersData: Record<string, ImageData>;
}

/**
 * Capture ImageData snapshots of all layers for the active cel.
 */
export function snapshotLayers(
  layers: CanvasLayer[],
  width: number,
  height: number,
): Record<string, ImageData> {
  const snapData: Record<string, ImageData> = {};
  for (const l of layers) {
    const ctx = l.canvas.getContext('2d');
    if (ctx) {
      snapData[l.id] = ctx.getImageData(0, 0, width, height);
    }
  }
  return snapData;
}

/**
 * Restore layer canvas pixels from a cel's snapshot.
 */
export function restoreLayersFromSnapshot(
  layers: CanvasLayer[],
  snapData: Record<string, ImageData> | undefined,
  width: number,
  height: number,
): void {
  for (const l of layers) {
    const ctx = l.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
      const data = snapData?.[l.id];
      if (data) {
        ctx.putImageData(data, 0, 0);
      }
    }
  }
}
