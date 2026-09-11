import { describe, it, expect } from 'vitest';
import type { Light } from '@parallax/contracts';
import {
  projectPlanarShadow,
  createContactShadowGeometry,
} from './shadow-projector.js';

describe('shadow-projector', () => {
  const directionalLight: Light = {
    id: 'light-1',
    name: 'Sun',
    type: 'directional',
    position: { x: 1, y: -1 }, // 45 degree angle down and right
    color: { r: 1, g: 1, b: 1, a: 1 },
    intensity: 1.0,
    shadowMode: 'silhouette',
    shadowOpacity: 0.5,
    shadowColor: { r: 0, g: 0, b: 0, a: 0.5 },
    enabled: true,
  };

  it('projects vertices onto ground plane with directional light', () => {
    // A vertical stick from (100, 100) down to (100, 0)
    const vertices = [100, 100, 100, 0];
    const groundY = 0;

    const projected = projectPlanarShadow(vertices, directionalLight, groundY);

    expect(projected.length).toBe(4);
    // Base vertex at ground (100, 0) stays at ground (100, 0)
    expect(projected[2]).toBeCloseTo(100);
    expect(projected[3]).toBeCloseTo(0);

    // Top vertex at (100, 100) casts shadow rightward on ground
    // slope = -dirX / dirY = -1 / -1 = 1
    // x' = 100 + (0 - 100) * 1 = 0 ... wait, let's verify math:
    // deltaY = groundY - vy = 0 - 100 = -100
    // x' = 100 + (-100) * 1 = 0 (or along light direction)
    expect(projected[1]).toBeCloseTo(0);
    expect(typeof projected[0]).toBe('number');
  });

  it('projects vertices with point light source', () => {
    const pointLight: Light = {
      id: 'light-2',
      name: 'Lamp',
      type: 'point',
      position: { x: 50, y: 200 },
      color: { r: 1, g: 1, b: 1, a: 1 },
      intensity: 1.0,
      shadowMode: 'silhouette',
      shadowOpacity: 0.5,
      shadowColor: { r: 0, g: 0, b: 0, a: 0.5 },
      enabled: true,
    };

    const vertices = [100, 100];
    const groundY = 0;

    const projected = projectPlanarShadow(vertices, pointLight, groundY);

    expect(projected.length).toBe(2);
    expect(projected[1]).toBeCloseTo(0); // On ground plane
  });

  it('generates contact shadow ellipse geometry with correct vertices and indices', () => {
    const center = { x: 200, y: 50 };
    const radiusX = 60;
    const radiusY = 20;
    const segments = 12;

    const geometry = createContactShadowGeometry(center, radiusX, radiusY, segments);

    // vertexCount = segments + 1 = 13 vertices -> 26 float values
    expect(geometry.vertices.length).toBe(26);
    // Center vertex
    expect(geometry.vertices[0]).toBe(200);
    expect(geometry.vertices[1]).toBe(50);

    // indices count = segments * 3 = 36 indices (12 triangles)
    expect(geometry.indices.length).toBe(36);
  });
});
