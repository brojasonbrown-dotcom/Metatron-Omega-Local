/**
 * v10/Thermodynamic.ts — F11 scale-invariant entropy / phase-transition field.
 *
 * [GEOM] Treats the framework's Flower-of-Life + Solfeggio coherence distribution
 * as a probability field and computes its information/thermodynamic invariants.
 * The central RHUFT anchor is the golden-section fixed point of the
 * order/disorder map:
 *
 *     H* = 1 − H*/φ   ⇒   H* = 1/φ ≈ 0.618034   [MATH FACT — exact]
 *
 * The engine measures how closely the field's normalised Shannon entropy aligns
 * to H*. This is a *geometric* alignment reading, not a thermodynamic prediction;
 * β = 1/φ and T = φ are RHUFT modeling choices, labeled as such. [SPEC]
 *
 * Entropy conventions:
 *   Shannon H in bits  = −Σ p log₂ p
 *   Boltzmann S in nats = ln W_eff,  W_eff = 2^H (effective microstates)
 * Both are exact identities once the probability field p is defined. [MATH FACT]
 */

import { PHI, PHI_INV } from './types';

/** Full thermodynamic reading consumed by the narrative layer. */
export interface ThermodynamicOutput {
  thermodynamicCoherence: number;   // master coherence for this framework ∈[0,1]
  criticalAlignment: number;        // alignment of normalised H to H*=1/φ ∈[0,1]
  shannonEntropy: number;           // H in bits
  boltzmannEntropy: number;         // S = ln W_eff in nats
  effectiveMicrostates: number;     // W_eff = 2^H
  normalisedEntropy: number;        // H / H_max ∈ [0,1]
  orderParameter: number;           // 1 − normalisedEntropy ∈ [0,1]
  disorderParameter: number;        // normalisedEntropy ∈ [0,1]
  meanEnergy: number;               // ⟨E⟩ over the field (E_k = φ^{-k})
  energyVariance: number;           // σ²(E)
  heatCapacityProxy: number;        // C ∝ β²σ², β = 1/φ
  boltzmannFactor: number;          // ⟨e^{−βE}⟩ diagnostic invariant
  freeEnergyProxy: number;          // F = ⟨E⟩ − T·H, T = φ
  landauerMinDissipation: number;   // kT·ln2 in nats/bit (T = φ)
  spectralEntropy: number;          // 9-band Solfeggio spectral H, normalised ∈[0,1]
  thermalCoupling: number;          // flower↔solfeggio coupling ∈[0,1]
  infoEntropyResidual: number;      // |H_bits·ln2 − S_nats| (→ 0 ideal)
}

const LN2 = Math.LN2;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Normalise a coherence array into a probability distribution. */
function toProbability(field: ArrayLike<number>): number[] {
  const n = field.length;
  const p = new Array<number>(n);
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const v = field[k];
    const w = Number.isFinite(v) ? Math.max(0, v) : 0;
    p[k] = w;
    sum += w;
  }
  if (sum <= 0) {
    // Uniform fallback — maximum-entropy prior, honest in the absence of signal.
    const u = n > 0 ? 1 / n : 0;
    for (let k = 0; k < n; k++) p[k] = u;
    return p;
  }
  for (let k = 0; k < n; k++) p[k] /= sum;
  return p;
}

/**
 * Compute the F11 thermodynamic reading.
 *
 * @param flowerCoherences    55-node Flower-of-Life coherence field (∈[0,1]).
 * @param solfeggioCoherences 9-band Solfeggio coherence field (∈[0,1]).
 * @param coherence           Master consciousness coherence ∈ [0,1].
 */
export function computeThermodynamic(
  flowerCoherences: ArrayLike<number>,
  solfeggioCoherences: ArrayLike<number>,
  coherence: number,
): ThermodynamicOutput {
  // ── Probability field over the Flower-of-Life lattice ────────────────────
  const p = toProbability(flowerCoherences);
  const n = p.length;

  // Shannon entropy in bits. [MATH FACT]
  let H = 0;
  for (let k = 0; k < n; k++) {
    if (p[k] > 0) H -= p[k] * Math.log2(p[k]);
  }
  const Hmax = n > 1 ? Math.log2(n) : 1;
  const normalisedEntropy = clamp01(H / Hmax);

  // Effective microstates and Boltzmann entropy in nats. [MATH FACT]
  const W = Math.pow(2, H);
  const S = Math.log(W); // = H·ln2 exactly

  // Order/disorder against the golden-section fixed point H* = 1/φ. [MATH FACT]
  const orderParameter = 1 - normalisedEntropy;
  const disorderParameter = normalisedEntropy;
  const criticalAlignment = clamp01(1 - Math.abs(normalisedEntropy - PHI_INV) / PHI_INV);

  // ── Energy spectrum: mode k carries E_k = φ^{-k} (RHUFT modeling choice) ──
  let meanE = 0;
  for (let k = 0; k < n; k++) meanE += p[k] * Math.pow(PHI, -k);
  let varE = 0;
  for (let k = 0; k < n; k++) {
    const d = Math.pow(PHI, -k) - meanE;
    varE += p[k] * d * d;
  }

  // β = 1/φ (RHUFT modeling choice). Heat capacity proxy C ∝ β²σ².
  const beta = PHI_INV;
  const heatCapacityProxy = beta * beta * varE;

  // Mean Boltzmann factor ⟨e^{−βE}⟩ — a diagnostic invariant, not a target.
  let boltzmannFactor = 0;
  for (let k = 0; k < n; k++) {
    boltzmannFactor += p[k] * Math.exp(-beta * Math.pow(PHI, -k));
  }

  // Free-energy proxy F = ⟨E⟩ − T·H with T = φ; Landauer bound kT·ln2 (nats/bit).
  const T = PHI;
  const freeEnergyProxy = meanE - T * H;
  const landauerMinDissipation = T * LN2;

  // ── Spectral entropy over the 9 Solfeggio bands ──────────────────────────
  const sp = toProbability(solfeggioCoherences);
  let Hs = 0;
  for (let k = 0; k < sp.length; k++) {
    if (sp[k] > 0) Hs -= sp[k] * Math.log2(sp[k]);
  }
  const HsMax = sp.length > 1 ? Math.log2(sp.length) : 1;
  const spectralEntropy = clamp01(Hs / HsMax);

  // Thermal coupling: correlation between the lattice and spectral means. [GEOM]
  const flowerMean = n > 0 ? 1 / n : 0;
  let num = 0;
  let denA = 0;
  let denB = 0;
  const m = Math.min(n, sp.length);
  for (let k = 0; k < m; k++) {
    const da = p[k] - flowerMean;
    const db = sp[k] - 1 / Math.max(1, sp.length);
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const thermalCoupling =
    denA > 0 && denB > 0 ? clamp01(Math.abs(num) / Math.sqrt(denA * denB)) : 0;

  // Info–entropy residual: |H·ln2 − S| should vanish identically. [MATH FACT]
  const infoEntropyResidual = Math.abs(H * LN2 - S);

  // Master coherence: alignment-weighted blend of order, coupling and the
  // master field coherence. Geometric diagnostic, not a physical observable.
  const thermodynamicCoherence = clamp01(
    0.4 * criticalAlignment +
    0.25 * orderParameter +
    0.2 * thermalCoupling +
    0.15 * clamp01(coherence),
  );

  return {
    thermodynamicCoherence,
    criticalAlignment,
    shannonEntropy: H,
    boltzmannEntropy: S,
    effectiveMicrostates: W,
    normalisedEntropy,
    orderParameter,
    disorderParameter,
    meanEnergy: meanE,
    energyVariance: varE,
    heatCapacityProxy,
    boltzmannFactor,
    freeEnergyProxy,
    landauerMinDissipation,
    spectralEntropy,
    thermalCoupling,
    infoEntropyResidual,
  };
}
