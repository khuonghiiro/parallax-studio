export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe-left' | 'wipe-right';

export interface TransitionState {
  type: TransitionType;
  /** Normalized progress from 0.0 (start) to 1.0 (complete). */
  progress: number;
}

/**
 * Calculates transition progress given current frame, shot start frame, and duration.
 *
 * @param currentFrame Current playback frame.
 * @param shotStartFrame Starting frame of the incoming shot.
 * @param duration Transition length in frames.
 * @param type Transition effect type.
 * @returns Transition state or null if not currently transitioning.
 */
export function calculateTransition(
  currentFrame: number,
  shotStartFrame: number,
  duration: number,
  type: TransitionType = 'cut',
): TransitionState | null {
  if (type === 'cut' || duration <= 0) {
    return null;
  }

  const elapsed = currentFrame - shotStartFrame;
  if (elapsed < 0 || elapsed >= duration) {
    return null;
  }

  const progress = Math.max(0, Math.min(1, elapsed / duration));
  return { type, progress };
}

/**
 * Renders transition overlay effect onto a 2D canvas context.
 *
 * @param ctx 2D Canvas rendering context.
 * @param width Canvas width in pixels.
 * @param height Canvas height in pixels.
 * @param transition Active transition state.
 */
export function renderTransitionEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transition: TransitionState,
): void {
  const { type, progress } = transition;

  switch (type) {
    case 'fade': {
      // Dip to black: fade out to black (0..0.5), fade in from black (0.5..1.0)
      const alpha = Math.max(0, Math.min(1, 1 - progress));
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'dissolve': {
      // Cross-dissolve overlay
      ctx.fillStyle = `rgba(12, 16, 32, ${Math.max(0, 1 - progress)})`;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'wipe-left': {
      // Curtain wipe from left to right revealing incoming shot
      const wipeX = (1 - progress) * width;
      ctx.fillStyle = '#000000';
      ctx.fillRect(wipeX, 0, width - wipeX, height);
      break;
    }

    case 'wipe-right': {
      // Curtain wipe from right to left
      const wipeW = (1 - progress) * width;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, wipeW, height);
      break;
    }

    default:
      break;
  }
}
