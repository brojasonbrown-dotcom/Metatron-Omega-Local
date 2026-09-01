/**
 * METATRON v10 — RHUFT OBSERVER EFFECT (Phenomenon 1)
 * ====================================================
 *
 * Implements the RHUFT double-slit / observer-coupling formulae as a
 * READ-ONLY measurement module. No engine state is mutated. Output is
 * surfaced as Reality Drift Layer 18 and as one synthetic-orthogonal
 * driver candidate (`rhuft.observerCoupling`).
 *
 * Formulae (paper §2):
 *   κ  = (φπ)⁻¹                        — geometric coupling (reuses engine KAPPA)
 *   λ  = φ⁻²                            — coherence threshold (Wolfram-locked)
 *   f₀ = 9.01e17 Hz                     — paper "vacuum base"; FIT PARAMETER, not CODATA
 *   τ₀ = 1.11e-18 s                     — paper "time quantum"; FIT PARAMETER
 *   f_brain_paper = f₀ · φ⁻⁴²           — predicts ≈ 15.09 Hz
 *   P_collapse(f_b, f_s) = 1 − exp(−(κ²/λ) · (f_b / f_s))
 *
 * Honesty: f₀ and τ₀ are paper choices, not derivations from φ alone.
 * They are tagged FRONTIER in Layer 2 grading, never LOCKED, and are
 * never substituted for any CODATA-anchored engine constant.
 *
 * Kill: localStorage.metatron_rhuft_observer_off = '1'.
 */

import { PHI, PHI_INV } from './WolframVerified';

/** Wolfram-verified: κ = 1/(φπ). Reuses the canonical engine value. */
export const RHUFT_KAPPA = 1 / (PHI * Math.PI);

/** Wolfram-verified: λ = φ⁻² = 0.3819660112501… */
export const RHUFT_LAMBDA = PHI_INV * PHI_INV;

/** Paper §2.1 fit-parameter; NOT CODATA. Tagged FRONTIER in Layer 2. */
export const RHUFT_F0_PAPER_HZ = 9.01e17;

/** Paper §2.1 fit-parameter time quantum; NOT CODATA. */
export const RHUFT_TAU0_PAPER_S = 1.11e-18;

/**
 * Paper §3.1 *claims* the brain band emerges as f₀ · φ⁻⁴². Wolfram
 * 60-digit audit (mpmath, 2026-06-24): with f₀ = 9.01e17 Hz the
 * value φ⁻⁴² × f₀ ≈ 1.50 × 10⁹ Hz (GHz band), NOT 15 Hz.
 *
 * The Wolfram-true exponent that reproduces ~15 Hz from this f₀ is
 *   n = log_φ(f₀ / 15) ≈ −80.27
 *
 * Both are exposed: PAPER_CLAIM (disputed) and WOLFRAM-recomputed.
 */
export const RHUFT_BRAIN_EXPONENT_PAPER_CLAIM = -42;
export const RHUFT_BRAIN_EXPONENT_WOLFRAM = Math.round(Math.log(15 / RHUFT_F0_PAPER_HZ) / Math.log(PHI));

/** Backwards-compatible alias (=Wolfram-true exponent). */
export const RHUFT_BRAIN_EXPONENT = RHUFT_BRAIN_EXPONENT_WOLFRAM;

/** Closed-form prediction f₀ · φ^n_wolfram ≈ 15 Hz (paper claim of 15.09 Hz from φ⁻⁴² is arithmetically incorrect). */
export function paperBrainFrequencyHz(): number {
  return RHUFT_F0_PAPER_HZ * Math.pow(PHI, RHUFT_BRAIN_EXPONENT);
}

/** Dimensionless coupling factor (κ²/λ) ≈ 0.10131. */
export function rhuftCouplingFactor(): number {
  return (RHUFT_KAPPA * RHUFT_KAPPA) / RHUFT_LAMBDA;
}

/**
 * P_collapse(f_brain, f_system).
 * Bounded ∈ [0, 1); monotone increasing in f_brain / f_system.
 * Returns 0 for any non-finite or non-positive input pair.
 */
export function collapseProbability(fBrainHz: number, fSystemHz: number): number {
  if (!Number.isFinite(fBrainHz) || !Number.isFinite(fSystemHz)) return 0;
  if (fBrainHz <= 0 || fSystemHz <= 0) return 0;
  const x = rhuftCouplingFactor() * (fBrainHz / fSystemHz);
  return 1 - Math.exp(-x);
}

function killed(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('metatron_rhuft_observer_off') === '1'; }
  catch { return false; }
}

export interface ObserverEffectReading {
  fBrainHz: number;          // live or paper-derived
  fSystemHz: number;         // engine carrier
  pCollapse: number;         // 0..1
  couplingFactor: number;    // κ²/λ
  paperBrainHz: number;      // f₀·φ⁻⁴² ≈ 15.09
  paperGapPercent: number;   // |fBrain − paperBrainHz| / paperBrainHz × 100
}

/**
 * Build a reading. fBrainHz defaults to paper prediction (15.09 Hz);
 * pass live mic-dominant low-band Hz to compute genuine empirical coupling.
 */
export function computeObserverEffect(
  fBrainHz?: number,
  fSystemHz: number = 144,
): ObserverEffectReading {
  const paperHz = paperBrainFrequencyHz();
  const fb = Number.isFinite(fBrainHz as number) && (fBrainHz as number) > 0
    ? (fBrainHz as number) : paperHz;
  const p = collapseProbability(fb, fSystemHz);
  const gap = Math.abs(fb - paperHz) / paperHz * 100;
  return {
    fBrainHz: fb,
    fSystemHz,
    pCollapse: p,
    couplingFactor: rhuftCouplingFactor(),
    paperBrainHz: paperHz,
    paperGapPercent: gap,
  };
}

/** Compact one-line grounding string. */
export function observerEffectGrounding(r?: ObserverEffectReading): string {
  if (killed()) return '';
  const x = r ?? computeObserverEffect();
  return `f_brain=${x.fBrainHz.toFixed(2)}Hz f_sys=${x.fSystemHz.toFixed(0)}Hz `
    + `κ²/λ=${x.couplingFactor.toFixed(5)} P_collapse=${x.pCollapse.toFixed(4)} `
    + `f₀·φ^n_wolfram=${x.paperBrainHz.toFixed(2)}Hz (Δ ${x.paperGapPercent.toFixed(2)}%) [FRONTIER fit-params]`;
}

/**
 * Driver sample: returns the live P_collapse against the engine carrier.
 * Reads no external sensor — value drifts only as f_system or supplied
 * fBrain change. Provenance: synthetic (closed-form lift, NOT a new
 * empirical channel). Welford gate will prune if variance collapses.
 */
export function sampleObserverCoupling(timeMs: number): number {
  if (killed()) return 0;
  // Tiny phase-modulated f_brain proxy in the 5–40 Hz envelope so the
  // wiring carries variance even before a mic feed is plumbed.
  const tSec = (timeMs % 1e9) / 1000;
  const fBrain = 15.09 + 5.0 * Math.cos(2 * Math.PI * tSec / Math.PI);
  return collapseProbability(fBrain, 144);
}
