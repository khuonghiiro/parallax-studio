import type { Easing, EasingType, CubicBezier } from '@parallax/contracts';

/**
 * Evaluate an easing function at parameter t in [0, 1].
 * Returns the eased value in [0, 1] (may overshoot for some bezier curves).
 */
export function evaluateEasing(easing: Easing, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const fn = easingFunctions[easing.type];

  return fn(clamped, easing.bezier);
}

/**
 * Linear interpolation (no easing).
 */
function linear(t: number): number {
  return t;
}

/**
 * Ease-in: slow start, fast finish (quadratic).
 */
function easeIn(t: number): number {
  return t * t;
}

/**
 * Ease-out: fast start, slow finish (quadratic).
 */
function easeOut(t: number): number {
  return t * (2 - t);
}

/**
 * Ease-in-out: slow start and finish (cubic).
 */
function easeInOut(t: number): number {
  if (t < 0.5) {
    return 2 * t * t;
  }
  return -1 + (4 - 2 * t) * t;
}

/**
 * Step function: no interpolation, holds the start value
 * until t reaches 1.0.
 */
function step(t: number): number {
  return t < 1 ? 0 : 1;
}

/**
 * Evaluate a cubic bezier curve defined by two control points.
 * Uses iterative bisection for t → x mapping.
 *
 * P0 = (0, 0), P1 = (x1, y1), P2 = (x2, y2), P3 = (1, 1).
 */
function cubicBezier(t: number, bezier?: CubicBezier): number {
  if (!bezier) {
    return linear(t);
  }

  const { x1, y1, x2, y2 } = bezier;

  // Find the bezier parameter u where x(u) = t
  const u = solveCubicBezierX(t, x1, x2);

  // Evaluate y at that parameter
  return cubicBezierAt(u, y1, y2);
}

/**
 * Evaluate one dimension of a cubic bezier at parameter u.
 * B(u) = 3(1-u)²u·p1 + 3(1-u)u²·p2 + u³
 */
function cubicBezierAt(u: number, p1: number, p2: number): number {
  const inverseU = 1 - u;
  return (
    3 * inverseU * inverseU * u * p1 +
    3 * inverseU * u * u * p2 +
    u * u * u
  );
}

/**
 * Solve for the bezier parameter u where x(u) ≈ targetX.
 * Uses Newton-Raphson with bisection fallback.
 */
function solveCubicBezierX(
  targetX: number,
  x1: number,
  x2: number,
): number {
  const EPSILON = 1e-7;
  const MAX_ITERATIONS = 20;

  // Newton-Raphson
  let u = targetX;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const x = cubicBezierAt(u, x1, x2) - targetX;

    if (Math.abs(x) < EPSILON) {
      return u;
    }

    // Derivative: dx/du
    const inverseU = 1 - u;
    const derivative =
      3 * inverseU * inverseU * x1 +
      6 * inverseU * u * (x2 - x1) +
      3 * u * u * (1 - x2);

    if (Math.abs(derivative) < EPSILON) {
      break; // Fallback to bisection
    }

    u -= x / derivative;
    u = Math.max(0, Math.min(1, u));
  }

  // Bisection fallback
  let lo = 0;
  let hi = 1;
  u = targetX;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const x = cubicBezierAt(u, x1, x2);

    if (Math.abs(x - targetX) < EPSILON) {
      return u;
    }

    if (x < targetX) {
      lo = u;
    } else {
      hi = u;
    }

    u = (lo + hi) / 2;
  }

  return u;
}

/**
 * Map of easing type to evaluation function.
 */
const easingFunctions: Record<
  EasingType,
  (t: number, bezier?: CubicBezier) => number
> = {
  'linear': linear,
  'ease-in': easeIn,
  'ease-out': easeOut,
  'ease-in-out': easeInOut,
  'step': step,
  'cubic-bezier': cubicBezier,
};
