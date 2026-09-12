// Parallax Studio - Layer Operations Helper
// Manages layer creation, assembly, and conversion for cutout parts and drawing canvas.

import type { CanvasLayer } from './LayerStackPanel.js';
import type { CutoutPart } from './cutout-slicer.js';

export function createBlankCanvas(
  width: number = 600,
  height: number = 600
): HTMLCanvasElement {
  if (typeof document !== 'undefined' && document.createElement) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return {
    width,
    height,
    getContext: () => null,
  } as unknown as HTMLCanvasElement;
}

/**
 * Converts sliced cutout parts into full-size DrawingCanvas layers.
 * Places each part at its exact bounding box position on a 600x600 layer canvas.
 */
export function convertPartsToCanvasLayers(
  parts: CutoutPart[],
  canvasWidth: number = 600,
  canvasHeight: number = 600
): CanvasLayer[] {
  // Sort parts by zIndex ascending (lower zIndex rendered first / lower in stack)
  const sortedParts = [...parts].sort((a, b) => a.zIndex - b.zIndex);

  return sortedParts.map((part) => {
    const layerCanvas = createBlankCanvas(canvasWidth, canvasHeight);
    const ctx = layerCanvas.getContext ? layerCanvas.getContext('2d') : null;

    if (ctx && part.canvas) {
      const [x0, y0] = part.bounds;
      ctx.drawImage(part.canvas, x0, y0);
    }

    return {
      id: `layer-${part.id}`,
      name: `${part.nameVi} (${part.nameEn})`,
      visible: true,
      locked: false,
      opacity: 1.0,
      canvas: layerCanvas,
    };
  });
}

/**
 * Composites all cutout parts onto a single full-body preview canvas.
 */
export function compositePartsToCanvas(
  parts: CutoutPart[],
  targetCanvas: HTMLCanvasElement
): void {
  const ctx = targetCanvas.getContext ? targetCanvas.getContext('2d') : null;
  if (!ctx) return;

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  const sortedParts = [...parts].sort((a, b) => a.zIndex - b.zIndex);

  for (const part of sortedParts) {
    if (part.canvas) {
      const [x0, y0] = part.bounds;
      ctx.drawImage(part.canvas, x0, y0);
    }
  }
}

export interface ExportToRigOptions {
  canvas: HTMLCanvasElement;
  currentAssetName?: string;
  dispatch: (command: any) => Promise<any>;
  projectState: any;
  setSelectedAssetId: (id: string) => void;
  setSelectedInstanceId: (id: string) => void;
  setWorkspace?: (ws: any) => void;
  setMode?: (mode: any) => void;
}

/**
 * Exports drawing canvas into a 2.5D rigged humanoid asset and switches to rig workspace.
 */
export async function exportCanvasToRig(options: ExportToRigOptions): Promise<boolean> {
  const {
    canvas,
    currentAssetName,
    dispatch,
    projectState,
    setSelectedAssetId,
    setSelectedInstanceId,
    setWorkspace,
    setMode,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const alphaData: number[] = [];
  let hasDrawnPixels = false;

  for (let i = 3; i < imgData.data.length; i += 4) {
    const alpha = imgData.data[i]!;
    alphaData.push(alpha);
    if (alpha > 10) hasDrawnPixels = true;
  }

  if (!hasDrawnPixels) {
    alert('Vui lòng vẽ nhân vật hoặc hình dạng trước khi chuyển sang Rig!');
    return false;
  }

  const dataUrl = canvas.toDataURL('image/png');
  const timeStr = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const assetName = currentAssetName ? `${currentAssetName} (Cel)` : `Hand-drawn Cel ${timeStr}`;

  // 1. Import image & triangulate mesh
  const result = await dispatch({
    type: 'import_image',
    domain: 'asset',
    data: {
      name: assetName,
      dataUrl,
      width,
      height,
      alphaData,
    },
  });

  if (result.status === 'success' && result.entityId) {
    const assetId = result.entityId;
    setSelectedAssetId(assetId);

    // 2. Automatically generate humanoid skeleton & compute skinning weights
    await dispatch({
      type: 'apply_rig_template',
      domain: 'rig',
      targetId: assetId,
      data: { assetId, template: 'humanoid' },
    });

    // 3. Automatically stage character on 2.5D scene
    const sceneData = projectState.getAllSceneData()[0];
    const sceneId = sceneData?.id ?? 'scene-default';
    const instRes = await dispatch({
      type: 'add_instance',
      domain: 'scene',
      data: {
        sceneId,
        assetId,
        name: assetName,
        position: { x: 0, y: 0 },
        depth: 0,
        scale: 1,
        rotation: 0,
      },
    });

    if (instRes.status === 'success' && instRes.entityId) {
      setSelectedInstanceId(instRes.entityId);
    }

    // 4. Switch to Rig workspace
    if (setWorkspace) setWorkspace('rig');
    if (setMode) setMode('rig');
    return true;
  }

  return false;
}

