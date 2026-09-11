import type { VertexWeight } from '@parallax/contracts';

/**
 * Result of weight normalization.
 */
export interface NormalizeWeightsResult {
  /** Normalized weights (sum === 1.0 per vertex). */
  readonly weights: readonly VertexWeight[];
  /** Number of vertices that were adjusted. */
  readonly adjustedCount: number;
}

/**
 * Epsilon for floating-point weight comparison.
 * Weights within this tolerance of 1.0 are considered normalized.
 */
const WEIGHT_EPSILON = 1e-6;

/**
 * Maximum number of bone influences per vertex (GPU constraint).
 */
const MAX_INFLUENCES = 4;

/**
 * Normalize vertex weights so the sum of all bone influences
 * equals 1.0 for each vertex.
 *
 * Steps:
 * 1. Sort influences by weight (descending).
 * 2. Trim to max 4 influences.
 * 3. Remove zero-weight influences.
 * 4. Normalize remaining so sum === 1.0.
 *
 * @throws Error if a vertex has no positive-weight influences.
 */
export function normalizeWeights(
  weights: readonly VertexWeight[],
): NormalizeWeightsResult {
  let adjustedCount = 0;
  const normalized: VertexWeight[] = [];

  for (const vertexWeight of weights) {
    // Sort by weight descending, keep top MAX_INFLUENCES
    const sorted = [...vertexWeight.influences]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_INFLUENCES)
      .filter((influence) => influence.weight > 0);

    if (sorted.length === 0) {
      throw new Error(
        `Vertex ${vertexWeight.vertexIndex} has no positive-weight influences`,
      );
    }

    // Check if already normalized
    const sum = sorted.reduce((acc, influence) => acc + influence.weight, 0);
    const needsAdjustment = Math.abs(sum - 1.0) > WEIGHT_EPSILON;

    if (needsAdjustment) {
      adjustedCount++;
    }

    // Normalize: divide each weight by the sum
    const normalizedInfluences = sorted.map((influence) => ({
      boneId: influence.boneId,
      weight: needsAdjustment ? influence.weight / sum : influence.weight,
    }));

    normalized.push({
      vertexIndex: vertexWeight.vertexIndex,
      influences: normalizedInfluences,
    });
  }

  return { weights: normalized, adjustedCount };
}

/**
 * Validate that all vertex weights are properly normalized.
 * Returns indices of vertices that fail validation.
 */
export function findUnnormalizedVertices(
  weights: readonly VertexWeight[],
): readonly number[] {
  const invalid: number[] = [];

  for (const vertexWeight of weights) {
    const sum = vertexWeight.influences.reduce(
      (acc: number, influence: { weight: number }) => acc + influence.weight,
      0,
    );

    if (Math.abs(sum - 1.0) > WEIGHT_EPSILON) {
      invalid.push(vertexWeight.vertexIndex);
    }

    if (vertexWeight.influences.length > MAX_INFLUENCES) {
      invalid.push(vertexWeight.vertexIndex);
    }
  }

  return invalid;
}
