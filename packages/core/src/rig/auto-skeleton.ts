import type {
  Bone,
  BoneHierarchy,
  Landmark,
  LandmarkSet,
  LandmarkType,
} from '@parallax/contracts';

/**
 * Generate a simple unique identifier.
 * Uses crypto.randomUUID when available, falls back to timestamp+random.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}
/**
 * Landmark-to-bone mapping for humanoid skeleton.
 * Defines which landmarks map to each bone's head and tail.
 */
interface BoneMapping {
  readonly name: string;
  readonly parentName: string | null;
  readonly headLandmark: LandmarkType;
  readonly tailLandmark: LandmarkType;
}

/**
 * Humanoid skeleton mapping.
 * Maps detected landmarks to bone positions.
 */
const HUMANOID_MAPPINGS: readonly BoneMapping[] = [
  { name: 'root', parentName: null, headLandmark: 'waist_center', tailLandmark: 'chest_center' },
  { name: 'spine', parentName: 'root', headLandmark: 'chest_center', tailLandmark: 'neck' },
  { name: 'neck', parentName: 'spine', headLandmark: 'neck', tailLandmark: 'chin' },
  { name: 'head', parentName: 'neck', headLandmark: 'chin', tailLandmark: 'head_top' },
  { name: 'upper_arm_l', parentName: 'spine', headLandmark: 'left_shoulder', tailLandmark: 'left_elbow' },
  { name: 'forearm_l', parentName: 'upper_arm_l', headLandmark: 'left_elbow', tailLandmark: 'left_wrist' },
  { name: 'hand_l', parentName: 'forearm_l', headLandmark: 'left_wrist', tailLandmark: 'left_hand' },
  { name: 'upper_arm_r', parentName: 'spine', headLandmark: 'right_shoulder', tailLandmark: 'right_elbow' },
  { name: 'forearm_r', parentName: 'upper_arm_r', headLandmark: 'right_elbow', tailLandmark: 'right_wrist' },
  { name: 'hand_r', parentName: 'forearm_r', headLandmark: 'right_wrist', tailLandmark: 'right_hand' },
  { name: 'thigh_l', parentName: 'root', headLandmark: 'left_hip', tailLandmark: 'left_knee' },
  { name: 'shin_l', parentName: 'thigh_l', headLandmark: 'left_knee', tailLandmark: 'left_ankle' },
  { name: 'foot_l', parentName: 'shin_l', headLandmark: 'left_ankle', tailLandmark: 'left_foot' },
  { name: 'thigh_r', parentName: 'root', headLandmark: 'right_hip', tailLandmark: 'right_knee' },
  { name: 'shin_r', parentName: 'thigh_r', headLandmark: 'right_knee', tailLandmark: 'right_ankle' },
  { name: 'foot_r', parentName: 'shin_r', headLandmark: 'right_ankle', tailLandmark: 'right_foot' },
];

/**
 * Result of auto-skeleton generation.
 */
export interface AutoSkeletonResult {
  readonly hierarchy: BoneHierarchy;
  /** Landmarks that were found and used. */
  readonly usedLandmarks: readonly LandmarkType[];
  /** Landmarks that were expected but missing. */
  readonly missingLandmarks: readonly LandmarkType[];
  /** Bones that were skipped due to missing landmarks. */
  readonly skippedBones: readonly string[];
}

/**
 * Generate a skeleton hierarchy from detected landmarks.
 * Uses the humanoid template to create bones between landmark pairs.
 *
 * @param landmarkSet The detected landmarks with image dimensions.
 * @returns The generated skeleton hierarchy and diagnostics.
 */
export function generateAutoSkeleton(
  landmarkSet: LandmarkSet,
): AutoSkeletonResult {
  const landmarkMap = new Map<LandmarkType, Landmark>();
  for (const landmark of landmarkSet.landmarks) {
    landmarkMap.set(landmark.type, landmark);
  }

  const bones: Bone[] = [];
  const boneIdByName = new Map<string, string>();
  const usedLandmarks = new Set<LandmarkType>();
  const missingLandmarks = new Set<LandmarkType>();
  const skippedBones: string[] = [];

  for (const mapping of HUMANOID_MAPPINGS) {
    const headLm = landmarkMap.get(mapping.headLandmark);
    const tailLm = landmarkMap.get(mapping.tailLandmark);

    if (!headLm || !tailLm) {
      skippedBones.push(mapping.name);
      if (!headLm) {
        missingLandmarks.add(mapping.headLandmark);
      }
      if (!tailLm) {
        missingLandmarks.add(mapping.tailLandmark);
      }
      continue;
    }

    usedLandmarks.add(mapping.headLandmark);
    usedLandmarks.add(mapping.tailLandmark);

    const id = generateId();
    boneIdByName.set(mapping.name, id);

    const parentId = mapping.parentName
      ? boneIdByName.get(mapping.parentName) ?? null
      : null;

    const length = Math.sqrt(
      (tailLm.position.x - headLm.position.x) ** 2 +
      (tailLm.position.y - headLm.position.y) ** 2,
    );

    const bone: Bone = {
      id,
      name: mapping.name,
      parentId,
      head: headLm.position,
      tail: tailLm.position,
      restRotation: 0,
      length: Math.max(length, 0.01),
      drawOrder: 0,
    };

    bones.push(bone);
  }

  if (bones.length === 0) {
    throw new Error(
      'Cannot generate skeleton: no bone could be created from available landmarks',
    );
  }

  const rootBone = bones.find((bone) => bone.parentId === null);
  if (!rootBone) {
    throw new Error('Generated skeleton has no root bone');
  }

  return {
    hierarchy: {
      bones,
      rootBoneId: rootBone.id,
    },
    usedLandmarks: [...usedLandmarks],
    missingLandmarks: [...missingLandmarks],
    skippedBones,
  };
}
