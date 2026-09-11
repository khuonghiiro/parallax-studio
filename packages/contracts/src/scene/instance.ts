import { z } from 'zod';
import { EntityIdSchema, Point2DSchema } from '../common.js';

/**
 * An asset instance placed in a scene.
 * Represents a positioned, scaled, rotated reference to an asset.
 */
export const SceneInstanceSchema = z.object({
  /** Unique instance identifier. */
  id: EntityIdSchema,

  /** Reference to the source asset. */
  assetId: EntityIdSchema,

  /** Human-readable instance name. */
  name: z.string().min(1).max(128),

  /** Position in scene coordinates (pixels). */
  position: Point2DSchema,

  /** Rotation in radians. */
  rotation: z.number().default(0),

  /** Uniform scale factor. */
  scale: z.number().positive().default(1),

  /**
   * Depth layer for parallax and shadow ordering.
   * Higher values are further from camera.
   */
  depth: z.number().default(0),

  /** Visibility in the scene. */
  visible: z.boolean().default(true),

  /** Active clip ID for this instance. Null means rest pose. */
  activeClipId: EntityIdSchema.nullable().default(null),
});
export type SceneInstance = z.infer<typeof SceneInstanceSchema>;
