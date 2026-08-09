/**
 * Integration — M10 lexicon-triples wired into the CognitiveLoop lexical path.
 *
 * The unit tests (lexicon_triples.test.ts) prove the bind/unbind algebra; this
 * proves the WIRING: when the lexical instrument proposes a typed relation over
 * two GROUNDED words, the loop mirrors it into the geometric triple store — so
 * the fact becomes a queryable FHRR edge (forward AND reverse lookup), not just
 * a symbolic row. The difference between a proven algebra and a living graph.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { Lexicon } from "../cognition/lexicon.ts";
import { LexiconTriples } from "../cognition/lexicon_triples.ts";
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
    id: "t-m10",
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

describe("M10 wiring — the loop asserts grounded relations into the triple store", () => {
  let stateDir: string;
  beforeEach(() => { stateDir = mkdtempSync(path.join(tmpdir(), "m10-wiring-")); });
  afterEach(() => { rmSync(stateDir, { recursive: true, force: true }); });

  it("a grounded 'dog is-a animal' edge becomes a forward+reverse queryable triple", async () => {
    const registry = new ConceptRegistry();
    const lexicon = new Lexicon(stateDir, registry);
    const triples = new LexiconTriples();

    // Ground BOTH endpoints — a relation to an unknown word is not asserted.
    const dog = mint(registry, 7);
    const animal = mint(registry, 23);
    registry.addLabels(dog.concept.id, ["dog"], "test");
    registry.bindLabel(dog.concept.id, "dog");
    registry.addLabels(animal.concept.id, ["animal"], "test");
    registry.bindLabel(animal.concept.id, "animal");

    const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
    const deps = {
      store: { journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e) },
      registry,
      lexicon,
      lexiconTriples: triples,
      llm: {
        // The lexical instrument proposes a typed is-a edge to a grounded word.
        lexical: async () => ({
          ok: true as const,
          value: { pos: "noun", gloss: "a domesticated canid", relations: [{ kind: "is-a", to: "animal" }] },
          elapsedMs: 5,
        }),
      },
    };
    const loop = new CognitiveLoop(deps as never);
    const dogConcept = registry.get(dog.concept.id)!;
    await (loop as unknown as { _actLexical(t: Thought, o: unknown): Promise<void> })._actLexical(
      thoughtFor(dogConcept.prototype),
      { concept: dogConcept },
    );

    // The symbolic edge landed …
    expect(lexicon.relationCount).toBe(1);
    // … and the GEOMETRIC triple was mirrored: forward lookup "dog is-a ?".
    const fwd = triples.lookup("dog", "is-a");
    expect(fwd).not.toBeNull();
    expect(fwd!.object).toBe("animal");
    expect(fwd!.believed).toBe(true);
    // Reverse lookup: "(dog, animal) linked by which role?" → is-a.
    const rev = triples.reverseLookup("dog", "animal");
    expect(rev).not.toBeNull();
    expect(rev!.role).toBe("is-a");
    // The assertion is observable in the journal.
    const ok = journal.find((j) => j.kind === "tool.ok");
    expect(ok).toBeDefined();
    expect(ok!.data.triples).toBe(1);
    expect(ok!.data.groundedEdges).toBe(1);
  });

  it("a relation to an UNGROUNDED word is asserted NEITHER symbolically nor geometrically", async () => {
    const registry = new ConceptRegistry();
    const lexicon = new Lexicon(stateDir, registry);
    const triples = new LexiconTriples();

    const dog = mint(registry, 7);
    registry.addLabels(dog.concept.id, ["dog"], "test");
    registry.bindLabel(dog.concept.id, "dog");
    // NOTE: "animal" is NEVER grounded here — the edge must be refused on both stores.

    const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
    const deps = {
      store: { journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e) },
      registry,
      lexicon,
      lexiconTriples: triples,
      llm: {
        lexical: async () => ({
          ok: true as const,
          value: { pos: "noun", gloss: "a canid", relations: [{ kind: "is-a", to: "animal" }] },
          elapsedMs: 5,
        }),
      },
    };
    const loop = new CognitiveLoop(deps as never);
    const dogConcept = registry.get(dog.concept.id)!;
    await (loop as unknown as { _actLexical(t: Thought, o: unknown): Promise<void> })._actLexical(
      thoughtFor(dogConcept.prototype),
      { concept: dogConcept },
    );

    expect(lexicon.relationCount).toBe(0);
    expect(triples.lookup("dog", "is-a")).toBeNull();
    expect(journal.find((j) => j.kind === "tool.ok")!.data.triples).toBe(0);
  });

  it("with NO triple store attached the loop still grounds the symbolic edge (dep is optional)", async () => {
    const registry = new ConceptRegistry();
    const lexicon = new Lexicon(stateDir, registry);

    const dog = mint(registry, 7);
    const animal = mint(registry, 23);
    registry.addLabels(dog.concept.id, ["dog"], "test");
    registry.bindLabel(dog.concept.id, "dog");
    registry.addLabels(animal.concept.id, ["animal"], "test");
    registry.bindLabel(animal.concept.id, "animal");

    const deps = {
      store: { journal: (_e: { kind: string; data: Record<string, unknown> }) => {} },
      registry,
      lexicon,
      // lexiconTriples deliberately ABSENT — run_mind.ts needs no change.
      llm: {
        lexical: async () => ({
          ok: true as const,
          value: { pos: "noun", gloss: "a canid", relations: [{ kind: "is-a", to: "animal" }] },
          elapsedMs: 5,
        }),
      },
    };
    const loop = new CognitiveLoop(deps as never);
    const dogConcept = registry.get(dog.concept.id)!;
    await (loop as unknown as { _actLexical(t: Thought, o: unknown): Promise<void> })._actLexical(
      thoughtFor(dogConcept.prototype),
      { concept: dogConcept },
    );

    // Symbolic graph still grew even with no geometric store present.
    expect(lexicon.relationCount).toBe(1);
  });
});
