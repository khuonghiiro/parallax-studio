import { describe, it, expect } from 'vitest';
import { solveTwoBoneIK } from './ik-solver.js';

describe('ik-solver', () => {
  const root = { x: 0, y: 0 };
  const length1 = 50;
  const length2 = 50;

  it('stretches straight when target is at maximum reach (100px)', () => {
    const target = { x: 100, y: 0 };
    const result = solveTwoBoneIK({ root, length1, length2, target });

    expect(result.reached).toBe(true);
    expect(result.angle1).toBeCloseTo(0);
    expect(result.angle2).toBeCloseTo(0);
    expect(result.jointPos.x).toBeCloseTo(50);
    expect(result.jointPos.y).toBeCloseTo(0);
    expect(result.endPos.x).toBeCloseTo(100);
    expect(result.endPos.y).toBeCloseTo(0);
  });

  it('bends correctly when target is at intermediate distance', () => {
    // 45-degree right triangle reach: root (0,0), target (50, 50)
    // distance = sqrt(50^2 + 50^2) = ~70.71 < 100
    const target = { x: 50, y: 50 };
    const result = solveTwoBoneIK({
      root,
      length1,
      length2,
      target,
      poleDirection: 1,
    });

    expect(result.reached).toBe(true);
    // End effector should match target position accurately
    expect(result.endPos.x).toBeCloseTo(50, 1);
    expect(result.endPos.y).toBeCloseTo(50, 1);
    // Bone 2 should be bent (angle2 !== 0)
    expect(Math.abs(result.angle2)).toBeGreaterThan(0.1);
  });

  it('inverts bend direction when poleDirection is -1', () => {
    const target = { x: 50, y: 50 };
    const posPole = solveTwoBoneIK({ root, length1, length2, target, poleDirection: 1 });
    const negPole = solveTwoBoneIK({ root, length1, length2, target, poleDirection: -1 });

    expect(posPole.jointPos.x).not.toBeCloseTo(negPole.jointPos.x);
    expect(posPole.jointPos.y).not.toBeCloseTo(negPole.jointPos.y);
  });

  it('handles targets beyond reach without crashing or producing NaN', () => {
    const target = { x: 200, y: 0 }; // reach is only 100
    const result = solveTwoBoneIK({ root, length1, length2, target });

    expect(result.reached).toBe(false);
    expect(Number.isNaN(result.angle1)).toBe(false);
    expect(Number.isNaN(result.angle2)).toBe(false);
    expect(result.endPos.x).toBeCloseTo(100);
    expect(result.endPos.y).toBeCloseTo(0);
  });
});
