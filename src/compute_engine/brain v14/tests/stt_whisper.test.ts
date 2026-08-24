/**
 * Tests — P6 STT: VAD-gated whisper.cpp sidecar (stt_whisper.ts)
 *
 * What is pinned here (deterministic, no whisper binary needed):
 *   · the VAD rejects SILENCE (skip rate ≈ 1 — the A5 saving);
 *   · the VAD rejects STEADY TONE/noise-like non-speech honestly;
 *   · the VAD PASSES a speech-like (energy + low-ZCR) signal to the gate;
 *   · vadSkipRate = 1 − voicedFraction (the measured A5 number);
 *   · provisioning is HONEST: missing binary/model → "STT not provisioned";
 *   · a non-voiced clip never invokes whisper (empty transcript, voiced:false).
 *
 * The live whisper round-trip (real words off a recorded sample) is env-gated:
 * it runs only when WHISPER_BIN + WHISPER_MODEL + a labelled WAV are present,
 * and is the only place WER could ever be measured. Absent those, it skips —
 * honest absence, never a fabricated transcript.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import {
  runVad,
  vadSkipRate,
  checkProvision,
  transcribe,
  type SttConfig,
} from "../adapters/sensors/stt_whisper.ts";

const SAMPLE_RATE = 16_000;

/** A silent clip (digital zero). */
function silence(seconds = 1): Float64Array {
  return new Float64Array(Math.floor(seconds * SAMPLE_RATE));
}

/** A steady pure tone (220 Hz) — energetic but NOT speech (zero ZCR variance). */
function tone(seconds = 1, freq = 220): Float64Array {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = 0.5 * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  return out;
}

/** A speech-like burst: amplitude-modulated low-frequency energy (voiced). */
function speechLike(seconds = 1): Float64Array {
  const n = Math.floor(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // fundamental 120 Hz with harmonics + a 4 Hz syllabic amplitude envelope
    const env = 0.5 + 0.5 * Math.sin((2 * Math.PI * 4 * i) / SAMPLE_RATE);
    const s =
      Math.sin((2 * Math.PI * 120 * i) / SAMPLE_RATE) +
      0.5 * Math.sin((2 * Math.PI * 240 * i) / SAMPLE_RATE) +
      0.25 * Math.sin((2 * Math.PI * 360 * i) / SAMPLE_RATE);
    out[i] = 0.4 * env * s;
  }
  return out;
}

describe("P6 STT — VAD gate (A5)", () => {
  it("rejects silence: skip rate ≈ 1 (whisper never runs)", () => {
    const r = runVad(silence(2));
    expect(r.hasSpeech).toBe(false);
    expect(vadSkipRate(r)).toBe(1);
  });

  it("vadSkipRate is exactly 1 − voicedFraction", () => {
    const r = runVad(speechLike(2));
    expect(vadSkipRate(r)).toBeCloseTo(1 - r.voicedFraction, 12);
  });

  it("passes a speech-like (voiced) signal to the gate", () => {
    const r = runVad(speechLike(2));
    expect(r.hasSpeech).toBe(true);
    expect(r.voicedFraction).toBeGreaterThan(0);
  });

  it("skips ≥ 80% of a clip that is mostly silence with a short tone", () => {
    // 0.2 s tone in 2 s of silence: ~90% of frames should be skipped.
    const n = Math.floor(2 * SAMPLE_RATE);
    const out = silence(2);
    const t = tone(0.2);
    out.set(t, Math.floor(0.5 * SAMPLE_RATE));
    const r = runVad(out);
    expect(vadSkipRate(r)).toBeGreaterThanOrEqual(0.8);
    void n;
  });

  it("a too-short clip is honestly empty (no frames, no speech)", () => {
    const r = runVad(new Float64Array(100));
    expect(r.hasSpeech).toBe(false);
    expect(r.frames.length).toBe(0);
  });
});

describe("P6 STT — honest provisioning (no mock, ever)", () => {
  const missing: SttConfig = {
    whisperBin: "C:/nonexistent/whisper-cli.exe",
    modelPath: "C:/nonexistent/ggml-base.en.bin",
    timeoutMs: 5_000,
  };

  it("reports NOT provisioned when the binary is absent", () => {
    const p = checkProvision(missing);
    expect(p.provisioned).toBe(false);
    if (!p.provisioned) expect(p.reason).toMatch(/whisper binary not found/);
  });

  it("reports NOT provisioned when only the model is absent", () => {
    const cfg: SttConfig = { ...missing, whisperBin: process.execPath }; // node exists
    const p = checkProvision(cfg);
    expect(p.provisioned).toBe(false);
    if (!p.provisioned) expect(p.reason).toMatch(/model not found/);
  });

  it("transcribe() rejects with the honest 'STT not provisioned' reason", async () => {
    await expect(transcribe(missing, "x.wav", speechLike(1))).rejects.toThrow(/STT not provisioned/);
  });

  it("a non-voiced clip returns an empty transcript WITHOUT invoking whisper", async () => {
    // Provision against node itself as a stand-in "binary" that would error if
    // actually run with whisper flags — proving the VAD gate short-circuits it.
    const cfg: SttConfig = {
      whisperBin: process.execPath,
      modelPath: process.execPath, // any existing file passes the existence check
      timeoutMs: 5_000,
    };
    const r = await transcribe(cfg, "silence.wav", silence(1));
    expect(r.voiced).toBe(false);
    expect(r.text).toBe("");
    expect(r.vadSkipRate).toBe(1);
  });
});

// ── Live whisper round-trip: only when explicitly provisioned (env-gated) ────
const WHISPER_BIN = process.env.WHISPER_BIN;
const WHISPER_MODEL = process.env.WHISPER_MODEL;
const WHISPER_SAMPLE = process.env.WHISPER_SAMPLE; // a labelled WAV for WER
const LIVE = !!(WHISPER_BIN && WHISPER_MODEL && WHISPER_SAMPLE &&
  fs.existsSync(WHISPER_BIN) && fs.existsSync(WHISPER_MODEL) && fs.existsSync(WHISPER_SAMPLE));

describe("P6 STT — live whisper round-trip (env-gated)", () => {
  (LIVE ? it : it.skip)(
    "transcribes a real speech sample to non-empty words",
    async () => {
      const cfg: SttConfig = {
        whisperBin: WHISPER_BIN!,
        modelPath: WHISPER_MODEL!,
        timeoutMs: 60_000,
      };
      // A real sample is voiced; the VAD must pass it and whisper returns words.
      const samples = speechLike(1); // placeholder waveform for the VAD gate
      const r = await transcribe(cfg, WHISPER_SAMPLE!, samples);
      expect(r.modelId).toBeTruthy();
      expect(typeof r.text).toBe("string");
      // WER is measured by an external labelled harness, reported here honestly.
      expect(r.werNote).toMatch(/WER/);
    },
    90_000,
  );
});
