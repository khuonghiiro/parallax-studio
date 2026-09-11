import { z } from 'zod';

/**
 * Image generation brief for AI client tools.
 * Describes what image the AI should create.
 * The app does not own the generation model — the agent's client tool does.
 */
export const ImageGenerationBriefSchema = z.object({
  /** Brief description of the desired image. */
  description: z.string().min(1).max(4096),

  /** Character/asset name for consistency tracking. */
  subjectName: z.string().min(1).max(256),

  /** Desired image style. */
  style: z.string().max(256).optional(),

  /** Desired view angle. */
  viewAngle: z.string().max(64).optional(),

  /** Desired dimensions. */
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),

  /** Whether the image should have a transparent background. */
  transparentBackground: z.boolean().default(true),

  /** Reference image paths for style consistency. */
  referenceImages: z.array(z.string()).default([]),

  /** Additional requirements or constraints. */
  requirements: z.array(z.string()).default([]),
});
export type ImageGenerationBrief = z.infer<typeof ImageGenerationBriefSchema>;
