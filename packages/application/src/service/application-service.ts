import { CommandBus } from '../commands/command-bus.js';
import { CommandRegistry } from '../commands/command-registry.js';
import { registerDefaultHandlers } from '../commands/handlers/register-handlers.js';
import { ProjectState, type ProjectSnapshot } from '../projects/project-state.js';
import { ExportJobQueue } from '../jobs/export-job-queue.js';
import type {
  CommandPayload,
  CommandResult,
  SessionInfo,
} from '@parallax/contracts';

/**
 * Serializable snapshot structure suitable for JSON serialization over HTTP/SSE.
 */
export interface SerializableSnapshot {
  readonly manifest: ProjectSnapshot['manifest'];
  readonly revision: ProjectSnapshot['revision'];
  readonly dirty: boolean;
  readonly lastSavedRevision: ProjectSnapshot['lastSavedRevision'];
  readonly assets: Record<string, unknown>;
  readonly scenes: Record<string, unknown>;
}

/**
 * Central authoritative Application Service.
 * Manages the single project state, command bus, and export job queue.
 * Ensures that both UI and MCP mutate the exact same project in memory.
 */
export class ApplicationService {
  private readonly bus: CommandBus;
  private readonly registry: CommandRegistry;
  private readonly state: ProjectState;
  private readonly exportQueue: ExportJobQueue;
  private isInitialized = false;

  constructor(
    bus?: CommandBus,
    registry?: CommandRegistry,
    state?: ProjectState,
    exportQueue?: ExportJobQueue,
  ) {
    this.bus = bus ?? new CommandBus();
    this.registry = registry ?? new CommandRegistry();
    this.state = state ?? new ProjectState();
    this.exportQueue = exportQueue ?? new ExportJobQueue();

    this.initHandlers();
  }

  private initHandlers(): void {
    if (this.isInitialized) {
      return;
    }
    registerDefaultHandlers(this.bus, this.registry, this.state);

    if (!this.state.isLoaded) {
      this.bus.dispatch({
        type: 'create_project',
        domain: 'project',
        data: { name: 'Parallax Studio Master' },
      });
    }

    this.isInitialized = true;
  }

  get commandBus(): CommandBus {
    return this.bus;
  }

  get commandRegistry(): CommandRegistry {
    return this.registry;
  }

  get projectState(): ProjectState {
    return this.state;
  }

  get exportJobQueue(): ExportJobQueue {
    return this.exportQueue;
  }

  async dispatch(payload: CommandPayload): Promise<CommandResult> {
    return this.bus.dispatch(payload);
  }

  getSnapshot(): ProjectSnapshot | null {
    return this.state.getSnapshot();
  }

  getSerializableSnapshot(): SerializableSnapshot | null {
    const snap = this.state.getSnapshot();
    if (!snap) {
      return null;
    }

    const assetsRecord: Record<string, unknown> = {};
    for (const [id, asset] of snap.assets) {
      assetsRecord[id] = asset;
    }

    const scenesRecord: Record<string, unknown> = {};
    for (const [id, scene] of snap.scenes) {
      scenesRecord[id] = scene;
    }

    return {
      manifest: snap.manifest,
      revision: snap.revision,
      dirty: snap.dirty,
      lastSavedRevision: snap.lastSavedRevision,
      assets: assetsRecord,
      scenes: scenesRecord,
    };
  }

  subscribe(listener: (snapshot: ProjectSnapshot) => void): () => void {
    return this.state.subscribe(listener);
  }

  getSessionInfo(port: number, connectedClients = 0): SessionInfo {
    const manifest = this.state.isLoaded ? this.state.getManifest() : null;

    return {
      sessionId: 'parallax-shared-session',
      status: 'connected',
      servicePort: port,
      revision: this.state.revision,
      projectLoaded: this.state.isLoaded,
      projectName: manifest?.name,
      connectedClients,
    };
  }
}

let sharedApplicationService: ApplicationService | null = null;

/**
 * Access the shared singleton ApplicationService for the current process.
 */
export function getApplicationService(): ApplicationService {
  if (!sharedApplicationService) {
    sharedApplicationService = new ApplicationService();
  }
  return sharedApplicationService;
}

/**
 * Reset the shared ApplicationService instance (used primarily for tests).
 */
export function resetApplicationService(): void {
  sharedApplicationService = null;
}
