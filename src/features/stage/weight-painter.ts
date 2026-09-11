import type { Point2D, VertexWeight } from '@parallax/contracts';
import { normalizeWeights } from '@parallax/core';

export type BrushMode = 'add' | 'subtract' | 'smooth' | 'set';

export interface WeightBrushConfig {
  /** Brush radius in pixels. */
  radius: number;
  /** Brush intensity / opacity in [0.05, 1.0]. */
  intensity: number;
  /** Blending mode for brush strokes. */
  mode: BrushMode;
}

/**
 * Apply weight painting brush to a set of vertex weights.
 *
 * @param vertices Flat vertex array [x0, y0, x1, y1, ...] in rest/mesh space.
 * @param currentWeights Current vertex weights.
 * @param boneId The active bone whose weight is being painted.
 * @param brushPos Brush center position in rest/mesh coordinates.
 * @param config Brush parameters (radius, intensity, mode).
 * @returns Updated, normalized vertex weights.
 */
export function applyWeightBrush(
  vertices: readonly number[],
  currentWeights: readonly VertexWeight[],
  boneId: string,
  brushPos: Point2D,
  config: WeightBrushConfig,
): VertexWeight[] {
  const vertexCount = vertices.length / 2;
  const radiusSq = config.radius * config.radius;
  const updatedWeights: VertexWeight[] = [];

  for (let i = 0; i < vertexCount; i++) {
    const vx = vertices[i * 2]!;
    const vy = vertices[i * 2 + 1]!;

    const dx = vx - brushPos.x;
    const dy = vy - brushPos.y;
    const distSq = dx * dx + dy * dy;

    const baseWeight = currentWeights[i] ?? {
      vertexIndex: i,
      influences: [{ boneId, weight: 1.0 }],
    };

    if (distSq > radiusSq) {
      updatedWeights.push(baseWeight);
      continue;
    }

    const dist = Math.sqrt(distSq);
    // Smoothstep falloff curve: 1 - 3*(d/r)^2 + 2*(d/r)^3
    const t = dist / config.radius;
    const falloff = Math.max(0, 1 - 3 * t * t + 2 * t * t * t);
    const delta = config.intensity * falloff;

    // Find existing influence for this bone
    const influences = [...baseWeight.influences];
    const infIdx = influences.findIndex((inf) => inf.boneId === boneId);
    let currentBoneWeight = infIdx >= 0 ? influences[infIdx]!.weight : 0;

    switch (config.mode) {
      case 'add':
        currentBoneWeight = Math.min(1.0, currentBoneWeight + delta);
        break;
      case 'subtract':
        currentBoneWeight = Math.max(0.0, currentBoneWeight - delta);
        break;
      case 'set':
        currentBoneWeight = Math.max(0.0, Math.min(1.0, config.intensity * falloff));
        break;
      case 'smooth':
        // Smooth towards average weight
        currentBoneWeight = currentBoneWeight * (1 - delta) + 0.5 * delta;
        break;
    }

    if (infIdx >= 0) {
      influences[infIdx] = { boneId, weight: currentBoneWeight };
    } else if (currentBoneWeight > 0) {
      influences.push({ boneId, weight: currentBoneWeight });
    }

    updatedWeights.push({
      vertexIndex: i,
      influences,
    });
  }

  // Normalize all weights to guarantee sum === 1.0 and max 4 influences per vertex
  return normalizeWeights(updatedWeights).weights as VertexWeight[];
}

/**
 * Compute RGB vertex colors for weight heatmap display.
 * Maps bone weight in [0, 1] to a gradient from Blue (0) -> Cyan (0.25) -> Green (0.5) -> Yellow (0.75) -> Red (1.0).
 *
 * @param weights Vertex weights.
 * @param boneId Selected bone ID.
 * @param vertexCount Total number of vertices.
 * @returns Flat Float32Array of RGB values (3 floats per vertex).
 */
export function computeHeatmapColors(
  weights: readonly VertexWeight[] | null,
  boneId: string | null,
  vertexCount: number,
): Float32Array {
  const colors = new Float32Array(vertexCount * 3);

  if (!weights || !boneId) {
    // Default neutral gray
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = 0.4;
      colors[i * 3 + 1] = 0.4;
      colors[i * 3 + 2] = 0.45;
    }
    return colors;
  }

  for (let i = 0; i < vertexCount; i++) {
    const vw = weights[i];
    let weight = 0;
    if (vw) {
      const inf = vw.influences.find((item) => item.boneId === boneId);
      if (inf) {
        weight = inf.weight;
      }
    }

    const { r, g, b } = sampleHeatmapColor(weight);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return colors;
}

/**
 * Sample RGB color from a smooth heatmap palette for weight in [0, 1].
 */
function sampleHeatmapColor(weight: number): { r: number; g: number; b: number } {
  const w = Math.max(0, Math.min(1, weight));

  // Color keys:
  // 0.00: Blue   (0.05, 0.15, 0.85)
  // 0.25: Cyan   (0.10, 0.75, 0.90)
  // 0.50: Green  (0.20, 0.85, 0.25)
  // 0.75: Yellow (0.95, 0.85, 0.10)
  // 1.00: Red    (0.95, 0.15, 0.15)
  if (w <= 0.25) {
    const t = w / 0.25;
    return {
      r: 0.05 + 0.05 * t,
      g: 0.15 + 0.6 * t,
      b: 0.85 + 0.05 * t,
    };
  } else if (w <= 0.5) {
    const t = (w - 0.25) / 0.25;
    return {
      r: 0.1 + 0.1 * t,
      g: 0.75 + 0.1 * t,
      b: 0.9 - 0.65 * t,
    };
  } else if (w <= 0.75) {
    const t = (w - 0.5) / 0.25;
    return {
      r: 0.2 + 0.75 * t,
      g: 0.85,
      b: 0.25 - 0.15 * t,
    };
  } else {
    const t = (w - 0.75) / 0.25;
    return {
      r: 0.95,
      g: 0.85 - 0.7 * t,
      b: 0.1 + 0.05 * t,
    };
  }
}
