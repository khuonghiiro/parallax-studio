import { z } from 'zod';
import { Sha256HashSchema, DimensionsSchema } from '../common.js';

/**
 * Metadata for an AI-generated image artifact being handed off
 * from the agent's client tool to the Parallax Studio app.
 */
export const ArtifactHandoffSchema = z.object({
  /** File path to the image artifact. */
  filePath: z.string().min(1),

  /** Original file name. */
  fileName: z.string().min(1).max(256),

  /** MIME type (must be image/png or image/webp for alpha support). */
  mimeType: z.enum(['image/png', 'image/webp', 'image/jpeg']),

  /** Image dimensions. */
  dimensions: DimensionsSchema,

  /** Whether the image has an alpha channel. */
  hasAlpha: z.boolean(),

  /** SHA-256 hash of the file for integrity verification. */
  contentHash: Sha256HashSchema,

  /** File size in bytes. */
  fileSizeBytes: z.number().int().positive(),

  /** The brief that produced this artifact (for provenance). */
  briefDescription: z.string().max(4096).optional(),

  /** AI tool that generated this image. */
  generatorTool: z.string().max(128).optional(),
});
export type ArtifactHandoff = z.infer<typeof ArtifactHandoffSchema>;
