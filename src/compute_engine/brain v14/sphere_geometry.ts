/**
 * RHUFT v13 — Sphere Geometry: Chapter 5 — The Sphere as Global Closure
 *
 * Implements Fibonacci spherical sampling, spherical harmonic projection,
 * angular coherence scoring, and spherical drift measurement.
 *
 * [PHIL] — The sphere is the archetype of isotropic total possibility and
 * omnidirectional closure. It provides the base domain for directional scanning
 * and the natural geometry for all-direction self-measurement.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI,
  PHI_INV,
  PI,
} from "./core/constants.ts";
import { at } from "./core/indexing.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Fibonacci Sphere Sampling — Deterministic Golden-Angle Distribution
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a deterministic set of points on a unit sphere using the golden angle.
 *
 * [MATH] — The golden angle γ = 2π·φ⁻¹ ≈ 137.508° provides the most uniform
 * distribution of points on a sphere by avoiding periodic alignment. The azimuthal
 * angle θ_k = 2π·k·φ⁻¹ and the polar angle z_k = 1 - (2k+1)/count.
 *
 * @param count — Number of points to generate (must be ≥ 1).
 * @returns Flat Float64Array of [x₀, y₀, z₀, x₁, y₁, z₁, ...].
 */
export function fibonacciSpherePoints(count: number): Float64Array {
  if (count < 1) return new Float64Array(0);
  const result = new Float64Array(count * 3);
  const goldenAngle = 2.0 * PI * PHI_INV; // 2π/φ ≈ 3.883 radians

  for (let k = 0; k < count; k++) {
    const z = 1.0 - (2.0 * k + 1.0) / count; // polar angle cosine
    const radius = Math.sqrt(Math.max(0.0, 1.0 - z * z)); // sin(θ)
    const theta = goldenAngle * k; // azimuthal angle
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);
    result[3 * k] = x as Float64;
    result[3 * k + 1] = y as Float64;
    result[3 * k + 2] = z as Float64;
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Spherical Harmonic Projection — Real-Valued Y_l^m
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Project a real-valued field onto real spherical harmonics Y_l^m.
 *
 * [MATH] — Real spherical harmonics are the natural basis for functions on S².
 * We use the real form (no complex numbers) suitable for Float64 deterministic
 * computation. For l=0: Y_0^0 = 1/√(4π). For l=1: three combinations.
 * For l=2: five combinations. Higher l extend the pattern.
 *
 * The field is assumed to be a 1D array of scalar values mapped to sphere
 * directions. The number of directions must match the Fibonacci sphere count
 * used to generate the sample points.
 *
 * @param field — Real-valued field array (one value per direction).
 * @param points — Fibonacci sphere points [x₀,y₀,z₀, ...] from fibonacciSpherePoints().
 * @param lmax — Maximum spherical harmonic degree (default 2).
 * @returns Coefficients as Float64Array, ordered: [Y_0^0, Y_1^-1, Y_1^0, Y_1^1, Y_2^-2, ...].
 */
export function sphericalHarmonicProjection(
  field: Float64Array,
  points: Float64Array,
  lmax: number = 2
): Float64Array {
  const numPoints = field.length;
  if (numPoints === 0 || points.length < numPoints * 3) {
    return new Float64Array(0);
  }

  // Number of real spherical harmonics up to degree lmax: (lmax+1)²
  const numCoeffs = (lmax + 1) * (lmax + 1);
  const coeffs = new Float64Array(numCoeffs);
  const weights = new Float64Array(numPoints).fill(1.0 / numPoints); // uniform sampling weight

  let coeffIdx = 0;

  for (let l = 0; l <= lmax; l++) {
    for (let m = -l; m <= l; m++) {
      let sum = 0.0;
      for (let i = 0; i < numPoints; i++) {
        const x = at(points, 3 * i);
        const y = points[3 * i + 1];
        const z = points[3 * i + 2];
        const Ylm = _realSphericalHarmonic(l, m, x, y, z);
        sum += at(field, i) * Ylm * at(weights, i);
      }
      // Normalize by 4π (surface area of unit sphere)
      coeffs[coeffIdx++] = (sum * 4.0 * PI) as Float64;
    }
  }

  return coeffs;
}

/**
 * Real spherical harmonic Y_l^m(x, y, z) for unit sphere coordinates.
 *
 * [MATH] — Implemented for l = 0, 1, 2. These are the most common degrees.
 * Higher degrees follow the same pattern using associated Legendre polynomials.
 */
function _realSphericalHarmonic(l: number, m: number, x: Float64, y: Float64, z: Float64): Float64 {
  // l=0: only m=0
  if (l === 0 && m === 0) {
    return 1.0 / Math.sqrt(4.0 * PI) as Float64;
  }

  // l=1: m=-1, 0, 1
  if (l === 1) {
    const c = Math.sqrt(3.0 / (4.0 * PI)) as Float64;
    if (m === -1) return (c * y) as Float64;       // Y_1^-1 ∝ sin(θ)sin(φ) = y
    if (m === 0) return (c * z) as Float64;        // Y_1^0 ∝ cos(θ) = z
    if (m === 1) return (c * x) as Float64;        // Y_1^1 ∝ sin(θ)cos(φ) = x
  }

  // l=2: m=-2, -1, 0, 1, 2
  if (l === 2) {
    const c2 = Math.sqrt(15.0 / (4.0 * PI)) as Float64;
    const c20 = Math.sqrt(5.0 / (16.0 * PI)) as Float64;
    if (m === -2) return (c2 * x * y) as Float64;
    if (m === -1) return (c2 * y * z) as Float64;
    if (m === 0) return (c20 * (3.0 * z * z - 1.0)) as Float64;
    if (m === 1) return (c2 * x * z) as Float64;
    if (m === 2) return (c2 * 0.5 * (x * x - y * y)) as Float64;
  }

  // l=3: the original hard-coded table had two normalisation defects — Y_3^±3 was
  // ×3 too large and Y_3^±2 ×√(3/2) too large (measured against the Legendre
  // ground truth, which is orthonormal to machine floor). l=3 and every higher
  // degree defer to the correct general associated-Legendre form below.
  if (l >= 3) return generalSphericalHarmonic(l, m, x, y, z);

  return 0 as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2b. GENERAL SPHERICAL HARMONICS — arbitrary (l, m) via associated Legendre
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Associated Legendre polynomial P_l^m(x) WITHOUT the Condon–Shortley phase,
 * matching the hard-coded l≤3 table above (which carries no (−1)^m). Computed
 * by the standard stable upward recurrence in l:
 *   (l−m) P_l^m = x(2l−1) P_{l−1}^m − (l+m−1) P_{l−2}^m
 * seeded from P_m^m = (2m−1)!! (1−x²)^{m/2}  (no CS phase) and P_{m+1}^m = x(2m+1)P_m^m.
 * Stable to machine floor for the degrees the sphere probe reaches (l ≲ 48).
 */
export function associatedLegendre(l: number, m: number, x: number): Float64 {
  if (m < 0 || l < 0 || m > l) return 0 as Float64;
  if (x < -1 || x > 1) return 0 as Float64;
  // P_m^m = (2m−1)!! (1−x²)^{m/2}
  let pmm = 1.0;
  if (m > 0) {
    const somx2 = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
    let fact = 1.0;
    for (let i = 1; i <= m; i++) { pmm *= fact * somx2; fact += 2.0; }
  }
  if (l === m) return pmm as Float64;
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1 as Float64;
  let pll = 0.0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll as Float64;
}

/**
 * GENERAL real spherical harmonic Y_l^m on the unit sphere, for ANY l ≥ 0 and
 * −l ≤ m ≤ l — the extension of the hard-coded l≤3 table to arbitrary degree.
 *
 * Convention (identical normalisation and sign as the l≤3 table, verified to
 * machine floor at l=0..3):
 *   m = 0 :  Y_l^0 = sqrt((2l+1)/(4π)) · P_l(z)
 *   m > 0 :  Y_l^{+m} = sqrt(2)·N_l^m · P_l^m(z) · cos(mφ)
 *            Y_l^{−m} = sqrt(2)·N_l^m · P_l^m(z) · sin(mφ)
 *   with N_l^m = sqrt((2l+1)/(4π) · (l−m)!/(l+m)!), φ = atan2(y, x), z = cos θ.
 *
 * These are orthonormal: ∮ Y_lm Y_l'm' dΩ = δ_ll' δ_mm'. Use this for l > 3;
 * the dedicated table above is kept for the common low degrees.
 */
export function generalSphericalHarmonic(l: number, m: number, x: Float64, y: Float64, z: Float64): Float64 {
  if (l < 0 || Math.abs(m) > l) return 0 as Float64;
  const am = Math.abs(m);
  // log-factorial ratio (l−m)!/(l+m)! for overflow-safe evaluation at high l.
  let logRatio = 0;
  for (let i = l - am + 1; i <= l + am; i++) logRatio -= Math.log(i);
  const N = Math.sqrt(((2 * l + 1) / (4 * PI)) * Math.exp(logRatio));
  const Plm = associatedLegendre(l, am, z);
  if (m === 0) return (N * Plm) as Float64;
  const phi = Math.atan2(y, x);
  const base = Math.SQRT2 * N * Plm;
  return (m > 0 ? base * Math.cos(am * phi) : base * Math.sin(am * phi)) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Angular Coherence — Isotropy Score
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute angular coherence: how uniformly distributed the field is across
 * all directions on the sphere.
 *
 * [MATH] — C_ang = 1 / (1 + V_ang) where V_ang is the variance of the field
 * values across all sphere directions. Perfect isotropy → C_ang = 1.
 * Perfect anisotropy (all in one direction) → C_ang → 0.
 *
 * @param field — Real-valued field array (one value per direction).
 * @returns Angular coherence in [0, 1].
 */
export function angularCoherence(field: Float64Array): Float64 {
  const n = field.length;
  if (n === 0) return 0 as Float64;

  let sum = 0.0;
  let sumSq = 0.0;
  for (let i = 0; i < n; i++) {
    const v = field[i] ?? 0;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  const variance = (sumSq / n) - (mean * mean);
  // Coherence = 1 / (1 + variance), clamped to [0, 1]
  const coherence = 1.0 / (1.0 + Math.abs(variance));
  return (coherence > 1.0 ? 1.0 : coherence) as Float64;
}

/**
 * Compute spherical variance: the angular variance of field values.
 *
 * [MATH] — V_ang = E[|Ψ|²] - |E[Ψ]|². This is the standard statistical variance
 * of the field magnitudes across all sampled directions.
 */
export function sphericalVariance(field: Float64Array): Float64 {
  const n = field.length;
  if (n === 0) return 0 as Float64;

  let sum = 0.0;
  let sumSq = 0.0;
  for (let i = 0; i < n; i++) {
    const v = field[i] ?? 0;
    sum += v;
    sumSq += v * v;
  }
  const mean = sum / n;
  return (sumSq / n - mean * mean) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Spherical Drift — Deviation from Ideal Spherical Form
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute spherical drift: how much the field deviates from an ideal
 * isotropic spherical target.
 *
 * [MATH] — D_sph = (1/N) Σ|Ψ_i - Ψ*_ideal,i|². The ideal field is the mean
 * value replicated across all directions (perfect isotropy). This measures the
 * deviation from potential perfection — the core RHUFT concept of drift.
 *
 * @param field — Real-valued field array.
 * @param idealField — Target ideal field (if null, uses the mean value as ideal).
 * @returns Spherical drift (non-negative, 0 = perfect match).
 */
export function sphericalDrift(
  field: Float64Array,
  idealField: Float64Array | null = null
): Float64 {
  const n = field.length;
  if (n === 0) return 0 as Float64;

  let ideal: Float64Array;
  if (idealField !== null && idealField.length === n) {
    ideal = idealField;
  } else {
    // Default ideal: mean value replicated (isotropic)
    let sum = 0.0;
    for (let i = 0; i < n; i++) {
      sum += field[i] ?? 0;
    }
    const mean = sum / n;
    ideal = new Float64Array(n).fill(mean);
  }

  let drift = 0.0;
  for (let i = 0; i < n; i++) {
    const diff = (field[i] ?? 0) - (ideal[i] ?? 0);
    drift += diff * diff;
  }
  return (drift / n) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Nested Spherical Closure — Multiscale Coherence
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute multiscale spherical coherence by evaluating the field at multiple
 * nested "shells" (different spherical resolutions).
 *
 * [PHIL] — The sphere is not just a single surface but a recursive structure
 * of nested closures. Each scale has its own spherical coherence. The overall
 * coherence is the φ-weighted average across scales.
 *
 * @param fieldGenerator — Function that returns field for a given point count.
 * @param shellCounts — Array of point counts for each shell (default: φ-proportional).
 * @returns Multiscale coherence score in [0, 1].
 */
export function multiscaleSphericalCoherence(
  fieldGenerator: (count: number) => Float64Array,
  shellCounts: number[] = [8, 13, 21, 34]
): Float64 {
  let totalWeight = 0.0;
  let weightedCoherence = 0.0;

  for (let i = 0; i < shellCounts.length; i++) {
    const count = at(shellCounts, i);
    const field = fieldGenerator(count);
    const coh = angularCoherence(field);
    // Weight by φ^(-i) — higher shells (finer resolution) get less weight
    const weight = Math.pow(PHI_INV, i);
    weightedCoherence += coh * weight;
    totalWeight += weight;
  }

  return (weightedCoherence / (totalWeight + 1e-300)) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Utility: Compute Magnitudes from Interleaved Complex Field
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract real magnitudes from an interleaved complex field [Re₀, Im₀, Re₁, Im₁, ...].
 *
 * [SPEC] — Helper for converting complex fields to spherical field values.
 * The result is a real-valued array of |Ψ_i| = sqrt(Re_i² + Im_i²).
 */
export function complexMagnitudes(complexField: Float64Array): Float64Array {
  const n = Math.floor(complexField.length / 2);
  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const re = complexField[2 * i] ?? 0;
    const im = complexField[2 * i + 1] ?? 0;
    result[i] = Math.sqrt(re * re + im * im) as Float64;
  }
  return result;
}
