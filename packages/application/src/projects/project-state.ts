import type { Manifest, Revision } from '@parallax/contracts';
import type { AssetData, SceneData } from './asset-data.js';

/**
 * Listener for project state changes.
 */
export type ProjectStateListener = (state: ProjectSnapshot) => void;

/**
 * Immutable snapshot of the current project state.
 */
export interface ProjectSnapshot {
  readonly manifest: Manifest;
  readonly revision: Revision;
  readonly dirty: boolean;
  readonly lastSavedRevision: Revision;
  readonly assets: ReadonlyMap<string, AssetData>;
  readonly scenes: ReadonlyMap<string, SceneData>;
}

/**
 * In-memory project state manager.
 * Maintains the current manifest, asset data, and revision counter.
 * Does not perform I/O — persistence goes through ports.
 */
export class ProjectState {
  private manifest: Manifest | null = null;
  private currentRevision: Revision = 0;
  private savedRevision: Revision = 0;
  private readonly assets = new Map<string, AssetData>();
  private readonly scenes = new Map<string, SceneData>();
  private readonly listeners: ProjectStateListener[] = [];

  /**
   * Load a project manifest into state.
   */
  load(manifest: Manifest): void {
    this.manifest = manifest;
    this.currentRevision = manifest.revision;
    this.savedRevision = manifest.revision;
    this.notify();
  }

  /**
   * Get the current manifest or throw if no project is loaded.
   */
  getManifest(): Manifest {
    if (!this.manifest) {
      throw new Error('No project is loaded');
    }
    return this.manifest;
  }

  /**
   * Whether a project is currently loaded.
   */
  get isLoaded(): boolean {
    return this.manifest !== null;
  }

  /**
   * Current project revision number.
   */
  get revision(): Revision {
    return this.currentRevision;
  }

  /**
   * Whether the project has unsaved changes.
   */
  get isDirty(): boolean {
    return this.currentRevision !== this.savedRevision;
  }

  /**
   * Increment the revision after a successful command.
   * Returns the new revision number.
   */
  incrementRevision(): Revision {
    this.currentRevision++;

    if (this.manifest) {
      this.manifest = {
        ...this.manifest,
        revision: this.currentRevision,
        updatedAt: new Date().toISOString(),
      };
    }

    this.notify();
    return this.currentRevision;
  }

  /**
   * Mark the current revision as saved.
   */
  markSaved(): void {
    this.savedRevision = this.currentRevision;
    this.notify();
  }

  /**
   * Update a portion of the manifest.
   * Used by command handlers to apply state changes.
   */
  updateManifest(
    updater: (current: Manifest) => Manifest,
  ): void {
    if (!this.manifest) {
      throw new Error('No project is loaded');
    }
    this.manifest = updater(this.manifest);
    this.notify();
  }

  /**
   * Subscribe to state changes.
   * Returns an unsubscribe function.
   */
  subscribe(listener: ProjectStateListener): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Set asset data in memory.
   */
  setAssetData(id: string, data: AssetData): void {
    this.assets.set(id, data);
    this.notify();
  }

  /**
   * Get asset data by ID.
   */
  getAssetData(id: string): AssetData | undefined {
    return this.assets.get(id);
  }

  /**
   * Get all loaded asset data.
   */
  getAllAssetData(): readonly AssetData[] {
    return [...this.assets.values()];
  }

  /**
   * Remove asset data by ID.
   */
  removeAssetData(id: string): void {
    this.assets.delete(id);
    this.notify();
  }

  /**
   * Set scene data in memory.
   */
  setSceneData(id: string, data: SceneData): void {
    this.scenes.set(id, data);
    this.notify();
  }

  /**
   * Get scene data by ID.
   */
  getSceneData(id: string): SceneData | undefined {
    return this.scenes.get(id);
  }

  /**
   * Get all loaded scene data.
   */
  getAllSceneData(): readonly SceneData[] {
    return [...this.scenes.values()];
  }

  /**
   * Get a snapshot of the current state.
   */
  getSnapshot(): ProjectSnapshot | null {
    if (!this.manifest) {
      return null;
    }

    return {
      manifest: this.manifest,
      revision: this.currentRevision,
      dirty: this.isDirty,
      lastSavedRevision: this.savedRevision,
      assets: new Map(this.assets),
      scenes: new Map(this.scenes),
    };
  }

  /**
   * Close the current project.
   */
  close(): void {
    this.manifest = null;
    this.currentRevision = 0;
    this.savedRevision = 0;
    this.assets.clear();
    this.scenes.clear();
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    if (!snapshot) {
      return;
    }
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Listener errors must not break state management
      }
    }
  }
}
