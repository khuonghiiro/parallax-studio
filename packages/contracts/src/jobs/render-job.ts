import { z } from 'zod';
import { EntityIdSchema, RevisionSchema } from '../common.js';

/**
 * Render job lifecycle states.
 */
export const JobStateSchema = z.enum([
  /** Job is queued but not yet started. */
  'pending',

  /** Renderer is actively producing frames. */
  'rendering',

  /** Frames are being encoded to video. */
  'encoding',

  /** Job completed successfully. */
  'completed',

  /** Job was cancelled by the user or system. */
  'cancelled',

  /** Job failed with an error. */
  'failed',

  /** Renderer is not connected. */
  'waiting_renderer',
]);
export type JobState = z.infer<typeof JobStateSchema>;

/**
 * Render job progress information.
 */
export const JobProgressSchema = z.object({
  /** Total frames to render. */
  totalFrames: z.number().int().positive(),

  /** Frames completed so far. */
  completedFrames: z.number().int().nonnegative(),

  /** Current state of the job. */
  state: JobStateSchema,

  /** Progress percentage [0, 100]. */
  percentage: z.number().min(0).max(100),

  /** Estimated time remaining in seconds. Null if unknown. */
  estimatedSecondsRemaining: z.number().nullable().default(null),
});
export type JobProgress = z.infer<typeof JobProgressSchema>;

/**
 * Complete render job definition.
 */
export const RenderJobSchema = z.object({
  /** Unique job identifier. */
  id: EntityIdSchema,

  /** Scene being rendered. */
  sceneId: EntityIdSchema,

  /** Export profile to use. */
  exportProfileId: z.string().min(1),

  /** Project revision snapshot for deterministic rendering. */
  snapshotRevision: RevisionSchema,

  /** Current job progress. */
  progress: JobProgressSchema,

  /** Output file path (relative to project). */
  outputPath: z.string().min(1),

  /** ISO 8601 timestamp when the job was created. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp when the job last changed state. */
  updatedAt: z.string().datetime(),

  /** Error message when state is 'failed'. */
  error: z.string().nullable().default(null),
});
export type RenderJob = z.infer<typeof RenderJobSchema>;
