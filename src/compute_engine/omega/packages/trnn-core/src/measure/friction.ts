/**
 * friction — the live "how smoothly is the field flowing" reading.
 *
 * The brain already measures the two signals that answer this: the COHERENCE
 * C(t) (the field resonating with its own past) and the CLOSURE DEFECT (the
 * field failing to close toroidally). This module folds them into one
 * dimensionless, per-tick reading:
 *
 *   flow       = coherence × (1 − defect/2)   ∈ [0,1]  (resonant AND closed)
 *   friction   = 1 − flow                      ∈ [0,1]
 *   situation  = flow − friction               ∈ [−1,1]  (+ = flowing, − = stuck)
 *
 * `abstaining` marks an estimator that refused (friction in the evidence); it
 * lifts the friction floor to ½ rather than reporting a confident number from
 * no evidence. Observe-only and deterministic: it reads the per-tick coherence
 * and closure, never actuates the field, so a run with friction readings
 * digests bit-identically to one without (the chain is unbroken).
 */

import type { Regime } from './state';

export interface FrictionReading {
  /** Self-resonance (coherence) in [0,1]. */
  readonly coherence: number;
  /** Shift autocorrelation γ in [0,1]. */
  readonly closure: number;
  /** Closure defect in [0,2]. */
  readonly defect: number;
  /** coherence × (1 − defect/2) in [0,1]. */
  readonly flow: number;
  /** 1 − flow (floor ½ when abstaining) in [0,1]. */
  readonly friction: number;
  /** flow − friction in [−1,1]. */
  readonly situation: number;
  readonly regime: Regime;
  readonly abstaining: boolean;
}

/** Fold live coherence + closure defect into one friction reading. */
export function frictionReading(
  coherence: number,
  defect: number,
  closure: number,
  regime: Regime,
  abstaining = false,
): FrictionReading {
  const resonance = Math.max(0, Math.min(1, coherence));
  const closureQuality = Math.max(0, Math.min(1, 1 - defect / 2));
  const flow = resonance * closureQuality;
  const friction = Math.max(abstaining ? 0.5 : 0, 1 - flow);
  return {
    coherence: resonance,
    closure,
    defect,
    flow,
    friction,
    situation: flow - friction,
    regime,
    abstaining,
  };
}
