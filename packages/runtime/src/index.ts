/**
 * @parallax/runtime — Three.js rendering adapters for Parallax Studio.
 *
 * Maps core domain types to GPU resources.
 * Depends on @parallax/contracts, @parallax/core, and Three.js.
 * Does NOT depend on UI, MCP, or application layer.
 */

// Mesh adapters
export {
  createSkeleton,
  applyPoseToSkeleton,
  resetSkeletonPose,
} from './meshes/skeleton-adapter.js';
export {
  createSkinnedMesh,
  createStaticMesh,
} from './meshes/skinned-mesh-adapter.js';
export type { SkinWeightData } from './meshes/skinned-mesh-adapter.js';

// Camera adapter
export { createCamera, updateCamera } from './cameras/camera-adapter.js';

// Resource management
export { TextureCache } from './resources/texture-cache.js';

// Playback
export { FrameLoop } from './playback/frame-loop.js';

// Shadows
export { ShadowMeshAdapter } from './shadows/shadow-mesh-adapter.js';

// Export
export { FrameRenderer } from './export/frame-renderer.js';

