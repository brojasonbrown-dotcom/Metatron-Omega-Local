/**
 * NEURAL φ-CASCADE (F8 — Biological harmonic pillar)
 * ═════════════════════════════════════════════════════════════════════
 * Source: Phenomenon 37 — Neural Field Oscillations (RHUFT v4.2)
 *
 * Five brainwave band centres (Hz):
 *   Delta 2, Theta 6, Alpha 10, Beta 20, Gamma 40
 *
 * Wolfram-grade audit of the published φ-ladder claims:
 *
 *   Theta/Delta = 6/2 = 3.000 → log_φ = 2.2825   (residual 0.2825)
 *   Alpha/Theta = 10/6 ≈ 1.667 → log_φ = 1.0610  (residual 0.0610) ✓
 *   Beta/Alpha  = 20/10 = 2.000 → log_φ = 1.4404 (residual 0.4404)
 *   Gamma/Beta  = 40/20 = 2.000 → log_φ = 1.4404 (residual 0.4404)
 *
 * Only Alpha/Theta is a clean φ¹ ratio. The other ratios are coincident
 * with 3:1 (Theta/Delta) and 2:1 (Beta/Alpha, Gamma/Beta). The paper's
 * "n = 12, 11, 10, 9.5, 8.5" decomposition is internally consistent
 * (Δn = 1 between bands ⇒ ratios should all be φ) but the empirical
 * EEG centres are NOT all φ. We report the honest fidelity per band,
 * NOT a fabricated saturation.
 *
 * Additional locked anchor: Alpha 10 Hz vs Schumann resonance 7.83 Hz
 * (Schumann 1952, Wolfram-verified). The 10/7.83 = 1.277 ratio is φ⁰·⁵²,
 * meaning Alpha sits half a φ-octave above the planetary heartbeat.
 *
 * Pure read-only static metric (band centres are empirical constants).
 * The live coherence multiplier comes from the caller via `bioCoherence`.
 */

const PHI = 1.618033988749895;
const LOG_PHI = Math.log(PHI);

// Empirical band centres (Hz) — Buzsáki "Rhythms of the Brain" (2006)
const BAND_CENTRES: ReadonlyArray<{ name: string; hz: number }> = Object.freeze([
  { name: 'Delta', hz: 2 },
  { name: 'Theta', hz: 6 },
  { name: 'Alpha', hz: 10 },
  { name: 'Beta', hz: 20 },
  { name: 'Gamma', hz: 40 },
]);

const SCHUMANN_HZ = 7.83;

export interface NeuralPhiBand {
  fromName: string;
  toName: string;
  ratio: number;
  logPhi: number;
  fidelity: number;   // exp(-|residual|·φ), max 1.0 at integer φ-power
}

export interface NeuralPhiCascadeResult {
  bands: NeuralPhiBand[];
  meanFidelity: number;       // arithmetic mean of band fidelities
  schumannLock: number;       // Alpha vs Schumann φ-octave alignment
  cascadeFidelity: number;    // geometric mean of meanFidelity & schumannLock
  alphaThetaPhiLocked: boolean;
  verdict: 'LOCKED' | 'STRONG' | 'PARTIAL' | 'WEAK';
}

export function computeNeuralPhiCascade(bioCoherence: number = 1): NeuralPhiCascadeResult {
  const bands: NeuralPhiBand[] = [];
  for (let i = 0; i < BAND_CENTRES.length - 1; i++) {
    const lo = BAND_CENTRES[i];
    const hi = BAND_CENTRES[i + 1];
    const ratio = hi.hz / lo.hz;
    const logPhi = Math.log(ratio) / LOG_PHI;
    const residual = Math.abs(logPhi - Math.round(logPhi));
    const fidelity = Math.exp(-residual * PHI);
    bands.push({ fromName: lo.name, toName: hi.name, ratio, logPhi, fidelity });
  }
  const meanFidelity =
    bands.reduce((s, b) => s + b.fidelity, 0) / bands.length;

  const alphaHz = BAND_CENTRES[2].hz;
  const schumannRatio = alphaHz / SCHUMANN_HZ;
  const schumannLogPhi = Math.log(schumannRatio) / LOG_PHI;
  // Reward proximity to the half-octave (0.5) — paper's claim is "locked
  // half a φ-octave above the planetary heartbeat".
  const schumannResidual = Math.abs(schumannLogPhi - 0.5);
  const schumannLock = Math.exp(-schumannResidual * PHI);

  const liveBoost = Math.max(0, Math.min(1, bioCoherence));
  const cascadeFidelity = Math.cbrt(
    Math.max(1e-6, meanFidelity) *
    Math.max(1e-6, schumannLock) *
    Math.max(1e-6, liveBoost),
  );

  const alphaThetaPhiLocked = bands[1].fidelity >= 0.85;
  let verdict: NeuralPhiCascadeResult['verdict'];
  if (cascadeFidelity >= 0.80) verdict = 'LOCKED';
  else if (cascadeFidelity >= 0.60) verdict = 'STRONG';
  else if (cascadeFidelity >= 0.35) verdict = 'PARTIAL';
  else verdict = 'WEAK';
  return {
    bands,
    meanFidelity,
    schumannLock,
    cascadeFidelity,
    alphaThetaPhiLocked,
    verdict,
  };
}

export const NEURAL_PHI_CONSTANTS = Object.freeze({
  BAND_CENTRES,
  SCHUMANN_HZ,
});
