import { z } from 'zod';

/**
 * Pre-defined rig templates by character archetype.
 * Each template defines expected bones, default proportions,
 * and landmark-to-bone mapping rules.
 */
export const RigTemplateTypeSchema = z.enum([
  'humanoid',
  'chibi',
  'quadruped',
  'avian',
  'custom',
]);
export type RigTemplateType = z.infer<typeof RigTemplateTypeSchema>;

/**
 * Bone definition within a rig template.
 * Defines the expected bone name, parent, and proportion hints.
 */
export const TemplateBoneSchema = z.object({
  /** Bone name matching the skeleton taxonomy. */
  name: z.string().min(1).max(128),

  /** Parent bone name. Null for root. */
  parentName: z.string().max(128).nullable(),

  /**
   * Expected proportion of this bone's length relative to
   * the character's total height. Used for auto-skeleton scaling.
   */
  proportionHint: z.number().min(0).max(1).optional(),

  /** Landmark types that map to this bone's head position. */
  headLandmarks: z.array(z.string()),

  /** Landmark types that map to this bone's tail position. */
  tailLandmarks: z.array(z.string()),
});
export type TemplateBone = z.infer<typeof TemplateBoneSchema>;

/**
 * Complete rig template for a character archetype.
 */
export const RigTemplateSchema = z.object({
  /** Template type identifier. */
  type: RigTemplateTypeSchema,

  /** Human-readable template name. */
  name: z.string().min(1).max(128),

  /** Ordered bone definitions forming the skeleton template. */
  bones: z.array(TemplateBoneSchema).min(1),

  /** Minimum number of landmarks required to use this template. */
  minimumLandmarks: z.number().int().positive(),
});
export type RigTemplate = z.infer<typeof RigTemplateSchema>;
