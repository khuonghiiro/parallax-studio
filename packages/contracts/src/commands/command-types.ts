import { z } from 'zod';
import { EntityIdSchema, RevisionSchema } from '../common.js';

/**
 * Command domain classification.
 */
export const CommandDomainSchema = z.enum([
  'asset',
  'rig',
  'mesh',
  'animation',
  'scene',
  'export',
  'project',
]);
export type CommandDomain = z.infer<typeof CommandDomainSchema>;

/**
 * All supported command types across domains.
 */
export const CommandTypeSchema = z.enum([
  // Asset commands
  'import_image',
  'set_draw_order',
  'set_pivot',
  'set_layer_visibility',
  'set_layer_opacity',
  'set_active_view',
  'add_view_entry',

  // Rig commands
  'set_landmarks',
  'apply_rig_template',
  'add_bone',
  'remove_bone',
  'move_bone',
  'set_weights',
  'set_warp_grid',
  'set_morph_weight',
  'solve_ik',

  // Mesh commands
  'generate_mesh',
  'refine_mesh',

  // Animation commands
  'set_keyframe',
  'remove_keyframe',
  'create_clip',
  'delete_clip',
  'apply_animation_template',

  // Scene commands
  'add_instance',
  'remove_instance',
  'update_instance',
  'set_camera',
  'set_light',
  'add_shot',
  'remove_shot',
  'update_shot',

  // Export commands
  'start_export_job',
  'cancel_export_job',

  // Project commands
  'create_project',
  'save_project',
]);
export type CommandType = z.infer<typeof CommandTypeSchema>;

/**
 * Base command payload shared by all commands.
 * Specific command handlers extend this with their own data.
 */
export const CommandPayloadSchema = z.object({
  /** Command type identifier. */
  type: CommandTypeSchema,

  /** Domain this command belongs to. */
  domain: CommandDomainSchema,

  /**
   * Command-specific data.
   * Each handler validates this against its own schema.
   */
  data: z.record(z.unknown()),

  /** Target entity ID (when applicable). */
  targetId: EntityIdSchema.optional(),

  /** Expected current revision for optimistic concurrency. */
  expectedRevision: RevisionSchema.optional(),
});
export type CommandPayload = z.infer<typeof CommandPayloadSchema>;

/**
 * Result status for command execution.
 */
export const CommandStatusSchema = z.enum([
  'success',
  'validation_error',
  'conflict',
  'not_found',
  'internal_error',
]);
export type CommandStatus = z.infer<typeof CommandStatusSchema>;

/**
 * Result returned after command execution.
 */
export const CommandResultSchema = z.object({
  /** Whether the command succeeded. */
  status: CommandStatusSchema,

  /** New revision after successful execution. */
  revision: RevisionSchema.optional(),

  /** ID of the created/modified entity. */
  entityId: EntityIdSchema.optional(),

  /** Human-readable error message on failure. */
  error: z.string().optional(),

  /** Additional result data from the handler. */
  data: z.record(z.unknown()).optional(),
});
export type CommandResult = z.infer<typeof CommandResultSchema>;
