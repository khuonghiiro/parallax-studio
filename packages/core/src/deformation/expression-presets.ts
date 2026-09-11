import type { ExpressionPreset } from '@parallax/contracts';

/**
 * Standard cinematic library of 6 facial expression presets.
 */
export const STANDARD_EXPRESSION_PRESETS: readonly ExpressionPreset[] = [
  {
    id: 'preset-happy',
    name: 'happy',
    weights: {
      smile: 1.0,
      mouth_open: 0.15,
      blink_left: 0.1,
      blink_right: 0.1,
    },
  },
  {
    id: 'preset-sad',
    name: 'sad',
    weights: {
      smile: 0.0,
      mouth_open: 0.2,
      blink_left: 0.35,
      blink_right: 0.35,
    },
  },
  {
    id: 'preset-surprised',
    name: 'surprised',
    weights: {
      smile: 0.0,
      mouth_open: 0.95,
      blink_left: 0.0,
      blink_right: 0.0,
    },
  },
  {
    id: 'preset-angry',
    name: 'angry',
    weights: {
      smile: 0.0,
      mouth_open: 0.35,
      blink_left: 0.15,
      blink_right: 0.15,
    },
  },
  {
    id: 'preset-thinking',
    name: 'thinking',
    weights: {
      smile: 0.15,
      mouth_open: 0.05,
      blink_left: 0.35,
      blink_right: 0.1,
    },
  },
  {
    id: 'preset-winking',
    name: 'winking',
    weights: {
      smile: 0.85,
      mouth_open: 0.1,
      blink_left: 1.0,
      blink_right: 0.0,
    },
  },
] as const;

/**
 * Get all available expression presets.
 */
export function getExpressionPresets(): readonly ExpressionPreset[] {
  return STANDARD_EXPRESSION_PRESETS;
}

/**
 * Find an expression preset by name.
 */
export function getExpressionPreset(name: string): ExpressionPreset | undefined {
  const lower = name.toLowerCase();
  return STANDARD_EXPRESSION_PRESETS.find((p) => p.name.toLowerCase() === lower);
}

/**
 * Apply an expression preset to a target morph weight dictionary.
 *
 * @param presetName Name of preset to apply.
 * @param baseWeights Existing weight dictionary to update or fallback to.
 * @returns Updated weights dictionary with preset applied.
 */
export function applyPresetToWeights(
  presetName: string,
  baseWeights: Record<string, number> = {},
): Record<string, number> {
  const preset = getExpressionPreset(presetName);
  if (!preset) {
    return { ...baseWeights };
  }

  const updated: Record<string, number> = { ...baseWeights };
  for (const [morphName, weight] of Object.entries(preset.weights)) {
    if (typeof weight === 'number') {
      updated[morphName] = weight;
    }
  }

  return updated;
}
