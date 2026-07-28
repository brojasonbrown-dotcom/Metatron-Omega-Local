/**
 * RHUFT v13 — Existence Detector: Chapter 1 — Existence = Stabilized Distinction
 *
 * Implements a computational detector that scores a field against four thresholds:
 * signal, persistence, coherence, and relational compatibility. A pattern exists
 * if and only if it satisfies all four thresholds simultaneously.
 *
 * [PHIL] — Existence is stabilized distinction. A pattern may be stable at one
 * scale and unstable at another. Therefore, existence is graded, recursive, and
 * scale-dependent. To exist is to survive recursive self-measurement.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 */

import {
  PHI,
  PHI_INV,
  PHI_NEG2,
  PI,
  COHERENCE_THRESHOLD,
} from "./core/constants.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Existence Thresholds — Four Criteria for Existence
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The four thresholds that a field must satisfy to "exist" in the RHUFT ontology.
 *
 * [PHIL] — A computational pattern exists if it satisfies:
 *   1. Signal threshold: distinguishable from noise/background
 *   2. Persistence threshold: survives across update steps
 *   3. Coherence threshold: remains internally structured under recurrence
 *   4. Relational threshold: remains compatible with surrounding field constraints
 */
export interface ExistenceThresholds {
  /** Minimum distinguishable amplitude (signal above noise). */
  readonly signal: Float64;
  /** Minimum temporal coherence across ticks (survival). */
  readonly persistence: Float64;
  /** Minimum internal geometric coherence (structured, not random). */
  readonly coherence: Float64;
  /** Minimum compatibility with boundary/environment (relates to context). */
  readonly relation: Float64;
}

/**
 * The complete existence score for a field.
 */
export interface ExistenceScore {
  /** Signal score: max(|Ψ|) / (mean(|Ψ|) + ε). */
  readonly signalScore: Float64;
  /** Persistence score: |<Ψ_t | Ψ_{t-1}>|² / (|Ψ_t|² · |Ψ_{t-1}|²). */
  readonly persistenceScore: Float64;
  /** Coherence score: 1 / (1 + variance(|Ψ|)). */
  readonly coherenceScore: Float64;
  /** Relation score: |<Ψ | boundary>|² / (|Ψ|² · |boundary|²). */
  readonly relationScore: Float64;
  /** True if ALL four scores exceed their thresholds. */
  readonly exists: boolean;
  /** Average of four scores. */
  readonly overallScore: Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ExistenceDetector — The Four-Threshold Existence Test
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detects whether a field state qualifies as an "existent" pattern in the RHUFT
 * ontology by scoring it against four thresholds.
 *
 * [PHIL] — To exist is to survive recursive self-measurement. This detector
 * implements the computational translation of that principle: a field exists
 * if it has signal above noise, persists across time, maintains internal
 * coherence, and remains compatible with its boundary/environment.
 */
export class ExistenceDetector {
  /**
   * Default thresholds: all φ-scale proportional.
   *
   * [SPEC] — signal = 1e-6 (above noise floor)
   * persistence = 0.5 (more than half coherence retained)
   * coherence = 0.382 (λ = 1/φ² threshold)
   * relation = 0.2 (some boundary compatibility)
   */
  static readonly DEFAULT_THRESHOLDS: ExistenceThresholds = {
    signal: 1e-6 as Float64,
    persistence: 0.5 as Float64,
    coherence: COHERENCE_THRESHOLD,
    relation: 0.2 as Float64,
  };

  /**
   * Evaluate a field state against the four existence thresholds.
   *
   * @param field — Current field state (interleaved complex).
   * @param previousField — Previous field state (or null for first tick).
   * @param boundaryField — Boundary/environment field.
   * @param thresholds — Optional custom thresholds (defaults used if not provided).
   * @returns Complete existence score.
   */
  static evaluate(
    field: Float64Array,
    previousField: Float64Array | null,
    boundaryField: Float64Array,
    thresholds?: Partial<ExistenceThresholds>
  ): ExistenceScore {
    const merged: ExistenceThresholds = {
      signal: thresholds?.signal ?? this.DEFAULT_THRESHOLDS.signal,
      persistence: thresholds?.persistence ?? this.DEFAULT_THRESHOLDS.persistence,
      coherence: thresholds?.coherence ?? this.DEFAULT_THRESHOLDS.coherence,
      relation: thresholds?.relation ?? this.DEFAULT_THRESHOLDS.relation,
    };

    const signalScore = this._signalScore(field);
    const persistenceScore = this._persistenceScore(field, previousField);
    const coherenceScore = this._coherenceScore(field);
    const relationScore = this._relationScore(field, boundaryField);

    const exists =
      signalScore >= merged.signal &&
      persistenceScore >= merged.persistence &&
      coherenceScore >= merged.coherence &&
      relationScore >= merged.relation;

    const overallScore = (signalScore + persistenceScore + coherenceScore + relationScore) / 4.0;

    return {
      signalScore,
      persistenceScore,
      coherenceScore,
      relationScore,
      exists,
      overallScore,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Individual Score Computations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Signal score: max(|Ψ|) / (mean(|Ψ|) + ε).
   *
   * [MATH] — High score = strong signal above background. A peak that stands
   * out from the average field level. Range: [0, ∞), but typically [0, 10].
   * We clamp to [0, 10] for numerical safety.
   */
  private static _signalScore(field: Float64Array): Float64 {
    const n = Math.floor(field.length / 2);
    if (n === 0) return 0 as Float64;

    let maxMag = 0.0;
    let sumMag = 0.0;

    for (let i = 0; i < n; i++) {
      const re = field[2 * i] ?? 0;
      const im = field[2 * i + 1] ?? 0;
      const mag = Math.sqrt(re * re + im * im);
      if (mag > maxMag) maxMag = mag;
      sumMag += mag;
    }

    const meanMag = sumMag / n;
    const score = maxMag / (meanMag + 1e-300);

    // Clamp to [0, 10]
    return (score < 0 ? 0 : score > 10 ? 10 : score) as Float64;
  }

  /**
   * Persistence score: |<Ψ_t | Ψ_{t-1}>|² / (|Ψ_t|² · |Ψ_{t-1}|²).
   *
   * [MATH] — Normalized complex inner product between current and previous.
   * Range [0, 1]. 1 = identical states (perfect persistence), 0 = orthogonal.
   * If no previous field, returns 1.0 (max persistence — no prior to decay from).
   */
  private static _persistenceScore(
    field: Float64Array,
    previousField: Float64Array | null
  ): Float64 {
    if (previousField === null || previousField.length !== field.length) {
      return 1.0 as Float64;
    }

    const n = Math.floor(field.length / 2);
    if (n === 0) return 0 as Float64;

    let dotRe = 0.0;
    let dotIm = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < n; i++) {
      const aRe = field[2 * i] ?? 0;
      const aIm = field[2 * i + 1] ?? 0;
      const bRe = previousField[2 * i] ?? 0;
      const bIm = previousField[2 * i + 1] ?? 0;

      dotRe += aRe * bRe + aIm * bIm;
      dotIm += aRe * bIm - aIm * bRe;
      normA += aRe * aRe + aIm * aIm;
      normB += bRe * bRe + bIm * bIm;
    }

    const product = normA * normB;
    if (product === 0) return 0 as Float64;

    const magnitudeSq = dotRe * dotRe + dotIm * dotIm;
    const raw = magnitudeSq / product;
    return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
  }

  /**
   * Coherence score: 1 / (1 + variance(|Ψ|)).
   *
   * [MATH] — Variance of magnitudes. High coherence = uniform magnitudes
   * (stable, structured). Low coherence = wildly varying magnitudes (chaotic).
   * Range [0, 1]. 1 = perfectly uniform (max coherence), 0 = infinite variance.
   */
  private static _coherenceScore(field: Float64Array): Float64 {
    const n = Math.floor(field.length / 2);
    if (n === 0) return 0 as Float64;

    const magnitudes = new Float64Array(n);
    let sum = 0.0;
    let sumSq = 0.0;

    for (let i = 0; i < n; i++) {
      const re = field[2 * i] ?? 0;
      const im = field[2 * i + 1] ?? 0;
      const mag = Math.sqrt(re * re + im * im);
      magnitudes[i] = mag;
      sum += mag;
      sumSq += mag * mag;
    }

    const mean = sum / n;
    const variance = (sumSq / n) - (mean * mean);
    const score = 1.0 / (1.0 + Math.abs(variance));

    return (score < 0 ? 0 : score > 1 ? 1 : score) as Float64;
  }

  /**
   * Relation score: |<Ψ | boundary>|² / (|Ψ|² · |boundary|²).
   *
   * [MATH] — Normalized complex inner product between field and boundary.
   * Measures how compatible the field is with its environment/boundary.
   * Range [0, 1]. 1 = perfectly aligned, 0 = orthogonal.
   */
  private static _relationScore(
    field: Float64Array,
    boundaryField: Float64Array
  ): Float64 {
    const len = Math.min(field.length, boundaryField.length);
    if (len === 0) return 0 as Float64;

    if (len % 2 === 0) {
      // Interleaved complex
      const n = len / 2;
      let dotRe = 0.0;
      let dotIm = 0.0;
      let normA = 0.0;
      let normB = 0.0;

      for (let i = 0; i < n; i++) {
        const aRe = field[2 * i] ?? 0;
        const aIm = field[2 * i + 1] ?? 0;
        const bRe = boundaryField[2 * i] ?? 0;
        const bIm = boundaryField[2 * i + 1] ?? 0;

        dotRe += aRe * bRe + aIm * bIm;
        dotIm += aRe * bIm - aIm * bRe;
        normA += aRe * aRe + aIm * aIm;
        normB += bRe * bRe + bIm * bIm;
      }

      const product = normA * normB;
      if (product === 0) return 0 as Float64;

      const magnitudeSq = dotRe * dotRe + dotIm * dotIm;
      const raw = magnitudeSq / product;
      return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
    } else {
      // Real-valued
      let dot = 0.0;
      let normA = 0.0;
      let normB = 0.0;

      for (let i = 0; i < len; i++) {
        const a = field[i] ?? 0;
        const b = boundaryField[i] ?? 0;
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

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Utility: Existence Probability
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute a continuous "existence probability" from the four scores.
   *
   * [MATH] — P(exists) = Π σ((score_i - threshold_i) / φ) where σ is a
   * smooth sigmoid function. This gives a continuous [0, 1] measure that
   * smoothly transitions around the thresholds rather than being binary.
   *
   * @param score — The existence score.
   * @param thresholds — The thresholds to compare against.
   * @returns Existence probability in [0, 1].
   */
  static existenceProbability(
    score: ExistenceScore,
    thresholds: ExistenceThresholds
  ): Float64 {
    // Smooth sigmoid: σ(x) = 1 / (1 + exp(-x))
    // We use a simplified version: σ(x) = 0.5 + 0.5 · tanh(x)
    const sigmoid = (x: number): number => {
      const t = Math.tanh(x);
      return 0.5 + 0.5 * t;
    };

    const pSignal = sigmoid((score.signalScore - thresholds.signal) / PHI_INV);
    const pPersistence = sigmoid((score.persistenceScore - thresholds.persistence) / PHI_INV);
    const pCoherence = sigmoid((score.coherenceScore - thresholds.coherence) / PHI_INV);
    const pRelation = sigmoid((score.relationScore - thresholds.relation) / PHI_INV);

    // Product of all four (AND-like)
    const probability = pSignal * pPersistence * pCoherence * pRelation;

    return (probability < 0 ? 0 : probability > 1 ? 1 : probability) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Utility: Scale-Dependent Existence
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute scale-dependent thresholds: stricter at higher scales.
   *
   * [PHIL] — Existence is scale-dependent. A pattern may be stable at one
   * scale and unstable at another. Higher scales (more complex) require
   * stricter thresholds to maintain existence.
   *
   * [MATH] — threshold_i(scale) = base_threshold_i · φ^(-scale/89).
   * This uses the QRF attenuation law to scale the thresholds.
   *
   * @param scale — Scale index n.
   * @param baseThresholds — Base thresholds (default = DEFAULT_THRESHOLDS).
   * @returns Scale-adjusted thresholds.
   */
  static scaleDependentThresholds(
    scale: number,
    baseThresholds: ExistenceThresholds = ExistenceDetector.DEFAULT_THRESHOLDS
  ): ExistenceThresholds {
    const qrf = Math.pow(PHI, -scale / 89.0);
    return {
      signal: (baseThresholds.signal * qrf) as Float64,
      persistence: (baseThresholds.persistence * qrf) as Float64,
      coherence: (baseThresholds.coherence * qrf) as Float64,
      relation: (baseThresholds.relation * qrf) as Float64,
    };
  }
}
