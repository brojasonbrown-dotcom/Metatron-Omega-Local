/**
 * RHUFT v13 — Actualization Engine: Chapter 2 — From Unresolved Potential to Actualized Form
 *
 * Implements the three-stage actualization pipeline:
 *   Stage 1: Latent Potential Field — unresolved φ-weighted geometric series
 *   Stage 2: Distinction Operator — measurement/comparison against boundary
 *   Stage 3: Stabilization Filter — iterative relaxation toward membrane
 *
 * [PHIL] — Actuality is not created from outside. It is the self-resolution of
 * potential into stable form. The transition from "0" to "1" is better understood
 * as: from unexpressed to expressed, from undifferentiated to differentiated,
 * from latent to realized, from merely possible to stably actual.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI,
  PHI_INV,
  PHI_NEG2,
  PI,
  CLOSURE_COUPLING,
  MASTER_EQUATION_N,
} from "./core/constants.ts";

import type { ExistenceScore } from "./existence_detector.ts";
import { ExistenceDetector } from "./existence_detector.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Actualization Result — The P → Δ → E Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of the complete three-stage actualization pipeline.
 *
 * [PHIL] — The pipeline produces the full trace of how unresolved potential
 * was measured into distinction, then stabilized into actualized form. This is
 * the ontological engine of creation in RHUFT: reality manifests because
 * timeless logical structure is recursively measured and stabilized.
 */
export interface ActualizationResult {
  /** Stage 1: The latent potential field (unresolved φ-weighted geometric series). */
  readonly potential: Float64Array;
  /** Stage 2: The distinction vector (measured difference from boundary). */
  readonly distinction: Float64Array;
  /** Stage 3: The stabilized actualized field. */
  readonly actualized: Float64Array;
  /** Existence score: does the actualized field qualify as existent? */
  readonly existenceScore: ExistenceScore;
  /** Phase angles used in the potential field. */
  readonly phaseAngles: Float64Array;
  /** Amplitude weights used in the potential field. */
  readonly amplitudes: Float64Array;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ActualizationEngine — The Three-Stage Ontological Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Implements the three-stage actualization pipeline that converts unresolved
 * potential into stabilized actuality through measurement and distinction.
 *
 * [PHIL] — Potential alone does not yet define a world. It contains possibilities,
 * but not determinate realized form. A possibility becomes actual only when:
 *   1. it is distinguished from alternative possibilities (measurement)
 *   2. it acquires relational boundary (distinction)
 *   3. it enters measurable structure (stabilization)
 *   4. it stabilizes under recursive consistency (actuality)
 *
 * Thus the transition is: P → Δ → E (Potential → Distinction → Existence).
 */
export class ActualizationEngine {
  // ─────────────────────────────────────────────────────────────────────────
  // 3. Stage 1: Latent Potential Field
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate the latent potential field: an unresolved φ-weighted geometric series.
   *
   * [MATH] — Ψ_potential = Σ(k=0 to N) φ^(-k) · e^(i·θ_k) where
   * θ_k = 2π · k · φ^(-1) · scale / 89. This is the "pre-measurement" field:
   * pure possibility without distinction. The φ-weighted decay ensures that
   * higher-frequency modes (smaller scales) have less amplitude, creating
   * a natural hierarchy of possibility.
   *
   * [PHIL] — This field represents the totality of unresolved potential. It is
   * pre-local, pre-temporal, pre-objective, all-directionally permissive, rich
   * in possible relation, but not yet stabilized into definite structure.
   *
   * @param scale — Scale index n (determines the phase progression).
   * @param N — Number of terms in the geometric series (default: 13 = F₇).
   * @returns Interleaved complex potential field [Re₀, Im₀, Re₁, Im₁, ...].
   */
  static latentPotentialField(scale: number, N: number = MASTER_EQUATION_N): Float64Array {
    if (N < 0) N = 0;
    const fieldSize = 2 * (N + 1);
    const result = new Float64Array(fieldSize);
    const phaseAngles = new Float64Array(N + 1);
    const amplitudes = new Float64Array(N + 1);

    for (let k = 0; k <= N; k++) {
      const amplitude = Math.pow(PHI_INV, k) as Float64;
      const theta = (2.0 * PI * k * PHI_INV * scale) / 89.0;

      // Normalize to [0, 2π)
      let normalized = theta % (2.0 * PI);
      if (normalized < 0) normalized += 2.0 * PI;

      phaseAngles[k] = normalized as Float64;
      amplitudes[k] = amplitude;

      const idx = 2 * k;
      if (idx < fieldSize) {
        result[idx] = (amplitude * Math.cos(normalized)) as Float64;
        result[idx + 1] = (amplitude * Math.sin(normalized)) as Float64;
      }
    }

    return result;
  }

  /**
   * Get the phase angles and amplitudes for a potential field.
   *
   * @param scale — Scale index n.
   * @param N — Number of terms (default: 13).
   * @returns { phaseAngles, amplitudes } as Float64Arrays.
   */
  static potentialComponents(
    scale: number,
    N: number = MASTER_EQUATION_N
  ): { phaseAngles: Float64Array; amplitudes: Float64Array } {
    const phaseAngles = new Float64Array(N + 1);
    const amplitudes = new Float64Array(N + 1);

    for (let k = 0; k <= N; k++) {
      amplitudes[k] = Math.pow(PHI_INV, k) as Float64;
      const theta = (2.0 * PI * k * PHI_INV * scale) / 89.0;
      let normalized = theta % (2.0 * PI);
      if (normalized < 0) normalized += 2.0 * PI;
      phaseAngles[k] = normalized as Float64;
    }

    return { phaseAngles, amplitudes };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Stage 2: Distinction Operator
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the distinction vector: the measured difference from the boundary.
   *
   * [PHIL] — Measurement is the bridge between potential and actuality. The
   * distinction operator draws out determinate relation from unresolved potential
   * by comparing it against the boundary/environment. The output is the "candidate
   * structure" for existence — a provisional distinction that may or may not
   * stabilize.
   *
   * [MATH] — Δ = |Ψ_potential - boundary|² (element-wise squared difference).
   * This measures how much the potential differs from the boundary, creating
   * the first ontological break: this is not that.
   *
   * @param potential — Latent potential field Ψ_potential.
   * @param boundary — Boundary/environment field B.
   * @returns Distinction vector Δ (element-wise squared difference).
   */
  static distinctionOperator(potential: Float64Array, boundary: Float64Array): Float64Array {
    const len = Math.min(potential.length, boundary.length);
    if (len === 0) return new Float64Array(0);

    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      const p = potential[i] ?? 0;
      const b = boundary[i] ?? 0;
      const diff = p - b;
      result[i] = (diff * diff) as Float64; // squared difference = distinction
    }

    return result;
  }

  /**
   * Compute the signed distinction (not squared) for directional analysis.
   *
   * [MATH] — Δ_signed = Ψ_potential - boundary. This preserves the sign of
   * the distinction, which is useful for determining directionality (positive
   * vs negative deviation from the boundary).
   */
  static signedDistinction(potential: Float64Array, boundary: Float64Array): Float64Array {
    const len = Math.min(potential.length, boundary.length);
    if (len === 0) return new Float64Array(0);

    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = ((potential[i] ?? 0) - (boundary[i] ?? 0)) as Float64;
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Stage 3: Stabilization Filter
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Apply the stabilization filter: iterative relaxation toward the boundary.
   *
   * [PHIL] — Stabilization converts distinction into existence. The field is
   * iteratively pulled toward the boundary condition, resolving the discrepancy
   * into a stable admissible form. This is the "survival" of recursive
   * self-measurement: the field exists because it maintains its coherence.
   *
   * [MATH] — Ψ_{n+1} = Ψ_n + λ · (B - Ψ_n) for n iterations, where λ = 1/φ².
   * This is an exponential relaxation toward the boundary. After many iterations,
   * Ψ → B (the field becomes identical to the boundary). The number of iterations
   * controls the "stabilization strength": more iterations = closer to boundary.
   *
   * @param field — Input field (potential or current state).
   * @param boundary — Boundary/environment field B (target/ideal state).
   * @param iterations — Number of relaxation iterations (default: 5).
   * @param lambda — Stabilization rate (default: 1/φ² ≈ 0.382).
   * @returns Stabilized field after iterative relaxation.
   */
  static stabilizationFilter(
    field: Float64Array,
    boundary: Float64Array,
    iterations: number = 5,
    lambda: number = PHI_NEG2
  ): Float64Array {
    const len = Math.min(field.length, boundary.length);
    if (len === 0) return new Float64Array(0);

    // Copy the field to avoid mutating the input
    let current = new Float64Array(field);

    for (let iter = 0; iter < iterations; iter++) {
      const next = new Float64Array(len);
      for (let i = 0; i < len; i++) {
        const c = current[i] ?? 0;
        const b = boundary[i] ?? 0;
        // Relaxation: next = current + λ · (boundary - current)
        next[i] = (c + lambda * (b - c)) as Float64;

        // Clamp to prevent overflow
        if (!isFinite(next[i])) next[i] = 0 as Float64;
        if (next[i] > 1e150) next[i] = 1e150 as Float64;
        if (next[i] < -1e150) next[i] = -1e150 as Float64;
      }
      current = next;
    }

    return current;
  }

  /**
   * Apply stabilization with a surface closure correction.
   *
   * [MATH] — Ψ_{n+1} = Ψ_n + λ · (B - Ψ_n) + κ · (B - Ψ_n) where
   * κ = CLOSURE_COUPLING = 1/(φ·π) ≈ 0.1967. The closure term adds a small
   * correction that pulls the field toward the boundary with a different rate,
   * creating a more stable convergence.
   */
  static stabilizationFilterWithClosure(
    field: Float64Array,
    boundary: Float64Array,
    iterations: number = 5,
    lambda: number = PHI_NEG2,
    kappa: number = CLOSURE_COUPLING
  ): Float64Array {
    const len = Math.min(field.length, boundary.length);
    if (len === 0) return new Float64Array(0);

    let current = new Float64Array(field);
    const totalRate = lambda + kappa;

    for (let iter = 0; iter < iterations; iter++) {
      const next = new Float64Array(len);
      for (let i = 0; i < len; i++) {
        const c = current[i] ?? 0;
        const b = boundary[i] ?? 0;
        next[i] = (c + totalRate * (b - c)) as Float64;

        if (!isFinite(next[i])) next[i] = 0 as Float64;
        if (next[i] > 1e150) next[i] = 1e150 as Float64;
        if (next[i] < -1e150) next[i] = -1e150 as Float64;
      }
      current = next;
    }

    return current;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Full Pipeline: P → Δ → E
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Run the complete three-stage actualization pipeline.
   *
   * [PHIL] — This is the full ontological transition from possibility to reality:
   *   1. Generate unresolved potential (pure possibility)
   *   2. Measure distinction against boundary (measurement)
   *   3. Stabilize toward admissible form (existence)
   *   4. Evaluate existence score (verification)
   *
   * [MATH] — P → Δ → E where:
   *   P = latentPotentialField(scale, N)
   *   Δ = distinctionOperator(P, boundary)
   *   E = stabilizationFilter(P, boundary, iterations, lambda)
   *
   * @param scale — Scale index n.
   * @param boundary — Boundary/environment field B.
   * @param options — Optional parameters for the pipeline.
   * @returns Complete actualization result with all stages and metrics.
   */
  static actualize(
    scale: number,
    boundary: Float64Array,
    options?: {
      N?: number;           // Master Equation N (default: 13)
      iterations?: number;   // Stabilization iterations (default: 5)
      lambda?: number;      // Stabilization rate (default: 1/φ²)
      includeClosure?: boolean; // Include closure correction (default: false)
    }
  ): ActualizationResult {
    const opts = {
      N: MASTER_EQUATION_N,
      iterations: 5,
      lambda: PHI_NEG2,
      includeClosure: false,
      ...options,
    };

    // Stage 1: Generate latent potential
    const potential = this.latentPotentialField(scale, opts.N);
    const { phaseAngles, amplitudes } = this.potentialComponents(scale, opts.N);

    // Stage 2: Measure distinction
    const distinction = this.distinctionOperator(potential, boundary);

    // Stage 3: Stabilize toward actuality
    const actualized = opts.includeClosure
      ? this.stabilizationFilterWithClosure(potential, boundary, opts.iterations, opts.lambda)
      : this.stabilizationFilter(potential, boundary, opts.iterations, opts.lambda);

    // Evaluate existence
    const existenceScore = ExistenceDetector.evaluate(
      actualized,
      potential, // previous = potential (the "before" state)
      boundary
    );

    return {
      potential,
      distinction,
      actualized,
      existenceScore,
      phaseAngles,
      amplitudes,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Multiscale Actualization
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Run the actualization pipeline at multiple scales and blend the results.
   *
   * [PHIL] — Actuality is not absolute in a naive sense. It is scale-qualified.
   * A pattern may be stable at one scale and unstable at another. Multiscale
   * actualization computes the pipeline at multiple scales and blends the
   * results using φ-scale proportional weights.
   *
   * [MATH] — E_blend = Σ w_i · E_i where w_i = φ^(-i) / Σ φ^(-j).
   * Finer scales (higher i) get less weight, coarser scales get more weight.
   *
   * @param scales — Array of scale indices to actualize at.
   * @param boundary — Boundary field (used for all scales, or provide array).
   * @param options — Optional parameters.
   * @returns Blended actualization result.
   */
  static multiscaleActualize(
    scales: number[],
    boundary: Float64Array | Float64Array[],
    options?: {
      N?: number;
      iterations?: number;
      lambda?: number;
      includeClosure?: boolean;
    }
  ): ActualizationResult {
    if (scales.length === 0) {
      return {
        potential: new Float64Array(0),
        distinction: new Float64Array(0),
        actualized: new Float64Array(0),
        existenceScore: {
          signalScore: 0 as Float64,
          persistenceScore: 0 as Float64,
          coherenceScore: 0 as Float64,
          relationScore: 0 as Float64,
          exists: false,
          overallScore: 0 as Float64,
        },
        phaseAngles: new Float64Array(0),
        amplitudes: new Float64Array(0),
      };
    }

    const results: ActualizationResult[] = [];
    for (let i = 0; i < scales.length; i++) {
      const b = Array.isArray(boundary) ? boundary[i] ?? boundary[0] : boundary;
      results.push(this.actualize(scales[i], b, options));
    }

    // Blend actualized fields using φ^(-i) weights
    const maxLen = Math.max(...results.map(r => r.actualized.length));
    const blended = new Float64Array(maxLen);
    let totalWeight = 0.0;

    for (let i = 0; i < results.length; i++) {
      const weight = Math.pow(PHI_INV, i);
      const actualized = results[i].actualized;
      for (let j = 0; j < actualized.length && j < maxLen; j++) {
        blended[j] += (actualized[j] ?? 0) * weight;
      }
      totalWeight += weight;
    }

    for (let j = 0; j < maxLen; j++) {
      blended[j] = (blended[j] / (totalWeight + 1e-300)) as Float64;
    }

    // Use the first (coarsest) scale's existence score and components
    return {
      ...results[0],
      actualized: blended,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Utility: Actualization Quality Metrics
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the quality of actualization: how well the potential was converted
   * into a stable, existent form.
   *
   * [MATH] — Q = (E_exists · E_overallScore · (1 - mean_distinction)) / φ.
   * High quality = the actualized form is existent, coherent, and closely
   * matches the boundary (low distinction = good stabilization).
   *
   * @param result — Actualization result.
   * @returns Quality score in [0, 1].
   */
  static quality(result: ActualizationResult): Float64 {
    const exists = result.existenceScore.exists ? 1.0 : 0.0;
    const score = result.existenceScore.overallScore;

    // Mean distinction (lower = better)
    let meanDistinction = 0.0;
    for (let i = 0; i < result.distinction.length; i++) {
      meanDistinction += result.distinction[i] ?? 0;
    }
    meanDistinction /= (result.distinction.length + 1e-300);

    // Quality = exists · score · (1 - normalized_distinction) / φ
    const normalizedDist = meanDistinction / (1.0 + meanDistinction); // sigmoid-like normalization
    const quality = exists * score * (1.0 - normalizedDist) / PHI;

    return (quality < 0 ? 0 : quality > 1 ? 1 : quality) as Float64;
  }

  /**
   * Compute the "actualization efficiency": how much of the potential was
   * successfully converted into actualized form.
   *
   * [MATH] — Efficiency = |<actualized | potential>|² / (|actualized|² · |potential|²).
   * Measures how much of the original potential structure was preserved in
   * the actualized form. High efficiency = most potential was retained.
   */
  static efficiency(result: ActualizationResult): Float64 {
    const actualized = result.actualized;
    const potential = result.potential;
    const len = Math.min(actualized.length, potential.length);
    if (len === 0) return 0 as Float64;

    let dot = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < len; i++) {
      const a = actualized[i] ?? 0;
      const b = potential[i] ?? 0;
      dot += a * b;
      normA += a * a;
      normB += b * b;
    }

    const product = normA * normB;
    if (product === 0) return 0 as Float64;

    const raw = (dot * dot) / product;
    return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
  }
}
