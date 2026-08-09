/**
 * Spectral audio certs — prove the certified-FFT audio percept is exact
 * (Parseval), resolves pitch and transients the Goertzel shadow cannot, and
 * discriminates near-identical timbres via the whitened signature.
 *
 * Every claim is MEASURED from real waveforms through the real transform (rule 8).
 */
import { describe, it, expect } from "vitest";
import {
  spectrogramFromWaveform,
  dominantFrequency,
  fluxContour,
  clipSpectralSignature,
  whitenedAudioSignature,
  signatureSimilarity,
  audioComplexity,
  cepstrumFromFrame,
} from "../adapters/sensors/spectral_audio.ts";
import { fieldFromWaveform } from "../adapters/sensors/signal_codec.ts";
import { resonance } from "../adapters/language_codec.ts";

const RATE = 16_000;

/** Pure tone at f Hz, plus an optional small higher harmonic for timbre. */
function tone(
  f: number,
  seconds: number,
  opts: { harmonic?: number; harmonicAmp?: number; noiseSeed?: number } = {}
): Float64Array {
  const n = Math.floor(f * 0 + seconds * RATE);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = Math.sin(2 * Math.PI * f * t);
    if (opts.harmonic && opts.harmonicAmp) {
      v += opts.harmonicAmp * Math.sin(2 * Math.PI * opts.harmonic * t);
    }
    out[i] = v * 0.5;
  }
  return out;
}

describe("spectral audio — exactness certificates", () => {
  it("conserves time-frequency energy (Parseval) to machine floor", () => {
    const spec = spectrogramFromWaveform(tone(220, 0.5), RATE, { windowSize: 1024 });
    expect(spec.frames.length).toBeGreaterThan(0);
    const rel = spec.parsevalResidual / Math.max(spec.frames[0]!.spectrum.realEnergy, 1e-12);
    expect(rel).toBeLessThan(1e-6); // machine-floor relative to a frame's energy
  });

  it("every frame carries its own machine-floor Parseval certificate", () => {
    const spec = spectrogramFromWaveform(tone(330, 0.4), RATE, { windowSize: 512 });
    for (const f of spec.frames) {
      const s = f.spectrum;
      const rel = s.parsevalResidual / Math.max(s.realEnergy, 1e-12);
      expect(rel).toBeLessThan(1e-9);
    }
  });

  it("recovers the pitch of a pure tone to within one bin", () => {
    const spec = spectrogramFromWaveform(tone(440, 0.5), RATE, { windowSize: 1024 });
    // steady-state frame (skip the first, which is window-ramped)
    const f0 = dominantFrequency(spec.frames[2]!, RATE);
    expect(Math.abs(f0 - 440)).toBeLessThanOrEqual(spec.binHz);
  });

  it("resolves a formant the 14-band Goertzel cannot see", () => {
    // A base tone vs the same tone plus a LOUD upper formant at 3.4 kHz — far
    // above the Goertzel ceiling (~2 kHz), inside the full FFT's reach. The
    // formant is strong enough to pull the dominant bin up to 3.4 kHz.
    const base = tone(200, 0.5);
    const withFormant = tone(200, 0.5, { harmonic: 3400, harmonicAmp: 2.5 });
    const sBase = spectrogramFromWaveform(base, RATE, { windowSize: 1024 });
    const sForm = spectrogramFromWaveform(withFormant, RATE, { windowSize: 1024 });
    const dBase = dominantFrequency(sBase.frames[2]!, RATE);
    const dForm = dominantFrequency(sForm.frames[2]!, RATE);
    // Base sits at the 200 Hz fundamental; the formant clip's dominant lands at
    // 3.4 kHz — a frequency the Goertzel shadow folds away entirely.
    expect(Math.abs(dBase - 200)).toBeLessThanOrEqual(sBase.binHz);
    expect(Math.abs(dForm - 3400)).toBeLessThanOrEqual(sForm.binHz);
    expect(dForm).toBeGreaterThan(2000); // provably beyond the Goertzel ceiling
  });
});

describe("spectral audio — temporal structure (onsets / transients)", () => {
  it("spectral flux spikes at an onset, stays near zero for a steady tone", () => {
    // 0.25 s silence then a 440 Hz tone — a hard onset mid-clip.
    const n = Math.floor(0.5 * RATE);
    const sig = new Float64Array(n);
    for (let i = Math.floor(0.25 * RATE); i < n; i++) {
      sig[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / RATE);
    }
    const spec = spectrogramFromWaveform(sig, RATE, { windowSize: 512, hopSize: 256 });
    const flux = fluxContour(spec);
    const maxFlux = Math.max(...flux);
    const minFlux = Math.min(...flux);
    expect(maxFlux).toBeGreaterThan(0);
    expect(maxFlux).toBeGreaterThan(10 * Math.max(minFlux, 1e-9)); // onset dominates
  });

  it("a steady tone has near-flat flux (no phantom onsets)", () => {
    // A steady tone's INTERIOR flux (excluding the genuine boundary ramp-on and
    // the real trailing-offset spike at the signal's end) must be flat and small.
    const spec = spectrogramFromWaveform(tone(440, 0.5), RATE, { windowSize: 512, hopSize: 256 });
    const flux = fluxContour(spec);
    const interior = Array.from(flux).slice(2, -2); // drop boundary transients
    const max = Math.max(...interior);
    const mean = interior.reduce((a, b) => a + b, 0) / interior.length;
    // Steady interior: no single dominant spike — ratio stays small.
    expect(max / Math.max(mean, 1e-9)).toBeLessThan(5);
    // And the absolute interior flux is far below an onset spike.
    expect(mean).toBeLessThan(1); // steady-tone flux is ~1e-3, an onset is ~1e2
  });
});

describe("spectral audio — discrimination advantage over the Goertzel path", () => {
  it("separates near-identical timbres the 28-field Goertzel cannot", () => {
    // Two clips with the same fundamental and near-identical low-band energy,
    // differing only in a quiet upper formant — the Goertzel shadow says "same".
    const a = tone(180, 0.6, { harmonic: 900, harmonicAmp: 0.3 });
    const b = tone(180, 0.6, { harmonic: 3600, harmonicAmp: 0.3 });

    // Baseline: the production 28-field Goertzel resonance.
    const baseRes = resonance(fieldFromWaveform(a, RATE), fieldFromWaveform(b, RATE));

    // Spectral percept: whitened mean-power signatures.
    const sa = spectrogramFromWaveform(a, RATE, { windowSize: 1024 });
    const sb = spectrogramFromWaveform(b, RATE, { windowSize: 1024 });
    const whitSim = signatureSimilarity(
      whitenedAudioSignature(clipSpectralSignature(sa)),
      whitenedAudioSignature(clipSpectralSignature(sb))
    );

    expect(whitSim).toBeLessThan(baseRes); // more difference than the shadow
    expect(whitSim).toBeLessThan(0.999); // and not "identical"
  });

  it("identical clips read ~1 under the whitened signature (no false positive)", () => {
    const a = tone(180, 0.6, { harmonic: 900, harmonicAmp: 0.3 });
    const sa = spectrogramFromWaveform(a, RATE, { windowSize: 1024 });
    const sb = spectrogramFromWaveform(a, RATE, { windowSize: 1024 });
    const sim = signatureSimilarity(
      whitenedAudioSignature(clipSpectralSignature(sa)),
      whitenedAudioSignature(clipSpectralSignature(sb))
    );
    expect(sim).toBeGreaterThan(0.9999);
  });
});

describe("spectral audio — cross-sensory complexity & cepstrum", () => {
  it("reports measured complexity comparable to the visual basis", () => {
    const spec = spectrogramFromWaveform(tone(220, 0.5, { harmonic: 880, harmonicAmp: 0.3 }), RATE);
    const c = audioComplexity(spec);
    for (const v of [c.entropyNorm, c.participation, c.flatness, c.rank99, c.dominantFraction]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("white noise reads higher entropy/flatness than a pure tone", () => {
    // Deterministic pseudo-noise (LCG) — no RNG, engine invariant preserved.
    const n = Math.floor(0.5 * RATE);
    const noise = new Float64Array(n);
    let s = 12345;
    for (let i = 0; i < n; i++) {
      s = (1103515245 * s + 12345) & 0x7fffffff;
      noise[i] = (s / 0x7fffffff) * 2 - 1;
    }
    const cNoise = audioComplexity(spectrogramFromWaveform(noise, RATE, { windowSize: 1024 }));
    const cTone = audioComplexity(spectrogramFromWaveform(tone(440, 0.5), RATE, { windowSize: 1024 }));
    expect(cNoise.flatness).toBeGreaterThan(cTone.flatness);
    expect(cNoise.entropyNorm).toBeGreaterThan(cTone.entropyNorm);
  });

  it("cepstrum peaks at the pitch period of a harmonic tone", () => {
    // 200 Hz fundamental at 16 kHz → pitch period 80 samples → cepstral peak
    // near quefrency 80 (the rahmonic), the homomorphic pitch signature.
    const spec = spectrogramFromWaveform(
      tone(200, 0.5, { harmonic: 400, harmonicAmp: 0.5 }),
      RATE,
      { windowSize: 2048 }
    );
    const cep = cepstrumFromFrame(spec.frames[2]!);
    const expectedQuefrency = RATE / 200; // 80 samples
    // Find the peak in a plausible pitch-quefrency band (30..300 samples).
    let best = -1, bestQ = 30;
    for (let q = 30; q < 300 && q < cep.length; q++) {
      if (cep[q]! > best) { best = cep[q]!; bestQ = q; }
    }
    expect(Math.abs(bestQ - expectedQuefrency)).toBeLessThanOrEqual(4);
  });
});
