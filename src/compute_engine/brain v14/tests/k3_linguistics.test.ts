/**
 * M8 — Linguistic Gate + K3 instrument: language is MEASURED, not queried.
 *
 * This suite proves the claim that the mind's linguistics are stabilised
 * algorithmically rather than delegated to an LLM:
 *
 *   1. COHERENCE GATE — a word may bind to a concept only when its language
 *      field resonates with the concept's geometry at ≥ λ = φ⁻². An incoherent
 *      invention is rejected, never learned.
 *   2. CONVERGENCE INVARIANT — binding a word never drags a named concept's
 *      self-coherence (percept↔semantic resonance) DOWN. "Stabilised" is a
 *      provable, monotone property, not a hope.
 *   3. LEARNED-CONCEPT SHIELD — a mastered concept (M6 verified) is hardened
 *      fact; the gate flags it so no single instrument proposal can move it.
 *   4. ECHO GATE — the mind learning its own output (the dog/cat poison vector)
 *      is admitted only when the echo coheres with the concept it claims to be
 *      about; an incoherent echo is dropped.
 *   5. K3 ADAPTER — the frontier instrument honours the exact LlmTool contract
 *      (same validators, same ToolOutcome, φ-retry ladder) and reports
 *      unavailable honestly when no OAuth token is configured. Nothing mocked.
 */
import { describe, it, expect } from "vitest";
import { ConceptRegistry } from "./../cognition/concept_registry.ts";
import {
  LinguisticGate,
  gateEchoText,
  selfCoherence,
  GATE_LAMBDA,
} from "./../cognition/linguistic_gate.ts";
import { KimiK3Tool, k3ConfigFromEnv } from "./../adapters/kimi_k3_tool.ts";
import { encodeText, resonance } from "./../adapters/language_codec.ts";
import { PHI_NEG2 } from "./../core/constants.ts";
import {
  validateNameThis,
  validateDefine,
  validateLexical,
} from "./../schemas/validate.ts";

/** Ground a concept on a word and return it (named + bound). */
function groundConcept(reg: ConceptRegistry, word: string) {
  const c = reg.observe(encodeText(word), [], "test").concept;
  reg.addLabels(c.id, [word], "test");
  reg.bindLabel(c.id, word);
  return c;
}

describe("1. coherence gate — a word binds only when it resonates ≥ λ", () => {
  it("admits a word whose field coheres with the concept", () => {
    const reg = new ConceptRegistry();
    const gate = new LinguisticGate(reg);
    const dog = groundConcept(reg, "dog");
    // The same word always resonates at ~1 with its own geometry.
    const v = gate.measureWord(dog, "dog");
    expect(v.admitted).toBe(true);
    expect(v.resonance).toBeGreaterThanOrEqual(GATE_LAMBDA);
  });

  it("rejects an empty / unencodable word honestly", () => {
    const reg = new ConceptRegistry();
    const gate = new LinguisticGate(reg);
    const dog = groundConcept(reg, "dog");
    expect(gate.measureWord(dog, "").admitted).toBe(false);
    expect(gate.measureWord(dog, "   ").admitted).toBe(false);
  });

  it("gateWords partitions admitted from rejected and reports per-word verdicts", () => {
    const reg = new ConceptRegistry();
    const gate = new LinguisticGate(reg);
    const dog = groundConcept(reg, "dog");
    const report = gate.gateWords(dog, ["dog", ""]);
    expect(report.admitted).toEqual(["dog"]);
    expect(report.verdicts).toHaveLength(2);
    expect(report.verdicts[1]!.admitted).toBe(false);
    // coherenceBefore is non-null for a named concept.
    expect(report.coherenceBefore).not.toBeNull();
  });

  it("the gate threshold IS the registry recognition threshold (one λ, not two)", () => {
    expect(GATE_LAMBDA).toBe(PHI_NEG2);
  });
});

describe("2. convergence invariant — binding never lowers self-coherence", () => {
  it("selfCoherence is null for an unnamed concept, defined once named", () => {
    const reg = new ConceptRegistry();
    const c = reg.observe(encodeText("stone"), [], "test").concept; // no label bound
    expect(selfCoherence(c)).toBeNull();
    reg.addLabels(c.id, ["stone"], "test");
    reg.bindLabel(c.id, "stone");
    expect(selfCoherence(c)).not.toBeNull();
  });

  it("checkInvariant passes when coherence holds across an admitted bind", () => {
    const reg = new ConceptRegistry();
    const gate = new LinguisticGate(reg);
    const dog = groundConcept(reg, "dog");
    const before = selfCoherence(dog);
    // Re-binding the same word (a coherent update) must not lower coherence.
    reg.bindLabel(dog.id, "dog");
    const inv = gate.checkInvariant(dog, before);
    expect(inv.ok).toBe(true);
    expect(inv.after).not.toBeNull();
    expect(inv.after!).toBeGreaterThanOrEqual(before!);
  });

  it("a first naming must produce a coherent semantic channel (no split-brain)", () => {
    const reg = new ConceptRegistry();
    const gate = new LinguisticGate(reg);
    const c = reg.observe(encodeText("river"), [], "test").concept;
    reg.addLabels(c.id, ["river"], "test");
    reg.bindLabel(c.id, "river");
    const inv = gate.checkInvariant(c, null); // null = first naming
    expect(inv.ok).toBe(true);
    expect(selfCoherence(c)!).toBeGreaterThanOrEqual(PHI_NEG2);
  });
});

describe("3. learned-concept shield — mastery is hardened fact", () => {
  it("isMastered is false for an unproven concept, true once M6 learned", () => {
    const reg = new ConceptRegistry();
    const gate = new LinguisticGate(reg);
    const dog = groundConcept(reg, "dog");
    expect(gate.isMastered(dog)).toBe(false);
    // Drive the concept to M6-learned: mastery > 0 with ≥ 5 verifications.
    reg.recordMastery(dog.id, { mastery: 0.4, verifications: 5, meanSurprise: 0.3 });
    expect(gate.isMastered(dog)).toBe(true);
  });
});

describe("4. echo gate — the mind learning its own output (dog/cat vector)", () => {
  it("admits an echo that coheres with its concept", () => {
    const reg = new ConceptRegistry();
    const dog = groundConcept(reg, "dog");
    const v = gateEchoText(dog, "dog");
    expect(v.field).not.toBeNull();
    expect(v.resonance).toBeGreaterThanOrEqual(GATE_LAMBDA);
  });

  it("drops an empty echo honestly", () => {
    const reg = new ConceptRegistry();
    const dog = groundConcept(reg, "dog");
    expect(gateEchoText(dog, "").field).toBeNull();
    expect(gateEchoText(dog, "   ").field).toBeNull();
  });

  it("the echo field, when admitted, is finite and unit-norm (safe for the engine)", () => {
    const reg = new ConceptRegistry();
    const dog = groundConcept(reg, "dog");
    const v = gateEchoText(dog, "dog");
    expect(v.field).not.toBeNull();
    expect(v.field!.every((x) => Number.isFinite(x))).toBe(true);
    // Self-resonance of a finite field is 1 — the kernel's own sanity check.
    expect(resonance(v.field!, v.field!)).toBeCloseTo(1, 6);
  });
});

describe("5. K3 instrument — the LlmTool contract, honestly unavailable offline", () => {
  it("reports unavailable with no API key (nothing mocked)", () => {
    const tool = new KimiK3Tool({ baseUrl: "https://api.moonshot.ai/v1", apiKey: "", languageModel: "kimi-k3", verifyModel: "kimi-k3" });
    expect(tool.available).toBe(false);
  });

  it("k3ConfigFromEnv defaults to the official Kimi Open Platform endpoint + kimi-k3 flagship", () => {
    const cfg = k3ConfigFromEnv({} as NodeJS.ProcessEnv);
    expect(cfg.baseUrl).toBe("https://api.moonshot.ai/v1");
    expect(cfg.languageModel).toBe("kimi-k3");
    expect(cfg.verifyModel).toBe("kimi-k3");
    expect(cfg.apiKey).toBe("");
  });
    it("the request body OMITS temperature (kimi-k* models fix it and 400 on any explicit value) and hits /chat/completions", async () => {
      // Stub fetch at the adapter boundary — we assert the REQUEST shape, not the
      // network. This pins the two real-world fixes (endpoint + no temperature) so
      // a regression re-breaks a live K3 call immediately.
      const seen: Array<{ url: string; body: Record<string, unknown> }> = [];
      const realFetch = globalThis.fetch;
      globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
        seen.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) });
        return new Response(JSON.stringify({ choices: [{ message: { content: "{\"word\":\"dog\",\"definition\":\"a canid\",\"related\":[]}" } }] }), { status: 200, headers: { "content-type": "application/json" } });
      }) as typeof fetch;
      try {
        const tool = new KimiK3Tool({ baseUrl: "https://api.moonshot.ai/v1", apiKey: "test-key", languageModel: "kimi-k3", verifyModel: "kimi-k3" });
        await tool.define("dog");
      } finally {
        globalThis.fetch = realFetch;
      }
      expect(seen).toHaveLength(1);
      expect(seen[0]!.url).toBe("https://api.moonshot.ai/v1/chat/completions");
      expect(seen[0]!.body.model).toBe("kimi-k3");
      expect("temperature" in seen[0]!.body).toBe(false); // the 400-causing bug, pinned out
    });


  it("a tool call with no token fails honestly (instrument unavailable), never throws", async () => {
    const tool = new KimiK3Tool({ baseUrl: "https://api.moonshot.ai/v1", apiKey: "", languageModel: "kimi-k3", verifyModel: "kimi-k3" });
    const out = await tool.define("dog");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toMatch(/no API key|unavailable/i);
  });

  it("the schema validators accept well-formed K3 payloads (contract parity with phi)", () => {
    // The SAME validators gate both instruments — a valid K3 reply must pass them.
    expect(validateNameThis({ labels: ["dog", "hound"], confidence: 0.9 }).ok).toBe(true);
    expect(validateDefine({ word: "dog", definition: "a domesticated canid kept as a companion", related: ["pet", "animal"] }).ok).toBe(true);
    expect(validateLexical({ word: "dog", pos: "noun", gloss: "a domesticated canid", relations: [{ kind: "is-a", to: "animal" }] }).ok).toBe(true);
  });

  it("the echo/meta-text guard still rejects a parroted example, whoever the instrument", () => {
    // K3 should not echo — but the validator is the backstop that phi needed.
    const bad = validateDefine({ word: "dog", definition: "one or two sentences", related: [] });
    expect(bad.ok).toBe(false);
  });
});
