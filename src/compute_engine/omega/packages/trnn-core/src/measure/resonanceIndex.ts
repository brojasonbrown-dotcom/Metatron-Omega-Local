/**
 * resonanceIndex — the weighted resonance index (Ω-REAL: the memory weight).
 *
 * Every memory system in the brain already had a scalar it trusted — the kernel
 * coherence C(t) (the gate), the lexicon salience (word importance), the braid
 * recall margin (attractor separation) — but they were never composed into ONE
 * number the memory write/read path could hang off. This module is that number.
 *
 *   R = fuseResonance([coherence, salience, margin], { coherence, phaseDev })
 *
 * It is not new arithmetic: it is `substrate/resonanceBus.fuseResonance` — the
 * single normative fusion law — applied to the three memory channels, so the
 * index obeys the same abstention (non-finite channel drops out), veto (a
 * measured zero forces R = 0) and coherence gate (C < φ⁻² ⇒ abstain) as every
 * other surface. The γ = exp(−(phaseDev/φ⁻¹)²) phase-closure factor joins as a
 * fourth channel when phase deviation is measured.
 *
 * `weightedMemoryWeight` is the φ-weighted blend (prior weight 1, evidence
 * weight φ⁻¹, i.e. a geometric mix at w = φ⁻²) used to turn the index into the
 * cross-section memory's write weight — offline (NaN index) it returns the
 * prior untouched.
 *
 * Deterministic (L2), observe-only, allocation-light (reuses the bus).
 */

import {
  fuseResonance,
  blendWithResonance,
  type BusChannel,
} from '../substrate/resonanceBus';

export interface ResonanceIndexInput {
  /** Innovation-form coherence C(t) ∈ [0,1]; non-finite → the channel abstains. */
  readonly coherence: number;
  /** Lexicon salience of the current content ∈ [0,1]; optional. */
  readonly salience?: number;
  /** Braid recall separation margin ∈ [0,1]; optional. */
  readonly margin?: number;
  /** Circular phase deviation (radians); measured → joins as the γ channel. */
  readonly phaseDev?: number;
}

export interface ResonanceIndex {
  /** The weighted resonance index ∈ [0,1]; NaN when gated or fully abstained. */
  readonly value: number;
  readonly coherence: number;
  /** NaN when the salience channel was absent. */
  readonly salience: number;
  /** NaN when the margin channel was absent. */
  readonly margin: number;
  /** γ phase-closure factor actually used; NaN when phaseDev was absent. */
  readonly gamma: number;
  /** Channels that entered the product (γ included when measured). */
  readonly counted: number;
  readonly abstained: number;
  /** Weakest measured channel id — the thing holding the score down. */
  readonly vetoId: string | null;
  /** A measured zero was present: value is a hard 0, not a small mean. */
  readonly dead: boolean;
  /** Coherence gate fired (C < φ⁻²): the field was too incoherent to speak. */
  readonly gated: boolean;
  readonly subFloor: boolean;
}

/** Fuse the three memory channels into the single weighted resonance index. */
export function resonanceIndex(input: ResonanceIndexInput): ResonanceIndex {
  const channels: BusChannel[] = [];
  if (Number.isFinite(input.coherence)) channels.push({ id: 'coherence', value: input.coherence });
  if (Number.isFinite(input.salience)) channels.push({ id: 'salience', value: input.salience as number });
  if (Number.isFinite(input.margin)) channels.push({ id: 'margin', value: input.margin as number });

  const fused = fuseResonance(channels, {
    coherence: input.coherence,
    phaseDev: input.phaseDev,
  });

  return {
    value: fused.value,
    coherence: input.coherence,
    salience: input.salience ?? NaN,
    margin: input.margin ?? NaN,
    gamma: fused.gamma,
    counted: fused.counted,
    abstained: fused.abstained,
    vetoId: fused.vetoId,
    dead: fused.dead,
    gated: fused.gated,
    subFloor: fused.subFloor,
  };
}

/**
 * The φ-weighted memory write weight: a geometric blend of a stored prior with
 * the live index, at w = φ⁻¹/(1+φ⁻¹) = φ⁻². A NaN index (gated/abstained)
 * returns the prior untouched — an offline index must not change a stored
 * weight.
 */
export function weightedMemoryWeight(prior: number, index: ResonanceIndex): number {
  if (!Number.isFinite(index.value)) return prior;
  return blendWithResonance(prior, index.value);
}
