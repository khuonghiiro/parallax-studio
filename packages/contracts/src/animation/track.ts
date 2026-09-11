import { z } from 'zod';
import { EntityIdSchema } from '../common.js';
import { KeyframeSchema } from './keyframe.js';

/**
 * Property path that a track animates.
 * Uses dot-notation referencing the target entity and property.
 * Examples: "bone.left_arm.rotation", "layer.head.opacity"
 */
export const PropertyPathSchema = z
  .string()
  .min(1)
  .max(256);
export type PropertyPath = z.infer<typeof PropertyPathSchema>;

/**
 * An animation track for a single property on a single target.
 * Tracks contain ordered keyframes and control one animatable value.
 */
export const TrackSchema = z.object({
  /** Unique track identifier. */
  id: EntityIdSchema,

  /** The entity being animated (bone ID, layer ID, camera ID). */
  targetId: EntityIdSchema,

  /** Dot-notation property path being animated. */
  property: PropertyPathSchema,

  /**
   * Keyframes sorted by frame number.
   * Must have at least one keyframe.
   */
  keyframes: z.array(KeyframeSchema).min(1),

  /** Whether this track is muted (skipped during playback). */
  muted: z.boolean().default(false),
});
export type Track = z.infer<typeof TrackSchema>;
