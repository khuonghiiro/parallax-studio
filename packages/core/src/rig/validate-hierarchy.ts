import type { Bone, BoneHierarchy } from '@parallax/contracts';

/**
 * Result of hierarchy validation.
 */
export interface HierarchyValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

/**
 * Validate that a bone hierarchy forms a valid acyclic tree
 * with exactly one root bone (parentId === null).
 *
 * Checks:
 * 1. Exactly one root bone exists.
 * 2. All parent references point to existing bones.
 * 3. No cycles exist in the parent chain.
 * 4. All bones are reachable from the root.
 * 5. The declared rootBoneId matches the actual root.
 */
export function validateBoneHierarchy(
  hierarchy: BoneHierarchy,
): HierarchyValidationResult {
  const errors: string[] = [];
  const { bones, rootBoneId } = hierarchy;

  if (bones.length === 0) {
    return { valid: false, errors: ['Hierarchy has no bones'] };
  }

  const boneMap = new Map<string, Bone>();
  for (const bone of bones) {
    if (boneMap.has(bone.id)) {
      errors.push(`Duplicate bone ID: ${bone.id}`);
    }
    boneMap.set(bone.id, bone);
  }

  // Find roots
  const roots = bones.filter((bone) => bone.parentId === null);

  if (roots.length === 0) {
    errors.push('No root bone found (parentId === null)');
  } else if (roots.length > 1) {
    const names = roots.map((bone) => bone.name).join(', ');
    errors.push(`Multiple root bones found: ${names}`);
  }

  // Validate rootBoneId matches actual root
  const singleRoot = roots.length === 1 ? roots[0] : undefined;
  if (singleRoot && singleRoot.id !== rootBoneId) {
    errors.push(
      `Declared rootBoneId "${rootBoneId}" does not match ` +
      `actual root "${singleRoot.id}"`,
    );
  }

  // Validate parent references exist
  for (const bone of bones) {
    if (bone.parentId !== null && !boneMap.has(bone.parentId)) {
      errors.push(
        `Bone "${bone.name}" references non-existent parent: ${bone.parentId}`,
      );
    }
  }

  // Detect cycles by walking up from each bone
  for (const bone of bones) {
    const visited = new Set<string>();
    let current: string | null = bone.id;

    while (current !== null) {
      if (visited.has(current)) {
        errors.push(`Cycle detected involving bone: ${bone.name}`);
        break;
      }
      visited.add(current);
      const parent = boneMap.get(current);
      current = parent?.parentId ?? null;
    }
  }

  // Verify all bones reachable from root
  if (singleRoot) {
    const reachable = new Set<string>();
    const queue = [singleRoot.id];

    while (queue.length > 0) {
      const currentId = queue.pop()!;
      reachable.add(currentId);

      for (const bone of bones) {
        if (bone.parentId === currentId && !reachable.has(bone.id)) {
          queue.push(bone.id);
        }
      }
    }

    const unreachable = bones.filter((bone) => !reachable.has(bone.id));
    if (unreachable.length > 0) {
      const names = unreachable.map((bone) => bone.name).join(', ');
      errors.push(`Bones unreachable from root: ${names}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
