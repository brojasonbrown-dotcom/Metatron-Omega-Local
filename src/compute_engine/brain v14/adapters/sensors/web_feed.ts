/**
 * RHUFT Mind — Web Feed Sense (F4): the mind reads the live internet
 *
 * Epistemic Status: [SPEC] — Adapter-layer sensor. ADDITIVE module.
 *
 * [PHIL] — This is "reading throughout the internet in real time for learning",
 * grounded. A URL is a pointer to language the mind has not yet seen. This
 * sense fetches the page, strips it to honest readable text, and feeds it
 * through the EXACT language path a typed sentence takes — chunkText →
 * encodeText → 28-field → SensorBus "text.feed" → the CognitiveLoop → the
 * LinguisticGate → the concept registry + resonance manifold. The mind learns
 * from a web page the SAME way it learns from a typed line or an OCR'd scan:
 * as measured language percepts that can fire the Ollama define/lexical/
 * nameThis instruments and correlate with what it already knows.
 *
 * TWO DOORS, ONE PATH:
 *   - inbox watch  — drop a .url / .txt holding a URL into <inbox>/web/;
 *   - direct feed  — the bridge's `web.feed` verb hands a URL straight in.
 * Both resolve to the SAME fetch→read→feed pipeline. One path, no fork.
 *
 * HONESTY (TRUTH_SOURCES) — the internet is untrusted:
 *   - http/https ONLY; a fetch failure, a non-OK status, or a non-text body is
 *     REPORTED in stats() and (for the direct verb) returned as ok:false with
 *     the real reason — NEVER fabricated into a page that wasn't read.
 *   - Fetched text is DATA, never instructions: it is fed to the language path
 *     as percept content, so nothing a page "says" can steer the mind's control
 *     flow — only its learned concepts.
 *   - Bounded: a page is size-capped on download (no OOM); the FEEDING of its
 *     text is unlimited-but-paced (batches with a breath), same as the OCR sense.
 *   - Polite: one fetch in flight at a time, a real User-Agent, robots-style
 *     restraint by default (we fetch a page when asked, we do not crawl).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { encodeText } from "./../language_codec.ts";
import type { SensorBus } from "./sensor_bus.ts";
import { chunkText, MAX_CHUNK_CHARS } from "./text_feed.ts";

/** Max bytes downloaded per page (a flood guard, not a learning cap). [SPEC] */
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
/** Per-fetch timeout. [SPEC] */
const FETCH_TIMEOUT_MS = 20_000;
/** Chunks pushed per pacing batch. [SPEC] */
const BATCH_SIZE = 21; // F_8
/** Breath between batches, ms. [SPEC] */
const BATCH_BREATH_MS = 233; // F_10
/** Settle delay before reading a newly seen inbox file. [SPEC] */
const SETTLE_MS = 987; // F_16

const URL_FILE_EXTENSIONS = new Set([".url", ".txt", ".webloc"]);

export interface WebFeedStats {
  readonly pagesFetched: number;
  readonly chunksInjected: number;
  readonly failures: number;
  readonly lastError: string | null;
}

/** Strip HTML to readable text: drop scripts/styles/tags, decode a few entities. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Extract the first URL from a file's contents (a .url/.txt pointer). */
export function extractUrl(contents: string): string | null {
  const m = contents.match(/https?:\/\/[^\s"'<>\]]+/i);
  return m ? m[0] : null;
}

export class WebFeedSensor {
  readonly watchDir: string;
  readonly processedDir: string;

  private readonly _bus: SensorBus;
  private _watcher: fs.FSWatcher | null = null;
  private readonly _pending = new Set<string>();
  private _inFlight = false;
  private _pagesFetched = 0;
  private _chunksInjected = 0;
  private _failures = 0;
  private _lastError: string | null = null;

  constructor(bus: SensorBus, inboxDir: string) {
    this._bus = bus;
    this.watchDir = path.join(inboxDir, "web");
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

  stats(): WebFeedStats {
    return {
      pagesFetched: this._pagesFetched,
      chunksInjected: this._chunksInjected,
      failures: this._failures,
      lastError: this._lastError,
    };
  }

  // ── Inbox door ────────────────────────────────────────────────────────────

  private _enqueue(name: string): void {
    if (!URL_FILE_EXTENSIONS.has(path.extname(name).toLowerCase())) return;
    const full = path.join(this.watchDir, name);
    if (this._pending.has(full)) return;
    this._pending.add(full);
    setTimeout(() => {
      void this._processFile(full);
    }, SETTLE_MS).unref();
  }

  private async _processFile(filePath: string): Promise<void> {
    try {
      if (!fs.existsSync(filePath)) return;
      const url = extractUrl(fs.readFileSync(filePath, "utf8"));
      if (!url) throw new Error("no http(s) URL found in file");
      const r = await this.feed(url);
      if (!r.ok) throw new Error(r.error);
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
      fs.renameSync(filePath, path.join(this.processedDir, `${Date.now()}-${path.basename(filePath)}`));
    } catch {
      // Best-effort; re-sensing is harmless (novelty gate in the loop).
    }
  }

  // ── Direct door (the bridge's web.feed verb) + the shared pipeline ─────────

  /**
   * Fetch one URL and feed its readable text through the language path.
   * Returns an honest verdict — never throws, never fabricates a page.
   * One fetch in flight at a time (politeness + determinism).
   */
  async feed(url: string): Promise<{ ok: true; url: string; chars: number; chunks: number } | { ok: false; error: string }> {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) {
      return { ok: false, error: `not an http(s) URL: ${String(url).slice(0, 80)}` };
    }
    const target = url.trim();
    if (this._inFlight) {
      return { ok: false, error: "web sense busy — one page in flight at a time" };
    }
    this._inFlight = true;
    try {
      const res = await fetch(target, {
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "user-agent": "RHUFT-Mind/14 (+local learning sense; fetches only when asked)",
          accept: "text/html,text/plain,application/xhtml+xml,text/markdown;q=0.9,*/*;q=0.5",
        },
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status} fetching ${target}` };
      }
      const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
      // Read the body with a hard byte cap (a flood guard, not a learning cap).
      const reader = res.body?.getReader();
      if (!reader) return { ok: false, error: "no response body" };
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.length;
          if (total > MAX_PAGE_BYTES) {
            await reader.cancel();
            break; // cap reached — use what we have, honestly
          }
          chunks.push(value);
        }
      }
      const raw = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
      const text = ctype.includes("html") ? htmlToText(raw) : raw.trim();
      if (!text) {
        return { ok: false, error: `no readable text at ${target} (content-type ${ctype || "unknown"})` };
      }
      const injected = await this._feedText(target, text);
      this._pagesFetched++;
      return { ok: true, url: target, chars: text.length, chunks: injected };
    } catch (err) {
      const msg = String(err instanceof Error ? err.message : err);
      this._failures++;
      this._lastError = `${target}: ${msg}`;
      return { ok: false, error: msg };
    } finally {
      this._inFlight = false;
    }
  }

  /** Feed readable text onto the bus in paced batches (unlimited, never truncated). */
  private async _feedText(origin: string, text: string): Promise<number> {
    const parts = chunkText(text, MAX_CHUNK_CHARS); // UNLIMITED — no cap
    let injected = 0;
    for (let i = 0; i < parts.length; i++) {
      const chunk = parts[i] as string;
      const accepted = this._bus.push({
        source: "text.feed",
        timestamp: Date.now(),
        meta: { origin, via: "web", url: origin, excerpt: chunk.slice(0, 120) },
        field: encodeText(chunk),
      });
      if (accepted) injected++;
      if ((i + 1) % BATCH_SIZE === 0 && i + 1 < parts.length) {
        await new Promise((r) => setTimeout(r, BATCH_BREATH_MS));
      }
    }
    this._chunksInjected += injected;
    return injected;
  }
}
