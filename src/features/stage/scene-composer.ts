import * as THREE from 'three';
import type { SceneInstance, Light, Color } from '@parallax/contracts';
import {
  sortByDepth,
  computeParallaxOffset,
  createContactShadowGeometry,
} from '@parallax/core';
import { ShadowMeshAdapter, applyPoseToSkeleton } from '@parallax/runtime';
import type { AssetData } from '@parallax/application';
import { buildAssetMesh, type BuiltMeshResult } from './mesh-builder.js';

/**
 * Instance render node in the 2.5D scene.
 */
export interface SceneNode {
  readonly instanceId: string;
  readonly assetId: string;
  readonly group: THREE.Group;
  readonly contentGroup: THREE.Group;
  readonly shadowAdapter: ShadowMeshAdapter;
  meshResult: BuiltMeshResult | null;
  loading: boolean;
}

/**
 * Manages 2.5D multi-instance composition, depth sorting, parallax offsets,
 * skeletal animation synchronization, and dynamic realtime shadows.
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
        const contentGroup = new THREE.Group();
        contentGroup.name = `instance-content-${inst.id}`;
        group.add(contentGroup);

        const shadowAdapter = new ShadowMeshAdapter();
        node = {
          instanceId: inst.id,
          assetId: inst.assetId,
          group,
          contentGroup,
          shadowAdapter,
          meshResult: null,
          loading: false,
        };
        this.nodes.set(inst.id, node);
        this.rootGroup.add(group);
      }

      // Load mesh if not already loaded or if asset changed
      const asset = getAsset(inst.assetId);
      if (asset && !node.meshResult && !node.loading) {
        node.loading = true;
        const targetNode = node;
        buildAssetMesh(asset).then((built) => {
          targetNode.loading = false;
          targetNode.meshResult = built;
          targetNode.contentGroup.clear();
          targetNode.contentGroup.add(built.mesh);
        });
      }

      // Compute Parallax offset based on depth relative to camera
      const parallax = computeParallaxOffset(
        inst.depth,
        focalDepth,
        cameraPan.x,
        cameraPan.y,
      );

      // Position node in world space:
      // In 2.5D space, Z is -inst.depth so that higher depth = further back in Z
      node.group.position.x = inst.position.x + parallax.offsetX;
      node.group.position.y = inst.position.y + parallax.offsetY;
      node.group.position.z = -inst.depth + (sorted.length - index) * 0.05;
      node.group.rotation.z = inst.rotation;
      node.group.scale.set(inst.scale, inst.scale, 1.0);
      node.group.visible = inst.visible;

      // Update contact shadow beneath character feet
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
   * Synchronize skeletal pose animation across all staged instances.
   */
  public animateInstances(
    currentFrame: number,
    instances: readonly SceneInstance[],
  ): void {
    const t = currentFrame * 0.08;

    for (const inst of instances) {
      const node = this.nodes.get(inst.id);
      if (!node?.meshResult?.skeleton) continue;

      const clip = inst.activeClipId || 'idle';
      const rotations = new Map<string, number>();

      if (clip === 'walk') {
        const walkPhase = t * 0.9;
        const stride = Math.sin(walkPhase);
        rotations.set('thigh_l', stride * 0.04);
        rotations.set('shin_l', (1 - Math.cos(walkPhase)) * 0.025);
        rotations.set('thigh_r', -stride * 0.04);
        rotations.set('shin_r', (1 - Math.cos(walkPhase + Math.PI)) * 0.025);
        rotations.set('upper_arm_l', -stride * 0.05);
        rotations.set('upper_arm_r', stride * 0.05);
        rotations.set('spine', Math.sin(walkPhase * 2) * 0.008);
      } else if (clip === 'ready') {
        rotations.set('thigh_l', -0.02);
        rotations.set('shin_l', 0.02);
        rotations.set('thigh_r', 0.02);
        rotations.set('shin_r', -0.02);
        rotations.set('upper_arm_l', 0.04);
        rotations.set('forearm_l', 0.08);
        rotations.set('upper_arm_r', -0.04);
        rotations.set('forearm_r', -0.08);
      } else {
        // Natural gentle idle breathing
        const breath = Math.sin(t * 0.45) * 0.028;
        rotations.set('spine', breath * 0.8);
        rotations.set('neck', -breath * 0.35);
        rotations.set('upper_arm_l', 0.02 + breath * 0.25);
        rotations.set('upper_arm_r', -0.02 - breath * 0.25);
      }

      applyPoseToSkeleton(node.meshResult.skeleton, rotations);
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

  public getRootGroup(): THREE.Group {
    return this.rootGroup;
  }
}
