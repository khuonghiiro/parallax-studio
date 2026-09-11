/**
 * @parallax/core — Pure domain logic for Parallax Studio.
 *
 * Contains geometry, rig, deformation, animation, view, and scene
 * algorithms. No React, Three.js, DOM, Node I/O, MCP, or Tauri imports.
 *
 * Depends only on @parallax/contracts.
 */

// Geometry
export { validateMesh } from './geometry/mesh-validation.js';
export type {
  Contour,
  ContourExtractionResult,
  TriangulationResult,
  MeshValidationResult,
} from './geometry/mesh-validation.js';
export {
  triangulateContour,
  computeContourArea,
  ensureCCW,
} from './geometry/triangulate-contour.js';
export { extractContour } from './geometry/contour-extraction.js';

// Rig
export { validateBoneHierarchy } from './rig/validate-hierarchy.js';
export type { HierarchyValidationResult } from './rig/validate-hierarchy.js';
export { normalizeWeights, findUnnormalizedVertices } from './rig/normalize-weights.js';
export type { NormalizeWeightsResult } from './rig/normalize-weights.js';
export { computeAutoWeights } from './rig/compute-weights.js';
export { generateAutoSkeleton } from './rig/auto-skeleton.js';
export type { AutoSkeletonResult } from './rig/auto-skeleton.js';
export { solveTwoBoneIK } from './rig/ik-solver.js';
export type { TwoBoneIKParams, TwoBoneIKResult } from './rig/ik-solver.js';

// Animation
export { evaluateEasing } from './animation/easing.js';
export { sampleKeyframes } from './animation/sample-keyframes.js';
export { sampleClip, isFrameInClip } from './animation/sample-clip.js';
export type { ClipSampleResult } from './animation/sample-clip.js';
export {
  lerp,
  lerpAngle,
  blendAnimatableValue,
  blendClipSamples,
  computeTransitionWeight,
} from './animation/clip-blender.js';

// Deformation
export {
  composePose,
  identityWarp,
  identitySkin,
  IDENTITY_TRANSFORM,
  createCombinedWarpFn,
} from './deformation/compose-pose.js';
export type {
  ComposedVertex,
  WarpResult,
  SkinningResult,
  InstanceTransform,
} from './deformation/compose-pose.js';
export {
  createUniformWarpGrid,
  evaluateWarpAtPoint,
  applyWarpGridToVertices,
  getControlPoint,
  setControlPointOffset,
  applySquashStretch,
} from './deformation/warp-grid.js';
export {
  applyMorphTargets,
  synthesizeFacialMorphTargets,
} from './deformation/morph-target.js';
export type { MorphBlendInput } from './deformation/morph-target.js';
export {
  STANDARD_EXPRESSION_PRESETS,
  getExpressionPresets,
  getExpressionPreset,
  applyPresetToWeights,
} from './deformation/expression-presets.js';

// Material & Lighting
export {
  evaluateNormalLighting,
  unpackNormalPixel,
  normalizeVector,
  dotVector,
} from './material/normal-lighting.js';
export type {
  Vector3D,
  NormalLightingParams,
  NormalLightingResult,
} from './material/normal-lighting.js';

// Views
export { selectView } from './views/view-selection.js';
export type {
  DirectionVector,
  ViewSelectionResult,
} from './views/view-selection.js';
export {
  isTopologyCompatible,
  interpolateMeshes,
  resolveViewTransition,
} from './views/view-interpolation.js';
export type { ViewTransitionResult } from './views/view-interpolation.js';

// Scene
export { sortByDepth, computeParallaxOffset } from './scene/depth-sorting.js';
export {
  projectPlanarShadow,
  createContactShadowGeometry,
} from './scene/shadow-projector.js';
export type { ShadowMeshGeometry } from './scene/shadow-projector.js';

// Director
export { parseScreenplay } from './director/script-parser.js';




