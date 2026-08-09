/**
 * Tests — Spectral bus feed pipeline: the additive spectral enrichment channel.
 *
 * Plan guarantees under test:
 *   1. Legacy frames (28-field, no spectral block) still validate and pass — the
 *      locked contract is byte-for-byte backward compatible.
 *   2. Enriched frames validate and the spectral block survives the bus round-trip
 *      intact (whitened signature + complexity + Parseval certificate + pitch).
 *   3. A corrupt spectral block is rejected loudly, never silently repaired.
 *   4. The cognitive loop's spectral tap records measured complexity for BOTH
 *      modalities without perturbing the engine's 28-field processing.
 */

import { describe, expect, it } from "vitest";
import { encodeText } from "../adapters/language_codec.ts";
import { SensorBus } from "../adapters/sensors/sensor_bus.ts";
import {
  visionSpectralEnrichment,
  audioSpectralEnrichment,
} from "../adapters/sensors/spectral_enrichment.ts";
import { fieldFromLuminanceGrid, fieldFromWaveform } from "../adapters/sensors/signal_codec.ts";
import { SpectralMemory } from "../cognition/spectral_memory.ts";
import type { SensoryFrame, SpectralEnrichment } from "../schemas/validate.ts";

const RATE = 16000;

/** A small deterministic luminance gradient grid (vision fixture). */
function makeGrid(w: number, h: number): Float64Array {
  const g = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      g[y * w + x] = (x / w) * 0.7 + (y / h) * 0.3;
    }
  }
  return g;
}

/** A deterministic two-harmonic tone (audio fixture). */
function makeTone(seconds: number): Float64Array {
  const n = Math.floor(seconds * RATE);
  const o = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    o[i] = 0.5 * (Math.sin(2 * Math.PI * 220 * t) + 0.3 * Math.sin(2 * Math.PI * 880 * t));
  }
  return o;
}

function visionFrame(): Record<string, unknown> {
  const grid = makeGrid(32, 32);
  return {
    source: "vision.file",
    timestamp: Date.now(),
    meta: { file: "fixture.png" },
    field: fieldFromLuminanceGrid(grid, 32, 32),
    spectral: visionSpectralEnrichment(grid, 32, 32),
  };
}

function audioFrame(): Record<string, unknown> {
  const samples = makeTone(0.4);
  return {
    source: "audio.file",
    timestamp: Date.now(),
    meta: { file: "fixture.wav", sampleRate: String(RATE) },
    field: fieldFromWaveform(samples, RATE),
    spectral: audioSpectralEnrichment(samples, RATE),
  };
}

describe("spectral bus channel — backward compatibility", () => {
  it("accepts a legacy frame with no spectral block (28-field unchanged)", () => {
    const bus = new SensorBus();
    const ok = bus.push({
      source: "text.feed",
      timestamp: Date.now(),
      meta: { origin: "test" },
      field: encodeText("a valid legacy frame"),
    });
    expect(ok).toBe(true);
    const frame = bus.drain(1)[0]!;
    expect(frame.field.length).toBe(28);
    expect(frame.spectral).toBeUndefined();
  });

  it("still rejects a wrong-size bus field even when spectral is present", () => {
    const bus = new SensorBus();
    const grid = makeGrid(16, 16);
    const ok = bus.push({
      source: "vision.file",
      timestamp: Date.now(),
      meta: {},
      field: new Float64Array(27), // wrong — the 28-field gate is untouched
      spectral: visionSpectralEnrichment(grid, 16, 16),
    });
    expect(ok).toBe(false);
    expect(bus.lastRejectReason).toContain("28");
  });
});

describe("spectral bus channel — enrichment round-trip", () => {
  it("vision enrichment survives the bus intact", () => {
    const bus = new SensorBus();
    const before = visionFrame();
    expect(bus.push(before)).toBe(true);
    const frame = bus.drain(1)[0]!;
    expect(frame.field.length).toBe(28);
    const s = frame.spectral!;
    expect(s).toBeDefined();
    // 32×32 grid → 1024-bin power spectrum → whitened signature length 1024.
    expect(s.whitened.length).toBe(32 * 32);
    // Parseval certificate at machine floor.
    expect(s.parsevalResidual).toBeLessThan(1e-6);
    // Complexity is a well-formed five-number signature in [0,1]-ish ranges.
    for (const k of ["entropyNorm", "participation", "flatness", "rank99", "dominantFraction"] as const) {
      expect(Number.isFinite(s.complexity[k])).toBe(true);
    }
    // Vision carries no pitch anchor.
    expect(s.dominantHz).toBeUndefined();
  });

  it("audio enrichment survives the bus intact with a pitch anchor", () => {
    const bus = new SensorBus();
    expect(bus.push(audioFrame())).toBe(true);
    const frame = bus.drain(1)[0]!;
    const s = frame.spectral!;
    expect(s).toBeDefined();
    expect(s.whitened.length).toBe(1024); // windowSize default
    expect(s.parsevalResidual).toBeLessThan(1e-6);
    expect(Number.isFinite(s.dominantHz)).toBe(true);
    expect(s.dominantHz!).toBeGreaterThan(0);
  });

  it("whitened signature bytes are preserved exactly through validation", () => {
    const grid = makeGrid(16, 16);
    const enrichment = visionSpectralEnrichment(grid, 16, 16);
    const bus = new SensorBus();
    bus.push({
      source: "vision.file",
      timestamp: Date.now(),
      meta: {},
      field: fieldFromLuminanceGrid(grid, 16, 16),
      spectral: enrichment,
    });
    const out = bus.drain(1)[0]!.spectral!;
    expect(out.whitened).toEqual(enrichment.whitened);
    expect(out.complexity).toEqual(enrichment.complexity);
    expect(out.parsevalResidual).toBe(enrichment.parsevalResidual);
  });
});

describe("spectral bus channel — loud rejection of corruption", () => {
  const base = (): Record<string, unknown> => ({
    source: "vision.file",
    timestamp: Date.now(),
    meta: {},
    field: fieldFromLuminanceGrid(makeGrid(16, 16), 16, 16),
  });

  it("rejects a spectral block with a non-finite whitened value", () => {
    const good = visionSpectralEnrichment(makeGrid(16, 16), 16, 16);
    const badWhitened = new Float64Array(good.whitened);
    badWhitened[5] = Number.NaN;
    const bus = new SensorBus();
    const ok = bus.push({ ...base(), spectral: { ...good, whitened: badWhitened } });
    expect(ok).toBe(false);
    expect(bus.lastRejectReason).toContain("spectral");
  });

  it("rejects a spectral block missing a complexity number", () => {
    const good = visionSpectralEnrichment(makeGrid(16, 16), 16, 16);
    const broken = { ...good.complexity, flatness: "not-a-number" };
    const bus = new SensorBus();
    const ok = bus.push({ ...base(), spectral: { ...good, complexity: broken } });
    expect(ok).toBe(false);
  });

  it("rejects a spectral block with an empty whitened signature", () => {
    const good = visionSpectralEnrichment(makeGrid(16, 16), 16, 16);
    const bus = new SensorBus();
    const ok = bus.push({ ...base(), spectral: { ...good, whitened: new Float64Array(0) } });
    expect(ok).toBe(false);
    expect(bus.lastRejectReason).toContain("empty");
  });
});

describe("spectral memory tap — both modalities, engine untouched", () => {
  it("records measured complexity for vision and audio in the same basis", () => {
    const mem = new SpectralMemory();
    const vGrid = makeGrid(32, 32);
    const vSpec = visionSpectralEnrichment(vGrid, 32, 32);
    const aSamples = makeTone(0.4);
    const aSpec = audioSpectralEnrichment(aSamples, RATE);

    const vSummary = mem.record(1, "vision.file", vSpec);
    const aSummary = mem.record(2, "audio.file", aSpec);

    expect(mem.records.length).toBe(2);
    // Both summaries expose the same measured-basis keys → cross-sensory commensurable.
    for (const summary of [vSummary, aSummary]) {
      expect(Number.isFinite(summary["entropyNorm"])).toBe(true);
      expect(Number.isFinite(summary["flatness"])).toBe(true);
      expect(Number.isFinite(summary["entropyDelta"])).toBe(true);
    }
    // Audio records its pitch anchor; vision does not.
    expect(vSummary["dominantHz"]).toBeUndefined();
    expect(Number.isFinite(aSummary["dominantHz"])).toBe(true);
  });

  it("tracks a per-source entropy baseline for novelty-by-complexity", () => {
    const mem = new SpectralMemory();
    const spec = visionSpectralEnrichment(makeGrid(16, 16), 16, 16);
    mem.record(1, "vision.file", spec);
    mem.record(2, "vision.file", spec);
    const baseline = mem.entropyBaseline("vision.file");
    expect(baseline).toBeDefined();
    // Two identical percepts → baseline converges to that percept's entropy.
    expect(baseline!).toBeCloseTo(spec.complexity.entropyNorm, 6);
  });

  it("keeps the whitened identity signature queryable per source", () => {
    const mem = new SpectralMemory();
    const grid = makeGrid(16, 16);
    const spec = visionSpectralEnrichment(grid, 16, 16);
    mem.record(1, "vision.file", spec);
    const sig = mem.latestSignature("vision.file");
    expect(sig).toBeDefined();
    expect(sig!.length).toBe(16 * 16);
    expect(sig!).toEqual(spec.whitened);
  });

  it("bounds the record history at capacity, dropping oldest", () => {
    const mem = new SpectralMemory();
    const spec = visionSpectralEnrichment(makeGrid(8, 8), 8, 8);
    for (let i = 0; i < 100; i++) mem.record(i, "vision.file", spec);
    expect(mem.records.length).toBeLessThanOrEqual(89);
    // oldest dropped — the earliest surviving tick is >= 11.
    expect(mem.records[0]!.tick).toBeGreaterThanOrEqual(11);
  });
});

describe("spectral channel — the 28-field is genuinely untouched", () => {
  it("the field a sensor pushes is bit-identical with and without enrichment", () => {
    // The enrichment is computed AFTER the field and never mutates it. Prove the
    // field codec output is deterministic and unaffected by enrichment existence.
    const samples = makeTone(0.3);
    const fieldA = fieldFromWaveform(samples, RATE);
    void audioSpectralEnrichment(samples, RATE); // run enrichment
    const fieldB = fieldFromWaveform(samples, RATE);
    expect(fieldB).toEqual(fieldA);

    const grid = makeGrid(24, 24);
    const vA = fieldFromLuminanceGrid(grid, 24, 24);
    void visionSpectralEnrichment(grid, 24, 24);
    const vB = fieldFromLuminanceGrid(grid, 24, 24);
    expect(vB).toEqual(vA);
  });

  it("an enriched frame's bus field passes the same 28-length gate as a legacy one", () => {
    const enriched = audioFrame() as unknown as SensoryFrame;
    expect(enriched.field.length).toBe(28);
    // The spectral block is a separate channel — its length is NOT 28.
    expect(enriched.spectral!.whitened.length).not.toBe(28);
  });
});
