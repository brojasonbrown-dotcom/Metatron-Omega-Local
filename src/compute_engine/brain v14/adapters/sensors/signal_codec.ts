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
