import * as THREE from 'three';
import type { SceneInstance, Light, Color } from '@parallax/contracts';
import {
  sortByDepth,
  computeParallaxOffset,
  createContactShadowGeometry,
} from '@parallax/core';
import { ShadowMeshAdapter } from '@parallax/runtime';
import type { AssetData } from '@parallax/application';

/**
 * Instance render node in the 2.5D scene.
 */
export interface SceneNode {
  readonly instanceId: string;
  readonly assetId: string;
  readonly group: THREE.Group;
  readonly shadowAdapter: ShadowMeshAdapter;
}

/**
 * Manages 2.5D multi-instance composition, depth sorting, parallax offsets,
 * and dynamic realtime shadows for filmmaking scenes.
 */
export class SceneComposer {
  private readonly scene: THREE.Scene;
  private readonly rootGroup: THREE.Group = new THREE.Group();
  private readonly nodes = new Map<string, SceneNode>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rootGroup.name = 'scene-composer-root';
    this.scene.add(this.rootGroup);
  }

  /**
   * Synchronize the 2.5D scene with instances, assets, and lights.
   *
   * @param instances List of placed scene instances.
   * @param getAsset Function to retrieve asset data by ID.
   * @param lights Active scene lights for shadow calculation.
   * @param focalDepth Camera focal depth plane for parallax.
   * @param cameraPan Current camera pan offset in scene units.
   */
  public updateScene(
    instances: readonly SceneInstance[],
    getAsset: (id: string) => AssetData | undefined,
    lights: readonly Light[] = [],
    focalDepth = 0,
    cameraPan: { x: number; y: number } = { x: 0, y: 0 },
  ): void {
    const sorted = sortByDepth(instances);
    const activeIds = new Set<string>();

    const primaryLight = lights.find((l) => l.enabled) ?? {
      id: 'default-sun',
      name: 'Sun',
      type: 'directional' as const,
      position: { x: 0.5, y: -1 },
      intensity: 1,
      color: { r: 1, g: 1, b: 1, a: 1 },
      shadowMode: 'silhouette' as const,
      shadowOpacity: 0.4,
      shadowColor: { r: 0, g: 0, b: 0, a: 0.4 },
      enabled: true,
    };

    sorted.forEach((inst, index) => {
      activeIds.add(inst.id);
      let node = this.nodes.get(inst.id);

      if (!node) {
        const group = new THREE.Group();
        group.name = `instance-${inst.id}`;
        const shadowAdapter = new ShadowMeshAdapter();
        node = { instanceId: inst.id, assetId: inst.assetId, group, shadowAdapter };
        this.nodes.set(inst.id, node);
        this.rootGroup.add(group);
      }

      // Compute Parallax offset based on depth relative to camera
      const parallax = computeParallaxOffset(
        inst.depth,
        focalDepth,
        cameraPan.x,
        cameraPan.y,
      );

      // Position node in world space
      node.group.position.x = inst.position.x + parallax.offsetX;
      node.group.position.y = inst.position.y + parallax.offsetY;
      // Z-depth placement: painter's sort index + depth layer
      node.group.position.z = -inst.depth * 0.1 + (sorted.length - index) * 0.01;
      node.group.rotation.z = inst.rotation;
      node.group.scale.set(inst.scale, inst.scale, 1.0);
      node.group.visible = inst.visible;

      // Update contact shadow beneath character feet
      const asset = getAsset(inst.assetId);
      const width = asset?.dimensions.width ?? 200;
      const height = asset?.dimensions.height ?? 300;

      const shadowGeom = createContactShadowGeometry(
        { x: 0, y: -height * 0.48 },
        width * 0.45 * inst.scale,
        height * 0.08 * inst.scale,
        16,
      );

      const shadowColor: Color = primaryLight.shadowColor ?? { r: 0, g: 0, b: 0, a: 0.4 };
      const shadowMesh = node.shadowAdapter.createOrUpdateMesh(
        shadowGeom,
        shadowColor,
        primaryLight.shadowOpacity,
      );

      if (!node.group.children.includes(shadowMesh)) {
        node.group.add(shadowMesh);
      }
    });

    // Cleanup removed instances
    for (const [id, node] of this.nodes) {
      if (!activeIds.has(id)) {
        node.shadowAdapter.dispose();
        this.rootGroup.remove(node.group);
        this.nodes.delete(id);
      }
    }
  }

  /**
   * Dispose all meshes and remove from scene.
   */
  public dispose(): void {
    for (const node of this.nodes.values()) {
      node.shadowAdapter.dispose();
      this.rootGroup.remove(node.group);
    }
    this.nodes.clear();
    this.scene.remove(this.rootGroup);
  }
}
