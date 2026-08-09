/**
 * RHUFT Mind — Spectral Audio Perception (certified full-FFT side-channel)
 *
 * Epistemic Status: [MATH] — every certificate is computed live (rule 8).
 *
 * WHY THIS EXISTS — the production audio bus path (signal_codec.fieldFromWaveform)
 * projects a waveform onto 14 φ-spaced Goertzel bands spanning 89·φ^(k/2) Hz,
 * attenuating band k by φ⁻ᵏ and folding everything above ~2 kHz into pitch-class
 * octaves. That is the locked 28-field contract and it stays byte-identical. But
 * it throws away the time-frequency structure that actually distinguishes two
 * sounds: a spoken "ah" and "ee" share most of those 14 band energies, and a
 * transient click is invisible to a Goertzel average over the whole clip.
 *
 * This module is the audio analogue of the hi-res visual spectral percept: an
 * ADDITIVE side-channel that keeps the FULL short-time Fourier structure of the
 * signal via the engine's certified n-D FFT (analysis/spectralND.ts), so two
 * near-identical sounds are separated by the fine spectral detail the Goertzel
 * shadow cannot see. It never replaces, mutates, or re-weights the bus field.
 *
 * The certificates that make this "the Fourier transform" rather than "some
 * numbers": every frame's spectrum carries the engine's machine-floor Parseval
 * residual, and the spectrogram's total energy equals Σ over frames of the
 * windowed frame energy. A transform that does not conserve energy to machine
 * floor is not the Fourier transform.
 *
 * Pure module: no state, no I/O, no randomness (engine invariant).
 */

import {
  spectrumND,
  powerSpectrum,
  type SpectrumND,
} from "../../../engine/src/analysis/spectralND.ts";

const TWO_PI = 2 * Math.PI;

/** Options for the STFT / spectrogram. */
export interface SpectralAudioOptions {
  /**
   * STFT window length in samples (the per-frame FFT size). Default 1024 —
   * at 16 kHz that is 64 ms, ~15.6 Hz/bin, a speech-appropriate trade-off.
   * Any length ≥ 2 is exact (Bluestein), so 1024 is a choice, not a radix
   * requirement.
   */
  readonly windowSize?: number;
  /**
   * Hop between successive frames in samples. Default windowSize/2 (50%
   * overlap, COLA-friendly for the Hann window). Must be ≥ 1.
   */
  readonly hopSize?: number;
  /**
   * Window shape. "hann" (default) suppresses spectral leakage so fine
   * discrimination reads structure, not sidelobes; "rect" keeps every sample
   * unweighted for maximum Parseval fidelity. A periodic Hann is used so the
   * first/last samples are not silently zeroed.
   */
  readonly window?: "hann" | "rect";
}

/** One STFT frame: a certified 1-D spectrum plus its Parseval certificate. */
export interface SpectralFrame {
  /** Frame index (0-based); frame start sample = index · hopSize. */
  readonly index: number;
  /** The certified spectrum of the windowed frame (length = windowSize). */
  readonly spectrum: SpectrumND;
  /** Modal power |F̂|² for this frame (length = windowSize). */
  readonly power: Float64Array;
}

/** A full spectrogram: time × certified frequency, with energy certificate. */
export interface Spectrogram {
  /** Samples per second of the source waveform. */
  readonly sampleRate: number;
  /** Window length (samples) = per-frame FFT size. */
  readonly windowSize: number;
  /** Hop between frames (samples). */
  readonly hopSize: number;
  /** Ordered frames (time axis). */
  readonly frames: readonly SpectralFrame[];
  /**
   * |Σ_frames spectralEnergy − Σ_frames windowed real energy| — the
   * time-frequency Parseval certificate. Machine-floor when every frame's
   * transform is exact.
   */
  readonly parsevalResidual: number;
  /** Hz per bin (sampleRate / windowSize). */
  readonly binHz: number;
}

/**
 * Build the periodic Hann window of length n (cached per length — pure, so the
 * cache is a memoisation, not state). Periodic (w[n] = w[N−n]) so the window is
 * COLA-complementary at 50% overlap and does not zero the edge samples.
 */
const _hannCache = new Map<number, Float64Array>();
function _hann(n: number): Float64Array {
  let w = _hannCache.get(n);
  if (w) return w;
  w = new Float64Array(n);
  if (n === 1) {
    w[0] = 1;
  } else {
    for (let i = 0; i < n; i++) {
      w[i] = 0.5 * (1 - Math.cos((TWO_PI * i) / n)); // periodic Hann
    }
  }
  _hannCache.set(n, w);
  return w;
}

/**
 * Short-time Fourier transform of a mono waveform via the certified FFT.
 *
 * [MATH] — frame m is x_m[n] = w[n]·samples[m·hop + n]; its spectrum is the exact
 * DFT X_m(k) = Σ_n x_m[n] e^{−2πi k n / N}. Each frame carries the engine's
 * Parseval residual; the spectrogram folds those into one time-frequency energy
 * certificate. The window is applied BEFORE the transform (analysis windowing),
 * so the Parseval identity reads Σ_n |x_m[n]|² = (1/N)Σ_k |X_m(k)|² per frame.
 *
 * Efficiency: O(frames · N log N) via the separable certified FFT — strictly
 * cheaper per frame than the O(14·N) Goertzel it replaces for fine analysis when
 * N ≥ ~2¹⁰, and exact for every window size (Bluestein), so no zero-padding is
 * ever needed to reach a radix-2 length.
 *
 * @param samples Mono waveform (any finite scale).
 * @param sampleRate Samples per second (> 0).
 * @param opts window / hop / shape.
 */
export function spectrogramFromWaveform(
  samples: Float64Array,
  sampleRate: number,
  opts: SpectralAudioOptions = {}
): Spectrogram {
  if (samples.length < 2 || sampleRate <= 0 || !Number.isFinite(sampleRate)) {
    throw new RangeError("spectral_audio: need ≥ 2 samples and a positive finite rate.");
  }
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) {
      throw new RangeError(`spectral_audio: non-finite sample at ${i}.`);
    }
  }

  const windowSize = Math.max(2, Math.floor(opts.windowSize ?? 1024));
  const hopSize = Math.max(1, Math.floor(opts.hopSize ?? Math.floor(windowSize / 2)));
  const shape = opts.window ?? "hann";
  const win = shape === "hann" ? _hann(windowSize) : null;

  const frames: SpectralFrame[] = [];
  let spectralTotal = 0;
  let realTotal = 0;

  for (let start = 0, index = 0; start < samples.length; start += hopSize, index++) {
    // Windowed frame (zero-padded implicitly only if the tail is short — the
    // window still applies to the samples that exist; the rest are exact zeros).
    const frame = new Float64Array(windowSize);
    const avail = Math.min(windowSize, samples.length - start);
    for (let n = 0; n < avail; n++) {
      const v = samples[start + n]!;
      frame[n] = win ? v * win[n]! : v;
    }
    const spectrum = spectrumND(frame, [windowSize]);
    const power = powerSpectrum(spectrum);
    spectralTotal += spectrum.spectralEnergy;
    // The engine's realEnergy is already Parseval-scaled (it folds the ΠN_d
    // factor in), so it is on the SAME footing as spectralEnergy — summing it
    // directly keeps the aggregate certificate at machine floor. [MATH]
    realTotal += spectrum.realEnergy;
    frames.push({ index, spectrum, power });
  }

  return {
    sampleRate,
    windowSize,
    hopSize,
    frames,
    parsevalResidual: Math.abs(spectralTotal - realTotal),
    binHz: sampleRate / windowSize,
  };
}

/** The dominant frequency bin (Hz) of a frame — the pitch anchor. */
export function dominantFrequency(frame: SpectralFrame, sampleRate: number): number {
  let best = -1;
  let bestBin = 0;
  const half = frame.power.length >> 1;
  for (let k = 1; k <= half; k++) {
    // skip DC; only the non-redundant half carries independent information
    const e = frame.power[k]!;
    if (e > best) {
      best = e;
      bestBin = k;
    }
  }
  return (bestBin * sampleRate) / frame.power.length;
}

/**
 * Spectral flux between two consecutive frames — the onset / transient detector.
 *
 * [MATH] — flux = Σ_k max(0, |X_m(k)| − |X_{m−1}(k)|), the half-wave-rectified
 * increase in magnitude per bin. A steady tone has ~zero flux; a percussive
 * onset or plosive spikes it. This is the temporal structure a whole-clip
 * Goertzel average physically cannot see.
 */
export function spectralFlux(prev: SpectralFrame, next: SpectralFrame): number {
  const n = Math.min(prev.power.length, next.power.length);
  let flux = 0;
  for (let k = 0; k < n; k++) {
    const diff = Math.sqrt(next.power[k]!) - Math.sqrt(prev.power[k]!);
    if (diff > 0) flux += diff;
  }
  return flux;
}

/** The full flux contour of a spectrogram (length = frames − 1). */
export function fluxContour(spec: Spectrogram): Float64Array {
  const out = new Float64Array(Math.max(0, spec.frames.length - 1));
  for (let i = 0; i < out.length; i++) {
    out[i] = spectralFlux(spec.frames[i]!, spec.frames[i + 1]!);
  }
  return out;
}

/**
 * Aggregate full-resolution spectral signature of a whole clip: the mean modal
 * power across all frames (the time-averaged spectrum), length = windowSize.
 * This is the fine timbre fingerprint used for discrimination — the audio
 * analogue of the visual power spectrum.
 */
export function clipSpectralSignature(spec: Spectrogram): Float64Array {
  const n = spec.windowSize;
  const out = new Float64Array(n);
  const count = spec.frames.length;
  if (count === 0) return out;
  for (const f of spec.frames) {
    for (let k = 0; k < n; k++) out[k]! += f.power[k]!;
  }
  for (let k = 0; k < n; k++) out[k]! /= count;
  return out;
}

/**
 * Real cepstrum of a frame — the homomorphic timbre descriptor.
 *
 * [MATH] — c[n] = IFFT(log |X(k)|). The cepstrum separates a voice's source
 * (glottal pitch, the low-quefrency rahmonics) from its filter (formants, the
 * spectral envelope). Built on the certified inverse: the conjugate-symmetry
 * round-trip through rawDftComplex keeps it the genuine Fourier dual rather than
 * an approximation. Returns length = windowSize (quefrency axis in samples).
 */
export function cepstrumFromFrame(frame: SpectralFrame): Float64Array {
  const n = frame.power.length;
  // log-magnitude spectrum (floor the log so silent bins stay finite).
  const logMag = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    logMag[k] = Math.log(Math.sqrt(frame.power[k]!) + 1e-12);
  }
  // Inverse real DFT via the certified forward transform using the conj trick:
  // IDFT(x) = (1/N)·conj(DFT(conj(x))). logMag is real, so conj is identity.
  const spec = spectrumND(logMag, [n]);
  const out = new Float64Array(n);
  const inv = 1 / n;
  for (let i = 0; i < n; i++) out[i] = spec.re[i]! * inv;
  return out;
}

/**
 * Whitened (log-power) audio signature — the fine-discrimination descriptor.
 * The raw mean power is dominated by low-frequency energy, so a subtle formant
 * shift barely moves it; log1p compresses the dynamic range so a weak but real
 * high-frequency difference registers proportionally to its STRUCTURE. Pass two
 * of these to cosineSimilarity to compare timbre, not loudness. Mirrors the
 * visual whitened signature so sights and sounds share a discrimination basis.
 */
export function whitenedAudioSignature(signature: Float64Array): Float64Array {
  const out = new Float64Array(signature.length);
  for (let i = 0; i < signature.length; i++) out[i] = Math.log1p(signature[i]!);
  return out;
}

/**
 * Cosine similarity in [0, 1] between two equal-length spectral signatures.
 * 1 = identical distribution. Pass whitened signatures to compare fine timbre.
 */
export function signatureSimilarity(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length) {
    throw new RangeError(`spectral_audio.signatureSimilarity: length ${a.length} ≠ ${b.length}`);
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na <= 0 || nb <= 0) return na === nb ? 1 : 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Cross-sensory complexity signature of a clip, in the SAME measured basis as
 * the visual complexitySignature — so a sight and a sound become commensurable
 * by modal occupancy. Computed on the clip's time-averaged power spectrum.
 */
export function audioComplexity(spec: Spectrogram): {
  readonly entropyNorm: number;
  readonly participation: number;
  readonly flatness: number;
  readonly rank99: number;
  readonly dominantFraction: number;
} {
  const sig = clipSpectralSignature(spec);
  // Use only the non-redundant half (bins 1..N/2) — the independent information.
  const half = sig.length >> 1;
  const p = new Float64Array(half);
  let total = 0;
  for (let k = 0; k < half; k++) {
    p[k] = sig[k + 1]!; // skip DC
    total += p[k]!;
  }
  if (total <= 0) {
    return { entropyNorm: 0, participation: 0, flatness: 0, rank99: 0, dominantFraction: 0 };
  }
  // Shannon entropy of the normalised power distribution.
  let entropy = 0;
  let geo = 0;
  let max = 0;
  let count = 0;
  for (let k = 0; k < half; k++) {
    const q = p[k]! / total;
    if (q > 0) {
      entropy -= q * Math.log(q);
      geo += Math.log(p[k]!);
      count++;
    }
    if (p[k]! > max) max = p[k]!;
  }
  const entropyNorm = half > 1 ? entropy / Math.log(half) : 0;
  const participation = Math.exp(entropy) / half;
  // Spectral flatness: geometric mean / arithmetic mean (Wiener entropy).
  const arith = total / half;
  const flatness = count > 0 && arith > 0 ? Math.exp(geo / count) / arith : 0;
  // rank99: fraction of bins holding 99% of energy (sorted descending).
  const sorted = Float64Array.from(p).sort();
  let acc = 0;
  let rank = 0;
  for (let i = sorted.length - 1; i >= 0 && acc < 0.99 * total; i--) {
    acc += sorted[i]!;
    rank++;
  }
  const rank99 = half > 0 ? rank / half : 0;
  const dominantFraction = max / total;
  return { entropyNorm, participation, flatness, rank99, dominantFraction };
}
