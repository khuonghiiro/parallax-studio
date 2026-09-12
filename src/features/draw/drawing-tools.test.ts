import { describe, it, expect } from 'vitest';
import { floodFill, hexToRgba } from './flood-fill.js';
import { createTintedGhost } from './onion-skin.js';

describe('drawing-tools', () => {
  describe('flood-fill', () => {
    it('converts hex strings to RGBA correctly', () => {
      const red = hexToRgba('#ff0000', 255);
      expect(red).toEqual({ r: 255, g: 0, b: 0, a: 255 });

      const shorthand = hexToRgba('#fff', 128);
      expect(shorthand).toEqual({ r: 255, g: 255, b: 255, a: 128 });
    });

    it('fills a transparent square within boundaries', () => {
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      const imgData = { width, height, data } as unknown as ImageData;

      // Draw a black horizontal border at Y = 5
      for (let x = 0; x < width; x++) {
        const idx = (5 * width + x) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }

      // Flood fill from (2, 2) in top region with blue
      const blue = { r: 0, g: 0, b: 255, a: 255 };
      const modified = floodFill(imgData, 2, 2, blue, 10);
      expect(modified).toBe(true);

      // (2, 2) should now be blue
      const pIdx = (2 * width + 2) * 4;
      expect(data[pIdx]).toBe(0);
      expect(data[pIdx + 1]).toBe(0);
      expect(data[pIdx + 2]).toBe(255);
      expect(data[pIdx + 3]).toBe(255);

      // (2, 8) in bottom region across border should remain transparent
      const bIdx = (8 * width + 2) * 4;
      expect(data[bIdx + 3]).toBe(0);
    });
  });

  describe('onion-skin', () => {
    it('tints visible pixels while preserving transparency', () => {
      const width = 4;
      const height = 4;
      const data = new Uint8ClampedArray(width * height * 4);
      // Pixel (1, 1) is visible blue
      const idx = (1 * width + 1) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 255;
      data[idx + 3] = 200;

      const imgData = { width, height, data } as unknown as ImageData;
      const ghost = createTintedGhost(imgData, { r: 255, g: 100, b: 50 }, 0.5);

      // Transparent pixel remains transparent
      expect(ghost.data[0 + 3]).toBe(0);

      // Visible pixel has tinted RGB and multiplied alpha (200 * 0.5 = 100)
      expect(ghost.data[idx]).toBe(255);
      expect(ghost.data[idx + 1]).toBe(100);
      expect(ghost.data[idx + 2]).toBe(50);
      expect(ghost.data[idx + 3]).toBe(100);
    });
  });
});
