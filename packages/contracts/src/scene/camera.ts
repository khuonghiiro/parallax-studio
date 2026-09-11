import { z } from 'zod';
import { EntityIdSchema, Point2DSchema, DimensionsSchema } from '../common.js';

/**
 * Camera projection type.
 */
export const ProjectionTypeSchema = z.enum([
  'orthographic',
  'perspective',
]);
export type ProjectionType = z.infer<typeof ProjectionTypeSchema>;

/**
 * Camera definition for a 2.5D scene.
 * Orthographic is the default for consistent 2D appearance.
 * Perspective adds depth-based parallax.
 */
export const CameraSchema = z.object({
  /** Unique camera identifier. */
  id: EntityIdSchema,

  /** Human-readable camera name. */
  name: z.string().min(1).max(128),

  /** Camera projection mode. */
  projection: ProjectionTypeSchema.default('orthographic'),

  /** Camera position in scene coordinates. */
  position: Point2DSchema,

  /** Camera zoom level. 1.0 = no zoom. */
  zoom: z.number().positive().default(1),

  /** Camera rotation in radians. */
  rotation: z.number().default(0),

  /** Viewport dimensions for framing. */
  viewport: DimensionsSchema,

  /**
   * Field of view in degrees (perspective only).
   * Ignored for orthographic projection.
   */
  fov: z.number().min(1).max(179).default(50),

  /**
   * Depth of the focal plane for parallax.
   * Objects at this depth appear at 1:1 scale.
   */
  focalDepth: z.number().default(0),
});
export type Camera = z.infer<typeof CameraSchema>;
