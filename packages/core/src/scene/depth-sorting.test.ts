import { describe, it, expect } from 'vitest';
import type { SceneInstance } from '@parallax/contracts';
import {
  sortByDepth,
  computeParallaxOffset,
} from './depth-sorting.js';

describe('depth-sorting', () => {
  const instances: SceneInstance[] = [
    {
      id: 'inst-fg',
      assetId: 'asset-1',
      name: 'Foreground Bush',
      position: { x: 50, y: 10 },
      rotation: 0,
      scale: 1,
      depth: -200, // Close to camera
      visible: true,
      activeClipId: null,
    },
    {
      id: 'inst-bg',
      assetId: 'asset-2',
      name: 'Background Mountains',
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: 1,
      depth: 500, // Far away
      visible: true,
      activeClipId: null,
    },
    {
      id: 'inst-char',
      assetId: 'asset-3',
      name: 'Hero Character',
      position: { x: 100, y: 50 },
      rotation: 0,
      scale: 1,
      depth: 0, // Focal plane
      visible: true,
      activeClipId: null,
    },
  ];

  it('sorts instances by depth back-to-front (highest depth first)', () => {
    const sorted = sortByDepth(instances);

    expect(sorted.length).toBe(3);
    // Highest depth first: Background (500) -> Hero (0) -> Foreground (-200)
    expect(sorted[0]?.id).toBe('inst-bg');
    expect(sorted[1]?.id).toBe('inst-char');
    expect(sorted[2]?.id).toBe('inst-fg');
  });

  it('computes zero parallax offset at the focal depth', () => {
    const focalDepth = 0;
    const instanceDepth = 0;
    const cameraOffsetX = 100;
    const cameraOffsetY = 50;

    const offset = computeParallaxOffset(
      instanceDepth,
      focalDepth,
      cameraOffsetX,
      cameraOffsetY,
    );

    expect(offset.offsetX).toBe(0);
    expect(offset.offsetY).toBe(0);
  });

  it('computes proportional parallax offset for distant background and near foreground', () => {
    const focalDepth = 0;
    const cameraOffsetX = 100;
    const cameraOffsetY = 0;

    // Background (depth 500)
    const bgOffset = computeParallaxOffset(500, focalDepth, cameraOffsetX, cameraOffsetY);
    // Foreground (depth -200)
    const fgOffset = computeParallaxOffset(-200, focalDepth, cameraOffsetX, cameraOffsetY);

    expect(bgOffset.offsetX).toBeGreaterThan(0);
    expect(fgOffset.offsetX).toBeLessThan(0);
  });
});
