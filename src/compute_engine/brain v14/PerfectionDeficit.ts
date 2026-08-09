/**
 * RHUFT v13 — Perfection Deficit: Chapter 3 — Why Perfect Closure Cannot Be Realized
 *
 * Implements the perfection deficit ε_t = D(Ψ_t, I_smooth), the ideal smooth
 * closure manifold I_smooth, convergence tracking, and the continuity law.
 *
 * [PHIL] — Perfect closure = exact symmetric completion. Exact completion eliminates
 * all measurable distinction. Existence requires measurable distinction. Therefore,
 * perfect closure is never realized. The universe is always in a state of stable
 * nonzero residual imbalance: the perfection deficit ε_t > 0.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI,
  PHI_INV,
  PHI_NEG3,
  PHI_NEG8,
  CLOSURE_COUPLING,
  PI,
} from "./core/constants.ts";

import {
  fibonacciSpherePoints,
  sphericalHarmonicProjection,
  complexMagnitudes,
  angularCoherence,
} from "./sphere_geometry.ts";
import { at } from "./core/indexing.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Result & Configuration Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of a single perfection deficit evaluation.
 *
 * [PHIL] — The perfection deficit is the ontological gap between what is
 * and what would be if closure were perfect. This gap is not a failure; it is
 * the engine of continuation.
 */
export interface PerfectionDeficitResult {
  /** Perfection deficit ε_t > 0. [MATH] */
  readonly epsilon: Float64;
  /** Ideal smooth closure field I_smooth used for this evaluation. */
  readonly idealField: Float64Array;
  /** Corner defect: Laplacian deviation from smoothness. [MATH] */
  readonly cornerDefect: Float64;
  /** Closure contribution to the deficit (from local coherence). [MATH] */
  readonly closureContribution: Float64;
  /** Is ε_t strictly positive? (existence condition). [PHIL] */
  readonly isPositive: boolean;
  /** Is ε_t bounded above by ε_max? (stability condition). [PHIL] */
  readonly isBounded: boolean;
  /** Is the system converging toward the ideal (∂ε/∂t < 0)? [MATH] */
  readonly isConverging: boolean;
  /** Finite-difference derivative of ε_t. [MATH] */
  readonly derivative: Float64;
  /** Continuity score from perfection deficit stability. [MATH] */
  readonly continuity: Float64;
  /** Tick index at which this evaluation was performed. */
  readonly tick: number;
}

/**
 * Configuration for the PerfectionDeficit evaluator.
 *
 * [MATH] — All defaults are φ-scale proportional to ensure scale invariance.
 */
export interface PerfectionDeficitConfig {
  /** Maximum allowable perfection deficit ε_max (default: 1/φ). [MATH] */
  readonly epsilonMax: Float64;
  /** Closure coupling ζ = 1/φ³ (default). [MATH] */
  readonly closureCoupling: Float64;
  /** Small regularizer ε to avoid division by zero (default: φ⁻⁸). [MATH] */
  readonly regularizer: Float64;
  /** Maximum spherical harmonic degree for corner defect (default: 3). [MATH] */
  readonly lmax: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the arithmetic mean of a real-valued field.
 *
 * [MATH] — μ = (1/N) Σ_i Ψ_i.
 */
function fieldMean(field: Float64Array): Float64 {
  const n = field.length;
  if (n === 0) return 0 as Float64;
  let sum = 0.0;
  for (let i = 0; i < n; i++) {
    sum += field[i] ?? 0;
  }
  return (sum / n) as Float64;
}

/**
 * Compute the mean squared difference between two real-valued fields.
 *
 * [MATH] — D = (1/N) Σ_i (a_i - b_i)².
 */
function meanSquaredDifference(a: Float64Array, b: Float64Array): Float64 {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0 as Float64;
  let sum = 0.0;
  for (let i = 0; i < n; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }
  return (sum / n) as Float64;
}

/**
 * Compute the mean squared difference for interleaved complex fields.
 *
 * [MATH] — D = (1/N) Σ_i [(Re_a_i - Re_b_i)² + (Im_a_i - Im_b_i)²].
 */
function meanSquaredDifferenceComplex(a: Float64Array, b: Float64Array): Float64 {
  const len = Math.min(a.length, b.length);
  const n = Math.floor(len / 2);
  if (n === 0) return 0 as Float64;
  let sum = 0.0;
  for (let i = 0; i < n; i++) {
    const dRe = (a[2 * i] ?? 0) - (b[2 * i] ?? 0);
    const dIm = (a[2 * i + 1] ?? 0) - (b[2 * i + 1] ?? 0);
    sum += dRe * dRe + dIm * dIm;
  }
  return (sum / n) as Float64;
}

/**
 * Reconstruct a uniform (isotropic) field from the l=0 spherical harmonic coefficient.
 *
 * [MATH] — I_i = c₀ · Y_0^0 = c₀ / √(4π). Since Y_0^0 is constant, the
 * reconstructed field is uniform across all directions.
 */
function reconstructUniformField(c0: Float64, count: number): Float64Array {
  const y00 = 1.0 / Math.sqrt(4.0 * PI);
  const value = c0 * y00;
  const result = new Float64Array(count);
  result.fill(value);
  return result;
}

/**
 * Compute the spectral Laplacian energy of a real-valued field on the sphere.
 *
 * [MATH] — The Laplace-Beltrami operator on S² has eigenvalues -l(l+1).
 * We approximate the squared Laplacian norm by projecting the field onto
 * real spherical harmonics up to lmax and summing l²(l+1)² |c_{lm}|².
 * This is a deterministic, spectral approximation of the corner defect.
 */
function spectralLaplacianEnergy(
  field: Float64Array,
  points: Float64Array,
  lmax: number
): Float64 {
  const coeffs = sphericalHarmonicProjection(field, points, lmax);
  if (coeffs.length === 0) return 0 as Float64;
  let energy = 0.0;
  let idx = 0;
  for (let l = 0; l <= lmax; l++) {
    for (let m = -l; m <= l; m++) {
      const c = coeffs[idx] ?? 0;
      if (l > 0) {
        const eigen = l * (l + 1);
        energy += eigen * eigen * c * c;
      }
      idx++;
    }
  }
  return energy as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PerfectionDeficit Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes the perfection deficit ε_t, the ideal smooth closure manifold
 * I_smooth, and tracks convergence properties.
 *
 * [PHIL] — The universe exists because it cannot complete itself. The perfection
 * deficit is the measure of that incompleteness. It is strictly positive for all
 * realized states, bounded above for stability, and its derivative tells us
 * whether the system is approaching or diverging from the ideal.
 *
 * [MATH] — ε_t = D(Ψ_t, I_smooth) + ζ·(1 - Q_local).
 * The ideal I_smooth is constructed as the l=0 spherical harmonic reconstruction
 * of the field, yielding the closest isotropic uniform approximation.
 */
export class PerfectionDeficit {
  private readonly _config: PerfectionDeficitConfig;
  private readonly _history: Map<number, Float64>;
  private _previousTick: number;
  private _previousEpsilon: Float64;

  constructor(config?: Partial<PerfectionDeficitConfig>) {
    this._config = {
      epsilonMax: (config?.epsilonMax ?? PHI_INV) as Float64,
      closureCoupling: (config?.closureCoupling ?? PHI_NEG3) as Float64,
      regularizer: (config?.regularizer ?? PHI_NEG8) as Float64,
      lmax: config?.lmax ?? 3,
    };
    this._history = new Map();
    this._previousTick = -1;
    this._previousEpsilon = 0 as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Ideal Smooth Closure Manifold
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the ideal smooth closure manifold I_smooth for a given field.
   *
   * [PHIL] — I_smooth is the limit-object of perfect spherical symmetry, zero
   * curvature, uniform phase, and infinite isotropy. It is not a realizable
   * state but a mathematical ideal against which realized states are measured.
   *
   * [MATH] — We construct I_smooth as the isotropic (l=0) component of the
   * field, obtained by projecting the field onto the Y_0^0 spherical harmonic
   * and reconstructing a uniform field. This yields the mean magnitude with
   * zero angular variation — the closest smooth spherical approximation.
   *
   * @param field — Realized field state Ψ_t (real-valued or complex interleaved).
   * @param pointCount — Number of sphere directions (defaults to field.length).
   * @returns Ideal smooth field I_smooth as a uniform real-valued array.
   */
  computeIdealSmoothField(field: Float64Array, pointCount?: number): Float64Array {
    const count = pointCount ?? field.length;
    if (count === 0) return new Float64Array(0);
    const points = fibonacciSpherePoints(count);
    const magnitudes = complexMagnitudes(field);
    const projectionField = magnitudes.length >= count ? magnitudes : field;
    const coeffs = sphericalHarmonicProjection(projectionField, points, 0);
    const c0 = coeffs.length > 0 ? coeffs[0] : 0.0;
    return reconstructUniformField(c0 as Float64, count);
  }

  /**
   * Compute an ideal smooth closure field for a complex interleaved field.
   *
   * [MATH] — For complex fields, the ideal smooth field is represented as
   * interleaved [Re, Im] where Re = constant magnitude and Im = 0, encoding
   * uniform phase (zero phase variation). The constant magnitude is the l=0
   * spherical harmonic mean of the magnitude spectrum.
   *
   * @param field — Interleaved complex field [Re₀, Im₀, ...].
   * @param pointCount — Number of complex modes (defaults to field.length/2).
   * @returns Ideal smooth complex field I_smooth interleaved.
   */
  computeIdealSmoothComplexField(field: Float64Array, pointCount?: number): Float64Array {
    const count = pointCount ?? Math.floor(field.length / 2);
    if (count === 0) return new Float64Array(0);
    const realIdeal = this.computeIdealSmoothField(field, count);
    const result = new Float64Array(count * 2);
    for (let i = 0; i < count; i++) {
      result[2 * i] = realIdeal[i] ?? 0;
      result[2 * i + 1] = 0.0;
    }
    return result;
  }

  /**
   * Compute an ideal smooth field by direct mean replication (non-spectral).
   *
   * [MATH] — I_i = μ for all i, where μ = (1/N) Σ_i Ψ_i. This is the
   * arithmetic-mean approximation of the ideal and is independent of spherical
   * geometry. It serves as a cross-check for the spectral l=0 reconstruction.
   *
   * @param field — Realized field Ψ_t.
   * @returns Uniform field of the same length filled with the mean.
   */
  computeIdealMeanField(field: Float64Array): Float64Array {
    const mean = fieldMean(field);
    const result = new Float64Array(field.length);
    result.fill(mean);
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Perfection Deficit ε_t
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the direct deviation D(Ψ, I) without closure or regularizer terms.
   *
   * [MATH] — D_direct = (1/N) Σ_i |Ψ_i - I_i|².
   *
   * @param field — Realized field Ψ.
   * @param idealField — Ideal smooth field I.
   * @returns Direct mean squared deviation.
   */
  computeDirectDeviation(field: Float64Array, idealField: Float64Array): Float64 {
    const n = Math.min(field.length, idealField.length);
    if (n === 0) return 0 as Float64;
    if (field.length === idealField.length && field.length % 2 === 0) {
      return meanSquaredDifferenceComplex(field, idealField);
    }
    return meanSquaredDifference(field, idealField);
  }

  /**
   * Compute the perfection deficit ε_t = D(Ψ_t, I_smooth).
   *
   * [PHIL] — ε_t is the ontological residue: the distance between the realized
   * state and the unattainable ideal. It is strictly positive for all existing
   * states and bounded above for stability.
   *
   * [MATH] — ε_t = (1/N) Σ_i |Ψ_t[i] - I[i]|² + ζ · (1 - Q_local)
   * where:
   *   - The first term is the direct deviation from the ideal smooth manifold.
   *   - ζ = closureCoupling (default φ⁻³) weights the closure deficit.
   *   - Q_local = angularCoherence(magnitudes) approximates local closure quality.
   *
   * The result is guaranteed strictly positive by adding a φ-scale micro-regularizer.
   *
   * @param field — Realized field Ψ_t.
   * @param idealField — Ideal smooth field I_smooth.
   * @returns Perfection deficit ε_t > 0.
   */
  computeEpsilon(field: Float64Array, idealField: Float64Array): Float64 {
    const directDeviation = this.computeDirectDeviation(field, idealField);
    const magnitudes = complexMagnitudes(field);
    const qLocal = angularCoherence(magnitudes.length > 0 ? magnitudes : field);
    const closureDeficit = (1.0 - qLocal) as Float64;
    const closureContribution = (this._config.closureCoupling * closureDeficit) as Float64;
    const epsilon = (directDeviation + closureContribution) as Float64;
    return (epsilon + this._config.regularizer) as Float64;
  }

  /**
   * Compute the perfection deficit with an externally supplied closure quality.
   *
   * [MATH] — ε = D_direct + ζ · (1 - Q_external).
   *
   * @param field — Realized field Ψ.
   * @param idealField — Ideal smooth field I.
   * @param closureQuality — External closure quality Q in [0, 1].
   * @returns Perfection deficit with external closure.
   */
  computeEpsilonWithClosure(
    field: Float64Array,
    idealField: Float64Array,
    closureQuality: Float64
  ): Float64 {
    const directDeviation = this.computeDirectDeviation(field, idealField);
    const clampedQ = closureQuality < 0.0 ? 0.0 : closureQuality > 1.0 ? 1.0 : closureQuality;
    const closureContribution = (this._config.closureCoupling * (1.0 - clampedQ)) as Float64;
    const epsilon = (directDeviation + closureContribution) as Float64;
    return (epsilon + this._config.regularizer) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Corner Defect & Geometric Imperfection
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the corner defect: Laplacian deviation from smoothness.
   *
   * [PHIL] — A corner is a geometric defect where the surface is not smooth.
   * The ideal sphere has no corners. Any realized structure has corners at finite
   * resolution. The corner defect measures this geometric imperfection.
   *
   * [MATH] — Corner_defect(Ψ_t) = Σ_i |∇²Ψ_t[i] - ∇²I_smooth[i]|².
   * Since I_smooth is uniform, ∇²I_smooth = 0. We approximate the Laplacian via
   * the spectral energy of the non-isotropic (l>0) spherical harmonic modes.
   *
   * @param field — Realized field Ψ_t.
   * @param idealField — Ideal smooth field I_smooth (used for sizing).
   * @returns Corner defect > 0 for any non-ideal state.
   */
  computeCornerDefect(field: Float64Array, idealField: Float64Array): Float64 {
    const count = Math.min(field.length, idealField.length);
    if (count === 0) return 0 as Float64;
    const points = fibonacciSpherePoints(count);
    const deviation = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      deviation[i] = ((field[i] ?? 0) - (idealField[i] ?? 0)) as Float64;
    }
    const laplacianEnergy = spectralLaplacianEnergy(deviation, points, this._config.lmax);
    return (laplacianEnergy + this._config.regularizer) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Convergence & Continuity Tracking
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the finite-difference derivative ∂ε/∂t.
   *
   * [MATH] — ∂ε/∂t ≈ (ε_t - ε_{t-1}) / (t - t_{prev}).
   * If no previous value exists, derivative is 0.
   *
   * @param epsilon — Current ε_t.
   * @param tick — Current tick index.
   * @returns Derivative ∂ε/∂t.
   */
  computeDerivative(epsilon: Float64, tick: number): Float64 {
    if (this._previousTick < 0 || tick === this._previousTick) {
      return 0 as Float64;
    }
    const dt = tick - this._previousTick;
    return ((epsilon - this._previousEpsilon) / dt) as Float64;
  }

  /**
   * Compute the continuity score derived from perfection deficit stability.
   *
   * [MATH] — Continuity_t = (1 - |ε_t - ε_{t-1}| / (ε_t + ε_{t-1} + ε_reg)).
   * Rapid swings in ε indicate loss of continuity. Score is clamped to [0, 1].
   *
   * @param epsilon — Current ε_t.
   * @returns Continuity score in [0, 1].
   */
  computeContinuity(epsilon: Float64): Float64 {
    if (this._previousTick < 0) {
      return 1.0 as Float64;
    }
    const num = Math.abs(epsilon - this._previousEpsilon);
    const den = epsilon + this._previousEpsilon + this._config.regularizer;
    let stability = 1.0 - num / den;
    if (stability < 0.0) stability = 0.0;
    if (stability > 1.0) stability = 1.0;
    return stability as Float64;
  }

  /**
   * Evaluate boundedness: ε_t < ε_max.
   *
   * [PHIL] — The deficit must be bounded above; otherwise the system cannot
   * manage the residual and collapses into instability.
   */
  isBounded(epsilon: Float64): boolean {
    return epsilon < this._config.epsilonMax;
  }

  /**
   * Evaluate positivity: ε_t > 0.
   *
   * [PHIL] — Strict positivity is the existence condition. If ε_t were exactly
   * zero, the state would be indistinguishable from nothing (perfect closure).
   */
  isPositive(epsilon: Float64): boolean {
    return epsilon > 0.0;
  }

  /**
   * Evaluate convergence: ∂ε/∂t < 0.
   *
   * [PHIL] — Convergence toward the ideal means the system is recursively
   * refining itself. Divergence (∂ε/∂t > 0) signals instability.
   */
  isConverging(derivative: Float64): boolean {
    return derivative < 0.0;
  }

  /**
   * Compute a normalized convergence score in [0, 1].
   *
   * [MATH] — Score = 1 / (1 + |∂ε/∂t| + ε_reg).
   * 1 = perfectly converging (derivative 0), 0 = strongly diverging.
   *
   * @param derivative — Finite-difference derivative ∂ε/∂t.
   * @returns Normalized convergence score.
   */
  convergenceScore(derivative: Float64): Float64 {
    const score = 1.0 / (1.0 + Math.abs(derivative) + this._config.regularizer);
    return (score > 1.0 ? 1.0 : score) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Full Update Cycle
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Perform a complete perfection deficit evaluation for a field at a given tick.
   *
   * [PHIL] — Each tick, the field measures its own distance from the ideal.
   * This self-measurement is not a moral judgment but an ontological necessity:
   * to exist is to be incomplete, and to be incomplete is to have a reason to
   * continue.
   *
   * [MATH] — Computes ε_t, corner defect, derivative, continuity, and all
   * boolean existence/stability conditions in a single deterministic pass.
   *
   * @param field — Realized field state Ψ_t.
   * @param tick — Current deterministic tick index.
   * @param isComplex — Whether the field is interleaved complex [Re, Im].
   * @returns Complete perfection deficit result.
   */
  update(field: Float64Array, tick: number, isComplex: boolean = false): PerfectionDeficitResult {
    const idealField = isComplex
      ? this.computeIdealSmoothComplexField(field)
      : this.computeIdealSmoothField(field);

    const epsilon = this.computeEpsilon(field, idealField);
    const cornerDefect = this.computeCornerDefect(field, idealField);
    const derivative = this.computeDerivative(epsilon, tick);
    const continuity = this.computeContinuity(epsilon);

    this._history.set(tick, epsilon);
    this._previousEpsilon = epsilon;
    this._previousTick = tick;

    const bounded = this.isBounded(epsilon);
    const positive = this.isPositive(epsilon);
    const converging = this.isConverging(derivative);

    const magnitudes = complexMagnitudes(field);
    const qLocal = angularCoherence(magnitudes.length > 0 ? magnitudes : field);
    const closureContribution = (this._config.closureCoupling * (1.0 - qLocal)) as Float64;

    return {
      epsilon,
      idealField,
      cornerDefect,
      closureContribution,
      isPositive: positive,
      isBounded: bounded,
      isConverging: converging,
      derivative,
      continuity,
      tick,
    } as PerfectionDeficitResult;
  }

  /**
   * Retrieve the historical ε value for a given tick.
   */
  getHistory(tick: number): Float64 | undefined {
    return this._history.get(tick);
  }

  /**
   * Compute the asymptotic trend of ε over the full recorded history.
   *
   * [MATH] — Linear regression slope on (tick, ε) pairs:
   *   slope = Cov(t, ε) / Var(t).
   * A negative slope indicates asymptotic approach to the ideal (ε → 0).
   */
  asymptoticTrend(): Float64 {
    const entries = Array.from(this._history.entries());
    if (entries.length < 2) return 0 as Float64;
    let sumT = 0.0;
    let sumE = 0.0;
    let sumTE = 0.0;
    let sumT2 = 0.0;
    const n = entries.length;
    for (let i = 0; i < n; i++) {
      const [t, e] = at(entries, i);
      sumT += t;
      sumE += e;
      sumTE += t * e;
      sumT2 += t * t;
    }
    const meanT = sumT / n;
    const meanE = sumE / n;
    const cov = (sumTE / n) - (meanT * meanE);
    const varT = (sumT2 / n) - (meanT * meanT);
    if (varT === 0.0) return 0 as Float64;
    return (cov / varT) as Float64;
  }

  /**
   * Reset all history and previous state.
   */
  reset(): void {
    this._history.clear();
    this._previousTick = -1;
    this._previousEpsilon = 0 as Float64;
  }

  /**
   * Evaluate the existence condition for a given state of perfection deficit.
   *
   * [PHIL] — Existence persists iff the deficit is strictly positive and bounded.
   * If ε_t = 0, the state is indistinguishable from nothing (perfect closure).
   * If ε_t > ε_max, the residual is too large to manage and the system collapses.
   *
   * [MATH] — Existence iff (ε_t > 0) ∧ (ε_t < ε_max).
   */
  existenceCondition(epsilon: Float64): boolean {
    return this.isPositive(epsilon) && this.isBounded(epsilon);
  }

  /**
   * Evaluate the time-generation condition.
   *
   * [PHIL] — Time advances only when there is a nonzero discrepancy to manage
   * and the continuity constraints remain satisfied. If ε_t were zero, there
   * would be no reason to update; if ε_t were unbounded, the update would be
   * catastrophic.
   *
   * [MATH] — t → t+1 iff (ε_t > 0) ∧ (ε_t < ε_max) ∧ (continuity > 0).
   */
  timeGenerationCondition(epsilon: Float64, continuity: Float64): boolean {
    return this.isPositive(epsilon) && this.isBounded(epsilon) && continuity > 0.0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Standalone Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the perfection deficit for a field without maintaining history.
 *
 * [MATH] — ε = D(Ψ, I_smooth) + ζ·(1 - Q_local).
 *
 * @param field — Realized field Ψ.
 * @param isComplex — Whether the field is interleaved complex.
 * @returns The perfection deficit ε > 0.
 */
export function computePerfectionDeficit(field: Float64Array, isComplex: boolean = false): Float64 {
  const pd = new PerfectionDeficit();
  const result = pd.update(field, 0, isComplex);
  return result.epsilon;
}

/**
 * Compute the ideal smooth closure field for a field without maintaining history.
 *
 * @param field — Realized field Ψ.
 * @param isComplex — Whether the field is interleaved complex.
 * @returns Ideal smooth field I_smooth.
 */
export function computeIdealSmoothField(field: Float64Array, isComplex: boolean = false): Float64Array {
  const pd = new PerfectionDeficit();
  return isComplex ? pd.computeIdealSmoothComplexField(field) : pd.computeIdealSmoothField(field);
}

/**
 * Compute the corner defect for a field without maintaining history.
 *
 * [MATH] — Corner_defect = Σ_i |∇²Ψ_i - ∇²I_i|².
 *
 * @param field — Realized field Ψ.
 * @param isComplex — Whether the field is interleaved complex.
 * @returns Corner defect > 0.
 */
export function computeCornerDefect(field: Float64Array, isComplex: boolean = false): Float64 {
  const pd = new PerfectionDeficit();
  const ideal = isComplex ? pd.computeIdealSmoothComplexField(field) : pd.computeIdealSmoothField(field);
  return pd.computeCornerDefect(field, ideal);
}

/**
 * Compute the convergence score for a sequence of epsilon values.
 *
 * [MATH] — Score = 1 / (1 + |slope| + ε_reg) where slope is the linear regression
 * slope of the sequence. A higher score indicates stronger convergence.
 *
 * @param epsilons — Sequence of perfection deficit values.
 * @returns Normalized convergence score in [0, 1].
 */
export function computeConvergenceScore(epsilons: readonly Float64[]): Float64 {
  const n = epsilons.length;
  if (n < 2) return 1.0 as Float64;
  let sumX = 0.0;
  let sumY = 0.0;
  let sumXY = 0.0;
  let sumX2 = 0.0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = epsilons[i] ?? 0;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const cov = (sumXY / n) - (meanX * meanY);
  const varX = (sumX2 / n) - (meanX * meanX);
  if (varX === 0.0) return 1.0 as Float64;
  const slope = Math.abs(cov / varX);
  const reg = 0.0344418537486347 as Float64; // φ⁻⁸
  const score = 1.0 / (1.0 + slope + reg);
  return (score > 1.0 ? 1.0 : score) as Float64;
}

/**
 * Compute the continuity score between two successive epsilon values.
 *
 * [MATH] — C = 1 - |ε₂ - ε₁| / (ε₂ + ε₁ + ε_reg).
 *
 * @param epsilonPrev — Previous ε_{t-1}.
 * @param epsilonCurr — Current ε_t.
 * @returns Continuity score in [0, 1].
 */
export function computeContinuityScore(epsilonPrev: Float64, epsilonCurr: Float64): Float64 {
  const reg = 0.0344418537486347 as Float64; // φ⁻⁸
  const num = Math.abs(epsilonCurr - epsilonPrev);
  const den = epsilonCurr + epsilonPrev + reg;
  let c = 1.0 - num / den;
  if (c < 0.0) c = 0.0;
  if (c > 1.0) c = 1.0;
  return c as Float64;
}
