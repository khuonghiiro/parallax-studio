import type { Clip, Track, AnimatableValue } from '@parallax/contracts';
import { sampleKeyframes } from './sample-keyframes.js';

/**
 * Result of sampling a clip at a specific time.
 * Maps target ID + property path to the interpolated value.
 */
export interface ClipSampleResult {
  /** Map of "targetId.property" → sampled value. */
  readonly values: ReadonlyMap<string, AnimatableValue>;
}

/**
 * Sample all tracks in a clip at a given frame.
 *
 * @param clip The clip definition with time range.
 * @param tracks The tracks belonging to this clip (pre-filtered by clip.trackIds).
 * @param frame Global timeline frame number.
 * @returns Sampled values for all active tracks.
 */
export function sampleClip(
  clip: Clip,
  tracks: readonly Track[],
  frame: number,
): ClipSampleResult {
  const values = new Map<string, AnimatableValue>();

  // Map global frame to local clip frame
  const localFrame = computeLocalFrame(clip, frame);

  for (const track of tracks) {
    if (track.muted) {
      continue;
    }

    if (track.keyframes.length === 0) {
      continue;
    }

    const sampledFrame = localFrame * clip.speed;
    const value = sampleKeyframes(track.keyframes, sampledFrame);
    const key = `${track.targetId}.${track.property}`;
    values.set(key, value);
  }

  return { values };
}

/**
 * Convert a global timeline frame to a local clip frame.
 * Handles looping clips by wrapping the frame within the clip range.
 */
function computeLocalFrame(clip: Clip, globalFrame: number): number {
  const duration = clip.endFrame - clip.startFrame;

  if (duration <= 0) {
    return 0;
  }

  let localFrame = globalFrame - clip.startFrame;

  if (clip.loop && localFrame > duration) {
    // Wrap around for looping clips
    localFrame = localFrame % (duration + 1);
  } else {
    // Clamp for non-looping clips
    localFrame = Math.max(0, Math.min(duration, localFrame));
  }

  return localFrame;
}

/**
 * Check whether a given global frame falls within a clip's active range.
 * For looping clips, always returns true after the start frame.
 */
export function isFrameInClip(clip: Clip, frame: number): boolean {
  if (frame < clip.startFrame) {
    return false;
  }

  if (clip.loop) {
    return true;
  }

  return frame <= clip.endFrame;
}
