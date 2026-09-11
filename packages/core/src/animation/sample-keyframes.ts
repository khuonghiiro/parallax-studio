import type { Keyframe, AnimatableValue } from '@parallax/contracts';
import { evaluateEasing } from './easing.js';

/**
 * Sample a value from an ordered array of keyframes at a given frame.
 *
 * Behavior:
 * - Before the first keyframe: returns the first keyframe's value.
 * - After the last keyframe: returns the last keyframe's value.
 * - On a keyframe exactly: returns that keyframe's value.
 * - Between two keyframes: interpolates using the left keyframe's easing.
 *
 * @param keyframes Sorted array of keyframes (by frame number).
 * @param frame The frame number to sample at (can be fractional).
 * @returns The interpolated value at the given frame.
 */
export function sampleKeyframes(
  keyframes: readonly Keyframe[],
  frame: number,
): AnimatableValue {
  if (keyframes.length === 0) {
    throw new Error('Cannot sample from an empty keyframe array');
  }

  const first = keyframes[0]!;

  if (keyframes.length === 1) {
    return first.value;
  }

  // Before first keyframe
  if (frame <= first.frame) {
    return first.value;
  }

  // After last keyframe
  const last = keyframes[keyframes.length - 1]!;
  if (frame >= last.frame) {
    return last.value;
  }

  // Find the enclosing keyframe pair
  for (let i = 0; i < keyframes.length - 1; i++) {
    const left = keyframes[i]!;
    const right = keyframes[i + 1]!;

    if (frame >= left.frame && frame <= right.frame) {
      const duration = right.frame - left.frame;

      if (duration === 0) {
        return left.value;
      }

      const localT = (frame - left.frame) / duration;
      const easedT = evaluateEasing(left.easing, localT);

      return interpolateValue(left.value, right.value, easedT);
    }
  }

  // Should not reach here with sorted keyframes
  return first.value;
}

/**
 * Interpolate between two AnimatableValue instances.
 * Handles number, Point2D, and Color value types.
 */
function interpolateValue(
  from: AnimatableValue,
  to: AnimatableValue,
  t: number,
): AnimatableValue {
  if (typeof from === 'number' && typeof to === 'number') {
    return lerp(from, to, t);
  }

  if (isPoint2D(from) && isPoint2D(to)) {
    return {
      x: lerp(from.x, to.x, t),
      y: lerp(from.y, to.y, t),
    };
  }

  if (isColor(from) && isColor(to)) {
    return {
      r: lerp(from.r, to.r, t),
      g: lerp(from.g, to.g, t),
      b: lerp(from.b, to.b, t),
      a: lerp(from.a, to.a, t),
    };
  }

  // Type mismatch: return 'from' value
  return from;
}

/**
 * Linear interpolation between two numbers.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Type guard for Point2D-shaped values.
 */
function isPoint2D(
  value: AnimatableValue,
): value is { x: number; y: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    !('r' in value)
  );
}

/**
 * Type guard for Color-shaped values.
 */
function isColor(
  value: AnimatableValue,
): value is { r: number; g: number; b: number; a: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'r' in value &&
    'g' in value &&
    'b' in value &&
    'a' in value
  );
}
