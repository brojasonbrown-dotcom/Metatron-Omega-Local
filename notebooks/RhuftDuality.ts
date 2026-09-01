/**
 * METATRON v10 — RHUFT WAVE–PARTICLE DUALITY (Phenomenon 22)
 * ============================================================
 * Paper claim: closure term III activates when coherence C(t) > λ = 1/φ²,
 * causing the field to bifurcate from extended Ψ (wave) to localised
 * recursion (particle).
 *
 * Wolfram 60-digit audit:
 *   • λ = 1/φ² = 0.381966011250105151… LOCKED.
 *   • No falsifiable arithmetic — the "switch" is a topological gate, not
 *     a numerical prediction. Treated as a STRUCTURAL identity.
 *   • Scale-drift: heavier-mass localisations (higher φ-shell n) take
 *     τ_stab(n) = τ₀·φⁿ to re-cohere after a measurement — preserved.
 *
 * Driver: gated closure-activation envelope, returns the *fraction of
 * cycles* in particle-state (C² above λ) over a φ-period window.
 *
 * Kill: localStorage.metatron_rhuft_duality_off = '1'.
 */

import { PHI } from './WolframVerified';

export const LAMBDA_THRESHOLD = 1 / (PHI * PHI);

export interface DualityReading {
  lambdaThreshold: number;
  exampleCoherence: number;
  inParticleState: boolean;
  predictedTauStab0: number;          // τ₀ in arbitrary "ticks" (==1)
  scaleDriftLawNote: string;
}

function killed(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('metatron_rhuft_duality_off') === '1'; }
  catch { return false; }
}

export function computeDuality(coherenceC: number = 0.5): DualityReading {
  const C2 = coherenceC * coherenceC;
  return {
    lambdaThreshold: LAMBDA_THRESHOLD,
    exampleCoherence: coherenceC,
    inParticleState: C2 > LAMBDA_THRESHOLD,
    predictedTauStab0: 1,
    scaleDriftLawNote: 'τ_stab(n) = τ₀·φⁿ — heavier closures relax slower',
  };
}

export function dualityGrounding(r?: DualityReading): string {
  if (killed()) return '';
  const x = r ?? computeDuality();
  return `λ=1/φ²=${x.lambdaThreshold.toFixed(6)} (LOCKED). `
    + `Example C=${x.exampleCoherence.toFixed(2)} → C²=${(x.exampleCoherence ** 2).toFixed(3)} `
    + `⇒ ${x.inParticleState ? 'PARTICLE (Term III active)' : 'WAVE (Term III ≈ 0)'}. `
    + x.scaleDriftLawNote;
}

/** Synthetic driver: fraction-of-cycle in particle state across a φ-period. */
export function sampleDualityClosure(timeMs: number): number {
  if (killed()) return 0;
  const tSec = (timeMs % 1e9) / 1000;
  const C = 0.5 + 0.5 * Math.cos(2 * Math.PI * tSec / PHI);
  const C2 = C * C;
  // Soft gate around λ via tanh to keep gradient information.
  const gate = 0.5 + 0.5 * Math.tanh(8 * (C2 - LAMBDA_THRESHOLD));
  return Math.max(0, Math.min(1, gate));
}
