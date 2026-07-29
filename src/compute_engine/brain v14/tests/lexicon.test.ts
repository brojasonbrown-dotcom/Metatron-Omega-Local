/**
 * M7 — Lexicon: Language = grounded dictionary. A word is only language when
 * it is GROUNDED (a label on a real concept), a relation only exists between
 * two grounded words, and a relation's strength is the MEASURED resonance of
 * the pair's geometry — never a hand-picked weight. This suite proves the
 * front cannot invent a word, a grammar, or a connection it never verified.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Lexicon } from "./../cognition/lexicon.ts";
import { ConceptRegistry } from "./../cognition/concept_registry.ts";
import { ConceptGlossary } from "./../cognition/glossary.ts";
import { validateLexical } from "./../schemas/validate.ts";
import { encodeText } from "./../adapters/language_codec.ts";
import { PHI_NEG2 } from "./../core/constants.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rhuft-m7-"));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Ground two words onto real concepts and return their ids. */
function groundPair(reg: ConceptRegistry, a: string, b: string): [string, string] {
  const ca = reg.observe(encodeText(a), [], "test").concept;
  const cb = reg.observe(encodeText(b), [], "test").concept;
  reg.addLabels(ca.id, [a], "test");
  reg.bindLabel(ca.id, a);
  reg.addLabels(cb.id, [b], "test");
  reg.bindLabel(cb.id, b);
  return [ca.id, cb.id];
}

describe("a word is only language when it is grounded", () => {
  it("resolve returns null for a word the mind never grounded", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    expect(lex.resolve("dog")).toBeNull();
  });

  it("resolve binds a grounded word to its concept, gloss and mastery", () => {
    const reg = new ConceptRegistry();
    const glossary = new ConceptGlossary(tmpDir);
    const lex = new Lexicon(tmpDir, reg, glossary);
    const [dogId] = groundPair(reg, "dog", "cat");
    glossary.learn({ conceptId: dogId, definition: "a loyal four-legged companion animal", related: ["dog", "pet"], source: "define", confidence: 0.8 });
    const b = lex.resolve("dog");
    expect(b).not.toBeNull();
    expect(b!.conceptId).toBe(dogId);
    expect(b!.gloss).toBe("a loyal four-legged companion animal");
    expect(b!.learned).toBe(false); // no verified predictions yet
    expect(b!.verifications).toBe(0);
  });

  it("vocabulary lists only named (grounded) concepts", () => {
    const reg = new ConceptRegistry();
    groundPair(reg, "dog", "cat");
    const lex = new Lexicon(tmpDir, reg);
    expect(lex.vocabulary()).toContain("dog");
    expect(lex.vocabulary()).toContain("cat");
  });
});

describe("part of speech is never invented for an unknown word", () => {
  it("recordPos refuses an ungrounded word", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    expect(lex.recordPos("dog", "noun")).toBe(false);
    expect(lex.resolve("dog")).toBeNull();
  });

  it("recordPos stores pos for a grounded word", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    groundPair(reg, "dog", "cat");
    expect(lex.recordPos("dog", "noun")).toBe(true);
    expect(lex.resolve("dog")!.pos).toBe("noun");
  });
});

describe("the relation graph is grounded and measured, never asserted", () => {
  it("assertRelation refuses when either word is ungrounded", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    groundPair(reg, "dog", "cat");
    expect(lex.assertRelation("dog", "gravity", "related-to", 0.5)).toBeNull(); // gravity unknown
    expect(lex.relationCount).toBe(0);
  });

  it("assertRelation refuses a self-loop and a bogus kind", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    groundPair(reg, "dog", "cat");
    expect(lex.assertRelation("dog", "dog", "related-to", 0.5)).toBeNull();
    expect(lex.assertRelation("dog", "cat", "is-friends-with" as never, 0.5)).toBeNull();
    expect(lex.relationCount).toBe(0);
  });

  it("a first observation seeds the edge at the MEASURED strength", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    groundPair(reg, "dog", "cat");
    const e = lex.assertRelation("dog", "cat", "related-to", 0.7);
    expect(e).not.toBeNull();
    expect(e!.strength).toBeCloseTo(0.7, 12);
    expect(e!.evidence).toBe(1);
  });

  it("strength hardens as a φ-decayed mean across observations — never resets", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    groundPair(reg, "dog", "cat");
    lex.assertRelation("dog", "cat", "related-to", 1.0);
    const e2 = lex.assertRelation("dog", "cat", "related-to", 0.0);
    // s ← s·(1−φ⁻²) + measured·φ⁻² = 1·(1−φ⁻²) + 0 = 1−φ⁻²
    expect(e2!.strength).toBeCloseTo(1 - PHI_NEG2, 12);
    expect(e2!.evidence).toBe(2);
    expect(lex.relationCount).toBe(1); // still ONE edge, hardened — not duplicated
  });

  it("measurePairResonance is the pair's real geometric agreement, in [0,1]", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    groundPair(reg, "dog", "cat");
    const r = lex.measurePairResonance("dog", "cat");
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
    expect(lex.measurePairResonance("dog", "gravity")).toBe(0); // ungrounded → 0
  });

  it("relationBetween finds the strongest edge in either direction", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    groundPair(reg, "dog", "cat");
    lex.assertRelation("dog", "cat", "related-to", 0.4);
    lex.assertRelation("cat", "dog", "opposite-of", 0.6);
    const best = lex.relationBetween("dog", "cat");
    expect(best).not.toBeNull();
    expect(best!.kind).toBe("opposite-of"); // higher strength wins
    expect(best!.strength).toBeCloseTo(0.6, 12);
  });
});

describe("the dictionary fragment is assembled from grounded truth only", () => {
  it("fragment is null for an ungrounded word", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    expect(lex.fragment("dog")).toBeNull();
  });

  it("fragment carries pos, gloss and relations for a rich word", () => {
    const reg = new ConceptRegistry();
    const glossary = new ConceptGlossary(tmpDir);
    const lex = new Lexicon(tmpDir, reg, glossary);
    const [dogId] = groundPair(reg, "dog", "cat");
    glossary.learn({ conceptId: dogId, definition: "a loyal companion animal", related: ["dog"], source: "define", confidence: 0.8 });
    lex.recordPos("dog", "noun");
    lex.assertRelation("dog", "cat", "related-to", 0.6);
    const frag = lex.fragment("dog");
    expect(frag).toContain("dog (noun)");
    expect(frag).toContain("a loyal companion animal");
    expect(frag).toContain("related-to cat");
  });

  it("an unproven word is honestly labelled 'still learning', never 'learned'", () => {
    const reg = new ConceptRegistry();
    const glossary = new ConceptGlossary(tmpDir);
    const lex = new Lexicon(tmpDir, reg, glossary);
    const [dogId] = groundPair(reg, "dog", "cat");
    glossary.learn({ conceptId: dogId, definition: "a companion", related: ["dog"], source: "define", confidence: 0.5 });
    const frag = lex.fragment("dog")!;
    expect(frag).not.toContain("(verified:");
  });
});

describe("persistence — relations round-trip through disk, validated", () => {
  it("save + load restores every edge with strength and evidence intact", () => {
    const reg = new ConceptRegistry();
    const lex = new Lexicon(tmpDir, reg);
    groundPair(reg, "dog", "cat");
    groundPair(reg, "tree", "bird");
    lex.assertRelation("dog", "cat", "related-to", 0.7);
    lex.assertRelation("dog", "cat", "related-to", 0.9); // harden
    lex.assertRelation("tree", "bird", "part-of", 0.5);
    expect(lex.relationCount).toBe(2);

    // Fresh lexicon over the SAME dir + registry — relations come back.
    const lex2 = new Lexicon(tmpDir, reg);
    const loaded = lex2.load();
    expect(loaded.ok).toBe(true);
    expect(loaded.restored).toBe(2);
    expect(lex2.relationCount).toBe(2);
    const dc = lex2.relationBetween("dog", "cat")!;
    expect(dc.evidence).toBe(2);
    expect(dc.kind).toBe("related-to");
  });

  it("a corrupt relations file is quarantined, never fatal — fresh start", () => {
    const reg = new ConceptRegistry();
    fs.writeFileSync(path.join(tmpDir, "relations.json"), "{ not valid json !!!");
    const lex = new Lexicon(tmpDir, reg);
    const loaded = lex.load();
    expect(loaded.ok).toBe(false);
    expect(loaded.restored).toBe(0);
    expect(typeof loaded.quarantined).toBe("string");
    expect(lex.relationCount).toBe(0); // fresh, empty — cognition continues
  });
});

describe("validateLexical — the instrument's output contract", () => {
  it("accepts a real dictionary entry with typed relations", () => {
    const out = validateLexical({
      word: "dog",
      pos: "noun",
      gloss: "a loyal four-legged companion animal",
      relations: [
        { kind: "is-a", to: "animal" },
        { kind: "related-to", to: "cat" },
        { kind: "opposite-of", to: "cat" },
        { kind: "part-of", to: "pack" },
      ],
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.word).toBe("dog");
      expect(out.value.pos).toBe("noun");
      expect(out.value.relations.length).toBe(4);
    }
  });

  it("rejects an echo gloss (the parrot failure) — never learn placeholder noise", () => {
    const out = validateLexical({ word: "dog", pos: "noun", gloss: "one or two sentences", relations: [] });
    expect(out.ok).toBe(false);
  });

  it("rejects a missing gloss and a missing word", () => {
    expect(validateLexical({ word: "dog", pos: "noun", gloss: "", relations: [] }).ok).toBe(false);
    expect(validateLexical({ word: " ", pos: "noun", gloss: "a real gloss here", relations: [] }).ok).toBe(false);
  });

  it("drops relations of unknown kind or self-referential, keeps the valid", () => {
    const out = validateLexical({
      word: "dog",
      pos: "noun",
      gloss: "a loyal companion animal",
      relations: [
        { kind: "is-a", to: "animal" },
        { kind: "is-friends-with", to: "cat" }, // bogus kind → dropped
        { kind: "is-a", to: "dog" },            // self-loop → dropped
      ],
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.relations.length).toBe(1);
      expect(out.value.relations[0]).toEqual({ kind: "is-a", to: "animal" });
    }
  });
});
