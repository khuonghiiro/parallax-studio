/**
 * 3D Vector representation for lighting and normal calculations.
 */
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Parameters for 2.5D normal-map illumination.
 */
export interface NormalLightingParams {
  /** Surface normal vector from normal map (expected normalized). */
  readonly normal: Vector3D;
  /** Light direction vector pointing toward light source (expected normalized). */
  readonly lightDir: Vector3D;
  /** View direction vector pointing toward camera (default (0, 0, 1)). */
  readonly viewDir?: Vector3D;
  /** Ambient light contribution [0, 1]. */
  readonly ambient?: number;
  /** Diffuse reflectance factor [0, 1]. */
  readonly diffuseCoeff?: number;
  /** Specular reflectance factor [0, 1]. */
  readonly specularCoeff?: number;
  /** Specular shininess exponent (e.g. 16 to 64). */
  readonly shininess?: number;
}

/**
 * Result of normal-mapped lighting calculation.
 */
export interface NormalLightingResult {
  /** Combined illumination multiplier (diffuse + specular + ambient). */
  readonly intensity: number;
  /** Diffuse component [0, 1]. */
  readonly diffuse: number;
  /** Specular component [0, 1]. */
  readonly specular: number;
}

/**
 * Normalize a 3D vector. Returns (0, 0, 1) fallback if length is zero.
 */
export function normalizeVector(v: Vector3D): Vector3D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.00001) {
    return { x: 0, y: 0, z: 1 };
  }
  return {
    x: v.x / len,
    y: v.y / len,
    z: v.z / len,
  };
}

/**
 * Dot product of two 3D vectors.
 */
export function dotVector(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Compute 2.5D volume lighting using Blinn-Phong shading model on normal-mapped surface.
 *
 * Simulates depth and relief on flat 2D layers when directional or point lights move.
 *
 * @param params NormalLightingParams containing vectors and coefficients.
 * @returns NormalLightingResult with diffuse, specular, and final combined intensity.
 */
export function evaluateNormalLighting(
  params: NormalLightingParams,
): NormalLightingResult {
  const N = normalizeVector(params.normal);
  const L = normalizeVector(params.lightDir);
  const V = normalizeVector(params.viewDir ?? { x: 0, y: 0, z: 1 });

  const ambient = params.ambient ?? 0.25;
  const kd = params.diffuseCoeff ?? 0.75;
  const ks = params.specularCoeff ?? 0.35;
  const shininess = params.shininess ?? 32;

  // Lambertian diffuse: N . L clamped to 0
  const nDotL = Math.max(0, dotVector(N, L));
  const diffuse = nDotL;

  // Blinn-Phong half-angle vector: H = (L + V) / |L + V|
  const H = normalizeVector({
    x: L.x + V.x,
    y: L.y + V.y,
    z: L.z + V.z,
  });

  const nDotH = Math.max(0, dotVector(N, H));
  // Specular only appears when surface faces light
  const specular = nDotL > 0 ? Math.pow(nDotH, shininess) : 0;

  const total = ambient + diffuse * kd + specular * ks;
  const intensity = Math.max(0, Math.min(2.0, total));

  return {
    intensity,
    diffuse,
    specular,
  };
}

/**
 * Unpack RGB [0, 255] normal map pixel value into normalized tangent-space normal vector [-1, 1].
 */
export function unpackNormalPixel(
  r: number,
  g: number,
  b: number,
): Vector3D {
  const nx = (r / 255) * 2 - 1;
  const ny = (g / 255) * 2 - 1;
  const nz = (b / 255) * 2 - 1;
  return normalizeVector({ x: nx, y: ny, z: nz });
}
