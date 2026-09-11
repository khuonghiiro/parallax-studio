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

  it('manages multi-angle views (set_active_view, add_view_entry)', async () => {
    await bus.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'View Test' },
    });

    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
      + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const importRes = await bus.dispatch({
      type: 'import_image',
      domain: 'asset',
      data: { name: 'MultiView Hero', dataUrl: samplePng },
    });
    const assetId = importRes.entityId!;

    // Add quarter-left view
    const addViewRes = await bus.dispatch({
      type: 'add_view_entry',
      domain: 'asset',
      targetId: assetId,
      data: { assetId, angle: 'quarter-left' },
    });
    expect(addViewRes.status).toBe('success');

    // Switch active view to quarter-left
    const setActiveRes = await bus.dispatch({
      type: 'set_active_view',
      domain: 'asset',
      targetId: assetId,
      data: { assetId, viewAngle: 'quarter-left' },
    });
    expect(setActiveRes.status).toBe('success');

    const asset = state.getAssetData(assetId)!;
    expect(asset.viewSet).toBeDefined();
    expect(asset.viewSet!.activeView).toBe('quarter-left');
    expect(asset.viewSet!.views.length).toBe(2);
  });

  it('updates warp grid and morph weights for facial expressions', async () => {
    await bus.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'Deformation Test' },
    });

    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
      + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const importRes = await bus.dispatch({
      type: 'import_image',
      domain: 'asset',
      data: { name: 'Deform Hero', dataUrl: samplePng },
    });
    const assetId = importRes.entityId!;

    // Set warp grid
    const warpGrid = {
      cols: 2,
      rows: 2,
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
      controlPoints: [
        { col: 0, row: 0, restX: 0, restY: 0, dx: 0, dy: 0 },
        { col: 1, row: 0, restX: 1, restY: 0, dx: 5, dy: 0 },
        { col: 0, row: 1, restX: 0, restY: 1, dx: 0, dy: -5 },
        { col: 1, row: 1, restX: 1, restY: 1, dx: 5, dy: -5 },
      ],
    };

    const warpRes = await bus.dispatch({
      type: 'set_warp_grid',
      domain: 'rig',
      targetId: assetId,
      data: { assetId, warpGrid },
    });
    expect(warpRes.status).toBe('success');

    // Set morph weight for smile
    const morphRes = await bus.dispatch({
      type: 'set_morph_weight',
      domain: 'rig',
      targetId: assetId,
      data: { assetId, name: 'smile', weight: 0.8 },
    });
    expect(morphRes.status).toBe('success');

    const asset = state.getAssetData(assetId)!;
    expect(asset.warpGrid).toBeDefined();
    expect(asset.warpGrid!.cols).toBe(2);
    expect(asset.morphTargets).toBeDefined();
    expect(asset.morphTargets![0]!.name).toBe('smile');
    expect(asset.morphTargets![0]!.weight).toBe(0.8);
  });

  it('updates weights and solves 2-bone IK', async () => {
    await bus.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'IK and Weight Test' },
    });

    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
      + 'AAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const importRes = await bus.dispatch({
      type: 'import_image',
      domain: 'asset',
      data: { name: 'IK Hero', dataUrl: samplePng },
    });
    const assetId = importRes.entityId!;

    // Set weights
    const newWeights = [
      { vertexIndex: 0, influences: [{ boneId: 'b1', weight: 0.5 }, { boneId: 'b2', weight: 0.5 }] },
    ];
    const weightRes = await bus.dispatch({
      type: 'set_weights',
      domain: 'rig',
      targetId: assetId,
      data: { assetId, weights: newWeights },
    });
    expect(weightRes.status).toBe('success');

    // Solve IK
    const ikRes = await bus.dispatch({
      type: 'solve_ik',
      domain: 'rig',
      data: {
        root: { x: 0, y: 0 },
        length1: 50,
        length2: 50,
        target: { x: 50, y: 50 },
        poleDirection: 1,
      },
    });
    expect(ikRes.status).toBe('success');
    expect(ikRes.data).toBeDefined();
    expect((ikRes.data as Record<string, unknown>).reached).toBe(true);
  });

  it('manages 2.5D scene instances, camera, light, and shots', async () => {
    await bus.dispatch({
      type: 'create_project',
      domain: 'project',
      data: { name: 'Film Production Scene' },
    });

    // 1. Add scene instance
    const instRes = await bus.dispatch({
      type: 'add_instance',
      domain: 'scene',
      data: {
        assetId: 'asset-hero-1',
        name: 'Hero In Scene',
        position: { x: 100, y: 200 },
        depth: -50,
      },
    });
    expect(instRes.status).toBe('success');
    expect(instRes.entityId).toBeDefined();

    // 2. Update instance
    const updateInstRes = await bus.dispatch({
      type: 'update_instance',
      domain: 'scene',
      data: {
        instanceId: instRes.entityId,
        updates: { scale: 1.5, depth: 100 },
      },
    });
    expect(updateInstRes.status).toBe('success');

    // 3. Configure perspective camera with focal depth
    const camRes = await bus.dispatch({
      type: 'set_camera',
      domain: 'scene',
      data: {
        camera: {
          projection: 'perspective',
          fov: 60,
          focalDepth: 100,
          zoom: 1.2,
        },
      },
    });
    expect(camRes.status).toBe('success');

    // 4. Add directional light
    const lightRes = await bus.dispatch({
      type: 'set_light',
      domain: 'scene',
      data: {
        light: {
          id: 'sunlight-1',
          name: 'Sunlight',
          type: 'directional',
          position: { x: 1, y: -2 },
          intensity: 1.0,
          color: { r: 1, g: 0.95, b: 0.8, a: 1 },
          shadowMode: 'silhouette',
          shadowOpacity: 0.6,
          shadowColor: { r: 0, g: 0, b: 0, a: 0.6 },
          enabled: true,
        },
      },
    });
    expect(lightRes.status).toBe('success');

    // 5. Add film shot
    const shotRes = await bus.dispatch({
      type: 'add_shot',
      domain: 'scene',
      data: {
        name: 'Shot 1: Wide Establishing',
        startFrame: 0,
        endFrame: 60,
        transitionIn: 'cut',
      },
    });
    expect(shotRes.status).toBe('success');
    expect(shotRes.entityId).toBeDefined();

    // Verify scene state
    const scenes = state.getAllSceneData();
    expect(scenes.length).toBeGreaterThanOrEqual(1);
    const scene = scenes[0]!;
    expect(scene.instances.length).toBe(1);
    expect(scene.instances[0]!.scale).toBe(1.5);
    expect(scene.camera.projection).toBe('perspective');
    expect(scene.lights?.length).toBe(1);
    expect(scene.shots?.length).toBe(1);
  });
});

