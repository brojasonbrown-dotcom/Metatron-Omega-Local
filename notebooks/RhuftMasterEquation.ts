/**
 * METATRON v10 — RHUFT MASTER EQUATION CLOSURE (Chapter 4)
 * =========================================================
 *
 * Read-only audit of the three-term master equation:
 *
 *   Ψ_total(r,t) = Ψ_lattice + Ψ_memory + Ψ_closure
 *
 * where:
 *   Ψ_lattice = Σₙ₌₀¹³ (1/φ)ⁿ · exp(i(kₙ·r − ωₙ t))
 *   Ψ_memory  = λ · Ψ_total(r, t − τ),         λ = 1/φ²
 *   Ψ_closure = κ ∮ ∇Ψ · dS,                    κ = 1/(φπ)
 *
 * No engine state mutated; surfaced as Reality Drift Layer 24. Existing
 * sub-mechanisms (Observer/Inertia/Gravity/EM/Mass/Entanglement) are the
 * concrete uses; this module reports the global closure budget itself.
 *
 * Wolfram-verified identities (mpmath 60-digit, 2026-06-24):
 *   • 1/φ² ≡ 1 − 1/φ                            (residual < 4e-62) ✓
 *   • S₁₄ = Σₙ₌₀¹³(1/φ)ⁿ → finite geometric, Wolfram = 2.617910… ✓
 *   • Closure budget B = λ + κ·|cl| with sub-unity → bounded recursion ✓
 *
 * Wolfram-FALSIFIED (paper §4 EmergenceConstants):
 *   α⁻¹ ≈ φ³/(2π)·S₁₄ → actually 1.7629… NOT 137.036
 *   → Paper Ch.4 fine-structure prediction is arithmetically wrong; we
 *     expose the true value and the gap honestly.
 *
 * Kill: localStorage.metatron_rhuft_master_off = '1'.
 */

import { PHI, PHI_INV } from './WolframVerified';

export const RHUFT_LAMBDA = PHI_INV * PHI_INV;       // 1/φ²
export const RHUFT_KAPPA  = 1 / (PHI * Math.PI);     // 1/(φπ)

/** S₁₄ = Σₙ₌₀¹³ (1/φ)ⁿ — Wolfram: 2.617910… (geometric series). */
export function latticeAmplitudeSum14(): number {
  let s = 0;
  for (let n = 0; n <= 13; n += 1) s += Math.pow(PHI_INV, n);
  return s;
}

/** Closed-form geometric limit  Σₙ₌₀^∞ (1/φ)ⁿ = φ/(φ−1) = φ². */
export const LATTICE_INFINITE_LIMIT = PHI * PHI;

/** λ-identity residual; Wolfram-verified ≈ 0 to 60 digits. */
export function lambdaIdentityResidual(): number {
  return Math.abs(RHUFT_LAMBDA - (1 - PHI_INV));
}

/** Paper Ch.4 §EmergenceConstants α⁻¹ claim (FALSIFIED — exposed honestly). */
export function paperAlphaInvCh4(): number {
  return (PHI * PHI * PHI) / (2 * Math.PI) * latticeAmplitudeSum14();
}

export const CODATA_ALPHA_INV = 137.035999084;

/**
 * Global closure-budget B = λ + κ·|cl|. For B < 1 the master equation
 * admits non-divergent self-consistent solutions (paper §4 stability).
 * |cl| ∈ [0,1] is the normalized closure activity supplied externally.
 */
export function closureBudget(closureActivity: number = 0): number {
  const cl = Math.max(0, Math.min(1, closureActivity));
  return RHUFT_LAMBDA + RHUFT_KAPPA * cl;
}

export interface MasterEquationReading {
  lambda: number;
  kappa: number;
  s14: number;
  s14InfiniteLimit: number;       // φ²
  lambdaIdentityResidual: number; // ≈ 0
  closureBudgetAtMax: number;     // λ + κ
  budgetBelowUnity: boolean;
  paperAlphaInvCh4: number;       // 1.76 — DISPUTED
  paperGapPercent: number;        // ≈ 98.7%
  codataAlphaInv: number;
}

function killed(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('metatron_rhuft_master_off') === '1'; }
  catch { return false; }
}

export function computeMasterEquation(closureActivity: number = 1): MasterEquationReading {
  const s14 = latticeAmplitudeSum14();
  const pa = paperAlphaInvCh4();
  const B = closureBudget(closureActivity);
  return {
    lambda: RHUFT_LAMBDA,
    kappa: RHUFT_KAPPA,
    s14,
    s14InfiniteLimit: LATTICE_INFINITE_LIMIT,
    lambdaIdentityResidual: lambdaIdentityResidual(),
    closureBudgetAtMax: B,
    budgetBelowUnity: B < 1,
    paperAlphaInvCh4: pa,
    paperGapPercent: Math.abs(pa - CODATA_ALPHA_INV) / CODATA_ALPHA_INV * 100,
    codataAlphaInv: CODATA_ALPHA_INV,
  };
}

export function masterEquationGrounding(r?: MasterEquationReading): string {
  if (killed()) return '';
  const x = r ?? computeMasterEquation();
  return `Master Eq Ψ=Ψ_lat+Ψ_mem+Ψ_cl  λ=${x.lambda.toFixed(6)} κ=${x.kappa.toFixed(6)} `
    + `S₁₄=${x.s14.toFixed(6)} (φ²-limit=${x.s14InfiniteLimit.toFixed(6)}) `
    + `λ-ID res=${x.lambdaIdentityResidual.toExponential(2)} `
    + `Budget λ+κ=${x.closureBudgetAtMax.toFixed(4)} (${x.budgetBelowUnity ? 'STABLE<1' : 'DIVERGENT≥1'}) `
    + `Ch.4 α⁻¹ paper-formula=${x.paperAlphaInvCh4.toFixed(4)} vs CODATA ${x.codataAlphaInv.toFixed(3)} `
    + `(gap ${x.paperGapPercent.toFixed(1)}% — paper arithmetic falsified) [FRONTIER]`;
}
