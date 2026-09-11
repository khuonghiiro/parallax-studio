import type { CommandBus } from '../command-bus.js';
import type { CommandRegistry } from '../command-registry.js';
import type { ProjectState } from '../../projects/project-state.js';
import type { StoragePort } from '../../ports/storage-port.js';
import { handleCreateProject, handleSaveProject } from './project-handlers.js';
import { handleImportImage } from './asset-handlers.js';
import { handleApplyRigTemplate } from './rig-handlers.js';
import { handleSetKeyframe } from './animation-handlers.js';

/**
 * Register all domain command handlers with the CommandBus and CommandRegistry.
 * Safe to call multiple times (idempotent).
 */
export function registerDefaultHandlers(
  bus: CommandBus,
  registry: CommandRegistry,
  state: ProjectState,
  storage?: StoragePort,
): void {
  // Project commands
  if (!bus.hasHandler('create_project')) {
    bus.registerHandler('create_project', async (payload) => {
      return handleCreateProject(state, payload);
    });
    registry.register({
      type: 'create_project',
      domain: 'project',
      handler: (payload) => handleCreateProject(state, payload),
      description: 'Create a new blank animation project',
    });
  }

  if (!bus.hasHandler('save_project')) {
    bus.registerHandler('save_project', async (payload) => {
      return handleSaveProject(state, payload, storage);
    });
    registry.register({
      type: 'save_project',
      domain: 'project',
      handler: (payload) => handleSaveProject(state, payload, storage),
      description: 'Save current project manifest and data',
    });
  }

  // Asset commands
  if (!bus.hasHandler('import_image')) {
    bus.registerHandler('import_image', async (payload) => {
      return handleImportImage(state, payload);
    });
    registry.register({
      type: 'import_image',
      domain: 'asset',
      handler: (payload) => handleImportImage(state, payload),
      description: 'Import image layer with contour extraction and triangulation',
    });
  }

  // Rig commands
  if (!bus.hasHandler('apply_rig_template')) {
    bus.registerHandler('apply_rig_template', async (payload) => {
      return handleApplyRigTemplate(state, payload);
    });
    registry.register({
      type: 'apply_rig_template',
      domain: 'rig',
      handler: (payload) => handleApplyRigTemplate(state, payload),
      description: 'Apply skeletal rig template and auto-calculate skinning weights',
    });
  }

  // Animation commands
  if (!bus.hasHandler('set_keyframe')) {
    bus.registerHandler('set_keyframe', async (payload) => {
      return handleSetKeyframe(state, payload);
    });
    registry.register({
      type: 'set_keyframe',
      domain: 'animation',
      handler: (payload) => handleSetKeyframe(state, payload),
      description: 'Set a keyframe value on a property track at a given frame',
    });
  }
}
