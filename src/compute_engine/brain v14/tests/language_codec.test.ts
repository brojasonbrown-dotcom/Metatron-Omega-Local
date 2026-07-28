/**
 * Tests — Language ↔ Field Codec
 *
 * Plan requirements:
 *  - encode determinism (same text → identical field)
 *  - field length = 28, unit L2 norm
 *  - decode ranks the encoded concept #1 by resonance
 *  - the resonance kernel behaves as C(a,b) ∈ [0,1], C(a,a) = 1
 */

import { describe, expect, it } from "vitest";
import {
    FIELD_SIZE,
    encodeText,
    normalizeField,
    normalizeText,
    reinforceField,
    resonance,
} from "../adapters/language_codec.ts";
import { ConceptRegistry } from "../cognition/concept_registry.ts";

describe("normalizeText", () => {
  it("lowercases, collapses whitespace, trims", () => {
    expect(normalizeText("  Hello   WORLD \n")).toBe("hello world");
  });

  it("is idempotent", () => {
    const once = normalizeText("Fractal   Node");
    expect(normalizeText(once)).toBe(once);
  });
});

describe("encodeText", () => {
  it("produces exactly FIELD_SIZE = 28 elements", () => {
    expect(FIELD_SIZE).toBe(28);
    expect(encodeText("resonance").length).toBe(28);
  });

  it("is fully deterministic: same text → bit-identical field", () => {
    const a = encodeText("the quick brown fox");
    const b = encodeText("the quick brown fox");
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("normalization-equivalent texts encode identically", () => {
    const a = encodeText("Hello   World");
    const b = encodeText("hello world");
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("returns a unit-norm field", () => {
    const f = encodeText("golden ratio");
    let normSq = 0;
    for (const x of f) normSq += x * x;
    expect(normSq).toBeCloseTo(1.0, 12);
  });

  it("different texts produce different fields", () => {
    const a = encodeText("light");
    const b = encodeText("darkness");
    expect(resonance(a, b)).toBeLessThan(1.0);
  });

  it("throws on empty text — never fabricates content", () => {
    expect(() => encodeText("   ")).toThrow();
  });
});

describe("resonance kernel", () => {
  it("C(a,a) = 1 for any nonzero field", () => {
    const f = encodeText("self similarity");
    expect(resonance(f, f)).toBeCloseTo(1.0, 12);
  });

  it("stays in [0, 1]", () => {
    const words = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const fields = words.map((w) => encodeText(w));
    for (const a of fields) {
      for (const b of fields) {
        const c = resonance(a, b);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is symmetric: C(a,b) = C(b,a)", () => {
    const a = encodeText("wave");
    const b = encodeText("particle");
    expect(resonance(a, b)).toBeCloseTo(resonance(b, a), 12);
  });
});

describe("decode by resonance (registry ranking)", () => {
  // Five texts whose pairwise resonance is verifiably below λ — short words
  // of similar length can legitimately merge (few characters ⇒ few distinct
  // spectral modes), so distinct-concept tests must use distinct geometry.
  const texts = [
    "the mountain rises above the valley",
    "clouds drift slowly across the evening sky",
    "the forest is dark and deep",
    "fire burns bright in the night",
    "a bird sings at dawn",
  ];
  const labels = ["mountain", "clouds", "forest", "fire", "bird"];

  it("the test corpus is pairwise distinct (all resonances < λ = 0.382)", () => {
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        expect(resonance(encodeText(texts[i]), encodeText(texts[j]))).toBeLessThan(0.382);
      }
    }
  });

  it("ranks the encoded concept #1 among distinct concepts", () => {
    const registry = new ConceptRegistry();
    for (let i = 0; i < texts.length; i++) {
      registry.observe(encodeText(texts[i]), [labels[i]], "test");
    }
    expect(registry.size).toBe(texts.length); // none merged
    for (let i = 0; i < texts.length; i++) {
      const matches = registry.nearest(encodeText(texts[i]), texts.length);
      expect(matches[0]?.concept.labels).toContain(labels[i]);
      expect(matches[0]?.resonance).toBeCloseTo(1.0, 9);
    }
  });
});

describe("normalizeField / reinforceField", () => {
  it("normalizeField throws on the zero field", () => {
    expect(() => normalizeField(new Float64Array(FIELD_SIZE))).toThrow();
  });

  it("reinforceField returns a unit-norm blend pulled toward the incoming field", () => {
    const oldF = encodeText("stone");
    const incoming = encodeText("water");
    const blended = reinforceField(oldF, incoming);
    expect(blended.length).toBe(FIELD_SIZE);
    let normSq = 0;
    for (const x of blended) normSq += x * x;
    expect(normSq).toBeCloseTo(1.0, 12);
    // blend moves toward incoming without abandoning the prototype
    expect(resonance(blended, incoming)).toBeGreaterThan(resonance(oldF, incoming));
    expect(resonance(blended, oldF)).toBeGreaterThan(resonance(oldF, incoming));
  });
});
