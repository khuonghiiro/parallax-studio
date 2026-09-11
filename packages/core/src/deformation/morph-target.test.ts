import { describe, it, expect } from 'vitest';
import {
  applyMorphTargets,
  synthesizeFacialMorphTargets,
} from './morph-target.js';
import type { MorphTarget } from '@parallax/contracts';

describe('morph-target', () => {
  const baseVertices = [0, 0, 10, 10, 20, 0]; // 3 vertices

  it('applies additive morph blend weights correctly', () => {
    const smile: MorphTarget = {
      name: 'smile',
      weight: 0.5,
      deltas: [
        { x: 0, y: 2 },
        { x: 0, y: 4 },
        { x: 0, y: 2 },
      ],
    };

    const blended = applyMorphTargets(baseVertices, [{ target: smile }]);
    expect(blended[1]).toBeCloseTo(1); // 0 + 2 * 0.5
    expect(blended[3]).toBeCloseTo(12); // 10 + 4 * 0.5
    expect(blended[5]).toBeCloseTo(1); // 0 + 2 * 0.5
  });

  it('combines multiple active morph targets additively', () => {
    const targetA: MorphTarget = {
      name: 'targetA',
      weight: 1.0,
      deltas: [{ x: 5, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 0 }],
    };
    const targetB: MorphTarget = {
      name: 'targetB',
      weight: 1.0,
      deltas: [{ x: 0, y: 3 }, { x: 0, y: 3 }, { x: 0, y: 3 }],
    };

    const blended = applyMorphTargets(baseVertices, [
      { target: targetA },
      { target: targetB },
    ]);

    expect(blended[0]).toBeCloseTo(5);
    expect(blended[1]).toBeCloseTo(3);
  });

  it('throws error when delta count does not match vertex count', () => {
    const invalidTarget: MorphTarget = {
      name: 'invalid',
      weight: 1.0,
      deltas: [{ x: 1, y: 1 }], // Only 1 delta, but base has 3 vertices
    };

    expect(() =>
      applyMorphTargets(baseVertices, [{ target: invalidTarget }]),
    ).toThrowError(/does not match vertex count/);
  });

  it('synthesizes facial morph targets with correct length', () => {
    const targets = synthesizeFacialMorphTargets(baseVertices);
    expect(targets.length).toBe(3);
    expect(targets[0]!.name).toBe('blink');
    expect(targets[0]!.deltas.length).toBe(3);
  });
});
