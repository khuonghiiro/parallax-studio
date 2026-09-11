import * as THREE from 'three';
import type { BoneHierarchy, Bone } from '@parallax/contracts';

/**
 * Create a Three.js Skeleton from a Parallax bone hierarchy.
 *
 * Maps the bone tree structure to Three.js Bone objects
 * with correct parent-child relationships.
 */
export function createSkeleton(
  hierarchy: BoneHierarchy,
): THREE.Skeleton {
  const boneMap = new Map<string, THREE.Bone>();
  const threeBones: THREE.Bone[] = [];

  // Create all Three.js bones
  for (const bone of hierarchy.bones) {
    const threeBone = new THREE.Bone();
    threeBone.name = bone.name;

    // Set rest pose position (head position)
    threeBone.position.set(bone.head.x, bone.head.y, 0);

    boneMap.set(bone.id, threeBone);
    threeBones.push(threeBone);
  }

  // Establish parent-child relationships
  for (const bone of hierarchy.bones) {
    if (bone.parentId !== null) {
      const parentBone = boneMap.get(bone.parentId);
      const childBone = boneMap.get(bone.id);

      if (parentBone && childBone) {
        parentBone.add(childBone);

        // Convert to local position relative to parent
        const parentData = findBone(hierarchy.bones, bone.parentId);
        if (parentData) {
          childBone.position.set(
            bone.head.x - parentData.head.x,
            bone.head.y - parentData.head.y,
            0,
          );
        }
      }
    }
  }

  return new THREE.Skeleton(threeBones);
}

/**
 * Update a Three.js Skeleton from a pose (bone rotations).
 *
 * @param skeleton The Three.js Skeleton to update.
 * @param boneRotations Map of bone name → rotation in radians.
 */
export function applyPoseToSkeleton(
  skeleton: THREE.Skeleton,
  boneRotations: ReadonlyMap<string, number>,
): void {
  for (const bone of skeleton.bones) {
    const rotation = boneRotations.get(bone.name);

    if (rotation !== undefined) {
      bone.rotation.z = rotation;
    }
  }
}

/**
 * Reset all bone rotations to rest pose.
 */
export function resetSkeletonPose(skeleton: THREE.Skeleton): void {
  for (const bone of skeleton.bones) {
    bone.rotation.set(0, 0, 0);
    bone.scale.set(1, 1, 1);
  }
}

/**
 * Find a bone by ID in the hierarchy array.
 */
function findBone(
  bones: readonly Bone[],
  id: string,
): Bone | undefined {
  return bones.find((bone) => bone.id === id);
}
