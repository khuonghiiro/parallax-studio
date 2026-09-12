/**
 * @parallax/contracts — Domain schemas for Parallax Studio.
 *
 * All types are defined with Zod and exported as both schemas
 * (for runtime validation) and TypeScript types (for static checks).
 *
 * Dependency rule: contracts depends only on Zod.
 * It must NOT import from core, runtime, UI, or service.
 */

// Shared primitives
export {
  EntityIdSchema,
  Sha256HashSchema,
  RelativePathSchema,
  Point2DSchema,
  DimensionsSchema,
  ColorSchema,
  RevisionSchema,
} from './common.js';
export type {
  EntityId,
  Sha256Hash,
  RelativePath,
  Point2D,
  Dimensions,
  Color,
  Revision,
} from './common.js';

// Asset domain
export { LayerSchema, MaterialSchema, AssetTypeSchema } from './asset/layer.js';
export type { Layer, Material, AssetType } from './asset/layer.js';
export { ViewAngleSchema, ViewEntrySchema, ViewSetSchema } from './asset/view.js';
export type { ViewAngle, ViewEntry, ViewSet } from './asset/view.js';

// Rig domain
export { BoneSchema, BoneHierarchySchema } from './rig/bone.js';
export type { Bone, BoneHierarchy } from './rig/bone.js';
export { BoneInfluenceSchema, VertexWeightSchema, BindingSchema } from './rig/binding.js';
export type { BoneInfluence, VertexWeight, Binding } from './rig/binding.js';
export { LandmarkTypeSchema, LandmarkSchema, LandmarkSetSchema } from './rig/landmark.js';
export type { LandmarkType, Landmark, LandmarkSet } from './rig/landmark.js';
export {
  RigTemplateTypeSchema,
  TemplateBoneSchema,
  RigTemplateSchema,
} from './rig/rig-template.js';
export type { RigTemplateType, TemplateBone, RigTemplate } from './rig/rig-template.js';
export {
  WarpControlPointSchema,
  BoundingBoxSchema,
  WarpGridSchema,
  MorphTargetSchema,
  ExpressionPresetSchema,
} from './rig/warp.js';
export type {
  WarpControlPoint,
  BoundingBox,
  WarpGrid,
  MorphTarget,
  ExpressionPreset,
} from './rig/warp.js';

// Animation domain
export {
  EasingTypeSchema,
  CubicBezierSchema,
  EasingSchema,
  AnimatableValueSchema,
  KeyframeSchema,
} from './animation/keyframe.js';
export type {
  EasingType,
  CubicBezier,
  Easing,
  AnimatableValue,
  Keyframe,
} from './animation/keyframe.js';
export { PropertyPathSchema, TrackSchema } from './animation/track.js';
export type { PropertyPath, Track } from './animation/track.js';
export { ClipSchema } from './animation/clip.js';
export type { Clip } from './animation/clip.js';

// Scene domain
export { SceneInstanceSchema } from './scene/instance.js';
export type { SceneInstance } from './scene/instance.js';
export { ProjectionTypeSchema, CameraSchema } from './scene/camera.js';
export type { ProjectionType, Camera } from './scene/camera.js';
export {
  LightTypeSchema,
  ShadowModeSchema,
  LightSchema,
} from './scene/light.js';
export type { LightType, ShadowMode, Light } from './scene/light.js';
export { ShotSchema } from './scene/shot.js';
export type { Shot } from './scene/shot.js';

// Command domain
export { RevisionMetaSchema, TransactionMetaSchema } from './commands/command-meta.js';
export type { RevisionMeta, TransactionMeta } from './commands/command-meta.js';
export {
  CommandDomainSchema,
  CommandTypeSchema,
  CommandPayloadSchema,
  CommandStatusSchema,
  CommandResultSchema,
} from './commands/command-types.js';
export type {
  CommandDomain,
  CommandType,
  CommandPayload,
  CommandStatus,
  CommandResult,
} from './commands/command-types.js';

// Jobs domain
export { JobStateSchema, JobProgressSchema, RenderJobSchema } from './jobs/render-job.js';
export type { JobState, JobProgress, RenderJob } from './jobs/render-job.js';

// Images domain
export { ImageGenerationBriefSchema } from './images/image-brief.js';
export type { ImageGenerationBrief } from './images/image-brief.js';
export { ArtifactHandoffSchema } from './images/artifact.js';
export type { ArtifactHandoff } from './images/artifact.js';

// Export domain
export {
  VideoCodecSchema,
  EncoderSchema,
  QualityPresetSchema,
  ResolutionNameSchema,
  ExportFpsSchema,
  ExportProfileSchema,
} from './export/export-profile.js';
export type {
  VideoCodec,
  Encoder,
  QualityPreset,
  ResolutionName,
  ExportFps,
  ExportProfile,
} from './export/export-profile.js';

// Project domain
export {
  ManifestAssetSchema,
  ManifestSceneSchema,
  ProjectDefaultsSchema,
  ManifestSchema,
} from './project/manifest.js';
export type {
  ManifestAsset,
  ManifestScene,
  ProjectDefaults,
  Manifest,
} from './project/manifest.js';

// Director domain
export {
  ShotCameraAngleSchema,
  ParsedShotSchema,
  ScriptParseResultSchema,
  StagingRequestSchema,
} from './director/director-schema.js';
export type {
  ShotCameraAngle,
  ParsedShot,
  ScriptParseResult,
  StagingRequest,
} from './director/director-schema.js';

// Session domain
export {
  SessionConnectionStatusSchema,
  SessionInfoSchema,
  StateSyncEventSchema,
} from './session/session-info.js';
export type {
  SessionConnectionStatus,
  SessionInfo,
  StateSyncEvent,
} from './session/session-info.js';

// Drawing domain
export {
  CelSchema,
  DrawingLayerSchema,
  ExposureSchema,
  DrawingDocumentSchema,
} from './drawing/drawing.js';
export type {
  Cel,
  DrawingLayer,
  Exposure,
  DrawingDocument,
} from './drawing/drawing.js';

