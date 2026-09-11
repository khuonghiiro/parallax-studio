import type { CommandPayload, CommandResult, ManifestAsset } from '@parallax/contracts';
import { extractContour, triangulateContour, type TriangulationResult } from '@parallax/core';
import type { ProjectState } from '../../projects/project-state.js';
import type { AssetData } from '../../projects/asset-data.js';

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${ts}-${rnd}`;
}

/**
 * Handle import_image command.
 * Imports an image, extracts contour if alpha mask provided, triangulates mesh,
 * and records the asset in project state.
 */
export function handleImportImage(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return {
      status: 'not_found',
      error: 'Cannot import image: no project is loaded',
    };
  }

  const name = (payload.data.name as string) || 'Imported Layer';
  const dataUrl = payload.data.dataUrl as string;
  const width = (payload.data.width as number) || 512;
  const height = (payload.data.height as number) || 512;
  const rawAlpha = payload.data.alphaData as number[] | Uint8Array | undefined;

  if (!dataUrl) {
    return {
      status: 'validation_error',
      error: 'Image dataUrl is required for import_image',
    };
  }

  let mesh: TriangulationResult;

  if (rawAlpha && rawAlpha.length === width * height) {
    const alphaUint8 = rawAlpha instanceof Uint8Array ? rawAlpha : new Uint8Array(rawAlpha);
    try {
      const contourResult = extractContour(alphaUint8, width, height, 2.0);
      mesh = triangulateContour(contourResult.outer, contourResult.holes);
    } catch {
      // Fallback to bounding box if contour extraction fails
      mesh = createBoxMesh(width, height);
    }
  } else {
    // Standard quad/mesh for whole image
    mesh = createBoxMesh(width, height);
  }

  const assetId = generateId('asset');
  const revision = state.incrementRevision();

  const manifestAsset: ManifestAsset = {
    name,
    type: 'character',
    directory: `assets/${assetId}`,
    views: ['front'],
    hasRig: false,
    sourceHash: `sha256:${Date.now().toString(16)}`,
    createdRevision: revision,
    updatedRevision: revision,
  };

  state.updateManifest((current) => ({
    ...current,
    assets: {
      ...current.assets,
      [assetId]: manifestAsset,
    },
  }));

  const assetData: AssetData = {
    id: assetId,
    name,
    imageDataUrl: dataUrl,
    dimensions: { width, height },
    mesh,
    skeleton: null,
    weights: null,
    landmarks: null,
  };

  state.setAssetData(assetId, assetData);

  return {
    status: 'success',
    entityId: assetId,
    revision,
    data: {
      assetId,
      name,
      width,
      height,
      vertexCount: mesh.vertexCount,
      triangleCount: mesh.triangleCount,
    },
  };
}

/**
 * Creates a standard subdivided 2D rectangular mesh.
 */
function createBoxMesh(width: number, height: number): TriangulationResult {
  const outer = {
    points: [
      { x: -width / 2, y: -height / 2 },
      { x: width / 2, y: -height / 2 },
      { x: width / 2, y: height / 2 },
      { x: -width / 2, y: height / 2 },
    ],
  };

  return triangulateContour(outer);
}
