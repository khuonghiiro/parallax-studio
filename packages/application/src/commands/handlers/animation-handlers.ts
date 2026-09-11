import type {
  CommandPayload,
  CommandResult,
  Track,
  Keyframe,
  Easing,
  AnimatableValue,
  PropertyPath,
} from '@parallax/contracts';
import type { ProjectState } from '../../projects/project-state.js';
import type { SceneData } from '../../projects/asset-data.js';

/**
 * Handle set_keyframe command.
 * Adds or updates a keyframe on a property track.
 */
export function handleSetKeyframe(
  state: ProjectState,
  payload: CommandPayload,
): CommandResult {
  const sceneId = (payload.data.sceneId as string) || 'scene-default';
  const property = payload.data.property as PropertyPath;
  const frame = payload.data.frame as number;
  const value = payload.data.value as AnimatableValue;
  const easing = (payload.data.easing as Easing) || { type: 'easeInOut' };

  if (!property || frame === undefined || value === undefined) {
    return {
      status: 'validation_error',
      error: 'property, frame, and value are required for set_keyframe',
    };
  }

  const currentScene: SceneData = state.getSceneData(sceneId) ?? {
    id: sceneId,
    name: 'Default Scene',
    instances: [],
    camera: {
      id: 'cam-main',
      name: 'Main Camera',
      projection: 'orthographic',
      position: { x: 0, y: 0 },
      rotation: 0,
      zoom: 1.0,
      fov: 45,
      viewport: { width: 1920, height: 1080 },
      focalDepth: 0,
    },
    tracks: [],
    clips: [],
  };

  const existingTrackIndex = currentScene.tracks.findIndex((t) => t.property === property);
  const newKeyframe: Keyframe = {
    frame,
    value,
    easing,
  };

  let updatedTracks: Track[];

  if (existingTrackIndex >= 0) {
    const track = currentScene.tracks[existingTrackIndex]!;
    const keyframes = track.keyframes.filter((kf) => kf.frame !== frame);
    keyframes.push(newKeyframe);
    keyframes.sort((a, b) => a.frame - b.frame);

    const updatedTrack: Track = {
      ...track,
      keyframes,
    };

    updatedTracks = [...currentScene.tracks];
    updatedTracks[existingTrackIndex] = updatedTrack;
  } else {
    const newTrack: Track = {
      id: `track-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      targetId: payload.targetId || 'global',
      property,
      keyframes: [newKeyframe],
      muted: false,
    };
    updatedTracks = [...currentScene.tracks, newTrack];
  }

  const updatedScene: SceneData = {
    ...currentScene,
    tracks: updatedTracks,
  };
  state.setSceneData(sceneId, updatedScene);

  const revision = state.incrementRevision();

  return {
    status: 'success',
    revision,
    data: {
      sceneId,
      property,
      frame,
      value,
    },
  };
}
