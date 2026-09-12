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
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      let opaqueCount = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (alphaUint8[y * width + x]! > 10) {
            opaqueCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const contourResult = extractContour(alphaUint8, width, height, 2.0);
      let cMinX = width;
      let cMaxX = 0;
      let cMinY = height;
      let cMaxY = 0;
      for (const pt of contourResult.outer.points) {
        if (pt.x < cMinX) cMinX = pt.x;
        if (pt.x > cMaxX) cMaxX = pt.x;
        if (pt.y < cMinY) cMinY = pt.y;
        if (pt.y > cMaxY) cMaxY = pt.y;
      }

      const drawnW = maxX - minX;
      const contourW = cMaxX - cMinX;
      const drawnH = maxY - minY;
      const contourH = cMaxY - cMinY;
      if (
        (opaqueCount > 30 && drawnW > 30 && contourW < drawnW * 0.8) ||
        (opaqueCount > 30 && drawnH > 30 && contourH < drawnH * 0.8)
      ) {
        // Disconnected limbs/strokes detected: use full deformable grid
        mesh = createBoxMesh(width, height);
      } else {
        const centeredOuter = {
          points: contourResult.outer.points.map((p) => ({
            x: p.x - width / 2,
            y: height / 2 - p.y,
          })),
        };
        const centeredHoles = contourResult.holes.map((h) => ({
          points: h.points.map((p) => ({
            x: p.x - width / 2,
            y: height / 2 - p.y,
          })),
        }));
        mesh = triangulateContour(centeredOuter, centeredHoles);
        const correctedUvs: number[] = [];
        for (let i = 0; i < mesh.vertices.length; i += 2) {
          const vx = mesh.vertices[i]!;
          const vy = mesh.vertices[i + 1]!;
          const u = (vx + width / 2) / width;
          const v = (vy + height / 2) / height;
          correctedUvs.push(Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)));
        }
        mesh = { ...mesh, uvs: correctedUvs };
      }
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
 * Creates a high-density subdivided 2D deformable planar mesh.
 * Provides rich internal vertices for realistic skeletal skinning deformation.
 */
function createBoxMesh(
  width: number,
  height: number,
  cols = 16,
  rows = 24,
): TriangulationResult {
  const halfW = width / 2;
  const halfH = height / 2;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= rows; r++) {
    const vNorm = r / rows;
    const y = halfH - vNorm * height;
    const v = 1.0 - vNorm;

    for (let c = 0; c <= cols; c++) {
      const uNorm = c / cols;
      const x = -halfW + uNorm * width;
      const u = uNorm;

      vertices.push(x, y);
      uvs.push(u, v);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p0 = r * (cols + 1) + c;
      const p1 = p0 + 1;
      const p2 = (r + 1) * (cols + 1) + c;
      const p3 = p2 + 1;

      indices.push(p0, p2, p1);
      indices.push(p1, p2, p3);
    }
  }

  return {
    vertices,
    uvs,
    indices,
    vertexCount: (cols + 1) * (rows + 1),
    triangleCount: indices.length / 3,
  };
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

/**
 * Handle set_layers command.
 * Sets the decomposed cutout layers for an asset.
 */
export function handleSetLayers(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const assetId = (payload.targetId || payload.data.assetId) as string;
  const layers = payload.data.layers as import('@parallax/contracts').Layer[];

  if (!assetId || !Array.isArray(layers)) {
    return {
      status: 'validation_error',
      error: 'assetId and layers array are required for set_layers',
    };
  }

  const asset = state.getAssetData(assetId);
  if (!asset) {
    return { status: 'not_found', error: `Asset ${assetId} not found` };
  }

  state.setAssetData(assetId, {
    ...asset,
    layers,
  });

  const revision = state.incrementRevision();
  return {
    status: 'success',
    entityId: assetId,
    revision,
    data: { assetId, layerCount: layers.length },
  };
}

