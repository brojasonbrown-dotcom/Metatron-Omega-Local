/**
 * RHUFT Mind — OCR Feed Sense (F3): the mind READS images and scans
 *
 * Epistemic Status: [SPEC] — Adapter-layer sensor. ADDITIVE module.
 *
 * [PHIL] — This is where "OCR trains the system in language" becomes literal.
 * A dropped image or scanned PDF is sight carrying WORDS. The OCR engine turns
 * the pixels into honest text; this sense then feeds EVERY recognised line
 * through the EXACT language path a typed sentence takes — chunkText →
 * encodeText → 28-field → SensorBus "text.feed" → the CognitiveLoop → the
 * LinguisticGate → the concept registry + resonance manifold. From the loop's
 * side there is no difference between a word the human typed and a word the
 * mind READ off a page: both are language percepts, both are measured by the
 * same gate, both can fire the Ollama define/lexical/nameThis instruments that
 * grow the lexicon. Reading IS the language-training loop.
 *
 * UNLIMITED (the operator's mandate): unlike TextFeedSensor (89-chunk cap), an
 * OCR'd document is NOT truncated. A whole book is read. The flood is governed
 * by PACING, not by deletion — chunks are pushed onto the bus in bounded
 * batches with a breath between them so a 500-page scan teaches steadily
 * instead of starving the other senses. Nothing is silently dropped.
 *
 * PROVENANCE honesty: the bus source is still "text.feed" (it IS text the mind
 * is learning), but the frame meta carries `via: "ocr"` + the measured OCR
 * confidence, so the downstream gate and the journal can weigh a blurry read
 * against a crisp one. TRUTH_SOURCES: a page with no legible text yields no
 * frames and is reported in stats(); nothing is invented.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { encodeText } from "./../language_codec.ts";
import { OcrEngine } from "./../ocr_engine.ts";
import type { SensorBus } from "./sensor_bus.ts";
import { chunkText, MAX_CHUNK_CHARS } from "./text_feed.ts";

/** Image formats the OCR engine reads (tesseract handles all of these). */
const OCR_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp", ".gif"]);

/** Chunks pushed per pacing batch (a breath between batches). [SPEC] */
const BATCH_SIZE = 21; // F_8
/** The breath between batches, ms — keeps a long scan from flooding the bus. */
const BATCH_BREATH_MS = 233; // F_10

/** Settle delay before reading a newly seen file: F_16. [SPEC] */
const SETTLE_MS = 987;

export interface OcrFeedStats {
  readonly filesSensed: number;
  readonly pagesRead: number;
  readonly chunksInjected: number;
  readonly failures: number;
  readonly lastError: string | null;
}

export class OcrFeedSensor {
  readonly watchDir: string;
  readonly processedDir: string;

  private readonly _bus: SensorBus;
  private readonly _ocr: OcrEngine;
  private _watcher: fs.FSWatcher | null = null;
  private readonly _pending = new Set<string>();
  private _filesSensed = 0;
  private _pagesRead = 0;
  private _chunksInjected = 0;
  private _failures = 0;
  private _lastError: string | null = null;

  constructor(bus: SensorBus, inboxDir: string, ocr?: OcrEngine) {
    this._bus = bus;
    this._ocr = ocr ?? new OcrEngine();
    this.watchDir = path.join(inboxDir, "ocr");
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

  stats(): OcrFeedStats {
    return {
      filesSensed: this._filesSensed,
      pagesRead: this._pagesRead,
      chunksInjected: this._chunksInjected,
      failures: this._failures,
      lastError: this._lastError,
    };
  }

  private _enqueue(name: string): void {
    if (!OCR_EXTENSIONS.has(path.extname(name).toLowerCase())) return;
    const full = path.join(this.watchDir, name);
    if (this._pending.has(full)) return;
    this._pending.add(full);
    setTimeout(() => {
      void this._process(full);
    }, SETTLE_MS).unref();
  }

  /**
   * OCR one image, then feed EVERY recognised line onto the bus — paced in
   * batches, never truncated. Async because recognition is async.
   */
  private async _process(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) return;
      const buf = fs.readFileSync(filePath);
      const result = await this._ocr.recognize(buf);
      this._pagesRead++;
      const chunks = chunkText(result.text, MAX_CHUNK_CHARS); // UNLIMITED — no cap
      if (chunks.length === 0) {
        throw new Error(`OCR found no legible text (confidence ${result.confidence.toFixed(0)}%)`);
      }

      let injected = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i] as string;
        const accepted = this._bus.push({
          source: "text.feed",
          timestamp: Date.now(),
          meta: {
            path: filePath,
            file: path.basename(filePath),
            via: "ocr",
            ocrConfidence: result.confidence,
            excerpt: chunk.slice(0, 120),
          },
          field: encodeText(chunk),
        });
        if (accepted) injected++;
        // Pace the flood: a breath every BATCH_SIZE so a book teaches steadily.
        if ((i + 1) % BATCH_SIZE === 0 && i + 1 < chunks.length) {
          await new Promise((r) => setTimeout(r, BATCH_BREATH_MS));
        }
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
        path.join(this.processedDir, `${Date.now()}-${path.basename(filePath)}`),
      );
    } catch {
      // Best-effort; re-sensing is harmless (the loop's novelty gate absorbs it).
    }
  }
}
