/**
 * F3 — OCR feed sense: images → language training, unlimited.
 *
 * The OCR ENGINE is stubbed at the smallest seam (the OcrEngine port) so the
 * test needs no WASM and no real image decode — what is PROVEN here is the
 * contract the operator asked for: every recognised line reaches the bus as a
 * "text.feed" frame via the SAME encodeText path typed words take, with NO
 * truncation (unlimited) and OCR provenance/confidence carried in the meta.
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { OcrFeedSensor } from "./../adapters/sensors/ocr_feed.ts";
import type { OcrEngine, OcrResult } from "./../adapters/ocr_engine.ts";

/** A capturing bus: records every pushed frame (the real SensorBus shape). */
function captureBus() {
  const frames: Array<{ source: string; meta: Record<string, unknown>; field: unknown }> = [];
  return {
    frames,
    bus: {
      push(frame: { source: string; meta: Record<string, unknown>; field: unknown }) {
        frames.push(frame);
        return true;
      },
    } as never,
  };
}

/** A stub OCR engine that "reads" a deterministic multi-line page. */
function stubOcr(lines: string[]): OcrEngine {
  return {
    async recognize(): Promise<OcrResult> {
      return { text: lines.join(". "), confidence: 91, elapsedMs: 5 };
    },
    async *recognizeAll(): AsyncGenerator<OcrResult & { page: number }> {
      yield { text: lines.join(". "), confidence: 91, elapsedMs: 5, page: 1 };
    },
    async terminate(): Promise<void> {},
  } as unknown as OcrEngine;
}

function tmpInbox(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ocrfeed-"));
  fs.mkdirSync(path.join(dir, "ocr"), { recursive: true });
  return dir;
}

describe("F3 OCR feed sense", () => {
  it("feeds EVERY recognised line to the bus as text.feed (unlimited, OCR provenance)", async () => {
    const inbox = tmpInbox();
    const { bus, frames } = captureBus();
    // 60 lines — past the old 89-chunk-style truncation territory once chunked.
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1} the cat sat on mat number ${i + 1}`);
    const sensor = new OcrFeedSensor(bus, inbox, stubOcr(lines));

    // Drop a fake PNG into the watched dir and let the sensor process it.
    const img = path.join(inbox, "ocr", "page.png");
    fs.writeFileSync(img, Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
    sensor.start();

    // Wait for the settle + async recognition + pacing to finish.
    await new Promise((r) => setTimeout(r, 2500));
    sensor.stop();

    expect(frames.length).toBeGreaterThan(0);
    // UNLIMITED: all 60 lines were fed (none truncated).
    expect(frames.length).toBe(60);
    for (const f of frames) {
      expect(f.source).toBe("text.feed");
      expect(f.meta["via"]).toBe("ocr");
      expect(f.meta["ocrConfidence"]).toBe(91);
    }
    const stats = sensor.stats();
    expect(stats.filesSensed).toBe(1);
    expect(stats.chunksInjected).toBe(60);
    expect(stats.failures).toBe(0);
  });

  it("reports honestly when OCR finds no legible text (nothing invented)", async () => {
    const inbox = tmpInbox();
    const { bus, frames } = captureBus();
    const sensor = new OcrFeedSensor(bus, inbox, stubOcr([])); // empty read

    const img = path.join(inbox, "ocr", "blank.png");
    fs.writeFileSync(img, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    sensor.start();
    await new Promise((r) => setTimeout(r, 1800));
    sensor.stop();

    expect(frames.length).toBe(0); // no frames fabricated from silence
    const stats = sensor.stats();
    expect(stats.failures).toBe(1);
    expect(stats.lastError).toContain("no legible text");
  });
});
