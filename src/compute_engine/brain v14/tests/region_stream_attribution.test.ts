/**
 * Tests — M4+M2 region-anchored, stream-separated causal attribution.
 *
 * THE PAYOFF. ADR-002 deferred movement-anchor and source-separation because they
 * needed data contracts the pipeline lacked. Those contracts now exist (the
 * luminance grid → optical flow; the spectrogram → stream parsing), so the dog/car
 * case is SOLVED, not merely dampened: a moving car's vroom is attributed to the
 * car's region, and the static dog is exonerated by the absence of a region link.
 *
 * Guarantees under test:
 *   1. A motion-anchored vision frame + a stream-decomposed audio frame produce a
 *      REGION↔STREAM attribution record.
 *   2. A static scene (no motion anchor) produces NO region attribution — the dog
 *      is not linked to a sound it didn't cause.
 *   3. Two distinct streams (bark vs vroom) keep SEPARATE region records.
 *   4. The whole-frame link STILL records (honest sample) alongside the region link.
 *   5. Negligible-energy slivers are energy-honestly dropped.
 *   6. Determinism.
 */

import { describe, expect, it } from "vitest";
import { CrossModalCorrelator, type CorrelatorFrame } from "../cognition/cross_modal_correlator.ts";
import { encodeText } from "../adapters/language_codec.ts";

function visionFrame(text: string, motion?: { row: number; col: number; magnitude: number; confidence: number }, tick?: number): CorrelatorFrame {
  const f: CorrelatorFrame = { source: "vision.screen", field: encodeText(text) };
  return { ...f, ...(motion ? { motion } : {}), ...(tick !== undefined ? { tick } : {}) };
}

function audioFrame(text: string, streams?: readonly { signature: Float64Array; energyFraction: number; dominantHz: number }[], tick?: number): CorrelatorFrame {
  const f: CorrelatorFrame = { source: "audio.mic", field: encodeText(text) };
  return { ...f, ...(streams ? { streams } : {}), ...(tick !== undefined ? { tick } : {}) };
}

function sig(seed: number): Float64Array {
  const a = new Float64Array(512);
  for (let i = 0; i < 512; i++) a[i] = Math.abs(Math.sin(i * seed));
  return a;
}

describe("CrossModalCorrelator — M4+M2 region/stream attribution", () => {
  it("REGION-ANCHORED: motion + streams produce a region↔stream record", () => {
    const c = new CrossModalCorrelator(true, true);
    // Vision: the car's region moved (row 3, col 6). Audio: a vroom stream.
    const v = visionFrame("car", { row: 3, col: 6, magnitude: 2.5, confidence: 0.9 }, 1);
    const a = audioFrame("vroom", [{ signature: sig(1), energyFraction: 0.8, dominantHz: 220 }], 1);
    c.observe([v, a]);
    const attrs = c.regionAttributions();
    expect(attrs.length).toBeGreaterThan(0);
    expect(attrs[0]!.pair).toContain("vision.screen@r3c6"); // the moved region
    expect(attrs[0]!.pair).toContain("audio.mic~220Hz"); // the vroom stream
    expect(attrs[0]!.count).toBe(1);
  });

  it("DOG EXONERATED: a static scene (no motion) yields NO region attribution", () => {
    const c = new CrossModalCorrelator(true, true);
    // The dog sits still → NO motion anchor on the vision frame. A car's vroom
    // arrives as a stream. With no moved region, there is nothing to anchor the
    // sound to: no region attribution is created for the dog.
    const v = visionFrame("a dog sitting still", undefined, 1); // no motion
    const a = audioFrame("car vroom", [{ signature: sig(2), energyFraction: 0.9, dominantHz: 200 }], 1);
    c.observe([v, a]);
    expect(c.regionAttributions().length).toBe(0); // dog not region-linked
    // But the whole-frame co-occurrence STILL records (the honest raw sample).
    expect(c.correlations().length).toBeGreaterThan(0);
  });

  it("TWO STREAMS: bark vs vroom keep SEPARATE region records", () => {
    const c = new CrossModalCorrelator(true, true);
    const v = visionFrame("dog barks", { row: 2, col: 1, magnitude: 1.8, confidence: 0.85 }, 1);
    // A mixed soundscape separated into a bark-stream (high Hz) and a car-stream (low Hz).
    const a = audioFrame("bark+vroom", [
      { signature: sig(3), energyFraction: 0.5, dominantHz: 900 }, // bark
      { signature: sig(4), energyFraction: 0.4, dominantHz: 200 }, // vroom
    ], 1);
    c.observe([v, a]);
    const attrs = c.regionAttributions();
    const pairs = attrs.map((x) => x.pair);
    expect(pairs.some((p) => p.includes("~900Hz"))).toBe(true);
    expect(pairs.some((p) => p.includes("~200Hz"))).toBe(true);
    // Both anchored to the moved region r2c1.
    expect(attrs.every((x) => x.pair.includes("@r2c1"))).toBe(true);
  });

  it("WHOLE-FRAME + REGION coexist: the raw sample and the resolved attribution", () => {
    const c = new CrossModalCorrelator(true, true);
    const v = visionFrame("car", { row: 3, col: 6, magnitude: 2.0, confidence: 0.9 }, 1);
    const a = audioFrame("vroom", [{ signature: sig(1), energyFraction: 0.8, dominantHz: 220 }], 1);
    c.observe([v, a]);
    // Whole-frame co-occurrence (honest sample)…
    expect(c.correlations().some((x) => x.pair === "audio.mic|vision.screen")).toBe(true);
    // …AND the region-resolved attribution.
    expect(c.regionAttributions().some((x) => x.pair.includes("@r3c6"))).toBe(true);
  });

  it("ENERGY-HONEST: a negligible-energy sliver stream is dropped", () => {
    const c = new CrossModalCorrelator(true, true);
    const v = visionFrame("car", { row: 3, col: 6, magnitude: 2.0, confidence: 0.9 }, 1);
    const a = audioFrame("vroom", [
      { signature: sig(1), energyFraction: 0.8, dominantHz: 220 }, // real stream
      { signature: sig(9), energyFraction: 0.02, dominantHz: 5000 }, // leakage sliver
    ], 1);
    c.observe([v, a]);
    const attrs = c.regionAttributions();
    expect(attrs.some((x) => x.pair.includes("~220Hz"))).toBe(true);
    expect(attrs.some((x) => x.pair.includes("~5000Hz"))).toBe(false); // sliver dropped
  });

  it("DETERMINISM: identical motion+stream sequences yield identical attributions", () => {
    const run = () => {
      const c = new CrossModalCorrelator(true, true);
      c.observe([
        visionFrame("car", { row: 3, col: 6, magnitude: 2.0, confidence: 0.9 }, 1),
        audioFrame("vroom", [{ signature: sig(1), energyFraction: 0.8, dominantHz: 220 }], 1),
      ]);
      c.observe([
        visionFrame("car", { row: 3, col: 7, magnitude: 2.1, confidence: 0.88 }, 2),
        audioFrame("vroom", [{ signature: sig(1), energyFraction: 0.75, dominantHz: 225 }], 2),
      ]);
      return c.regionAttributions().map((x) => [x.pair, x.meanResonance, x.count, x.evidence]);
    };
    expect(run()).toEqual(run());
  });
});
