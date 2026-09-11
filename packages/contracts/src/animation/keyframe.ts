import { z } from 'zod';

/**
 * Easing function types for keyframe interpolation.
 */
export const EasingTypeSchema = z.enum([
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step',
  'cubic-bezier',
]);
export type EasingType = z.infer<typeof EasingTypeSchema>;

/**
 * Cubic bezier control points for custom easing curves.
 * P0 is implicitly (0,0) and P3 is (1,1).
 */
export const CubicBezierSchema = z.object({
  x1: z.number().min(0).max(1),
  y1: z.number(),
  x2: z.number().min(0).max(1),
  y2: z.number(),
});
export type CubicBezier = z.infer<typeof CubicBezierSchema>;

/**
 * Easing configuration for a keyframe transition.
 */
export const EasingSchema = z.object({
  type: EasingTypeSchema,

  /** Bezier control points, required when type is 'cubic-bezier'. */
  bezier: CubicBezierSchema.optional(),
});
export type Easing = z.infer<typeof EasingSchema>;

/**
 * Animatable property value types.
 */
export const AnimatableValueSchema = z.union([
  z.number(),
  z.object({ x: z.number(), y: z.number() }),
  z.object({ r: z.number(), g: z.number(), b: z.number(), a: z.number() }),
]);
export type AnimatableValue = z.infer<typeof AnimatableValueSchema>;

/**
 * A single keyframe at a specific time position.
 * Time is in frames (integer), relative to the clip start.
 */
export const KeyframeSchema = z.object({
  /** Frame number within the clip (0-based). */
  frame: z.number().int().nonnegative(),

  /** Value at this keyframe. */
  value: AnimatableValueSchema,

  /** Easing to the next keyframe. */
  easing: EasingSchema.default({ type: 'linear' }),
});
export type Keyframe = z.infer<typeof KeyframeSchema>;
