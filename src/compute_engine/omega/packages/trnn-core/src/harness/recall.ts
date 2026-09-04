/**
 * recall — the coherence-gated associative memory (Ω-REAL: Layer C).
 *
 * The field fingerprint (Layer B) gives a deterministic, φ-anchored, unit-norm
 * invariant of a field. This module turns it into an *abstaining* associative
 * memory: nearest-label lookup over stored fingerprints, gated so that silence
 * lands in the right place (the P8 discipline — a confident answer from weak
 * evidence is the failure this exists to remove).
 *
 * Two gates, matching the two abstention error classes:
 *   • distance gate — nearest distance > `maxDistance` ⇒ the field is not in
 *     memory ⇒ abstain (no close match).
 *   • margin gate   — (2nd − 1st) distance < `minMargin` ⇒ two labels are
 *     indistinguishable at this resolution ⇒ abstain (don't flip a coin).
 *
 * Returns a `Verdict` from `harness/abstention`, so it drops straight into the
 * existing `scoreAbstention` / `abstentionGate` battery. Deterministic (composes
 * only `fingerprintDistance`); observe-only, advances no engine state.
 */

import type { Verdict } from './abstention';
import { fingerprintDistance } from '../measure/fieldFingerprint';

export interface RecallEntry {
  readonly label: string;
  readonly vector: Float64Array;
}

export interface RecallConfig {
  /** Nearest distance above this ⇒ abstain (field not in memory). Units are
   *  fingerprint distance ∈ [0, 2]; set from the measured separability gap. */
  readonly maxDistance: number;
  /** (2nd − 1st) nearest distance below this ⇒ abstain (ambiguous). */
  readonly minMargin: number;
}

export interface RecallResult {
  readonly label: string | null;
  readonly distance: number;
  readonly margin: number;
  readonly verdict: Verdict;
}

/** Nearest-label recall with a distance gate and an ambiguity (margin) gate. */
export function recallNearest(
  entries: readonly RecallEntry[],
  query: Float64Array,
  cfg: RecallConfig,
): RecallResult {
  if (entries.length === 0) {
    return { label: null, distance: Infinity, margin: Infinity, verdict: 'abstain' };
  }

  let best: RecallEntry = entries[0];
  let bestD = fingerprintDistance(best.vector, query);
  let secondD = Infinity;
  for (let i = 1; i < entries.length; i++) {
    const d = fingerprintDistance(entries[i].vector, query);
    if (d < bestD) {
      secondD = bestD;
      bestD = d;
      best = entries[i];
    } else if (d < secondD) {
      secondD = d;
    }
  }

  const margin = secondD - bestD; // Infinity for a single-entry store
  const abstain = bestD > cfg.maxDistance || margin < cfg.minMargin;
  return {
    label: abstain ? null : best.label,
    distance: bestD,
    margin,
    verdict: abstain ? 'abstain' : 'report',
  };
}
