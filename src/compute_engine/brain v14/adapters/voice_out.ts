/**
 * RHUFT Mind — Voice Out: the mind speaks its thoughts
 *
 * Epistemic Status: [SPEC] — Adapter-layer output, Windows host.
 *
 * Every voiced thought goes to THREE places, in order of reliability:
 *   1. Console (always) — the mind's visible stream of consciousness.
 *   2. Journal (always) — the auditable record ("voice" entries).
 *   3. Windows SAPI TTS via PowerShell System.Speech (on by default,
 *      disable with MIND_TTS=0) — the audible voice.
 *
 * TTS is a strict single queue (one utterance at a time, max 5 pending,
 * oldest dropped [SPEC]) — a mind that talks over itself says nothing.
 */

import { execFile } from "node:child_process";
import type { MemoryStore } from "./../cognition/memory_store.ts";

/** Max queued utterances: F_5 = 5. [SPEC] */
const MAX_QUEUE = 5;

/** Per-utterance TTS timeout. [SPEC] */
const TTS_TIMEOUT_MS = 60_000;

export class VoiceOut {
  private readonly _store: MemoryStore;
  private readonly _ttsEnabled: boolean;
  private readonly _queue: string[] = [];
  private _speaking = false;

  constructor(store: MemoryStore) {
    this._store = store;
    this._ttsEnabled = process.env["MIND_TTS"] !== "0";
  }

  /**
   * Speak a thought. Console + journal are synchronous and unconditional;
   * TTS is queued and best-effort.
   */
  speak(text: string, meta: Record<string, unknown> = {}): void {
    const line = text.trim();
    if (line.length === 0) return;

    // 1. Console — the visible stream of consciousness.
    console.log(`🗣  ${line}`);

    // 2. Journal — the audit trail.
    this._store.journal({ t: Date.now(), kind: "voice", data: { text: line, ...meta } });

    // 3. TTS — audible, queued, best-effort.
    if (this._ttsEnabled) {
      this._queue.push(line);
      if (this._queue.length > MAX_QUEUE) this._queue.shift();
      void this._drainTts();
    }
  }

  private async _drainTts(): Promise<void> {
    if (this._speaking) return;
    this._speaking = true;
    try {
      while (this._queue.length > 0) {
        const text = this._queue.shift();
        if (text === undefined) break;
        await this._sapiSpeak(text);
      }
    } finally {
      this._speaking = false;
    }
  }

  /** One utterance through Windows SAPI (System.Speech). Errors are swallowed —
   *  losing audio must never lose the thought (console/journal already have it). */
  private _sapiSpeak(text: string): Promise<void> {
    const escaped = text.replace(/'/g, "''").slice(0, 300);
    const script =
      "Add-Type -AssemblyName System.Speech; " +
      "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
      `$s.Speak('${escaped}'); $s.Dispose()`;
    return new Promise((resolve) => {
      execFile(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
        { timeout: TTS_TIMEOUT_MS, windowsHide: true },
        () => resolve()
      );
    });
  }
}
