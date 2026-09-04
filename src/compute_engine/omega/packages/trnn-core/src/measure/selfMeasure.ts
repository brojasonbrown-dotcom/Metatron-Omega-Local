/**
 * selfMeasure — full-field, all-rung self-measurement (Ω-REAL: Q2).
 *
 * The engine reads coherence and energy, but does not measure its own drift,
 * temporal coherence, information density, inertia, or its global Lyapunov
 * descent — the quantities that make "the field stabilising itself" a number
 * rather than an assumption. This module closes the DORMANT_REGISTER TODO
 * ("engine-checkpoint bridging") by reusing the canonical field-kernel-core
 * operators against the live per-rung 13-mode signature.
 *
 * Why signature, not the raw field: the 13 golden modes are the same modes on
 * every rung, so cross-scale drift (Φ_scale) and the Lyapunov energy are
 * well-defined in a shared coordinate frame.
 *
 *   drift              ‖sig − siĝ‖²            (vs the persistence predictor)
 *   temporalCoherence  ⟨sig, prev⟩/⟨prev,prev⟩ (Rayleigh ratio)
 *   informationDensity H(p), p_i = sig_i²/Σsig² (base-2, dlog — L2-safe)
 *   inertia            ‖sig − prev‖
 *   closure            γ (shift autocorrelation, from closureTarget)
 *   energy             ‖z‖² (from readState)
 *   lyapunov           Σ_n (‖ψ‖² + φ·‖ψ−ψ̂‖² + φ⁻¹·Φ_scale)  — the descent certificate
 *
 * The field-kernel-core `measureDrift`, `measureTemporalCoherence`,
 * `measureInertia` and `lyapunovEnergy` are deterministic (only +,−,×,÷,√);
 * its `measureInformationDensity` uses host `Math.log`, so the entropy is
 * re-derived here through `dlog` (same formula, deterministic bank — L2).
 */

import {
  measureDrift,
  measureTemporalCoherence,
  measureInertia,
} from '../../../field-kernel-core/src/measurement';
import { lyapunovEnergy } from '../../../field-kernel-core/src/lyapunov';
import { createFieldStateN, type FieldStateN } from '../../../field-kernel-core/src/state';
import { dlog } from '../core/dmath';

const LOG2 = dlog(2);

/** L2-safe information density: base-2 entropy of the normalised power. */
export function informationDensity(psi: Float64Array): number {
  let normSq = 0;
  for (let i = 0; i < psi.length; i++) normSq += psi[i] * psi[i];
  if (!(normSq > 0)) return NaN;
  const inv = 1 / normSq;
  let H = 0;
  for (let i = 0; i < psi.length; i++) {
    const p = psi[i] * psi[i] * inv;
    if (p > 0) H -= p * (dlog(p) / LOG2);
  }
  return H;
}

/**
 * Multi-scale entropy: base-2 entropy of the energy distribution ACROSS the
 * φ-ladder. 0 = all energy on one rung (fully localised); log₂(K) = energy
 * spread uniformly over K rungs. This is the "measure across ALL scales" axis —
 * the field's scale-concentration, not any single rung's shape.
 */
export function scaleEntropy(energies: readonly number[]): number {
  let total = 0;
  for (const e of energies) if (Number.isFinite(e) && e > 0) total += e;
  if (!(total > 0)) return NaN;
  const inv = 1 / total;
  let H = 0;
  for (const e of energies) {
    if (e > 0) {
      const p = e * inv;
      H -= p * (dlog(p) / LOG2);
    }
  }
  return H;
}

/**
 * Cross-scale drift Φ_scale = Σ_n Σ_i (ψ_n[i] − ψ_{n+1}[i])² over shared modes.
 * This is the "toroidal closure across scales": 0 = adjacent rungs carry the
 * same spectral shape (smooth ladder), large = the ladder is discontinuous.
 */
export function crossScaleDrift(signatures: readonly Float64Array[]): number {
  let s = 0;
  for (let i = 0; i + 1 < signatures.length; i++) {
    const a = signatures[i];
    const b = signatures[i + 1];
    const n = Math.min(a.length, b.length);
    for (let k = 0; k < n; k++) {
      const d = a[k] - b[k];
      s += d * d;
    }
  }
  return s;
}

export interface RungSelfMeasure {
  readonly rank: number;
  /** Ladder index n (the scale). */
  readonly n: number;
  readonly energy: number;
  /** Shift autocorrelation γ ∈ [0,1]. */
  readonly closure: number;
  /** ‖sig − siĝ‖² vs the persistence predictor; 0 before a history exists. */
  readonly drift: number;
  /** Rayleigh ratio vs the previous signature; 0 before a history exists. */
  readonly temporalCoherence: number;
  /** Base-2 entropy of the signature power; NaN for a dark rung. */
  readonly informationDensity: number;
  /** ‖sig − prev‖; 0 before a history exists. */
  readonly inertia: number;
}

export interface SelfMeasureReport {
  readonly rungs: readonly RungSelfMeasure[];
  /** Global descent certificate across all rungs. */
  readonly lyapunov: number;
  /** Multi-scale entropy of the energy distribution across rungs. */
  readonly scaleEntropy: number;
  /** Cross-scale spectral drift Φ_scale (0 = smooth ladder). */
  readonly scaleDrift: number;
}

/** Stateful full-field self-measurement (persistence predictor = last signature). */
export class SelfMeasureTracker {
  private prev: Float64Array[] | null = null;

  reset(): void {
    this.prev = null;
  }

  /**
   * One full-field observation per tick. `signatures` are the per-rung 13-mode
   * signatures; `gammas` the per-rung closure γ; `energies` the per-rung
   * energies; `ns` the per-rung ladder indices.
   */
  observe(
    signatures: readonly Float64Array[],
    gammas: readonly number[],
    energies: readonly number[],
    ns: readonly number[],
  ): SelfMeasureReport {
    const K = signatures.length;
    const states: FieldStateN[] = [];
    const rungs: RungSelfMeasure[] = [];

    for (let i = 0; i < K; i++) {
      const sig = signatures[i];
      const prev = this.prev ? this.prev[i] : null;

      const state = createFieldStateN(ns[i], sig.length);
      state.psi.set(sig);
      state.psiHat.set(prev ?? sig); // persistence predictor

      const drift = prev ? measureDrift(state) : 0;
      const temporalCoherence = prev ? measureTemporalCoherence(sig, prev) : 0;
      let inertia = 0;
      if (prev) {
        const prevState = createFieldStateN(ns[i], sig.length);
        prevState.psi.set(prev);
        inertia = measureInertia(state, prevState);
      }

      rungs.push({
        rank: i,
        n: ns[i],
        energy: energies[i],
        closure: gammas[i],
        drift,
        temporalCoherence,
        informationDensity: informationDensity(sig),
        inertia,
      });
      states.push(state);
    }

    const lyapunov = lyapunovEnergy(states, undefined, undefined);
    this.prev = signatures.map((s) => Float64Array.from(s));
    return {
      rungs,
      lyapunov,
      scaleEntropy: scaleEntropy(energies),
      scaleDrift: crossScaleDrift(signatures),
    };
  }
}
