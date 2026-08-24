/**
 * RHUFT v13 — GeometricReflection: Chapter 9 — Curvature-Induced Reflection & Directional Projection
 *
 * Implements geometric reflection with curvature-induced return, directional
 * projection filters, and multiscale reflection stabilization.
 *
 * [PHIL] — Geometric reflection is not boundary blending. It is the curvature-induced
 * return of the field to itself: the field encounters its own geometric structure
 * (curvature, anisotropy, closure deficit) and returns transformed by that encounter.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values IEEE-754 Float64. Strictly deterministic. Scale-invariant via φ.
 */

import {
  PHI, PHI_INV, PHI_NEG2, PHI_NEG3, PI, TWO_PI,
} from "./core/constants.ts";

import {
  fibonacciSpherePoints, sphericalHarmonicProjection,
  angularCoherence, sphericalDrift, complexMagnitudes,
} from "./sphere_geometry.ts";

import {
  toroidalShift, averageToroidalCoherence,
  phaseDriftMetric, delayedFeedback,
} from "./torus_recurrence.ts";
import { at } from "./core/indexing.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

/** Geometric field — interleaved complex [Re₀, Im₀, ...]. [SPEC] */
export type GeometricField = Float64Array;

/** Directional filter configuration. [SPEC] */
export interface DirectionalFilterConfig {
  /** Weight w_d in projection sum. [MATH] */
  readonly weight: Float64;
  /** Filter type — geometric extraction operator F_d. [SPEC] */
  readonly type: "spherical" | "toroidal" | "scale_relative" | "complementary";
  /** Primary parameter (shift delta, scale index, lmax). [SPEC] */
  readonly parameter: number;
  /** Secondary parameter for dual-parameter filters. [SPEC] */
  readonly parameter2: number;
}

/** Curvature parameters for G_geom[Y]. [MATH] */
export interface CurvatureParams {
  /** Max spherical harmonic degree for curvature extraction. [SPEC] */
  readonly lmax: number;
  /** Fibonacci sphere point count for curvature sampling. [SPEC] */
  readonly sphereCount: number;
  /** Curvature coupling γ = 1/φ³ by default. [MATH] */
  readonly curvatureCoupling: Float64;
}

/** Result of a complete geometric reflection cycle. [SPEC] */
export interface GeometricReflectionResult {
  /** Reflected field R_geom[Y; E] = (1/φ)·Y + (1/φ²)·E + (1/φ³)·G_geom[Y]. [MATH] */
  readonly reflectedField: GeometricField;
  /** Curvature-induced return G_geom[Y]. [MATH] */
  readonly curvatureReturn: GeometricField;
  /** Boundary blend (1/φ²)·E. [MATH] */
  readonly boundaryBlend: GeometricField;
  /** Directional projection P_dir[Ψ] = Σ_d w_d · F_d[Ψ]. [MATH] */
  readonly directionalProjection: GeometricField;
  /** Spherical coherence of reflected field. [SPEC] */
  readonly sphericalCoherence: Float64;
  /** Toroidal coherence of reflected field. [SPEC] */
  readonly toroidalCoherence: Float64;
  /** Phase drift between input and reflected field. [SPEC] */
  readonly reflectionPhaseDrift: Float64;
  /** Curvature magnitude |G_geom| averaged. [MATH] */
  readonly curvatureMagnitude: Float64;
  /** Reflection stabilization score. [SPEC] */
  readonly stabilizationScore: Float64;
}

/** Internal reflection history for temporal curvature. [SPEC] */
interface ReflectionHistory {
  previousField: GeometricField | null;
  previousReflection: GeometricField | null;
  tickCount: number;
}

// ───────────────────────────────────────────────────────────────────────────────
// 1. Curvature-Induced Return G_geom[Y]
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Compute curvature-induced geometric return G_geom[Y].
 * [MATH] — Projects field onto spherical harmonics, extracts l≥2 curvature
 * components, and reconstructs a curvature field weighted by φ^(-l).
 * [PHIL] — The field's shape pushes back; curvature is geometric pressure.
 */
export function computeCurvatureInducedReturn(
  field: GeometricField, params: CurvatureParams
): GeometricField {
  const len = field.length;
  if (len === 0) return new Float64Array(0);
  const magnitudes = complexMagnitudes(field);
  const n = magnitudes.length;
  const points = fibonacciSpherePoints(params.sphereCount);
  let sampled = magnitudes;
  if (n !== params.sphereCount) {
    sampled = new Float64Array(params.sphereCount);
    for (let i = 0; i < params.sphereCount; i++)
      sampled[i] = magnitudes[Math.min(Math.floor((i * n) / params.sphereCount), n - 1)] ?? 0;
  }
  const coeffs = sphericalHarmonicProjection(sampled, points, params.lmax);
  const cField = new Float64Array(params.sphereCount);
  let idx = 0;
  for (let l = 0; l <= params.lmax; l++) {
    for (let m = -l; m <= l; m++) {
      if (l >= 2) {
        const w = Math.pow(PHI_INV, l - 2);
        const c = coeffs[idx] ?? 0;
        for (let i = 0; i < params.sphereCount; i++)
          cField[i] = at(cField, i) + (c * _shCurvature(l, m, at(points, 3*i), at(points, 3*i+1), at(points, 3*i+2)) * w) as Float64;
      }
      idx++;
    }
  }
  const result = new Float64Array(len);
  for (let i = 0; i < len / 2; i++) {
    const cv = cField[Math.min(Math.floor((i * params.sphereCount) / (len / 2)), params.sphereCount - 1)] ?? 0;
    result[2*i] = (params.curvatureCoupling * cv) as Float64;
    result[2*i+1] = (params.curvatureCoupling * cv * PHI_INV) as Float64;
  }
  return result;
}

/** Real spherical harmonics Y_l^m for l=2,3 (curvature reconstruction). [MATH] */
function _shCurvature(l: number, m: number, x: Float64, y: Float64, z: Float64): Float64 {
  if (l === 2) {
    const c2 = Math.sqrt(15/(4*PI)) as Float64, c20 = Math.sqrt(5/(16*PI)) as Float64;
    if (m === -2) return (c2*x*y) as Float64;
    if (m === -1) return (c2*y*z) as Float64;
    if (m === 0) return (c20*(3*z*z-1)) as Float64;
    if (m === 1) return (c2*x*z) as Float64;
    if (m === 2) return (c2*0.5*(x*x-y*y)) as Float64;
  }
  if (l === 3) {
    const c3 = Math.sqrt(21/(32*PI)) as Float64, c30 = Math.sqrt(7/(16*PI)) as Float64;
    if (m === -3) return (c3*Math.sqrt(15)*y*(3*x*x-y*y)) as Float64;
    if (m === -2) return (c3*Math.sqrt(15)*2*x*y*z) as Float64;
    if (m === -1) return (c3*Math.sqrt(3)*y*(5*z*z-1)) as Float64;
    if (m === 0) return (c30*z*(5*z*z-3)) as Float64;
    if (m === 1) return (c3*Math.sqrt(3)*x*(5*z*z-1)) as Float64;
    if (m === 2) return (c3*Math.sqrt(15)*z*(x*x-y*y)) as Float64;
    if (m === 3) return (c3*Math.sqrt(15)*x*(x*x-3*y*y)) as Float64;
  }
  return 0 as Float64;
}

/** Curvature magnitude |G_geom| = mean absolute value. [MATH] */
export function computeCurvatureMagnitude(curvatureField: GeometricField): Float64 {
  const n = curvatureField.length;
  if (n === 0) return 0 as Float64;
  let s = 0.0;
  for (let i = 0; i < n; i++) s += Math.abs(curvatureField[i] ?? 0);
  return (s / n) as Float64;
}

// ───────────────────────────────────────────────────────────────────────────────
// 2. Directional Projection P_dir[Ψ] = Σ_d w_d · F_d[Ψ]
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Apply a directional filter F_d to field Ψ.
 * [PHIL] — Self-measurement is not isotropic; each direction reveals a different
 * aspect of the field's identity: spherical symmetry, toroidal recurrence,
 * scale nesting, complementary polarity.
 */
export function directionalFilter(field: GeometricField, filter: DirectionalFilterConfig): GeometricField {
  const len = field.length;
  if (len === 0) return new Float64Array(0);
  const result = new Float64Array(len), pairs = Math.floor(len/2);
  switch (filter.type) {
    case "spherical": {
      const points = fibonacciSpherePoints(filter.parameter);
      const coh = angularCoherence(complexMagnitudes(field));
      let mr = 0.0, mi = 0.0;
      for (let i = 0; i < pairs; i++) { mr += field[2*i] ?? 0; mi += field[2*i+1] ?? 0; }
      mr /= pairs; mi /= pairs;
      for (let i = 0; i < pairs; i++) {
        result[2*i] = (coh*mr + (1-coh)*(field[2*i] ?? 0)) as Float64;
        result[2*i+1] = (coh*mi + (1-coh)*(field[2*i+1] ?? 0)) as Float64;
      }
      break;
    }
    case "toroidal": {
      const shifted = toroidalShift(field, filter.parameter, filter.parameter2);
      for (let i = 0; i < pairs; i++) {
        const re = field[2*i] ?? 0, im = field[2*i+1] ?? 0;
        const sr = shifted[2*i] ?? 0, si = shifted[2*i+1] ?? 0;
        result[2*i] = (re*sr - im*si) as Float64;
        result[2*i+1] = (re*si + im*sr) as Float64;
      }
      break;
    }
    case "scale_relative": {
      const order = Math.max(1, filter.parameter);
      for (let i = 0; i < pairs; i++) {
        const prev = Math.max(0, i-order), next = Math.min(pairs-1, i+order);
        result[2*i] = ((field[2*next]??0)-(field[2*prev]??0))/(2*order) as Float64;
        result[2*i+1] = ((field[2*next+1]??0)-(field[2*prev+1]??0))/(2*order) as Float64;
      }
      break;
    }
    case "complementary": {
      for (let i = 0; i < pairs; i++) {
        const re = field[2*i] ?? 0, im = field[2*i+1] ?? 0;
        if (filter.parameter === 0) { result[2*i] = (-re) as Float64; result[2*i+1] = im as Float64; }
        else if (filter.parameter === 1) { result[2*i] = re as Float64; result[2*i+1] = (-im) as Float64; }
        else { result[2*i] = (-im) as Float64; result[2*i+1] = (-re) as Float64; }
      }
      break;
    }
  }
  return result;
}

/**
 * Compute directional projection P_dir[Ψ] = Σ_d w_d · F_d[Ψ].
 * [MATH] — Weighted sum of directional filters, normalized to sum 1.0.
 * Replaces the simplified identity projection in the self-measurement cycle.
 */
export function computeDirectionalProjection(
  field: GeometricField, filters: readonly DirectionalFilterConfig[]
): GeometricField {
  const len = field.length;
  if (len === 0) return new Float64Array(0);
  if (filters.length === 0) return new Float64Array(field);
  let tw = 0.0;
  for (const f of filters) tw += f.weight;
  const norm = tw > 1e-300 ? tw : 1.0;
  const result = new Float64Array(len);
  for (const f of filters) {
    const filtered = directionalFilter(field, f), w = f.weight / norm;
    for (let i = 0; i < len; i++) result[i] = at(result, i) + (w * (filtered[i] ?? 0)) as Float64;
  }
  return result;
}

// ───────────────────────────────────────────────────────────────────────────────
// 3. Geometric Reflection R_geom[Y; E] = (1/φ)·Y + (1/φ²)·E + (1/φ³)·G_geom[Y]
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Compute full geometric reflection R_geom[Y; E].
 * [MATH] — R = (1/φ)·Y + (1/φ²)·E + (1/φ³)·G_geom[Y].
 * Weights strictly φ-scale proportional for scale-invariance.
 * [PHIL] — Reflection is not mirror duplication; it is geometrically informed correction.
 */
export function computeGeometricReflection(
  projected: GeometricField, boundary: GeometricField | null, curvature: GeometricField
): GeometricField {
  const len = projected.length;
  if (len === 0) return new Float64Array(0);
  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const y = projected[i] ?? 0;
    const e = boundary !== null && boundary.length === len ? (boundary[i] ?? 0) : 0.0;
    const g = curvature[i] ?? 0;
    result[i] = (PHI_INV*y + PHI_NEG2*e + PHI_NEG3*g) as Float64;
  }
  return result;
}

/**
 * Reflection gain: how much reflection corrects the field.
 * [MATH] — Gain = 1 - |R - E|² / |Ψ|². Positive = convergence.
 */
export function computeReflectionGain(
  field: GeometricField, reflected: GeometricField, boundary: GeometricField | null
): Float64 {
  const len = field.length;
  if (len === 0 || reflected.length !== len) return 0 as Float64;
  let fn = 0.0, dn = 0.0;
  const t = boundary !== null && boundary.length === len ? boundary : new Float64Array(len);
  for (let i = 0; i < len; i++) {
    fn += (field[i]??0)*(field[i]??0);
    const d = (reflected[i]??0) - (t[i]??0);
    dn += d*d;
  }
  if (fn === 0) return 0 as Float64;
  return (1.0 - dn/fn) as Float64;
}

// ───────────────────────────────────────────────────────────────────────────────
// 4. GeometricReflection Class — Stateful Reflection Engine
// ───────────────────────────────────────────────────────────────────────────────

/**
 * GeometricReflection engine — computes curvature-induced reflection,
 * directional projection, and reflection stabilization over time.
 * [PHIL] — The field's geometric self-awareness. Holds memory of previous
 * reflections to compute temporal curvature: the field's awareness of its own becoming.
 */
export class GeometricReflection {
  private readonly _curvatureParams: CurvatureParams;
  private readonly _directionalFilters: readonly DirectionalFilterConfig[];
  private readonly _history: ReflectionHistory;

  constructor(
    curvatureParams: CurvatureParams = { lmax: 3, sphereCount: 21, curvatureCoupling: PHI_NEG3 },
    directionalFilters: readonly DirectionalFilterConfig[] | null = null
  ) {
    this._curvatureParams = curvatureParams;
    this._directionalFilters = directionalFilters ?? [
      { weight: PHI_INV as Float64, type: "spherical", parameter: 21, parameter2: 0 },
      { weight: PHI_NEG2 as Float64, type: "toroidal", parameter: 1, parameter2: 0 },
      { weight: PHI_NEG3 as Float64, type: "scale_relative", parameter: 1, parameter2: 0 },
      { weight: PHI_NEG3 as Float64, type: "complementary", parameter: 2, parameter2: 0 },
    ];
    this._history = { previousField: null, previousReflection: null, tickCount: 0 };
  }

  /**
   * Perform a complete geometric reflection cycle on the input field.
   * [MATH] — Full cycle: Y=P_dir[Ψ], G=G_geom[Y], R=(1/φ)·Y+(1/φ²)·E+(1/φ³)·G,
   * temporal stabilization, history update.
   */
  reflect(field: GeometricField, boundary: GeometricField | null = null): GeometricReflectionResult {
    const len = field.length;
    if (len === 0) {
      return {
        reflectedField: new Float64Array(0), curvatureReturn: new Float64Array(0),
        boundaryBlend: new Float64Array(0), directionalProjection: new Float64Array(0),
        sphericalCoherence: 0 as Float64, toroidalCoherence: 0 as Float64,
        reflectionPhaseDrift: 0 as Float64, curvatureMagnitude: 0 as Float64,
        stabilizationScore: 0 as Float64,
      };
    }
    const projected = computeDirectionalProjection(field, this._directionalFilters);
    const curvature = computeCurvatureInducedReturn(projected, this._curvatureParams);
    const boundaryBlend = new Float64Array(len);
    if (boundary !== null && boundary.length === len)
      for (let i = 0; i < len; i++) boundaryBlend[i] = (PHI_NEG2 * (boundary[i] ?? 0)) as Float64;
    const reflected = computeGeometricReflection(projected, boundary, curvature);
    let stabilized: GeometricField = reflected;
    let stabScore = 0 as Float64;
    if (this._history.previousReflection !== null && this._history.previousReflection.length === len) {
      const prev = this._history.previousReflection;
      const s = new Float64Array(len);
      for (let i = 0; i < len; i++)
        s[i] = (PHI_INV*(reflected[i]??0) + PHI_NEG2*(prev[i]??0)) as Float64;
      stabilized = s;
      stabScore = phaseDriftMetric(reflected, prev);
      stabScore = (1.0 - stabScore) as Float64;
      stabScore = (stabScore < 0 ? 0 : stabScore > 1 ? 1 : stabScore) as Float64;
    }
    const magnitudes = complexMagnitudes(stabilized);
    const result: GeometricReflectionResult = {
      reflectedField: stabilized, curvatureReturn: curvature, boundaryBlend,
      directionalProjection: projected,
      sphericalCoherence: angularCoherence(magnitudes),
      toroidalCoherence: averageToroidalCoherence(stabilized, 1, 1),
      reflectionPhaseDrift: phaseDriftMetric(field, stabilized),
      curvatureMagnitude: computeCurvatureMagnitude(curvature),
      stabilizationScore: stabScore,
    };
    this._history.previousField = new Float64Array(field);
    this._history.previousReflection = new Float64Array(stabilized);
    this._history.tickCount += 1;
    return result;
  }

  /**
   * Apply delayed toroidal feedback to reflected field.
   * [MATH] — Ψ_{t+1} = α·T[Ψ_t] + β·R[Ψ_{t-τ}].
   */
  applyDelayedFeedback(
    current: GeometricField, reflectedReflected: GeometricField,
    alpha: number = PHI_INV, beta: number = PHI_NEG2, delay: number = 0
  ): GeometricField {
    return delayedFeedback(current, reflectedReflected, alpha, beta, delay);
  }

  /** Compute temporal curvature: |G_geom[Ψ_t] - G_geom[Ψ_{t-1}]|². [MATH] */
  computeTemporalCurvature(field: GeometricField): Float64 {
    if (this._history.previousField === null || this._history.previousField.length !== field.length)
      return 0 as Float64;
    const cc = computeCurvatureInducedReturn(field, this._curvatureParams);
    const pc = computeCurvatureInducedReturn(this._history.previousField, this._curvatureParams);
    let d = 0.0;
    for (let i = 0; i < cc.length; i++) { const diff = (cc[i]??0)-(pc[i]??0); d += diff*diff; }
    return (d / cc.length) as Float64;
  }

  /** Get deterministic reflection history tick count. [SPEC] */
  getTickCount(): number { return this._history.tickCount; }

  /** Reset reflection history. [SPEC] */
  reset(): void {
    this._history.previousField = null;
    this._history.previousReflection = null;
    this._history.tickCount = 0;
  }

  getCurvatureParams(): CurvatureParams { return { ...this._curvatureParams }; }
  getDirectionalFilters(): readonly DirectionalFilterConfig[] { return [...this._directionalFilters]; }
}

// ───────────────────────────────────────────────────────────────────────────────
// 5. Utility & Integration Functions
// ───────────────────────────────────────────────────────────────────────────────

/** Create standard default directional filter bank. [SPEC] */
export function defaultDirectionalFilters(): DirectionalFilterConfig[] {
  return [
    { weight: PHI_INV as Float64, type: "spherical", parameter: 21, parameter2: 0 },
    { weight: PHI_NEG2 as Float64, type: "toroidal", parameter: 1, parameter2: 0 },
    { weight: PHI_NEG3 as Float64, type: "scale_relative", parameter: 1, parameter2: 0 },
    { weight: PHI_NEG3 as Float64, type: "complementary", parameter: 2, parameter2: 0 },
  ];
}

/** Blend boundary with curvature for direct use. [MATH] */
export function blendBoundaryWithCurvature(
  field: GeometricField, boundary: GeometricField | null, curvatureParams: CurvatureParams
): GeometricField {
  return computeGeometricReflection(field, boundary, computeCurvatureInducedReturn(field, curvatureParams));
}

/**
 * Multiscale reflection: apply reflection at multiple nested resolutions.
 * [MATH] — Ψ_reflected = Σ_s w_s · R_s[Ψ_s] with w_s = φ^(-s).
 * [PHIL] — The field is measured at all scales simultaneously.
 */
export function multiscaleReflection(
  field: GeometricField, scales: number[] = [1,2,3], boundary: GeometricField | null = null
): GeometricField {
  const len = field.length;
  if (len === 0) return new Float64Array(0);
  let tw = 0.0;
  const sum = new Float64Array(len);
  for (let s = 0; s < scales.length; s++) {
    const scale = at(scales, s), weight = Math.pow(PHI_INV, s);
    tw += weight;
    const stride = Math.max(1, scale);
    const sampledLen = Math.ceil(len / stride);
    const sampled = new Float64Array(sampledLen);
    for (let i = 0; i < sampledLen; i++) sampled[i] = field[i*stride] ?? 0;
    const params: CurvatureParams = {
      lmax: 2+s, sphereCount: 13*scale,
      curvatureCoupling: (PHI_NEG3 * Math.pow(PHI_INV, s)) as Float64,
    };
    let sb: GeometricField | null = null;
    if (boundary !== null && boundary.length === len) {
      sb = new Float64Array(sampledLen);
      for (let i = 0; i < sampledLen; i++) sb[i] = boundary[i*stride] ?? 0;
    }
    const reflected = blendBoundaryWithCurvature(sampled, sb, params);
    for (let i = 0; i < len; i++) {
      const idx = Math.floor(i / stride);
      sum[i] = at(sum, i) + (weight * (reflected[Math.min(idx, reflected.length-1)] ?? 0)) as Float64;
    }
  }
  if (tw > 1e-300) for (let i = 0; i < len; i++) sum[i] = (at(sum, i) / tw) as Float64;
  return sum;
}

/**
 * Reflection convergence score: how well reflection converges over time.
 * [MATH] — Convergence = 1 - |R_t - R_{t-1}|² / (|R_t|² + |R_{t-1}|² + ε).
 */
export function computeReflectionConvergence(
  currentReflection: GeometricField, previousReflection: GeometricField
): Float64 {
  const len = currentReflection.length;
  if (len === 0 || previousReflection.length !== len) return 0 as Float64;
  let dn = 0.0, sn = 0.0;
  for (let i = 0; i < len; i++) {
    const c = currentReflection[i] ?? 0, p = previousReflection[i] ?? 0, d = c-p;
    dn += d*d; sn += c*c + p*p;
  }
  const conv = 1.0 - dn/(sn + 1e-300);
  return (conv < 0 ? 0 : conv > 1 ? 1 : conv) as Float64;
}

/**
 * Verify that geometric reflection produces a stabilizing effect (Test T16).
 * [SPEC] — Systems with geometric reflection should stabilize faster.
 */
export function verifyGeometricReflectionStabilization(
  field: GeometricField, boundary: GeometricField, reflectionResult: GeometricReflectionResult
): { rawDrift: Float64; reflectedDrift: Float64; stabilizes: boolean } {
  const rawDrift = phaseDriftMetric(field, boundary);
  const reflectedDrift = phaseDriftMetric(reflectionResult.reflectedField, boundary);
  return { rawDrift, reflectedDrift, stabilizes: reflectedDrift < rawDrift };
}

// Epistemic re-exports for downstream consumers
// (CurvatureParams, DirectionalFilterConfig and GeometricReflectionResult are
// already exported at their interface declarations above; only the local
// Float64 alias needs re-exporting here.)
export type { Float64 };
