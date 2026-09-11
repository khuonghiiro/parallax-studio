import type { AnimatableValue } from '@parallax/contracts';
import type { ClipSampleResult } from './sample-clip.js';

/**
 * Linearly interpolate between two numbers.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linearly interpolate between two angles in radians along the shortest arc.
 * Returns normalized angle in the range [-PI, PI].
 */
export function lerpAngle(a: number, b: number, t: number): number {
  const twoPi = Math.PI * 2;
  // Calculate difference wrapped to [-PI, PI]
  let diff = (b - a) % twoPi;
  diff = ((diff + Math.PI * 3) % twoPi) - Math.PI;
  const raw = a + diff * t;
  // Normalize result into [-PI, PI]
  return (((raw + Math.PI) % twoPi + twoPi) % twoPi) - Math.PI;
}

/**
 * Blend a single animatable value between state A and state B.
 * Handles numbers, rotation angles, 2D points, and discrete types.
 *
 * @param valA Starting value.
 * @param valB Ending value.
 * @param weight Blend factor from 0.0 (all A) to 1.0 (all B).
 * @param property Property path name to check for rotation logic.
 * @returns Blended animatable value.
 */
export function blendAnimatableValue(
  valA: AnimatableValue,
  valB: AnimatableValue,
  weight: number,
  property = '',
): AnimatableValue {
  const t = Math.max(0, Math.min(1, weight));

  // If types mismatch or discrete types, switch at threshold
  if (typeof valA !== typeof valB) {
    return t < 0.5 ? valA : valB;
  }

  // Numeric interpolation
  if (typeof valA === 'number' && typeof valB === 'number') {
    if (property.endsWith('.rotation') || property.endsWith('Rotation')) {
      return lerpAngle(valA, valB, t);
    }
    return lerp(valA, valB, t);
  }

  // 2D Point interpolation
  if (
    typeof valA === 'object' &&
    valA !== null &&
    typeof valB === 'object' &&
    valB !== null &&
    'x' in valA &&
    'y' in valA &&
    'x' in valB &&
    'y' in valB
  ) {
    const ptA = valA as { x: number; y: number };
    const ptB = valB as { x: number; y: number };
    return {
      x: lerp(ptA.x, ptB.x, t),
      y: lerp(ptA.y, ptB.y, t),
    };
  }

  // Fallback for boolean, string, or unknown types
  return t < 0.5 ? valA : valB;
}

/**
 * Blend two clip sampling results across all animated channels.
 *
 * @param sampleA Sample result from the outgoing clip.
 * @param sampleB Sample result from the incoming clip.
 * @param blendWeight Weight factor: 0.0 = full sampleA, 1.0 = full sampleB.
 * @returns Combined ClipSampleResult with interpolated channels.
 */
export function blendClipSamples(
  sampleA: ClipSampleResult,
  sampleB: ClipSampleResult,
  blendWeight: number,
): ClipSampleResult {
  const t = Math.max(0, Math.min(1, blendWeight));
  const blendedValues = new Map<string, AnimatableValue>();

  // Collect all unique keys from both samples
  const allKeys = new Set([...sampleA.values.keys(), ...sampleB.values.keys()]);

  for (const key of allKeys) {
    const valA = sampleA.values.get(key);
    const valB = sampleB.values.get(key);

    if (valA !== undefined && valB !== undefined) {
      blendedValues.set(key, blendAnimatableValue(valA, valB, t, key));
    } else if (valA !== undefined) {
      // Key only exists in sampleA
      blendedValues.set(key, valA);
    } else if (valB !== undefined) {
      // Key only exists in sampleB
      blendedValues.set(key, valB);
    }
  }

  return { values: blendedValues };
}

/**
 * Compute the blend weight for a shot transition at a specific frame.
 *
 * @param currentFrame The current global playback frame.
 * @param transitionStartFrame Frame where the transition starts.
 * @param transitionDuration Total length of the transition in frames.
 * @param transitionType Type of transition ('cut', 'fade', 'dissolve').
 * @returns Blend weight from 0.0 to 1.0.
 */
export function computeTransitionWeight(
  currentFrame: number,
  transitionStartFrame: number,
  transitionDuration: number,
  transitionType: 'cut' | 'fade' | 'dissolve' = 'cut',
): number {
  if (transitionType === 'cut' || transitionDuration <= 0) {
    return currentFrame >= transitionStartFrame ? 1.0 : 0.0;
  }

  if (currentFrame < transitionStartFrame) {
    return 0.0;
  }

  if (currentFrame >= transitionStartFrame + transitionDuration) {
    return 1.0;
  }

  // Linear progression
  const progress = (currentFrame - transitionStartFrame) / transitionDuration;

  if (transitionType === 'fade' || transitionType === 'dissolve') {
    // Smoothstep transition: 3p^2 - 2p^3
    return progress * progress * (3 - 2 * progress);
  }

  return progress;
}
