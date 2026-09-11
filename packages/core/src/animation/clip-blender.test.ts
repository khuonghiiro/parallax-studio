import { describe, it, expect } from 'vitest';
import {
  lerp,
  lerpAngle,
  blendAnimatableValue,
  blendClipSamples,
  computeTransitionWeight,
} from './clip-blender.js';

describe('clip-blender', () => {
  it('interpolates numbers correctly with lerp', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(0, 100, 0.25)).toBe(25);
  });

  it('interpolates angles along the shortest arc', () => {
    // Almost full circle difference: 350 deg (approx 6.1 rad) to 10 deg (approx 0.17 rad)
    const angleA = Math.PI * 1.9; // ~342 deg
    const angleB = Math.PI * 0.1; // ~18 deg
    const blended = lerpAngle(angleA, angleB, 0.5);

    // The midpoint should be near 0 / 2*PI, not PI (180 deg)
    expect(Math.abs(blended)).toBeLessThan(0.5);
  });

  it('blends 2D points via blendAnimatableValue', () => {
    const ptA = { x: 0, y: 10 };
    const ptB = { x: 100, y: 50 };
    const result = blendAnimatableValue(ptA, ptB, 0.5) as { x: number; y: number };

    expect(result.x).toBe(50);
    expect(result.y).toBe(30);
  });

  it('blends multi-channel clip samples', () => {
    const sampleA = {
      values: new Map([
        ['bone.root.x', 0],
        ['bone.spine.rotation', 0],
      ]),
    };
    const sampleB = {
      values: new Map([
        ['bone.root.x', 100],
        ['bone.spine.rotation', 1.0],
      ]),
    };

    const blended = blendClipSamples(sampleA, sampleB, 0.5);

    expect(blended.values.get('bone.root.x')).toBe(50);
    expect(blended.values.get('bone.spine.rotation')).toBe(0.5);
  });

  it('computes transition weights correctly for cut, fade, and dissolve', () => {
    // Cut: instant switch
    expect(computeTransitionWeight(10, 15, 10, 'cut')).toBe(0);
    expect(computeTransitionWeight(15, 15, 10, 'cut')).toBe(1);

    // Fade / Dissolve: smoothstep between start and start+duration
    const midWeight = computeTransitionWeight(20, 15, 10, 'fade'); // halfway (20 - 15 = 5 / 10 = 0.5)
    // smoothstep(0.5) = 0.5^2 * (3 - 2*0.5) = 0.25 * 2 = 0.5
    expect(midWeight).toBeCloseTo(0.5);

    expect(computeTransitionWeight(5, 15, 10, 'fade')).toBe(0);
    expect(computeTransitionWeight(30, 15, 10, 'fade')).toBe(1);
  });
});
