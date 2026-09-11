import { z } from 'zod';
import { EntityIdSchema } from '../common.js';

/**
 * An animation clip: a reusable segment of animation with
 * a defined time range, containing references to tracks.
 */
export const ClipSchema = z.object({
  /** Unique clip identifier. */
  id: EntityIdSchema,

  /** Human-readable clip name (e.g., "walk_cycle", "wave"). */
  name: z.string().min(1).max(128),

  /** Start frame (inclusive). */
  startFrame: z.number().int().nonnegative(),

  /** End frame (inclusive). Must be >= startFrame. */
  endFrame: z.number().int().nonnegative(),

  /** IDs of tracks that belong to this clip. */
  trackIds: z.array(EntityIdSchema),

  /** Whether this clip loops during playback. */
  loop: z.boolean().default(false),

  /** Playback speed multiplier. */
  speed: z.number().positive().default(1),
});
export type Clip = z.infer<typeof ClipSchema>;
