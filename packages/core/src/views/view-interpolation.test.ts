import { describe, it, expect } from 'vitest';
import {
  isTopologyCompatible,
  interpolateMeshes,
  resolveViewTransition,
} from './view-interpolation.js';
import type { TriangulationResult } from '../geometry/mesh-validation.js';

describe('view-interpolation', () => {
  const meshA: TriangulationResult = {
    vertices: [0, 0, 10, 0, 10, 10, 0, 10],
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    vertexCount: 4,
    triangleCount: 2,
  };

  const meshBCompatible: TriangulationResult = {
    vertices: [2, 1, 12, 1, 11, 11, 1, 10],
    indices: [0, 1, 2, 0, 2, 3],
    uvs: [0, 0, 1, 0, 1, 1, 0, 1],
    vertexCount: 4,
    triangleCount: 2,
  };

  const meshCIncompatible: TriangulationResult = {
    vertices: [0, 0, 5, 0, 10, 0, 5, 10],
    indices: [0, 1, 3, 1, 2, 3],
    uvs: [0, 0, 0.5, 0, 1, 0, 0.5, 1],
    vertexCount: 4,
    triangleCount: 2,
  };

  const meshDDifferentVertexCount: TriangulationResult = {
    vertices: [0, 0, 10, 0, 5, 10],
    indices: [0, 1, 2],
    uvs: [0, 0, 1, 0, 0.5, 1],
    vertexCount: 3,
    triangleCount: 1,
  };

  it('correctly identifies compatible and incompatible topologies', () => {
    expect(isTopologyCompatible(meshA, meshBCompatible)).toBe(true);
    expect(isTopologyCompatible(meshA, meshCIncompatible)).toBe(false);
    expect(isTopologyCompatible(meshA, meshDDifferentVertexCount)).toBe(false);
  });

  it('interpolates compatible meshes smoothly at midpoint (alpha = 0.5)', () => {
    const interpolated = interpolateMeshes(meshA, meshBCompatible, 0.5);
    expect(interpolated.vertexCount).toBe(4);
    expect(interpolated.triangleCount).toBe(2);
    // Vertex 0: (0,0) and (2,1) -> (1, 0.5)
    expect(interpolated.vertices[0]).toBeCloseTo(1);
    expect(interpolated.vertices[1]).toBeCloseTo(0.5);
    // Vertex 1: (10,0) and (12,1) -> (11, 0.5)
    expect(interpolated.vertices[2]).toBeCloseTo(11);
    expect(interpolated.vertices[3]).toBeCloseTo(0.5);
  });

  it('throws an error when attempting to interpolate incompatible meshes', () => {
    expect(() => interpolateMeshes(meshA, meshCIncompatible, 0.5)).toThrowError(
      /incompatible topology/,
    );
  });

  it('resolves continuous interpolation for compatible meshes', () => {
    const result = resolveViewTransition(meshA, meshBCompatible, 0.75);
    expect(result.mode).toBe('interpolated');
    expect(result.mesh.vertices[0]).toBeCloseTo(1.5);
  });

  it('resolves discrete switch for incompatible meshes without tearing', () => {
    const resBefore = resolveViewTransition(meshA, meshCIncompatible, 0.3, 0.5);
    expect(resBefore.mode).toBe('discrete');
    expect(resBefore.mesh).toBe(meshA);

    const resAfter = resolveViewTransition(meshA, meshCIncompatible, 0.6, 0.5);
    expect(resAfter.mode).toBe('discrete');
    expect(resAfter.mesh).toBe(meshCIncompatible);
  });
});
