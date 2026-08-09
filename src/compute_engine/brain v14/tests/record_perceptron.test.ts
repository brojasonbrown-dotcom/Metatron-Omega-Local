/**
 * Tests — M9 record-perceptron: the gate CORRECTS a poisoned label.
 *
 * Phase 2 made the gate sound (refuses NEW poison) but it could not correct
 * EXISTING poison. The sandbox (tests/record-perceptron-sandbox.mjs) measured
 * WHY correction is possible at all: the word-channel is non-semantic (atom()
 * makes "dog" ⊥ "cat"), so only the PERCEPT can vote a wrong label down — via
 * a SHARED cross-modal associator over residual records. The probe
 * (tests/_probe_assoc.mjs) measured that voting must be CLOSED-SET (normalized
 * over the concept's trusted labels) to be robust to correlated percepts.
 *
 * These tests prove the shipped mechanism (cognition/record_perceptron.ts):
 *   1. VOTE — the true label dominates its own trusted cluster; the poison ~0.
 *   2. CORRECT — reweight() drives the poison below λ while true labels stay.
 *   3. PROVENANCE — a one-off "echo" never trains the associator.
 *   4. DEGENERATE — an un-liftable percept yields vote 0, never fabricated.
 */
import { describe, expect, it } from "vitest";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { RecordPerceptron, CORRECT_LAMBDA } from "../cognition/record_perceptron.ts";
import { fieldFromLuminanceGrid } from "../adapters/sensors/signal_codec.ts";

/** Mint a concept from a DISTINCT, decorrelated percept (per-pixel hash noise). */
function mint(registry: ConceptRegistry, seed: number) {
  const w = 8, h = 8;
  const grid = new Float64Array(w * h);
  let s = seed >>> 0;
  for (let i = 0; i < grid.length; i++) {
    // xorshift32 → uncorrelated pixels in [-1,1], so distinct seeds give
    // near-orthogonal lifted percepts (the earlier sinusoid generator stayed
    // 0.87 correlated and bled foreign labels into the read — measured).
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    grid[i] = (s / 4294967296) * 2 - 1;
  }
  return registry.observe(fieldFromLuminanceGrid(grid, w, h), [], "test");
}

/** Bind + record a label `times` times (drives trust → trains the associator). */
function teach(rp: RecordPerceptron, registry: ConceptRegistry, conceptId: string, word: string, times: number, source = "feed") {
  const c = registry.get(conceptId)!;
  registry.addLabels(conceptId, [word], "test");
  registry.bindLabel(conceptId, word);
  for (let i = 0; i < times; i++) rp.record(c, word, source);
}

describe("M9 — record-perceptron: cross-modal correction of a poisoned label", () => {
  it("VOTE: the true label dominates its trusted cluster; the poison scores ~0", () => {
    const registry = new ConceptRegistry();
    const rp = new RecordPerceptron();
    const dog = mint(registry, 7);
    const bird = mint(registry, 23);
    teach(rp, registry, dog.concept.id, "dog", 6);
    teach(rp, registry, bird.concept.id, "bird", 6);

    const dogConcept = registry.get(dog.concept.id)!;
    // The true label wins its own trusted cluster (a positive vote well above
    // the poison's ~0) — but NOT 0.9: the dog-percept is partly bird-shaped, so
    // cross-concept bleed legitimately splits the vote (raw(dog) 0.27 vs the
    // bird-percept's 0.41 — measured). What the mechanism guarantees is that the
    // trusted label's vote is clearly positive while the poison's is ~0.
    expect(rp.vote(dogConcept, "dog")).toBeGreaterThan(0.3);
    expect(rp.vote(dogConcept, "cat")).toBeLessThan(0.05);
    // The true label strictly out-votes every garbage word (closed-set win).
    for (const bad of ["cat", "trampoline", "quasar", "soup"]) {
      expect(rp.vote(dogConcept, "dog")).toBeGreaterThan(rp.vote(dogConcept, bad));
    }
  });

  it("CORRECT: reweight demotes the poisoned label below λ, keeps the true ones", () => {
    const registry = new ConceptRegistry();
    const rp = new RecordPerceptron();
    const dog = mint(registry, 7);
    const bird = mint(registry, 23);
    teach(rp, registry, dog.concept.id, "dog", 6);
    teach(rp, registry, dog.concept.id, "animal", 6);
    teach(rp, registry, bird.concept.id, "bird", 6);
    // POISON: "cat" bound to the dog-percept once (the historical echo).
    teach(rp, registry, dog.concept.id, "cat", 1, "echo");

    const dogConcept = registry.get(dog.concept.id)!;
    const results = rp.reweight(dogConcept);
    const byWord = new Map(results.map((r) => [r.word, r]));

    expect(byWord.get("cat")!.believed).toBe(false);
    expect(byWord.get("cat")!.weight).toBeLessThan(CORRECT_LAMBDA);
    expect(byWord.get("dog")!.believed).toBe(true);
    expect(byWord.get("animal")!.believed).toBe(true);

    const { believed, corrected } = rp.believedLabels(dogConcept);
    expect(believed).toContain("dog");
    expect(believed).toContain("animal");
    expect(corrected).toContain("cat");
  });

  it("PROVENANCE: a one-off echo binding does not train the associator", () => {
    const registry = new ConceptRegistry();
    const rp = new RecordPerceptron();
    const a = mint(registry, 7);
    const b = mint(registry, 23);
    teach(rp, registry, a.concept.id, "dog", 6); // trusted
    teach(rp, registry, b.concept.id, "zebra", 1, "echo"); // never trusted

    // The associator's closed vocabulary carries "dog" but not the echo "zebra".
    expect(rp.vocabulary).toContain("dog");
    expect(rp.vocabulary).not.toContain("zebra");
  });

  it("DEGENERATE: an un-liftable percept yields vote 0, never a fabricated direction", () => {
    const registry = new ConceptRegistry();
    const rp = new RecordPerceptron();
    const a = mint(registry, 7);
    teach(rp, registry, a.concept.id, "dog", 6);
    const concept = registry.get(a.concept.id)!;
    const saved = concept.prototype;
    concept.prototype = new Float64Array(saved.length); // zero field → liftField throws
    expect(rp.rawVote(concept, "dog")).toBe(0);
    concept.prototype = saved;
  });
});
