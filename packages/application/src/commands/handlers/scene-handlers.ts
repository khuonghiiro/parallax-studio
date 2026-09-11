import type {
  CommandPayload,
  CommandResult,
  SceneInstance,
  Camera,
  Light,
  Shot,
} from '@parallax/contracts';
import type { ProjectState } from '../../projects/project-state.js';
import type { SceneData } from '../../projects/asset-data.js';

function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${ts}-${rnd}`;
}

function getOrCreateScene(state: ProjectState, sceneId?: string): SceneData {
  const scenes = state.getAllSceneData();
  if (sceneId) {
    const existing = state.getSceneData(sceneId);
    if (existing) return existing;
  }
  if (scenes.length > 0 && scenes[0]) {
    return scenes[0];
  }

  // Create default fallback scene
  const newSceneId = sceneId || 'scene-default';
  const defaultCamera: Camera = {
    id: 'camera-main',
    name: 'Main Camera',
    projection: 'orthographic',
    position: { x: 0, y: 0 },
    zoom: 1.0,
    rotation: 0,
    viewport: { width: 1920, height: 1080 },
    fov: 50,
    focalDepth: 0,
  };

  const newScene: SceneData = {
    id: newSceneId,
    name: 'Main Scene',
    instances: [],
    camera: defaultCamera,
    tracks: [],
    clips: [],
    lights: [],
    shots: [],
  };

  state.setSceneData(newSceneId, newScene);
  return newScene;
}

export function handleAddInstance(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return { status: 'not_found', error: 'No project is loaded' };
  }

  const assetId = payload.data.assetId as string;
  if (!assetId) {
    return { status: 'validation_error', error: 'assetId is required for add_instance' };
  }

  const sceneId = payload.data.sceneId as string | undefined;
  const scene = getOrCreateScene(state, sceneId);

  const instanceId = (payload.data.id as string) || generateId('inst');
  const newInstance: SceneInstance = {
    id: instanceId,
    assetId,
    name: (payload.data.name as string) || `Instance ${scene.instances.length + 1}`,
    position: (payload.data.position as { x: number; y: number }) || { x: 0, y: 0 },
    rotation: (payload.data.rotation as number) ?? 0,
    scale: (payload.data.scale as number) ?? 1.0,
    depth: (payload.data.depth as number) ?? 0,
    visible: (payload.data.visible as boolean) ?? true,
    activeClipId: (payload.data.activeClipId as string) || null,
  };

  const updatedScene: SceneData = {
    ...scene,
    instances: [...scene.instances, newInstance],
  };

  state.setSceneData(scene.id, updatedScene);
  const revision = state.incrementRevision();

  return { status: 'success', revision, entityId: instanceId };
}

export function handleUpdateInstance(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return { status: 'not_found', error: 'No project is loaded' };
  }

  const instanceId = payload.data.instanceId as string;
  if (!instanceId) {
    return { status: 'validation_error', error: 'instanceId is required for update_instance' };
  }

  const sceneId = payload.data.sceneId as string | undefined;
  const scene = getOrCreateScene(state, sceneId);
  const existingIdx = scene.instances.findIndex((inst) => inst.id === instanceId);

  if (existingIdx === -1) {
    return { status: 'not_found', error: `Instance ${instanceId} not found in scene` };
  }

  const existing = scene.instances[existingIdx];
  if (!existing) {
    return { status: 'not_found', error: `Instance ${instanceId} not found` };
  }

  const updates = (payload.data.updates as Partial<SceneInstance>) || {};
  const updatedInstance: SceneInstance = {
    ...existing,
    ...updates,
  };

  const newInstances = [...scene.instances];
  newInstances[existingIdx] = updatedInstance;

  state.setSceneData(scene.id, { ...scene, instances: newInstances });
  const revision = state.incrementRevision();

  return { status: 'success', revision, entityId: instanceId };
}

export function handleRemoveInstance(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return { status: 'not_found', error: 'No project is loaded' };
  }

  const instanceId = payload.data.instanceId as string;
  if (!instanceId) {
    return { status: 'validation_error', error: 'instanceId is required for remove_instance' };
  }

  const sceneId = payload.data.sceneId as string | undefined;
  const scene = getOrCreateScene(state, sceneId);

  const filtered = scene.instances.filter((inst) => inst.id !== instanceId);
  if (filtered.length === scene.instances.length) {
    return { status: 'not_found', error: `Instance ${instanceId} not found` };
  }

  state.setSceneData(scene.id, { ...scene, instances: filtered });
  const revision = state.incrementRevision();

  return { status: 'success', revision, entityId: instanceId };
}

export function handleSetCamera(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return { status: 'not_found', error: 'No project is loaded' };
  }

  const rawCamera = (payload.data.camera as Partial<Camera>) || (payload.data as Partial<Camera>);
  if (!rawCamera || (!rawCamera.position && !rawCamera.zoom && !rawCamera.fov && !payload.data.camera)) {
    return { status: 'validation_error', error: 'camera data is required for set_camera' };
  }
  const cameraUpdates = (payload.data.camera as Partial<Camera>) || rawCamera;

  const sceneId = payload.data.sceneId as string | undefined;
  const scene = getOrCreateScene(state, sceneId);

  const updatedCamera: Camera = {
    ...scene.camera,
    ...cameraUpdates,
  };

  state.setSceneData(scene.id, { ...scene, camera: updatedCamera });
  const revision = state.incrementRevision();

  return { status: 'success', revision, entityId: updatedCamera.id };
}

export function handleSetLight(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return { status: 'not_found', error: 'No project is loaded' };
  }

  const lightData = payload.data.light as Light;
  if (!lightData || !lightData.id) {
    return { status: 'validation_error', error: 'Valid light object with id is required for set_light' };
  }

  const sceneId = payload.data.sceneId as string | undefined;
  const scene = getOrCreateScene(state, sceneId);
  const currentLights = scene.lights || [];

  const existingIdx = currentLights.findIndex((l) => l.id === lightData.id);
  const newLights = [...currentLights];

  if (existingIdx >= 0) {
    newLights[existingIdx] = lightData;
  } else {
    newLights.push(lightData);
  }

  state.setSceneData(scene.id, { ...scene, lights: newLights });
  const revision = state.incrementRevision();

  return { status: 'success', revision, entityId: lightData.id };
}

export function handleAddShot(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return { status: 'not_found', error: 'No project is loaded' };
  }

  const name = payload.data.name as string;
  const startFrame = payload.data.startFrame as number;
  const endFrame = payload.data.endFrame as number;

  if (!name || startFrame === undefined || endFrame === undefined) {
    return {
      status: 'validation_error',
      error: 'name, startFrame, and endFrame are required for add_shot',
    };
  }

  const sceneId = payload.data.sceneId as string | undefined;
  const scene = getOrCreateScene(state, sceneId);

  const shotId = (payload.data.id as string) || generateId('shot');
  const newShot: Shot = {
    id: shotId,
    name,
    cameraId: (payload.data.cameraId as string) || scene.camera.id,
    startFrame,
    endFrame,
    clipAssignments: (payload.data.clipAssignments as Record<string, string>) || {},
    transitionIn: (payload.data.transitionIn as 'cut' | 'fade' | 'dissolve') || 'cut',
    transitionDuration: (payload.data.transitionDuration as number) || 0,
  };

  const currentShots = scene.shots || [];
  state.setSceneData(scene.id, { ...scene, shots: [...currentShots, newShot] });
  const revision = state.incrementRevision();

  return { status: 'success', revision, entityId: shotId };
}

export function handleUpdateShot(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return { status: 'not_found', error: 'No project is loaded' };
  }

  const shotId = payload.data.shotId as string;
  if (!shotId) {
    return { status: 'validation_error', error: 'shotId is required for update_shot' };
  }

  const sceneId = payload.data.sceneId as string | undefined;
  const scene = getOrCreateScene(state, sceneId);
  const currentShots = scene.shots || [];

  const existingIdx = currentShots.findIndex((s) => s.id === shotId);
  if (existingIdx === -1) {
    return { status: 'not_found', error: `Shot ${shotId} not found in scene` };
  }

  const existing = currentShots[existingIdx];
  if (!existing) {
    return { status: 'not_found', error: `Shot ${shotId} not found` };
  }

  const updates = (payload.data.updates as Partial<Shot>) || {};
  const updatedShot: Shot = { ...existing, ...updates };

  const newShots = [...currentShots];
  newShots[existingIdx] = updatedShot;

  state.setSceneData(scene.id, { ...scene, shots: newShots });
  const revision = state.incrementRevision();

  return { status: 'success', revision, entityId: shotId };
}

export function handleRemoveShot(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  if (!state.isLoaded) {
    return { status: 'not_found', error: 'No project is loaded' };
  }

  const shotId = payload.data.shotId as string;
  if (!shotId) {
    return { status: 'validation_error', error: 'shotId is required for remove_shot' };
  }

  const sceneId = payload.data.sceneId as string | undefined;
  const scene = getOrCreateScene(state, sceneId);
  const currentShots = scene.shots || [];

  const filtered = currentShots.filter((s) => s.id !== shotId);
  if (filtered.length === currentShots.length) {
    return { status: 'not_found', error: `Shot ${shotId} not found in scene` };
  }

  state.setSceneData(scene.id, { ...scene, shots: filtered });
  const revision = state.incrementRevision();

  return { status: 'success', revision, entityId: shotId };
}
