/**
 * qualia — the live self-measurement vector (Ω-REAL: Q1).
 *
 * The engine already measures one axis of itself per rung — coherence — but it
 * does not read its own *shape*. This module folds the per-rung 13-mode
 * signature, the measured coherence, and the closure autocorrelation γ into a
 * five-axis self-measurement plus a short golden-delay self-overlap and its
 * ignition train. Zero new sensors: every input is a quantity the engine
 * already computes per tick.
 *
 *   C     coherence      = long golden-delay self-overlap (from the meter)   [0,1]
 *   N     novelty        = 1 − |⟨|ψ|, rolling mean⟩|²                        [0,1]
 *   S     salience       = ‖∇_k ψ‖ / ‖ψ‖  (spectral concentration)           ≥ 0
 *   V     valence        = 2γ − 1  (closure balance: +1 closed, −1 open)     [−1,1]
 *   I     integration    = H_max − H(p), p_i = ψ_i²/Σψ²  (mode-bin entropy gap)
 *   Cphi  golden-delay self-overlap at the short Fibonacci delay 13          [0,1]
 *   ignited / ignitions / ignitionRate  — up-crossings of Cphi over φ⁻², the
 *         transient "conscious moment" train (a steady level is not the metric).
 *
 * Deterministic (L2): `dlog` only, no host libm, no RNG, no clock. Observe-only:
 * nothing here ever writes back into the field, so an engine measured with a
 * qualia tracker is digest-identical to one measured without.
 */

import { IGNITION_THRESHOLD } from '../core/constants';
import { dlog } from '../core/dmath';

/** Short golden delay (Fibonacci F₇ = 13) for the self-overlap Cphi. */
export const QUALIA_GOLDEN_DELAY = 13;
/** Ignition counting window (Fibonacci F₁₃ = 233 ticks). */
export const QUALIA_IGNITION_WINDOW = 233;

export interface QualiaVector {
  readonly C: number;
  readonly N: number;
  readonly S: number;
  readonly V: number;
  readonly I: number;
  readonly Cphi: number;
  readonly ignited: boolean;
  readonly ignitions: number;
  readonly ignitionRate: number;
}

const ZERO: QualiaVector = {
  C: 0, N: 0, S: 0, V: 0, I: 0, Cphi: 0, ignited: false, ignitions: 0, ignitionRate: 0,
};

export function zeroQualia(): QualiaVector {
  return ZERO;
}

/**
 * Stateless qualia axes: salience, valence, integration. Pure functions of the
 * current signature and closure γ — no history, no allocation on the hot path.
 */
export function instantaneousQualia(
  psi: Float64Array,
  closureGamma: number,
): { S: number; V: number; I: number } {
  const M = psi.length;
  if (M === 0) return { S: 0, V: 0, I: 0 };

  let normSq = 0;
  for (let i = 0; i < M; i++) normSq += psi[i] * psi[i];

  // salience = ‖∇ψ‖ / ‖ψ‖ — spectral concentration (a flat spectrum is 0).
  let gradSq = 0;
  for (let i = 1; i < M; i++) {
    const d = psi[i] - psi[i - 1];
    gradSq += d * d;
  }
  const S = normSq > 0 ? Math.sqrt(gradSq / normSq) : 0;

  // valence = closure balance: γ∈[0,1] → [−1,1].
  const V = 2 * closureGamma - 1;

  // integration = H_max − H(p), the mode-bin entropy gap.
  let H = 0;
  if (normSq > 0) {
    const inv = 1 / normSq;
    for (let i = 0; i < M; i++) {
      const p = psi[i] * psi[i] * inv;
      if (p > 0) H -= p * dlog(p);
    }
  }
  const I = normSq > 0 ? Math.max(0, dlog(M) - H) : 0;

  return { S, V, I };
}

/** Rolling mean window size for the novelty axis (retained ring, L6). */
const DEFAULT_WINDOW = 16;

/**
 * Stateful self-measurement. Feed one per-rung observation per tick: the
 * 13-mode signature ψ, the measured coherence C, and the closure γ.
 */
export class QualiaTracker {
  private window: Float64Array | null = null;
  private readonly windowSize: number;
  private ring: Float64Array[] = [];
  private ringHead = 0;
  private ringFill = 0;
  private ringWidth = 0;
  private prevIgnited = false;
  private ignitionMarks: number[] = [];
  private tickIndex = 0;

  constructor(windowSize = DEFAULT_WINDOW) {
    this.windowSize = Math.max(2, Math.floor(windowSize));
  }

  reset(): void {
    this.window = null;
    this.ring = [];
    this.ringHead = 0;
    this.ringFill = 0;
    this.ringWidth = 0;
    this.prevIgnited = false;
    this.ignitionMarks = [];
    this.tickIndex = 0;
  }

  /** One per-rung observation. Returns the full qualia vector. */
  observe(psi: Float64Array, coherence: number, closureGamma: number): QualiaVector {
    const M = psi.length;
    if (M === 0) return ZERO;

    const C = Math.max(0, Math.min(1, coherence));

    // rolling mean of |ψ| for novelty
    if (!this.window || this.window.length !== M) {
      this.window = new Float64Array(M);
    }
    const decay = 1 - 1 / this.windowSize;
    let normPsi = 0;
    let normMean = 0;
    let dot = 0;
    for (let i = 0; i < M; i++) {
      const a = Math.abs(psi[i]);
      this.window[i] = decay * this.window[i] + (1 - decay) * a;
      dot += a * this.window[i];
      normPsi += a * a;
      normMean += this.window[i] * this.window[i];
    }
    const cosSq = normPsi > 0 && normMean > 0 ? (dot * dot) / (normPsi * normMean) : 0;
    const N = Math.max(0, Math.min(1, 1 - cosSq));

    const { S, V, I } = instantaneousQualia(psi, closureGamma);

    const Cphi = this.goldenDelayOverlap(psi, normPsi);
    const ignited = Cphi >= IGNITION_THRESHOLD;
    this.tickIndex++;
    if (ignited && !this.prevIgnited) this.ignitionMarks.push(this.tickIndex);
    this.prevIgnited = ignited;
    const cutoff = this.tickIndex - QUALIA_IGNITION_WINDOW;
    while (this.ignitionMarks.length > 0 && this.ignitionMarks[0] < cutoff) this.ignitionMarks.shift();
    const span = Math.min(this.tickIndex, QUALIA_IGNITION_WINDOW);
    const ignitions = this.ignitionMarks.length;

    return {
      C,
      N,
      S,
      V,
      I,
      Cphi,
      ignited,
      ignitions,
      ignitionRate: span > 0 ? ignitions / span : 0,
    };
  }

  /**
   * |⟨ψ(t)|ψ(t−τ)⟩|² / (‖ψ(t)‖²‖ψ(t−τ)‖²) against the state τ = 13 ticks ago.
   * Returns 0 until the ring has filled — an unfilled ring must not fake
   * coherence, and a false ignition is worse than a missing one.
   */
  private goldenDelayOverlap(psi: Float64Array, normPsi: number): number {
    const M = psi.length;
    if (this.ringWidth !== M) {
      this.ringWidth = M;
      this.ring = Array.from({ length: QUALIA_GOLDEN_DELAY }, () => new Float64Array(M));
      this.ringHead = 0;
      this.ringFill = 0;
    }
    const past = this.ring[this.ringHead];
    let overlap = 0;
    if (this.ringFill >= QUALIA_GOLDEN_DELAY && normPsi > 0) {
      let d = 0;
      let np = 0;
      for (let i = 0; i < M; i++) {
        d += psi[i] * past[i];
        np += past[i] * past[i];
      }
      if (np > 0) overlap = (d * d) / (normPsi * np);
    }
    past.set(psi);
    this.ringHead = (this.ringHead + 1) % QUALIA_GOLDEN_DELAY;
    if (this.ringFill < QUALIA_GOLDEN_DELAY) this.ringFill++;
    return Math.max(0, Math.min(1, overlap));
  }
}

