/**
 * Tests — Meaning Binding (symbol grounding)
 *
 * The core contract: once a percept concept is NAMED, it must be retrievable by
 * EITHER the percept's own geometry OR the word's language geometry. Word and
 * percept share one attractor. [PHIL]
 */

import { describe, expect, it } from "vitest";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import {
  blendFields,
  bindMeaning,
  encodeText,
  resonance,
} from "../adapters/language_codec.ts";
import { fieldFromLuminanceGrid, fieldFromWaveform } from "../adapters/sensors/signal_codec.ts";

const LAMBDA = 0.3819660112501051; // 1/φ²

/** Make a pseudo-percept field (deterministic, distinct from any word field). */
function makePercept(seed: number): Float64Array {
  const w = 8;
  const h = 8;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.sin(seed * 1.7 + i * 0.618) * Math.cos(seed * 0.3 + i * 0.11);
  }
  return fieldFromLuminanceGrid(grid, w, h);
}

describe("blendFields / bindMeaning", () => {
  it("blend is unit-norm and weighted between its inputs", () => {
    const a = encodeText("alpha");
    const b = encodeText("omega");
    const m = blendFields(a, b, 0.5);
    let norm = 0;
    for (const x of m) norm += x * x;
    expect(norm).toBeCloseTo(1.0, 9);
    // Midpoint blend sits between the two in resonance.
    expect(resonance(m, a)).toBeGreaterThan(resonance(a, b) - 1e-9);
    expect(resonance(m, b)).toBeGreaterThan(resonance(a, b) - 1e-9);
  });

  it("bindMeaning pulls the percept toward the word without abandoning it", () => {
    const percept = makePercept(3);
    const word = encodeText("mountain");
    const fused = bindMeaning(percept, word);
    expect(resonance(fused, word)).toBeGreaterThan(resonance(percept, word));
    expect(resonance(fused, percept)).toBeGreaterThan(0.8); // still itself
  });

  it("blendFields never collapses to the zero field on anti-parallel inputs", () => {
    const a = encodeText("some word");
    const neg = a.map((x) => -x) as Float64Array;
    const m = blendFields(a, neg, 0.5);
    let norm = 0;
    for (const x of m) norm += x * x;
    expect(norm).toBeGreaterThan(0);
  });
});

describe("ConceptRegistry — word fires the percept (grounding)", () => {
  it("a named concept is retrieved by its word's language field", () => {
    const registry = new ConceptRegistry();
    const percept = makePercept(7);
    const obs = registry.observe(percept, [], "vision.screen");
    expect(obs.isNew).toBe(true);

    // A DIFFERENT concept, so the test isn't trivially the only entry.
    const other = registry.observe(makePercept(99), [], "vision.screen");
    expect(other.concept.id).not.toBe(obs.concept.id);

    const wordField = encodeText("mountain");
    const resonanceBefore = resonance(obs.concept.prototype, wordField);

    // Name it: bind the word into the concept.
    registry.addLabels(obs.concept.id, ["mountain"], "llm.nameThis");
    expect(registry.bindLabel(obs.concept.id, "mountain")).toBe(true);

    // After naming: querying the WORD retrieves the percept concept at ≥ λ,
    // and its word-resonance rose relative to before grounding.
    const after = registry.nearest(wordField, 2);
    expect(after[0]?.concept.id).toBe(obs.concept.id);
    expect(after[0]?.resonance).toBeGreaterThanOrEqual(LAMBDA);
    expect(after[0]?.resonance).toBeGreaterThan(resonanceBefore);
  });

  it("the percept still retrieves its own concept after grounding (no drift)", () => {
    const registry = new ConceptRegistry();
    const percept = makePercept(11);
    const obs = registry.observe(percept, [], "audio.mic");
    registry.bindLabel(obs.concept.id, "resonance");
    // The original percept should still recognise the concept strongly.
    const back = registry.nearest(percept, 1)[0];
    expect(back?.concept.id).toBe(obs.concept.id);
    expect(back?.resonance).toBeGreaterThanOrEqual(LAMBDA);
  });

  it("cross-modal: vision-named concept fires from the spoken/heard word", () => {
    const registry = new ConceptRegistry();
    const percept = makePercept(23);
    const obs = registry.observe(percept, [], "vision.file");
    registry.bindLabel(obs.concept.id, "river");
    // 'Hearing' the word = its language field (audio path shares encodeText for
    // words; here we assert the semantic channel is reachable from word geometry).
    const heard = encodeText("river");
    const match = registry.nearest(heard, 1)[0];
    expect(match?.concept.id).toBe(obs.concept.id);
  });

  it("semantic prototype survives a save/restore round-trip", () => {
    const registry = new ConceptRegistry();
    const percept = makePercept(31);
    const obs = registry.observe(percept, [], "text.feed");
    registry.addLabels(obs.concept.id, ["ember"], "llm.nameThis");
    registry.bindLabel(obs.concept.id, "ember");

    const state = registry.serialize(1);
    const restored = new ConceptRegistry();
    restored.restore(state);

    const wordField = encodeText("ember");
    const match = restored.nearest(wordField, 1)[0];
    expect(match?.concept.id).toBe(obs.concept.id);
    expect(match?.resonance).toBeGreaterThanOrEqual(LAMBDA);
  });
});

describe("sensory codec containment", () => {
  it("rejects a NaN luminance grid", () => {
    const grid = new Float64Array(16);
    grid[5] = NaN;
    expect(() => fieldFromLuminanceGrid(grid, 4, 4)).toThrow();
  });

  it("rejects an Infinity waveform sample", () => {
    const samples = new Float64Array([0.1, 0.2, Infinity, 0.4]);
    expect(() => fieldFromWaveform(samples, 16000)).toThrow();
  });

  it("rejects a non-finite sample rate", () => {
    const samples = new Float64Array([0.1, 0.2, 0.3]);
    expect(() => fieldFromWaveform(samples, NaN)).toThrow();
  });
});
