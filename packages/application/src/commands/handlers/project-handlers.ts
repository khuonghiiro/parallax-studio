import type { CommandPayload, CommandResult, Manifest } from '@parallax/contracts';
import type { ProjectState } from '../../projects/project-state.js';
import type { StoragePort } from '../../ports/storage-port.js';

/**
 * Handle create_project command.
 * Initializes a new blank project manifest with default settings.
 */
export function handleCreateProject(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const name = (payload.data.name as string) || 'Untitled Project';
  const now = new Date().toISOString();

  const manifest: Manifest = {
    schemaVersion: 1,
    name,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    assets: {},
    scenes: {
      'scene-default': {
        name: 'Scene 1',
        directory: 'scenes/scene-default',
        createdRevision: 1,
        updatedRevision: 1,
      },
    },
    defaults: {
      timelineFps: 24,
      previewFps: 60,
      exportProfile: '4k-uhd-60',
    },
  };

  state.load(manifest);

  return {
    status: 'success',
    revision: 1,
    data: { name, schemaVersion: 1 },
  };
}

/**
 * Handle save_project command.
 * Writes manifest and project data to storage if available.
 */
export async function handleSaveProject(
  state: ProjectState,
  payload: CommandPayload,
  storage?: StoragePort,
): Promise<CommandResult> {
  if (!state.isLoaded) {
    return {
      status: 'not_found',
      error: 'No project is currently open to save',
    };
  }

  const manifest = state.getManifest();
  const projectPath = (payload.data.projectPath as string) || './project';

  if (storage) {
    try {
      await storage.writeManifest(projectPath, manifest);
    } catch (err) {
      return {
        status: 'internal_error',
        error: `Failed to save manifest: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  state.markSaved();

  return {
    status: 'success',
    revision: state.revision,
    data: { savedAt: new Date().toISOString() },
  };
}
