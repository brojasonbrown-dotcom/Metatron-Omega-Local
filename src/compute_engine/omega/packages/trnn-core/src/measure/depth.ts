/**
 * depth — the information-depth / importance reading (Ω-REAL: the "how deep" axis).
 *
 * The brain's φ-octave ladder is a topology for DEPTH: a query is not one field
 * but a shape across SCALE. This module folds the four existing depth primitives
 * into one importance scalar through the normative `fuseResonance` law:
 *
 *   • information density — how rich the rank-0 spectral signature is (0 = one
 *     mode, 1 = log₂(13) flat), normalised to [0,1];
 *   • scale engagement  — how the energy spreads across the φ-ladder
 *     (`scaleEntropy` / log₂(rungs)), 0 = one rung, 1 = uniform;
 *   • closure           — mean shift-autocorrelation γ across rungs: the
 *     "frictionless" axis (1 = exact toroidal closure, no transport loss);
 *   • novelty           — the mind's last novelty (have we seen this shape).
 *
 * All four are geometric-mean fused and GATED by live coherence (C < φ⁻² ⇒ the
 * field is too incoherent to be "deep" — it abstains, NaN). So depth is not a
 * new measurement: it is the existing measurement stack composed into the single
 * signal the memory write path can weigh by. Observe-only, deterministic (L2).
 */

import { fuseResonance } from '../substrate/resonanceBus';
import { informationDensity, scaleEntropy } from './selfMeasure';
import { dlog } from '../core/dmath';

export interface DepthInput {
  readonly coherence: number;
  /** Per-rung 13-mode spectral signatures (rank 0 first). */
  readonly signatures: readonly Float64Array[];
  /** Per-rung energies. */
  readonly energies: readonly number[];
  /** Per-rung closure γ ∈ [0,1]. */
  readonly gammas: readonly number[];
  /** Last cognitive novelty ∈ [0,1]. */
  readonly novelty: number;
}

export interface DepthReading {
  /** Fused depth ∈ [0,1]; NaN when gated or every channel abstained. */
  readonly value: number;
  /** Normalised information density of the rank-0 signature ∈ [0,1]. */
  readonly infoDensity: number;
  /** Normalised scale engagement across the ladder ∈ [0,1]. */
  readonly scaleEngagement: number;
  /** Mean closure γ across rungs ∈ [0,1]. */
  readonly closure: number;
  readonly novelty: number;
  readonly gated: boolean;
  readonly dead: boolean;
}

/** Fuse richness + scale-spread + closure + novelty into one depth/importance. */
export function depthReading(input: DepthInput): DepthReading {
  const K = input.signatures.length;
  const id = informationDensity(input.signatures[0] ?? new Float64Array(0));
  const infoDensity = Number.isFinite(id) ? Math.min(1, id / dlog(13)) : NaN;

  const se = scaleEntropy(input.energies);
  const scaleEngagement = Number.isFinite(se) ? Math.min(1, se / dlog(Math.max(1, K))) : NaN;

  let sumGamma = 0;
  let nGamma = 0;
  for (const g of input.gammas) {
    if (Number.isFinite(g)) {
      sumGamma += g;
      nGamma++;
    }
  }
  const closure = nGamma > 0 ? sumGamma / nGamma : NaN;

  const novelty = Number.isFinite(input.novelty) ? Math.max(0, Math.min(1, input.novelty)) : NaN;

  const fused = fuseResonance(
    [
      { id: 'infoDensity', value: infoDensity },
      { id: 'scaleEngagement', value: scaleEngagement },
      { id: 'closure', value: closure },
      { id: 'novelty', value: novelty },
    ],
    { coherence: input.coherence },
  );

  return {
    value: fused.value,
    infoDensity,
    scaleEngagement,
    closure,
    novelty,
    gated: fused.gated,
    dead: fused.dead,
  };
}
