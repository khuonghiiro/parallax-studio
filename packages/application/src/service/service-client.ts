import type {
  CommandPayload,
  CommandResult,
  SessionInfo,
} from '@parallax/contracts';
import type {
  ProjectSnapshot,
  AssetData,
  SceneData,
} from '../index.js';
import type { SerializableSnapshot } from './application-service.js';

export class ApplicationServiceClient {
  constructor(private readonly baseUrl: string = 'http://127.0.0.1:3100') {}

  /**
   * Check whether the local Application Service is running and reachable.
   */
  async checkHealth(): Promise<SessionInfo | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`);
      if (!res.ok) {
        return null;
      }
      return (await res.json()) as SessionInfo;
    } catch {
      return null;
    }
  }

  /**
   * Fetch the current full project snapshot from the service.
   */
  async fetchSnapshot(): Promise<ProjectSnapshot | null> {
    const res = await fetch(`${this.baseUrl}/api/state`);
    if (!res.ok) {
      throw new Error(`Failed to fetch state: ${res.statusText}`);
    }
    const body = (await res.json()) as {
      status: string;
      snapshot: SerializableSnapshot | null;
    };
    if (!body.snapshot) {
      return null;
    }
    return reconstructSnapshot(body.snapshot);
  }

  /**
   * Dispatch a state-mutating command to the authoritative service.
   */
  async dispatch(payload: CommandPayload): Promise<CommandResult> {
    const res = await fetch(`${this.baseUrl}/api/commands`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return {
        status: 'internal_error',
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    return (await res.json()) as CommandResult;
  }
}

/**
 * Reconstructs a full ProjectSnapshot from a serializable snapshot object.
 */
export function reconstructSnapshot(
  serializable: SerializableSnapshot,
): ProjectSnapshot {
  const assetsMap = new Map<string, AssetData>();
  if (serializable.assets) {
    for (const [id, val] of Object.entries(serializable.assets)) {
      assetsMap.set(id, val as AssetData);
    }
  }

  const scenesMap = new Map<string, SceneData>();
  if (serializable.scenes) {
    for (const [id, val] of Object.entries(serializable.scenes)) {
      scenesMap.set(id, val as SceneData);
    }
  }

  return {
    manifest: serializable.manifest,
    revision: serializable.revision,
    dirty: serializable.dirty,
    lastSavedRevision: serializable.lastSavedRevision,
    assets: assetsMap,
    scenes: scenesMap,
  };
}
