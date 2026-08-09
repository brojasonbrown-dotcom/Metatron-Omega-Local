/**
 * RHUFT Mind — K3 Tool Adapter: the Kimi frontier model as an instrument
 *
 * Epistemic Status: [SPEC] — Adapter-layer tool contract. ADDITIVE module.
 *
 * [PHIL] — Identical role to llm_tool.ts (phi/mathstral): K3 is an INSTRUMENT
 * the engine queries when its drives fire — never the mind. It PROPOSES labels,
 * definitions, relations and phrasings with far higher fidelity than the local
 * 3B models; the LinguisticGate then MEASURES every proposal against the
 * concept's own geometry before it may touch memory. The engine remains the
 * sole locus of learning. Swapping phi for K3 raises the ceiling of what gets
 * proposed; the gate keeps the floor of what gets believed exactly where it was.
 *
 * Transport: the Kimi Open Platform endpoint (OpenAI-compatible chat
 * completions). Auth is an API key — this adapter reads ONLY the base URL +
 * bearer token from explicit config or env, never a hardcoded key:
 *   KIMI_K3_BASE_URL  (default https://api.moonshot.ai/v1 — the official Kimi
 *                      Open Platform OpenAI-compatible base; see platform.kimi.ai
 *                      /docs/api/overview. api.moonshot.cn is the China mirror)
 *   KIMI_K3_API_KEY   (API key from platform.kimi.ai/console/api-keys; empty →
 *                      the adapter reports unavailable honestly, nothing is mocked)
 *   KIMI_K3_MODEL     (default "kimi-k3" — the flagship 1M-context model; also
 *                      "kimi-k2.6", "kimi-k2.5", "kimi-k2.7-code", etc.)
 *
 * Contract per call (mirrors LlmTool):
 *   - Structured tools request JSON (response_format json_object); responses are
 *     schema-validated by the SAME validators as phi. Invalid → rejected,
 *     journaled by the caller, retried within a bounded φ-ladder. Never mocked.
 *   - One call in flight per model (enforced by the cognitive loop).
 *   - TEMPERATURE IS OMITTED: the kimi-k* models FIX temperature (kimi-k3 = 1.0)
 *     and REJECT any explicit value with a 400 — so we send no temperature at
 *     all. (The φ-law temperature applies only to the local Ollama instrument,
 *     which does accept it.)
 */

import { PHI } from "./../core/constants.ts";
import {
  validateDefine,
  validateLexical,
  validateNameThis,
  validateRelate,
  validateVerify,
  type DefineResponse,
  type LexicalResponse,
  type NameThisResponse,
  type RelateResponse,
  type ValidationResult,
  type VerifyResponse,
} from "./../schemas/validate.ts";
import type { LanguageInstrument, ToolOutcome } from "./language_instrument.ts";

export type { ToolOutcome };

/** φ-scaled timeout ladder per attempt: 34s, 55s, 89s (Fibonacci). [SPEC] */
const TIMEOUT_LADDER_MS: readonly number[] = [34_000, 55_000, 89_000];

/** Maximum attempts per tool call (length of the ladder). [SPEC] */
const MAX_ATTEMPTS = TIMEOUT_LADDER_MS.length;

export interface K3Config {
  /** Base URL of the OpenAI-compatible coding endpoint. */
  readonly baseUrl: string;
  /** Bearer token (OAuth access token). Empty → unavailable. */
  readonly apiKey: string;
  /** The language model id ("kimi-k3" or another kimi-k* model). */
  readonly languageModel: string;
  /** The verification model id (K3 verifies too; no separate math model needed). */
  readonly verifyModel: string;
}

/** Read config from env with honest defaults. [SPEC] */
export function k3ConfigFromEnv(env: NodeJS.ProcessEnv = process.env): K3Config {
  const baseUrl = (env["KIMI_K3_BASE_URL"] ?? "https://api.moonshot.ai/v1").replace(/\/+$/, "");
  const apiKey = env["KIMI_K3_API_KEY"] ?? "";
  const languageModel = env["KIMI_K3_MODEL"] ?? "kimi-k3";
  return { baseUrl, apiKey, languageModel, verifyModel: languageModel };
}

export class KimiK3Tool implements LanguageInstrument {
  private _config: K3Config;

  constructor(config: K3Config) {
    this._config = config;
  }

  /** True iff a bearer token is configured — the instrument can actually answer. */
  get available(): boolean {
    return this._config.apiKey.length > 0;
  }

  /** The live config (baseUrl, model ids, key) — read-only view for the router. */
  get config(): K3Config {
    return this._config;
  }

  setConfig(config: K3Config): void {
    this._config = config;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Tools (engine-initiated only — never a chat loop)
  // ───────────────────────────────────────────────────────────────────────────

  /** K3: propose labels for a stable percept the engine cannot name. */
  async nameThis(perceptDescription: string): Promise<ToolOutcome<NameThisResponse>> {
    const prompt =
      `You label perceptions for a learning machine. ` +
      `Perception: ${perceptDescription}\n` +
      `Reply ONLY with JSON: {"labels": ["word1", "word2"], "confidence": 0.0 to 1.0}. ` +
      `Give 1-5 short lowercase noun labels for what this perception most likely is.`;
    return this._callJson(this._config.languageModel, prompt, validateNameThis);
  }

  /** K3: define a word the engine has heard but does not understand deeply. */
  async define(word: string): Promise<ToolOutcome<DefineResponse>> {
    const prompt =
      `Define the word "${word}" concretely, the way a dictionary does: what it IS and what it does or is used for.\n` +
      `Rules: state real facts about "${word}" itself; do NOT write phrases like "one or two sentences" or describe your own answer.\n` +
      `Reply ONLY with JSON: {"word": "${word}", "definition": "<the actual meaning>", "related": ["<up to 8 related words>"]}.`;
    return this._callJson(this._config.languageModel, prompt, validateDefine);
  }

  /** K3: explain the relation between two concepts the engine finds resonant. */
  async relate(wordA: string, wordB: string): Promise<ToolOutcome<RelateResponse>> {
    const prompt =
      `State the concrete relationship between "${wordA}" and "${wordB}" — how one involves the other in the real world.\n` +
      `Rules: name the actual connection (e.g. part-of, causes, lives-in, is-a); do NOT write "one or two sentences" or describe your own answer.\n` +
      `Reply ONLY with JSON: {"relation": "<the actual connection>", "strength": 0.0 to 1.0}.`;
    return this._callJson(this._config.languageModel, prompt, validateRelate);
  }

  /** K3: verify a structural/numeric hypothesis produced by the engine. */
  async verifyStructure(claim: string): Promise<ToolOutcome<VerifyResponse>> {
    const prompt =
      `You verify mathematical/structural claims. Claim: ${claim}\n` +
      `Reply ONLY with JSON: {"verdict": "valid" or "invalid" or "uncertain", ` +
      `"reasoning": "one or two sentences"}.`;
    return this._callJson(this._config.verifyModel, prompt, validateVerify);
  }

  /** K3: produce a word's dictionary entry (M7, the language front). */
  async lexical(word: string): Promise<ToolOutcome<LexicalResponse>> {
    const prompt =
      `Give the dictionary entry for the word "${word}".\n` +
      `Rules: "pos" is its part of speech (noun/verb/adjective/...). ` +
      `"gloss" is what "${word}" concretely IS or DOES — real facts about the word itself, never a description of your own reply. ` +
      `"relations" lists up to 8 other real words with their connection: kind is one of "is-a", "related-to", "opposite-of", "part-of".\n` +
      `Reply ONLY with JSON: {"word": "${word}", "pos": "noun", "gloss": "<the actual meaning>", "relations": [{"kind": "is-a", "to": "<word>"}]}.`;
    return this._callJson(this._config.languageModel, prompt, validateLexical);
  }

  /** K3: turn the engine's active concepts into a spoken sentence — the voice. */
  async phrase(
    conceptLabels: string[],
    context: { curiosity: number; coherence: number }
  ): Promise<ToolOutcome<string>> {
    const labels = conceptLabels.length > 0 ? conceptLabels.join(", ") : "something new and unnamed";
    const mood =
      context.curiosity > 1 / PHI
        ? "curious and questioning"
        : context.coherence > 1 / PHI
          ? "calm and certain"
          : "tentative";
    const prompt =
      `You are the voice of a learning machine. It is currently perceiving: ${labels}. ` +
      `Its mood is ${mood}. ` +
      `Speak ONE short first-person sentence (max 20 words) expressing what it notices or wonders. ` +
      `No quotes, no preamble.`;
    const out = await this._generate(this._config.languageModel, prompt, false, TIMEOUT_LADDER_MS[0]);
    if (!out.ok) return out;
    const text = out.value.trim().replace(/^["']+|["']+$/g, "").slice(0, 300);
    if (text.length === 0) {
      return { ok: false, reason: "phrase: empty response", elapsedMs: out.elapsedMs };
    }
    return { ok: true, value: text, rawText: out.value, elapsedMs: out.elapsedMs };
  }

  /** K3: GROUNDED question answering — the hybrid path (M3). */
  async answer(
    question: string,
    context: {
      engineFacts: string;
      concepts: Array<{ labels: string[]; resonance: number }>;
    },
    depth: "standard" | "deep" = "standard",
  ): Promise<ToolOutcome<string>> {
    const conceptBlock =
      context.concepts.length === 0
        ? "(nothing learned yet)"
        : context.concepts
            .map((c) => `- ${c.labels.join(", ") || "unnamed"} (resonance ${c.resonance.toFixed(3)})`)
            .join("\n");
    // LENGTH (no compromise): the old 640-token / 110-word / 900-char ceiling was
    // the clipped, shallow output. K3 follows real instruction, so the prompt
    // carries the true depth contract and the budget is generous; the bounded
    // continuation finishes anything that still runs long. Deep questions get a
    // fully-developed answer; simple lookups stay tight.
    const deep = depth === "deep";
    const maxTokens = deep ? 2048 : 1200;
    const charCap = deep ? 6000 : 2600;
    const lengthGuide = deep
      ? "a thorough, well-developed answer — as many sentences as the question genuinely needs, structured and substantive"
      : "a focused answer of 2-6 sentences — developed enough to actually engage the question, not one clipped line";
    const prompt =
      `You are the voice of a learning machine built on the RHUFT engine.\n` +
      `The human asked: "${question}"\n` +
      `The machine's learned concepts near this question:\n${conceptBlock}\n\n` +
      `Write ${lengthGuide}, in first person, grounded in the FACTS below. ` +
      `Do NOT introduce any new numbers or claims — only perspective on what the facts mean.\n` +
      `FACTS (the only truth you may reference):\n${context.engineFacts || "(none computed for this query)"}\n\n` +
      `ANSWER:`;
    const out = await this._generate(this._config.languageModel, prompt, false, TIMEOUT_LADDER_MS[0], maxTokens);
    if (!out.ok) return out;
    const text = out.value.trim().replace(/^["']+|["']+$/g, "").slice(0, charCap);
    if (text.length === 0) {
      return { ok: false, reason: "answer: empty response", elapsedMs: out.elapsedMs };
    }
    return { ok: true, value: text, rawText: out.value, elapsedMs: out.elapsedMs };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Internals: bounded-retry JSON call + raw chat completion
  // ───────────────────────────────────────────────────────────────────────────

  private async _callJson<T>(
    model: string,
    prompt: string,
    validate: (raw: unknown) => ValidationResult<T>
  ): Promise<ToolOutcome<T>> {
    const started = Date.now();
    let lastReason = "no attempts made";

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const timeout = TIMEOUT_LADDER_MS[attempt];
      const gen = await this._generate(model, prompt, true, timeout);
      if (!gen.ok) {
        lastReason = gen.reason;
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(gen.value);
      } catch {
        lastReason = `attempt ${attempt + 1}: response is not valid JSON`;
        continue;
      }
      const check = validate(parsed);
      if (check.ok) {
        return { ok: true, value: check.value, rawText: gen.value, elapsedMs: Date.now() - started };
      }
      lastReason = `attempt ${attempt + 1}: ${check.reason}`;
    }

    return { ok: false, reason: lastReason, elapsedMs: Date.now() - started };
  }

  private async _generate(
    model: string,
    prompt: string,
    json: boolean,
    timeoutMs: number,
    maxTokens: number = 256
  ): Promise<{ ok: true; value: string; elapsedMs: number } | { ok: false; reason: string; elapsedMs: number }> {
    const started = Date.now();
    if (!this.available) {
      return { ok: false, reason: "kimi-k3: no API key configured (instrument unavailable)", elapsedMs: 0 };
    }
    // EMPTY-RESPONSE RESILIENCE (parity with the Ollama instrument): a degenerate
    // prompt can return an empty content string. Retry ONCE with an explicit
    // answer-request suffix before declaring failure — a real answer, however
    // short, is returned untouched (whitespace-only is empty).
    const RE_PRIME = "\n\nPlease provide your answer now.";
    for (let shot = 0; shot < 2; shot++) {
      const primed = shot === 1 ? prompt + RE_PRIME : prompt;
      const gen = await this._generateOnce(model, primed, json, timeoutMs, maxTokens);
      if (!gen.ok) return gen;
      if (gen.value.trim().length > 0 || shot === 1) return gen;
    }
    return { ok: false, reason: `${model}: empty response after re-prime`, elapsedMs: Date.now() - started };
  }

  /** A single bounded K3 chat-completion call (one HTTP round-trip). */
  private async _generateOnce(
    model: string,
    prompt: string,
    json: boolean,
    timeoutMs: number,
    maxTokens: number
  ): Promise<{ ok: true; value: string; elapsedMs: number } | { ok: false; reason: string; elapsedMs: number }> {
    const started = Date.now();
    try {
      const body: Record<string, unknown> = {
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
          // NO temperature: the kimi-k* models fix it server-side (kimi-k3 = 1.0) and reject
          // any explicit value with a 400. The φ-law temperature is Ollama-only (K3 does not accept it).
        max_tokens: maxTokens,
      };
      if (json) body["response_format"] = { type: "json_object" };

      const res = await fetch(`${this._config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this._config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        return { ok: false, reason: `HTTP ${res.status} from ${model}`, elapsedMs: Date.now() - started };
      }
      const payload = (await res.json()) as {
        choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>;
      };
      const choice = payload.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content !== "string") {
        return { ok: false, reason: `${model}: missing message.content field`, elapsedMs: Date.now() - started };
      }
      // M5 — TRUNCATION HONESTY: a "length" finish means the model was cut off
      // mid-thought. We do NOT serve the fragment as if complete — we make ONE
      // bounded continuation (same token budget, not doubled) and splice it on.
      // If it still truncates, the cut is marked visibly ("…") so an unfinished
      // answer is never mistaken for a finished one. Token usage stays bounded:
      // at most one extra completion of the same size, and only when the answer
      // genuinely ran long.
      if (choice?.finish_reason === "length") {
        const more = await this._continue(model, prompt, content, json, timeoutMs, maxTokens);
        if (more.ok) {
          return { ok: true, value: content + more.value, elapsedMs: Date.now() - started };
        }
        // Continuation failed — return the fragment WITH a visible cut marker.
        return { ok: true, value: content.trimEnd() + " …", elapsedMs: Date.now() - started };
      }
      return { ok: true, value: content, elapsedMs: Date.now() - started };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      return {
        ok: false,
        reason: isTimeout ? `${model}: timeout after ${timeoutMs}ms` : `${model}: ${String(err)}`,
        elapsedMs: Date.now() - started,
      };
    }
    }

    /**
     * ONE bounded continuation after a length-truncation: feed the partial answer
     * back as an assistant turn and ask the model to finish it. Same token budget
     * as the original (not doubled) so a long answer costs at most 2× its own
     * ceiling, never more. Returns ok:false if the continuation itself errors or
     * truncates again — the caller then marks the cut visibly.
     */
    private async _continue(
      model: string,
      originalPrompt: string,
      partial: string,
      json: boolean,
      timeoutMs: number,
      maxTokens: number
    ): Promise<{ ok: true; value: string } | { ok: false }> {
      try {
        const body: Record<string, unknown> = {
          model,
          messages: [
            { role: "user", content: originalPrompt },
            { role: "assistant", content: partial },
            { role: "user", content: "Continue exactly where you stopped. Output ONLY the remaining text — do not repeat anything, no preamble." },
          ],
          stream: false,
          max_tokens: maxTokens, // same budget — bounded, not doubled
        };
        if (json) body["response_format"] = { type: "json_object" };
        const res = await fetch(`${this._config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${this._config.apiKey}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) return { ok: false };
        const payload = (await res.json()) as { choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }> };
        const choice = payload.choices?.[0];
        const content = choice?.message?.content;
        if (typeof content !== "string") return { ok: false };
        // If the continuation ALSO truncated, mark it visibly and stop — never loop.
        const tail = choice?.finish_reason === "length" ? content.trimEnd() + " …" : content;
        return { ok: true, value: tail };
      } catch {
        return { ok: false };
      }
    }
  }
