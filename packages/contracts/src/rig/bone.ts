import { z } from 'zod';
import { EntityIdSchema, Point2DSchema } from '../common.js';

/**
 * A single bone in the skeletal hierarchy.
 * Bones define joints and control mesh deformation through skinning weights.
 */
export const BoneSchema = z.object({
  /** Unique bone identifier. */
  id: EntityIdSchema,

  /** Human-readable bone name (e.g., "left_upper_arm"). */
  name: z.string().min(1).max(128),

  /**
   * Parent bone ID. Null for the root bone.
   * The hierarchy must be acyclic (tree structure).
   */
  parentId: EntityIdSchema.nullable(),

  /** Bone head position in rest pose (pixel coordinates). */
  head: Point2DSchema,

  /** Bone tail position in rest pose (pixel coordinates). */
  tail: Point2DSchema,

  /** Rest-pose local rotation in radians. */
  restRotation: z.number().default(0),

  /** Bone length in pixels (computed from head to tail). */
  length: z.number().positive(),

  /** Draw order for overlapping bone visualization. */
  drawOrder: z.number().int().default(0),
});
export type Bone = z.infer<typeof BoneSchema>;

/**
 * Complete bone hierarchy for a rigged asset.
 * Must form a valid acyclic tree with exactly one root.
 */
export const BoneHierarchySchema = z.object({
  /** All bones in the hierarchy. */
  bones: z.array(BoneSchema).min(1),

  /** ID of the root bone (parentId === null). */
  rootBoneId: EntityIdSchema,
});
export type BoneHierarchy = z.infer<typeof BoneHierarchySchema>;
