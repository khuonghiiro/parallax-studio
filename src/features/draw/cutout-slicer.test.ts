import { describe, it, expect } from 'vitest';
import {
  sliceCanvasIntoParts,
  generatePartPrompts,
  BASIC_6_REGIONS,
  DETAILED_10_REGIONS,
  STYLE_PRESETS,
  createPartCanvas,
} from './cutout-slicer.js';

describe('cutout-slicer', () => {
  it('defines correct anatomical regions for basic-6 and detailed-10', () => {
    expect(BASIC_6_REGIONS).toHaveLength(6);
    expect(DETAILED_10_REGIONS).toHaveLength(10);

    const basicIds = BASIC_6_REGIONS.map((r) => r.id);
    expect(basicIds).toContain('head');
    expect(basicIds).toContain('torso');
    expect(basicIds).toContain('arm_left');
    expect(basicIds).toContain('arm_right');
    expect(basicIds).toContain('leg_left');
    expect(basicIds).toContain('leg_right');

    const detailedIds = DETAILED_10_REGIONS.map((r) => r.id);
    expect(detailedIds).toContain('arm_left_upper');
    expect(detailedIds).toContain('arm_left_lower');
    expect(detailedIds).toContain('leg_left_upper');
    expect(detailedIds).toContain('leg_left_lower');
  });

  it('slices canvas into basic-6 parts with valid bounds and pivots', () => {
    const mockCanvas = createPartCanvas(600, 600);
    const parts = sliceCanvasIntoParts(mockCanvas, 'basic-6', 8);

    expect(parts).toHaveLength(6);
    for (const part of parts) {
      expect(part.canvas).toBeDefined();
      expect(part.bounds[2] - part.bounds[0]).toBeGreaterThan(0);
      expect(part.bounds[3] - part.bounds[1]).toBeGreaterThan(0);
      expect(part.pivot[0]).toBeGreaterThanOrEqual(0);
      expect(part.pivot[1]).toBeGreaterThanOrEqual(0);
    }
  });

  it('slices canvas into detailed-10 parts with scaled canvas dimensions', () => {
    const mockCanvas = createPartCanvas(1200, 1200);
    const parts = sliceCanvasIntoParts(mockCanvas, 'detailed-10', 12);

    expect(parts).toHaveLength(10);
    const headPart = parts.find((p) => p.id === 'head');
    expect(headPart).toBeDefined();
    if (headPart) {
      // 600 pivot was [300, 200] -> scaled 2x to [600, 400]
      expect(headPart.pivot[0]).toBe(600);
      expect(headPart.pivot[1]).toBe(400);
    }
  });

  it('generates structured AI prompts for each part matching style presets', () => {
    const brief = generatePartPrompts(
      'Female cyber ninja with luminous katana',
      'cyberpunk',
      'basic-6'
    );

    expect(brief.requestId).toMatch(/^brief-/);
    expect(brief.style).toBe('Cyberpunk Neon');
    expect(brief.parts).toHaveLength(6);

    const headPrompt = brief.parts.find((p) => p.partId === 'head');
    expect(headPrompt).toBeDefined();
    expect(headPrompt?.prompt).toContain('Female cyber ninja');
    expect(headPrompt?.prompt).toContain('cyberpunk style');
    expect(headPrompt?.prompt).toContain('transparent background');
    expect(headPrompt?.jointAnchor).toBe('Bottom center at neck joint socket');
  });

  it('supports all 5 style presets correctly', () => {
    expect(STYLE_PRESETS).toHaveLength(5);
    for (const preset of STYLE_PRESETS) {
      const brief = generatePartPrompts('Test Character', preset.id, 'basic-6');
      expect(brief.style).toBe(preset.nameEn);
      expect(brief.parts[0].prompt).toContain(preset.styleKeywords);
    }
  });
});
