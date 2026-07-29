/**
 * RHUFT Mind — LLM Tool Adapter: phi & mathstral as instruments of the engine
 *
 * Epistemic Status: [SPEC] — Adapter-layer tool contracts.
 *
 * [PHIL] — The LLMs are NOT the mind. They are external instruments the engine
 * queries when its own drives fire: phi for language (naming, defining,
 * relating, phrasing), mathstral for structural/numeric verification. The
 * engine remains the sole locus of learning — every validated answer is
 * re-encoded into field space and fed back through process().
 *
 * Contract per call:
 *   - Structured tools use Ollama's grammar-constrained `format: "json"`.
 *   - Responses are schema-validated (schemas/validate.ts). Invalid → rejected,
 *     journaled by the caller, retried within a bounded φ-ladder. Never mocked.
 *   - One call in flight per model (enforced by the cognitive loop).
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
import { MATHSTRAL_MODEL, PHI_MODEL } from "./ollama_supervisor.ts";

/** Outcome of a tool invocation (success payload or an honest failure). */
export type ToolOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly rawText: string; readonly elapsedMs: number }
  | { readonly ok: false; readonly reason: string; readonly elapsedMs: number };

/** φ-scaled timeout ladder per attempt: 34s, 55s, 89s (Fibonacci). [SPEC] */
const TIMEOUT_LADDER_MS: readonly number[] = [34_000, 55_000, 89_000];

/** Maximum attempts per tool call (length of the ladder). [SPEC] */
const MAX_ATTEMPTS = TIMEOUT_LADDER_MS.length;

export class LlmTool {
  private _baseUrl: string;

  constructor(baseUrl: string) {
    this._baseUrl = baseUrl;
  }

  setBaseUrl(url: string): void {
    this._baseUrl = url;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Tools (engine-initiated only — never a chat loop)
  // ───────────────────────────────────────────────────────────────────────────

  /** phi: propose labels for a stable percept the engine cannot name. */
  async nameThis(perceptDescription: string): Promise<ToolOutcome<NameThisResponse>> {
    const prompt =
      `You label perceptions for a learning machine. ` +
      `Perception: ${perceptDescription}\n` +
      `Reply ONLY with JSON: {"labels": ["word1", "word2"], "confidence": 0.0 to 1.0}. ` +
      `Give 1-5 short lowercase noun labels for what this perception most likely is.`;
    return this._callJson(PHI_MODEL, prompt, validateNameThis);
  }

  /** phi: define a word the engine has heard but does not understand deeply. */
  async define(word: string): Promise<ToolOutcome<DefineResponse>> {
    // Anti-echo prompt: a 3B model parrots example text ("one or two sentences")
    // back as the definition. Demand concrete content and forbid meta-language,
    // so the glossary stores a real meaning, not a description of the reply.
    const prompt =
      `Define the word "${word}" concretely, the way a dictionary does: what it IS and what it does or is used for.\n` +
      `Rules: state real facts about "${word}" itself; do NOT write phrases like "one or two sentences" or describe your own answer.\n` +
      `Reply ONLY with JSON: {"word": "${word}", "definition": "<the actual meaning>", "related": ["<up to 8 related words>"]}.`;
    return this._callJson(PHI_MODEL, prompt, validateDefine);
  }

  /** phi: explain the relation between two concepts the engine finds resonant. */
  async relate(wordA: string, wordB: string): Promise<ToolOutcome<RelateResponse>> {
    const prompt =
      `State the concrete relationship between "${wordA}" and "${wordB}" — how one involves the other in the real world.\n` +
      `Rules: name the actual connection (e.g. part-of, causes, lives-in, is-a); do NOT write "one or two sentences" or describe your own answer.\n` +
      `Reply ONLY with JSON: {"relation": "<the actual connection>", "strength": 0.0 to 1.0}.`;
    return this._callJson(PHI_MODEL, prompt, validateRelate);
  }

  /** mathstral: verify a structural/numeric hypothesis produced by the engine. */
  async verifyStructure(claim: string): Promise<ToolOutcome<VerifyResponse>> {
    const prompt =
      `You verify mathematical/structural claims. Claim: ${claim}\n` +
      `Reply ONLY with JSON: {"verdict": "valid" or "invalid" or "uncertain", ` +
      `"reasoning": "one or two sentences"}.`;
    return this._callJson(MATHSTRAL_MODEL, prompt, validateVerify);
  }

  /**
   * phi: produce a word's dictionary entry — part of speech, a concrete gloss,
   * and its typed relations to other words (M7, the language front). The
   * relations this returns become candidate edges in the lexicon's grounded
   * graph, each hardened by the pair's MEASURED geometry. [SPEC]
   */
  async lexical(word: string): Promise<ToolOutcome<LexicalResponse>> {
    const prompt =
      `Give the dictionary entry for the word "${word}".\n` +
      `Rules: "pos" is its part of speech (noun/verb/adjective/...). ` +
      `"gloss" is what "${word}" concretely IS or DOES — real facts about the word itself, never a description of your own reply. ` +
      `"relations" lists up to 8 other real words with their connection: kind is one of "is-a", "related-to", "opposite-of", "part-of".\n` +
      `Reply ONLY with JSON: {"word": "${word}", "pos": "noun", "gloss": "<the actual meaning>", "relations": [{"kind": "is-a", "to": "<word>"}]}.`;
    return this._callJson(PHI_MODEL, prompt, validateLexical);
  }

  /**
   * phi: turn the engine's active concepts into a spoken sentence — the voice.
   * Plain text (not JSON): speech is free-form by design.
   */
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
    const out = await this._generate(PHI_MODEL, prompt, false, TIMEOUT_LADDER_MS[0]);
    if (!out.ok) return out;
    const text = out.value.trim().replace(/^["']+|["']+$/g, "").slice(0, 300);
    if (text.length === 0) {
      return { ok: false, reason: "phrase: empty response", elapsedMs: out.elapsedMs };
    }
    return { ok: true, value: text, rawText: out.value, elapsedMs: out.elapsedMs };
  }

  /**
   * phi: GROUNDED question answering — the hybrid path (M3).
   *
   * Unlike phrase() (which sees only labels + mood), answer() receives the
   * human's ACTUAL words plus everything the machine can honestly bring to
   * bear. Measured reality (Gate M3): a 3B model will ignore a facts block
   * and hallucinate if asked to answer FROM it. The prompt is therefore
   * shaped as a COPY-task: one commentary sentence ABOUT the facts, placed
   * LAST (recency), with an explicit ban on new numbers. The caller then
   * builds the factual spine DETERMINISTICALLY — phi only comments on it.
   * Temperature stays 1/φ² (the engine's own law).
   */
  async answer(
    question: string,
    context: {
      engineFacts: string;
      concepts: Array<{ labels: string[]; resonance: number }>;
    },
  ): Promise<ToolOutcome<string>> {
    const conceptBlock =
      context.concepts.length === 0
        ? "(nothing learned yet)"
        : context.concepts
            .map((c) => `- ${c.labels.join(", ") || "unnamed"} (resonance ${c.resonance.toFixed(3)})`)
            .join("\n");
    // BOUNDED MULTI-SENTENCE (the "one paragraph" fix): the previous cap of
    // ONE sentence / 30 words / 300 chars was the truncation the user saw. The
    // answer may now run to a short paragraph — still finite (the UI can never
    // hang on an endless stream) and still grounded (no new numbers).
    const prompt =
      `You are the voice of a learning machine built on the RHUFT engine.\n` +
      `The human asked: "${question}"\n` +
      `The machine's learned concepts near this question:\n${conceptBlock}\n\n` +
      `Answer in a short paragraph (2-4 sentences, up to 110 words, first person) that engages the question in the light of these FACTS. ` +
      `Be substantive, not one clipped line. Do NOT introduce any new numbers or claims — only perspective on what the facts mean.\n` +
      `FACTS (the only truth you may reference):\n${context.engineFacts || "(none computed for this query)"}\n\n` +
      `ANSWER:`;
    const out = await this._generate(PHI_MODEL, prompt, false, TIMEOUT_LADDER_MS[0], 640);
    if (!out.ok) return out;
    const text = out.value.trim().replace(/^["']+|["']+$/g, "").slice(0, 900);
    if (text.length === 0) {
      return { ok: false, reason: "answer: empty response", elapsedMs: out.elapsedMs };
    }
    return { ok: true, value: text, rawText: out.value, elapsedMs: out.elapsedMs };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Internals: bounded-retry JSON call + raw generate
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
        return {
          ok: true,
          value: check.value,
          rawText: gen.value,
          elapsedMs: Date.now() - started,
        };
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
    numPredict: number = 256
  ): Promise<{ ok: true; value: string; elapsedMs: number } | { ok: false; reason: string; elapsedMs: number }> {
    const started = Date.now();
    try {
      const body: Record<string, unknown> = {
        model,
        prompt,
        stream: false,
        keep_alive: "30m",
        options: {
          temperature: 1 / (PHI * PHI), // ≈ 0.382 — structured but not frozen. [SPEC]
          num_predict: numPredict,
        },
      };
      if (json) body["format"] = "json";

      const res = await fetch(`${this._baseUrl}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        return {
          ok: false,
          reason: `HTTP ${res.status} from ${model}`,
          elapsedMs: Date.now() - started,
        };
      }
      const payload = (await res.json()) as { response?: unknown };
      if (typeof payload.response !== "string") {
        return {
          ok: false,
          reason: `${model}: missing response field`,
          elapsedMs: Date.now() - started,
        };
      }
      return { ok: true, value: payload.response, elapsedMs: Date.now() - started };
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      return {
        ok: false,
        reason: isTimeout ? `${model}: timeout after ${timeoutMs}ms` : `${model}: ${String(err)}`,
        elapsedMs: Date.now() - started,
      };
    }
  }
}
