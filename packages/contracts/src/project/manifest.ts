import { z } from 'zod';
import { EntityIdSchema, Sha256HashSchema, RevisionSchema } from '../common.js';
import { AssetTypeSchema } from '../asset/layer.js';

/**
 * Asset entry in the project manifest.
 */
export const ManifestAssetSchema = z.object({
  /** Human-readable asset name. */
  name: z.string().min(1).max(256),

  /** Asset classification. */
  type: AssetTypeSchema,

  /** Relative path to asset directory. */
  directory: z.string().min(1),

  /** Available view angles. */
  views: z.array(z.string()),

  /** Whether this asset has been rigged. */
  hasRig: z.boolean().default(false),

  /** SHA-256 hash of the source image. */
  sourceHash: Sha256HashSchema,

  /** Revision when asset was created. */
  createdRevision: RevisionSchema,

  /** Revision when asset was last modified. */
  updatedRevision: RevisionSchema,
});
export type ManifestAsset = z.infer<typeof ManifestAssetSchema>;

/**
 * Scene entry in the project manifest.
 */
export const ManifestSceneSchema = z.object({
  /** Human-readable scene name. */
  name: z.string().min(1).max(256),

  /** Relative path to scene directory. */
  directory: z.string().min(1),

  /** Revision when scene was created. */
  createdRevision: RevisionSchema,

  /** Revision when scene was last modified. */
  updatedRevision: RevisionSchema,
});
export type ManifestScene = z.infer<typeof ManifestSceneSchema>;

/**
 * Default project settings.
 */
export const ProjectDefaultsSchema = z.object({
  /** Timeline authoring FPS. */
  timelineFps: z.number().int().positive().default(24),

  /** Preview playback FPS. */
  previewFps: z.number().int().positive().default(60),

  /** Default export profile name. */
  exportProfile: z.string().default('4k-uhd-60'),
});
export type ProjectDefaults = z.infer<typeof ProjectDefaultsSchema>;

/**
 * Project manifest — the single entry point for opening a project.
 * Matches the structure defined in PROJECT_FORMAT.md.
 */
export const ManifestSchema = z.object({
  /** Schema version for migration. Starts at 1. */
  schemaVersion: z.number().int().positive(),

  /** Project name. */
  name: z.string().min(1).max(256),

  /** ISO 8601 creation timestamp. */
  createdAt: z.string().datetime(),

  /** ISO 8601 last-update timestamp. */
  updatedAt: z.string().datetime(),

  /** Global revision counter. Incremented after every successful command. */
  revision: RevisionSchema,

  /** Asset registry keyed by asset ID. */
  assets: z.record(EntityIdSchema, ManifestAssetSchema),

  /** Scene registry keyed by scene ID. */
  scenes: z.record(EntityIdSchema, ManifestSceneSchema),

  /** Default project settings. */
  defaults: ProjectDefaultsSchema,
});
export type Manifest = z.infer<typeof ManifestSchema>;
