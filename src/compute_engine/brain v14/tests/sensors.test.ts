/**
 * Tests — Sensor layer: bus validation, WAV parsing, text chunking,
 * signal→field codecs, luminance CSV parsing
 *
 * Plan requirements: every external payload is schema-validated before it
 * touches the engine; all field codecs are deterministic and emit exactly
 * 28 elements at unit norm.
 */

import { describe, expect, it } from "vitest";
import { FIELD_SIZE, encodeText } from "../adapters/language_codec.ts";
import { parseWavPcm16 } from "../adapters/sensors/audio_mic.ts";
import { SensorBus } from "../adapters/sensors/sensor_bus.ts";
import {
    fieldFromLuminanceGrid,
    fieldFromWaveform,
} from "../adapters/sensors/signal_codec.ts";
import { chunkText } from "../adapters/sensors/text_feed.ts";
import { parseLuminanceCsv } from "../adapters/sensors/vision_screen.ts";

function goodFrame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: "text.feed",
    timestamp: Date.now(),
    meta: { origin: "test" },
    field: encodeText("a valid sensory frame"),
    ...overrides,
  };
}

describe("SensorBus validation", () => {
  it("accepts a valid frame", () => {
    const bus = new SensorBus();
    expect(bus.push(goodFrame())).toBe(true);
    expect(bus.stats().accepted).toBe(1);
    expect(bus.drain(10).length).toBe(1);
  });

  it("rejects unknown sources", () => {
    const bus = new SensorBus();
    expect(bus.push(goodFrame({ source: "telepathy" }))).toBe(false);
    expect(bus.stats().rejected).toBe(1);
    expect(bus.lastRejectReason).toContain("source");
  });

  it("rejects wrong-size fields", () => {
    const bus = new SensorBus();
    expect(bus.push(goodFrame({ field: new Float64Array(27) }))).toBe(false);
    expect(bus.stats().rejected).toBe(1);
  });

  it("rejects non-object payloads", () => {
    const bus = new SensorBus();
    expect(bus.push("not a frame")).toBe(false);
    expect(bus.push(null)).toBe(false);
    expect(bus.stats().rejected).toBe(2);
  });

  it("bounds the queue at capacity, dropping oldest", () => {
    const bus = new SensorBus();
    for (let i = 0; i < bus.capacity + 10; i++) {
      bus.push(goodFrame({ meta: { i: String(i) } }));
    }
    const stats = bus.stats();
    expect(stats.queued).toBe(bus.capacity);
    expect(stats.dropped).toBe(10);
    // oldest were dropped — the first queued frame is now i=10
    const first = bus.drain(1)[0];
    expect(first.meta["i"]).toBe("10");
  });

  it("drain(max) never exceeds max and empties in order", () => {
    const bus = new SensorBus();
    for (let i = 0; i < 7; i++) bus.push(goodFrame({ meta: { i: String(i) } }));
    expect(bus.drain(5).length).toBe(5);
    expect(bus.drain(5).length).toBe(2);
    expect(bus.drain(5).length).toBe(0);
  });
});

/** Build a minimal valid PCM16 mono WAV buffer with a pure sine tone. */
function makeWav(sampleRate: number, seconds: number, freqHz: number, channels = 1): Buffer {
  const frames = Math.floor(sampleRate * seconds);
  const dataLen = frames * 2 * channels;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16); // fmt chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2 * channels, 28); // byte rate
  buf.writeUInt16LE(2 * channels, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataLen, 40);
  for (let i = 0; i < frames; i++) {
    const v = Math.round(Math.sin((2 * Math.PI * freqHz * i) / sampleRate) * 30000);
    for (let c = 0; c < channels; c++) {
      buf.writeInt16LE(v, 44 + (i * channels + c) * 2);
    }
  }
  return buf;
}

describe("parseWavPcm16", () => {
  it("parses a synthetic PCM16 mono WAV to samples in [-1, 1)", () => {
    const wav = makeWav(16000, 0.1, 440);
    const { samples, sampleRate } = parseWavPcm16(wav, 30);
    expect(sampleRate).toBe(16000);
    expect(samples.length).toBe(1600);
    let max = 0;
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThan(1);
      max = Math.max(max, Math.abs(s));
    }
    expect(max).toBeGreaterThan(0.5); // the tone is actually there
  });

  it("mono-mixes stereo", () => {
    const wav = makeWav(8000, 0.05, 220, 2);
    const { samples } = parseWavPcm16(wav, 30);
    expect(samples.length).toBe(400);
  });

  it("caps at maxSeconds", () => {
    const wav = makeWav(8000, 2, 220);
    const { samples } = parseWavPcm16(wav, 1);
    expect(samples.length).toBe(8000);
  });

  it("rejects non-WAV buffers with a precise reason", () => {
    expect(() => parseWavPcm16(Buffer.from("definitely not audio data here"), 30)).toThrow(
      /RIFF/
    );
  });

  it("rejects non-16-bit WAVs", () => {
    const wav = makeWav(8000, 0.05, 220);
    wav.writeUInt16LE(8, 34); // claim 8-bit
    expect(() => parseWavPcm16(wav, 30)).toThrow(/16/);
  });
});

describe("chunkText", () => {
  it("splits on sentence boundaries within the size limit", () => {
    const text = "First sentence. Second sentence! Third one? Fourth.";
    const chunks = chunkText(text, 40);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(40);
      expect(c.trim().length).toBeGreaterThan(0);
    }
  });

  it("hard-splits an overlong unbroken sentence on word boundaries", () => {
    const text = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkText(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(50);
  });

  it("returns [] for empty/whitespace text", () => {
    expect(chunkText("   \n  ", 100)).toEqual([]);
  });

  it("every chunk survives the language codec (non-empty after normalization)", () => {
    const chunks = chunkText("The mind senses. The mind learns. The mind speaks.", 144);
    for (const c of chunks) {
      expect(encodeText(c).length).toBe(FIELD_SIZE);
    }
  });
});

describe("signal_codec — deterministic field projections", () => {
  it("fieldFromWaveform: 28 elements, unit norm, deterministic", () => {
    const { samples, sampleRate } = ((): { samples: Float64Array; sampleRate: number } => {
      const wav = makeWav(16000, 0.1, 440);
      return parseWavPcm16(wav, 30);
    })();
    const a = fieldFromWaveform(samples, sampleRate);
    const b = fieldFromWaveform(samples, sampleRate);
    expect(a.length).toBe(FIELD_SIZE);
    expect(Array.from(a)).toEqual(Array.from(b));
    let normSq = 0;
    for (const x of a) normSq += x * x;
    expect(normSq).toBeCloseTo(1.0, 9);
  });

  it("fieldFromWaveform distinguishes different tones", () => {
    const low = parseWavPcm16(makeWav(16000, 0.1, 200), 30);
    const high = parseWavPcm16(makeWav(16000, 0.1, 3000), 30);
    const fLow = fieldFromWaveform(low.samples, low.sampleRate);
    const fHigh = fieldFromWaveform(high.samples, high.sampleRate);
    expect(Array.from(fLow)).not.toEqual(Array.from(fHigh));
  });

  it("fieldFromWaveform throws on degenerate input", () => {
    expect(() => fieldFromWaveform(new Float64Array(1), 16000)).toThrow();
    expect(() => fieldFromWaveform(new Float64Array(100), 0)).toThrow();
  });

  it("fieldFromLuminanceGrid: 28 elements, unit norm, deterministic", () => {
    const w = 89;
    const h = 55;
    const grid = new Float64Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        grid[y * w + x] = (Math.sin(x / 7) + Math.cos(y / 5) + 2) / 4; // structured, deterministic
      }
    }
    const a = fieldFromLuminanceGrid(grid, w, h);
    const b = fieldFromLuminanceGrid(grid, w, h);
    expect(a.length).toBe(FIELD_SIZE);
    expect(Array.from(a)).toEqual(Array.from(b));
    let normSq = 0;
    for (const x of a) normSq += x * x;
    expect(normSq).toBeCloseTo(1.0, 9);
  });

  it("fieldFromLuminanceGrid throws on size mismatch", () => {
    expect(() => fieldFromLuminanceGrid(new Float64Array(10), 89, 55)).toThrow();
  });
});

describe("parseLuminanceCsv", () => {
  it("parses exactly the expected count of finite values", () => {
    const values = [0, 0.25, 0.5, 0.75, 1];
    const grid = parseLuminanceCsv(values.join(","), values.length);
    expect(Array.from(grid)).toEqual(values);
  });

  it("throws on wrong count", () => {
    expect(() => parseLuminanceCsv("0.1,0.2", 3)).toThrow();
  });

  it("throws on non-numeric junk", () => {
    expect(() => parseLuminanceCsv("0.1,banana,0.3", 3)).toThrow();
  });
});
