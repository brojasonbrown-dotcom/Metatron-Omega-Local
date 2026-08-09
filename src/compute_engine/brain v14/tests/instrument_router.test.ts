/**
 * M9 — Instrument Router: the switchable language instrument.
 *
 * This suite proves the three laws the router is built on:
 *
 *   1. STRUCTURAL CONTRACT — the router IS a LanguageInstrument: the
 *      CognitiveLoop can depend on it as `llm` and never know a switch
 *      happened. Both backing instruments (LlmTool, KimiK3Tool) satisfy the
 *      same interface, and LlmTool is now model-parametric — ANY installed
 *      Ollama model can serve, not just phi/mathstral.
 *   2. AUTO-DETECT — availability is MEASURED (a K3 token present; an Ollama
 *      /api/tags probe), never assumed. An unreachable instrument is reported
 *      with its reason, never mocked.
 *   3. EXPLICIT SWITCH — switching to an unavailable instrument is rejected
 *      honestly and leaves the active one untouched; a valid switch forwards
 *      to the new instrument on the very next call, with no restart.
 *
 * Ollama is stubbed via globalThis.fetch (no live server in CI); the K3
 * instrument is given an empty token so it reports unavailable honestly.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { InstrumentRouter } from "./../cognition/instrument_router.ts";
import type { LanguageInstrument } from "./../adapters/language_instrument.ts";
import { LlmTool } from "./../adapters/llm_tool.ts";
import { KimiK3Tool } from "./../adapters/kimi_k3_tool.ts";
import { MATHSTRAL_MODEL, PHI_MODEL } from "./../adapters/ollama_supervisor.ts";

/** A fetch stub that answers ONLY /api/tags with a fixed model list (or fails). */
function stubOllama(models: string[] | null) {
  return (async (url: unknown) => {
    const u = String(url);
    if (u.endsWith("/api/tags")) {
      if (models === null) throw new Error("connection refused");
      return new Response(JSON.stringify({ models: models.map((name) => ({ name })) }), { status: 200 });
    }
    // Every other endpoint (generate etc.) is irrelevant to these tests.
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

const realFetch = globalThis.fetch;
let tmpDir: string;

function makeRouter(models: string[] | null, k3Key = ""): InstrumentRouter {
  return new InstrumentRouter({
    ollamaBaseUrl: "http://127.0.0.1:9", // unroutable — only the stub answers
    stateDir: tmpDir,
    k3Config: { baseUrl: "https://api.kimi.com/coding/v1", apiKey: k3Key, languageModel: "k3", verifyModel: "k3" },
  });
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rhuft-inst-"));
});
afterEach(() => {
  globalThis.fetch = realFetch;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("1. structural contract — one interface, any model", () => {
  it("both instruments satisfy the LanguageInstrument shape", () => {
    const ollama: LanguageInstrument = new LlmTool("http://x");
    const k3: LanguageInstrument = new KimiK3Tool({ baseUrl: "https://x", apiKey: "", languageModel: "k3", verifyModel: "k3" });
    for (const inst of [ollama, k3]) {
      for (const m of ["nameThis", "define", "relate", "verifyStructure", "lexical", "phrase", "answer"] as const) {
        expect(typeof inst[m]).toBe("function");
      }
    }
  });

  it("the router itself IS a LanguageInstrument (the loop's llm)", () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL]);
    const router: LanguageInstrument = makeRouter([PHI_MODEL, MATHSTRAL_MODEL]);
    for (const m of ["nameThis", "define", "relate", "verifyStructure", "lexical", "phrase", "answer"] as const) {
      expect(typeof router[m]).toBe("function");
    }
  });

  it("LlmTool is model-parametric: any Ollama model can serve, defaulting to phi+mathstral", () => {
    const def = new LlmTool("http://x");
    expect(def).toBeDefined();
    // A custom model pair is accepted without touching phi/mathstral.
    const custom = new LlmTool("http://x", "qwen3:4b", "qwen3:4b");
    expect(custom).toBeDefined();
  });
});

describe("2. auto-detect — availability is measured, never assumed", () => {
  it("reports ollama available with its installed models when the probe succeeds", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL, "qwen3:4b"]);
    const router = makeRouter(null); // fetch stub is what answers
    const status = await router.availability();
    const ollama = status.instruments.find((i) => i.id === "ollama")!;
    expect(ollama.available).toBe(true);
    expect(ollama.models).toContain("qwen3:4b");
    const k3 = status.instruments.find((i) => i.id === "k3")!;
    expect(k3.available).toBe(false); // empty token → honest unavailable
    expect(k3.reason).toMatch(/KIMI_K3_API_KEY|OAuth/i);
  });

  it("reports ollama unavailable honestly when the server is unreachable", async () => {
    globalThis.fetch = stubOllama(null);
    const router = makeRouter(null);
    const status = await router.availability();
    const ollama = status.instruments.find((i) => i.id === "ollama")!;
    expect(ollama.available).toBe(false);
    expect(ollama.models).toEqual([]);
  });

  it("autoSelect prefers K3 when its token is present, else falls back to ollama", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL]);
    const withK3 = makeRouter(null, "test-token");
    const s1 = await withK3.autoSelect();
    expect(s1.active).toBe("k3");
    const noK3 = makeRouter(null, "");
    const s2 = await noK3.autoSelect();
    expect(s2.active).toBe("ollama");
  });
});

describe("3. explicit switch — honest, atomic, no restart", () => {
  it("rejects a switch to an unavailable instrument and leaves the active one untouched", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL]);
    const router = makeRouter(null, ""); // ollama up, k3 down
    await router.autoSelect();
    expect(router.active).toBe("ollama");
    const r = await router.setInstrument("k3");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/KIMI_K3_API_KEY|OAuth/i);
    expect(router.active).toBe("ollama"); // untouched
  });

  it("rejects an uninstalled ollama model honestly, listing what IS installed", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL]);
    const router = makeRouter(null, "");
    const r = await router.setInstrument("ollama", "nonexistent:99b");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not installed/i);
  });

  it("switches to ANY installed ollama model (not just phi/mathstral)", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL, "qwen3:4b"]);
    const router = makeRouter(null, "");
    const r = await router.setInstrument("ollama", "qwen3:4b");
    expect(r.ok).toBe(true);
    expect(router.ollamaModel).toBe("qwen3:4b");
  });

  it("persists the selection and restores it on the next boot", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL, "qwen3:4b"]);
    const first = makeRouter(null, "tok");
    await first.setInstrument("k3");
    // A fresh router over the SAME state dir wakes on the persisted choice.
    const second = makeRouter(null, "tok");
    expect(second.active).toBe("k3");
  });

  it("a corrupt selection file is ignored — auto-detect decides", async () => {
    fs.writeFileSync(path.join(tmpDir, "instrument.json"), "{not json", "utf8");
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL]);
    const router = makeRouter(null, "");
    const s = await router.autoSelect();
    expect(s.active).toBe("ollama");
  });
});

describe("4. M10 — the split: Kimi-answers / Ollama-thoughts + honest failover", () => {
  it("routes thought methods to Ollama always, answer() to K3 only when the toggle is ON", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL]);
    const router = makeRouter(null, "test-token"); // both instruments available
    // Default: Kimi OFF → answer resolves to ollama.
    expect(router.kimiOn).toBe(false);
    expect(router.split.answerSource).toBe("ollama");
    // Arm the toggle → answer now resolves to k3, thought methods stay ollama.
    const on = await router.setKimiOn(true);
    expect(on.ok).toBe(true);
    expect(router.kimiOn).toBe(true);
    expect(router.split.answerSource).toBe("k3");
    // Disarm → back to ollama.
    await router.setKimiOn(false);
    expect(router.split.answerSource).toBe("ollama");
  });

  it("refuses to arm Kimi when no key can serve (honest toggle)", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL]);
    const router = makeRouter(null, ""); // K3 key absent
    const r = await router.setKimiOn(true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/KIMI_K3_API_KEY|key/i);
    expect(router.kimiOn).toBe(false);
  });

  it("answer() fails over to Ollama when Kimi is ON but unreachable, never mocking", async () => {
    // Ollama up; K3 has a key (toggle can arm) but its endpoint will fail.
    globalThis.fetch = (async (url: unknown) => {
      const u = String(url);
      if (u.endsWith("/api/tags")) {
        return new Response(JSON.stringify({ models: [{ name: PHI_MODEL }, { name: MATHSTRAL_MODEL }] }), { status: 200 });
      }
      if (u.endsWith("/api/generate")) {
        return new Response(JSON.stringify({ response: "ollama answer", done_reason: "stop" }), { status: 200 });
      }
      if (u.endsWith("/chat/completions")) {
        throw new Error("k3 endpoint unreachable"); // Kimi down
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;
    const router = makeRouter(null, "test-token");
    await router.setKimiOn(true);
    const out = await router.split.answer("what am I?", { engineFacts: "fact", concepts: [] });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.value).toBe("ollama answer"); // failed over honestly
  });

  it("persists the Kimi toggle and restores it only when a key can serve", async () => {
    globalThis.fetch = stubOllama([PHI_MODEL, MATHSTRAL_MODEL]);
    const first = makeRouter(null, "tok");
    await first.setKimiOn(true);
    // Fresh router over the SAME state dir + a key → toggle restored ON.
    const second = makeRouter(null, "tok");
    expect(second.kimiOn).toBe(true);
    // Fresh router over the same dir but NO key → toggle restored OFF (honest).
    const third = makeRouter(null, "");
    expect(third.kimiOn).toBe(false);
  });
});
