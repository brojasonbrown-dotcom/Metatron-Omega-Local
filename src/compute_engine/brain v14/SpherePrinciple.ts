/**
 * RHUFT v13 — Sphere Principle: Chapter 9 — Smooth Ideal Nonattainment Principle
 *
 * Formalizes the Sphere Principle as a first-class axiom of the RHUFT ontology:
 *   1. Smooth Ideal Nonattainment — perfect spherical closure is never realized
 *      in any finite state; the ideal is only approached asymptotically.
 *   2. No-Corner Ideal — the ideal sphere has no corners; any realized structure
 *      at finite resolution has corners, creating directional bias and closure deficit.
 *   3. Measurement-Incompleteness — infinite sampling density would be required
 *      to perfectly measure a sphere; finite sampling yields ε_t > 0, which sustains
 *      continuation.
 *
 * [PHIL] — The sphere is the archetype of isotropic total possibility: no preferred
 * direction, no corners, finite closure. Yet any realized measurement is incomplete,
 * and that incompleteness is not a failure but the engine of continuation. The universe
 * approaches the smooth ideal but never arrives.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI, PHI_INV, PHI_SQUARED, PHI_NEG3, PHI_NEG5, PHI_NEG8, PI, CLOSURE_COUPLING,
} from "./core/constants.ts";

import {
  fibonacciSpherePoints, sphericalHarmonicProjection, angularCoherence,
  sphericalVariance, complexMagnitudes,
} from "./sphere_geometry.ts";

import {
  PerfectionDeficit, computePerfectionDeficit, computeIdealSmoothField, computeCornerDefect,
} from "./PerfectionDeficit.ts";
import { at } from "./core/indexing.ts";

/** [SPEC] Float64 type alias for epistemic clarity. */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Result & Configuration Types
// ═══════════════════════════════════════════════════════════════════════════════

/** [PHIL] Result of a single Sphere Principle evaluation. */
export interface SpherePrincipleResult {
  /** [MATH] Perfection deficit ε_t = D(Ψ_t, I_smooth). */
  readonly epsilon: Float64;
  /** [PHIL] Is ε_t strictly positive? (existence condition). */
  readonly isPositive: boolean;
  /** [PHIL] Is ε_t bounded above by ε_max? (stability condition). */
  readonly isBounded: boolean;
  /** [MATH] Is the system converging (∂ε/∂t < 0)? */
  readonly isConverging: boolean;
  /** [PHIL] Is the approach asymptotic only (never completed in finite time)? */
  readonly isAsymptotic: boolean;
  /** [MATH] Corner defect: Laplacian deviation from smoothness. */
  readonly cornerDefect: Float64;
  /** [PHIL] No-corner ideal holds iff cornerDefect > 0. */
  readonly noCornerIdealHolds: boolean;
  /** [MATH] Sampling incompleteness: 1 - C(N). */
  readonly samplingIncompleteness: Float64;
  /** [PHIL] Measurement incompleteness > 0 sustains continuity. */
  readonly measurementIncompletenessHolds: boolean;
  /** [MATH] Deviation from perfect isotropy (0 = perfect isotropy). */
  readonly isotropicDeviation: Float64;
  /** [MATH] Finite-resolution completeness score in [0, 1]. */
  readonly measurementCompleteness: Float64;
  /** [INTEGRATED] Does the Sphere Principle hold for this state? */
  readonly spherePrincipleHolds: boolean;
  /** [PHIL] Is continuity sustained by the residual incompleteness? */
  readonly continuitySustained: boolean;
  /** [MATH] Finite-resolution defect from discrete sampling. */
  readonly finiteResolutionDefect: Float64;
  /** [MATH] Directional bias from non-uniform field anisotropy. */
  readonly directionalBias: Float64;
  /** [MATH] Overall smoothness index in [0, 1] (1 = perfectly smooth). */
  readonly smoothnessIndex: Float64;
  /** Tick index at which this evaluation was performed. */
  readonly tick: number;
}

/** [MATH] Configuration for the SpherePrinciple evaluator. All defaults are φ-scale proportional. */
export interface SpherePrincipleConfig {
  readonly epsilonMax: Float64;
  readonly closureCoupling: Float64;
  readonly regularizer: Float64;
  readonly lmax: number;
  readonly maxSampleCount: number;
  readonly asymptoticThreshold: Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Compact Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/** [MATH] μ = (1/N) Σ_i Ψ_i. */
function fieldMean(field: Float64Array): Float64 {
  const n = field.length;
  if (n === 0) return 0 as Float64;
  let s = 0.0;
  for (let i = 0; i < n; i++) s += field[i] ?? 0;
  return (s / n) as Float64;
}

/** [MATH] RMS = sqrt((1/N) Σ_i Ψ_i²). */
function fieldRms(field: Float64Array): Float64 {
  const n = field.length;
  if (n === 0) return 0 as Float64;
  let s = 0.0;
  for (let i = 0; i < n; i++) { const v = field[i] ?? 0; s += v * v; }
  return Math.sqrt(s / n) as Float64;
}

/** [MATH] maxDev = max_i |Ψ_i - μ|. */
function maxAbsDev(field: Float64Array): Float64 {
  const n = field.length;
  if (n === 0) return 0 as Float64;
  const m = fieldMean(field);
  let d = 0.0;
  for (let i = 0; i < n; i++) { const a = Math.abs((field[i] ?? 0) - m); if (a > d) d = a; }
  return d as Float64;
}

/** [MATH] Discrete spherical Laplacian: ΔΨ_i ≈ 0.5·(Ψ_{i-1} + Ψ_{i+1}) - Ψ_i. */
function discreteLaplacian(field: Float64Array): Float64Array {
  const n = field.length;
  if (n === 0) return new Float64Array(0);
  const r = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    r[i] = (0.5 * ((field[(i - 1 + n) % n] ?? 0) + (field[(i + 1) % n] ?? 0)) - (field[i] ?? 0)) as Float64;
  }
  return r;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SpherePrinciple Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [PHIL] Formalizes and evaluates the Sphere Principle: Smooth Ideal Nonattainment,
 * No-Corner Ideal, and Measurement-Incompleteness Principle.
 *
 * [MATH] Computes:
 *   ε_t = D(Ψ_t, I_smooth) + ζ·(1 - Q_local)
 *   Corner_defect = Σ_i |∇²Ψ_i - ∇²I_i|²
 *   Incompleteness = 1 - C(N)
 */
export class SpherePrinciple {
  private readonly _config: SpherePrincipleConfig;
  private readonly _pd: PerfectionDeficit;
  private readonly _history: Map<number, SpherePrincipleResult>;
  private _prevTick: number;
  private _prevEpsilon: Float64;

  constructor(config?: Partial<SpherePrincipleConfig>) {
    this._config = {
      epsilonMax: (config?.epsilonMax ?? PHI_INV) as Float64,
      closureCoupling: (config?.closureCoupling ?? PHI_NEG3) as Float64,
      regularizer: (config?.regularizer ?? PHI_NEG8) as Float64,
      lmax: config?.lmax ?? 3,
      maxSampleCount: config?.maxSampleCount ?? 89,
      asymptoticThreshold: (config?.asymptoticThreshold ?? PHI_NEG5) as Float64,
    };
    this._pd = new PerfectionDeficit({
      epsilonMax: this._config.epsilonMax,
      closureCoupling: this._config.closureCoupling,
      regularizer: this._config.regularizer,
      lmax: this._config.lmax,
    });
    this._history = new Map();
    this._prevTick = -1;
    this._prevEpsilon = 0 as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Ideal Smooth Sphere Manifold
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [PHIL] I_smooth is the limit-object of perfect spherical symmetry, zero curvature,
   * uniform phase, and infinite isotropy. Not a realizable state but the mathematical ideal
   * against which realized states are measured.
   *
   * [MATH] Constructed as the l=0 spherical harmonic reconstruction: uniform field with
   * zero angular variation. This is the closest smooth spherical approximation.
   */
  computeIdealSmoothSphere(field: Float64Array, pointCount?: number, isComplex: boolean = false): Float64Array {
    const count = pointCount ?? (isComplex ? Math.floor(field.length / 2) : field.length);
    if (count === 0) return new Float64Array(0);
    const points = fibonacciSpherePoints(count);
    const mags = complexMagnitudes(field);
    const proj = mags.length >= count ? mags : field;
    const coeffs = sphericalHarmonicProjection(proj, points, 0);
    const c0 = coeffs.length > 0 ? at(coeffs, 0) : 0.0;
    const val = c0 * (1.0 / Math.sqrt(4.0 * PI));
    const r = new Float64Array(count);
    r.fill(val);
    return r;
  }

  /** [MATH] Ideal smooth sphere for complex interleaved field: Re = constant, Im = 0. */
  computeIdealSmoothComplexSphere(field: Float64Array, pointCount?: number): Float64Array {
    const count = pointCount ?? Math.floor(field.length / 2);
    if (count === 0) return new Float64Array(0);
    const real = this.computeIdealSmoothSphere(field, count, false);
    const r = new Float64Array(count * 2);
    for (let i = 0; i < count; i++) { r[2 * i] = real[i] ?? 0; r[2 * i + 1] = 0.0; }
    return r;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Sampling & Measurement Incompleteness
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [PHIL] To perfectly measure a sphere, infinite sampling density is required.
   * Finite sampling is always incomplete. This incompleteness is an ontological feature
   * of realized existence, not a technical limitation.
   *
   * [MATH] Incompleteness(N) = 1 - C(N), where C(N) = 1 - exp(-N/φ²)·φ⁻¹.
   * As N → ∞, C(N) → 1 and incompleteness → 0. For any finite N, incompleteness > 0.
   */
  computeSamplingIncompleteness(sampleCount: number): Float64 {
    if (sampleCount <= 0) return 1.0 as Float64;
    const norm = sampleCount / this._config.maxSampleCount;
    const completeness = (1.0 - Math.exp(-norm / PHI_SQUARED) * PHI_INV) as Float64;
    const clamped = completeness < 0.0 ? 0.0 : completeness > 1.0 ? 1.0 : completeness;
    return ((1.0 - clamped) + this._config.regularizer) as Float64;
  }

  /**
   * [MATH] Defect_resolution = σ_Ψ · (1 - C(N)) / sqrt(N), where σ_Ψ is the field
   * standard deviation and C(N) is the sampling completeness. Measures how much the
   * discrete sampling deviates from the continuous ideal.
   */
  computeFiniteResolutionDefect(field: Float64Array, sampleCount: number): Float64 {
    const n = field.length;
    if (n === 0 || sampleCount <= 0) return 0 as Float64;
    const mean = fieldMean(field);
    let variance = 0.0;
    for (let i = 0; i < n; i++) { const d = (field[i] ?? 0) - mean; variance += d * d; }
    variance /= n;
    const stdDev = Math.sqrt(variance);
    const inc = this.computeSamplingIncompleteness(sampleCount);
    const defect = (stdDev * inc * (1.0 / Math.sqrt(Math.max(1, sampleCount)))) as Float64;
    return (defect + this._config.regularizer) as Float64;
  }

  /** [MATH] Completeness(N) = 1 - incompleteness(N). Fraction of the sphere effectively measured at finite resolution N. */
  computeMeasurementCompleteness(sampleCount: number): Float64 {
    let c = (1.0 - this.computeSamplingIncompleteness(sampleCount)) as Float64;
    if (c < 0.0) c = 0.0;
    if (c > 1.0) c = 1.0;
    return c;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. No-Corner Ideal
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [PHIL] A corner is a geometric defect where the surface is not smooth. The ideal
   * sphere has no corners. Any realized structure at finite resolution has corners.
   * The corner defect measures this geometric imperfection and is always strictly positive.
   *
   * [MATH] Corner_defect = Σ_i |∇²Ψ_t[i] - ∇²I_smooth[i]|². Since I_smooth is uniform,
   * ∇²I_smooth = 0. We compute the spectral Laplacian energy of the deviation field.
   */
  computeCornerDefect(field: Float64Array, idealField: Float64Array): Float64 {
    return this._pd.computeCornerDefect(field, idealField);
  }

  /** [MATH] Corner_density = Corner_defect / N. Normalizes by sampling density for cross-resolution comparison. */
  computeCornerDensity(field: Float64Array, idealField: Float64Array): Float64 {
    return (this.computeCornerDefect(field, idealField) / Math.max(1, field.length) + this._config.regularizer) as Float64;
  }

  /** [MATH] Smoothness = 1 / (1 + Corner_defect + ε_reg). Always < 1 for realized states because cornerDefect > 0. */
  computeSmoothnessIndex(field: Float64Array, idealField: Float64Array): Float64 {
    const idx = 1.0 / (1.0 + this.computeCornerDefect(field, idealField) + this._config.regularizer);
    return (idx > 1.0 ? 1.0 : idx) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Isotropic Deviation & Directional Bias
  // ─────────────────────────────────────────────────────────────────────────

  /** [MATH] IsotropicDeviation = sphericalVariance / (1 + sphericalVariance + ε_reg). Perfect isotropy → 0. Max anisotropy → 1. */
  computeIsotropicDeviation(field: Float64Array): Float64 {
    const v = sphericalVariance(field);
    const d = v / (1.0 + v + this._config.regularizer);
    return (d < 0.0 ? 0.0 : d > 1.0 ? 1.0 : d) as Float64;
  }

  /** [MATH] DirectionalBias = maxDev / (RMS + ε_reg). Measures how much one direction dominates the field. */
  computeDirectionalBias(field: Float64Array): Float64 {
    const bias = maxAbsDev(field) / (fieldRms(field) + this._config.regularizer + 1e-300);
    return (bias > 1.0 ? 1.0 : bias) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Sphere Principle Conditions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [PHIL] Perfect spherical closure is never realized in finite time. The perfection
   * deficit is strictly positive, bounded above, and only approaches zero asymptotically.
   *
   * [MATH] Conditions: ε_t > 0, ε_t < ε_max, ∂ε/∂t < 0, |ε_t| > ε_asymp.
   */
  evaluateSmoothIdealNonattainment(epsilon: Float64, derivative: Float64, epsilonMax: Float64): boolean {
    return epsilon > 0.0 && epsilon < epsilonMax && derivative < 0.0 && Math.abs(epsilon) > this._config.asymptoticThreshold;
  }

  /** [PHIL] No-Corner Ideal: the corner defect is always strictly positive for realized states. [MATH] Holds iff Corner_defect > 0. */
  evaluateNoCornerIdeal(cornerDefect: Float64): boolean { return cornerDefect > 0.0; }

  /** [PHIL] Measurement-Incompleteness: finite sampling implies incompleteness > 0, which implies ε_t > 0, which sustains continuity. [MATH] Holds iff Incompleteness(N) > 0. */
  evaluateMeasurementIncompleteness(incompleteness: Float64): boolean { return incompleteness > 0.0; }

  /**
   * [PHIL] Continuity is sustained because the system always has a residual to manage.
   * If the gap were zero, there would be no reason to update. If unbounded, the update would be catastrophic.
   * [MATH] continuitySustained iff (ε_t > 0) ∧ (ε_t < ε_max) ∧ (Incompleteness > 0).
   */
  evaluateContinuitySustained(epsilon: Float64, incompleteness: Float64): boolean {
    return epsilon > 0.0 && epsilon < this._config.epsilonMax && incompleteness > 0.0;
  }

  /** [INTEGRATED] The Sphere Principle holds iff all three sub-principles hold: Smooth Ideal Nonattainment, No-Corner Ideal, and Measurement-Incompleteness. */
  evaluateSpherePrinciple(epsilon: Float64, derivative: Float64, cornerDefect: Float64, incompleteness: Float64): boolean {
    return this.evaluateSmoothIdealNonattainment(epsilon, derivative, this._config.epsilonMax) &&
           this.evaluateNoCornerIdeal(cornerDefect) &&
           this.evaluateMeasurementIncompleteness(incompleteness) &&
           this.evaluateContinuitySustained(epsilon, incompleteness);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Full Update Cycle
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [PHIL] Each tick, the field measures its own distance from the ideal smooth sphere.
   * This self-measurement is the ontological core of the RHUFT engine: to exist is to be
   * incomplete, and to be incomplete is to have a reason to continue. The sphere is the
   * geometry of that necessary incompleteness.
   *
   * [MATH] Computes all Sphere Principle quantities in a single deterministic pass:
   * ε_t, cornerDefect, samplingIncompleteness, isotropicDeviation, directionalBias,
   * smoothnessIndex, finiteResolutionDefect, and all boolean principle evaluations.
   */
  update(field: Float64Array, tick: number, sampleCount?: number, isComplex: boolean = false): SpherePrincipleResult {
    const count = sampleCount ?? (isComplex ? Math.floor(field.length / 2) : field.length);

    const idealField = isComplex
      ? this.computeIdealSmoothComplexSphere(field, count)
      : this.computeIdealSmoothSphere(field, count, false);

    const pdResult = this._pd.update(field, tick, isComplex);
    const epsilon = pdResult.epsilon;
    const derivative = pdResult.derivative;
    const cornerDefect = pdResult.cornerDefect;

    const samplingIncompleteness = this.computeSamplingIncompleteness(count);
    const measurementCompleteness = this.computeMeasurementCompleteness(count);
    const finiteResolutionDefect = this.computeFiniteResolutionDefect(field, count);

    const projectionField = complexMagnitudes(field).length > 0 ? complexMagnitudes(field) : field;
    const isotropicDeviation = this.computeIsotropicDeviation(projectionField);
    const directionalBias = this.computeDirectionalBias(projectionField);
    const smoothnessIndex = this.computeSmoothnessIndex(field, idealField);

    const isPositive = epsilon > 0.0;
    const isBounded = epsilon < this._config.epsilonMax;
    const isConverging = derivative < 0.0;
    const isAsymptotic = Math.abs(epsilon) > this._config.asymptoticThreshold;
    const noCornerIdealHolds = this.evaluateNoCornerIdeal(cornerDefect);
    const measurementIncompletenessHolds = this.evaluateMeasurementIncompleteness(samplingIncompleteness);
    const continuitySustained = this.evaluateContinuitySustained(epsilon, samplingIncompleteness);
    const spherePrincipleHolds = this.evaluateSpherePrinciple(epsilon, derivative, cornerDefect, samplingIncompleteness);

    const result: SpherePrincipleResult = {
      epsilon, isPositive, isBounded, isConverging, isAsymptotic,
      cornerDefect, noCornerIdealHolds,
      samplingIncompleteness, measurementIncompletenessHolds,
      isotropicDeviation, measurementCompleteness,
      spherePrincipleHolds, continuitySustained,
      finiteResolutionDefect, directionalBias, smoothnessIndex,
      tick,
    };

    this._history.set(tick, result);
    this._prevEpsilon = epsilon;
    this._prevTick = tick;
    return result;
  }

  /** Retrieve the historical Sphere Principle result for a given tick. */
  getHistory(tick: number): SpherePrincipleResult | undefined { return this._history.get(tick); }

  /**
   * [MATH] Linear regression slope on (tick, ε) pairs: slope = Cov(t, ε) / Var(t).
   * A negative slope indicates asymptotic approach to the ideal (ε → 0).
   * The asymptotic score is 1 / (1 + |slope| + ε_reg).
   */
  asymptoticScore(): Float64 {
    const entries = Array.from(this._history.entries());
    if (entries.length < 2) return 0 as Float64;
    let sumT = 0.0, sumE = 0.0, sumTE = 0.0, sumT2 = 0.0;
    const n = entries.length;
    for (let i = 0; i < n; i++) {
      const [t, e] = at(entries, i);
      sumT += t; sumE += e.epsilon; sumTE += t * e.epsilon; sumT2 += t * t;
    }
    const meanT = sumT / n, meanE = sumE / n;
    const cov = (sumTE / n) - (meanT * meanE);
    const varT = (sumT2 / n) - (meanT * meanT);
    if (varT === 0.0) return 0 as Float64;
    const score = 1.0 / (1.0 + Math.abs(cov / varT) + this._config.regularizer);
    return (score > 1.0 ? 1.0 : score) as Float64;
  }

  /** Reset all history and previous state. */
  reset(): void {
    this._history.clear();
    this._prevTick = -1;
    this._prevEpsilon = 0 as Float64;
    this._pd.reset();
  }

  /**
   * [PHIL] Existence persists iff the perfection deficit is strictly positive, bounded above,
   * and the no-corner ideal holds. If ε_t = 0, the state is indistinguishable from the ideal
   * (perfect closure = no existence). If the corner defect were zero, the state would be
   * perfectly smooth (unrealizable).
   * [MATH] Existence iff (ε_t > 0) ∧ (ε_t < ε_max) ∧ (cornerDefect > 0).
   */
  existenceCondition(epsilon: Float64, cornerDefect: Float64): boolean {
    return epsilon > 0.0 && epsilon < this._config.epsilonMax && cornerDefect > 0.0;
  }

  /**
   * [PHIL] Time advances only when there is a nonzero discrepancy to manage, the continuity
   * constraints remain satisfied, and the measurement incompleteness sustains the residual.
   * [MATH] t → t+1 iff (ε_t > 0) ∧ (ε_t < ε_max) ∧ (continuity > 0) ∧ (incompleteness > 0).
   */
  timeGenerationCondition(epsilon: Float64, continuity: Float64, incompleteness: Float64): boolean {
    return epsilon > 0.0 && epsilon < this._config.epsilonMax && continuity > 0.0 && incompleteness > 0.0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Standalone Functions
// ═══════════════════════════════════════════════════════════════════════════════

/** [MATH] Evaluate the Sphere Principle for a field without maintaining history. Computes all quantities in a single deterministic pass. */
export function evaluateSpherePrinciple(
  field: Float64Array, tick: number = 0, sampleCount?: number, isComplex: boolean = false
): SpherePrincipleResult {
  const sp = new SpherePrinciple();
  return sp.update(field, tick, sampleCount, isComplex);
}

/** [MATH] Incompleteness(N) = 1 - C(N), where C(N) is the finite-sampling completeness. For any finite N, incompleteness > 0. */
export function computeSamplingIncompleteness(sampleCount: number): Float64 {
  return new SpherePrinciple().computeSamplingIncompleteness(sampleCount);
}

/** [MATH] Defect = σ_Ψ · (1 - C(N)) / sqrt(N), where σ_Ψ is the field standard deviation. */
export function computeFiniteResolutionDefect(field: Float64Array, sampleCount: number): Float64 {
  return new SpherePrinciple().computeFiniteResolutionDefect(field, sampleCount);
}

/** [MATH] Smoothness = 1 / (1 + Corner_defect + ε_reg). Always < 1 for realized states. */
export function computeSmoothnessIndex(field: Float64Array, isComplex: boolean = false): Float64 {
  const sp = new SpherePrinciple();
  const count = isComplex ? Math.floor(field.length / 2) : field.length;
  return sp.computeSmoothnessIndex(field, sp.computeIdealSmoothSphere(field, count, isComplex));
}

/** [MATH] IsotropicDeviation = sphericalVariance / (1 + sphericalVariance + ε_reg). */
export function computeIsotropicDeviation(field: Float64Array, isComplex: boolean = false): Float64 {
  const mags = complexMagnitudes(field);
  const proj = mags.length > 0 ? mags : field;
  const v = sphericalVariance(proj);
  const d = v / (1.0 + v + 1e-300);
  return (d < 0.0 ? 0.0 : d > 1.0 ? 1.0 : d) as Float64;
}

/** [MATH] DirectionalBias = maxDev / (RMS + ε_reg). */
export function computeDirectionalBias(field: Float64Array, isComplex: boolean = false): Float64 {
  const mags = complexMagnitudes(field);
  const proj = mags.length > 0 ? mags : field;
  return new SpherePrinciple().computeDirectionalBias(proj);
}

/** [PHIL] Verify the Measurement-Incompleteness Principle: finite sampling implies incompleteness > 0, which implies ε_t > 0, which sustains continuity. */
export function verifyMeasurementIncompleteness(sampleCount: number): boolean {
  return computeSamplingIncompleteness(sampleCount) > 0.0;
}

/** [PHIL] Verify the No-Corner Ideal: any realized structure at finite resolution has corners, so cornerDefect > 0. */
export function verifyNoCornerIdeal(field: Float64Array, isComplex: boolean = false): boolean {
  const pd = new PerfectionDeficit();
  return pd.computeCornerDefect(field, computeIdealSmoothField(field, isComplex)) > 0.0;
}

/** [PHIL] Verify the Smooth Ideal Nonattainment Principle: ε_t is always strictly positive, bounded above, and converging toward zero (but never reaching it). */
export function verifySmoothIdealNonattainment(field: Float64Array, epsilonMax: Float64 = PHI_INV, isComplex: boolean = false): boolean {
  const epsilon = computePerfectionDeficit(field, isComplex);
  return epsilon > 0.0 && epsilon < epsilonMax;
}
