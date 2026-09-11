import type { ViewAngle } from '@parallax/contracts';

/**
 * Direction vector representing camera-to-subject orientation.
 */
export interface DirectionVector {
  /** Horizontal component: negative = left, positive = right. */
  readonly x: number;
  /** Depth component: negative = behind, positive = in front. */
  readonly z: number;
}

/**
 * View selection result with the chosen angle and confidence.
 */
export interface ViewSelectionResult {
  /** The selected view angle. */
  readonly angle: ViewAngle;
  /** Whether this is an exact match or the closest available. */
  readonly exact: boolean;
}

/**
 * Angle ranges for each view angle in degrees.
 * 0° = front, 90° = right side, 180° = back, -90° = left side.
 *
 * Thresholds use hysteresis to prevent flicker at boundaries.
 */
interface AngleRange {
  readonly center: number;
  readonly halfWidth: number;
}

const VIEW_ANGLE_RANGES: Record<ViewAngle, AngleRange> = {
  'front':         { center: 0,   halfWidth: 22.5 },
  'quarter-left':  { center: -45, halfWidth: 22.5 },
  'quarter-right': { center: 45,  halfWidth: 22.5 },
  'side-left':     { center: -90, halfWidth: 22.5 },
  'side-right':    { center: 90,  halfWidth: 22.5 },
  'back':          { center: 180, halfWidth: 22.5 },
};

/**
 * Hysteresis margin in degrees.
 * Once a view is selected, the direction must move beyond this
 * margin past the boundary before switching to prevent flicker.
 */
const HYSTERESIS_MARGIN = 5;

/**
 * Select the best view angle based on direction and available views.
 *
 * @param direction Camera-to-subject direction vector.
 * @param availableViews View angles that have been populated.
 * @param currentView The currently displayed view (for hysteresis).
 * @returns The selected view angle.
 */
export function selectView(
  direction: DirectionVector,
  availableViews: readonly ViewAngle[],
  currentView?: ViewAngle,
): ViewSelectionResult {
  if (availableViews.length === 0) {
    throw new Error('No available views to select from');
  }

  if (availableViews.length === 1) {
    return { angle: availableViews[0]!, exact: true };
  }

  // Convert direction to angle
  const angle = Math.atan2(direction.x, direction.z) * (180 / Math.PI);

  // If we have a current view, check hysteresis
  if (currentView && availableViews.includes(currentView)) {
    const currentRange = VIEW_ANGLE_RANGES[currentView];
    const extendedHalf = currentRange.halfWidth + HYSTERESIS_MARGIN;
    const diff = normalizeAngle(angle - currentRange.center);

    if (Math.abs(diff) <= extendedHalf) {
      return { angle: currentView, exact: true };
    }
  }

  // Find the closest available view angle
  let bestView = availableViews[0]!;
  let bestDist = Infinity;

  for (const viewAngle of availableViews) {
    const range = VIEW_ANGLE_RANGES[viewAngle];
    const dist = Math.abs(normalizeAngle(angle - range.center));

    if (dist < bestDist) {
      bestDist = dist;
      bestView = viewAngle;
    }
  }

  const range = VIEW_ANGLE_RANGES[bestView];
  const exact = Math.abs(normalizeAngle(angle - range.center)) <= range.halfWidth;

  return { angle: bestView, exact };
}

/**
 * Normalize an angle to [-180, 180] degrees.
 */
function normalizeAngle(degrees: number): number {
  let result = degrees % 360;

  if (result > 180) {
    result -= 360;
  }
  if (result < -180) {
    result += 360;
  }

  return result;
}
