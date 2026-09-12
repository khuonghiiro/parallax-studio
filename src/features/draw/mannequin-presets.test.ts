import { describe, it, expect, vi } from 'vitest';
import {
  MANNEQUIN_PRESETS,
  renderMannequinPreset,
  type MannequinPresetId,
} from './mannequin-presets.js';

describe('Mannequin Base Presets', () => {
  it('defines 4 standard presets with metadata', () => {
    expect(MANNEQUIN_PRESETS).toHaveLength(4);
    const ids = MANNEQUIN_PRESETS.map((p) => p.id);
    expect(ids).toContain('hero-male');
    expect(ids).toContain('female-anime');
    expect(ids).toContain('chibi');
    expect(ids).toContain('creature');
  });

  function createMockContext(): CanvasRenderingContext2D {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      roundRect: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
  }

  it('renders all presets without errors', () => {
    const presets: MannequinPresetId[] = ['hero-male', 'female-anime', 'chibi', 'creature'];

    for (const id of presets) {
      const mockCtx = createMockContext();
      expect(() => {
        renderMannequinPreset(mockCtx, id, 600, 600, {
          pose: 'a-pose',
          showJoints: true,
          color: '#3b82f6',
        });
      }).not.toThrow();

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    }
  });

  it('supports T-pose and A-pose options for humanoid mannequins', () => {
    const mockCtxA = createMockContext();
    const mockCtxT = createMockContext();

    renderMannequinPreset(mockCtxA, 'hero-male', 600, 600, { pose: 'a-pose' });
    renderMannequinPreset(mockCtxT, 'hero-male', 600, 600, { pose: 't-pose' });

    expect(mockCtxA.fill).toHaveBeenCalled();
    expect(mockCtxT.fill).toHaveBeenCalled();
  });
});
