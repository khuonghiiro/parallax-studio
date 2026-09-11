import { z } from 'zod';

/**
 * Unique identifier for assets, scenes, and other entities.
 * Uses UUID v4 format.
 */
export const EntityIdSchema = z.string().uuid();
export type EntityId = z.infer<typeof EntityIdSchema>;

/**
 * SHA-256 hash string for content integrity verification.
 */
export const Sha256HashSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/, 'Must be a sha256: prefixed hex hash');
export type Sha256Hash = z.infer<typeof Sha256HashSchema>;

/**
 * Relative file path within the project directory.
 * Uses forward slashes, no traversal.
 */
export const RelativePathSchema = z
  .string()
  .min(1)
  .refine(
    (value) => !value.includes('\\') && !value.startsWith('/') && !value.includes('..'),
    'Must be a relative path with forward slashes and no traversal',
  );
export type RelativePath = z.infer<typeof RelativePathSchema>;

/**
 * 2D point in pixel coordinates.
 */
export const Point2DSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point2D = z.infer<typeof Point2DSchema>;

/**
 * 2D dimensions in pixels.
 */
export const DimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type Dimensions = z.infer<typeof DimensionsSchema>;

/**
 * RGBA color with normalized [0, 1] components.
 */
export const ColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1).default(1),
});
export type Color = z.infer<typeof ColorSchema>;

/**
 * Revision number for change tracking.
 */
export const RevisionSchema = z.number().int().nonnegative();
export type Revision = z.infer<typeof RevisionSchema>;
