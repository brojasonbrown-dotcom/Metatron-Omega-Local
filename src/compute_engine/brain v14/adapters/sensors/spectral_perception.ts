/**
 * RHUFT Mind — Spectral Perception: vision through the certified n-D FFT
 *
 * Epistemic Status: [SPEC] + [MATH] — adapter-layer bridge to the engine's
 * certified spectral layer (engine/src/analysis/spectralND.ts, complexityProbe.ts).
 *
 * WHY THIS EXISTS [MEASURED] — the fast percept path (signal_codec.ts
 * fieldFromLuminanceGrid) projects a luminance grid onto NUM_MODES=14 φ-spaced
 * spatial frequencies and attenuates mode k by φ⁻ᵏ, so the highest kept mode
 * (k=13) is multiplied by φ⁻¹³ ≈ 0.002. Fine structural identity — eye spacing,
 * micro-edges, texture — lives in exactly those high spatial frequencies, so the
 * 28-field bus contract physically cannot separate two near-identical scenes.
 * The hi-res multi-scale encoder improves this but is STILL a hand-rolled
 * O(W·H) partial DFT with per-ring renormalisation — it is not the Fourier
 * transform and conserves nothing.
 *
 * THIS MODULE replaces that partial projection with the EXACT 2-D discrete
 * Fourier transform of the full grid: every spatial mode up to the grid's own
 * Nyquist band, Parseval-conserved to machine floor, in O(N log N). Because a
 * captured frame is a bounded discrete grid, the full DFT is the COMPLETE,
 * information-lossless spectral description — there is no higher "resolution"
 * than Nyquist; anything more is interpolation, not information. This is the
 * rigorous meaning of "highest possible resolution" for a sensor.
 *
 * ADDITIVE CONTRACT (zero regression): nothing here touches the 28-field bus
 * path. This produces a SIDE-CHANNEL percept + complexity signature consumed by
 * the hypervector associator and the field-state genome. The legacy fast path
 * keeps running byte-identically.
 *
 * Determinism: the engine FFT is pure and deterministic (no RNG); all derived
 * products here are pure functions of the grid. [SPEC]
 *
 * CONJUNCTION (the powerful outcome): the same certified transform that serves
 * the engine's live complexity read now serves perception, so a percept's
 * measured spectral complexity is DIRECTLY comparable to a field-state's
 * measured spectral complexity — sights, sounds, words and thoughts become
 * commensurable by their actual modal occupancy, not by an assumed 14-mode
 * shadow. That is the cross-sensory resonance layer this mind has been missing.
 */

import {
  spectrumND,
  powerSpectrum,
  type SpectrumND,
} from "../../../engine/src/analysis/spectralND.ts";
import {
  probeCartesian,
  type ComplexityReport,
} from "../../../engine/src/analysis/complexityProbe.ts";
import { at } from "../../core/indexing.ts";

// ─────────────────────────────────────────────────────────────────────────────
// 1. The full-resolution 2-D spectral percept
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The exact 2-D Fourier percept of a luminance grid, at full grid resolution.
 *
 * Unlike the 14-mode shadow, this carries EVERY spatial mode the grid supports
 * (W·H complex coefficients, Parseval-conserved). The raw complex spectrum is
 * exposed for phase-coherent consumers (cross-correlation = multiplication in
 * this domain — the resonance scan), and the derived products below give the
 * stable, comparable signatures.
 */
export interface SpectralPercept {
  /** Grid dimensions [height, width] the transform ran on. */
  readonly dims: readonly number[];
  /** The certified full complex 2-D spectrum (row-major over the k-grid). */
  readonly spectrum: SpectrumND;
  /**
   * The power spectrum |F̂(k)|², length W·H — the translation-invariant energy
   * signature. Two scenes differing only by a SHIFT have identical power
   * spectra (Fourier shift theorem), so this is the robust identity feature.
   */
  readonly power: Float64Array;
  /** The measured spectral complexity of this percept (see ComplexityReport). */
  readonly complexity: ComplexityReport;
  /**
   * Parseval residual |spectralEnergy − realEnergy|. The transform's own
   * certificate: machine-floor (≈1e-16 relative) means this percept is the
   * exact, energy-conserving Fourier description — never an approximation.
   */
  readonly parsevalResidual: number;
}

/**
 * Compute the exact 2-D spectral percept of a luminance grid.
 *
 * Mean is removed first so the DC bin measures structure, not overall
 * brightness (matches the legacy codec's convention). The transform runs on
 * [height, width] — row-major, last axis fastest, matching the grid layout.
 *
 * [MATH] — Parseval is asserted by the engine; the residual is surfaced here
 * so callers can refuse a non-conserving frame (TRUTH_SOURCES) rather than
 * reason over a corrupted spectrum.
 *
 * @param grid   Row-major luminance, length = width·height, any finite scale.
 * @param width  Grid width (> 0).
 * @param height Grid height (> 0).
 * @throws RangeError on degenerate dims or non-finite samples (from the engine).
 */
export function spectralPerceptFromGrid(
  grid: Float64Array,
  width: number,
  height: number
): SpectralPercept {
  if (width <= 0 || height <= 0 || grid.length !== width * height) {
    throw new Error(
      `spectral_perception.spectralPerceptFromGrid: grid length ${grid.length} !== ${width}x${height}`
    );
  }
  // Remove mean: structure over brightness. [SPEC — matches signal_codec]
  let mean = 0.0;
  for (let i = 0; i < grid.length; i++) mean += at(grid, i);
  mean /= grid.length;
  const centred = new Float64Array(grid.length);
  for (let i = 0; i < grid.length; i++) centred[i] = at(grid, i) - mean;

  const dims = [height, width] as const;
  const spectrum = spectrumND(centred, dims);
  const power = powerSpectrum(spectrum);
  const complexity = probeCartesian(centred, dims);

  return {
    dims,
    spectrum,
    power,
    complexity,
    parsevalResidual: spectrum.parsevalResidual,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Comparable identity signatures (resonance-scan in the spectral domain)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whitened (log-power) identity signature. The raw power spectrum is dominated
 * by low-frequency energy, so a small fine-detail patch barely moves it — the
 * same limitation the 14-mode shadow has, one level up. Taking log(1 + p_k)
 * compresses the dynamic range and equalises mode contributions, so a weak but
 * real high-frequency patch registers proportionally to its STRUCTURE, not its
 * energy. This is the signature fine discrimination should use; the raw power
 * remains the right choice for translation-invariant coarse identity.
 *
 * [MATH] — log-power is the basis of cepstral/homomorphic analysis; it turns
 * multiplicative energy differences into additive, comparable ones.
 */
export function whitenedSignature(power: Float64Array): Float64Array {
  const out = new Float64Array(power.length);
  for (let i = 0; i < power.length; i++) out[i] = Math.log1p(power[i]!);
  return out;
}

/**
 * Cosine similarity between two power spectra (translation-invariant identity).
 * Returns a value in [0, 1]; 1 = identical spectral energy distribution. Both
 * inputs must be same-length power spectra from spectralPerceptFromGrid.
 *
 * [MATH] — this is the normalised inner product in the power-spectrum space;
 * because power is shift-invariant, this recognises a scene even under
 * translation, where the raw 28-field cannot. Pass whitened signatures (from
 * whitenedSignature) to compare fine structure rather than gross energy.
 */
export function powerSpectrumSimilarity(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length) {
    throw new Error(
      `spectral_perception.powerSpectrumSimilarity: length ${a.length} !== ${b.length}`
    );
  }
  let dot = 0.0, na = 0.0, nb = 0.0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na <= 0.0 || nb <= 0.0) return 0.0; // a zero spectrum matches nothing
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Cross-correlation of two grids via the certified FFT — the resonance scan.
 *
 * [MATH] — correlation in real space = conjugate-multiplication in the Fourier
 * domain: (f ⋆ g)(τ) = F⁻¹[ conj(F̂) · ĝ ]. The peak of the result is the
 * alignment at which the two scenes resonate most strongly; its height is the
 * scan's confidence. Computing it through the certified transform makes the
 * scan EXACT (no windowing loss), so "how strongly do these two percepts
 * resonate, and at what offset" is a measured quantity, not an estimate.
 *
 * Returns the full correlation field (same length as the inputs). Consumers
 * read argmax for the resonance offset and max for the strength.
 *
 * Both grids must be the same shape (the conjunction operates on matched
 * resolution channels — fast-with-fast, hi-res-with-hi-res).
 */
export function resonanceScan(
  a: SpectralPercept,
  b: SpectralPercept
): Float64Array {
  const n = a.spectrum.nodes;
  if (b.spectrum.nodes !== n) {
    throw new Error(
      `spectral_perception.resonanceScan: node count ${n} !== ${b.spectrum.nodes} (mismatched grids)`
    );
  }
  // conj(F̂_a) · F̂_b, pointwise over the k-grid.
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const are = a.spectrum.re, aim = a.spectrum.im;
  const bre = b.spectrum.re, bim = b.spectrum.im;
  for (let i = 0; i < n; i++) {
    // conj(a)·b = (are - i·aim)(bre + i·bim)
    re[i] = are[i]! * bre[i]! + aim[i]! * bim[i]!;
    im[i] = are[i]! * bim[i]! - aim[i]! * bre[i]!;
  }
  // Inverse DFT: the engine's transform is forward-only, so invert by the
  // standard conjugate trick — F⁻¹[c] = (1/N)·conj(F[conj(c)]). conj(c) is
  // (re, -im); transform it, then conjugate and scale.
  const cre = new Float64Array(n);
  const cim = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    cre[i] = re[i]!;
    cim[i] = -im[i]!;
  }
  const back = spectrumNDFromComplex(cre, cim, a.dims);
  const out = new Float64Array(n);
  const invN = 1.0 / n;
  for (let i = 0; i < n; i++) {
    // conj(F[conj(c)]) takes the real part as-is; imaginary part is discarded
    // (the correlation of two real fields is real).
    out[i] = back.re[i]! * invN;
  }
  return out;
}

/**
 * Internal: run the engine's separable transform on an already-complex field.
 * spectrumND accepts only a real field, so for the correlation inverse we feed
 * the real and imaginary parts through and recombine — the transform is linear,
 * so F[re + i·im] = F[re] + i·F[im]. This keeps the resonance scan on the same
 * certified primitive rather than introducing a second, uncertified FFT.
 */
function spectrumNDFromComplex(
  re: Float64Array,
  im: Float64Array,
  dims: readonly number[]
): SpectrumND {
  const sRe = spectrumND(re, dims);
  const sIm = spectrumND(im, dims);
  const n = sRe.nodes;
  const outRe = new Float64Array(n);
  const outIm = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // F[re] + i·F[im]: i·(sIm.re + i·sIm.im) = -sIm.im + i·sIm.re
    outRe[i] = sRe.re[i]! - sIm.im[i]!;
    outIm[i] = sRe.im[i]! + sIm.re[i]!;
  }
  return {
    dims,
    re: outRe,
    im: outIm,
    realEnergy: sRe.realEnergy + sIm.realEnergy,
    spectralEnergy: sRe.spectralEnergy + sIm.spectralEnergy,
    parsevalResidual: Math.max(sRe.parsevalResidual, sIm.parsevalResidual),
    perAxisResidual: Math.max(sRe.perAxisResidual, sIm.perAxisResidual),
    nodes: n,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cross-sensory complexity signature (the conjunction readout)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A compact, comparable complexity fingerprint for any percept — the numbers
 * by which a sight, a sound, a word and a thought become commensurable. All
 * values are measured by the engine probe from the percept's own spectrum;
 * nothing is assumed about the source modality.
 */
export interface ComplexitySignature {
  /** Normalised spectral entropy ∈ [0,1]: 0 = pure tone, 1 = white noise. */
  readonly entropyNorm: number;
  /** Effective occupied-mode count (participation ratio). */
  readonly participation: number;
  /** Spectral flatness ∈ [0,1] (Wiener entropy). */
  readonly flatness: number;
  /** Modes carrying 99% of power — the field's effective rank. */
  readonly rank99: number;
  /** Fraction of power in the single dominant mode. */
  readonly dominantFraction: number;
}

/** Extract the comparable complexity signature from a spectral percept. */
export function complexitySignature(p: SpectralPercept): ComplexitySignature {
  const c = p.complexity;
  return {
    entropyNorm: c.entropyNorm,
    participation: c.participation,
    flatness: c.flatness,
    rank99: c.rank99,
    dominantFraction: c.dominantFraction,
  };
}
