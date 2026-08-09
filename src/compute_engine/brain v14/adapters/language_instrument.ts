/**
 * RHUFT Mind — Language Instrument: the one structural contract every model serves
 *
 * Epistemic Status: [SPEC] — Adapter-layer tool contract. ADDITIVE module.
 *
 * [PHIL] — The language model is NOT the mind. It is an external INSTRUMENT the
 * engine queries when its own drives fire. Two implementations satisfy this
 * contract today — the local Ollama pair (phi for language, mathstral for
 * verification; LlmTool) and the Kimi K3 frontier model (KimiK3Tool) — and any
 * future model is admitted by satisfying it too. What they share is structural,
 * not nominal: the same seven methods, the same ToolOutcome, the same schema
 * validators, the same φ-retry ladder. Declaring that shape ONCE here (instead
 * of as an inline `LlmTool | KimiK3Tool` union at every call site) means a new
 * instrument is admitted by STRUCTURE — implement these methods honestly and
 * the engine can query it — with no edit to the cognitive loop. [PHIL]
 *
 * The engine remains the sole locus of learning: every method PROPOSES language
 * (labels, definitions, relations, glosses, phrasings); the LinguisticGate then
 * MEASURES each proposal against the concept's own geometry before it may touch
 * memory. Swapping instruments raises the ceiling of what gets PROPOSED; the
 * gate keeps the floor of what gets BELIEVED exactly where it was.
 *
 * Contract per call (honoured by both implementations):
 *   - Structured tools request JSON; responses are schema-validated by the SAME
 *     validators (schemas/validate.ts). Invalid → rejected, journaled by the
 *     caller, retried within a bounded φ-ladder. Never mocked.
 *   - Temperature stays 1/φ² — the engine's own law, not a model default.
 *   - Unavailability is reported honestly (ok:false with the reason); nothing
 *     is ever simulated.
 */

import type {
  DefineResponse,
  LexicalResponse,
  NameThisResponse,
  RelateResponse,
  VerifyResponse,
} from "./../schemas/validate.ts";

/** Outcome of a tool invocation (success payload or an honest failure). */
export type ToolOutcome<T> =
  | { readonly ok: true; readonly value: T; readonly rawText: string; readonly elapsedMs: number }
  | { readonly ok: false; readonly reason: string; readonly elapsedMs: number };

/**
 * The structural contract both instruments satisfy. Declared as an interface so
 * admission is by shape: any class implementing these seven methods with these
 * signatures IS a language instrument the engine may query.
 */
export interface LanguageInstrument {
  /** Propose labels for a stable percept the engine cannot name. */
  nameThis(perceptDescription: string): Promise<ToolOutcome<NameThisResponse>>;
  /** Define a word the engine has heard but does not understand deeply. */
  define(word: string): Promise<ToolOutcome<DefineResponse>>;
  /** Explain the relation between two concepts the engine finds resonant. */
  relate(wordA: string, wordB: string): Promise<ToolOutcome<RelateResponse>>;
  /** Verify a structural/numeric hypothesis produced by the engine. */
  verifyStructure(claim: string): Promise<ToolOutcome<VerifyResponse>>;
  /** Produce a word's dictionary entry (M7, the language front). */
  lexical(word: string): Promise<ToolOutcome<LexicalResponse>>;
  /** Turn the engine's active concepts into a spoken sentence — the voice. */
  phrase(
    conceptLabels: string[],
    context: { curiosity: number; coherence: number },
  ): Promise<ToolOutcome<string>>;
  /** GROUNDED question answering — the hybrid path (M3). */
  answer(
    question: string,
    context: {
      engineFacts: string;
      concepts: Array<{ labels: string[]; resonance: number }>;
    },
    /**
     * Desired answer depth. "standard" (default) is the bounded paragraph the
     * M3 prompt asks for; "deep" lifts the length ceiling for a substantive,
     * fully-developed answer when the human's question warrants it. The brain
     * (the bridge) chooses the depth — instruments only size their token budget.
     */
    depth?: "standard" | "deep",
  ): Promise<ToolOutcome<string>>;
}
