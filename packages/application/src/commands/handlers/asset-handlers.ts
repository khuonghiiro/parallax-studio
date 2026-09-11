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

/**
 * Handle set_active_view command.
 * Changes the active viewing angle of a multi-angle asset.
 */
export function handleSetActiveView(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const assetId = (payload.targetId || payload.data.assetId) as string;
  const viewAngle = payload.data.viewAngle as string;

  if (!assetId || !viewAngle) {
    return {
      status: 'validation_error',
      error: 'assetId and viewAngle are required for set_active_view',
    };
  }

  const asset = state.getAssetData(assetId);
  if (!asset) {
    return { status: 'not_found', error: `Asset ${assetId} not found` };
  }

  const currentViewSet = asset.viewSet ?? {
    activeView: 'front' as const,
    views: [
      {
        id: `${assetId}-view-front`,
        angle: 'front' as const,
        populated: true,
        directory: `assets/${assetId}/views/front`,
        layerIds: [assetId],
      },
    ],
  };

  const updatedViewSet = {
    ...currentViewSet,
    activeView: viewAngle as typeof currentViewSet.activeView,
  };

  state.setAssetData(assetId, {
    ...asset,
    viewSet: updatedViewSet,
  });

  const revision = state.incrementRevision();
  return {
    status: 'success',
    entityId: assetId,
    revision,
    data: { assetId, activeView: viewAngle },
  };
}

/**
 * Handle add_view_entry command.
 * Adds or populates a viewing angle in the asset's ViewSet.
 */
export function handleAddViewEntry(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const assetId = (payload.targetId || payload.data.assetId) as string;
  const angle = payload.data.angle as string;

  if (!assetId || !angle) {
    return {
      status: 'validation_error',
      error: 'assetId and angle are required for add_view_entry',
    };
  }

  const asset = state.getAssetData(assetId);
  if (!asset) {
    return { status: 'not_found', error: `Asset ${assetId} not found` };
  }

  const currentViewSet = asset.viewSet ?? {
    activeView: 'front' as const,
    views: [
      {
        id: `${assetId}-view-front`,
        angle: 'front' as const,
        populated: true,
        directory: `assets/${assetId}/views/front`,
        layerIds: [assetId],
      },
    ],
  };

  const existingIdx = currentViewSet.views.findIndex((v) => v.angle === angle);
  let updatedViews = [...currentViewSet.views];

  if (existingIdx >= 0) {
    updatedViews[existingIdx] = {
      ...updatedViews[existingIdx]!,
      populated: true,
    };
  } else {
    updatedViews.push({
      id: `${assetId}-view-${angle}`,
      angle: angle as typeof currentViewSet.activeView,
      populated: true,
      directory: `assets/${assetId}/views/${angle}`,
      layerIds: [assetId],
    });
  }

  const updatedViewSet = {
    ...currentViewSet,
    views: updatedViews,
  };

  state.setAssetData(assetId, {
    ...asset,
    viewSet: updatedViewSet,
  });

  const revision = state.incrementRevision();
  return {
    status: 'success',
    entityId: assetId,
    revision,
    data: { assetId, angle, totalViews: updatedViews.length },
  };
}

/**
 * Handle set_warp_grid command.
 * Updates the Free-Form Deformation grid for an asset.
 */
export function handleSetWarpGrid(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const assetId = (payload.targetId || payload.data.assetId) as string;
  const warpGrid = payload.data.warpGrid as import('@parallax/contracts').WarpGrid;

  if (!assetId || !warpGrid) {
    return {
      status: 'validation_error',
      error: 'assetId and warpGrid are required for set_warp_grid',
    };
  }

  const asset = state.getAssetData(assetId);
  if (!asset) {
    return { status: 'not_found', error: `Asset ${assetId} not found` };
  }

  state.setAssetData(assetId, {
    ...asset,
    warpGrid,
  });

  const revision = state.incrementRevision();
  return {
    status: 'success',
    entityId: assetId,
    revision,
    data: { assetId, cols: warpGrid.cols, rows: warpGrid.rows },
  };
}

/**
 * Handle set_morph_weight command.
 * Sets the active blend weight for a facial expression morph target.
 */
export function handleSetMorphWeight(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const assetId = (payload.targetId || payload.data.assetId) as string;
  const morphName = payload.data.name as string;
  const weight = Number(payload.data.weight);

  if (!assetId || !morphName || Number.isNaN(weight)) {
    return {
      status: 'validation_error',
      error: 'assetId, name, and numeric weight are required for set_morph_weight',
    };
  }

  const asset = state.getAssetData(assetId);
  if (!asset) {
    return { status: 'not_found', error: `Asset ${assetId} not found` };
  }

  const currentTargets = asset.morphTargets ?? [];
  const targetIdx = currentTargets.findIndex((m) => m.name === morphName);

  let updatedTargets: import('@parallax/contracts').MorphTarget[];
  if (targetIdx >= 0) {
    updatedTargets = [...currentTargets];
    updatedTargets[targetIdx] = {
      ...updatedTargets[targetIdx]!,
      weight: Math.max(0, Math.min(1, weight)),
    };
  } else {
    // If not found, create an empty one or preserve
    updatedTargets = [
      ...currentTargets,
      {
        name: morphName,
        deltas: [],
        weight: Math.max(0, Math.min(1, weight)),
      },
    ];
  }

  state.setAssetData(assetId, {
    ...asset,
    morphTargets: updatedTargets,
  });

  const revision = state.incrementRevision();
  return {
    status: 'success',
    entityId: assetId,
    revision,
    data: { assetId, morphName, weight },
  };
}

