import { z } from 'zod';
import { EntityIdSchema, Point2DSchema, ColorSchema } from '../common.js';

/**
 * Light type for 2.5D scenes.
 * Directional: sunlight / moonlight.
 * Point: local illumination source.
 */
export const LightTypeSchema = z.enum([
  'directional',
  'point',
]);
export type LightType = z.infer<typeof LightTypeSchema>;

/**
 * Shadow rendering mode.
 * Silhouette: uses deformed alpha contour and light direction.
 * Artistic: soft pre-painted or manually styled shadow.
 */
export const ShadowModeSchema = z.enum([
  'silhouette',
  'artistic',
  'none',
]);
export type ShadowMode = z.infer<typeof ShadowModeSchema>;

/**
 * Light definition for a 2.5D scene.
 * Controls shadows and optional normal-map illumination.
 */
export const LightSchema = z.object({
  /** Unique light identifier. */
  id: EntityIdSchema,

  /** Human-readable light name. */
  name: z.string().min(1).max(128),

  /** Light type. */
  type: LightTypeSchema,

  /** Light color. */
  color: ColorSchema.default({ r: 1, g: 1, b: 1, a: 1 }),

  /** Light intensity multiplier. */
  intensity: z.number().min(0).default(1),

  /**
   * Direction vector for directional lights.
   * Position for point lights.
   */
  position: Point2DSchema,

  /** Shadow rendering mode. */
  shadowMode: ShadowModeSchema.default('silhouette'),

  /** Shadow opacity [0, 1]. */
  shadowOpacity: z.number().min(0).max(1).default(0.5),

  /** Shadow color (typically dark, semi-transparent). */
  shadowColor: ColorSchema.default({ r: 0, g: 0, b: 0, a: 0.5 }),

  /** Whether this light is enabled. */
  enabled: z.boolean().default(true),
});
export type Light = z.infer<typeof LightSchema>;
