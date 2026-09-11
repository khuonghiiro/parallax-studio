import { z } from 'zod';
import { EntityIdSchema, RelativePathSchema } from '../common.js';

/**
 * Named viewing angle for multi-angle character assets.
 * Each view stores its own layers, pivots, draw order, and rig bindings.
 */
export const ViewAngleSchema = z.enum([
  'front',
  'quarter-left',
  'quarter-right',
  'side-left',
  'side-right',
  'back',
]);
export type ViewAngle = z.infer<typeof ViewAngleSchema>;

/**
 * A single view within a ViewSet.
 * Contains the source image/layers for one viewing angle.
 */
export const ViewEntrySchema = z.object({
  /** Unique view identifier. */
  id: EntityIdSchema,

  /** Viewing angle this entry represents. */
  angle: ViewAngleSchema,

  /** Whether this view has been populated with image data. */
  populated: z.boolean().default(false),

  /** Relative path to the view's source directory. */
  directory: RelativePathSchema,

  /** Layer IDs belonging to this view, in draw order. */
  layerIds: z.array(EntityIdSchema),
});
export type ViewEntry = z.infer<typeof ViewEntrySchema>;

/**
 * A collection of viewing angles for a character asset.
 * Minimum: front view. Recommended: front + two quarter views.
 */
export const ViewSetSchema = z.object({
  /** Currently active view angle. */
  activeView: ViewAngleSchema,

  /** All available views for this asset. */
  views: z.array(ViewEntrySchema).min(1),
});
export type ViewSet = z.infer<typeof ViewSetSchema>;
