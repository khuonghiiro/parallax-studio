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
  const pose = (payload.data?.pose as 't-pose' | 'a-pose') || 't-pose';
  const landmarks = generateHumanoidLandmarks(width, height, pose);
  const autoRigResult = generateAutoSkeleton(landmarks);
  const skeleton = autoRigResult.hierarchy;

  // Compute skinning weights for each vertex in the mesh
  const weights = computeAutoWeights(asset.mesh.vertices, skeleton, 4, 3.5);

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
function generateHumanoidLandmarks(
  width: number,
  height: number,
  pose: 't-pose' | 'a-pose' = 't-pose',
): LandmarkSet {
  const w = width / 2;
  const h = height / 2;

  const make = (type: LandmarkType, x: number, y: number): Landmark => ({
    type,
    position: { x, y } as Point2D,
    confidence: 1.0,
  });

  const isTPose = pose === 't-pose';
  const armY = isTPose ? 0.52 * h : 0.50 * h;
  const elbowY = isTPose ? 0.52 * h : 0.22 * h;
  const wristY = isTPose ? 0.52 * h : -0.05 * h;
  const handY = isTPose ? 0.52 * h : -0.18 * h;
  const shoulderX = isTPose ? 0.20 * w : 0.28 * w;
  const elbowX = isTPose ? 0.55 * w : 0.44 * w;
  const wristX = isTPose ? 0.82 * w : 0.47 * w;
  const handX = isTPose ? 0.98 * w : 0.49 * w;

  return {
    imageWidth: width,
    imageHeight: height,
    landmarks: [
      make('waist_center', 0, isTPose ? 0.05 * h : 0.08 * h),
      make('chest_center', 0, isTPose ? 0.32 * h : 0.35 * h),
      make('neck', 0, isTPose ? 0.52 * h : 0.55 * h),
      make('chin', 0, isTPose ? 0.62 * h : 0.65 * h),
      make('head_top', 0, isTPose ? 0.90 * h : 0.88 * h),

      // Left arm (screen left: -x)
      make('left_shoulder', -shoulderX, armY),
      make('left_elbow', -elbowX, elbowY),
      make('left_wrist', -wristX, wristY),
      make('left_hand', -handX, handY),

      // Right arm (screen right: +x)
      make('right_shoulder', shoulderX, armY),
      make('right_elbow', elbowX, elbowY),
      make('right_wrist', wristX, wristY),
      make('right_hand', handX, handY),

      // Left leg
      make('left_hip', isTPose ? -0.15 * w : -0.16 * w, isTPose ? -0.02 * h : -0.05 * h),
      make('left_knee', isTPose ? -0.18 * w : -0.20 * w, isTPose ? -0.40 * h : -0.38 * h),
      make('left_ankle', isTPose ? -0.20 * w : -0.23 * w, isTPose ? -0.78 * h : -0.76 * h),
      make('left_foot', isTPose ? -0.22 * w : -0.25 * w, isTPose ? -0.92 * h : -0.92 * h),

      // Right leg
      make('right_hip', isTPose ? 0.15 * w : 0.16 * w, isTPose ? -0.02 * h : -0.05 * h),
      make('right_knee', isTPose ? 0.18 * w : 0.20 * w, isTPose ? -0.40 * h : -0.38 * h),
      make('right_ankle', isTPose ? 0.20 * w : 0.23 * w, isTPose ? -0.78 * h : -0.76 * h),
      make('right_foot', isTPose ? 0.22 * w : 0.25 * w, isTPose ? -0.92 * h : -0.92 * h),
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

