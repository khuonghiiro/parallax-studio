import { z } from 'zod';
import { EntityIdSchema } from '../common.js';

/**
 * Influence of a single bone on a vertex.
 * Weight must be in [0, 1]. For each vertex, the sum of all
 * influences must equal 1.0 (normalized weights).
 */
export const BoneInfluenceSchema = z.object({
  /** Reference to the influencing bone. */
  boneId: EntityIdSchema,

  /** Weight of this bone's influence in [0, 1]. */
  weight: z.number().min(0).max(1),
});
export type BoneInfluence = z.infer<typeof BoneInfluenceSchema>;

/**
 * Weight binding for a single mesh vertex.
 * Maximum 4 bone influences per vertex for GPU compatibility.
 */
export const VertexWeightSchema = z.object({
  /** Index into the mesh vertex array. */
  vertexIndex: z.number().int().nonnegative(),

  /**
   * Bone influences for this vertex.
   * Sum of weights must be 1.0. Maximum 4 influences.
   */
  influences: z.array(BoneInfluenceSchema).min(1).max(4),
});
export type VertexWeight = z.infer<typeof VertexWeightSchema>;

/**
 * Complete binding between a mesh and a bone hierarchy.
 * Links every mesh vertex to its controlling bones.
 */
export const BindingSchema = z.object({
  /** ID of the asset this binding belongs to. */
  assetId: EntityIdSchema,

  /** ID of the view this binding applies to. */
  viewId: EntityIdSchema,

  /** ID of the layer being bound. */
  layerId: EntityIdSchema,

  /** Per-vertex weight assignments. */
  weights: z.array(VertexWeightSchema),
});
export type Binding = z.infer<typeof BindingSchema>;
