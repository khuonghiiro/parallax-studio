import type { CommandBus } from '../command-bus.js';
import type { CommandRegistry } from '../command-registry.js';
import type { ProjectState } from '../../projects/project-state.js';
import type { StoragePort } from '../../ports/storage-port.js';
import { handleCreateProject, handleSaveProject } from './project-handlers.js';
import {
  handleImportImage,
  handleSetActiveView,
  handleAddViewEntry,
  handleSetWarpGrid,
  handleSetMorphWeight,
  handleSetLayers,
} from './asset-handlers.js';
import {
  handleApplyRigTemplate,
  handleSetWeights,
  handleSolveIK,
} from './rig-handlers.js';
import { handleSetKeyframe } from './animation-handlers.js';
import {
  handleAddInstance,
  handleUpdateInstance,
  handleRemoveInstance,
  handleSetCamera,
  handleSetLight,
  handleAddShot,
  handleUpdateShot,
  handleRemoveShot,
} from './scene-handlers.js';

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

  if (!bus.hasHandler('set_active_view')) {
    bus.registerHandler('set_active_view', async (payload) => {
      return handleSetActiveView(state, payload);
    });
    registry.register({
      type: 'set_active_view',
      domain: 'asset',
      handler: (payload) => handleSetActiveView(state, payload),
      description: 'Set the active viewing angle of a multi-angle asset',
    });
  }

  if (!bus.hasHandler('add_view_entry')) {
    bus.registerHandler('add_view_entry', async (payload) => {
      return handleAddViewEntry(state, payload);
    });
    registry.register({
      type: 'add_view_entry',
      domain: 'asset',
      handler: (payload) => handleAddViewEntry(state, payload),
      description: 'Add or populate a viewing angle in the asset view set',
    });
  }

  if (!bus.hasHandler('set_warp_grid')) {
    bus.registerHandler('set_warp_grid', async (payload) => {
      return handleSetWarpGrid(state, payload);
    });
    registry.register({
      type: 'set_warp_grid',
      domain: 'rig',
      handler: (payload) => handleSetWarpGrid(state, payload),
      description: 'Set or update the Free-Form Deformation warp grid for an asset',
    });
  }

  if (!bus.hasHandler('set_morph_weight')) {
    bus.registerHandler('set_morph_weight', async (payload) => {
      return handleSetMorphWeight(state, payload);
    });
    registry.register({
      type: 'set_morph_weight',
      domain: 'rig',
      handler: (payload) => handleSetMorphWeight(state, payload),
      description: 'Set the active weight for a facial expression morph target',
    });
  }

  if (!bus.hasHandler('set_layers')) {
    bus.registerHandler('set_layers', async (payload) => {
      return handleSetLayers(state, payload);
    });
    registry.register({
      type: 'set_layers',
      domain: 'asset',
      handler: (payload) => handleSetLayers(state, payload),
      description: 'Set decomposed cutout layers and bone bindings for an asset',
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

  if (!bus.hasHandler('set_weights')) {
    bus.registerHandler('set_weights', async (payload) => {
      return handleSetWeights(state, payload);
    });
    registry.register({
      type: 'set_weights',
      domain: 'rig',
      handler: (payload) => handleSetWeights(state, payload),
      description: 'Update vertex skinning weights from weight painting tool',
    });
  }

  if (!bus.hasHandler('solve_ik')) {
    bus.registerHandler('solve_ik', async (payload) => {
      return handleSolveIK(state, payload);
    });
    registry.register({
      type: 'solve_ik',
      domain: 'rig',
      handler: (payload) => handleSolveIK(state, payload),
      description: 'Solve 2-bone inverse kinematics analytically for limb targets',
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

  // Scene commands
  if (!bus.hasHandler('add_instance')) {
    bus.registerHandler('add_instance', async (payload) => {
      return handleAddInstance(state, payload);
    });
    registry.register({
      type: 'add_instance',
      domain: 'scene',
      handler: (payload) => handleAddInstance(state, payload),
      description: 'Add an asset instance to the scene with position, depth, and scale',
    });
  }

  if (!bus.hasHandler('update_instance')) {
    bus.registerHandler('update_instance', async (payload) => {
      return handleUpdateInstance(state, payload);
    });
    registry.register({
      type: 'update_instance',
      domain: 'scene',
      handler: (payload) => handleUpdateInstance(state, payload),
      description: 'Update transform or depth of an existing scene instance',
    });
  }

  if (!bus.hasHandler('remove_instance')) {
    bus.registerHandler('remove_instance', async (payload) => {
      return handleRemoveInstance(state, payload);
    });
    registry.register({
      type: 'remove_instance',
      domain: 'scene',
      handler: (payload) => handleRemoveInstance(state, payload),
      description: 'Remove an instance from the active scene',
    });
  }

  if (!bus.hasHandler('set_camera')) {
    bus.registerHandler('set_camera', async (payload) => {
      return handleSetCamera(state, payload);
    });
    registry.register({
      type: 'set_camera',
      domain: 'scene',
      handler: (payload) => handleSetCamera(state, payload),
      description: 'Configure scene camera projection, position, zoom, and parallax focal depth',
    });
  }

  if (!bus.hasHandler('set_light')) {
    bus.registerHandler('set_light', async (payload) => {
      return handleSetLight(state, payload);
    });
    registry.register({
      type: 'set_light',
      domain: 'scene',
      handler: (payload) => handleSetLight(state, payload),
      description: 'Configure directional or point light with shadow mode and intensity',
    });
  }

  if (!bus.hasHandler('add_shot')) {
    bus.registerHandler('add_shot', async (payload) => {
      return handleAddShot(state, payload);
    });
    registry.register({
      type: 'add_shot',
      domain: 'scene',
      handler: (payload) => handleAddShot(state, payload),
      description: 'Add a shot segment to the timeline with camera framing and clip assignments',
    });
  }

  if (!bus.hasHandler('update_shot')) {
    bus.registerHandler('update_shot', async (payload) => {
      return handleUpdateShot(state, payload);
    });
    registry.register({
      type: 'update_shot',
      domain: 'scene',
      handler: (payload) => handleUpdateShot(state, payload),
      description: 'Update shot frame boundaries, transitions, or clip assignments',
    });
  }

  if (!bus.hasHandler('remove_shot')) {
    bus.registerHandler('remove_shot', async (payload) => {
      return handleRemoveShot(state, payload);
    });
    registry.register({
      type: 'remove_shot',
      domain: 'scene',
      handler: (payload) => handleRemoveShot(state, payload),
      description: 'Remove a shot segment from the scene timeline',
    });
  }
}


