import type {
  CommandPayload,
  CommandResult,
  LandmarkSet,
  Landmark,
  LandmarkType,
  Point2D,
} from '@parallax/contracts';
import { generateAutoSkeleton, computeAutoWeights } from '@parallax/core';
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
