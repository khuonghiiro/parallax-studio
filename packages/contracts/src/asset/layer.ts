import { z } from 'zod';
import {
  EntityIdSchema,
  RelativePathSchema,
  DimensionsSchema,
  Point2DSchema,
  ColorSchema,
  RevisionSchema,
} from '../common.js';

/**
 * Material properties for a layer's visual appearance.
 * Flat color is the default style; normal maps add lighting response
 * without creating geometry.
 */
export const MaterialSchema = z.object({
  /** Relative path to the color/diffuse image. */
  colorImage: RelativePathSchema,

  /** Relative path to the alpha mask. Null if alpha is embedded in colorImage. */
  alphaMask: RelativePathSchema.nullable().default(null),

  /** Optional normal map for lighting response. */
  normalMap: RelativePathSchema.nullable().default(null),

  /** Optional roughness map. */
  roughnessMap: RelativePathSchema.nullable().default(null),

  /** Tint color multiplied with the texture. */
  tint: ColorSchema.default({ r: 1, g: 1, b: 1, a: 1 }),
});
export type Material = z.infer<typeof MaterialSchema>;

/**
 * A single image layer within an asset view.
 * Represents a segmented body part (head, torso, left-arm, etc.)
 * with its own texture, draw order, and pivot.
 */
export const LayerSchema = z.object({
  /** Unique layer identifier. */
  id: EntityIdSchema,

  /** Human-readable name (e.g., "head", "left-arm"). */
  name: z.string().min(1).max(128),

  /** Layer visibility in the editor. */
  visible: z.boolean().default(true),

  /** Lock state prevents editing. */
  locked: z.boolean().default(false),

  /** Z-order for 2D stacking. Higher values render on top. */
  drawOrder: z.number().int(),

  /** Opacity in [0, 1]. */
  opacity: z.number().min(0).max(1).default(1),

  /** Pivot point in pixel coordinates relative to the layer's source image. */
  pivot: Point2DSchema,

  /** Source image dimensions. */
  dimensions: DimensionsSchema,

  /** Material (texture references and tint). */
  material: MaterialSchema,

  /** Revision when this layer was last modified. */
  updatedRevision: RevisionSchema,

  /** Direct data URL for the layer texture image. */
  imageDataUrl: z.string().optional(),

  /** Name of the bone this layer binds to for rigid cutout animation. */
  bindBoneName: z.string().optional(),

  /** Position offset relative to character origin. */
  position: Point2DSchema.optional(),

  /** Texture UV coordinates [0..1] when sampling from atlas/master texture. */
  uvBounds: z.object({
    uMin: z.number(),
    vMin: z.number(),
    uMax: z.number(),
    vMax: z.number(),
  }).optional(),
});
export type Layer = z.infer<typeof LayerSchema>;

/**
 * Asset type classification.
 */
export const AssetTypeSchema = z.enum([
  'character',
  'prop',
  'background',
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;
