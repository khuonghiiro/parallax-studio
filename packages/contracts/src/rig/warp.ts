import { z } from 'zod';
import { EntityIdSchema, Point2DSchema } from '../common.js';

/**
 * Control point on a Free-Form Deformation (FFD) warp grid.
 * Contains the rest coordinate and the applied displacement offset (dx, dy).
 */
export const WarpControlPointSchema = z.object({
  /** Column index in the grid [0, cols - 1]. */
  col: z.number().int().nonnegative(),

  /** Row index in the grid [0, rows - 1]. */
  row: z.number().int().nonnegative(),

  /** Normalized position in rest space [0, 1]. */
  restX: z.number().min(0).max(1),
  restY: z.number().min(0).max(1),

  /** Offset displacement applied to this control point in pixels. */
  dx: z.number().default(0),
  dy: z.number().default(0),
});
export type WarpControlPoint = z.infer<typeof WarpControlPointSchema>;

/**
 * Bounding box in rest space coordinates.
 */
export const BoundingBoxSchema = z.object({
  minX: z.number(),
  minY: z.number(),
  maxX: z.number(),
  maxY: z.number(),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

/**
 * 2D Free-Form Deformation warp grid.
 * Standard resolutions: 4x4 (16 points) up to 8x8 (64 points).
 */
export const WarpGridSchema = z.object({
  /** Number of columns of control points (minimum 2). */
  cols: z.number().int().min(2).max(16).default(4),

  /** Number of rows of control points (minimum 2). */
  rows: z.number().int().min(2).max(16).default(4),

  /** Bounding box of the grid in rest space. */
  bounds: BoundingBoxSchema,

  /** All control points ordered row-by-row (rows * cols). */
  controlPoints: z.array(WarpControlPointSchema),
});
export type WarpGrid = z.infer<typeof WarpGridSchema>;

/**
 * Single morph target / blendshape for facial expressions.
 * Applies additive displacement deltas to base mesh vertices.
 */
export const MorphTargetSchema = z.object({
  /** Unique morph target name (e.g. 'blink_left', 'mouth_open', 'smile'). */
  name: z.string().min(1),

  /** Per-vertex position displacement deltas (dx, dy) in rest space. */
  deltas: z.array(Point2DSchema),

  /** Active blend weight in [0, 1]. */
  weight: z.number().min(0).max(1).default(0),
});
export type MorphTarget = z.infer<typeof MorphTargetSchema>;

/**
 * Pre-configured facial expression preset.
 */
export const ExpressionPresetSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  weights: z.record(z.number().min(0).max(1)),
});
export type ExpressionPreset = z.infer<typeof ExpressionPresetSchema>;
