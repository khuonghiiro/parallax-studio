import type { Point2D } from '@parallax/contracts';

/**
 * Finds the index of the vertex closest to a given position within a maximum distance.
 *
 * @param vertices Flat coordinate array [x0, y0, x1, y1, ...].
 * @param pos Query position in mesh/asset coordinates.
 * @param maxDistance Maximum selection distance in pixels.
 * @returns Index of the closest vertex, or -1 if none within range.
 */
export function findNearestVertex(
  vertices: readonly number[],
  pos: Point2D,
  maxDistance = 20,
): number {
  const count = vertices.length / 2;
  const maxDistSq = maxDistance * maxDistance;
  let closestIndex = -1;
  let closestDistSq = maxDistSq;

  for (let i = 0; i < count; i++) {
    const vx = vertices[i * 2]!;
    const vy = vertices[i * 2 + 1]!;
    const dx = vx - pos.x;
    const dy = vy - pos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < closestDistSq) {
      closestDistSq = distSq;
      closestIndex = i;
    }
  }

  return closestIndex;
}

/**
 * Moves a single vertex to a new position.
 *
 * @param vertices Flat coordinate array.
 * @param index Vertex index.
 * @param newPos New position for the vertex.
 * @returns New immutable vertex array.
 */
export function moveVertex(
  vertices: readonly number[],
  index: number,
  newPos: Point2D,
): number[] {
  const next = [...vertices];
  next[index * 2] = newPos.x;
  next[index * 2 + 1] = newPos.y;
  return next;
}

/**
 * Deforms nearby vertices using a proportional soft-selection brush.
 *
 * @param vertices Flat coordinate array.
 * @param brushPos Center of the sculpt brush.
 * @param offset Movement delta (dx, dy).
 * @param radius Influence radius in pixels.
 * @param strength Strength multiplier (0 to 1).
 * @returns New immutable vertex array.
 */
export function sculptVertices(
  vertices: readonly number[],
  brushPos: Point2D,
  offset: Point2D,
  radius = 50,
  strength = 0.8,
): number[] {
  const next = [...vertices];
  const count = vertices.length / 2;
  const radiusSq = radius * radius;

  for (let i = 0; i < count; i++) {
    const vx = vertices[i * 2]!;
    const vy = vertices[i * 2 + 1]!;
    const dx = vx - brushPos.x;
    const dy = vy - brushPos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq > radiusSq) continue;

    const dist = Math.sqrt(distSq);
    // Smoothstep falloff curve
    const t = dist / radius;
    const falloff = (1 - t * t) * (1 - t * t);
    const factor = falloff * strength;

    next[i * 2] = vx + offset.x * factor;
    next[i * 2 + 1] = vy + offset.y * factor;
  }

  return next;
}
