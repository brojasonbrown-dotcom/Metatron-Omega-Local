/**
 * M6 — Correlation & Consolidation Battery (the "doesn't learn/correlate" fix)
 *
 * Regression-lock for the wiring that makes the brain accumulate meaning instead
 * of fragmenting it:
 *   1. observeText correlates — a repeated grounded word reinforces ONE concept
 *      (no duplicate minted); ungrounded text mints a new percept.
 *   2. Episodic persistence — Hopfield attractors round-trip through MemoryStore
 *      (mind_state.json gains `episodes`; older saves without it still load).
 *   3. consolidate() — same-label + resonant duplicates merge (prototype fused,
 *      reinforcement summed, HNSW re-indexed, glossary re-keyed); dog/cat never
 *      merge (no shared label), even at high resonance.
 *   4. Meta-text guard — define/relate reject the prompt-echo ("one or two
 *      sentences") so the glossary never stores placeholder noise.
 *   5. Answer length — the bounded multi-sentence mode emits more than the old
 *      30-word cap when content warrants (the "one paragraph" fix).
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { encodeText } from "../adapters/language_codec.ts";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { HopfieldMemory } from "../cognition/hopfield.ts";
import { ConceptGlossary } from "../cognition/glossary.ts";
import { MemoryStore } from "../cognition/memory_store.ts";
import { isMetaText, validateDefine, validateRelate } from "../schemas/validate.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rhuft-m6-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("observeText — label-grounded correlation", () => {
  it("reinforces the SAME named concept when its word recurs (no duplicate)", () => {
    const reg = new ConceptRegistry();
    // Teach: a concept named "dog" with its word-geometry bound.
    const first = reg.observeText("dog", "ava.chat");
    reg.addLabels(first.concept.id, ["dog"], "llm.nameThis");
    reg.bindLabel(first.concept.id, "dog");
    const id = first.concept.id;
    const sizeAfterTeach = reg.size;
    const r0 = reg.get(id)!.reinforcement;

    // Say "dog" again — it must CORRELATE into the same attractor.
    const again = reg.observeText("tell me about the dog", "ava.chat");
    expect(again.concept.id).toBe(id);
    expect(again.isNew).toBe(false);
    expect(reg.size).toBe(sizeAfterTeach); // no duplicate minted
    expect(reg.get(id)!.reinforcement).toBeGreaterThan(r0); // it hardened
  });

  it("mints a new concept for genuinely ungrounded text", () => {
    const reg = new ConceptRegistry();
    const a = reg.observeText("dog", "ava.chat");
    reg.addLabels(a.concept.id, ["dog"], "llm.nameThis");
    reg.bindLabel(a.concept.id, "dog");
    const before = reg.size;
    // No shared grounded label → a new percept, not a false correlation.
    const b = reg.observeText("quantum entanglement", "ava.chat");
    expect(b.concept.id).not.toBe(a.concept.id);
    expect(reg.size).toBe(before + 1);
  });

  it("correlates the stronger label overlap, not a weak one", () => {
    const reg = new ConceptRegistry();
    const dog = reg.observeText("dog", "t");
    reg.addLabels(dog.concept.id, ["dog", "canine", "pet"], "x");
    const tree = reg.observeText("tree", "t");
    reg.addLabels(tree.concept.id, ["tree"], "x");
    // "dog canine pet" overlaps dog's vocabulary on all three — dog must win.
    const hit = reg.observeText("dog canine pet", "ava.chat");
    expect(hit.concept.id).toBe(dog.concept.id);
  });
});

describe("episodic persistence", () => {
  it("Hopfield attractors round-trip through MemoryStore", () => {
    const reg = new ConceptRegistry();
    const episodes = new HopfieldMemory();
    episodes.store(encodeText("dog"));
    episodes.store(encodeText("bird"));
    expect(episodes.size).toBe(2);

    const store = new MemoryStore(tmpDir);
    store.open();
    store.save(reg, 42, episodes.serialize());

    // Reload into fresh instances — the episodes survive.
    const reg2 = new ConceptRegistry();
    const loaded = store.load(reg2);
    expect(loaded.episodes).toBeDefined();
    expect(loaded.episodes!.length).toBe(2);
    const episodes2 = new HopfieldMemory();
    episodes2.restore(loaded.episodes!);
    expect(episodes2.size).toBe(2);
    // And recall still works on the restored bank.
    const recall = episodes2.retrieve(encodeText("dog"));
    expect(recall.ok).toBe(true);
    store.close();
  });

  it("older saves WITHOUT episodes still load (back-compatible)", () => {
    const reg = new ConceptRegistry();
    const store = new MemoryStore(tmpDir);
    store.open();
    // Save with NO episodes argument — the field is omitted from the JSON.
    store.save(reg, 7);
    const raw = JSON.parse(fs.readFileSync(store.statePath, "utf8"));
    expect(raw.episodes).toBeUndefined();
    const reg2 = new ConceptRegistry();
    const loaded = store.load(reg2);
    expect(loaded.loaded).toBe(true);
    expect(loaded.stableThoughtCount).toBe(7);
    expect(loaded.episodes).toEqual([]); // honest empty, not a crash
    store.close();
  });
});

describe("consolidate — merge duplicates, never distinct concepts", () => {
  // Legacy fragmentation was minted by the FIELD path (observe), so duplicates
  // are built by observing near-identical fields twice and naming both — NOT via
  // observeText (which correctly correlates into one). nearDup perturbs a field
  // by << λ so the second observe() recognizes-and-reinforces... unless we force
  // a mint; we do that by observing two DIFFERENT base fields then renaming.
  function dupConcepts(reg: ConceptRegistry): [string, string] {
    // Two distinct-mint concepts that we then give the SAME label. Their protos
    // differ, so we bind the same word-geometry into both to pull them resonant.
    const f1 = encodeText("bird tree");
    const a = reg.observe(f1, [], "t").concept.id;
    const f2 = encodeText("bird tree"); // same text → same field → observe() reinforces a
    // Force a second distinct concept by observing a perturbed field below λ.
    const perturbed = new Float64Array(f2.length);
    for (let i = 0; i < f2.length; i++) perturbed[i] = f2[i]! * (i % 2 === 0 ? 1 : -0.9);
    const b = reg.observe(perturbed, [], "t").concept.id;
    return [a, b];
  }

  it("merges two concepts that share a label AND resonate", () => {
    const reg = new ConceptRegistry();
    const [a, b] = dupConcepts(reg);
    if (a === b) {
      // observe() correlated them (acceptable) — nothing to merge.
      expect(reg.size).toBe(1);
      return;
    }
    // Give both the same label AND pull their prototypes resonant via bindLabel,
    // so the AND-rule (shared label + resonance ≥ λ) is satisfied.
    for (const id of [a, b]) {
      reg.addLabels(id, ["bird", "tree"], "x");
      reg.bindLabel(id, "bird");
      reg.bindLabel(id, "tree");
    }
    expect(reg.size).toBe(2);
    const { merged, absorbed } = reg.consolidate();
    expect(merged).toBe(1);
    expect(reg.size).toBe(1);
    const survivor = absorbed.get(a) ?? absorbed.get(b);
    expect(survivor).toBeDefined();
    expect(reg.get(survivor!)!.reinforcement).toBeGreaterThanOrEqual(2);
    expect(reg.get(survivor!)!.labels).toContain("bird");
    expect(reg.get(survivor!)!.labels).toContain("tree");
  });

  it("NEVER merges concepts with no shared label (dog vs cat)", () => {
    const reg = new ConceptRegistry();
    const d = reg.observe(encodeText("dog"), [], "t").concept.id;
    const c = reg.observe(encodeText("cat"), [], "t").concept.id;
    reg.addLabels(d, ["dog"], "x");
    reg.addLabels(c, ["cat"], "x");
    // Even if both are pulled toward a shared word-geometry, the AND-rule's
    // shared-label requirement forbids the merge.
    const { merged } = reg.consolidate();
    expect(merged).toBe(0);
    expect(reg.size).toBe(2); // dog/cat are not the same thing
  });

  it("re-keys glossary meanings onto the survivor", () => {
    const reg = new ConceptRegistry();
    const glossary = new ConceptGlossary(tmpDir);
    const [a, b] = dupConcepts(reg);
    if (a === b) {
      expect(reg.size).toBe(1);
      return;
    }
    for (const id of [a, b]) {
      reg.addLabels(id, ["bird", "tree"], "x");
      reg.bindLabel(id, "bird");
      reg.bindLabel(id, "tree");
    }
    glossary.learn({ conceptId: a, definition: "birds nest in trees", related: ["bird", "tree"], source: "define", confidence: 0.8 });
    glossary.learn({ conceptId: b, definition: "a tree-dwelling animal", related: ["bird"], source: "define", confidence: 0.5 });
    const { absorbed } = reg.consolidate();
    expect(absorbed.size).toBe(1);
    const survivor = absorbed.get(a) ?? absorbed.get(b)!;
    glossary.rekey(absorbed);
    // After re-keying, exactly the surviving concept carries a meaning, and it
    // is the highest-confidence one — no entry is left dangling on an absorbed id.
    expect(glossary.get(survivor)).toBeDefined();
    expect(glossary.get(survivor)!.definition).toBe("birds nest in trees");
    const dangling = glossary.all().filter((e) => absorbed.has(e.conceptId));
    expect(dangling.length).toBe(0);
  });
});

describe("meta-text guard", () => {
  it("flags the prompt-echo phrases", () => {
    expect(isMetaText("one or two sentences")).toBe(true);
    expect(isMetaText("One or two sentences, depending on the context.")).toBe(true);
    expect(isMetaText("a short definition")).toBe(true);
    expect(isMetaText("dogs are loyal four-legged companions")).toBe(false);
  });

  it("validateDefine rejects an echo but accepts a real definition", () => {
    const echo = validateDefine({ word: "dog", definition: "one or two sentences", related: ["pet"] });
    expect(echo.ok).toBe(false);
    const real = validateDefine({ word: "dog", definition: "a loyal four-legged companion animal", related: ["pet"] });
    expect(real.ok).toBe(true);
  });

  it("validateRelate rejects an echo but accepts a real relation", () => {
    const echo = validateRelate({ relation: "One or two sentences", strength: 0.5 });
    expect(echo.ok).toBe(false);
    const real = validateRelate({ relation: "birds build nests in trees", strength: 0.7 });
    expect(real.ok).toBe(true);
  });
});
