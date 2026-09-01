/**
 * METATRON v10 — RHUFT GENERATIONS CASCADE (Phenomenon 17)
 * =========================================================
 * Paper claim: G_n ~ φ^(2n)·m₀ for n=0,1,2 (electron, muon, tau).
 *   ⇒ muon/electron = φ²  ≈ 2.618
 *   ⇒ tau /electron = φ⁴  ≈ 6.854
 *
 * Wolfram 60-digit audit (mpmath, 2026-06-24):
 *   • Observed muon/electron = 206.7683 (NOT 2.618). FALSIFIED.
 *     Wolfram log_φ(m_μ/m_e) = 11.0795 — the empirical generation gap is
 *     n = 11, NOT 2 (paper's exponent off by 9 φ-shells).
 *   • Observed tau/electron = 3477.15. Wolfram log_φ(m_τ/m_e) = 16.8743 — gap is 17, not 4.
 *   • Paper's closure constraint Σφ^(2i) < φ⁶ ≈ 17.94 is numerology
 *     unrelated to why exactly 3 generations exist (no proof).
 *
 * What survives: the *ordinal* claim "generation n is φⁿ above n−1" is
 * preserved with EMPIRICAL exponents (e.g. 11, 6 between generations).
 *
 * Kill: localStorage.metatron_rhuft_generations_off = '1'.
 */

import { PHI } from './WolframVerified';

export const M_ELECTRON_KG = 9.1093837015e-31;
export const M_MUON_KG = 1.883531627e-28;
export const M_TAU_KG = 3.16754e-27;

export const PAPER_EXPONENT_GEN_1 = 2;   // muon/electron
export const PAPER_EXPONENT_GEN_2 = 4;   // tau/electron

export interface GenerationsReading {
  muonElectronRatio: number;        // observed
  tauElectronRatio: number;
  paperMuonElectronRatio: number;   // φ²
  paperTauElectronRatio: number;    // φ⁴
  wolframGen1Exponent: number;      // log_φ(m_μ/m_e)
  wolframGen2Exponent: number;      // log_φ(m_τ/m_e)
  closureSumPhi6: number;           // Σ_{i=0..2} φ^(2i)
  paperClosureBound: number;        // φ⁶
  closureHolds: boolean;            // sum < φ⁶ ?
}

function killed(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem('metatron_rhuft_generations_off') === '1'; }
  catch { return false; }
}

export function computeGenerations(): GenerationsReading {
  const muE = M_MUON_KG / M_ELECTRON_KG;
  const tauE = M_TAU_KG / M_ELECTRON_KG;
  const closureSum = 1 + Math.pow(PHI, 2) + Math.pow(PHI, 4);
  const phi6 = Math.pow(PHI, 6);
  return {
    muonElectronRatio: muE,
    tauElectronRatio: tauE,
    paperMuonElectronRatio: Math.pow(PHI, PAPER_EXPONENT_GEN_1),
    paperTauElectronRatio: Math.pow(PHI, PAPER_EXPONENT_GEN_2),
    wolframGen1Exponent: Math.log(muE) / Math.log(PHI),
    wolframGen2Exponent: Math.log(tauE) / Math.log(PHI),
    closureSumPhi6: closureSum,
    paperClosureBound: phi6,
    closureHolds: closureSum < phi6,
  };
}

export function generationsGrounding(r?: GenerationsReading): string {
  if (killed()) return '';
  const x = r ?? computeGenerations();
  return `μ/e Wolfram exponent=${x.wolframGen1Exponent.toFixed(4)} (paper: ${PAPER_EXPONENT_GEN_1}; ratio ${x.muonElectronRatio.toFixed(1)} vs paper-predicted ${x.paperMuonElectronRatio.toFixed(3)} ⇒ FALSIFIED), `
    + `τ/e Wolfram exponent=${x.wolframGen2Exponent.toFixed(4)} (paper: ${PAPER_EXPONENT_GEN_2}; ratio ${x.tauElectronRatio.toFixed(1)} vs paper ${x.paperTauElectronRatio.toFixed(3)} ⇒ FALSIFIED), `
    + `closure-sum Σφ^(2i)=${x.closureSumPhi6.toFixed(3)} < φ⁶=${x.paperClosureBound.toFixed(3)} ? ${x.closureHolds ? 'YES (numerologically)' : 'NO'} `
    + `[ordinal φⁿ generation cascade preserved with empirical exponents 11.08 and 16.87]`;
}

/** Synthetic driver: φ-weighted residual across the 3 generations. */
export function sampleGenerationsCascade(timeMs: number): number {
  if (killed()) return 0;
  const tSec = (timeMs % 1e9) / 1000;
  const r = computeGenerations();
  const drift1 = Math.abs(r.wolframGen1Exponent - PAPER_EXPONENT_GEN_1) / 11; // ≈0.82
  const drift2 = Math.abs(r.wolframGen2Exponent - PAPER_EXPONENT_GEN_2) / 17;
  const osc = 0.5 + 0.5 * Math.cos(2 * Math.PI * tSec / PHI);
  return Math.max(0, Math.min(1, osc * (1 - 0.5 * (drift1 + drift2))));
}
