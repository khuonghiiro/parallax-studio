import type { SceneInstance } from '@parallax/contracts';

/**
 * Sort scene instances by depth for correct rendering order.
 * Higher depth values are rendered first (further from camera).
 *
 * Uses stable sort to preserve insertion order for equal depths.
 *
 * @param instances Scene instances to sort.
 * @returns New array sorted by depth (back-to-front).
 */
export function sortByDepth(
  instances: readonly SceneInstance[],
): SceneInstance[] {
  return [...instances].sort((a, b) => {
    // Higher depth = further away = render first
    if (b.depth !== a.depth) {
      return b.depth - a.depth;
    }

    // Tie-break by draw order within same depth
    return 0;
  });
}

/**
 * Compute parallax offset for an instance based on camera position
 * and the instance's depth relative to the focal depth.
 *
 * Instances at the focal depth don't move. Instances closer to
 * the camera move more, farther ones move less (parallax effect).
 *
 * @param instanceDepth Depth of the instance in the scene.
 * @param focalDepth Camera's focal depth (no parallax at this depth).
 * @param cameraOffsetX Horizontal camera offset from center.
 * @param cameraOffsetY Vertical camera offset from center.
 * @returns Parallax translation offset.
 */
export function computeParallaxOffset(
  instanceDepth: number,
  focalDepth: number,
  cameraOffsetX: number,
  cameraOffsetY: number,
): { offsetX: number; offsetY: number } {
  // Depth difference from focal plane
  const depthDiff = instanceDepth - focalDepth;

  // Parallax factor: 0 at focal depth, increases with distance.
  // Negative depth diff (closer) = opposite direction to camera,
  // Positive depth diff (farther) = same direction as camera.
  const factor = depthDiff * 0.01; // Scale factor for visible effect

  return {
    offsetX: cameraOffsetX * factor,
    offsetY: cameraOffsetY * factor,
  };
}
