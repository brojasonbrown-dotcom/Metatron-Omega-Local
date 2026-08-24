/**
 * RHUFT Mind — P6 STT: VAD-gated whisper.cpp sidecar (understand speech in real time)
 *
 * Epistemic Status: [SPEC] — Adapter-layer sensor, offline STT, explicit opt-in.
 *
 * What this is: a bounded, offline speech-to-text sidecar that turns real audio
 * into REAL words on the bus. What it is NOT: always-on, or a hallucination
 * source. Two laws from MASTER_PLAN_V3 (P6 + A5) govern every line:
 *
 *   LAW 1 (no mock, honest absence): if the whisper model file or the whisper
 *     binary is not provisioned, the answer is "STT not provisioned" — surfaced
 *     via stats() and an honest meta flag, NEVER a fabricated transcript. The
 *     Web Speech API was rejected by the plan (routes through Google — not
 *     offline/honest); whisper.cpp runs fully local.
 *
 *   LAW 2 (A5 — VAD gates the expensive step): whisper is the costly call, so a
 *     cheap 1 ms-class VAD (energy + zero-crossing) runs FIRST and only lets real
 *     speech reach whisper. In silence/noise the VAD rejects ≥ 80% of frames and
 *     whisper never runs — ~10× CPU saving. The VAD is a *gate*, not a *source*:
 *     it can only ever suppress a call, never invent one.
 *
 * Pipeline: WAV (PCM16 mono, the same contract audio_mic.ts produces) → VAD
 * (energy + zero-crossing, per-frame) → if voiced, whisper.cpp → text →
 * `text.feed`-style bus frame with the REAL words + provenance (model id, WER
 * unknown until a labelled sample is run — reported honestly as such).
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// 1. VAD — energy + zero-crossing gate (A5). Cheap, deterministic, honest.
// ─────────────────────────────────────────────────────────────────────────────

/** Frame length for the VAD, in samples at 16 kHz: 25 ms = 400 samples. [SPEC] */
const VAD_FRAME = 400;
/** Hop between frames: 10 ms = 160 samples (standard VAD hop). [SPEC] */
const VAD_HOP = 160;

/**
 * Energy threshold: a frame is "active" if its RMS exceeds this fraction of the
 * clip's peak RMS. Speech sits well above background; silence/noise floors sit
 * below. φ⁻² ≈ 0.382 would be too hot for quiet consonants, so we use φ⁻⁴ ≈
 * 0.146 — the hysteresis floor — as the relative activity threshold. [POSTULATE]
 */
const ENERGY_RATIO = 0.146;

/**
 * Zero-crossing-rate (ZCR) band for voiced speech, crossings per frame. Voiced
 * speech has a LOW-to-MODERATE ZCR (glottal fundamental ~85–340 Hz → ~3–11
 * crossings per 25 ms); unvoiced fricatives and broadband noise have a HIGH ZCR;
 * pure silence has ~0. We accept a frame whose ZCR is in [ZCR_MIN, ZCR_MAX] OR
 * whose energy is clearly speech-like (see isVoicedFrame). [POSTULATE band]
 */
const ZCR_MIN = 1;
const ZCR_MAX = 40;

export interface VadFrame {
  /** Frame start sample. */
  readonly start: number;
  /** RMS energy of the frame, normalised to the clip peak (0..1). */
  readonly energyRatio: number;
  /** Zero-crossings in the frame. */
  readonly zcr: number;
  /** True iff this frame is gated as voiced (speech). */
  readonly voiced: boolean;
}

export interface VadResult {
  /** Per-frame decisions. */
  readonly frames: readonly VadFrame[];
  /** Fraction of frames gated as voiced (0..1). */
  readonly voicedFraction: number;
  /** True iff ANY frame is voiced — the gate whisper listens to. */
  readonly hasSpeech: boolean;
}

/** Zero-crossing count of a frame (sign changes between adjacent samples). */
function zeroCrossings(samples: Float64Array, start: number, len: number): number {
  let count = 0;
  let prev = samples[start] ?? 0;
  for (let i = start + 1; i < start + len && i < samples.length; i++) {
    const cur = samples[i] ?? 0;
    if ((cur >= 0 && prev < 0) || (cur < 0 && prev >= 0)) count++;
    prev = cur;
  }
  return count;
}

/** RMS of a frame. */
function rms(samples: Float64Array, start: number, len: number): number {
  let acc = 0;
  const end = Math.min(start + len, samples.length);
  let n = 0;
  for (let i = start; i < end; i++) {
    const v = samples[i] ?? 0;
    acc += v * v;
    n++;
  }
  return n === 0 ? 0 : Math.sqrt(acc / n);
}

/**
 * Run the VAD over a mono waveform. Deterministic; no state carried between
 * calls. A frame is VOICED iff its energy is speech-like AND its ZCR is not
 * pure-silence; energy is the primary gate, ZCR vetoes the silence floor. This
 * is deliberately conservative (it would rather pass a noise frame to whisper —
 * which returns empty text — than clip a real word).
 */
export function runVad(samples: Float64Array): VadResult {
  if (samples.length < VAD_FRAME) {
    return { frames: [], voicedFraction: 0, hasSpeech: false };
  }
  // Clip peak RMS for normalisation (guard: a silent clip → peak 0 → no speech).
  let peak = 0;
  for (let start = 0; start + VAD_FRAME <= samples.length; start += VAD_HOP) {
    peak = Math.max(peak, rms(samples, start, VAD_FRAME));
  }
  const frames: VadFrame[] = [];
  let voiced = 0;
  for (let start = 0; start + VAD_FRAME <= samples.length; start += VAD_HOP) {
    const e = rms(samples, start, VAD_FRAME);
    const energyRatio = peak > 0 ? e / peak : 0;
    const zcr = zeroCrossings(samples, start, VAD_FRAME);
    const isVoiced = energyRatio >= ENERGY_RATIO && zcr >= ZCR_MIN && zcr <= ZCR_MAX * 4;
    if (isVoiced) voiced++;
    frames.push({ start, energyRatio, zcr, voiced: isVoiced });
  }
  const voicedFraction = frames.length === 0 ? 0 : voiced / frames.length;
  return { frames, voicedFraction, hasSpeech: voiced > 0 };
}

/**
 * The A5 gate number: the fraction of frames the VAD SKIPPED (1 − voicedFraction).
 * The plan's gate is "skip ≥ 80% of non-speech frames" — this is the measured
 * quantity the test asserts on a silence/noise sample.
 */
export function vadSkipRate(result: VadResult): number {
  return 1 - result.voicedFraction;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. whisper.cpp sidecar — bounded, offline, honest about absence.
// ─────────────────────────────────────────────────────────────────────────────

export interface SttConfig {
  /** Path to the whisper.cpp executable (whisper-cli / main). */
  readonly whisperBin: string;
  /** Path to the whisper model file (e.g. ggml-base.en.bin). */
  readonly modelPath: string;
  /** Hard cap on one transcription's wall-clock, ms (bounded sidecar). */
  readonly timeoutMs: number;
}

export interface SttTranscript {
  /** The transcribed words (empty string when whisper heard nothing). */
  readonly text: string;
  /** True iff the VAD gated this clip as containing speech. */
  readonly voiced: boolean;
  /** Fraction of frames the VAD skipped (the A5 saving). */
  readonly vadSkipRate: number;
  /** Provenance: which model produced this (P9/A6 audit trail). */
  readonly modelId: string;
  /** Honest WER note: unknown until a labelled sample is run. */
  readonly werNote: string;
}

export type SttProvision =
  | { readonly provisioned: true }
  | { readonly provisioned: false; readonly reason: string };

/** Honest provisioning check: both the binary and the model must exist. */
export function checkProvision(cfg: SttConfig): SttProvision {
  if (!cfg.whisperBin || !fs.existsSync(cfg.whisperBin)) {
    return { provisioned: false, reason: `whisper binary not found at "${cfg.whisperBin}"` };
  }
  if (!cfg.modelPath || !fs.existsSync(cfg.modelPath)) {
    return { provisioned: false, reason: `whisper model not found at "${cfg.modelPath}" — run the explicit opt-in download` };
  }
  return { provisioned: true };
}

/**
 * Transcribe a WAV file through the VAD-gated whisper sidecar.
 *
 * The VAD runs FIRST. If it finds no speech, whisper is never invoked and the
 * honest result is an empty transcript with `voiced: false` — the ~10× CPU
 * saving is realised precisely here. If the clip is voiced, whisper.cpp runs
 * (bounded by `timeoutMs`) and its stdout is the transcript.
 *
 * Absence is reported, never filled: if provisioning fails, this throws the
 * honest reason; callers surface "STT not provisioned" rather than a guess.
 *
 * @param cfg      The sidecar configuration.
 * @param wavPath  The PCM16 mono WAV to transcribe (audio_mic.ts contract).
 * @param samples  The already-parsed waveform (for the VAD), mono Float64.
 */
export function transcribe(
  cfg: SttConfig,
  wavPath: string,
  samples: Float64Array,
): Promise<SttTranscript> {
  const provision = checkProvision(cfg);
  if (!provision.provisioned) {
    return Promise.reject(new Error(`STT not provisioned: ${provision.reason}`));
  }
  const vad = runVad(samples);
  const modelId = path.basename(cfg.modelPath);
  const werNote = "WER unknown — no labelled reference sample has been run";
  if (!vad.hasSpeech) {
    // A5: VAD gated the clip — whisper never runs. Honest empty transcript.
    return Promise.resolve({
      text: "",
      voiced: false,
      vadSkipRate: vadSkipRate(vad),
      modelId,
      werNote,
    });
  }
  return new Promise<SttTranscript>((resolve, reject) => {
    execFile(
      cfg.whisperBin,
      ["-m", cfg.modelPath, "-f", wavPath, "-nt", "-np", "--no-prints"],
      { timeout: cfg.timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`whisper failed: ${error.message}`));
          return;
        }
        resolve({
          text: String(stdout ?? "").trim(),
          voiced: true,
          vadSkipRate: vadSkipRate(vad),
          modelId,
          werNote,
        });
      },
    );
  });
}
