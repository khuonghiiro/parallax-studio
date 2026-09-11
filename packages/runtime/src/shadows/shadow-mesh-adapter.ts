import * as THREE from 'three';
import type { Color } from '@parallax/contracts';
import type { ShadowMeshGeometry } from '@parallax/core';

/**
 * Three.js adapter for rendering 2.5D planar and contact shadows.
 */
export class ShadowMeshAdapter {
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.MeshBasicMaterial | null = null;

  /**
   * Create or update the Three.js shadow mesh from pure geometry data.
   */
  createOrUpdateMesh(
    shadowData: ShadowMeshGeometry,
    shadowColor: Color,
    opacity = 0.5,
  ): THREE.Mesh {
    if (!this.mesh) {
      this.geometry = new THREE.BufferGeometry();
      this.material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(shadowColor.r, shadowColor.g, shadowColor.b),
        transparent: true,
        opacity: (shadowColor.a ?? 1.0) * opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.mesh.name = 'shadow-plane';
      // Place shadow slightly above background surface to avoid z-fighting
      this.mesh.position.z = -0.5;
    }

    this.updateGeometry(shadowData);
    this.updateMaterial(shadowColor, opacity);

    return this.mesh;
  }

  /**
   * Update geometry buffer attributes without reallocating materials.
   */
  updateGeometry(shadowData: ShadowMeshGeometry): void {
    if (!this.geometry) return;

    // Build 3D position array (x, y, 0) from 2D coordinates
    const vertCount = shadowData.vertices.length / 2;
    const pos3D = new Float32Array(vertCount * 3);

    for (let i = 0; i < vertCount; i++) {
      pos3D[i * 3] = shadowData.vertices[i * 2] ?? 0;
      pos3D[i * 3 + 1] = shadowData.vertices[i * 2 + 1] ?? 0;
      pos3D[i * 3 + 2] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(pos3D, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(shadowData.indices, 1));
    this.geometry.computeVertexNormals();
  }

  /**
   * Update shadow color and opacity.
   */
  updateMaterial(color: Color, opacity: number): void {
    if (!this.material) return;
    this.material.color.setRGB(color.r, color.g, color.b);
    this.material.opacity = (color.a ?? 1.0) * opacity;
    this.material.needsUpdate = true;
  }

  /**
   * Get the underlying Three.js mesh instance.
   */
  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }

  /**
   * Dispose geometry and material to prevent GPU memory leaks.
   */
  dispose(): void {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.mesh = null;
  }
}
