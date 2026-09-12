import { z } from 'zod';
import {
  EntityIdSchema,
  RevisionSchema,
  Point2DSchema,
  DimensionsSchema,
} from '../common.js';

/**
 * A discrete drawn image cel with dimensions, raster data, and pivot.
 */
export const CelSchema = z.object({
  /** Unique cel identifier. */
  id: EntityIdSchema,

  /** Human-readable cel label (e.g. 'Hero Head - Frame 1'). */
  name: z.string().min(1).max(128),

  /** Native pixel dimensions. */
  dimensions: DimensionsSchema,

  /** Raster image payload as a Base64 PNG data URL. */
  dataUrl: z.string(),

  /** Relative pivot anchor point [0..1]. Default is center (0.5, 0.5). */
  pivot: Point2DSchema.default({ x: 0.5, y: 0.5 }),

  /** Content revision counter for tracking edits. */
  revision: RevisionSchema.default(1),
});
export type Cel = z.infer<typeof CelSchema>;

/**
 * A drawing layer containing one or more cels.
 */
export const DrawingLayerSchema = z.object({
  /** Unique layer identifier. */
  id: EntityIdSchema,

  /** Human-readable layer name. */
  name: z.string().min(1).max(128),

  /** Layer visibility state. */
  visible: z.boolean().default(true),

  /** Opacity factor from 0.0 to 1.0. */
  opacity: z.number().min(0).max(1).default(1),

  /** Photoshop-compatible blend mode. */
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).default('normal'),

  /** Stacking display order (higher draws on top). */
  drawOrder: z.number().int().default(0),

  /** Prevents accidental strokes when locked. */
  locked: z.boolean().default(false),

  /** Collection of drawn cels in this layer. */
  cels: z.array(CelSchema).default([]),
});
export type DrawingLayer = z.infer<typeof DrawingLayerSchema>;

/**
 * Exposure mapping specifying which cel is shown across a half-open frame interval [start, endExclusive).
 */
export const ExposureSchema = z.object({
  /** Target layer entity ID. */
  layerId: EntityIdSchema,

  /** Cel entity ID to hold, or null for blank gap. */
  celId: EntityIdSchema.nullable(),

  /** Inclusive starting frame index. */
  startFrame: z.number().int().nonnegative(),

  /** Exclusive ending frame index. */
  endFrameExclusive: z.number().int().positive(),
});
export type Exposure = z.infer<typeof ExposureSchema>;

/**
 * Top-level Drawing Document containing canvas size, drawing rate, layers, and exposure schedule.
 */
export const DrawingDocumentSchema = z.object({
  /** Unique document identifier. */
  id: EntityIdSchema,

  /** Document title. */
  name: z.string().min(1).max(256),

  /** Canvas pixel dimensions. */
  dimensions: DimensionsSchema,

  /** Native authoring frames per second (e.g. 12 or 24). */
  drawingFps: z.number().int().positive().default(24),

  /** Ordered layer tree. */
  layers: z.array(DrawingLayerSchema).default([]),

  /** Exposure sheet entries. */
  exposures: z.array(ExposureSchema).default([]),
});
export type DrawingDocument = z.infer<typeof DrawingDocumentSchema>;
