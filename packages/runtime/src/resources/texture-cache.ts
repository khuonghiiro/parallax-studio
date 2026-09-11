import * as THREE from 'three';

/**
 * Texture cache with explicit lifecycle management.
 * Prevents duplicate texture loading and ensures proper GPU disposal.
 */
export class TextureCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly loader = new THREE.TextureLoader();

  /**
   * Load a texture by path. Returns cached version if available.
   * Reference counting tracks usage for safe disposal.
   */
  async load(path: string): Promise<THREE.Texture> {
    const existing = this.cache.get(path);

    if (existing) {
      existing.refCount++;
      return existing.texture;
    }

    const texture = await this.loadTexture(path);

    this.cache.set(path, {
      texture,
      refCount: 1,
      path,
    });

    return texture;
  }

  /**
   * Release a texture reference. Disposes GPU resources
   * when reference count reaches zero.
   */
  release(path: string): void {
    const entry = this.cache.get(path);

    if (!entry) {
      return;
    }

    entry.refCount--;

    if (entry.refCount <= 0) {
      entry.texture.dispose();
      this.cache.delete(path);
    }
  }

  /**
   * Dispose all cached textures and clear the cache.
   */
  disposeAll(): void {
    for (const entry of this.cache.values()) {
      entry.texture.dispose();
    }
    this.cache.clear();
  }

  /**
   * Number of textures currently cached.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Check if a texture is cached.
   */
  has(path: string): boolean {
    return this.cache.has(path);
  }

  private loadTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (texture) => {
          // Nearest filter for pixel-art-friendly rendering
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        (error) => {
          reject(new Error(`Failed to load texture: ${path} — ${error}`));
        },
      );
    });
  }
}

/**
 * Internal cache entry with reference counting.
 */
interface CacheEntry {
  readonly texture: THREE.Texture;
  refCount: number;
  readonly path: string;
}
