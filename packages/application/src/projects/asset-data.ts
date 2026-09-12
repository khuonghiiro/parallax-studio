import type {
  EntityId,
  Dimensions,
  BoneHierarchy,
  VertexWeight,
  LandmarkSet,
  SceneInstance,
  Camera,
  Track,
  Clip,
  ViewSet,
  WarpGrid,
  MorphTarget,
  Light,
  Shot,
  Layer,
} from '@parallax/contracts';
import type { TriangulationResult } from '@parallax/core';

/**
 * In-memory representation of an asset's data.
 * Corresponds to files inside assets/<asset-id>/ on disk.
 */
export interface AssetData {
  readonly id: EntityId;
  readonly name: string;
  readonly imageDataUrl: string;
  readonly dimensions: Dimensions;
  readonly mesh: TriangulationResult | null;
  readonly skeleton: BoneHierarchy | null;
  readonly weights: readonly VertexWeight[] | null;
  readonly landmarks: LandmarkSet | null;
  readonly viewSet?: ViewSet;
  readonly warpGrid?: WarpGrid;
  readonly morphTargets?: readonly MorphTarget[];
  readonly layers?: readonly Layer[];
}

/**
 * In-memory representation of a scene's data.
 * Corresponds to files inside scenes/<scene-id>/ on disk.
 */
export interface SceneData {
  readonly id: EntityId;
  readonly name: string;
  readonly instances: readonly SceneInstance[];
  readonly camera: Camera;
  readonly tracks: readonly Track[];
  readonly clips: readonly Clip[];
  readonly lights?: readonly Light[];
  readonly shots?: readonly Shot[];
}
