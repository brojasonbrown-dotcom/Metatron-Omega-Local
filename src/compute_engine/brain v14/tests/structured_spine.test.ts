/**
 * Tests — Structured Spine: the rich measured fact-spine for grounded answers.
 *
 * Guarantees under test:
 *   1. MEASURED, NOT INVENTED — the spine surfaces ONLY concepts/relations that
 *      exist in the registry/lexicon, with their real numbers.
 *   2. HONEST WHEN EMPTY — a mind with no concepts yields an EMPTY spine (no
 *      "nothing yet" filler that would eat the LLM's attention or fabricate depth).
 *   3. RANKED — strongest-by-verified-mastery first; bounded by Fibonacci caps.
 *   4. LIVE DEPTH — observer readouts join the spine only when present.
 *   5. DETERMINISM — same mind state ⇒ identical spine, byte-for-byte.
 */

import { describe, expect, it } from "vitest";
import { buildStructuredSpine, type SpineDeps } from "../cognition/structured_spine.ts";
import type { Concept } from "../cognition/concept_registry.ts";

/** A minimal registry stub holding the concepts we give it. */
type StubConcept = Partial<Concept> & { id: string };

function makeRegistry(concepts: StubConcept[]): SpineDeps["registry"] {
  return {
    size: concepts.length,
    all: () => concepts as Concept[],
  } as unknown as SpineDeps["registry"];
}

function makeConcept(id: string, label: string, mastery: number, reinforcement: number, verifications = 1): StubConcept {
  return { id, labels: [label], mastery, reinforcement, verifications } as StubConcept;
}

describe("Structured Spine — measured, honest, ranked", () => {
  it("an empty mind yields an EMPTY spine (no fabricated filler)", () => {
    const spine = buildStructuredSpine({ registry: makeRegistry([]) });
    expect(spine).toBe("");
  });

  it("surfaces learned concepts ranked by verified mastery, with real numbers", () => {
    const spine = buildStructuredSpine({
      registry: makeRegistry([
        makeConcept("c1", "weak", 0.1, 2),
        makeConcept("c2", "strong", 0.9, 5, 4),
        makeConcept("c3", "mid", 0.5, 3),
      ]),
    });
    expect(spine).toContain("LEARNED CONCEPTS");
    // Strongest first.
    const strongIdx = spine.indexOf("strong");
    const weakIdx = spine.indexOf("weak");
    expect(strongIdx).toBeGreaterThan(-1);
    expect(weakIdx).toBeGreaterThan(-1);
    expect(strongIdx).toBeLessThan(weakIdx);
    // Real measured numbers are present.
    expect(spine).toContain("mastery 0.900");
    expect(spine).toContain("(4 verified)");
  });

  it("never names a concept the registry does not hold", () => {
    const spine = buildStructuredSpine({
      registry: makeRegistry([makeConcept("c1", "realword", 0.7, 3)]),
    });
    expect(spine).toContain("realword");
    expect(spine).not.toContain("trampoline"); // a word never learned must not appear
  });

  it("live depth joins the spine only when observer readouts are present", () => {
    const base = { registry: makeRegistry([makeConcept("c1", "field", 0.8, 2)]) };
    const without = buildStructuredSpine(base);
    expect(without).not.toContain("LIVE ENGINE DEPTH");
    const withDepth = buildStructuredSpine({
      ...base,
      observers: {
        multiscaleBridge: { stats: () => ({ lastMeanCoherence: 0.97, lastTotalResidual: 6.8e-11, lastFluxConserved: true }) },
      },
    });
    expect(withDepth).toContain("LIVE ENGINE DEPTH");
    expect(withDepth).toContain("coherence 0.9700");
    expect(withDepth).toContain("flux conserved = true");
  });

  it("deterministic: identical mind state yields an identical spine", () => {
    const deps = {
      registry: makeRegistry([makeConcept("c1", "a", 0.5, 1), makeConcept("c2", "b", 0.9, 2)]),
    };
    expect(buildStructuredSpine(deps)).toBe(buildStructuredSpine(deps));
  });

  it("bounded: never surfaces more than the Fibonacci concept cap", () => {
    const many = Array.from({ length: 12 }, (_, i) => makeConcept(`c${i}`, `w${i}`, 0.5 + i * 0.01, 1));
    const spine = buildStructuredSpine({ registry: makeRegistry(many) });
    // Count the per-concept lines (indented two spaces + word + colon).
    const conceptLines = spine.split("\n").filter((l) => /^  \w+: mastery/.test(l));
    expect(conceptLines.length).toBeLessThanOrEqual(5); // F_5 cap
  });
});
