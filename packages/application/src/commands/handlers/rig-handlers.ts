import type {
  CommandPayload,
  CommandResult,
  LandmarkSet,
  Landmark,
  LandmarkType,
  Point2D,
} from '@parallax/contracts';
import {
  generateAutoSkeleton,
  computeAutoWeights,
  normalizeWeights,
  solveTwoBoneIK,
} from '@parallax/core';
import type { ProjectState } from '../../projects/project-state.js';

/**
 * Handle apply_rig_template command.
 * Creates a bone hierarchy tailored to the asset and calculates auto skinning weights.
 */
export function handleApplyRigTemplate(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const assetId = (payload.targetId || payload.data.assetId) as string;
  if (!assetId) {
    return {
      status: 'validation_error',
      error: 'assetId is required for apply_rig_template',
    };
  }

  const asset = state.getAssetData(assetId);
  if (!asset) {
    return {
      status: 'not_found',
      error: `Asset ${assetId} not found`,
    };
  }

  if (!asset.mesh) {
    return {
      status: 'validation_error',
      error: `Asset ${assetId} has no mesh; cannot rig`,
    };
  }

  const { width, height } = asset.dimensions;
  const landmarks = generateHumanoidLandmarks(width, height);
  const autoRigResult = generateAutoSkeleton(landmarks);
  const skeleton = autoRigResult.hierarchy;

  // Compute skinning weights for each vertex in the mesh
  const weights = computeAutoWeights(asset.mesh.vertices, skeleton, 4, 2.0);

  // Update asset in memory
  const updatedAsset = {
    ...asset,
    skeleton,
    weights,
    landmarks,
  };
  state.setAssetData(assetId, updatedAsset);

  // Update manifest hasRig flag
  const revision = state.incrementRevision();
  state.updateManifest((current) => ({
    ...current,
    assets: {
      ...current.assets,
      [assetId]: {
        ...current.assets[assetId]!,
        hasRig: true,
        updatedRevision: revision,
      },
    },
  }));

  return {
    status: 'success',
    entityId: assetId,
    revision,
    data: {
      assetId,
      boneCount: skeleton.bones.length,
      rootBoneId: skeleton.rootBoneId,
      vertexCount: weights.length,
    },
  };
}

/**
 * Generate standard 2D humanoid landmarks centered on (0, 0).
 */
function generateHumanoidLandmarks(width: number, height: number): LandmarkSet {
  const w = width / 2;
  const h = height / 2;

  const make = (type: LandmarkType, x: number, y: number): Landmark => ({
    type,
    position: { x, y } as Point2D,
    confidence: 1.0,
  });

  return {
    imageWidth: width,
    imageHeight: height,
    landmarks: [
      make('waist_center', 0, -0.05 * h),
      make('chest_center', 0, 0.25 * h),
      make('neck', 0, 0.55 * h),
      make('chin', 0, 0.65 * h),
      make('head_top', 0, 0.95 * h),

      // Left arm (screen right from character perspective)
      make('left_shoulder', -0.35 * w, 0.5 * h),
      make('left_elbow', -0.55 * w, 0.2 * h),
      make('left_wrist', -0.65 * w, -0.1 * h),
      make('left_hand', -0.7 * w, -0.25 * h),

      // Right arm
      make('right_shoulder', 0.35 * w, 0.5 * h),
      make('right_elbow', 0.55 * w, 0.2 * h),
      make('right_wrist', 0.65 * w, -0.1 * h),
      make('right_hand', 0.7 * w, -0.25 * h),

      // Left leg
      make('left_hip', -0.2 * w, -0.1 * h),
      make('left_knee', -0.25 * w, -0.5 * h),
      make('left_ankle', -0.25 * w, -0.85 * h),
      make('left_foot', -0.3 * w, -0.95 * h),

      // Right leg
      make('right_hip', 0.2 * w, -0.1 * h),
      make('right_knee', 0.25 * w, -0.5 * h),
      make('right_ankle', 0.25 * w, -0.85 * h),
      make('right_foot', 0.3 * w, -0.95 * h),
    ],
  };
}

/**
 * Handle set_weights command.
 * Updates skinning weights for an asset's mesh (e.g. from the weight paint brush).
 * Enforces weight normalization (sum = 1.0, max 4 influences).
 */
export function handleSetWeights(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const assetId = (payload.targetId || payload.data.assetId) as string;
  const rawWeights = payload.data.weights as import('@parallax/contracts').VertexWeight[];

  if (!assetId || !Array.isArray(rawWeights)) {
    return {
      status: 'validation_error',
      error: 'assetId and weights array are required for set_weights',
    };
  }

  const asset = state.getAssetData(assetId);
  if (!asset) {
    return { status: 'not_found', error: `Asset ${assetId} not found` };
  }

  // Normalize weights
  let normalizedWeights = rawWeights;
  try {
    const normResult = normalizeWeights(rawWeights);
    normalizedWeights = normResult.weights as import('@parallax/contracts').VertexWeight[];
  } catch (err: unknown) {
    return {
      status: 'validation_error',
      error: `Failed to normalize weights: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  state.setAssetData(assetId, {
    ...asset,
    weights: normalizedWeights,
  });

  const revision = state.incrementRevision();
  return {
    status: 'success',
    entityId: assetId,
    revision,
    data: { assetId, vertexCount: normalizedWeights.length },
  };
}

/**
 * Handle solve_ik command.
 * Solves 2-bone IK analytically for limbs and returns joint rotation angles.
 */
export function handleSolveIK(
  _state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const root = payload.data.root as Point2D;
  const length1 = Number(payload.data.length1);
  const length2 = Number(payload.data.length2);
  const target = payload.data.target as Point2D;
  const poleDirection = (payload.data.poleDirection ?? 1) as 1 | -1;

  if (!root || !target || Number.isNaN(length1) || Number.isNaN(length2)) {
    return {
      status: 'validation_error',
      error: 'root, target, length1, and length2 are required for solve_ik',
    };
  }

  const ikResult = solveTwoBoneIK({
    root,
    length1,
    length2,
    target,
    poleDirection,
  });

  return {
    status: 'success',
    data: {
      angle1: ikResult.angle1,
      angle2: ikResult.angle2,
      jointPos: ikResult.jointPos,
      endPos: ikResult.endPos,
      reached: ikResult.reached,
    },
  };
}

