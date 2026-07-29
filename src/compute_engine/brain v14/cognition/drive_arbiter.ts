/**
 * RHUFT Mind — Drive Arbiter: why the engine acts
 *
 * Epistemic Status: [SPEC] + [PHIL] — Cognition layer, read-only use of the
 * existing drive primitives (PerfectionDeficit, InformationDensity,
 * NecessityComplexity, BurdenTracker). No engine file is modified.
 *
 * [PHIL] — The mind does not act because it is prompted. It acts because its
 * own field state demands it: imperfection (ε) is pressure toward novelty,
 * surprise is broken persistence, richness is unresolved structure, and
 * burden is the honest cost that throttles everything.
 *
 * All weights are φ-proportional constants [SPEC]; gating is fully
 * deterministic — thresholds compared to drive scalars, never RNG.
 */

import { BurdenTracker } from "./../BurdenTracker.ts";
import { COHERENCE_THRESHOLD, PHI_INV } from "./../core/constants.ts";
import type { ExistenceScore } from "./../existence_detector.ts";
import { InformationDensity } from "./../information_density.ts";
import { NecessityComplexity } from "./../NecessityComplexity.ts";
import { computePerfectionDeficit } from "./../PerfectionDeficit.ts";

/**
 * Forced-use bootstrap window: for the first 144 stable thoughts (F_12
 * [SPEC]) the mind MUST act on every stable thought — it is forced to use
 * its tools until it has physically learned their benefit (explicit user
 * requirement). Afterwards the deterministic drive gate takes over.
 */
export const BOOTSTRAP_THOUGHTS = 144;

/** Per-tick drive scalars, all in [0, 1]. */
export interface DriveState {
  /** Pressure to explore/learn: ε-novelty + surprise + richness, φ-weighted. */
  readonly curiosity: number;
  /** Pressure to act NOW: surprise + stabilization cost, φ-weighted. */
  readonly urgency: number;
  /** Pressure to slow down: rising burden trend. */
  readonly throttle: number;
}

/** What the mind decides to do about a stable thought. */
export type MindAction = "name" | "define" | "relate" | "verify" | "lexical" | "none";

/** Recognition summary handed to the arbiter by the cognitive loop. */
export interface RecognitionInput {
  /** True if the thought resonated with a known concept (≥ λ). */
  readonly known: boolean;
  /** Top resonance against the concept registry, [0, 1]. */
  readonly topResonance: number;
  /** Reinforcement count of the matched concept (0 if unknown). */
  readonly reinforcement: number;
  /** Number of labels attached to the matched concept (0 if unknown). */
  readonly labelCount: number;
  /** M6 — verified surprise (1 - R)^phi of the prediction that produced this thought. */
  readonly surprise?: number;
  /** M6 — verified prediction gain vs the phi-prior. */
  readonly predictionGain?: number;
  /**
   * M7 — true when the concept already has a glossary gloss (a define ran).
   * A defined concept with ≥ 1 label is the candidate for the lexical
   * instrument: grow its grounded relation graph (is-a/part-of/...). [SPEC]
   */
  readonly defined?: boolean;
}

/** φ-proportional weights for curiosity: φ⁻¹, φ⁻², φ⁻³. [SPEC] */
const W_NOVELTY = PHI_INV;
const W_SURPRISE = PHI_INV * PHI_INV;
const W_RICHNESS = PHI_INV * PHI_INV * PHI_INV;
const W_SUM = W_NOVELTY + W_SURPRISE + W_RICHNESS;

/** Reinforcement above which a concept counts as "deep enough": φ² ≈ 2.618. [SPEC] */
const SHALLOW_REINFORCEMENT = 1.0 / COHERENCE_THRESHOLD; // φ² (λ = 1/φ²)

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : Number.isFinite(x) ? x : 0;
}

export class DriveArbiter {
  private readonly _burden = new BurdenTracker();
  private _prevDensity: number | null = null;
  private _needStructure = false;
  private _state: DriveState = { curiosity: 1, urgency: 0, throttle: 0 };

  /** Current drive state (last tick's evaluation). */
  get state(): DriveState {
    return this._state;
  }

  /** True when NecessityComplexity signalled "grow more structure" last tick. */
  get needStructure(): boolean {
    return this._needStructure;
  }

  /**
   * Evaluate drives for one tick of the root field. Read-only math on the
   * existing primitives — nothing here mutates engine state.
   */
  tick(field: Float64Array, prevField: Float64Array | null, score: ExistenceScore): DriveState {
    // 1. Novelty pressure: perfection deficit ε of the current field. [SPEC]
    const novelty = clamp01(computePerfectionDeficit(field, true));

    // 2. Surprise: broken persistence across ticks. [SPEC]
    const surprise = clamp01(1.0 - score.persistenceScore);

    // 3. Richness: information density of the current percept. [SPEC]
    const analysis = InformationDensity.analyze(field, prevField, 1, score.coherenceScore);
    const richness = clamp01(analysis.density);

    // 4. Need-more-structure: positive marginal return on complexity. [SPEC]
    const dJ_dChi = this._prevDensity === null ? 0 : analysis.density - this._prevDensity;
    this._needStructure = NecessityComplexity.shouldComplexify(analysis.complexity, dJ_dChi);
    this._prevDensity = analysis.density;

    // 5. Throttle: rising burden trend on the root node. [SPEC]
    this._burden.update("root", prevField ?? field, field, prevField, 0, []);
    const trend = this._burden.burdenTrend("root");
    const throttle = clamp01(trend > 0 ? trend * (1.0 / PHI_INV) : 0); // φ·trend

    const curiosity = clamp01(
      (W_NOVELTY * novelty + W_SURPRISE * surprise + W_RICHNESS * richness) / W_SUM
    );
    const urgency = clamp01(
      (W_NOVELTY * surprise + W_SURPRISE * analysis.stabilizationCost) / (W_NOVELTY + W_SURPRISE)
    );

    this._state = { curiosity, urgency, throttle };
    return this._state;
  }

  /**
   * Decide WHICH tool a stable thought warrants. Fully deterministic. [SPEC]
   *
   * - Bootstrap window (first 144 stable thoughts): always act — forced use.
   * - After: act only when curiosity clears a gate that RISES as the lexicon
   *   deepens (λ·(1 − φ^-(k+1)), k = ⌊ln(1 + totalReinforcement)⌋) — the mind
   *   earned selectivity by learning. [SPEC]
   * - Unknown percept → name (never throttled: identity precedes depth).
   * - Known but shallow → relate (≥ 2 labels) else define.
   * - Known and deep, but structure pressure → verify (mathstral).
   */
  chooseAction(
    recognition: RecognitionInput,
    stableThoughtCount: number,
    totalReinforcement: number
  ): MindAction {
    const bootstrap = stableThoughtCount <= BOOTSTRAP_THOUGHTS;

    if (!bootstrap) {
      const k = Math.floor(Math.log(1.0 + Math.max(0, totalReinforcement)));
      const gate = COHERENCE_THRESHOLD * (1.0 - Math.pow(PHI_INV, k + 1));
      if (this._state.curiosity < gate) return "none";
    }

    if (!recognition.known) {
      return "name"; // identity precedes depth — never throttled. [SPEC]
    }

    const throttled = this._state.throttle >= COHERENCE_THRESHOLD && !bootstrap;
    if (throttled) return "none";

    if (recognition.reinforcement < SHALLOW_REINFORCEMENT) {
      return recognition.labelCount >= 2 ? "relate" : "define";
    }

    // M7 — a DEFINED concept with labels is language the mind already holds:
    // grow its grounded relation graph with the lexical instrument. This is the
    // language front deepening — words the mind knows the meaning of now learn
    // how they connect (is-a / part-of / opposite-of / related-to). [SPEC]
    if (recognition.defined === true && recognition.labelCount >= 1) return "lexical";

    if (this._needStructure) return "verify";

    // M6 — a concept the mind still cannot PREDICT is worth verifying even when
    // no structure pressure fires: surprise above the coherence threshold means
    // the prediction failed badly, and verification is how mastery is earned.
    if (!bootstrap && (recognition.surprise ?? 0) >= COHERENCE_THRESHOLD) return "verify";

    return bootstrap ? "define" : "none"; // bootstrap always exercises a tool. [SPEC]
  }
}
