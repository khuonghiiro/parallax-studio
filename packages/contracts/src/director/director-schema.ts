import { z } from 'zod';
import { EntityIdSchema } from '../common.js';

/**
 * Camera framing type parsed from natural language screenplay.
 */
export const ShotCameraAngleSchema = z.enum([
  'wide',
  'medium',
  'close-up',
  'over-the-shoulder',
]);
export type ShotCameraAngle = z.infer<typeof ShotCameraAngleSchema>;

/**
 * A single shot extracted from a screenplay.
 */
export const ParsedShotSchema = z.object({
  id: EntityIdSchema,
  shotName: z.string().min(1).max(128),
  actionDescription: z.string().max(1024),
  cameraAngle: ShotCameraAngleSchema.default('medium'),
  characterName: z.string().max(128).optional(),
  startFrame: z.number().int().nonnegative(),
  durationFrames: z.number().int().positive(),
  emotion: z.string().max(64).optional(),
});
export type ParsedShot = z.infer<typeof ParsedShotSchema>;

/**
 * Result of parsing a textual screenplay into structured shots.
 */
export const ScriptParseResultSchema = z.object({
  title: z.string().min(1).max(256),
  shots: z.array(ParsedShotSchema),
  totalFrames: z.number().int().nonnegative(),
  characterNames: z.array(z.string()),
});
export type ScriptParseResult = z.infer<typeof ScriptParseResultSchema>;

/**
 * Input request for automated scene staging.
 */
export const StagingRequestSchema = z.object({
  script: ScriptParseResultSchema,
  sceneId: EntityIdSchema.optional(),
  defaultAssetId: EntityIdSchema.optional(),
});
export type StagingRequest = z.infer<typeof StagingRequestSchema>;
