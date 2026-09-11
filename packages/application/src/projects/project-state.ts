import type { Manifest, Revision } from '@parallax/contracts';

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
}

/**
 * In-memory project state manager.
 * Maintains the current manifest and revision counter.
 * Does not perform I/O — persistence goes through ports.
 */
export class ProjectState {
  private manifest: Manifest | null = null;
  private currentRevision: Revision = 0;
  private savedRevision: Revision = 0;
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
    };
  }

  /**
   * Close the current project.
   */
  close(): void {
    this.manifest = null;
    this.currentRevision = 0;
    this.savedRevision = 0;
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
