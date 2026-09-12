import { describe, it, expect } from 'vitest';
import {
  findNearestVertex,
  moveVertex,
  sculptVertices,
} from './vertex-editor.js';

describe('vertex-editor', () => {
  const vertices = [
    0, 0,
    10, 0,
    20, 0,
    10, 10,
  ];

  it('finds the nearest vertex within max distance', () => {
    // Point close to vertex 1 (10, 0)
    const idx = findNearestVertex(vertices, { x: 11, y: 1 }, 5);
    expect(idx).toBe(1);

    // Point too far from any vertex
    const farIdx = findNearestVertex(vertices, { x: 100, y: 100 }, 10);
    expect(farIdx).toBe(-1);
  });

  it('moves a vertex to a new position immutably', () => {
    const updated = moveVertex(vertices, 1, { x: 15, y: -5 });
    expect(updated[2]).toBe(15);
    expect(updated[3]).toBe(-5);
    // Original array untouched
    expect(vertices[2]).toBe(10);
    expect(vertices[3]).toBe(0);
  });

  it('proportionally sculpts nearby vertices with falloff', () => {
    // Brush at (10, 0) with offset (0, 10)
    const sculpted = sculptVertices(
      vertices,
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      15,
      1.0,
    );

    // Vertex 1 (center of brush) should move the full offset (y = 0 + 10 = 10)
    expect(sculpted[2]).toBe(10);
    expect(sculpted[3]).toBeCloseTo(10, 1);

    // Vertex 0 (distance 10, within radius 15) should move partially
    expect(sculpted[1]).toBeGreaterThan(0);
    expect(sculpted[1]).toBeLessThan(10);
  });
});
