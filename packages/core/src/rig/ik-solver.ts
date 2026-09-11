import type { Point2D } from '@parallax/contracts';

/**
 * Input parameters for a 2-bone analytical inverse kinematics solver.
 */
export interface TwoBoneIKParams {
  /** Root joint position (e.g. shoulder or hip). */
  readonly root: Point2D;
  /** Length of the upper bone (e.g. upper arm or thigh). */
  readonly length1: number;
  /** Length of the lower bone (e.g. forearm or shin). */
  readonly length2: number;
  /** Target end-effector destination (e.g. wrist or ankle). */
  readonly target: Point2D;
  /** Bend direction: +1 (standard bend) or -1 (inverted bend). */
  readonly poleDirection?: 1 | -1;
  /** Optional minimum angle constraint for bone 2 in radians. */
  readonly minAngle2?: number;
  /** Optional maximum angle constraint for bone 2 in radians. */
  readonly maxAngle2?: number;
}

/**
 * Result of the 2-bone IK calculation.
 */
export interface TwoBoneIKResult {
  /** World rotation angle of bone 1 in radians. */
  readonly angle1: number;
  /** Local relative rotation angle of bone 2 in radians. */
  readonly angle2: number;
  /** World rotation angle of bone 2 in radians. */
  readonly angle2World: number;
  /** Calculated position of the middle joint (elbow or knee). */
  readonly jointPos: Point2D;
  /** Final calculated end-effector position. */
  readonly endPos: Point2D;
  /** Whether the target was physically reachable within (length1 + length2). */
  readonly reached: boolean;
}

/**
 * Solve 2-bone Inverse Kinematics analytically using the Law of Cosines.
 *
 * Designed for 2D humanoid and quadruped limbs (thigh-shin or arm-forearm).
 * Guarantees zero NaN results even when target is out of reach or collapsed at root.
 *
 * @param params IK setup parameters.
 * @returns Computed joint angles and positions.
 */
export function solveTwoBoneIK(params: TwoBoneIKParams): TwoBoneIKResult {
  const {
    root,
    length1,
    length2,
    target,
    poleDirection = 1,
    minAngle2 = -Math.PI,
    maxAngle2 = Math.PI,
  } = params;

  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const dist = Math.hypot(dx, dy);
  const targetAngle = Math.atan2(dy, dx);

  const maxReach = length1 + length2;
  const minReach = Math.abs(length1 - length2);

  // Case 1: Target is at or beyond maximum reach -> fully stretch towards target
  if (dist >= maxReach || dist < 1e-6) {
    const angle1 = targetAngle;
    const angle2 = 0;
    const angle2World = targetAngle;

    const jointPos: Point2D = {
      x: root.x + length1 * Math.cos(angle1),
      y: root.y + length1 * Math.sin(angle1),
    };
    const endPos: Point2D = {
      x: root.x + maxReach * Math.cos(angle1),
      y: root.y + maxReach * Math.sin(angle1),
    };

    return {
      angle1,
      angle2,
      angle2World,
      jointPos,
      endPos,
      reached: dist <= maxReach + 1e-4,
    };
  }

  // Case 2: Target is within reach -> Law of Cosines
  const clampedDist = Math.max(minReach + 1e-4, Math.min(maxReach - 1e-4, dist));

  // Law of cosines for angle at root (alpha between target line and bone 1)
  const cosAlpha =
    (length1 * length1 + clampedDist * clampedDist - length2 * length2) /
    (2 * length1 * clampedDist);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

  // Law of cosines for interior angle at knee/elbow (gamma between bone 1 and bone 2)
  const cosGamma =
    (length1 * length1 + length2 * length2 - clampedDist * clampedDist) /
    (2 * length1 * length2);
  const gamma = Math.acos(Math.max(-1, Math.min(1, cosGamma)));

  // Bone 1 angle
  const angle1 = targetAngle + poleDirection * alpha;

  // Bone 2 local relative angle (exterior bend angle)
  let rawAngle2 = -poleDirection * (Math.PI - gamma);

  // Apply joint angle limits if configured
  rawAngle2 = Math.max(minAngle2, Math.min(maxAngle2, rawAngle2));

  const angle2 = rawAngle2;
  const angle2World = angle1 + angle2;

  const jointPos: Point2D = {
    x: root.x + length1 * Math.cos(angle1),
    y: root.y + length1 * Math.sin(angle1),
  };

  const endPos: Point2D = {
    x: jointPos.x + length2 * Math.cos(angle2World),
    y: jointPos.y + length2 * Math.sin(angle2World),
  };

  return {
    angle1,
    angle2,
    angle2World,
    jointPos,
    endPos,
    reached: true,
  };
}
