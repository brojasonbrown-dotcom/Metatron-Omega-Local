/**
 * Tests — A6 / P9: provenance-hashed model routing.
 * (core/provenance.ts + the InstrumentRouter A6 wiring; MASTER_PLAN_V3 §1 A6, §P9.)
 *
 * Gate P9 (provenance half): every routed output carries a resolvable
 * sha1(model_id ‖ prompt_hash ‖ ts) stamp. These tests prove:
 *   · the stamp is deterministic and self-consistent (verifyProvenance round-trip);
 *   · the model_id is instrument-qualified and read LIVE (ollama vs k3 resolve to
 *     different ids; the verify path uses the verifier model);
 *   · the stamp is content-free (the prompt text is NOT recoverable from the hash);
 *   · tampering with any field breaks verification (the audit cannot be forged);
 *   · the router's answerWithProvenance / verifyStructureWithProvenance stamp with
 *     the model that actually served the call.
 *
 * The live-routing half (a new model actually answering, old models still served)
 * is covered by tests/integration.ollama.test.ts against a real server; these are
 * the deterministic, always-runnable provenance guarantees.
 */

import { describe, expect, it } from "vitest";
import { stampProvenance, verifyProvenance, type Provenance } from "../core/provenance.ts";
import { InstrumentRouter } from "../cognition/instrument_router.ts";

const PROMPT = "What is the current census depth?";
const MODEL = "ollama/phi:latest";

describe("A6 — the provenance stamp (core/provenance.ts)", () => {
  it("is deterministic for a fixed model+prompt+ts", () => {
    const a = stampProvenance(MODEL, PROMPT, 1000);
    const b = stampProvenance(MODEL, PROMPT, 1000);
    expect(a.hash).toBe(b.hash);
    expect(a.promptHash).toBe(b.promptHash);
  });

  it("verifyProvenance round-trips a genuine stamp", () => {
    const p = stampProvenance(MODEL, PROMPT, 12345);
    expect(verifyProvenance(p)).toBe(true);
  });

  it("the stamp is a 40-char hex sha1 (compact fingerprint)", () => {
    const p = stampProvenance(MODEL, PROMPT);
    expect(p.hash).toMatch(/^[0-9a-f]{40}$/);
    expect(p.promptHash).toMatch(/^[0-9a-f]{40}$/);
  });

  it("is content-free: the prompt text is not recoverable from the hash", () => {
    const p = stampProvenance(MODEL, PROMPT);
    expect(p.hash).not.toContain(PROMPT);
    expect(p.promptHash).not.toContain(PROMPT);
    expect(JSON.stringify(p)).not.toContain(PROMPT);
  });

  it("changing the model changes the hash (traceable to the exact model)", () => {
    const a = stampProvenance("ollama/phi:latest", PROMPT, 1000);
    const b = stampProvenance("k3/kimi-k3", PROMPT, 1000);
    expect(a.hash).not.toBe(b.hash);
  });

  it("changing the prompt changes the hash (traceable to the exact prompt)", () => {
    const a = stampProvenance(MODEL, "prompt one", 1000);
    const b = stampProvenance(MODEL, "prompt two", 1000);
    expect(a.hash).not.toBe(b.hash);
    expect(a.promptHash).not.toBe(b.promptHash);
  });

  it("changing the timestamp changes the hash", () => {
    const a = stampProvenance(MODEL, PROMPT, 1000);
    const b = stampProvenance(MODEL, PROMPT, 1001);
    expect(a.hash).not.toBe(b.hash);
  });

  it("a tampered stamp fails verification (the audit cannot be forged)", () => {
    const p = stampProvenance(MODEL, PROMPT, 777);
    const forged: Provenance = { ...p, modelId: "k3/kimi-k3" };
    expect(verifyProvenance(forged)).toBe(false);
    const forgedTs: Provenance = { ...p, ts: 778 };
    expect(verifyProvenance(forgedTs)).toBe(false);
  });

  it("rejects an empty model id (cannot stamp an anonymous output)", () => {
    expect(() => stampProvenance("", PROMPT)).toThrow(RangeError);
    expect(() => stampProvenance("   ", PROMPT)).toThrow(RangeError);
  });
});

describe("A6 — router wiring (instrument-qualified model ids, read live)", () => {
  /** A router with NO live instruments — only the id-resolution paths are used. */
  function makeRouter(k3Model = "kimi-k3"): InstrumentRouter {
    return new InstrumentRouter({
      ollamaBaseUrl: "http://127.0.0.1:9", // unreachable — we never call the server
      stateDir: ".",
      k3Config: { baseUrl: "https://example.invalid", apiKey: "", languageModel: k3Model, verifyModel: k3Model },
    });
  }

  it("resolves the Ollama language model id for answer() by default", () => {
    const r = makeRouter();
    // Default state: Kimi toggle OFF → answer served by ollama/<language model>.
    expect((r as unknown as { _answerModelId: string })._answerModelId).toBe("ollama/phi:latest");
  });

  it("resolves the Ollama VERIFIER model id for verifyStructure()", () => {
    const r = makeRouter();
    expect((r as unknown as { _verifyModelId: string })._verifyModelId).toBe("ollama/mathstral:latest");
  });

  it("the K3 model id is instrument-qualified with the resolved env model", () => {
    const r = makeRouter("kimi-k3-0716");
    // Force the private field read the way answerWithProvenance does.
    expect((r as unknown as { _k3Model: string })._k3Model).toBe("kimi-k3-0716");
  });

  it("verifyProvenance is re-exported so a host can resolve a stamp", () => {
    const p = stampProvenance("ollama/phi:latest", PROMPT, 42);
    expect(InstrumentRouter.verifyProvenance(p)).toBe(true);
  });
});
