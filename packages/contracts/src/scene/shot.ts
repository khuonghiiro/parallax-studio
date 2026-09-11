import { z } from 'zod';
import { EntityIdSchema } from '../common.js';

/**
 * A shot within a scene timeline.
 * Represents a camera angle and time range for a segment of the film.
 */
export const ShotSchema = z.object({
  /** Unique shot identifier. */
  id: EntityIdSchema,

  /** Human-readable shot name (e.g., "wide-opening", "close-up-face"). */
  name: z.string().min(1).max(128),

  /** Camera used for this shot. */
  cameraId: EntityIdSchema,

  /** Start frame of the shot in the scene timeline. */
  startFrame: z.number().int().nonnegative(),

  /** End frame of the shot (inclusive). */
  endFrame: z.number().int().nonnegative(),

  /**
   * Clip assignments for instances during this shot.
   * Maps instance ID → clip ID.
   */
  clipAssignments: z.record(EntityIdSchema, EntityIdSchema),

  /** Transition type into this shot. */
  transitionIn: z.enum(['cut', 'fade', 'dissolve']).default('cut'),

  /** Transition duration in frames. */
  transitionDuration: z.number().int().nonnegative().default(0),
});
export type Shot = z.infer<typeof ShotSchema>;
