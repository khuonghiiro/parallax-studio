import { describe, it, expect } from 'vitest';
import {
  evaluateNormalLighting,
  unpackNormalPixel,
  normalizeVector,
  dotVector,
} from './normal-lighting.js';

describe('normal-lighting', () => {
  it('unpacks RGB normal map colors correctly', () => {
    // Neutral normal pointing straight out (128, 128, 255) in 8-bit tangent space
    const neutral = unpackNormalPixel(128, 128, 255);
    expect(neutral.z).toBeGreaterThan(0.9);
    expect(Math.abs(neutral.x)).toBeLessThan(0.05);
    expect(Math.abs(neutral.y)).toBeLessThan(0.05);
  });

  it('computes maximum diffuse intensity when light directly faces normal', () => {
    const normal = { x: 0, y: 0, z: 1 };
    const lightDir = { x: 0, y: 0, z: 1 };

    const result = evaluateNormalLighting({ normal, lightDir, ambient: 0.1 });

    expect(result.diffuse).toBeCloseTo(1.0);
    expect(result.intensity).toBeGreaterThan(0.8);
  });

  it('produces zero diffuse and specular when light is behind the surface', () => {
    const normal = { x: 0, y: 0, z: 1 };
    const lightDir = { x: 0, y: 0, z: -1 }; // Behind surface

    const result = evaluateNormalLighting({ normal, lightDir, ambient: 0.2 });

    expect(result.diffuse).toBe(0);
    expect(result.specular).toBe(0);
    expect(result.intensity).toBe(0.2); // Only ambient light
  });

  it('normalizes arbitrary vectors correctly', () => {
    const v = { x: 3, y: 4, z: 0 };
    const norm = normalizeVector(v);
    expect(dotVector(norm, norm)).toBeCloseTo(1.0);
  });
});
