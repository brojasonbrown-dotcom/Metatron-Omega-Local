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
  validateNameThis,
  validateRelate,
  validateVerify,
  type DefineResponse,
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
    const prompt =
      `Define the word "${word}" for a learning machine.\n` +
      `Reply ONLY with JSON: {"word": "${word}", "definition": "one or two sentences", ` +
      `"related": ["up to 8 related words"]}.`;
    return this._callJson(PHI_MODEL, prompt, validateDefine);
  }

  /** phi: explain the relation between two concepts the engine finds resonant. */
  async relate(wordA: string, wordB: string): Promise<ToolOutcome<RelateResponse>> {
    const prompt =
      `Explain how "${wordA}" relates to "${wordB}" for a learning machine.\n` +
      `Reply ONLY with JSON: {"relation": "one or two sentences", "strength": 0.0 to 1.0}.`;
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
    timeoutMs: number
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
          num_predict: 256,
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
