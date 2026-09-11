import { z } from 'zod';
import { Point2DSchema } from '../common.js';

/**
 * Joint landmark types used for auto-rigging.
 * Based on the skeleton taxonomy in AUTO_RIG.md.
 */
export const LandmarkTypeSchema = z.enum([
  // Head region
  'head_top',
  'chin',
  'left_ear',
  'right_ear',
  'nose',

  // Torso
  'neck',
  'left_shoulder',
  'right_shoulder',
  'chest_center',
  'waist_center',
  'left_hip',
  'right_hip',

  // Arms
  'left_upper_arm',
  'left_elbow',
  'left_wrist',
  'left_hand',
  'right_upper_arm',
  'right_elbow',
  'right_wrist',
  'right_hand',

  // Legs
  'left_knee',
  'left_ankle',
  'left_foot',
  'right_knee',
  'right_ankle',
  'right_foot',

  // Tail (for non-humanoid)
  'tail_base',
  'tail_mid',
  'tail_tip',

  // Custom user-defined landmark
  'custom',
]);
export type LandmarkType = z.infer<typeof LandmarkTypeSchema>;

/**
 * A single detected or user-placed landmark point.
 */
export const LandmarkSchema = z.object({
  /** Landmark semantic type. */
  type: LandmarkTypeSchema,

  /** Custom name when type is 'custom'. */
  customName: z.string().max(128).optional(),

  /** Position in pixel coordinates relative to the source image. */
  position: Point2DSchema,

  /** Confidence score from auto-detection [0, 1]. 1.0 for manual placement. */
  confidence: z.number().min(0).max(1).default(1),
});
export type Landmark = z.infer<typeof LandmarkSchema>;

/**
 * Complete set of landmarks for an asset view.
 * Used as input for auto-skeleton generation.
 */
export const LandmarkSetSchema = z.object({
  /** All detected/placed landmarks. */
  landmarks: z.array(LandmarkSchema),

  /** Source image dimensions these landmarks reference. */
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
});
export type LandmarkSet = z.infer<typeof LandmarkSetSchema>;
