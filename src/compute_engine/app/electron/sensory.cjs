/**
 * AVA — Sensory codec: raw measurements → engine fields.
 *
 * Ported from the v14 brain's signal_codec.ts (the reference implementation,
 * mined per CORE_VISION §C-16 — not imported, since the app is its own DAG).
 * Same mathematics, same φ-discipline:
 *
 *   audio:  mono waveform → 14 φ-spaced spectral bands (exact Goertzel
 *           recurrence), f_k = 89·φ^(k/2) Hz octave-folded under Nyquist
 *   vision: luminance grid → 14 golden-spiral spatial-frequency modes
 *   both:   mean/DC removed first, φ^(-k) amplitude decay, L2-normalized
 *           28-element interleaved-complex field out.
 *
 * Resolution upgrades over v14 (the "up its resolutions" ask):
 *   audio — v14 folded bands under an 8 kHz Nyquist (16 kHz mic); the app
 *           receives 48 kHz-native windows from Web Audio, so no band ever
 *           folds below k=13 (≈2 kHz content unchanged, far finer windows).
 *   vision — v14 used an 89×55 grid (F_11×F_10); the app samples 144×89
 *           (F_12×F_11 — one Fibonacci step up, 2.6× the spatial samples).
 */
"use strict";

const E = require("./omega-bundle.cjs");

const PHI = E.PHI;
const PHI_INV = E.PHI_INV;
const TWO_PI = 2 * Math.PI;

/** 14 complex modes → 28 interleaved reals (the v14 field contract). */
const NUM_MODES = 14;
const FIELD_SIZE = 2 * NUM_MODES;

/** Golden angle 2π(1 − 1/φ) ≈ 2.399963 — maximally even directions. */
const GOLDEN_ANGLE = TWO_PI * (1 - PHI_INV);

/** L2-normalize; a zero field normalizes to the honest zero field. */
function normalizeField(field) {
  let norm = 0;
  for (let i = 0; i < field.length; i++) norm += field[i] * field[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return field;
  for (let i = 0; i < field.length; i++) field[i] /= norm;
  return field;
}

/**
 * Waveform → 28-field via exact Goertzel single-bin DFTs at f_k = 89·φ^(k/2).
 * `samples` is a mono Float array in [-1,1]; `sampleRate` its true rate.
 */
function fieldFromWaveform(samples, sampleRate) {
  if (!samples || samples.length < 2 || !(sampleRate > 0)) {
    throw new RangeError("fieldFromWaveform: need ≥2 samples and a positive rate");
  }
  let mean = 0;
  for (let i = 0; i < samples.length; i++) mean += samples[i];
  mean /= samples.length;

  const nyquist = sampleRate / 2;
  const field = new Float64Array(FIELD_SIZE);
  for (let k = 0; k < NUM_MODES; k++) {
    let freq = 89.0 * Math.pow(PHI, k / 2);
    while (freq >= nyquist) freq /= 2; // octave-fold: same pitch class
    const omega = (TWO_PI * freq) / sampleRate;
    const coeff = 2 * Math.cos(omega);
    let s0 = 0, s1 = 0, s2 = 0;
    for (let n = 0; n < samples.length; n++) {
      s0 = samples[n] - mean + coeff * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    const amp = Math.pow(PHI_INV, k);
    field[2 * k] = amp * (s1 - s2 * Math.cos(omega));
    field[2 * k + 1] = amp * (s2 * Math.sin(omega));
  }
  return normalizeField(field);
}

/** RMS energy of a waveform (DC removed) — the audio drive strength. */
function waveformEnergy(samples) {
  if (!samples || samples.length === 0) return 0;
  let mean = 0;
  for (let i = 0; i < samples.length; i++) mean += samples[i];
  mean /= samples.length;
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    const d = samples[i] - mean;
    acc += d * d;
  }
  return Math.sqrt(acc / samples.length);
}

/**
 * Luminance grid (row-major, any scale) → 28-field via golden-spiral DFT modes.
 * Mean removed first so mode structure measures texture, not brightness.
 */
function fieldFromLuminanceGrid(grid, width, height) {
  if (width <= 0 || height <= 0 || !grid || grid.length !== width * height) {
    throw new RangeError(`fieldFromLuminanceGrid: grid length !== ${width}x${height}`);
  }
  let mean = 0;
  for (let i = 0; i < grid.length; i++) mean += grid[i];
  mean /= grid.length;

  const field = new Float64Array(FIELD_SIZE);
  for (let k = 0; k < NUM_MODES; k++) {
    const r = Math.pow(PHI, k / 2);
    const angle = k * GOLDEN_ANGLE;
    const fx = r * Math.cos(angle);
    const fy = r * Math.sin(angle);
    const amp = Math.pow(PHI_INV, k);
    let re = 0, im = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = grid[y * width + x] - mean;
        const phase = TWO_PI * ((fx * x) / width + (fy * y) / height);
        re += v * Math.cos(phase);
        im += v * Math.sin(phase);
      }
    }
    field[2 * k] = amp * re;
    field[2 * k + 1] = amp * im;
  }
  return normalizeField(field);
}

/** Mean luminance of a grid in [0,1] — the vision drive strength. */
function gridMean(grid) {
  if (!grid || grid.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < grid.length; i++) acc += grid[i];
  return acc / grid.length;
}

module.exports = {
  FIELD_SIZE,
  NUM_MODES,
  fieldFromWaveform,
  waveformEnergy,
  fieldFromLuminanceGrid,
  gridMean,
};
