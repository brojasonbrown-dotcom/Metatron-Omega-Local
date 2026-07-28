/**
 * RHUFT Mind — Text Feed Sensor: documents as environmental teaching
 *
 * Epistemic Status: [SPEC] — Adapter-layer sensor.
 *
 * Watches <inbox>/text/ for .txt / .md documents. Each file is read, split
 * into sentence-sized chunks (max 144 chars each, F_12 [SPEC]), and every
 * chunk is encoded through the language codec into a 28-field pushed as
 * source "text.feed" — so the environment can teach the mind words without
 * any human prompting session.
 *
 * At most 89 chunks per file (bus capacity, F_11 [SPEC]) — a book teaches
 * in successive drops, not as a single flood.
 *
 * Processed files move to <inbox>/text/processed/; failures leave the file
 * in place and are surfaced via stats() (TRUTH_SOURCES).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { encodeText } from "./../language_codec.ts";
import type { SensorBus } from "./sensor_bus.ts";

const TEXT_EXTENSIONS = new Set([".txt", ".md"]);

/** Max characters per chunk: F_12 = 144. [SPEC] */
export const MAX_CHUNK_CHARS = 144;

/** Max chunks ingested per file: F_11 = 89 (= bus capacity). [SPEC] */
const MAX_CHUNKS_PER_FILE = 89;

/** Settle delay before reading a newly seen file: F_16 = 987 ms. [SPEC] */
const SETTLE_MS = 987;

export interface TextFeedStats {
  readonly filesSensed: number;
  readonly chunksInjected: number;
  readonly failures: number;
  readonly lastError: string | null;
}

export class TextFeedSensor {
  readonly watchDir: string;
  readonly processedDir: string;

  private readonly _bus: SensorBus;
  private _watcher: fs.FSWatcher | null = null;
  private readonly _pending = new Set<string>();
  private _filesSensed = 0;
  private _chunksInjected = 0;
  private _failures = 0;
  private _lastError: string | null = null;

  constructor(bus: SensorBus, inboxDir: string) {
    this._bus = bus;
    this.watchDir = path.join(inboxDir, "text");
    this.processedDir = path.join(this.watchDir, "processed");
  }

  start(): void {
    if (this._watcher) return;
    fs.mkdirSync(this.processedDir, { recursive: true });

    for (const name of fs.readdirSync(this.watchDir)) {
      this._enqueue(name);
    }
    this._watcher = fs.watch(this.watchDir, (_event, name) => {
      if (name) this._enqueue(name);
    });
  }

  stop(): void {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  stats(): TextFeedStats {
    return {
      filesSensed: this._filesSensed,
      chunksInjected: this._chunksInjected,
      failures: this._failures,
      lastError: this._lastError,
    };
  }

  private _enqueue(name: string): void {
    if (!TEXT_EXTENSIONS.has(path.extname(name).toLowerCase())) return;
    const full = path.join(this.watchDir, name);
    if (this._pending.has(full)) return;
    this._pending.add(full);
    setTimeout(() => {
      this._process(full);
    }, SETTLE_MS).unref();
  }

  private _process(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) return;
      const text = fs.readFileSync(filePath, "utf8");
      const chunks = chunkText(text, MAX_CHUNK_CHARS).slice(0, MAX_CHUNKS_PER_FILE);
      if (chunks.length === 0) {
        throw new Error("no usable text after chunking");
      }

      let injected = 0;
      for (const chunk of chunks) {
        const accepted = this._bus.push({
          source: "text.feed",
          timestamp: Date.now(),
          meta: {
            path: filePath,
            file: path.basename(filePath),
            excerpt: chunk.slice(0, 120),
          },
          field: encodeText(chunk),
        });
        if (accepted) injected++;
      }
      this._chunksInjected += injected;
      this._filesSensed++;
      this._archive(filePath);
    } catch (err) {
      this._failures++;
      this._lastError = `${path.basename(filePath)}: ${String(err instanceof Error ? err.message : err)}`;
    } finally {
      this._pending.delete(filePath);
    }
  }

  private _archive(filePath: string): void {
    try {
      fs.renameSync(
        filePath,
        path.join(this.processedDir, `${Date.now()}-${path.basename(filePath)}`)
      );
    } catch {
      // Best-effort; re-sensing is harmless (novelty gate in the loop).
    }
  }
}

/**
 * Split text into sentence-sized chunks of at most `maxChars` characters.
 * Sentences are split on . ! ? and newlines; overlong sentences are split on
 * word boundaries. Deterministic; empty chunks are dropped.
 */
export function chunkText(text: string, maxChars: number): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChars) {
      chunks.push(sentence);
      continue;
    }
    // Split an overlong sentence on word boundaries.
    let current = "";
    for (const word of sentence.split(/\s+/)) {
      if (current.length === 0) {
        current = word.slice(0, maxChars);
      } else if (current.length + 1 + word.length <= maxChars) {
        current += ` ${word}`;
      } else {
        chunks.push(current);
        current = word.slice(0, maxChars);
      }
    }
    if (current.length > 0) chunks.push(current);
  }
  return chunks;
}
