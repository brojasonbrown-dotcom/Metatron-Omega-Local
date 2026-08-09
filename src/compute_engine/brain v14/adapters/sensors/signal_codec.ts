/**
 * RHUFT Mind — Signal ↔ Geometric Field Codec (vision + audio share this)
 *
 * Epistemic Status: [SPEC] + [MATH] — Adapter-layer deterministic projections.
 *
 * [PHIL] — A percept is not pixels or samples; it is the stable geometric
 * structure those measurements induce. Both projections below map raw physical
 * measurements onto the SAME 28-element interleaved-complex field space the
 * engine thinks in, using φ-spaced frequencies (F5_ColorMusic pattern), so
 * that sights, sounds and words are all commensurable by resonance.
 *
 * Both functions are fully deterministic (no randomness — engine invariant)
 * and return unit-norm fields.
 */

import { MASTER_EQUATION_N, PHI, PHI_INV, PI } from "./../../core/constants.ts";
import { normalizeField } from "./../language_codec.ts";
import { liftField } from "./../phasor_field.ts";

/** Number of complex modes: N + 1 = 14. [SPEC] */
const NUM_MODES: number = MASTER_EQUATION_N + 1;

/** Field size contract: 2 * (N + 1) = 28. [SPEC] */
const FIELD_SIZE: number = 2 * NUM_MODES;

/** Golden angle in radians: 2π(1 − 1/φ) ≈ 2.399963. [MATH] */
const GOLDEN_ANGLE: number = 2.0 * PI * (1.0 - PHI_INV);

/**
 * Project a 2-D luminance grid onto 14 φ-spaced spatial-frequency modes.
 *
 * [MATH] — Mode k ∈ [0, 13] samples the 2-D DFT at a golden-spiral point in
 * frequency space:
 *   r_k     = φ^(k/2)                       (φ-spaced radial frequency)
 *   angle_k = k · goldenAngle               (maximally even directions)
 *   (fx, fy) = r_k · (cos angle_k, sin angle_k)
 *   Re_k = φ^(-k) · Σ_{x,y} v(x,y) · cos(2π(fx·x/W + fy·y/H))
 *   Im_k = φ^(-k) · Σ_{x,y} v(x,y) · sin(2π(fx·x/W + fy·y/H))
 * followed by L2 normalization. Mean is removed first so mode 0 measures
 * structure, not overall brightness. [SPEC]
 *
 * @param grid   Row-major luminance values, length = width·height, any scale.
 * @param width  Grid width in samples (> 0).
 * @param height Grid height in samples (> 0).
 */
export function fieldFromLuminanceGrid(
  grid: Float64Array,
  width: number,
  height: number
): Float64Array {
  if (width <= 0 || height <= 0 || grid.length !== width * height) {
    throw new Error(
      `signal_codec.fieldFromLuminanceGrid: grid length ${grid.length} !== ${width}x${height}`
    );
  }
  // Reject non-finite samples — a corrupt capture must not poison the field. [SPEC]
  for (let i = 0; i < grid.length; i++) {
    if (!Number.isFinite(grid[i])) {
      throw new Error(`signal_codec.fieldFromLuminanceGrid: grid[${i}] is not finite`);
    }
  }

  // Remove mean: structure over brightness. [SPEC]
  let mean = 0.0;
  for (let i = 0; i < grid.length; i++) mean += grid[i];
  mean /= grid.length;

  const field = new Float64Array(FIELD_SIZE);
  for (let k = 0; k < NUM_MODES; k++) {
    const r = Math.pow(PHI, k / 2.0); // φ-spaced radial frequency. [SPEC]
    const angle = k * GOLDEN_ANGLE;
    const fx = r * Math.cos(angle);
    const fy = r * Math.sin(angle);
    const amplitude = Math.pow(PHI_INV, k); // φ^(-k) decay, F5 pattern. [SPEC]

    let re = 0.0;
    let im = 0.0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = grid[y * width + x] - mean;
        const phase = 2.0 * PI * ((fx * x) / width + (fy * y) / height);
        re += v * Math.cos(phase);
        im += v * Math.sin(phase);
      }
    }
    field[2 * k] = amplitude * re;
    field[2 * k + 1] = amplitude * im;
  }

  return normalizeField(field);
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-RESOLUTION PERCEPT FIELD (additive — the 28-field path above is untouched)
// ─────────────────────────────────────────────────────────────────────────────
//
// WHY THIS EXISTS [MEASURED] — fieldFromLuminanceGrid projects onto NUM_MODES=14
// φ-spaced frequencies and attenuates mode k by φ⁻ᵏ, so the highest kept mode
// (k=13) is multiplied by φ⁻¹³ ≈ 0.002. Fine structural identity — eye spacing,
// micro-edges, pore texture — lives in exactly those high spatial frequencies, so
// the 28-field physically cannot separate two near-identical faces. This encoder
// keeps a DENSE dyadic (octave) frequency ladder with FLAT per-band weights, so a
// percept is represented at full measured resolution instead of a low-pass ghost.
//
// [MATH] — For each octave ring r_k = 2^k (k = 0..octaves-1) up to maxFreq, and
// each of `anglesPerRing` directions θ_a = a·π/A (edge orientation is π-periodic),
// we integrate the mean-centred grid against the 2-D Fourier basis:
//   Re_{k,a} = Σ_{x,y} v(x,y)·cos(2π(fx·x/W + fy·y/H))
//   Im_{k,a} = Σ_{x,y} v(x,y)·sin(2π(fx·x/W + fy·y/H))
//   (fx, fy) = r_k·(cos θ_a, sin θ_a)
// Each band's (Re,Im) pair is then ENERGY-NORMALIZED so every ring contributes
// comparably — no φ-decay, no high-band suppression. The raw field's norm is the
// signal's structured energy (real information), so we do NOT unit-normalize here;
// liftField/normalizeHV handle unit-norming for the hypervector layer. [SPEC]

/** Default number of octave rings (2⁰..2⁵ = 1..32 cycles/image). [SPEC] */
export const HIRES_DEFAULT_OCTAVES = 6;

/** Directions per ring — 8 golden-spaced orientations. [SPEC] */
export const HIRES_DEFAULT_ANGLES = 8;

/** Options for the high-resolution field encoder. */
export interface HiResFieldOptions {
  /** Octave rings; default 6. Ring k sits at radial frequency 2^k. */
  readonly octaves?: number;
  /** Orientations per ring; default 8. */
  readonly anglesPerRing?: number;
  /**
   * Highest radial frequency kept (cycles per image). Defaults to the larger
   * grid dimension, so the ladder reaches the image's own Nyquist band. Clamp
   * to [1, maxDim]; anything above the grid's real resolution is aliasing, not
   * information, so we never exceed the larger dimension.
   */
  readonly maxFreq?: number;
}

/** The interleaved length a hi-res field will have for a given config. */
export function hiResFieldSize(octaves: number, anglesPerRing: number): number {
  return 2 * octaves * anglesPerRing;
}

/**
 * Project a 2-D luminance grid onto a dense multi-scale Fourier field at FULL
 * resolution. This is the percept the hypervector associator should learn from —
 * not the 14-mode shadow. Additive and deterministic (no RNG). [SPEC]
 *
 * @param grid   Row-major luminance, length = width·height.
 * @param width  Grid width (> 0).
 * @param height Grid height (> 0).
 * @param opts   octave/angle/maxFreq configuration.
 * @returns Raw (energy-scaled, NOT unit-norm) interleaved-complex field of
 *          length 2·octaves·anglesPerRing.
 */
export function hiResFieldFromLuminanceGrid(
  grid: Float64Array,
  width: number,
  height: number,
  opts: HiResFieldOptions = {}
): Float64Array {
  if (width <= 0 || height <= 0 || grid.length !== width * height) {
    throw new Error(
      `signal_codec.hiResFieldFromLuminanceGrid: grid length ${grid.length} !== ${width}x${height}`
    );
  }
  for (let i = 0; i < grid.length; i++) {
    if (!Number.isFinite(grid[i])) {
      throw new Error(`signal_codec.hiResFieldFromLuminanceGrid: grid[${i}] is not finite`);
    }
  }

  const octaves = Math.max(1, Math.floor(opts.octaves ?? HIRES_DEFAULT_OCTAVES));
  const angles = Math.max(1, Math.floor(opts.anglesPerRing ?? HIRES_DEFAULT_ANGLES));
  const maxDim = Math.max(width, height);
  // Never sample above the grid's own resolution band. [MATH — Nyquist]
  const maxFreq = Math.max(1, Math.min(opts.maxFreq ?? maxDim, maxDim));

  // Remove mean: structure over brightness (matches the low-res path). [SPEC]
  let mean = 0.0;
  for (let i = 0; i < grid.length; i++) mean += grid[i];
  mean /= grid.length;

  const field = new Float64Array(hiResFieldSize(octaves, angles));
  const totalEnergy = new Float64Array(octaves); // per-ring energy for normalization

  for (let k = 0; k < octaves; k++) {
    // Radial frequency for this ring, dyadically spaced then rescaled so the top
    // ring sits at maxFreq: r_k = maxFreq · 2^(k-(octaves-1)). [SPEC]
    const r = maxFreq * Math.pow(2, k - (octaves - 1));
    let ringEnergy = 0.0;
    for (let a = 0; a < angles; a++) {
      // Edge orientation is π-periodic; spread directions evenly over [0, π) with
      // a golden offset so consecutive rings don't alias the same axes. [SPEC]
      const theta = (Math.PI * (a + PHI_INV * (k % 2 === 0 ? 0 : 1))) / angles;
      const fx = r * Math.cos(theta);
      const fy = r * Math.sin(theta);
      let re = 0.0;
      let im = 0.0;
      for (let y = 0; y < height; y++) {
        const rowOff = y * width;
        const phaseY = (2.0 * PI * fy * y) / height;
        for (let x = 0; x < width; x++) {
          const v = grid[rowOff + x]! - mean;
          if (v === 0.0) continue;
          const phase = (2.0 * PI * fx * x) / width + phaseY;
          re += v * Math.cos(phase);
          im += v * Math.sin(phase);
        }
      }
      const idx = 2 * (k * angles + a);
      field[idx] = re;
      field[idx + 1] = im;
      ringEnergy += re * re + im * im;
    }
    totalEnergy[k] = Math.sqrt(ringEnergy);
  }

  // Per-ring energy normalization: every octave ring gets comparable weight so a
  // weak-but-real high-frequency band (the identity detail) is not drowned by a
  // strong low-frequency band. A ring with no energy stays zero (never divide by
  // zero, never fabricate). [MATH]
  for (let k = 0; k < octaves; k++) {
    const e = totalEnergy[k]!;
    if (e <= 0.0 || !Number.isFinite(e)) continue;
    const inv = 1.0 / e;
    for (let a = 0; a < angles; a++) {
      const idx = 2 * (k * angles + a);
      field[idx]! *= inv;
      field[idx + 1]! *= inv;
    }
  }

  return field;
}

/**
 * Lift a percept field (fast 28-mode or hi-res multi-scale) into the phasor
 * hypervector space. This is the percept→associator bridge [P3]: a thin,
 * honestly-named alias over `phasor_field.liftField`, which is dimension-
 * agnostic and (after the dim-safety fix) correct for any interleaved field
 * length. Kept here so perception code imports from its own codec. [SPEC]
 */
export function liftPerceptField(field: Float64Array): Float64Array {
  return liftField(field);
}

/**
 * Project an audio waveform onto 14 φ-spaced spectral bands (Goertzel).
 *
 * [MATH] — Band k ∈ [0, 13] evaluates the DFT at frequency
 *   f_k = 89 · φ^(k/2) Hz    (89 = F_11; k=13 → ≈ 2039 Hz — speech band)
 * capped below Nyquist, via the Goertzel recurrence (exact single-bin DFT):
 *   s[n] = x[n] + 2cos(ω)s[n−1] − s[n−2]
 *   Re_k = φ^(-k)·(s[N−1] − s[N−2]·cos ω),  Im_k = φ^(-k)·s[N−2]·sin ω
 * followed by L2 normalization. DC is removed first. [SPEC]
 *
 * @param samples    Mono waveform in [-1, 1] (any finite scale accepted).
 * @param sampleRate Samples per second (> 0).
 */
export function fieldFromWaveform(samples: Float64Array, sampleRate: number): Float64Array {
  if (samples.length < 2 || sampleRate <= 0) {
    throw new Error("signal_codec.fieldFromWaveform: need >= 2 samples and a positive rate");
  }
  // Reject non-finite samples — a corrupt buffer must not poison the field. [SPEC]
  if (!Number.isFinite(sampleRate)) {
    throw new Error("signal_codec.fieldFromWaveform: sampleRate is not finite");
  }
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) {
      throw new Error(`signal_codec.fieldFromWaveform: samples[${i}] is not finite`);
    }
  }

  // Remove DC offset.
  let mean = 0.0;
  for (let i = 0; i < samples.length; i++) mean += samples[i];
  mean /= samples.length;

  const nyquist = sampleRate / 2.0;
  const field = new Float64Array(FIELD_SIZE);

  for (let k = 0; k < NUM_MODES; k++) {
    // 89 · φ^(k/2) Hz, folded under Nyquist. [SPEC]
    let freq = 89.0 * Math.pow(PHI, k / 2.0);
    while (freq >= nyquist) freq /= 2.0; // octave-fold: same pitch class. [SPEC]

    const omega = (2.0 * PI * freq) / sampleRate;
    const coeff = 2.0 * Math.cos(omega);
    let s0 = 0.0;
    let s1 = 0.0;
    let s2 = 0.0;
    for (let n = 0; n < samples.length; n++) {
      s0 = samples[n] - mean + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }

    const amplitude = Math.pow(PHI_INV, k); // φ^(-k) decay. [SPEC]
    field[2 * k] = amplitude * (s1 - s2 * Math.cos(omega));
    field[2 * k + 1] = amplitude * (s2 * Math.sin(omega));
  }

  return normalizeField(field);
}
