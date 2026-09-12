import { describe, it, expect } from 'vitest';
import { extractContour } from './contour-extraction.js';
import { triangulateContour } from './triangulate-contour.js';

describe('extractContour with hole detection', () => {
  it('extracts solid rectangle contour with no holes', () => {
    const width = 14;
    const height = 14;
    const alphaData = new Uint8Array(width * height).fill(0);

    // Fill 10x10 solid rectangle from (2, 2) to (11, 11)
    for (let y = 2; y <= 11; y++) {
      for (let x = 2; x <= 11; x++) {
        alphaData[y * width + x] = 255;
      }
    }

    const result = extractContour(alphaData, width, height, 1.0);

    expect(result.outer.points.length).toBeGreaterThanOrEqual(4);
    expect(result.holes.length).toBe(0);

    // Verify triangulation
    const mesh = triangulateContour(result.outer, result.holes);
    expect(mesh.triangleCount).toBeGreaterThan(0);
    expect(mesh.vertexCount).toBe(result.outer.points.length);
  });

  it('detects a single hole in a donut shape', () => {
    const width = 24;
    const height = 24;
    const alphaData = new Uint8Array(width * height).fill(0);

    // Outer rectangle from (2, 2) to (21, 21)
    for (let y = 2; y <= 21; y++) {
      for (let x = 2; x <= 21; x++) {
        alphaData[y * width + x] = 255;
      }
    }

    // Cut out an inner transparent hole from (8, 8) to (15, 15)
    for (let y = 8; y <= 15; y++) {
      for (let x = 8; x <= 15; x++) {
        alphaData[y * width + x] = 0;
      }
    }

    const result = extractContour(alphaData, width, height, 1.0);

    expect(result.outer.points.length).toBeGreaterThanOrEqual(4);
    expect(result.holes.length).toBe(1);

    const hole = result.holes[0]!;
    expect(hole.points.length).toBeGreaterThanOrEqual(4);

    // Points in the hole should be within the hole area [8, 15]
    for (const p of hole.points) {
      expect(p.x).toBeGreaterThanOrEqual(7);
      expect(p.x).toBeLessThanOrEqual(16);
      expect(p.y).toBeGreaterThanOrEqual(7);
      expect(p.y).toBeLessThanOrEqual(16);
    }

    // Triangulate contour with hole
    const mesh = triangulateContour(result.outer, result.holes);
    expect(mesh.triangleCount).toBeGreaterThan(0);
    expect(mesh.indices.length).toBe(mesh.triangleCount * 3);

    // Verify no triangle midpoint lands in the dead center of the hole (11.5, 11.5)
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const i0 = mesh.indices[i]! * 2;
      const i1 = mesh.indices[i + 1]! * 2;
      const i2 = mesh.indices[i + 2]! * 2;

      const cx = (mesh.vertices[i0]! + mesh.vertices[i1]! + mesh.vertices[i2]!) / 3;
      const cy = (mesh.vertices[i0 + 1]! + mesh.vertices[i1 + 1]! + mesh.vertices[i2 + 1]!) / 3;

      const isInHoleCenter = cx >= 9 && cx <= 14 && cy >= 9 && cy <= 14;
      expect(isInHoleCenter).toBe(false);
    }
  });

  it('detects multiple distinct holes', () => {
    const width = 30;
    const height = 30;
    const alphaData = new Uint8Array(width * height).fill(0);

    // Outer body: (2, 2) to (27, 27)
    for (let y = 2; y <= 27; y++) {
      for (let x = 2; x <= 27; x++) {
        alphaData[y * width + x] = 255;
      }
    }

    // Hole 1: Eye left (6, 6) to (10, 10)
    for (let y = 6; y <= 10; y++) {
      for (let x = 6; x <= 10; x++) {
        alphaData[y * width + x] = 0;
      }
    }

    // Hole 2: Eye right (18, 6) to (22, 10)
    for (let y = 6; y <= 10; y++) {
      for (let x = 18; x <= 22; x++) {
        alphaData[y * width + x] = 0;
      }
    }

    const result = extractContour(alphaData, width, height, 1.0);

    expect(result.outer.points.length).toBeGreaterThanOrEqual(4);
    expect(result.holes.length).toBe(2);

    const mesh = triangulateContour(result.outer, result.holes);
    expect(mesh.triangleCount).toBeGreaterThan(0);
  });

  it('ignores micro-noise transparent pixels below threshold', () => {
    const width = 20;
    const height = 20;
    const alphaData = new Uint8Array(width * height).fill(0);

    // Outer body
    for (let y = 2; y <= 17; y++) {
      for (let x = 2; x <= 17; x++) {
        alphaData[y * width + x] = 255;
      }
    }

    // 1-pixel micro noise hole at (10, 10)
    alphaData[10 * width + 10] = 0;

    const result = extractContour(alphaData, width, height, 1.0);

    // Micro noise (< 4 pixels) should be filtered out
    expect(result.holes.length).toBe(0);
  });
});
