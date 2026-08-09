/**
 * Tests — M10 lexicon triples: relational facts over bind/unbind.
 *
 * The sandbox (tests/lexicon-triples-sandbox{,2}.mjs) measured that the FHRR
 * triple form triple(s,r,o) = bind(bind(atom(s),atom(r)),atom(o)), bundled per
 * subject, supports 100% top-1 FORWARD recovery ("dog is-a ?" → animal), exact
 * REVERSE lookup ("(bird,wing) → which role?" → has), and clean ROLE SHARING
 * across subjects — with role-query specificity collapsing to ~0.005 for a
 * wrong role/subject and per-subject capacity decaying ≈ 1/√N (still 100% at
 * N = 21; we cap at F₆ = 13).
 *
 * These tests prove the shipped module (cognition/lexicon_triples.ts):
 *   1. FORWARD — a stored triple is recovered by unbinding, believed above λ.
 *   2. SPECIFICITY — a wrong role or wrong subject yields NO answer (not a
 *      confabulated object).
 *   3. REVERSE — given (s, o) the linking role is recovered with a real margin.
 *   4. GRAPH — one role atom is shared across subjects and stays clean.
 *   5. FORGET — at capacity the weakest triple is evicted (φ-forgetting).
 *   6. TRUTH — an empty/un-encodable label asserts nothing and answers nothing.
 */
import { describe, expect, it } from "vitest";
import {
  LexiconTriples,
  TRIPLE_CAPACITY,
  TRIPLE_LAMBDA,
} from "../cognition/lexicon_triples.ts";

describe("LexiconTriples (M10)", () => {
  it("FORWARD: recovers a stored triple's object by unbinding", () => {
    const kb = new LexiconTriples();
    kb.assert("dog", "is_a", "animal");
    kb.assert("dog", "has", "fur");
    const ans = kb.lookup("dog", "is_a");
    expect(ans).not.toBeNull();
    expect(ans!.object).toBe("animal");
    expect(ans!.believed).toBe(true);
    expect(ans!.confidence).toBeGreaterThanOrEqual(TRIPLE_LAMBDA);
  });

  it("SPECIFICITY: wrong role or unknown subject yields no answer", () => {
    const kb = new LexiconTriples();
    kb.assert("cat", "eats", "seeds");
    // Wrong role for a known subject → no candidates → null (no confabulation).
    expect(kb.lookup("cat", "lives_in")).toBeNull();
    // Unknown subject → null.
    expect(kb.lookup("trampoline", "eats")).toBeNull();
  });

  it("REVERSE: recovers the role linking a subject to a known object", () => {
    const kb = new LexiconTriples();
    kb.assert("bird", "has", "wing");
    kb.assert("bird", "eats", "seeds");
    kb.assert("bird", "is_a", "animal");
    const ans = kb.reverseLookup("bird", "wing");
    expect(ans).not.toBeNull();
    expect(ans!.role).toBe("has");
    expect(ans!.believed).toBe(true);
    expect(ans!.margin).toBeGreaterThan(0);
  });

  it("GRAPH: a role atom shared across subjects stays clean", () => {
    const kb = new LexiconTriples();
    kb.assert("dog", "is_a", "animal");
    kb.assert("cat", "is_a", "animal");
    kb.assert("salmon", "is_a", "fish");
    expect(kb.lookup("dog", "is_a")!.object).toBe("animal");
    expect(kb.lookup("cat", "is_a")!.object).toBe("animal");
    expect(kb.lookup("salmon", "is_a")!.object).toBe("fish");
  });

  it("FORGET: at capacity the weakest triple is evicted", () => {
    const kb = new LexiconTriples();
    // Reinforce the first fact so it is NOT the weakest.
    kb.assert("dog", "is_a", "animal");
    kb.assert("dog", "is_a", "animal");
    kb.assert("dog", "is_a", "animal");
    // Fill to capacity with single-assertion facts (distinct roles+objects).
    for (let i = 0; i < TRIPLE_CAPACITY - 1; i++) {
      kb.assert("dog", "role_" + i, "filler_" + i);
    }
    expect(kb.triplesOf("dog").length).toBe(TRIPLE_CAPACITY);
    // One more → evicts one of the single-assertion facts, keeps the reinforced.
    kb.assert("dog", "role_new", "filler_new");
    const facts = kb.triplesOf("dog");
    expect(facts.length).toBe(TRIPLE_CAPACITY);
    expect(facts.some((t) => t.role === "is_a" && t.object === "animal")).toBe(true);
    expect(facts.some((t) => t.role === "role_new")).toBe(true);
  });

  it("TRUTH: an un-encodable label asserts nothing and answers nothing", () => {
    const kb = new LexiconTriples();
    expect(kb.assert("", "is_a", "animal")).toBeNull();
    expect(kb.assert("dog", "   ", "fur")).toBeNull();
    expect(kb.assert("dog", "has", "")).toBeNull();
    expect(kb.triplesOf("dog").length).toBe(0);
    expect(kb.lookup("dog", "is_a")).toBeNull();
    expect(kb.reverseLookup("dog", "")).toBeNull();
  });

  it("IDEMPOTENT: re-asserting an identical triple reinforces, not duplicates", () => {
    const kb = new LexiconTriples();
    kb.assert("tree", "has", "leaf");
    kb.assert("tree", "has", "leaf");
    kb.assert("tree", "has", "leaf");
    const facts = kb.triplesOf("tree");
    expect(facts.length).toBe(1);
    expect(facts[0]!.reinforcement).toBe(3);
    // Still recovers after reinforcement.
    expect(kb.lookup("tree", "has")!.object).toBe("leaf");
  });
});
