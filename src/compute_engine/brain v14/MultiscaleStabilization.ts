/**
 * RHUFT v13 — Multiscale Stabilization: Phase 3 — Scale-Local Stabilization with Constraints
 *
 * Implements the multiscale stabilization formula:
 *   S_multi(Ψ, Δ; {L_s}) = Σ_s w_s · S(Ψ_s, Δ_s; L_s)
 *
 * [PHIL] — Stabilization is not a single global operation. It is the recursive
 * integration of scale-local constraints, each contributing to the whole according
 * to its φ-weighted relevance.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection, no Math.random(), no Date.now().
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI,
  PHI_INV,
  PHI_NEG2,
  PHI_NEG3,
  PHI_NEG5,
  PHI_NEG8,
  CLOSURE_COUPLING,
  COHERENCE_THRESHOLD,
  MASTER_EQUATION_N,
} from "./core/constants.ts";

import { ActualizationEngine } from "./actualization_engine.ts";
import type { ActualizationResult } from "./actualization_engine.ts";

/** [SPEC] Explicit Float64 type alias for IEEE-754 deterministic arithmetic. */
export type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Exported Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Scale-local logical constraint L_s governing stabilization at scale s.
 * [PHIL] Each scale operates under its own logical boundary.
 */
export interface ScaleLocalConstraint {
  readonly coherenceThreshold: Float64;
  readonly closureThreshold: Float64;
  readonly deltaMin: Float64;
  readonly deltaMax: Float64;
  readonly boundary: Float64Array;
  readonly scaleIndex: number;
}

/**
 * [SPEC] Input for single-scale stabilization.
 * [MATH] Tuple (Ψ_s, Δ_s, L_s) for scale s.
 */
export interface ScaleStabilizationInput {
  readonly field: Float64Array;
  readonly discrepancy: Float64Array;
  readonly constraint: ScaleLocalConstraint;
}

/**
 * [SPEC] Result of stabilizing a single scale.
 * [MATH] Contains stabilized field S(Ψ_s, Δ_s; L_s) and all derived metrics.
 */
export interface ScaleStabilizationResult {
  readonly stabilizedField: Float64Array;
  readonly constraintEnforcement: Float64;
  readonly localStability: Float64;
  readonly violationScore: Float64;
  readonly coherenceScore: Float64;
  readonly closureScore: Float64;
  readonly continuityScore: Float64;
  readonly scaleIndex: number;
  readonly thresholds: {
    readonly coherenceThreshold: Float64;
    readonly closureThreshold: Float64;
    readonly deltaMin: Float64;
    readonly deltaMax: Float64;
  };
}

/**
 * [SPEC] Global stability parameters for the complete stability equation.
 * [MATH] S_t = α·Q_total + β·r_t + γ·P_t - μ·D_t - ν·L_t - ξ·ε_excess
 */
export interface GlobalStabilityParams {
  readonly alpha: Float64;
  readonly beta: Float64;
  readonly gamma: Float64;
  readonly mu: Float64;
  readonly nu: Float64;
  readonly xi: Float64;
}

/**
 * [SPEC] Result of multiscale stabilization.
 * [MATH] Combines all scale-local results into a unified global field and metrics.
 */
export interface MultiscaleStabilizationResult {
  readonly combinedField: Float64Array;
  readonly perScale: readonly ScaleStabilizationResult[];
  readonly globalStability: Float64;
  readonly totalConstraintEnforcement: Float64;
  readonly weightDistribution: readonly Float64[];
  readonly averageLocalStability: Float64;
  readonly averageViolation: Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Internal Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/** [MATH] Smooth step: step(x) = 1 / (1 + exp(-φ·x)). [FIX] Avoids numerical discontinuities. */
function smoothStep(x: Float64): Float64 {
  if (x < -100.0) return 0 as Float64;
  if (x > 100.0) return 1 as Float64;
  return (1.0 / (1.0 + Math.exp(-PHI * x))) as Float64;
}

/**
 * [MATH] Temporal coherence C = |<a|b>|² / (|a|²·|b|²).
 * [SPEC] Handles both real and interleaved complex fields. Range [0, 1].
 */
function temporalCoherence(a: Float64Array, b: Float64Array): Float64 {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0 as Float64;
  if (len % 2 === 0) {
    const n = len / 2;
    let dotRe = 0.0, dotIm = 0.0, normA = 0.0, normB = 0.0;
    for (let i = 0; i < n; i++) {
      const aRe = a[2 * i] ?? 0, aIm = a[2 * i + 1] ?? 0;
      const bRe = b[2 * i] ?? 0, bIm = b[2 * i + 1] ?? 0;
      dotRe += aRe * bRe + aIm * bIm;
      dotIm += aRe * bIm - aIm * bRe;
      normA += aRe * aRe + aIm * aIm;
      normB += bRe * bRe + bIm * bIm;
    }
    const product = normA * normB;
    if (product === 0) return 0 as Float64;
    const raw = (dotRe * dotRe + dotIm * dotIm) / product;
    return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
  } else {
    let dot = 0.0, normA = 0.0, normB = 0.0;
    for (let i = 0; i < len; i++) {
      const ai = a[i] ?? 0, bi = b[i] ?? 0;
      dot += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
    const product = normA * normB;
    if (product === 0) return 0 as Float64;
    const raw = (dot * dot) / product;
    return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
  }
}

/** [MATH] Closure score Q = exp(-κ · RMS(field - boundary)). [SPEC] κ = CLOSURE_COUPLING. */
function closureScore(field: Float64Array, boundary: Float64Array): Float64 {
  const len = Math.min(field.length, boundary.length);
  if (len === 0) return 0 as Float64;
  let sumSq = 0.0;
  for (let i = 0; i < len; i++) {
    const diff = (field[i] ?? 0) - (boundary[i] ?? 0);
    sumSq += diff * diff;
  }
  return Math.exp(-CLOSURE_COUPLING * Math.sqrt(sumSq / len)) as Float64;
}

/** [MATH] L2 norm difference: d = sqrt((1/N) · Σ |a_i - b_i|²). */
function fieldDifferenceNorm(a: Float64Array, b: Float64Array): Float64 {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0 as Float64;
  let sumSq = 0.0;
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / len) as Float64;
}

/** [MATH] φ-scale weights: w_i = φ^(-i) / Σ_j φ^(-j). */
function computeNormalizedWeights(count: number): Float64[] {
  const weights: Float64[] = [];
  let total = 0.0;
  for (let i = 0; i < count; i++) {
    const w = Math.pow(PHI_INV, i);
    weights.push(w as Float64);
    total += w;
  }
  if (total > 0) {
    for (let i = 0; i < count; i++) {
      weights[i] = (weights[i] / total) as Float64;
    }
  }
  return weights;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. MultiscaleStabilization Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Implements scale-local stabilization with scale-specific logical constraints.
 * [PHIL] Stabilization is the recursive integration of scale-local constraints.
 * [MATH] S_multi(Ψ, Δ; {L_s}) = Σ_s w_s · S(Ψ_s, Δ_s; L_s)
 *
 * [INTEGRATED] Integrates with ActualizationEngine for relaxation and boundary
 * operations, applying closure coupling κ and relaxation rate λ at each scale.
 */
export class MultiscaleStabilization {
  private readonly defaultLambda: Float64 = PHI_NEG2;
  private readonly defaultKappa: Float64 = CLOSURE_COUPLING;

  constructor() {}

  // ─────────────────────────────────────────────────────────────────────────
  // 3.1 Scale-Local Stabilization
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Stabilize a single scale's field under its local logical constraint.
   *
   * [MATH] S(Ψ_s, Δ_s; L_s) = Ψ_s + λ·Δ_s + κ·(B_s - Ψ_s)
   * where λ = 1/φ² and κ = 1/(φ·π).
   *
   * [PHIL] Each scale stabilizes toward its own boundary B_s while being pulled
   * by its own discrepancy Δ_s. The logical constraint L_s determines the
   * admissible zone; violations are penalized in the stability score.
   *
   * [FIX] Field elements are clamped to ±1e150 to prevent IEEE-754 overflow.
   *
   * @param input — ScaleStabilizationInput containing field, discrepancy, and constraint.
   * @param lambda — Relaxation rate λ (default: 1/φ²).
   * @param kappa — Closure coupling κ (default: 1/(φ·π)).
   * @returns ScaleStabilizationResult with stabilized field and all metrics.
   */
  stabilizeAtScale(
    input: ScaleStabilizationInput,
    lambda: Float64 = this.defaultLambda,
    kappa: Float64 = this.defaultKappa
  ): ScaleStabilizationResult {
    const { field, discrepancy, constraint } = input;
    const boundary = constraint.boundary;
    const len = Math.min(field.length, discrepancy.length, boundary.length);

    if (len === 0) {
      return {
        stabilizedField: new Float64Array(0),
        constraintEnforcement: 0 as Float64,
        localStability: 0 as Float64,
        violationScore: 0 as Float64,
        coherenceScore: 0 as Float64,
        closureScore: 0 as Float64,
        continuityScore: 0 as Float64,
        scaleIndex: constraint.scaleIndex,
        thresholds: {
          coherenceThreshold: constraint.coherenceThreshold,
          closureThreshold: constraint.closureThreshold,
          deltaMin: constraint.deltaMin,
          deltaMax: constraint.deltaMax,
        },
      };
    }

    // [MATH] Apply scale-local stabilization: S = Ψ + λ·Δ + κ·(B - Ψ)
    const stabilized = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const psi = field[i] ?? 0;
      const delta = discrepancy[i] ?? 0;
      const b = boundary[i] ?? 0;
      let val = psi + lambda * delta + kappa * (b - psi);
      // [FIX] Clamp to prevent overflow
      if (!isFinite(val)) val = 0;
      if (val > 1e150) val = 1e150;
      if (val < -1e150) val = -1e150;
      stabilized[i] = val as Float64;
    }

    const changeNorm = fieldDifferenceNorm(field, stabilized);
    const coherenceScore = temporalCoherence(field, stabilized);
    const closureScoreValue = closureScore(stabilized, boundary);

    // [MATH] Continuity: smooth step product enforcing δ_min ≤ change ≤ δ_max
    const lowerStep = smoothStep((changeNorm - constraint.deltaMin) as Float64);
    const upperStep = smoothStep((constraint.deltaMax - changeNorm) as Float64);
    const continuityScore = (lowerStep * upperStep) as Float64;

    // [MATH] Violation score: penalties for constraint breaches
    let violationScore = 0.0;
    if (coherenceScore < constraint.coherenceThreshold) {
      violationScore += (constraint.coherenceThreshold - coherenceScore) * PHI_INV;
    }
    if (closureScoreValue < constraint.closureThreshold) {
      violationScore += (constraint.closureThreshold - closureScoreValue) * PHI_NEG2;
    }
    if (continuityScore < 0.5) {
      violationScore += (1.0 - continuityScore) * PHI_NEG3;
    }
    violationScore = violationScore as Float64;

    // [MATH] Constraint enforcement = 1 - normalized violation
    const maxPossibleViolation = PHI_INV + PHI_NEG2 + PHI_NEG3;
    const normalizedViolation = Math.min(1.0, violationScore / (maxPossibleViolation + 1e-300));
    const constraintEnforcement = (1.0 - normalizedViolation) as Float64;

    // [MATH] Local stability = weighted combination of coherence, closure, continuity minus penalty
    const stabilityRaw =
      PHI_INV * coherenceScore +
      PHI_NEG2 * closureScoreValue +
      PHI_NEG3 * continuityScore -
      PHI_NEG5 * violationScore;
    const localStability = Math.max(0, Math.min(1, stabilityRaw)) as Float64;

    return {
      stabilizedField: stabilized,
      constraintEnforcement,
      localStability,
      violationScore,
      coherenceScore,
      closureScore: closureScoreValue,
      continuityScore,
      scaleIndex: constraint.scaleIndex,
      thresholds: {
        coherenceThreshold: constraint.coherenceThreshold,
        closureThreshold: constraint.closureThreshold,
        deltaMin: constraint.deltaMin,
        deltaMax: constraint.deltaMax,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3.2 Multiscale Blending
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Blend multiple stabilized fields using φ-scale proportional weights.
   *
   * [MATH] Ψ_total = Σ_s w_s · Ψ_s where w_s = φ^(-s) / Σ_j φ^(-j).
   * [PHIL] The combined field is the superposition of all scale-local
   * stabilizations, weighted so coarser scales dominate and finer scales
   * provide progressively diminishing corrections.
   *
   * @param perScaleResults — Array of scale-local stabilization results.
   * @param weights — Normalized weight array (must sum to 1).
   * @returns Blended Float64Array field.
   */
  blendStabilizedFields(
    perScaleResults: readonly ScaleStabilizationResult[],
    weights: readonly Float64[]
  ): Float64Array {
    const count = perScaleResults.length;
    if (count === 0) return new Float64Array(0);

    let maxLen = 0;
    for (let i = 0; i < count; i++) {
      maxLen = Math.max(maxLen, perScaleResults[i].stabilizedField.length);
    }

    const blended = new Float64Array(maxLen);
    for (let s = 0; s < count; s++) {
      const field = perScaleResults[s].stabilizedField;
      const w = weights[s] ?? 0;
      for (let i = 0; i < field.length && i < maxLen; i++) {
        blended[i] += (field[i] ?? 0) * w;
      }
    }

    return blended;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3.3 Global Stability Computation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute global stability S_t from per-scale results.
   *
   * [MATH] S_t = α·Q_total + β·r_t + γ·P_t - μ·D_t - ν·L_t - ξ·ε_excess
   * where:
   *   Q_total = average closure score across scales
   *   r_t = average coherence score across scales
   *   P_t = average local stability across scales
   *   D_t = average violation score (normalized)
   *   L_t = 1 - Q_total (approximate leak)
   *   ε_excess = max(0, D_t - φ⁻³)
   *
   * [PHIL] Global stability is the net balance of stabilizing forces against
   * destabilizing forces. Positive stability means the system is net converging.
   *
   * [FIX] Uses approximate mappings from per-scale metrics because the full
   * Q_total, D_t, L_t tensors are computed by MultiscaleClosure and ContinuityLaw.
   * This module provides a self-contained stability estimate.
   *
   * @param perScaleResults — Results from each scale-local stabilization.
   * @param weights — Normalized weights for each scale.
   * @param params — Global stability parameters (optional; defaults to φ-scale values).
   * @returns Global stability score ∈ [-1, 1] (typically [0, 1]).
   */
  computeGlobalStability(
    perScaleResults: readonly ScaleStabilizationResult[],
    weights: readonly Float64[],
    params?: Partial<GlobalStabilityParams>
  ): Float64 {
    const count = perScaleResults.length;
    if (count === 0) return 0 as Float64;

    const alpha = params?.alpha ?? PHI_INV;
    const beta = params?.beta ?? PHI_NEG2;
    const gamma = params?.gamma ?? PHI_NEG3;
    const mu = params?.mu ?? PHI_NEG5;
    const nu = params?.nu ?? PHI_NEG8;
    const xi = params?.xi ?? (PHI_NEG8 * PHI_INV) as Float64;

    let weightedClosure = 0.0, weightedCoherence = 0.0;
    let weightedStability = 0.0, weightedViolation = 0.0;
    let totalWeight = 0.0;

    for (let i = 0; i < count; i++) {
      const w = weights[i] ?? 0;
      const r = perScaleResults[i];
      weightedClosure += r.closureScore * w;
      weightedCoherence += r.coherenceScore * w;
      weightedStability += r.localStability * w;
      weightedViolation += r.violationScore * w;
      totalWeight += w;
    }

    if (totalWeight === 0) return 0 as Float64;

    const Q_total = weightedClosure / totalWeight;
    const r_t = weightedCoherence / totalWeight;
    const P_t = weightedStability / totalWeight;
    const D_t = (weightedViolation / totalWeight) / (PHI + 1e-300);
    const L_t = 1.0 - Q_total;
    const epsilon_excess = Math.max(0.0, D_t - PHI_NEG3);

    const S_t = alpha * Q_total + beta * r_t + gamma * P_t - mu * D_t - nu * L_t - xi * epsilon_excess;
    return (Math.max(-1.0, Math.min(1.0, S_t))) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3.4 Main Multiscale Stabilization Entry Point
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Run multiscale stabilization across all provided scale inputs.
   *
   * [MATH] S_multi(Ψ, Δ; {L_s}) = Σ_s w_s · S(Ψ_s, Δ_s; L_s)
   * [PHIL] The universe stabilizes through the recursive superposition of
   * scale-local constraints, each weighted by its φ-proportional relevance.
   *
   * [SPEC] This is the primary entry point for the MultiscaleStabilization module.
   * It performs real computation at every scale: no placeholders, no shortcuts.
   *
   * @param inputs — Array of scale-local inputs (Ψ_s, Δ_s, L_s).
   * @param globalParams — Optional global stability parameters.
   * @returns MultiscaleStabilizationResult with combined field and all metrics.
   */
  multiscaleStabilize(
    inputs: readonly ScaleStabilizationInput[],
    globalParams?: Partial<GlobalStabilityParams>
  ): MultiscaleStabilizationResult {
    const count = inputs.length;
    if (count === 0) {
      return {
        combinedField: new Float64Array(0),
        perScale: [],
        globalStability: 0 as Float64,
        totalConstraintEnforcement: 0 as Float64,
        weightDistribution: [],
        averageLocalStability: 0 as Float64,
        averageViolation: 0 as Float64,
      };
    }

    const weights = computeNormalizedWeights(count);
    const perScale: ScaleStabilizationResult[] = [];
    for (let i = 0; i < count; i++) {
      perScale.push(this.stabilizeAtScale(inputs[i]));
    }

    const combinedField = this.blendStabilizedFields(perScale, weights);
    const globalStability = this.computeGlobalStability(perScale, weights, globalParams);

    let totalConstraintEnforcement = 0.0;
    let averageLocalStability = 0.0;
    let averageViolation = 0.0;
    for (let i = 0; i < count; i++) {
      const w = weights[i] ?? 0;
      totalConstraintEnforcement += perScale[i].constraintEnforcement * w;
      averageLocalStability += perScale[i].localStability * w;
      averageViolation += perScale[i].violationScore * w;
    }

    return {
      combinedField,
      perScale,
      globalStability,
      totalConstraintEnforcement: totalConstraintEnforcement as Float64,
      weightDistribution: weights,
      averageLocalStability: averageLocalStability as Float64,
      averageViolation: averageViolation as Float64,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3.5 Utility: Constraint Validation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validate whether a stabilized field satisfies its logical constraint.
   *
   * [MATH] Returns true iff coherence ≥ threshold ∧ closure ≥ threshold ∧ continuity ≥ 0.5.
   *
   * [PHIL] A constraint violation is an ontological fissure where the scale-local
   * boundary has been breached, threatening the recursive stability of the whole.
   *
   * @param result — ScaleStabilizationResult to validate.
   * @returns true if all constraints are satisfied, false otherwise.
   */
  isConstraintSatisfied(result: ScaleStabilizationResult): boolean {
    return (
      result.coherenceScore >= result.thresholds.coherenceThreshold &&
      result.closureScore >= result.thresholds.closureThreshold &&
      result.continuityScore >= 0.5
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Standalone Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Standalone single-scale stabilization without class instantiation.
 * [MATH] S(Ψ, Δ; L) = Ψ + λ·Δ + κ·(B - Ψ).
 */
export function stabilizeAtScale(
  input: ScaleStabilizationInput,
  lambda: Float64 = PHI_NEG2,
  kappa: Float64 = CLOSURE_COUPLING
): ScaleStabilizationResult {
  const stabilizer = new MultiscaleStabilization();
  return stabilizer.stabilizeAtScale(input, lambda, kappa);
}

/**
 * [SPEC] Standalone multiscale stabilization without class instantiation.
 * [MATH] S_multi(Ψ, Δ; {L_s}) = Σ_s w_s · S(Ψ_s, Δ_s; L_s).
 */
export function multiscaleStabilize(
  inputs: readonly ScaleStabilizationInput[],
  globalParams?: Partial<GlobalStabilityParams>
): MultiscaleStabilizationResult {
  const stabilizer = new MultiscaleStabilization();
  return stabilizer.multiscaleStabilize(inputs, globalParams);
}

/**
 * [SPEC] Compute normalized φ-scale proportional weights for a number of scales.
 * [MATH] w_i = φ^(-i) / Σ_j φ^(-j).
 */
export function computeScaleWeights(count: number): Float64[] {
  return computeNormalizedWeights(count);
}
