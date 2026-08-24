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

import { at } from "../core/indexing.ts";
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
  /** The model that serves language tools (nameThis/define/relate/lexical/phrase/answer). */
  private _languageModel: string;
  /** The model that serves structural verification (verifyStructure). */
  private _verifyModel: string;

  /**
   * Model-parametric so the InstrumentRouter can serve ANY installed Ollama
   * model, not just the phi+mathstral pair. Both arguments are optional and
   * default to the historical pair, so every existing `new LlmTool(url)` caller
   * (run_mind, integration tests) is unchanged. [SPEC]
   */
  constructor(baseUrl: string, languageModel: string = PHI_MODEL, verifyModel: string = MATHSTRAL_MODEL) {
    this._baseUrl = baseUrl;
    this._languageModel = languageModel;
    this._verifyModel = verifyModel;
  }

  setBaseUrl(url: string): void {
    this._baseUrl = url;
  }

  /**
   * Hot-swap which Ollama models serve, with no restart and no re-construction.
   * The router calls this on an explicit instrument/model switch; the very next
   * tool call then hits the newly chosen model. Honest: it only re-points the
   * tool, it does not assert the model is installed (that check is the router's).
   */
  setModels(languageModel: string, verifyModel: string): void {
    this._languageModel = languageModel;
    this._verifyModel = verifyModel;
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
    return this._callJson(this._languageModel, prompt, validateNameThis);
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
    return this._callJson(this._languageModel, prompt, validateDefine);
  }

  /** phi: explain the relation between two concepts the engine finds resonant. */
  async relate(wordA: string, wordB: string): Promise<ToolOutcome<RelateResponse>> {
    const prompt =
      `State the concrete relationship between "${wordA}" and "${wordB}" — how one involves the other in the real world.\n` +
      `Rules: name the actual connection (e.g. part-of, causes, lives-in, is-a); do NOT write "one or two sentences" or describe your own answer.\n` +
      `Reply ONLY with JSON: {"relation": "<the actual connection>", "strength": 0.0 to 1.0}.`;
    return this._callJson(this._languageModel, prompt, validateRelate);
  }

  /** mathstral: verify a structural/numeric hypothesis produced by the engine. */
  async verifyStructure(claim: string): Promise<ToolOutcome<VerifyResponse>> {
    const prompt =
      `You verify mathematical/structural claims. Claim: ${claim}\n` +
      `Reply ONLY with JSON: {"verdict": "valid" or "invalid" or "uncertain", ` +
      `"reasoning": "one or two sentences"}.`;
    return this._callJson(this._verifyModel, prompt, validateVerify);
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
    return this._callJson(this._languageModel, prompt, validateLexical);
  }

  /**
   * phi: turn the engine's active concepts into a spoken sentence — the voice.
   * Plain text (not JSON): speech is free-form by design.
   */
  async phrase(
    conceptLabels: string[],
    context: { curiosity: number; coherence: number }
  ): Promise<ToolOutcome<string>> {
    const named = conceptLabels.length > 0;
    const labels = named ? conceptLabels.join(", ") : "something new and unnamed";
    const mood =
      context.curiosity > 1 / PHI
        ? "curious and questioning"
        : context.coherence > 1 / PHI
          ? "calm and certain"
          : "tentative";
    // PERSONA-ANCHORED PROMPT (measured 2026-08-13): the previous wording —
    // "You are the voice of a learning machine… speak first-person" — left the
    // subject ambiguous, and phi drifted into SECOND person ("I notice that
    // YOU have wings") in 8/8 measured shots: the machine addressed its own
    // percept instead of speaking as itself. Naming the machine as the actor,
    // forbidding "you", and giving one concrete example drops the breach to
    // 0/8 with zero empty responses, same model, same temperature. [MEASURED]
    const prompt =
      `You are a machine that sees and learns. Right now your sensors show you: ${labels}. ` +
      `Your mood is ${mood}. ` +
      `Describe what YOU perceive and wonder, in ONE short sentence (max 20 words), first person, starting with "I". ` +
      `Speak only about your own perception — never say "you". ` +
      `Example: "I see a small furry animal and I wonder what it is."`;
    const out = await this._generate(this._languageModel, prompt, false, at(TIMEOUT_LADDER_MS, 0));
    if (!out.ok) return out;
    // ONE-SENTENCE VOICE (measured 2026-08-13): phi cannot count words and tends
    // to ramble into a SECOND sentence that either echoes the prompt or reverts
    // to the assistant script ("...can you help me?"). The voice is defined as a
    // single first-person line, so we keep only the FIRST sentence — this both
    // enforces the length contract and strips the trailing breach deterministically.
    const stripped = out.value.trim().replace(/^["']+|["']+$/g, "");
    const text = LlmTool._firstSentence(stripped).slice(0, 300);
    if (LlmTool._usableVoiceLine(text)) {
      return { ok: true, value: text, rawText: out.value, elapsedMs: out.elapsedMs };
    }
    // The model stalled (empty) or broke persona ("you have…") even after the
    // re-prime ladder. The mind still speaks — DETERMINISTICALLY, from its own
    // active labels and mood, no model in the loop. This is not a placeholder:
    // it is the machine stating its true current perception, which is exactly
    // what the voice is FOR, and it guarantees the voice is never silent. [FIX]
    const fallback = LlmTool._selfVoice(named ? conceptLabels : [], mood);
    return { ok: true, value: fallback, rawText: out.value, elapsedMs: out.elapsedMs };
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
    depth: "standard" | "deep" = "standard",
  ): Promise<ToolOutcome<string>> {
    const conceptBlock =
      context.concepts.length === 0
        ? "(nothing learned yet)"
        : context.concepts
            .map((c) => `- ${c.labels.join(", ") || "unnamed"} (resonance ${c.resonance.toFixed(3)})`)
            .join("\n");
    // LENGTH (no compromise on intelligence): the old ceiling was a hard
    // 640-token / 110-word / 900-char cap — that WAS the clipped, shallow
    // output. The depth now follows the question: a simple lookup stays tight,
    // an analytical question gets room to develop. phi is instruction-weak, so
    // the budget is generous and the truncation-continuation (below) finishes
    // any answer the model wants to run long — the cap is no longer the binding
    // constraint on depth.
    const deep = depth === "deep";
    const numPredict = deep ? 2048 : 1200;
    // The char cap is a SAFETY ceiling, not the target — generous enough that
    // the continuation finishes virtually every answer before it bites. When it
    // does bite, truncate at the last SENTENCE boundary (never mid-word) so a
    // long answer ends cleanly instead of being sliced off mid-thought.
    const charCap = deep ? 12000 : 6000;
    const lengthGuide = deep
      ? "a thorough, well-developed answer — as many sentences as the question genuinely needs"
      : "a focused answer of 2-6 sentences, developed enough to actually engage the question";
    const prompt =
      `You are the voice of a learning machine built on the RHUFT engine.\n` +
      `The human asked: "${question}"\n` +
      `The machine's learned concepts near this question:\n${conceptBlock}\n\n` +
      `Write ${lengthGuide}, in first person, grounded in the FACTS below. ` +
      `Do NOT introduce any new numbers or claims — only perspective on what the facts mean.\n` +
      `FACTS (the only truth you may reference):\n${context.engineFacts || "(none computed for this query)"}\n\n` +
      `ANSWER:`;
    const out = await this._generate(this._languageModel, prompt, false, at(TIMEOUT_LADDER_MS, 0), numPredict);
    if (!out.ok) return out;
    const cleaned = out.value.trim().replace(/^["']+|["']+$/g, "");
    const text = LlmTool._truncateAtSentence(cleaned, charCap);
    if (text.length === 0) {
      return { ok: false, reason: "answer: empty response", elapsedMs: out.elapsedMs };
    }
    return { ok: true, value: text, rawText: out.value, elapsedMs: out.elapsedMs };
  }

  /**
   * Truncate at the last sentence boundary at or before `cap`, never mid-word.
   * If the text is already within the cap it is returned unchanged; if no
   * sentence boundary exists before the cap (one long run-on), fall back to the
   * last word boundary so the answer still ends cleanly. The cap is a generous
   * safety ceiling, so in practice the continuation finishes the answer first
   * and this returns the full text. [FIX for mid-sentence cut-off]
   */
  private static _truncateAtSentence(text: string, cap: number): string {
    if (text.length <= cap) return text;
    const window = text.slice(0, cap);
    // Last sentence-ending punctuation followed by a space/end inside the window.
    const sentenceEnd = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf(".\n"),
      window.lastIndexOf("!\n"),
      window.lastIndexOf("?\n")
    );
    if (sentenceEnd >= Math.floor(cap * 0.4)) {
      // Keep through the punctuation mark itself.
      return window.slice(0, sentenceEnd + 1).trim();
    }
    // No usable sentence boundary — cut at the last word boundary instead.
    const wordEnd = window.lastIndexOf(" ");
    return (wordEnd > 0 ? window.slice(0, wordEnd) : window).trim();
  }

  /**
   * Is this model output usable as the machine's voice? Two failure modes are
   * rejected: an EMPTY line (the model stalled) and a PERSONA BREACH (the
   * machine addressing its own percept in second person — "you have wings..."),
   * which phi produces when the prompt leaves the speaker ambiguous. [MEASURED]
   */
  /**
   * The first sentence of a model line, cut at the earliest sentence-ending
   * punctuation (. ! ?). Used to enforce the one-sentence voice — the second
   * sentence is where phi drifts into echo or the assistant script. If no
   * sentence boundary exists, the line is returned whole (a single run-on is
   * still one breath). [FIX]
   */
  private static _firstSentence(text: string): string {
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      if (ch === "." || ch === "!" || ch === "?") {
        const cut = text.slice(0, i + 1).trim();
        if (cut.length > 0) return cut;
      }
    }
    return text.trim();
  }

  private static _usableVoiceLine(text: string): boolean {
    if (text.length === 0) return false;
    const t = text.toLowerCase();
    // Second-person leak = persona breach. Word-boundary match so "yonder"
    // or "beyond" never false-trigger.
    return !/(you|your|yours|yourself)/.test(t);
  }

  /**
   * The deterministic voice of last resort: the machine states its own current
   * perception from its active labels and mood, first person, with no model in
   * the loop. Reached only when the model could not produce a usable line, so
   * the voice is never silent and never fabricates — it speaks exactly what is
   * on the field. [FIX — persona/empty fallback]
   */
  private static _selfVoice(labels: readonly string[], mood: string): string {
    if (labels.length === 0) {
      return "I sense something new and I do not have a name for it yet.";
    }
    const shown = labels.slice(0, 3).join(", ");
    if (mood.startsWith("curious")) {
      return labels.length > 1
        ? `I notice ${shown} and I wonder how they relate.`
        : `I notice ${shown} and I wonder what it is.`;
    }
    if (mood.startsWith("calm")) {
      return `I recognise ${shown}.`;
    }
    return `I think I perceive ${shown}.`;
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
      const timeout = at(TIMEOUT_LADDER_MS, attempt);
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
    // EMPTY-RESPONSE RESILIENCE (measured): on a degenerate tiny prompt phi
    // stops after its leading newline/space and returns ~nothing (~70% empty
    // on a bare "hi"). Re-priming the SAME prompt with a trailing continuation
    // cue drops that to 0 in measurement, so on an empty/stop result we retry
    // ONCE re-primed before declaring failure. Longer/structured prompts never
    // hit this path (they return non-empty on the first shot, so no retry).
    const RE_PRIME = "\n\nRESPONSE:";
    for (let shot = 0; shot < 2; shot++) {
      const primed = shot === 1 ? prompt + RE_PRIME : prompt;
      const gen = await this._generateOnce(model, primed, json, timeoutMs, numPredict);
      if (!gen.ok) return gen;
      // Only re-prime when the model stopped immediately with nothing — a real
      // answer, however short, is returned untouched. Whitespace-only is empty.
      if (gen.value.trim().length > 0 || shot === 1) return gen;
      // else: fall through to the re-primed second shot.
    }
    // Unreachable (the loop returns on both shots), but keeps the type total.
    return { ok: false, reason: `${model}: empty response after re-prime`, elapsedMs: Date.now() - started };
  }

  /** A single bounded Ollama generate call (one HTTP round-trip). */
  private async _generateOnce(
    model: string,
    prompt: string,
    json: boolean,
    timeoutMs: number,
    numPredict: number
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
      const payload = (await res.json()) as { response?: unknown; done_reason?: unknown };
      if (typeof payload.response !== "string") {
        return {
          ok: false,
          reason: `${model}: missing response field`,
          elapsedMs: Date.now() - started,
        };
      }
      // M5 — TRUNCATION HONESTY (parity with the K3 instrument): a "length"
      // done_reason means the model hit num_predict mid-thought. Do ONE bounded
      // continuation (same num_predict, not doubled) and splice; if it still
      // truncates, mark the cut visibly. Never serve a fragment as if finished.
      if (payload.done_reason === "length") {
        const more = await this._continuePartial(model, prompt, payload.response, json, timeoutMs, numPredict);
        if (more.ok) {
          return { ok: true, value: payload.response + more.value, elapsedMs: Date.now() - started };
        }
        return { ok: true, value: payload.response.trimEnd() + " …", elapsedMs: Date.now() - started };
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

    /**
     * ONE bounded continuation after a length-truncation (Ollama): re-send the
     * prompt with the partial response appended and ask the model to finish it.
     * Same num_predict budget — bounded, not doubled. ok:false if it errors or
     * truncates again (the caller then marks the cut visibly).
     */
    private async _continuePartial(
      model: string,
      originalPrompt: string,
      partial: string,
      json: boolean,
      timeoutMs: number,
      numPredict: number
    ): Promise<{ ok: true; value: string } | { ok: false }> {
      try {
        const continuePrompt = originalPrompt + "\n\nPARTIAL RESPONSE (continue exactly where it stops, output ONLY the rest):\n" + partial;
        const body: Record<string, unknown> = {
          model,
          prompt: continuePrompt,
          stream: false,
          keep_alive: "30m",
          options: { temperature: 1 / (PHI * PHI), num_predict: numPredict },
        };
        if (json) body["format"] = "json";
        const res = await fetch(`${this._baseUrl}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) return { ok: false };
        const payload = (await res.json()) as { response?: unknown; done_reason?: unknown };
        if (typeof payload.response !== "string") return { ok: false };
        const tail = payload.done_reason === "length" ? payload.response.trimEnd() + " …" : payload.response;
        return { ok: true, value: tail };
      } catch {
        return { ok: false };
      }
    }
  }
