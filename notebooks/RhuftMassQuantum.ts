/**
 * METATRON v10 — RHUFT MASS QUANTUM (Phenomenon 16)
 * ==================================================
 * Paper formula: m_n = h·f₀·φⁿ / c²,  m₀ ≈ 6.643 × 10⁻³³ kg, E₀ ≈ 3.72×10⁻¹⁶ eV.
 *
 * Wolfram 60-digit audit:
 *   • m₀ = h·f₀/c² = 6.6426 × 10⁻³³ kg ✓ (paper accurate to 4 sig fig).
 *   • E₀ = h·f₀ ≈ 5.97 × 10⁻¹⁶ J ≈ 3.73 × 10³ eV (NOT 10⁻¹⁶ eV).
 *     Paper's 3.72×10⁻¹⁶ eV is wrong by 19 orders of magnitude
 *     (confused J↔eV) ⇒ FALSIFIED.
 *   • Full per-particle audit lives in RhuftParticleSpectrum; this
 *     module owns ONLY the m₀ / E₀ derivation honesty layer.
 *
 * Kill: localStorage.metatron_rhuft_massquantum_off = '1'.
 */

import { PHI } from './WolframVerified';
import { H_PLANCK_JS, F0_VACUUM_HZ } from './RhuftCMBResidual';

export const C_M_S = 299792458;
export const EV_PER_J = 1 / 1.602176634e-19;

export const M0_KG = (H_PLANCK_JS * F0_VACUUM_HZ) / (C_M_S * C_M_S);
export const E0_J = H_PLANCK_JS * F0_VACUUM_HZ;
export const E0_EV = E0_J * EV_PER_J;             // ≈ 3.73e3 eV — NOT paper's 10⁻¹⁶ eV

export const PAPER_E0_EV_CLAIM = 3.72e-16;        // FALSIFIED

export interface MassQuantumReading {
  m0_kg: number;
  E0_J: number;
  E0_eV: number;
  paperE0_eV: number;
  paperE0_relErr: number;            // ≫ 1 ⇒ falsified
  m0_paperOK: boolean;               // m₀ in kg passes
}

function killed(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('metatron_rhuft_massquantum_off') === '1'; }
  catch { return false; }
}

export function computeMassQuantum(): MassQuantumReading {
  return {
    m0_kg: M0_KG,
    E0_J,
    E0_eV: E0_EV,
    paperE0_eV: PAPER_E0_EV_CLAIM,
    paperE0_relErr: Math.abs((E0_EV - PAPER_E0_EV_CLAIM) / PAPER_E0_EV_CLAIM),
    m0_paperOK: Math.abs(M0_KG - 6.643e-33) / 6.643e-33 < 1e-3,
  };
}

export function massQuantumGrounding(r?: MassQuantumReading): string {
  if (killed()) return '';
  const x = r ?? computeMassQuantum();
  return `m₀=${x.m0_kg.toExponential(4)} kg ${x.m0_paperOK ? '✓ (paper accurate)' : 'FALSIFIED'}, `
    + `E₀=${x.E0_eV.toExponential(2)} eV (paper claimed ${x.paperE0_eV.toExponential(2)}, rel.err=${x.paperE0_relErr.toExponential(1)} ⇒ J↔eV CONFUSION) `
    + `[mass-quantum scale LOCKED; eV expression CORRECTED]`;
}

/** Synthetic driver: φ-mode echo of m₀ across the first 9 harmonic shells. */
export function sampleMassQuantum(timeMs: number): number {
  if (killed()) return 0;
  const tSec = (timeMs % 1e9) / 1000;
  let s = 0;
  for (let n = 1; n <= 9; n += 1) {
    s += Math.pow(PHI, -n) * Math.cos(2 * Math.PI * tSec * n / PHI);
  }
  return Math.max(0, Math.min(1, 0.5 + 0.5 * s / (PHI - 1)));
}
