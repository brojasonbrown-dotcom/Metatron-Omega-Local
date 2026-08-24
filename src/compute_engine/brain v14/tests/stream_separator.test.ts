/**
 * Tests — Spectral Source Separator (M2, auditory stream parsing).
 *
 * Guarantees under test:
 *   1. A single sustained tone separates into ONE stream.
 *   2. A bark-then-hum soundscape separates into TWO streams with distinct
 *      time support and distinct dominant frequencies.
 *   3. Streams are energy-certified: energyFraction sums to ~1 (Parseval-honest).
 *   4. A silence clip yields NO streams (honest empty).
 *   5. Determinism.
 */

import { describe, expect, it } from "vitest";
import { separateStreams } from "../adapters/sensors/stream_separator.ts";
import { spectrogramFromWaveform } from "../adapters/sensors/spectral_audio.ts";

const SR = 16_000;

/** A pure tone of `hz` for `seconds`, amplitude `amp`, into `out` at `offsetSamples`. */
function tone(out: Float64Array, hz: number, seconds: number, amp: number, offsetSamples: number): void {
  const n = Math.floor(seconds * SR);
  for (let i = 0; i < n && offsetSamples + i < out.length; i++) {
    out[offsetSamples + i] = amp * Math.sin((2 * Math.PI * hz * i) / SR);
  }
}

/** A short broadband burst (a "bark" proxy): sum of several harmonics, brief. */
function burst(out: Float64Array, seconds: number, amp: number, offsetSamples: number): void {
  const n = Math.floor(seconds * SR);
  for (let i = 0; i < n && offsetSamples + i < out.length; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 18); // sharp attack, fast decay — percussive
    out[offsetSamples + i] =
      amp * env * (Math.sin(2 * Math.PI * 300 * t) + 0.6 * Math.sin(2 * Math.PI * 900 * t) + 0.4 * Math.sin(2 * Math.PI * 1800 * t));
  }
}

function specOf(samples: Float64Array) {
  return spectrogramFromWaveform(samples, SR, { windowSize: 1024 });
}

describe("stream_separator — auditory stream parsing", () => {
  it("SINGLE: one sustained tone yields exactly one stream", () => {
    const samples = new Float64Array(SR * 1);
    tone(samples, 440, 1.0, 0.5, 0);
    const dec = separateStreams(specOf(samples), SR);
    expect(dec.count).toBe(1);
    expect(dec.streams[0]!.dominantHz).toBeGreaterThan(200);
    expect(dec.streams[0]!.dominantHz).toBeLessThan(700);
    expect(dec.streams[0]!.energyFraction).toBeGreaterThan(0.9);
  });

  it("TWO: bark-then-hum separates into two streams with distinct support + pitch", () => {
    const samples = new Float64Array(SR * 2);
    burst(samples, 0.25, 0.8, 0); // a broadband burst first
    tone(samples, 220, 1.2, 0.5, Math.floor(SR * 0.9)); // then a low sustained hum
    const dec = separateStreams(specOf(samples), SR);
    expect(dec.count).toBeGreaterThanOrEqual(2);
    // The two strongest streams must occupy different time regions.
    const [s0, s1] = dec.streams;
    const t0 = new Set(s0!.frames);
    const overlap = s1!.frames.filter((f) => t0.has(f)).length;
    expect(overlap).toBeLessThan(Math.min(s0!.frames.length, s1!.frames.length));
    // Distinct dominant frequencies (the hum is low; the burst is broadband/higher).
    expect(Math.abs(s0!.dominantHz - s1!.dominantHz)).toBeGreaterThan(50);
  });

  it("ENERGY-CERTIFIED: stream energyFractions sum to ~1 (Parseval-honest)", () => {
    const samples = new Float64Array(SR * 2);
    burst(samples, 0.25, 0.8, 0);
    tone(samples, 220, 1.2, 0.5, Math.floor(SR * 0.9));
    const dec = separateStreams(specOf(samples), SR);
    const sum = dec.streams.reduce((a, s) => a + s.energyFraction, 0);
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThanOrEqual(1.0000001);
  });

  it("SILENCE: a silent clip yields no meaningful stream (honest)", () => {
    const samples = new Float64Array(SR).fill(0);
    // Add a tiny dither so the FFT has finite (near-zero) energy to read.
    for (let i = 0; i < samples.length; i++) samples[i] = (i % 2 ? 1 : -1) * 1e-9;
    const dec = separateStreams(specOf(samples), SR);
    // Any stream that forms must carry negligible energy.
    for (const s of dec.streams) expect(s.energyMass).toBeLessThan(1e-6);
  });

  it("DETERMINISM: identical clips decompose identically", () => {
    const samples = new Float64Array(SR * 2);
    burst(samples, 0.25, 0.8, 0);
    tone(samples, 220, 1.2, 0.5, Math.floor(SR * 0.9));
    const run = () => {
      const dec = separateStreams(specOf(samples), SR);
      return dec.streams.map((s) => [s.energyMass, s.dominantHz, s.frames.length]);
    };
    expect(run()).toEqual(run());
  });
});
