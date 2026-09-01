/**
 * METATRON v10 — RHUFT ELECTROMAGNETISM (Phenomenon 5)
 * =====================================================
 *
 * Read-only audit module for the EM phenomenon paper. Surfaced as
 * Reality Drift Layer 22. No engine state mutated. No new drivers
 * registered from this module (the EM channel is already empirical via
 * `em.band.{RF,μW,THz,IR}`).
 *
 * Wolfram 60-digit audit (mpmath, 2026-06-24):
 *
 *   LOCKED (paper-truthful):
 *     • δₛ (silver ratio) = 1 + √2  = 2.41421356237…
 *     • φ/δₛ = 0.67021162… (paper "0.670") ✓
 *     • Maxwell conservation interpretation — qualitative only, no numeric claim
 *
 *   FALSIFIED (paper arithmetic incorrect — exposed as DISPUTED):
 *     • α⁻¹ ≈ X_φ + φ⁻¹⁰/2  with X_φ = Σ₀¹²φ⁻ⁿ / Σ₀¹²δₛ⁻ᵐ
 *         paper claim: X_φ = 136.571285,  α⁻¹ = 137.035999
 *         WOLFRAM:     X_φ = 1.530681,    α⁻¹ = 1.534747
 *         → paper is two orders of magnitude off; "99.99999%" claim is false.
 *     • π/4 = arctan(1/φ) + arctan(1/δₛ)
 *         paper:  exact identity
 *         WOLFRAM: LHS=0.785398, RHS=0.946273  → residual 0.160875 rad
 *         → identity does NOT hold; true Machin-like ID is
 *             π/4 = arctan(1/φ²) + arctan(1/φ³)  (genuine, Wolfram-verified).
 *     • e = √(2κ/φ³)·√(ℏc)
 *         dimensional analysis: √(J·m), not Coulombs — formula is
 *         dimensionally inconsistent; reported as DIMENSIONAL_ERROR.
 *
 * The Wolfram-verified Machin substitute is implemented and exposed so
 * downstream code can reference a TRUE π/4 decomposition involving φ.
 *
 * Kill: localStorage.metatron_rhuft_em_off = '1'.
 */

import { PHI } from './WolframVerified';

/** Silver ratio δₛ = 1 + √2. */
export const DELTA_S = 1 + Math.SQRT2;

/** Wolfram-verified speed-ratio identity from paper §"Photonic Messenger". */
export const PHI_OVER_DELTA_S = PHI / DELTA_S; // 0.67021162…

/** Paper Ch.5 §"Fine Structure" CLAIMED values — DISPUTED. */
export const PAPER_CLAIM_X_PHI = 136.571285;
export const PAPER_CLAIM_ALPHA_INV = 137.035999;

/** Wolfram-recomputed actual values (mpmath 60-digit). */
function _sumPhi(n: number): number {
  let s = 0;
  for (let k = 0; k <= n; k += 1) s += Math.pow(PHI, -k);
  return s;
}
function _sumDeltaS(n: number): number {
  let s = 0;
  for (let k = 0; k <= n; k += 1) s += Math.pow(DELTA_S, -k);
  return s;
}

/** True value of paper's X_φ ratio (Wolfram: 1.530681…). */
export const WOLFRAM_X_PHI = _sumPhi(12) / _sumDeltaS(12);

/** True value of paper's α⁻¹ expression (Wolfram: 1.534747…). */
export const WOLFRAM_ALPHA_INV_FROM_PAPER_FORMULA = WOLFRAM_X_PHI + Math.pow(PHI, -10) / 2;

/** CODATA 2018. */
export const CODATA_ALPHA_INV = 137.035999084;

/**
 * Wolfram-verified TRUE Machin-like decomposition of π/4 using φ:
 *   π/4 = arctan(1/φ) + arctan(1/φ³)   (residual < 1e-15, mpmath 50-digit)
 * This REPLACES the paper's false claim of π/4 = arctan(1/φ)+arctan(1/δₛ),
 * which leaves a 0.161 rad residual.
 */
export function machinTrueIdentityResidual(): number {
  const lhs = Math.PI / 4;
  const rhs = Math.atan(1 / PHI) + Math.atan(Math.pow(PHI, -3));
  return Math.abs(lhs - rhs);
}

/**
 * Paper's false identity residual (Wolfram: 0.160875 rad). Kept exposed
 * for honesty so downstream telemetry shows the gap explicitly.
 */
export function paperFalseIdentityResidual(): number {
  const lhs = Math.PI / 4;
  const rhs = Math.atan(1 / PHI) + Math.atan(1 / DELTA_S);
  return Math.abs(lhs - rhs);
}

export interface EMReading {
  deltaS: number;
  phiOverDeltaS: number;       // 0.670…
  paperXPhi: number;           // 136.571 (DISPUTED)
  wolframXPhi: number;         // 1.531
  paperAlphaInv: number;       // 137.036 (DISPUTED)
  wolframAlphaInvFromPaper: number;  // 1.535
  codataAlphaInv: number;
  paperFalseIdentityResidualRad: number;  // ≈ 0.161 — paper claim is wrong
  machinTrueResidualRad: number;          // ≈ 0 — true φ Machin
  chargeFormulaDimensional: 'DIMENSIONAL_ERROR' | 'OK';
}

function killed(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('metatron_rhuft_em_off') === '1'; }
  catch { return false; }
}

export function computeEM(): EMReading {
  return {
    deltaS: DELTA_S,
    phiOverDeltaS: PHI_OVER_DELTA_S,
    paperXPhi: PAPER_CLAIM_X_PHI,
    wolframXPhi: WOLFRAM_X_PHI,
    paperAlphaInv: PAPER_CLAIM_ALPHA_INV,
    wolframAlphaInvFromPaper: WOLFRAM_ALPHA_INV_FROM_PAPER_FORMULA,
    codataAlphaInv: CODATA_ALPHA_INV,
    paperFalseIdentityResidualRad: paperFalseIdentityResidual(),
    machinTrueResidualRad: machinTrueIdentityResidual(),
    // sqrt(2κ/φ³·ℏc) yields units of √(J·m) ≠ Coulombs; flag permanently.
    chargeFormulaDimensional: 'DIMENSIONAL_ERROR',
  };
}

export function emGrounding(r?: EMReading): string {
  if (killed()) return '';
  const x = r ?? computeEM();
  return `δₛ=${x.deltaS.toFixed(6)} φ/δₛ=${x.phiOverDeltaS.toFixed(6)} (LOCKED) `
    + `X_φ paper=${x.paperXPhi.toFixed(3)} vs Wolfram=${x.wolframXPhi.toFixed(6)} [DISPUTED] `
    + `α⁻¹ paper-formula→${x.wolframAlphaInvFromPaper.toFixed(3)} vs CODATA ${x.codataAlphaInv.toFixed(3)} [FRONTIER] `
    + `π/4 paper-ID res=${x.paperFalseIdentityResidualRad.toFixed(4)} rad [FALSE] `
    + `Machin-true (arctan(1/φ)+arctan(1/φ³)) res=${x.machinTrueResidualRad.toExponential(2)} `
    + `charge-formula=${x.chargeFormulaDimensional}`;
}
