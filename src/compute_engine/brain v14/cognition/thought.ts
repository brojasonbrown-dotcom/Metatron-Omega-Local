/**
 * RHUFT Mind — Thought: lifecycle of a stabilized distinction
 *
 * Epistemic Status: [SPEC] + [PHIL] — Cognition layer.
 *
 * [PHIL] — A thought is not a token. It is a field configuration that has
 * survived recursive self-measurement: ExistenceDetector says `exists` for
 * PERSISTENCE_TICKS consecutive ticks. Only then is the pattern stable enough
 * to be recognized, voiced, and acted upon.
 *
 * Lifecycle: forming → stable → voiced → verified. [SPEC]
 *
 * The ThoughtTracker also re-arms: while `exists` stays continuously true, a
 * NEW thought fires only when the root field has actually moved away from the
 * previous thought (resonance < COHERENCE_THRESHOLD) — thinking the same
 * thought forever is not thinking.
 */

import { resonance } from "./../adapters/language_codec.ts";
import { COHERENCE_THRESHOLD } from "./../core/constants.ts";
import type { ExistenceScore } from "./../existence_detector.ts";
import type { SensorySource } from "./../schemas/validate.ts";

/** Consecutive `exists` ticks required for a stable thought: 3. [SPEC] */
export const PERSISTENCE_TICKS = 3;

export type ThoughtPhase = "forming" | "stable" | "voiced" | "verified";

/** A stabilized distinction, born from the engine's root field. */
export interface Thought {
  readonly id: string;
  readonly bornAt: number;
  readonly bornTick: number;
  /** Snapshot of the root field at stabilization (unit-independent copy). */
  readonly field: Float64Array;
  /** Existence score at the moment of stabilization. */
  readonly score: ExistenceScore;
  /** Sensory sources that fed the engine since the previous thought. */
  readonly sources: SensorySource[];
  phase: ThoughtPhase;
  /** Labels attached after recognition / naming. */
  labels: string[];
  /** What the mind said about it (set when voiced). */
  spokenText: string | null;
}

export class ThoughtTracker {
  private _consecutiveExists = 0;
  private _lastThoughtField: Float64Array | null = null;
  private _thoughtCounter = 0;
  private _pendingSources: SensorySource[] = [];

  /** Record that a sensory frame reached the engine (provenance for the next thought). */
  noteSource(source: SensorySource): void {
    if (!this._pendingSources.includes(source)) {
      this._pendingSources.push(source);
    }
  }

  /**
   * Feed one tick's existence evaluation of the root field.
   * Returns a new stable Thought exactly when one is born, else null. [SPEC]
   */
  observe(field: Float64Array, score: ExistenceScore, tick: number): Thought | null {
    if (!score.exists) {
      this._consecutiveExists = 0;
      return null;
    }
    this._consecutiveExists++;

    const crossed = this._consecutiveExists === PERSISTENCE_TICKS;
    const moved =
      this._consecutiveExists > PERSISTENCE_TICKS &&
      this._lastThoughtField !== null &&
      resonance(field, this._lastThoughtField) < COHERENCE_THRESHOLD;

    if (!crossed && !moved) return null;

    const snapshot = new Float64Array(field); // decouple from the live root field
    this._lastThoughtField = snapshot;
    this._thoughtCounter++;

    const thought: Thought = {
      id: `t${this._thoughtCounter}`,
      bornAt: Date.now(),
      bornTick: tick,
      field: snapshot,
      score,
      sources: this._pendingSources,
      phase: "stable",
      labels: [],
      spokenText: null,
    };
    this._pendingSources = [];
    return thought;
  }

  get thoughtCount(): number {
    return this._thoughtCounter;
  }
}
