/**
 * Procedural clip evaluator and test pose generator for skeleton deformation.
 */

export function evaluateProceduralClip(
  clipId: string,
  currentFrame: number,
  mode: string,
  isPlaying: boolean,
): Map<string, number> {
  const rotations = new Map<string, number>();
  const t = currentFrame * 0.08;

  if (mode === 'animate' || isPlaying) {
    if (clipId === 'idle') {
      // Natural Breathing Idle
      const breath = Math.sin(t * 0.45) * 0.028;

      rotations.set('spine', breath * 0.8);
      rotations.set('neck', -breath * 0.35);
      rotations.set('head', Math.sin(t * 0.25) * 0.015);

      rotations.set('upper_arm_l', 0.02 + breath * 0.25);
      rotations.set('forearm_l', 0.04);
      rotations.set('hand_l', 0);

      rotations.set('upper_arm_r', -0.02 - breath * 0.25);
      rotations.set('forearm_r', 0.04);
      rotations.set('hand_r', 0);

      rotations.set('thigh_l', 0);
      rotations.set('shin_l', 0);
      rotations.set('foot_l', 0);
      rotations.set('thigh_r', 0);
      rotations.set('shin_r', 0);
      rotations.set('foot_r', 0);
    } else if (clipId === 'walk') {
      // Royal Knight Walk
      const walkPhase = t * 0.9;
      const stride = Math.sin(walkPhase);

      rotations.set('thigh_l', stride * 0.04);
      rotations.set('shin_l', (1 - Math.cos(walkPhase)) * 0.025);
      rotations.set('foot_l', -stride * 0.02);

      rotations.set('thigh_r', -stride * 0.04);
      rotations.set('shin_r', (1 - Math.cos(walkPhase + Math.PI)) * 0.025);
      rotations.set('foot_r', stride * 0.02);

      rotations.set('upper_arm_l', -stride * 0.05);
      rotations.set('forearm_l', 0.02 + (1 - Math.cos(walkPhase)) * 0.02);
      rotations.set('hand_l', 0);

      rotations.set('upper_arm_r', stride * 0.05);
      rotations.set('forearm_r', -0.02 - (1 - Math.cos(walkPhase + Math.PI)) * 0.02);
      rotations.set('hand_r', 0);

      rotations.set('spine', Math.sin(walkPhase * 2) * 0.008);
      rotations.set('neck', 0);
      rotations.set('head', -Math.sin(walkPhase * 2) * 0.005);
    } else if (clipId === 'ready') {
      // Combat Ready Stance
      const breath = Math.sin(t * 0.5) * 0.012;

      rotations.set('thigh_l', -0.02);
      rotations.set('shin_l', 0.02);
      rotations.set('foot_l', 0);
      rotations.set('thigh_r', 0.02);
      rotations.set('shin_r', -0.02);
      rotations.set('foot_r', 0);

      rotations.set('upper_arm_l', 0.04);
      rotations.set('forearm_l', 0.08);
      rotations.set('hand_l', 0.02);

      rotations.set('upper_arm_r', -0.04);
      rotations.set('forearm_r', -0.08);
      rotations.set('hand_r', -0.02);

      rotations.set('spine', -0.02 + breath * 0.5);
      rotations.set('neck', 0.01);
      rotations.set('head', 0.015 - breath * 0.25);
    }
  } else {
    // Rest pose
    const zeroBones = [
      'spine', 'neck', 'head',
      'upper_arm_l', 'forearm_l', 'hand_l',
      'upper_arm_r', 'forearm_r', 'hand_r',
      'thigh_l', 'shin_l', 'foot_l',
      'thigh_r', 'shin_r', 'foot_r',
    ];
    for (const b of zeroBones) {
      rotations.set(b, 0);
    }
  }

  return rotations;
}

/**
 * Returns extreme test poses to verify skinning weights and avoid mesh tearing.
 */
export function getPresetTestPose(
  preset: 'wave' | 'bow' | 'jump' | 'stretch',
): Map<string, number> {
  const map = new Map<string, number>();

  switch (preset) {
    case 'wave':
      map.set('upper_arm_l', -1.2);
      map.set('forearm_l', -0.8);
      map.set('hand_l', 0.4);
      map.set('neck', 0.15);
      break;

    case 'bow':
      map.set('spine', 0.6);
      map.set('neck', 0.3);
      map.set('head', 0.2);
      map.set('thigh_l', -0.2);
      map.set('thigh_r', -0.2);
      break;

    case 'jump':
      map.set('thigh_l', -0.7);
      map.set('shin_l', 1.2);
      map.set('foot_l', -0.5);
      map.set('thigh_r', -0.7);
      map.set('shin_r', 1.2);
      map.set('foot_r', -0.5);
      map.set('upper_arm_l', -0.8);
      map.set('upper_arm_r', 0.8);
      break;

    case 'stretch':
      map.set('upper_arm_l', -1.5);
      map.set('forearm_l', 0.0);
      map.set('upper_arm_r', 1.5);
      map.set('forearm_r', 0.0);
      map.set('thigh_l', 0.4);
      map.set('thigh_r', -0.4);
      map.set('spine', -0.2);
      break;
  }

  return map;
}
