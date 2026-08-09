/**
 * RHUFT Mind — Spectral Enrichment Builder (shared by every live sensor)
 *
 * Epistemic Status: [SPEC] — Adapter-layer deterministic projection.
 *
 * One place that turns a certified spectral percept (vision or audio) into the
 * optional `SpectralEnrichment` block a sensor attaches to its bus frame. Keeping
 * the construction here means vision.file, vision.screen and audio.* all attach
 * the SAME shape — the loop's spectral tap never has to special-case a source.
 *
 * The 28-element bus `field` is untouched by everything in this file: this block
 * is ADDITIVE enrichment, never a replacement for the locked contract. [SPEC]
 */

import type { SpectralEnrichment } from "./../../schemas/validate.ts";
import {
  spectralPerceptFromGrid,
  whitenedSignature,
  complexitySignature,
} from "./spectral_perception.ts";
import {
  spectrogramFromWaveform,
  clipSpectralSignature,
  whitenedAudioSignature,
  audioComplexity,
  dominantFrequency,
} from "./spectral_audio.ts";

/**
 * Build the spectral enrichment for a 2-D luminance grid (vision sensors).
 * Runs the certified 2-D FFT percept once and lifts out the whitened identity
 * signature + measured complexity + Parseval certificate. [SPEC]
 *
 * @param grid   Row-major luminance, length = width·height.
 * @param width  Grid width (> 0).
 * @param height Grid height (> 0).
 */
export function visionSpectralEnrichment(
  grid: Float64Array,
  width: number,
  height: number
): SpectralEnrichment {
  const percept = spectralPerceptFromGrid(grid, width, height);
  return {
    whitened: whitenedSignature(percept.power),
    complexity: complexitySignature(percept),
    parsevalResidual: percept.parsevalResidual,
    // vision has no single pitch anchor — dominantHz stays absent
  };
}

/**
 * Build the spectral enrichment for a mono waveform (audio sensors). Runs the
 * certified STFT once and lifts out the whitened clip signature + measured
 * complexity + pitch anchor + Parseval certificate. [SPEC]
 *
 * @param samples    Mono waveform (any finite scale).
 * @param sampleRate Samples per second (> 0).
 * @param windowSize STFT window; default 1024 (matches the spectral_audio default).
 */
export function audioSpectralEnrichment(
  samples: Float64Array,
  sampleRate: number,
  windowSize: number = 1024
): SpectralEnrichment {
  const spec = spectrogramFromWaveform(samples, sampleRate, { windowSize });
  const signature = clipSpectralSignature(spec);
  const complexity = audioComplexity(spec);
  // Pitch anchor from the strongest frame (the clip's most voiced moment) so the
  // enrichment carries a usable f0 even for intermittent speech. [SPEC]
  let anchor = 0;
  if (spec.frames.length > 0) {
    let best = spec.frames[0]!;
    let bestE = -1;
    for (const f of spec.frames) {
      let e = 0;
      for (let k = 0; k < f.power.length; k++) e += f.power[k]!;
      if (e > bestE) {
        bestE = e;
        best = f;
      }
    }
    anchor = dominantFrequency(best, sampleRate);
  }
  return {
    whitened: whitenedAudioSignature(signature),
    complexity,
    parsevalResidual: spec.parsevalResidual,
    dominantHz: anchor,
  };
}
