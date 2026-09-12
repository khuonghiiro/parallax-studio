import { describe, it, expect } from 'vitest';
import { calculateTransition } from './transitions.js';

describe('transitions', () => {
  it('returns null for instant cut or zero duration', () => {
    expect(calculateTransition(10, 10, 0, 'cut')).toBeNull();
    expect(calculateTransition(10, 10, 15, 'cut')).toBeNull();
  });

  it('returns null before shot start or after transition duration', () => {
    // Before start frame (frame 5 < start 10)
    expect(calculateTransition(5, 10, 15, 'fade')).toBeNull();
    // After duration (frame 25 >= start 10 + duration 15)
    expect(calculateTransition(25, 10, 15, 'fade')).toBeNull();
  });

  it('calculates accurate progress during transition', () => {
    // Start of fade
    const start = calculateTransition(10, 10, 20, 'fade');
    expect(start).not.toBeNull();
    expect(start?.progress).toBe(0.0);
    expect(start?.type).toBe('fade');

    // Midpoint of dissolve
    const mid = calculateTransition(20, 10, 20, 'dissolve');
    expect(mid).not.toBeNull();
    expect(mid?.progress).toBe(0.5);

    // Near end of wipe
    const end = calculateTransition(29, 10, 20, 'wipe-left');
    expect(end).not.toBeNull();
    expect(end?.progress).toBe(0.95);
  });
});
