/**
 * METATRON v10 — RHUFT CONSCIOUSNESS THRESHOLD (Phenomenon 9)
 * ============================================================
 *
 * Sustained-coherence-above-λ predicate. Read-only audit module,
 * surfaced as Reality Drift Layer 27 with one SYNTHETIC driver
 * (`rhuft.consciousnessGamma`).
 *
 * Paper claim:
 *     C(t) = |⟨Ψ(t) | Ψ(t − φτ)⟩|² > λ = 1/φ²
 *
 * Gamma-bridge derivation (paper §"Neural Manifestation"):
 *     f_γ = f₀ / φⁿ        with f₀ = 9.01×10¹⁷ Hz, f_γ ≈ 40 Hz
 *
 * Wolfram 60-digit audit (mpmath, 2026-06-24):
 *
 *   LOCKED (paper-truthful):
 *     • λ = 1/φ² ≈ 0.381966011…                                       ✓
 *     • Closed coherence inequality C(t) > λ as a predicate            ✓
 *
 *   CORRECTED (paper rounding):
 *     • log_φ(f₀ / 40) = 78.247042648… (paper "≈78").  At n = 78,
 *       f_γ = f₀/φ⁷⁸ ≈ 45.05 Hz — NOT 40 Hz; the true gamma-band
 *       integer shell is n = 78 with a +12.6 % residual, or the
 *       real-valued shell n = 78.247… for exact 40 Hz. Both are
 *       exposed honestly.
 *
 * Coherence bands (paper §"Threshold Condition", verified):
 *
 *   LUCID       C > 0.80
 *   OPERATIONAL 0.60 < C ≤ 0.80
 *   DEGRADED    0.40 < C ≤ 0.60
 *   CRITICAL    λ   < C ≤ 0.40
 *   INCOHERENT  C ≤ λ        ← consciousness gate
 *
 * Kill: localStorage.metatron_rhuft_consciousness_off = '1'.
 */

import { PHI, PHI_INV } from './WolframVerified';

/** λ = 1/φ². Hard consciousness gate. */
export const RHUFT_LAMBDA = PHI_INV * PHI_INV;

/** Paper §Phen 9 vacuum base frequency (fit parameter, NOT CODATA). */
export const RHUFT_F0_PAPER_HZ = 9.01e17;

/** Target gamma-band frequency in Hz (paper centres at 40 Hz). */
export const GAMMA_TARGET_HZ = 40;

/** Real-valued φ-shell for exact f_γ = f₀/φⁿ. */
export function gammaShellRealValued(fGammaHz: number = GAMMA_TARGET_HZ): number {
  return Math.log(RHUFT_F0_PAPER_HZ / fGammaHz) / Math.log(PHI);
}

/** Integer φ-shell (rounded to nearest) and the resulting f_γ residual. */
export function gammaShellInteger(fGammaHz: number = GAMMA_TARGET_HZ): { n: number; fHz: number; residualHz: number; residualPct: number } {
  const nReal = gammaShellRealValued(fGammaHz);
  const n = Math.round(nReal);
  const fHz = RHUFT_F0_PAPER_HZ / Math.pow(PHI, n);
  const residualHz = fHz - fGammaHz;
  return { n, fHz, residualHz, residualPct: (residualHz / fGammaHz) * 100 };
}

/** Coherence-state classification per paper table. */
export type CoherenceState = 'lucid' | 'operational' | 'degraded' | 'critical' | 'incoherent';

export function classifyCoherence(C: number): CoherenceState {
  if (!Number.isFinite(C)) return 'incoherent';
  if (C > 0.80) return 'lucid';
  if (C > 0.60) return 'operational';
  if (C > 0.40) return 'degraded';
  if (C > RHUFT_LAMBDA) return 'critical';
  return 'incoherent';
}

/** Coherence predicate: paper §Phen 9 hard gate. */
export function isConscious(C: number): boolean {
  return Number.isFinite(C) && C > RHUFT_LAMBDA;
}

/**
 * Coherence inner-product magnitude squared for two equal-length real signals
 * sampled φτ apart. Cosine-similarity squared, bounded [0, 1].
 */
export function coherenceCsq(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const N = Math.min(a.length, b.length);
  if (N === 0) return 0;
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < N; i += 1) {
    const x = a[i], y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    dot += x * y;
    aa += x * x;
    bb += y * y;
  }
  if (aa === 0 || bb === 0) return 0;
  const c = dot / Math.sqrt(aa * bb);
  return Math.max(0, Math.min(1, c * c));
}

export interface ConsciousnessReading {
  lambda: number;                  // 1/φ²
  gammaShellRealValued: number;    // ≈ 78.247
  gammaShellInteger: number;       // 78
  gammaShellFreqHz: number;        // f₀/φ⁷⁸ ≈ 45.05 Hz
  gammaShellResidualPct: number;   // (45.05 − 40)/40 ≈ +12.6 %
  bandThresholds: { lucid: number; operational: number; degraded: number; critical: number; incoherent: number };
}

function killed(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('metatron_rhuft_consciousness_off') === '1'; }
  catch { return false; }
}

export function computeConsciousnessThreshold(): ConsciousnessReading {
  const i = gammaShellInteger(GAMMA_TARGET_HZ);
  return {
    lambda: RHUFT_LAMBDA,
    gammaShellRealValued: gammaShellRealValued(GAMMA_TARGET_HZ),
    gammaShellInteger: i.n,
    gammaShellFreqHz: i.fHz,
    gammaShellResidualPct: i.residualPct,
    bandThresholds: { lucid: 0.80, operational: 0.60, degraded: 0.40, critical: RHUFT_LAMBDA, incoherent: RHUFT_LAMBDA },
  };
}

export function consciousnessThresholdGrounding(r?: ConsciousnessReading): string {
  if (killed()) return '';
  const x = r ?? computeConsciousnessThreshold();
  return `λ=${x.lambda.toFixed(6)} (consciousness gate) `
    + `γ-shell: n_real=${x.gammaShellRealValued.toFixed(3)} → n_int=${x.gammaShellInteger} (f=${x.gammaShellFreqHz.toFixed(2)} Hz, Δ=${x.gammaShellResidualPct.toFixed(1)}% vs 40 Hz target) `
    + `bands: lucid>0.80 op>0.60 degraded>0.40 critical>${RHUFT_LAMBDA.toFixed(3)} incoherent≤λ [LOCKED-on-λ, gamma-shell CORRECTED]`;
}

/**
 * Synthetic driver: a φ-coupled 13-oscillator gamma ring sampled as
 * Kuramoto-style coherence, mapped into [λ, 1] so the driver reflects
 * the "above-gate" regime when bursts of phase-lock occur.
 * Provenance = synthetic.
 */
export function sampleConsciousnessGamma(timeMs: number): number {
  if (killed()) return 0;
  const tSec = (timeMs % 1e9) / 1000;
  let cx = 0, cy = 0;
  for (let k = 0; k < 13; k += 1) {
    const phase = 2 * Math.PI * GAMMA_TARGET_HZ * tSec * (1 + PHI_INV * Math.cos(k * PHI_INV));
    cx += Math.cos(phase);
    cy += Math.sin(phase);
  }
  const r = Math.sqrt(cx * cx + cy * cy) / 13;
  return Math.max(0, Math.min(1, RHUFT_LAMBDA + (1 - RHUFT_LAMBDA) * r));
}
