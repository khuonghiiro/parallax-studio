import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommandBus,
  CommandRegistry,
  ProjectState,
  registerDefaultHandlers,
} from '../index.js';

describe('CommandBus End-to-End Pipeline', () => {
  let bus: CommandBus;
  let registry: CommandRegistry;
  let state: ProjectState;

  beforeEach(() => {
    bus = new CommandBus();
    registry = new CommandRegistry();
    state = new ProjectState();
    registerDefaultHandlers(bus, registry, state);
  });

  it('creates a new project', async () => {
    const res = await bus.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'Test Anime Film' },
    });

    expect(res.status).toBe('success');
    expect(state.isLoaded).toBe(true);
    expect(state.getManifest().name).toBe('Test Anime Film');
    expect(state.revision).toBe(1);
  });

  it('imports an image and triangulates mesh', async () => {
    await bus.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'Test Project' },
    });

    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
      + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await bus.dispatch({
      type: 'import_image',
      domain: 'asset',
      data: {
        name: 'Hero Character',
        dataUrl: samplePng,
        width: 256,
        height: 256,
      },
    });

    expect(res.status).toBe('success');
    expect(res.entityId).toBeDefined();

    const assetData = state.getAssetData(res.entityId!);
    expect(assetData).toBeDefined();
    expect(assetData!.mesh).toBeDefined();
    expect(assetData!.mesh!.vertexCount).toBeGreaterThanOrEqual(3);
    expect(assetData!.mesh!.triangleCount).toBeGreaterThanOrEqual(1);
  });

  it('applies humanoid rig template and computes weights', async () => {
    await bus.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'Rig Test' },
    });

    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
      + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const importRes = await bus.dispatch({
      type: 'import_image',
      domain: 'asset',
      data: {
        name: 'Actor',
        dataUrl: samplePng,
        width: 200,
        height: 400,
      },
    });

    const assetId = importRes.entityId!;

    const rigRes = await bus.dispatch({
      type: 'apply_rig_template',
      domain: 'rig',
      targetId: assetId,
      data: { assetId, template: 'humanoid' },
    });

    expect(rigRes.status).toBe('success');
    const asset = state.getAssetData(assetId)!;
    expect(asset.skeleton).toBeDefined();
    expect(asset.skeleton!.bones.length).toBeGreaterThan(10);
    expect(asset.weights).toBeDefined();
    expect(asset.weights!.length).toBe(asset.mesh!.vertexCount);
  });

  it('records keyframes on property tracks', async () => {
    await bus.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'Anim Test' },
    });

    const keyRes = await bus.dispatch({
      type: 'set_keyframe',
      domain: 'animation',
      data: {
        property: 'bones.spine.rotation',
        frame: 24,
        value: 0.35,
      },
    });

    expect(keyRes.status).toBe('success');
    const scene = state.getSceneData('scene-default')!;
    expect(scene.tracks.length).toBe(1);
    expect(scene.tracks[0]!.keyframes.length).toBe(1);
    expect(scene.tracks[0]!.keyframes[0]!.frame).toBe(24);
  });
});
