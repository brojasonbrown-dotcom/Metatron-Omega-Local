/**
 * Integration — M9 record-perceptron wired into the CognitiveLoop naming path.
 *
 * The unit tests (record_perceptron.test.ts) prove the mechanism; this proves
 * the WIRING: when a concept that already carries a poisoned label is named
 * again through the loop, the record-perceptron (attached as a dep) records the
 * binding, the percept votes, and the poisoned label is REMOVED from the live
 * concept — journaled as `gate.corrected`. This is the difference between a
 * gate that refuses new poison and a mind that repairs existing poison.
 */
import { describe, expect, it } from "vitest";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { LinguisticGate } from "../cognition/linguistic_gate.ts";
import { RecordPerceptron } from "../cognition/record_perceptron.ts";
import { CognitiveLoop } from "../cognition/cognitive_loop.ts";
import { fieldFromLuminanceGrid } from "../adapters/sensors/signal_codec.ts";
import type { Thought } from "../cognition/thought.ts";
import type { ExistenceScore } from "../existence_detector.ts";

function mint(registry: ConceptRegistry, seed: number) {
  const w = 8, h = 8;
  const grid = new Float64Array(w * h);
  let s = seed >>> 0;
  for (let i = 0; i < grid.length; i++) {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    grid[i] = (s / 4294967296) * 2 - 1;
  }
  return registry.observe(fieldFromLuminanceGrid(grid, w, h), [], "test");
}

function makeScore(): ExistenceScore {
  return { signalScore: 0.9, persistenceScore: 1.0, coherenceScore: 0.92, relationScore: 0.28, exists: true } as ExistenceScore;
}
function thoughtFor(field: Float64Array): Thought {
  return {
    id: "t-m9",
    bornAt: Date.now(),
    bornTick: 1,
    field,
    score: makeScore(),
    sources: ["text.feed"] as Thought["sources"],
    phase: "stable",
    labels: [],
    spokenText: null,
  };
}

describe("M9 wiring — the loop records and corrects through the naming path", () => {
  it("a poisoned label on a named concept is REMOVED (journaled gate.corrected)", async () => {
    const registry = new ConceptRegistry();
    const gate = new LinguisticGate(registry);
    const perceptron = new RecordPerceptron();

    // A dog-percept and a bird-percept, each grounded through the perceptron so
    // the shared associator learns their cross-modal structure.
    const dog = mint(registry, 7);
    const bird = mint(registry, 23);
    for (const [c, w] of [[dog.concept.id, "dog"], [dog.concept.id, "animal"], [bird.concept.id, "bird"]] as const) {
      const concept = registry.get(c)!;
      registry.addLabels(c, [w], "test");
      registry.bindLabel(c, w);
      for (let i = 0; i < 6; i++) perceptron.record(concept, w, "feed");
    }
    // POISON: "cat" is bound to the dog concept (pre-gate echo). It is on the
    // concept but the perceptron has no trusted record for it.
    registry.addLabels(dog.concept.id, ["cat"], "echo");
    registry.bindLabel(dog.concept.id, "cat");
    perceptron.record(registry.get(dog.concept.id)!, "cat", "echo"); // untrusted (reinforcement 0)
    expect(registry.get(dog.concept.id)!.labels).toContain("cat"); // poison present

    const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
    const deps = {
      store: { journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e) },
      registry,
      gate,
      recordPerceptron: perceptron,
      llm: {
        // The instrument re-proposes the true label for the dog concept.
        nameThis: async () => ({ ok: true as const, value: { labels: ["dog"], confidence: 0.9 }, elapsedMs: 5 }),
      },
    };
    const loop = new CognitiveLoop(deps as never);
    const dogConcept = registry.get(dog.concept.id)!;
    await (loop as unknown as { _actName(t: Thought, o: unknown): Promise<void> })._actName(
      thoughtFor(dogConcept.prototype),
      { concept: dogConcept },
    );

    // The poison was corrected OFF the live concept; the true label remains.
    expect(dogConcept.labels).toContain("dog");
    expect(dogConcept.labels).not.toContain("cat");
    const corr = journal.find((j) => j.kind === "gate.corrected");
    expect(corr).toBeDefined();
    expect((corr!.data.corrected as string[]).includes("cat")).toBe(true);
  });
});
