/**
 * RHUFT Mind — Audio Sensor: microphone (if present) + WAV file inbox
 *
 * Epistemic Status: [SPEC] — Adapter-layer sensor, Windows host.
 *
 * Two paths into the same ear:
 *   1. MICROPHONE — if `ffmpeg` is on PATH and a DirectShow audio device is
 *      found, ffmpeg records continuous 5-second mono 16 kHz WAV segments
 *      (mic-*.wav) straight into the watched inbox. Fully automatic.
 *   2. FILE DROP — any .wav dropped into <inbox>/audio/ is sensed.
 *
 * Every WAV (PCM16 only — anything else is rejected with an honest reason)
 * is mono-mixed and projected onto 14 φ-spaced spectral bands (Goertzel)
 * → 28-field, pushed as "audio.mic" (mic segments) or "audio.file" (drops).
 *
 * Processed files move to <inbox>/audio/processed/; failures leave the file
 * and are surfaced via stats() (TRUTH_SOURCES — no synthetic audio, ever).
 */

import { execFile, spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { SensorBus } from "./sensor_bus.ts";
import { fieldFromWaveform } from "./signal_codec.ts";
import { audioSpectralEnrichment } from "./spectral_enrichment.ts";

/** Mic segment length in seconds: F_5 = 5. [SPEC] */
const SEGMENT_SECONDS = 5;

/** Mic capture rate: 16 kHz mono (speech band, cheap Goertzel). [SPEC] */
const MIC_SAMPLE_RATE = 16_000;

/** Re-check delay while a file is still being written: F_17 = 1597 ms. [SPEC] */
const STABLE_RETRY_MS = 1597;

/** Max stability retries per file: F_7 = 13. [SPEC] */
const MAX_STABLE_RETRIES = 13;

/** Cap analysed audio at 30 s to bound Goertzel cost. [SPEC] */
const MAX_ANALYSIS_SECONDS = 30;

export interface AudioSensorStats {
  readonly sensed: number;
  readonly failures: number;
  readonly micActive: boolean;
  readonly micDevice: string | null;
  readonly lastError: string | null;
}

export class AudioSensor {
  readonly watchDir: string;
  readonly processedDir: string;

  private readonly _bus: SensorBus;
  private _watcher: fs.FSWatcher | null = null;
  private _micProc: ChildProcess | null = null;
  private _micDevice: string | null = null;
  private _stopping = false;
  private readonly _pending = new Map<string, number>(); // path → last size seen
  private _sensed = 0;
  private _failures = 0;
  private _lastError: string | null = null;

  constructor(bus: SensorBus, inboxDir: string) {
    this._bus = bus;
    this.watchDir = path.join(inboxDir, "audio");
    this.processedDir = path.join(this.watchDir, "processed");
  }

  async start(): Promise<void> {
    if (this._watcher) return;
    fs.mkdirSync(this.processedDir, { recursive: true });

    for (const name of fs.readdirSync(this.watchDir)) {
      this._enqueue(name);
    }
    this._watcher = fs.watch(this.watchDir, (_event, name) => {
      if (name) this._enqueue(name);
    });

    // Best-effort microphone: absence is reported honestly, never faked.
    await this._tryStartMic();
  }

  stop(): void {
    this._stopping = true;
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
    if (this._micProc && !this._micProc.killed) {
      this._micProc.kill();
    }
    this._micProc = null;
  }

  stats(): AudioSensorStats {
    return {
      sensed: this._sensed,
      failures: this._failures,
      micActive: this._micProc !== null,
      micDevice: this._micDevice,
      lastError: this._lastError,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // File path: watch → stability check → parse → field → bus
  // ───────────────────────────────────────────────────────────────────────────

  private _enqueue(name: string): void {
    if (path.extname(name).toLowerCase() !== ".wav") return;
    const full = path.join(this.watchDir, name);
    if (this._pending.has(full)) return;
    this._pending.set(full, -1);
    setTimeout(() => {
      void this._processWhenStable(full, 0);
    }, STABLE_RETRY_MS).unref();
  }

  /** Process only once the file size has stopped growing (writer finished). */
  private async _processWhenStable(filePath: string, attempt: number): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) {
        this._pending.delete(filePath);
        return;
      }
      const size = fs.statSync(filePath).size;
      const lastSize = this._pending.get(filePath) ?? -1;
      if (size !== lastSize || size === 0) {
        if (attempt >= MAX_STABLE_RETRIES) {
          throw new Error("file never stabilized (still being written?)");
        }
        this._pending.set(filePath, size);
        setTimeout(() => {
          void this._processWhenStable(filePath, attempt + 1);
        }, STABLE_RETRY_MS).unref();
        return;
      }

      const { samples, sampleRate } = parseWavPcm16(fs.readFileSync(filePath), MAX_ANALYSIS_SECONDS);
      const field = fieldFromWaveform(samples, sampleRate);
      const spectral = audioSpectralEnrichment(samples, sampleRate);
      const isMic = path.basename(filePath).startsWith("mic-");
      const accepted = this._bus.push({
        source: isMic ? "audio.mic" : "audio.file",
        timestamp: Date.now(),
        meta: {
          path: filePath,
          file: path.basename(filePath),
          sampleRate: String(sampleRate),
          seconds: (samples.length / sampleRate).toFixed(2),
        },
        field,
        spectral,
      });
      if (accepted) {
        this._sensed++;
        this._archive(filePath, isMic);
      }
      this._pending.delete(filePath);
    } catch (err) {
      this._failures++;
      this._lastError = `${path.basename(filePath)}: ${String(err instanceof Error ? err.message : err)}`;
      this._pending.delete(filePath);
    }
  }

  private _archive(filePath: string, isMic: boolean): void {
    try {
      if (isMic) {
        // Mic segments are transient measurements — delete after sensing so
        // continuous listening never fills the disk. [SPEC]
        fs.rmSync(filePath, { force: true });
      } else {
        fs.renameSync(
          filePath,
          path.join(this.processedDir, `${Date.now()}-${path.basename(filePath)}`)
        );
      }
    } catch {
      // Best-effort; leftover files are re-checked on next start.
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Mic path: ffmpeg DirectShow → rolling WAV segments into the watched dir
  // ───────────────────────────────────────────────────────────────────────────

  private async _tryStartMic(): Promise<void> {
    const device = await findDshowAudioDevice();
    if (device === null) {
      this._lastError = "mic: no ffmpeg/DirectShow audio device — file-drop listening only";
      return;
    }
    this._micDevice = device;
    this._spawnMic(device);
  }

  private _spawnMic(device: string): void {
    const pattern = path.join(this.watchDir, "mic-%05d.wav");
    const proc = spawn(
      "ffmpeg",
      [
        "-hide_banner", "-loglevel", "error",
        "-f", "dshow", "-i", `audio=${device}`,
        "-ac", "1", "-ar", String(MIC_SAMPLE_RATE),
        "-f", "segment", "-segment_time", String(SEGMENT_SECONDS),
        "-reset_timestamps", "1", "-y", pattern,
      ],
      { stdio: "ignore", windowsHide: true }
    );
    this._micProc = proc;
    proc.on("exit", () => {
      if (this._stopping) return;
      this._micProc = null;
      // One respawn attempt after a segment-length pause; then honest silence.
      setTimeout(() => {
        if (!this._stopping && this._micProc === null) this._spawnMic(device);
      }, SEGMENT_SECONDS * 1000).unref();
    });
    proc.on("error", () => {
      this._micProc = null;
      this._lastError = "mic: ffmpeg failed to start — file-drop listening only";
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (exported for tests)
// ─────────────────────────────────────────────────────────────────────────────

/** Find the first DirectShow audio input device via ffmpeg, or null. */
export function findDshowAudioDevice(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(
      "ffmpeg",
      ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"],
      { timeout: 10_000, windowsHide: true },
      (_error, _stdout, stderr) => {
        // ffmpeg exits non-zero here by design; devices are listed on stderr.
        const text = String(stderr ?? "");
        const match = text.match(/"([^"]+)"\s*\((?:audio|none)\)/i)
          ?? text.match(/\[dshow[^\]]*\]\s+"([^"]+)"[\s\S]{0,80}?audio/i);
        resolve(match ? match[1] : null);
      }
    );
  });
}

/**
 * Parse a PCM16 WAV buffer → mono Float64 samples in [-1, 1] + sample rate.
 * Rejects non-PCM16 formats with a precise reason (TRUTH_SOURCES).
 */
export function parseWavPcm16(
  buf: Buffer,
  maxSeconds: number
): { samples: Float64Array; sampleRate: number } {
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("wav: not a RIFF/WAVE file");
  }

  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (chunkId === "fmt ") {
      if (chunkSize < 16) throw new Error("wav: fmt chunk too small");
      const format = buf.readUInt16LE(body);
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bitsPerSample = buf.readUInt16LE(body + 14);
      if (format !== 1 && format !== 0xfffe) {
        throw new Error(`wav: unsupported format tag ${format} (need PCM)`);
      }
    } else if (chunkId === "data") {
      dataOffset = body;
      dataLength = Math.min(chunkSize, buf.length - body);
      break;
    }
    offset = body + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }

  if (dataOffset < 0) throw new Error("wav: no data chunk");
  if (bitsPerSample !== 16) throw new Error(`wav: ${bitsPerSample}-bit unsupported (need 16)`);
  if (channels < 1 || sampleRate <= 0) throw new Error("wav: invalid fmt chunk");

  const bytesPerFrame = 2 * channels;
  let frames = Math.floor(dataLength / bytesPerFrame);
  frames = Math.min(frames, Math.floor(maxSeconds * sampleRate));
  if (frames < 2) throw new Error("wav: too few samples");

  const samples = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    let acc = 0;
    for (let c = 0; c < channels; c++) {
      acc += buf.readInt16LE(dataOffset + i * bytesPerFrame + c * 2);
    }
    samples[i] = acc / channels / 32768.0; // mono mix, normalize to [-1, 1)
  }
  return { samples, sampleRate };
}
