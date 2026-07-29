/**
 * RHUFT Mind — Prediction Ledger: mastery as verified prediction (M6)
 *
 * Epistemic Status: [MATH] — Cognition layer. ADDITIVE module.
 *
 * [PHIL] — The notebook ontology (PHILOSOPHICAL_FOUNDATION §2, incommensurability)
 * says the field is timeless geometric structure and φ is its most irrational
 * generator. Consequence: there is no arbitrary "0.5 confidence" and no
 * learning-by-accretion. A prediction is a geometric anticipation; it is only
 * as good as the surprise it removes relative to the φ-prior.
 *
 * THE DEFINITION (closed form, deterministic, no RNG):
 *
 *   Prior  B  = 1 − φ⁻²  = φ⁻¹ ≈ 0.6180339887498949
 *     The unconditioned expectation of resonance between the mind's current
 *     episodic prediction and an as-yet-unlearned field. φ⁻² is the coherence
 *     threshold λ — the resonance of a barely-coherent structure. The prior is
 *     what the mind expects with NO mastery: one minus "barely coherent".
 *
 *   Gain   G  = R − B
 *     R is the measured resonance between the predicted attractor and the field
 *     that actually arrived. G > 0 means the memory anticipated reality better
 *     than the φ-prior — the only honest evidence of learning. G ≤ 0 means the
 *     prediction was no better than (or worse than) chance-by-geometry.
 *
 *   Mastery M ← (1 − η) · M + η · G,   η = φ⁻² / (1 + surprise)
 *     The φ-decayed running mean of gains. η is the same decay the registry
 *     uses for prototype reinforcement, divided by (1 + surprise) so genuinely
 *     surprising content moves mastery more slowly (hard things are mastered
 *     slowly — never instantly).
 *
 *   Surprise S = (1 − R)^φ
 *     Broken expectation, φ-weighted. A perfectly predicted field (R = 1) has
 *     zero surprise; an orthogonal one (R = 0) has surprise 1.
 *
 *   LEARNED ⟺ M > 0  AND  n ≥ F₅ = 5 verified predictions.
 *     Positive mean gain (beats the φ-prior) sustained over a Fibonacci number
 *     of independent verifications. Both conditions are REQUIRED: a single lucky
 *     hit is not mastery, and a long history of at-or-below-baseline is not
 *     mastery either. Mastery FALLS when predictions fail — it cannot accrete.
 *
 * All constants are φ-powers (the Wolfram-certificate discipline): B = φ⁻¹,
 * decay = φ⁻², minVerifications = F₅. Nothing is tuned by hand. [SPEC]
 */

import { PHI, PHI_INV, PHI_NEG2 } from "./../core/constants.ts";

/** The unconditioned prior expectation of resonance: B = 1 − λ = φ⁻¹. [MATH] */
export const PREDICTION_BASELINE: number = PHI_INV;

/** φ-decay of the running mastery mean: η₀ = φ⁻² (= λ). [MATH] */
export const MASTERY_DECAY: number = PHI_NEG2;

/** Minimum verified predictions before "learned" can be claimed: F₅ = 5. [MATH] */
export const MIN_VERIFICATIONS: number = 5;

/** One recorded prediction → measurement → gain. */
export interface PredictionOutcome {
  /** The predicted resonance (what the memory expected), or null when no prediction existed. */
  readonly predicted: number | null;
  /** The measured resonance between prediction and the field that arrived. */
  readonly measured: number;
  /** G = measured − baseline: how much better than the φ-prior this was. */
  readonly gain: number;
  /** S = (1 − measured)^φ: broken expectation. */
  readonly surprise: number;
}

/** Mastery state for one concept (or the mind as a whole). */
export interface MasteryState {
  /** φ-decayed running mean of gains. > 0 ⟺ predictions beat the φ-prior. */
  readonly mastery: number;
  /** Number of verified predictions so far. */
  readonly verifications: number;
  /** learned ⟺ mastery > 0 AND verifications ≥ F₅. */
  readonly learned: boolean;
  /** Mean surprise across verifications (how hard this content still is). */
  readonly meanSurprise: number;
}

/**
 * The ledger itself: pure functions + a tiny deterministic accumulator.
 * It stores NOTHING but running statistics — no fields, no geometry — so it
 * is cheap to persist and impossible to confuse with a memory.
 */
export class PredictionLedger {
  private _mastery = 0;
  private _verifications = 0;
  private _surpriseSum = 0;

  get state(): MasteryState {
    return {
      mastery: this._mastery,
      verifications: this._verifications,
      learned: this._mastery > 0 && this._verifications >= MIN_VERIFICATIONS,
      meanSurprise: this._verifications > 0 ? this._surpriseSum / this._verifications : 1,
    };
  }

  /**
   * Score one prediction against the field that actually arrived.
   *
   * @param predicted — The resonance the memory predicted (null if the mind had
   *                    no episodic prediction — an honest "no idea", which is
   *                    scored against the prior but flagged unpredicted).
   * @param measured  — The measured resonance between prediction and reality, [0,1].
   */
  record(predicted: number | null, measured: number): PredictionOutcome {
    const R = clamp01(measured);
    const gain = R - PREDICTION_BASELINE;
    const surprise = Math.pow(1 - R, PHI);
    // η = φ⁻² / (1 + surprise): surprising content moves mastery slowly.
    const eta = MASTERY_DECAY / (1 + surprise);
    this._mastery = (1 - eta) * this._mastery + eta * gain;
    this._verifications += 1;
    this._surpriseSum += surprise;
    return { predicted, measured: R, gain, surprise };
  }

  /** Restore persisted running statistics (validated upstream). */
  restore(mastery: number, verifications: number, meanSurprise: number): void {
    this._mastery = Number.isFinite(mastery) ? mastery : 0;
    this._verifications = Number.isInteger(verifications) && verifications >= 0 ? verifications : 0;
    this._surpriseSum =
      Number.isFinite(meanSurprise) && meanSurprise >= 0 ? meanSurprise * this._verifications : 0;
  }
}

/** The one prediction instrument the mind already owns: its episodic attractors. */
export interface EpisodicPredictor {
  retrieve(query: Float64Array): { ok: boolean; resonance: number };
}

/**
 * Score a concept's mastery from a fresh prediction and the field that arrived.
 * Pure: no mutation. The caller persists the returned MasteryState.
 *
 * @param prior       — The concept's current mastery state.
 * @param predictor   — The episodic memory (Hopfield bank).
 * @param queryField  — The field that was about to be observed.
 * @param arrivedField — The field that actually arrived (usually the same as
 *                       queryField for an observational prediction).
 */
export function verifyPrediction(
  prior: MasteryState,
  predictor: EpisodicPredictor,
  queryField: Float64Array
): { outcome: PredictionOutcome; next: MasteryState } {
  const recall = predictor.retrieve(queryField);
  const predicted = recall.ok ? recall.resonance : null;
  // The prediction IS the recalled attractor's expected resonance with what
  // arrives. When nothing was recalled, the honest expectation is the prior.
  const measured = recall.ok ? recall.resonance : PREDICTION_BASELINE;

  const ledger = new PredictionLedger();
  ledger.restore(prior.mastery, prior.verifications, prior.meanSurprise);
  const outcome = ledger.record(predicted, measured);
  return { outcome, next: ledger.state };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : Number.isFinite(x) ? x : 0;
}
