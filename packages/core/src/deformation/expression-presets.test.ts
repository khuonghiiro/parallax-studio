import { describe, it, expect } from 'vitest';
import {
  getExpressionPresets,
  getExpressionPreset,
  applyPresetToWeights,
} from './expression-presets.js';

describe('expression-presets', () => {
  it('provides 6 standard presets', () => {
    const presets = getExpressionPresets();
    expect(presets.length).toBe(6);
    const names = presets.map((p) => p.name);
    expect(names).toContain('happy');
    expect(names).toContain('sad');
    expect(names).toContain('surprised');
    expect(names).toContain('angry');
    expect(names).toContain('thinking');
    expect(names).toContain('winking');
  });

  it('retrieves individual preset by name (case-insensitive)', () => {
    const happy = getExpressionPreset('Happy');
    expect(happy).toBeDefined();
    expect(happy?.weights['smile']).toBe(1.0);

    const missing = getExpressionPreset('non-existent');
    expect(missing).toBeUndefined();
  });

  it('applies preset to existing weights correctly', () => {
    const base = { smile: 0, mouth_open: 0, blink_left: 0 };
    const weights = applyPresetToWeights('surprised', base);

    expect(weights['mouth_open']).toBe(0.95);
    expect(weights['blink_left']).toBe(0);
  });
});
