import type { Light, Point2D } from '@parallax/contracts';

/**
 * Planar shadow projection result containing projected vertices.
 */
export interface ShadowMeshGeometry {
  /** Array of 2D or 3D vertex coordinates (x, y per vertex). */
  readonly vertices: Float32Array;
  /** Triangle indices for rendering the shadow mesh. */
  readonly indices: Uint16Array;
}

/**
 * Project a set of 2D vertices onto a flat ground plane along the light direction.
 *
 * For directional light:
 *   Projects vertices along light ray: x' = x + (groundY - y) * (dirX / dirY)
 *   groundY is the horizontal plane where the shadow falls.
 *
 * For point light:
 *   Projects rays originating from the light source through each vertex onto groundY.
 *
 * Clamps maximum shadow stretch to avoid infinite projection when rays are nearly horizontal.
 *
 * @param sourceVertices Array of flat vertex coordinates [x0, y0, x1, y1, ...].
 * @param light Light source definition.
 * @param groundY Y-coordinate of the ground plane in scene space.
 * @param maxStretch Maximum allowable shadow length multiplier to prevent distortion.
 * @returns Projected shadow vertex coordinates [x0', y0', x1', y1', ...].
 */
export function projectPlanarShadow(
  sourceVertices: Float32Array | readonly number[],
  light: Light,
  groundY: number,
  maxStretch = 3.0,
): Float32Array {
  const count = sourceVertices.length;
  const projected = new Float32Array(count);

  if (light.type === 'directional') {
    // Light position represents direction vector (dirX, dirY)
    const dirX = light.position.x || 0.0;
    const dirY = light.position.y || -1.0;

    // Avoid division by zero when light is parallel to ground
    const safeDirY = Math.abs(dirY) < 0.001 ? (dirY < 0 ? -0.001 : 0.001) : dirY;
    let slope = -dirX / safeDirY;

    // Clamp slope to prevent extreme stretching
    slope = Math.max(-maxStretch, Math.min(maxStretch, slope));

    for (let i = 0; i < count; i += 2) {
      const vx = sourceVertices[i] ?? 0;
      const vy = sourceVertices[i + 1] ?? 0;

      // Distance from vertex to ground
      const deltaY = groundY - vy;

      projected[i] = vx + deltaY * slope;
      projected[i + 1] = groundY;
    }
  } else {
    // Point light source at (lx, ly)
    const lx = light.position.x;
    const ly = light.position.y;

    for (let i = 0; i < count; i += 2) {
      const vx = sourceVertices[i] ?? 0;
      const vy = sourceVertices[i + 1] ?? 0;

      const dy = vy - ly;
      const safeDy = Math.abs(dy) < 0.001 ? 0.001 : dy;
      const t = (groundY - ly) / safeDy;
      const clampedT = Math.max(-maxStretch, Math.min(maxStretch, t));

      projected[i] = lx + (vx - lx) * clampedT;
      projected[i + 1] = groundY;
    }
  }

  return projected;
}

/**
 * Generate an artistic contact shadow ellipse geometry positioned under an instance.
 *
 * @param center Center point (x, y) of the contact shadow (typically at the character's feet).
 * @param radiusX Horizontal radius of the shadow ellipse.
 * @param radiusY Vertical radius of the shadow ellipse.
 * @param segments Number of segments around the perimeter (minimum 8).
 * @returns ShadowMeshGeometry with vertices and indices.
 */
export function createContactShadowGeometry(
  center: Point2D,
  radiusX: number,
  radiusY: number,
  segments = 16,
): ShadowMeshGeometry {
  const safeSegments = Math.max(8, segments);
  // Center vertex + perimeter vertices
  const vertexCount = safeSegments + 1;
  const vertices = new Float32Array(vertexCount * 2);
  const indices = new Uint16Array(safeSegments * 3);

  // Center vertex at index 0
  vertices[0] = center.x;
  vertices[1] = center.y;

  const step = (Math.PI * 2) / safeSegments;

  for (let i = 0; i < safeSegments; i++) {
    const angle = i * step;
    const vx = center.x + Math.cos(angle) * radiusX;
    const vy = center.y + Math.sin(angle) * radiusY;

    const vIdx = (i + 1) * 2;
    vertices[vIdx] = vx;
    vertices[vIdx + 1] = vy;

    // Triangle connecting center (0), current vertex (i+1), and next vertex
    const nextIdx = i === safeSegments - 1 ? 1 : i + 2;
    const tIdx = i * 3;
    indices[tIdx] = 0;
    indices[tIdx + 1] = i + 1;
    indices[tIdx + 2] = nextIdx;
  }

  return {
    vertices,
    indices,
  };
}
