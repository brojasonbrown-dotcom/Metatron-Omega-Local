/**
 * RHUFT v13 — Self Measurement: Chapter 7 — Self-Measurement, Reflection, and the Emergence of Time
 *
 * Implements the four-stage self-measurement cycle:
 *   1. Projection — express field outward as relational possibility
 *   2. Reflection — simulate return from environment/boundary/complement
 *   3. Comparison — compute discrepancy between current and returned trace
 *   4. Stabilization — resolve discrepancy under lawful constraints
 *
 * [PHIL] — The universe cannot be measured from outside, because there is no
 * external observer of the whole. Therefore reality must become real through
 * self-measurement. Time is the ordered record of recursive self-measurement
 * and stabilization. Memory is a precondition for temporal continuity.
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
  CLOSURE_COUPLING,
  PI,
} from "./core/constants.ts";

import {
  phaseComparison,
  phaseDriftMetric,
  weightedPhaseDrift,
  toroidalShift,
  delayedFeedback,
} from "./torus_recurrence.ts";
import { at } from "./core/indexing.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Self-Measurement Cycle Result
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of a complete self-measurement cycle.
 *
 * [PHIL] — The four stages produce a complete trace of how the field
 * measured itself, what it found, and how it stabilized. This is the
 * ontological engine of time and consciousness in RHUFT.
 */
export interface SelfMeasurementResult {
  /** Stage 1: The projected field (outward expression). */
  readonly projected: Float64Array;
  /** Stage 2: The reflected trace (return from environment). */
  readonly reflected: Float64Array;
  /** Stage 3: The discrepancy vector (current - reflected). */
  readonly discrepancy: Float64Array;
  /** Stage 4: The stabilized next state. */
  readonly nextState: Float64Array;
  /** Phase drift: how much the returned trace differs from current. */
  readonly phaseDrift: Float64;
  /** Weighted phase drift (emphasizes large deviations). */
  readonly weightedPhaseDrift: Float64;
  /** Coherence between current and next state. */
  readonly temporalCoherence: Float64;
  /** Memory retention score: how much prior state persists. */
  readonly memoryRetention: Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SelfMeasurementCycle Class — The Four-Stage Ontological Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Implements the four-stage self-measurement cycle:
 *   Ψ_{t+1} = S(Ψ_t, C(Ψ_t, R[P[Ψ_t]; E_t]); L)
 *
 * [PHIL] — This is the core recursive update of RHUFT. The field:
 *   1. Projects itself outward (P)
 *   2. Encounters the environment/boundary and reflects (R)
 *   3. Compares the returned trace with its current state (C)
 *   4. Stabilizes toward the next admissible state (S)
 *
 * Time is the ordered record of these recursive updates.
 */
export class SelfMeasurementCycle {
  /**
   * Stage 1: Projection — Express the field outward as relational possibility.
   *
   * [PHIL] — Projection is the field's outward expression into relational
   * possibility. In the simplest case, the field IS its own projection: it
   * expresses itself as it is. More complex projections may involve directional
   * filtering, scale-dependent weighting, or complement-specific amplification.
   *
   * [MATH] — P[Ψ] = Ψ (identity projection for the geometric field ontology).
   *
   * @param field — Current field state Ψ_t.
   * @returns Projected field Y_t (copy of input).
   */
  project(field: Float64Array): Float64Array {
    return new Float64Array(field); // identity projection
  }

  /**
   * Stage 2: Reflection — Simulate return from environment/boundary.
   *
   * [PHIL] — Reflection is the return of the projected structure after
   * encountering the environment or boundary. The boundary acts as a
   * "mirror" that reflects the field back with modifications. The fidelity
   * parameter controls how much of the projection is returned versus how
   * much is absorbed or transformed by the boundary.
   *
   * [MATH] — Ỹ_t = (1/φ)·Y_t + (1/φ²)·B where B is the boundary field.
   * The weights are φ-scale proportional: φ⁻¹ ≈ 0.618 for the projection,
   * φ⁻² ≈ 0.382 for the boundary. This ensures the reflected trace is a
   * weighted blend that respects the golden ratio proportion.
   *
   * @param projected — Projected field Y_t.
   * @param boundaryField — Boundary/environment field B.
   * @param fidelity — Reflection fidelity (0–1, default 1/φ). Higher = more projection returned.
   * @returns Reflected trace Ỹ_t.
   */
  reflect(
    projected: Float64Array,
    boundaryField: Float64Array,
    fidelity: number = PHI_INV
  ): Float64Array {
    const len = Math.min(projected.length, boundaryField.length);
    if (len === 0) return new Float64Array(0);

    const result = new Float64Array(len);
    // Weighted blend: fidelity·projected + (1-fidelity)·boundary
    // With φ-scale default: (1/φ)·projected + (1/φ²)·boundary
    const projWeight = fidelity;
    const boundWeight = 1.0 - fidelity;

    for (let i = 0; i < len; i++) {
      const p = projected[i] ?? 0;
      const b = boundaryField[i] ?? 0;
      result[i] = (projWeight * p + boundWeight * b) as Float64;
    }

    return result;
  }

  /**
   * Stage 3: Comparison — Compute discrepancy between current and reflected.
   *
   * [PHIL] — Comparison is the birth of distinction, error, and correction.
   * Without reflection, there is no self-measurement. Without comparison,
   * there is no temporal sequence. The discrepancy vector Δ_t = Ψ_t - Ỹ_t
   * measures how much the field's current state differs from what it
   * received back from the environment.
   *
   * [MATH] — Δ_t = C(Ψ_t, Ỹ_t) = Ψ_t - Ỹ_t (element-wise difference).
   *
   * @param current — Current field Ψ_t.
   * @param reflected — Reflected trace Ỹ_t.
   * @returns Discrepancy vector Δ_t.
   */
  compare(current: Float64Array, reflected: Float64Array): Float64Array {
    const len = Math.min(current.length, reflected.length);
    if (len === 0) return new Float64Array(0);

    const result = new Float64Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = ((current[i] ?? 0) - (reflected[i] ?? 0)) as Float64;
    }

    return result;
  }

  /**
   * Stage 4: Stabilization — Resolve discrepancy under lawful constraints.
   *
   * [PHIL] — Stabilization selects the next admissible state by resolving
   * the discrepancy toward the boundary condition. The field moves toward
   * what the boundary "wants" (its ideal form) while retaining its current
   * structure. This is the core of RHUFT existence: to exist is to survive
   * recursive self-measurement.
   *
   * [MATH] — Ψ_{t+1} = Ψ_t + κ·Δ_t + λ·(B - Ψ_t) where:
   *   κ = CLOSURE_COUPLING = 1/(φ·π) ≈ 0.1967 (discrepancy correction rate)
   *   λ = PHI_NEG2 = 1/φ² ≈ 0.382 (boundary attraction rate)
   *   B = boundaryField (the ideal/target state)
   *   Δ_t = discrepancy vector from compare()
   *
   * The result is clamped to prevent overflow and NaN.
   *
   * @param current — Current field Ψ_t.
   * @param discrepancy — Discrepancy vector Δ_t.
   * @param boundaryField — Boundary field B (ideal/target state).
   * @returns Stabilized next state Ψ_{t+1}.
   */
  stabilize(
    current: Float64Array,
    discrepancy: Float64Array,
    boundaryField: Float64Array
  ): Float64Array {
    const len = Math.min(current.length, discrepancy.length, boundaryField.length);
    if (len === 0) return new Float64Array(0);

    const kappa = CLOSURE_COUPLING;  // ≈ 0.1967
    const lambda = PHI_NEG2;          // ≈ 0.382
    const result = new Float64Array(len);

    for (let i = 0; i < len; i++) {
      const c = current[i] ?? 0;
      const d = discrepancy[i] ?? 0;
      const b = boundaryField[i] ?? 0;

      // Next state: current + κ·discrepancy + λ·(boundary - current)
      let next = c + kappa * d + lambda * (b - c);

      // Clamp to prevent overflow/NaN (Float64 safe range ±1e150)
      if (!isFinite(next)) next = 0;
      if (next > 1e150) next = 1e150;
      if (next < -1e150) next = -1e150;

      result[i] = next as Float64;
    }

    return result;
  }

  /**
   * Full self-measurement cycle: runs all four stages in sequence.
   *
   * [PHIL] — This is the complete recursive update of the field. It embodies
   * the RHUFT doctrine that time is the ordered record of self-measurement
   * and stabilization. Each cycle is one "tick" of ontological time.
   *
   * [MATH] — Ψ_{t+1} = S(Ψ_t, C(Ψ_t, R[P[Ψ_t]; E_t]); L)
   *
   * @param field — Current field Ψ_t.
   * @param boundaryField — Boundary field B (the environment/ideal).
   * @param fidelity — Reflection fidelity (default 1/φ).
   * @returns Complete self-measurement result with all stages and metrics.
   */
  cycle(
    field: Float64Array,
    boundaryField: Float64Array,
    fidelity: number = PHI_INV
  ): SelfMeasurementResult {
    // Stage 1: Projection
    const projected = this.project(field);

    // Stage 2: Reflection
    const reflected = this.reflect(projected, boundaryField, fidelity);

    // Stage 3: Comparison
    const discrepancy = this.compare(field, reflected);

    // Stage 4: Stabilization
    const nextState = this.stabilize(field, discrepancy, boundaryField);

    // Metrics
    const pDrift = phaseDriftMetric(field, nextState);
    const wDrift = weightedPhaseDrift(field, nextState);
    const tCoh = this._temporalCoherence(field, nextState);
    const retention = this._memoryRetention(pDrift);

    return {
      projected,
      reflected,
      discrepancy,
      nextState,
      phaseDrift: pDrift,
      weightedPhaseDrift: wDrift,
      temporalCoherence: tCoh,
      memoryRetention: retention,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. Temporal Coherence & Memory Retention Metrics
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Compute temporal coherence between two field states.
   *
   * [MATH] — C_time = |<Ψ_t | Ψ_{t+1}>|² / (|Ψ_t|² · |Ψ_{t+1}|²).
   * This is the normalized complex inner product between successive states.
   * Range [0, 1]. 1 = identical states (perfect continuity), 0 = orthogonal.
   *
   * @param current — Current field Ψ_t.
   * @param next — Next field Ψ_{t+1}.
   * @returns Temporal coherence in [0, 1].
   */
  private _temporalCoherence(current: Float64Array, next: Float64Array): Float64 {
    const len = Math.min(current.length, next.length);
    if (len === 0) return 0 as Float64;
    if (len % 2 !== 0) {
      // Not interleaved complex: use simple dot product
      let dot = 0.0;
      let normA = 0.0;
      let normB = 0.0;
      for (let i = 0; i < len; i++) {
        const a = current[i] ?? 0;
        const b = next[i] ?? 0;
        dot += a * b;
        normA += a * a;
        normB += b * b;
      }
      const product = normA * normB;
      if (product === 0) return 0 as Float64;
      const raw = (dot * dot) / product;
      return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
    }

    // Interleaved complex: use complex inner product
    const n = len / 2;
    let dotRe = 0.0;
    let dotIm = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < n; i++) {
      const aRe = current[2 * i] ?? 0;
      const aIm = current[2 * i + 1] ?? 0;
      const bRe = next[2 * i] ?? 0;
      const bIm = next[2 * i + 1] ?? 0;

      // Complex inner product: <a|b> = Σ a*_i · b_i = Σ (aRe - i·aIm)(bRe + i·bIm)
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
   * Compute memory retention score.
   *
   * [MATH] — Retention = exp(-drift / φ) where φ is the golden ratio.
   * This is an exponential decay with φ-scaled time constant. High drift
   * (unstable field) → low retention. Low drift (stable field) → high retention.
   *
   * @param phaseDrift — Phase drift from phaseDriftMetric().
   * @returns Memory retention in [0, 1].
   */
  private _memoryRetention(phaseDrift: Float64): Float64 {
    const retention = Math.exp(-phaseDrift / PHI);
    return (retention < 0 ? 0 : retention > 1 ? 1 : retention) as Float64;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. Advanced: Predictive Self-Measurement
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Predictive self-measurement: uses the memory of previous cycles to
   * predict the next state before stabilization.
   *
   * [PHIL] — Prediction is a form of anticipatory self-measurement. The
   * field not only measures what IS, but projects what WILL BE based on its
   * memory of past patterns. This is the bridge from simple self-measurement
   * to intelligence and consciousness.
   *
   * [MATH] — Ψ_pred = Ψ_t + κ·(Ψ_t - Ψ_{t-1}) + λ·(B - Ψ_t).
   * This linear extrapolation predicts the next state from the trend of
   * previous updates. The predicted state is then used as the target for
   * stabilization instead of the raw boundary.
   *
   * @param field — Current field Ψ_t.
   * @param previous — Previous field Ψ_{t-1} (or null for first tick).
   * @param boundaryField — Boundary field B.
   * @param fidelity — Reflection fidelity.
   * @returns Predictive self-measurement result.
   */
  predictiveCycle(
    field: Float64Array,
    previous: Float64Array | null,
    boundaryField: Float64Array,
    fidelity: number = PHI_INV
  ): SelfMeasurementResult {
    if (previous === null || previous.length !== field.length) {
      // No prediction possible: fall back to standard cycle
      return this.cycle(field, boundaryField, fidelity);
    }

    // Compute trend: Ψ_t - Ψ_{t-1}
    const trend = new Float64Array(field.length);
    for (let i = 0; i < field.length; i++) {
      trend[i] = (field[i] ?? 0) - (previous[i] ?? 0);
    }

    // Predicted boundary: B_pred = B + trend (boundary adapts to trend)
    const predictedBoundary = new Float64Array(boundaryField.length);
    for (let i = 0; i < boundaryField.length; i++) {
      const b = boundaryField[i] ?? 0;
      const t = trend[i] ?? 0;
      predictedBoundary[i] = (b + t) as Float64;
    }

    // Run cycle with predicted boundary
    return this.cycle(field, predictedBoundary, fidelity);
  }

  /**
   * Multiscale self-measurement: runs the cycle at multiple scales and
   * blends the results using φ-scale proportional weights.
   *
   * [PHIL] — Reality is not measured at a single scale. Self-measurement
   * occurs at all scales simultaneously, with finer scales contributing more
   * to the local detail and coarser scales contributing more to the global
   * structure. The φ-scale weights naturally encode this hierarchy.
   *
   * @param fields — Array of fields at different scales (coarse to fine).
   * @param boundaries — Array of boundary fields at corresponding scales.
   * @returns Blended multiscale result.
   */
  multiscaleCycle(
    fields: Float64Array[],
    boundaries: Float64Array[]
  ): SelfMeasurementResult {
    if (fields.length === 0) {
      return {
        projected: new Float64Array(0),
        reflected: new Float64Array(0),
        discrepancy: new Float64Array(0),
        nextState: new Float64Array(0),
        phaseDrift: 0 as Float64,
        weightedPhaseDrift: 0 as Float64,
        temporalCoherence: 0 as Float64,
        memoryRetention: 0 as Float64,
      };
    }

    // Run cycle at each scale
    const results: SelfMeasurementResult[] = [];
    for (let i = 0; i < fields.length; i++) {
      const boundary = boundaries[i] ?? new Float64Array(at(fields, i).length);
      results.push(this.cycle(at(fields, i), boundary));
    }

    // Blend next states using φ^(-i) weights (finer scales get less weight)
    const maxLen = Math.max(...results.map(r => r.nextState.length));
    const blended = new Float64Array(maxLen);
    let totalWeight = 0.0;

    for (let i = 0; i < results.length; i++) {
      const weight = Math.pow(PHI_INV, i);
      const next = at(results, i).nextState;
      for (let j = 0; j < next.length && j < maxLen; j++) {
        blended[j] = at(blended, j) + (next[j] ?? 0) * weight;
      }
      totalWeight += weight;
    }

    for (let j = 0; j < maxLen; j++) {
      blended[j] = (at(blended, j) / (totalWeight + 1e-300)) as Float64;
    }

    // Use the first (coarsest) scale's metrics as the overall metrics
    return {
      ...results[0],
      nextState: blended,
    };
  }
}
