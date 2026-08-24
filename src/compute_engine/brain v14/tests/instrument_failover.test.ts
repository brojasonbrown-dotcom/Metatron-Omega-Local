/**
 * F1 — Seamless local answering: the split-instrument failover.
 *
 * Proves the three laws the operator asked for, with NO live server and NO
 * mocked mind — only the two instrument PORTS are faked (the smallest seam):
 *
 *   1. Kimi OFF → answer() is served by Ollama (the local backbone).
 *   2. Ollama errors → answer() fails over to K3 when K3 is available.
 *   3. BOTH down → answer() resolves ok:false with a NON-EMPTY honest reason
 *      (never an empty bubble, never a throw).
 *   4. The Ollama liveness probe is awaited at failover time (async-fresh), so
 *      a server that comes up mid-call is used, not refused off a stale cache.
 */

import { describe, expect, it } from "vitest";
import { SplitInstrument } from "./../adapters/split_instrument.ts";
import type { LanguageInstrument, ToolOutcome } from "./../adapters/language_instrument.ts";

type AnswerFn = LanguageInstrument["answer"];

/** A minimal instrument fake: only the members the split touches are real. */
function fakeInstrument(behaviour: { answer?: string; failReason?: string }): LanguageInstrument {
  const ok = <T,>(value: T): ToolOutcome<T> => ({ ok: true, value, rawText: "", elapsedMs: 1 });
  const bad = <T,>(reason: string): ToolOutcome<T> => ({ ok: false, reason, elapsedMs: 1 });
  const answerImpl: AnswerFn = async () =>
    behaviour.failReason !== undefined
      ? bad(behaviour.failReason)
      : ok(behaviour.answer ?? "stub");
  // Every method defers to the same behaviour; the split only calls answer()
  // on these tests, but the structural contract must be satisfied.
  return {
    nameThis: async () => ok({ labels: ["x"], confidence: 0.5 }),
    define: async () => ok({ word: "x", definition: "d", related: [] }),
    relate: async () => ok({ relation: "r", strength: 0.5 }),
    verifyStructure: async () => ok({ verdict: "valid", reasoning: "r" }),
    lexical: async () => ok({ word: "x", pos: "noun", gloss: "g", relations: [] }),
    phrase: async () => ok("spoken"),
    answer: answerImpl,
  } as unknown as LanguageInstrument;
}

/** A K3-shaped fake exposing the `available` flag the split reads. */
function fakeK3(available: boolean, behaviour: { answer?: string; failReason?: string }) {
  const inst = fakeInstrument(behaviour);
  return Object.assign(inst, { available });
}

const CTX = { engineFacts: "coherence 0.9", concepts: [] };

describe("F1 split-instrument seamless local answering", () => {
  it("serves answer() from Ollama when the Kimi toggle is OFF", async () => {
    const split = new SplitInstrument(
      {
        ollama: fakeInstrument({ answer: "local answer" }) as never,
        k3: fakeK3(true, { answer: "kimi answer" }) as never,
        ollamaAvailable: () => true,
      },
      false, // kimiOn = false
    );
    const out = await split.answer("what is coherence?", CTX);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value).toBe("local answer");
    expect(split.answerSource).toBe("ollama");
  });

  it("fails over to K3 when Ollama errors and K3 is available", async () => {
    const split = new SplitInstrument(
      {
        ollama: fakeInstrument({ failReason: "phi: connection refused" }) as never,
        k3: fakeK3(true, { answer: "kimi rescue" }) as never,
        ollamaAvailable: () => false,
      },
      false,
    );
    const out = await split.answer("q", CTX);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value).toBe("kimi rescue");
  });

  it("resolves ok:false with a NON-EMPTY honest reason when both are down", async () => {
    const split = new SplitInstrument(
      {
        ollama: fakeInstrument({ failReason: "phi: timeout after 89000ms" }) as never,
        k3: fakeK3(false, {}) as never, // no key → unavailable, no failover
        ollamaAvailable: () => false,
      },
      false,
    );
    const out = await split.answer("q", CTX);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(typeof out.reason).toBe("string");
      expect(out.reason.length).toBeGreaterThan(0);
      expect(out.reason).toContain("phi: timeout");
    }
  });

  it("awaits an ASYNC liveness probe before failing over to Ollama (fresh, not cached)", async () => {
    // Kimi ON with a key → K3 is the primary. K3 errors; the split must then
    // measure Ollama liveness LIVE (await the async probe) before failing over —
    // never refuse off a stale TTL cache, never route into a dead server.
    let probeCalls = 0;
    const split = new SplitInstrument(
      {
        ollama: fakeInstrument({ answer: "recovered locally" }) as never,
        k3: fakeK3(true, { failReason: "kimi-k3: HTTP 503" }) as never,
        ollamaAvailable: async () => {
          probeCalls++;
          await new Promise((r) => setTimeout(r, 1)); // genuinely async probe
          return true;
        },
      },
      true, // kimiOn AND keyed → primary is K3
    );
    expect(split.answerSource).toBe("k3"); // confirms K3 is primary
    const out = await split.answer("q", CTX);
    expect(probeCalls).toBeGreaterThan(0); // the live probe really fired
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value).toBe("recovered locally");
  });
});
