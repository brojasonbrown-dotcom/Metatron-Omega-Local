/**
 * NecessityComplexity.ts — RHUFT v13 Deep Ontology Module
 *
 * [SPEC] Implements Chapter 8: Necessity-Weighted Complexity per
 * RHUFT Foundational Logic Extraction v1, Sections 8.2–8.4 and 11.1.
 *
 * [PHIL] Not all complexity is stabilizing. Some complexity is decorative,
 * adding structure but no stability benefit. Some is unstable, actively
 * destabilizing the system. Some is necessary, required for stability. And
 * some is actively stabilizing, increasing the system's resilience. The
 * universe does not accumulate complexity blindly; it accumulates complexity
 * only where the marginal stability gain exceeds the marginal burden cost.
 * This selective pressure is the ontological engine of complexification.
 *
 * [MATH] All arithmetic is IEEE-754 Float64. Strictly deterministic —
 * no randomness, no Math.random(), no Date.now(). Scale-invariant via
 * φ-law constants from `./core/constants.ts`.
 *
 * Epistemic labels: [SPEC], [PHIL], [MATH], [FIX], [INTEGRATED].
 */

import {
  PHI_INV,
  PHI_NEG2,
  PHI_NEG3,
  PHI_NEG5,
  PHI_NEG8,
} from "./core/constants.ts";
import { at } from "./core/indexing.ts";

/** [MATH] IEEE-754 double-precision alias for deterministic Float64 semantics. */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/** [SPEC] Decomposed burden components per Section 8.3 and 11.5. */
export interface BurdenComponents {
  /** [MATH] Memory burden: L2 norm of memory field |M_t|. */
  memory: Float64;
  /** [MATH] Measurement burden: Frobenius norm of measurement operator |M_cycle(Ψ_t)|. */
  measurement: Float64;
  /** [MATH] Closure burden: 1 - Q_total. */
  closure: Float64;
  /** [MATH] Cross-scale burden: mean pairwise inconsistency across nested scales. */
  crossScale: Float64;
  /** [MATH] Temporal burden: mean relative change from previous state. */
  temporal: Float64;
}

/** [SPEC] Inputs for the stability functional J_stability. */
export interface StabilityFunctionalParams {
  /** [MATH] Global aggregate closure Q_total. */
  Q_total: Float64;
  /** [MATH] Coherence r_t. */
  coherence: Float64;
  /** [MATH] Persistence P_t. */
  persistence: Float64;
  /** [MATH] Drift D_t. */
  drift: Float64;
  /** [MATH] Leak L_t. */
  leak: Float64;
  /** [MATH] Excess perfection deficit ε_t - ε_safe. */
  epsilon_excess: Float64;
}

/** [SPEC] Result of a full effective complexity analysis. */
export interface EffectiveComplexityResult {
  /** [MATH] Raw complexity χ (e.g., Shannon entropy). */
  rawComplexity: Float64;
  /** [MATH] Discrete Δχ used for finite difference. */
  deltaChi: Float64;
  /** [MATH] Stability functional J(χ). */
  stabilityCurrent: Float64;
  /** [MATH] Stability functional J(χ - Δχ). */
  stabilityReduced: Float64;
  /** [MATH] Burden B(χ). */
  burdenCurrent: Float64;
  /** [MATH] Burden B(χ - Δχ). */
  burdenReduced: Float64;
  /** [MATH] ∂J/∂χ ≈ (J(χ) - J(χ - Δχ)) / Δχ. */
  dJ_dChi: Float64;
  /** [MATH] ∂B/∂χ ≈ (B(χ) - B(χ - Δχ)) / Δχ. */
  dB_dChi: Float64;
  /** [MATH] Effective complexity χ_eff = (∂J/∂χ) / (∂B/∂χ). */
  effectiveComplexity: Float64;
  /** [MATH] Net stabilization benefit: ∂J/∂χ > 0. */
  netBenefit: boolean;
  /** [SPEC] Burden components for current state. */
  burdenComponents: BurdenComponents;
  /** [MATH] Weighted total burden. */
  totalBurden: Float64;
  /** [MATH] Complexity gradient ∂χ/∂t. */
  complexityGradient: Float64;
  /** [MATH] Recommended next complexity χ_{t+1}. */
  recommendedComplexity: Float64;
  /** [MATH] Burden efficiency: J / B. */
  burdenEfficiency: Float64;
  /** [MATH] Selective pressure score: ∂J/∂χ · step(χ_eff). */
  selectivePressure: Float64;
}

/** [SPEC] Input parameters for full analysis. */
export interface ComplexityAnalysisInput {
  /** [SPEC] Current geometric field (interleaved complex). */
  currentField: Float64Array;
  /** [SPEC] Previous geometric field (for temporal burden). */
  previousField: Float64Array | null;
  /** [SPEC] Memory field (for memory burden). */
  memoryField: Float64Array;
  /** [SPEC] Scale fields (for cross-scale and measurement burden). */
  scaleFields: Float64Array[];
  /** [SPEC] Stability functional parameters for current state. */
  stabilityParams: StabilityFunctionalParams;
  /** [SPEC] Stability parameters for reduced state (optional). */
  reducedStabilityParams?: StabilityFunctionalParams;
  /** [SPEC] Burden components for reduced state (optional). */
  reducedBurdenComponents?: BurdenComponents;
  /** [MATH] Discrete step Δχ for finite difference. */
  deltaChi: Float64;
  /** [MATH] Previous raw complexity (for gradient). */
  previousComplexity?: Float64;
}

/** [SPEC] Marginal analysis per burden component. */
export interface MarginalBurdenAnalysis {
  /** [MATH] Marginal memory burden ∂M/∂χ. */
  dMemory_dChi: Float64;
  /** [MATH] Marginal measurement burden ∂Meas/∂χ. */
  dMeasurement_dChi: Float64;
  /** [MATH] Marginal closure burden ∂C/∂χ. */
  dClosure_dChi: Float64;
  /** [MATH] Marginal cross-scale burden ∂SC/∂χ. */
  dCrossScale_dChi: Float64;
  /** [MATH] Marginal temporal burden ∂T/∂χ. */
  dTemporal_dChi: Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. NecessityComplexity Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Computes necessity-weighted complexity, burden decomposition,
 * stability functional, and the complexification decision.
 *
 * [PHIL] The universe does not accumulate complexity blindly. It accumulates
 * complexity only where the marginal stability gain exceeds the marginal
 * burden cost. This is the selective pressure of ontological existence:
 * unstable complexity is shed; necessary complexity is retained.
 */
export class NecessityComplexity {
  // ─────────────────────────────────────────────────────────────────────────────
  // 2.1 Burden Component Computations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Memory burden: cost of storing and updating structure.
   * [MATH] |M_t| = sqrt(Σ memory_i²). L2 norm of memory field.
   * [PHIL] Memory is not free. Every retained distinction imposes a recursive
   * storage cost that must be paid at every tick.
   */
  static computeMemoryBurden(memoryField: Float64Array): Float64 {
    let sumSq = 0.0;
    for (let i = 0; i < memoryField.length; i++) {
      const v = memoryField[i] ?? 0;
      sumSq += v * v;
    }
    return Math.sqrt(sumSq) as Float64;
  }

  /**
   * [SPEC] Measurement burden: cost of self-measuring the structure.
   * [MATH] |M_cycle(Ψ_t)| = Frobenius norm of measurement tensor.
   * [PHIL] Self-measurement is the fundamental operation of existence. It
   * is also costly. The more dimensions measured, the higher the burden.
   */
  static computeMeasurementBurden(matrix: Float64Array[]): Float64 {
    if (matrix.length === 0) return 0.0 as Float64;
    let sumSq = 0.0;
    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i];
      for (let j = 0; j < row.length; j++) {
        const v = at(row, j) ?? 0;
        sumSq += v * v;
      }
    }
    return Math.sqrt(sumSq) as Float64;
  }

  /**
   * [SPEC] Closure burden: cost of maintaining closure around the structure.
   * [MATH] C_burden = 1 - Q_total. Imperfect closure costs energy.
   * [PHIL] A leaky boundary is a continuously failing distinction. The system
   * must constantly work to re-establish closure.
   */
  static computeClosureBurden(closureQuality: Float64): Float64 {
    const q = closureQuality < 0 ? 0 : closureQuality > 1 ? 1 : closureQuality;
    return (1.0 - q) as Float64;
  }

  /**
   * [SPEC] Cross-scale burden: cost of maintaining consistency across nested scales.
   * [MATH] SC = (1/pairs) Σ_{i<j} (1/len) Σ_k |a_{ik} - b_{jk}| / (max(|a_{ik}|, |b_{jk}|) + ε).
   * [PHIL] Nested scales must agree. When they disagree, the system pays a
   * reconciliation cost proportional to the inconsistency.
   */
  static computeCrossScaleBurden(scaleFields: Float64Array[]): Float64 {
    const N = scaleFields.length;
    if (N < 2) return 0.0 as Float64;
    let total = 0.0;
    let pairs = 0;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = scaleFields[i] ?? new Float64Array(0);
        const b = scaleFields[j] ?? new Float64Array(0);
        const len = Math.min(a.length, b.length);
        if (len === 0) continue;
        let diff = 0.0;
        for (let k = 0; k < len; k++) {
          const av = Math.abs(a[k] ?? 0);
          const bv = Math.abs(b[k] ?? 0);
          const max = Math.max(av, bv) + 1e-15;
          diff += Math.abs((a[k] ?? 0) - (b[k] ?? 0)) / max;
        }
        total += diff / len;
        pairs++;
      }
    }
    return pairs > 0 ? (total / pairs) as Float64 : 0.0 as Float64;
  }

  /**
   * [SPEC] Temporal burden: cost of maintaining structure over time.
   * [MATH] T = (1/N) Σ |curr_i - prev_i| / (max(|curr_i|, |prev_i|) + ε).
   * [PHIL] Persistence is not free. To remain the same across time, the
   * system must continuously re-assert its structure against the void.
   */
  static computeTemporalBurden(current: Float64Array, previous: Float64Array | null): Float64 {
    if (previous === null || previous.length !== current.length) return 0.0 as Float64;
    const len = current.length;
    if (len === 0) return 0.0 as Float64;
    let sum = 0.0;
    for (let i = 0; i < len; i++) {
      const cv = Math.abs(current[i] ?? 0);
      const pv = Math.abs(previous[i] ?? 0);
      const max = Math.max(cv, pv) + 1e-15;
      sum += Math.abs((current[i] ?? 0) - (previous[i] ?? 0)) / max;
    }
    return (sum / len) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2.2 Total Burden
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Total burden with φ-scale proportional weights.
   * [MATH] burden = w_m·M + w_meas·Meas + w_c·C + w_s·SC + w_t·T
   * Weights: w_m=φ^{-1}, w_meas=φ^{-2}, w_c=φ^{-3}, w_s=φ^{-5}, w_t=φ^{-8}.
   * [PHIL] The total burden is the weighted cost of existing. Each weight
   * reflects the relative importance of that cost in the ontological economy.
   */
  static computeTotalBurden(components: BurdenComponents): Float64 {
    const w_m = PHI_INV;
    const w_meas = PHI_NEG2;
    const w_c = PHI_NEG3;
    const w_s = PHI_NEG5;
    const w_t = PHI_NEG8;

    const total = (
      w_m * components.memory +
      w_meas * components.measurement +
      w_c * components.closure +
      w_s * components.crossScale +
      w_t * components.temporal
    );
    return (total < 0 ? 0 : total) as Float64;
  }

  /**
   * [FIX] Convenience: compute total burden directly from raw field data.
   * [MATH] Aggregates all five components in one call.
   */
  static computeTotalBurdenFromFields(
    memoryField: Float64Array,
    measurementMatrix: Float64Array[],
    closureQuality: Float64,
    scaleFields: Float64Array[],
    currentField: Float64Array,
    previousField: Float64Array | null
  ): Float64 {
    const components: BurdenComponents = {
      memory: this.computeMemoryBurden(memoryField),
      measurement: this.computeMeasurementBurden(measurementMatrix),
      closure: this.computeClosureBurden(closureQuality),
      crossScale: this.computeCrossScaleBurden(scaleFields),
      temporal: this.computeTemporalBurden(currentField, previousField),
    };
    return this.computeTotalBurden(components);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2.3 Stability Functional
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Stability functional J_stability per Section 11.1.
   * [MATH] J = α·Q_total + β·r + γ·P - μ·D - ν·L - ξ·ε_excess
   * α=φ^{-1}, β=φ^{-2}, γ=φ^{-3}, μ=φ^{-4}, ν=φ^{-5}, ξ=φ^{-8}.
   * [PHIL] Stability is the balance of closure, coherence, and persistence
   * against the dissolving forces of drift, leak, and perfection deficit.
   */
  static computeStabilityFunctional(params: StabilityFunctionalParams): Float64 {
    const alpha = PHI_INV;
    const beta = PHI_NEG2;
    const gamma = PHI_NEG3;
    const mu = (PHI_NEG3 * PHI_INV) as Float64; // φ^{-4}
    const nu = PHI_NEG5;
    const xi = PHI_NEG8;

    const J = (
      alpha * params.Q_total +
      beta * params.coherence +
      gamma * params.persistence -
      mu * params.drift -
      nu * params.leak -
      xi * params.epsilon_excess
    );
    return J as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2.4 Discrete Derivatives & Effective Complexity
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Discrete derivative of a scalar with respect to complexity.
   * [MATH] ∂f/∂χ ≈ (f(χ) - f(χ - Δχ)) / Δχ.
   * [FIX] If Δχ is zero or near-zero, returns 0 to prevent division by zero.
   */
  static computeDiscreteDerivative(
    current: Float64,
    reduced: Float64,
    deltaChi: Float64
  ): Float64 {
    if (Math.abs(deltaChi) < 1e-15) return 0.0 as Float64;
    return ((current - reduced) / deltaChi) as Float64;
  }

  /**
   * [SPEC] Effective complexity χ_eff.
   * [MATH] χ_eff = (∂J/∂χ) / (∂B/∂χ).
   * [PHIL] The effective complexity is the marginal stability return per
   * unit marginal burden. High χ_eff means the complexity is highly
   * stabilizing. Low χ_eff means the complexity is burdensome.
   */
  static computeEffectiveComplexity(
    stabilityCurrent: Float64,
    stabilityReduced: Float64,
    burdenCurrent: Float64,
    burdenReduced: Float64,
    deltaChi: Float64
  ): Float64 {
    const dJ = this.computeDiscreteDerivative(stabilityCurrent, stabilityReduced, deltaChi);
    const dB = this.computeDiscreteDerivative(burdenCurrent, burdenReduced, deltaChi);
    if (Math.abs(dB) < 1e-15) return 0.0 as Float64;
    return (dJ / dB) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2.5 Net Benefit & Complexification Decision
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Net stabilization benefit condition.
   * [MATH] ∂J/∂χ > 0.
   * [PHIL] If increasing complexity increases stability, the complexity is
   * necessary. If increasing complexity decreases stability, the complexity
   * is unstable and should be shed.
   */
  static isNetStabilizationBenefitPositive(dJ_dChi: Float64): boolean {
    return dJ_dChi > 0.0;
  }

  /**
   * [SPEC] Smooth step function for complexification decision.
   * [MATH] step(x) = 0.5·(1 + x / sqrt(x² + ε)).
   * [FIX] Provides a smooth transition between 0 and 1 instead of a hard step.
   */
  static smoothStep(x: Float64): Float64 {
    return (0.5 * (1.0 + x / Math.sqrt(x * x + 1e-12))) as Float64;
  }

  /**
   * [SPEC] Should the system complexify?
   * [MATH] Returns true if both χ_eff > 0 and ∂J/∂χ > 0.
   * [PHIL] Complexification requires both a positive marginal return and
   * a positive net stabilization benefit.
   */
  static shouldComplexify(effectiveComplexity: Float64, dJ_dChi: Float64): boolean {
    return effectiveComplexity > 0.0 && dJ_dChi > 0.0;
  }

  /**
   * [SPEC] Compute next complexity value.
   * [MATH] χ_{t+1} = χ_t + Δχ · step(χ_eff).
   * [PHIL] The system only grows in complexity when the growth is stabilizing.
   * Otherwise, it maintains or reduces complexity.
   */
  static computeNextComplexity(
    currentComplexity: Float64,
    deltaChi: Float64,
    effectiveComplexity: Float64
  ): Float64 {
    const step = this.smoothStep(effectiveComplexity);
    return (currentComplexity + deltaChi * step) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2.6 Raw Complexity Computation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Compute raw complexity from a field using Shannon entropy.
   * [MATH] χ = -Σ p_i·ln(p_i) / ln(N) where p_i = |Ψ_i| / Σ|Ψ_j|.
   * Normalized to [0, 1]. This is the same computation as
   * InformationDensity.computeComplexity, reproduced here for self-containment.
   */
  static computeRawComplexity(field: Float64Array): Float64 {
    const n = Math.floor(field.length / 2);
    if (n === 0) return 0.0 as Float64;
    const magnitudes = new Float64Array(n);
    let totalMag = 0.0;
    for (let i = 0; i < n; i++) {
      const re = field[2 * i] ?? 0;
      const im = field[2 * i + 1] ?? 0;
      const mag = Math.sqrt(re * re + im * im);
      magnitudes[i] = mag;
      totalMag += mag;
    }
    if (totalMag === 0) return 0.0 as Float64;
    let entropy = 0.0;
    for (let i = 0; i < n; i++) {
      const p = at(magnitudes, i) / totalMag;
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }
    const maxEntropy = Math.log(n);
    if (maxEntropy === 0) return 0.0 as Float64;
    const normalized = entropy / maxEntropy;
    return (normalized < 0 ? 0 : normalized > 1 ? 1 : normalized) as Float64;
  }

  /**
   * [SPEC] Compute complexity gradient ∂χ/∂t.
   * [MATH] ∂χ/∂t ≈ χ_t - χ_{t-1} (Δt = 1 tick).
   * [PHIL] The rate of complexification reveals the system's ontological
   * momentum: is it growing, stable, or declining in structural richness?
   */
  static computeComplexityGradient(
    currentComplexity: Float64,
    previousComplexity: Float64
  ): Float64 {
    return (currentComplexity - previousComplexity) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2.7 Marginal Analysis
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Compute marginal burden for each component.
   * [MATH] ∂B_i/∂χ ≈ (B_i(χ) - B_i(χ - Δχ)) / Δχ.
   * [PHIL] Which burden component is most sensitive to complexity change?
   * This reveals the bottleneck in the ontological economy.
   */
  static computeMarginalBurden(
    current: BurdenComponents,
    reduced: BurdenComponents,
    deltaChi: Float64
  ): MarginalBurdenAnalysis {
    return {
      dMemory_dChi: this.computeDiscreteDerivative(current.memory, reduced.memory, deltaChi),
      dMeasurement_dChi: this.computeDiscreteDerivative(current.measurement, reduced.measurement, deltaChi),
      dClosure_dChi: this.computeDiscreteDerivative(current.closure, reduced.closure, deltaChi),
      dCrossScale_dChi: this.computeDiscreteDerivative(current.crossScale, reduced.crossScale, deltaChi),
      dTemporal_dChi: this.computeDiscreteDerivative(current.temporal, reduced.temporal, deltaChi),
    };
  }

  /**
   * [SPEC] Compute burden efficiency: stability per unit burden.
   * [MATH] η = J / B. If B = 0, returns 0.
   * [PHIL] Efficiency measures how well the system converts existential
   * cost into ontological stability. High efficiency = lean and resilient.
   */
  static computeBurdenEfficiency(stability: Float64, burden: Float64): Float64 {
    if (Math.abs(burden) < 1e-15) return 0.0 as Float64;
    return (stability / burden) as Float64;
  }

  /**
   * [SPEC] Compute selective pressure score.
   * [MATH] S = ∂J/∂χ · step(χ_eff). Combines net benefit and smooth step.
   * [PHIL] The selective pressure is the net force driving complexification.
   * Positive = evolution toward more structure. Negative = simplification.
   */
  static computeSelectivePressure(dJ_dChi: Float64, effectiveComplexity: Float64): Float64 {
    return (dJ_dChi * this.smoothStep(effectiveComplexity)) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2.8 Full Analysis
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Perform full effective complexity analysis.
   * [MATH] Computes burden, stability, derivatives, χ_eff, and recommendation.
   * [PHIL] This is the complete ontological accounting of whether the
   * current complexity is worth its cost.
   */
  static analyze(input: ComplexityAnalysisInput): EffectiveComplexityResult {
    const rawComplexity = this.computeRawComplexity(input.currentField);

    // Compute current burden components
    const burdenComponents: BurdenComponents = {
      memory: this.computeMemoryBurden(input.memoryField),
      measurement: this.computeMeasurementBurden(input.scaleFields),
      closure: this.computeClosureBurden(input.stabilityParams.Q_total),
      crossScale: this.computeCrossScaleBurden(input.scaleFields),
      temporal: this.computeTemporalBurden(input.currentField, input.previousField),
    };

    const burdenCurrent = this.computeTotalBurden(burdenComponents);
    const stabilityCurrent = this.computeStabilityFunctional(input.stabilityParams);

    // Reduced state
    let burdenReduced: Float64;
    let stabilityReduced: Float64;

    if (input.reducedBurdenComponents) {
      burdenReduced = this.computeTotalBurden(input.reducedBurdenComponents);
    } else {
      // Construct reduced burden by scaling each component proportionally
      const ratio = Math.max(0.0, 1.0 - input.deltaChi / Math.max(rawComplexity, 1e-15));
      const reducedComponents: BurdenComponents = {
        memory: burdenComponents.memory * ratio,
        measurement: burdenComponents.measurement * ratio,
        closure: burdenComponents.closure * ratio + (1.0 - ratio),
        crossScale: burdenComponents.crossScale * ratio,
        temporal: burdenComponents.temporal,
      };
      burdenReduced = this.computeTotalBurden(reducedComponents);
    }

    if (input.reducedStabilityParams) {
      stabilityReduced = this.computeStabilityFunctional(input.reducedStabilityParams);
    } else {
      const ratio = Math.max(0.0, 1.0 - input.deltaChi / Math.max(rawComplexity, 1e-15));
      const reducedParams: StabilityFunctionalParams = {
        Q_total: input.stabilityParams.Q_total * ratio,
        coherence: input.stabilityParams.coherence * ratio,
        persistence: input.stabilityParams.persistence * ratio,
        drift: input.stabilityParams.drift + (1.0 - ratio),
        leak: input.stabilityParams.leak + (1.0 - ratio),
        epsilon_excess: input.stabilityParams.epsilon_excess,
      };
      stabilityReduced = this.computeStabilityFunctional(reducedParams);
    }

    const dJ_dChi = this.computeDiscreteDerivative(stabilityCurrent, stabilityReduced, input.deltaChi);
    const dB_dChi = this.computeDiscreteDerivative(burdenCurrent, burdenReduced, input.deltaChi);
    const effectiveComplexity = this.computeEffectiveComplexity(
      stabilityCurrent, stabilityReduced, burdenCurrent, burdenReduced, input.deltaChi
    );

    const netBenefit = this.isNetStabilizationBenefitPositive(dJ_dChi);
    const complexityGradient = input.previousComplexity !== undefined
      ? this.computeComplexityGradient(rawComplexity, input.previousComplexity)
      : 0.0 as Float64;

    const recommendedComplexity = this.computeNextComplexity(
      rawComplexity, input.deltaChi, effectiveComplexity
    );

    const burdenEfficiency = this.computeBurdenEfficiency(stabilityCurrent, burdenCurrent);
    const selectivePressure = this.computeSelectivePressure(dJ_dChi, effectiveComplexity);

    return {
      rawComplexity,
      deltaChi: input.deltaChi,
      stabilityCurrent,
      stabilityReduced,
      burdenCurrent,
      burdenReduced,
      dJ_dChi,
      dB_dChi,
      effectiveComplexity,
      netBenefit,
      burdenComponents,
      totalBurden: burdenCurrent,
      complexityGradient,
      recommendedComplexity,
      burdenEfficiency,
      selectivePressure,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Standalone Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Compute effective complexity from pre-computed marginal values.
 * [MATH] χ_eff = (∂J/∂χ) / (∂B/∂χ).
 */
export function computeEffectiveComplexity(
  dJ_dChi: Float64,
  dB_dChi: Float64
): Float64 {
  if (Math.abs(dB_dChi) < 1e-15) return 0.0 as Float64;
  return (dJ_dChi / dB_dChi) as Float64;
}

/**
 * [SPEC] Compute total burden from components with φ-scale weights.
 * [MATH] Same as NecessityComplexity.computeTotalBurden.
 */
export function computeTotalBurden(components: BurdenComponents): Float64 {
  return NecessityComplexity.computeTotalBurden(components);
}

/**
 * [SPEC] Compute net stabilization benefit.
 * [MATH] Returns true if ∂J/∂χ > 0.
 */
export function isNetStabilizationBenefitPositive(dJ_dChi: Float64): boolean {
  return dJ_dChi > 0.0;
}

/**
 * [SPEC] Smooth step function.
 * [MATH] step(x) = 0.5·(1 + x / sqrt(x² + ε)).
 */
export function smoothStep(x: Float64): Float64 {
  return NecessityComplexity.smoothStep(x);
}

/**
 * [SPEC] Compute next complexity.
 * [MATH] χ_{t+1} = χ_t + Δχ · step(χ_eff).
 */
export function computeNextComplexity(
  currentComplexity: Float64,
  deltaChi: Float64,
  effectiveComplexity: Float64
): Float64 {
  return NecessityComplexity.computeNextComplexity(currentComplexity, deltaChi, effectiveComplexity);
}

/**
 * [SPEC] Compute burden efficiency.
 * [MATH] η = J / B.
 */
export function computeBurdenEfficiency(stability: Float64, burden: Float64): Float64 {
  return NecessityComplexity.computeBurdenEfficiency(stability, burden);
}

/**
 * [SPEC] Compute selective pressure score.
 * [MATH] S = ∂J/∂χ · step(χ_eff).
 */
export function computeSelectivePressure(dJ_dChi: Float64, effectiveComplexity: Float64): Float64 {
  return NecessityComplexity.computeSelectivePressure(dJ_dChi, effectiveComplexity);
}
