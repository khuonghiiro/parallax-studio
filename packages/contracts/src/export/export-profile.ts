import { z } from 'zod';
import { DimensionsSchema } from '../common.js';

/**
 * Supported video codecs for export.
 */
export const VideoCodecSchema = z.enum([
  'h264',
  'hevc',
]);
export type VideoCodec = z.infer<typeof VideoCodecSchema>;

/**
 * Hardware encoder preference.
 */
export const EncoderSchema = z.enum([
  /** NVIDIA NVENC hardware encoder. */
  'nvenc',
  /** CPU software encoder. */
  'cpu',
  /** Auto-detect: prefer NVENC, fallback to CPU. */
  'auto',
]);
export type Encoder = z.infer<typeof EncoderSchema>;

/**
 * Export quality preset level.
 */
export const QualityPresetSchema = z.enum([
  'draft',
  'standard',
  'high',
  'lossless',
]);
export type QualityPreset = z.infer<typeof QualityPresetSchema>;

/**
 * Predefined resolution names matching RENDER_PROFILES.md.
 */
export const ResolutionNameSchema = z.enum([
  '1080p',
  '2k-dci',
  '1440p',
  '4k-uhd',
  '4k-dci',
]);
export type ResolutionName = z.infer<typeof ResolutionNameSchema>;

/**
 * Supported export FPS values.
 */
export const ExportFpsSchema = z.enum(['24', '30', '60', '120']);
export type ExportFps = z.infer<typeof ExportFpsSchema>;

/**
 * Complete export profile defining output video parameters.
 * Combines resolution, FPS, codec, and quality settings.
 */
export const ExportProfileSchema = z.object({
  /** Profile identifier name (e.g., "4k-uhd-60"). */
  name: z.string().min(1).max(64),

  /** Resolution preset name. */
  resolutionName: ResolutionNameSchema,

  /** Actual output dimensions. */
  resolution: DimensionsSchema,

  /** Target frames per second. */
  fps: ExportFpsSchema,

  /** Video codec. */
  codec: VideoCodecSchema.default('h264'),

  /** Encoder preference. */
  encoder: EncoderSchema.default('auto'),

  /** Quality preset. */
  quality: QualityPresetSchema.default('high'),

  /**
   * CRF (Constant Rate Factor) for quality control.
   * Lower = better quality. Typical range: 18-28.
   */
  crf: z.number().int().min(0).max(51).default(18),

  /** Maximum bitrate in kbps. Null for uncapped (CRF-only). */
  maxBitrateKbps: z.number().int().positive().nullable().default(null),
});
export type ExportProfile = z.infer<typeof ExportProfileSchema>;
