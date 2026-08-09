/**
 * RHUFT Mind — Split Instrument: Kimi-responses / Ollama-cognition split
 *
 * Epistemic Status: [SPEC] — Adapter-layer composition. ADDITIVE module.
 *
 * [PHIL] — The mind uses BOTH instruments CONCURRENTLY, not one-or-the-other.
 * The local Ollama pair (phi for language, mathstral for verification) is the
 * cognition BACKBONE: it never stops, and it owns every THOUGHT method —
 * nameThis, define, relate, verifyStructure, lexical, and the voice `phrase()`.
 * Kimi (K3) is a pure TOGGLE that, when ON, takes ONLY the human-facing
 * `answer()` path (the M3 grounded Q&A) — the high-fidelity spokesperson. When
 * OFF, `answer()` falls back to Ollama too, so the mind answers from one
 * instrument again.
 *
 * [PHIL] — KIMI IS BRAIN-CONNECTED, NEVER A BYPASS. answer() RECEIVES the
 * brain's measured layers (the resonant concepts + their resonance scores + the
 * computed engine facts) as its prompt; Kimi's output is returned to the
 * CognitiveLoop, which feeds it BACK through _learnText → the LinguisticGate →
 * the SensorBus as "llm.answer" → engine.process(). The field physically learns
 * what Kimi said only after the gate MEASURES it. Kimi raises the ceiling of
 * what gets PROPOSED; the brain's geometry keeps the floor of what is BELIEVED.
 *
 * HONEST PER-REQUEST FAILOVER — this is what makes "both work fully" robust
 * rather than brittle. If the routed instrument ERRORS (server down, timeout,
 * schema reject), the call is retried ONCE on the other instrument when that
 * instrument is available, and the failover is journaled. Nothing is mocked; a
 * failure on BOTH is reported honestly as ok:false. A truncation is never
 * served as a whole answer (each instrument already marks its own cuts).
 *
 * TRUTH_SOURCES: availability is delegated to the wrapped instruments (a K3 key
 * is present; an Ollama probe succeeds) — never assumed. This wrapper adds no
 * new truth; it routes and, on failure, reroutes.
 */

import type { LanguageInstrument, ToolOutcome } from "./language_instrument.ts";
import type { LlmTool } from "./llm_tool.ts";
import type { KimiK3Tool } from "./kimi_k3_tool.ts";
import type {
  DefineResponse,
  LexicalResponse,
  NameThisResponse,
  RelateResponse,
  VerifyResponse,
} from "./../schemas/validate.ts";
import type { MemoryStore } from "./../cognition/memory_store.ts";

/** Journal kind for a failover event (a closed union member of JournalEntry). */
type JournalKind = Parameters<MemoryStore["journal"]>[0]["kind"];

/** The identity that actually served a call (for the journal). */
export type ServingInstrument = "ollama" | "k3";

export interface SplitInstrumentDeps {
  /** The local cognition backbone (phi + mathstral). Always composed. */
  readonly ollama: LlmTool;
  /** The high-fidelity frontier model. Always composed; gated by its key. */
  readonly k3: KimiK3Tool;
  /**
   * Whether Ollama is reachable RIGHT NOW. Probed live by the caller (the
   * router / supervisor) so failover never fires into a dead server. [SPEC]
   */
  readonly ollamaAvailable: () => boolean;
  /** Optional journal sink — every failover is audited. */
  readonly store?: MemoryStore;
}

export class SplitInstrument implements LanguageInstrument {
  private readonly _deps: SplitInstrumentDeps;
  /**
   * The Kimi toggle. When true AND K3 is available, answer() routes to K3.
   * Persisted / restored by the caller (the bridge), never assumed here.
   */
  private _kimiOn: boolean;

  constructor(deps: SplitInstrumentDeps, kimiOn: boolean = false) {
    this._deps = deps;
    this._kimiOn = kimiOn;
  }

  /** The Kimi toggle state (whether answer() PREFERS K3). */
  get kimiOn(): boolean {
    return this._kimiOn;
  }

  /**
   * Flip the Kimi toggle. Pure state — no process management (Ollama is always
   * running regardless; K3 needs no cold start). The caller persists + journals.
   */
  setKimiOn(on: boolean): void {
    this._kimiOn = !!on;
  }

  /** True iff K3 can actually answer right now (a key is configured). */
  get k3Available(): boolean {
    return this._deps.k3.available;
  }

  /** True iff the local backbone is reachable right now (probed by the caller). */
  get ollamaAvailable(): boolean {
    return this._deps.ollamaAvailable();
  }

  /**
   * Which instrument serves answer() RIGHT NOW — the honest resolution of the
   * toggle against live availability. K3 only when ON and reachable; else Ollama.
   */
  get answerSource(): ServingInstrument {
    return this._kimiOn && this._deps.k3.available ? "k3" : "ollama";
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Cognition backbone — ALWAYS Ollama, with honest failover to K3 when down.
  // ───────────────────────────────────────────────────────────────────────────

  nameThis(d: string): Promise<ToolOutcome<NameThisResponse>> {
    return this._route("nameThis", () => this._deps.ollama.nameThis(d), () => this._deps.k3.nameThis(d));
  }
  define(word: string): Promise<ToolOutcome<DefineResponse>> {
    return this._route("define", () => this._deps.ollama.define(word), () => this._deps.k3.define(word));
  }
  relate(a: string, b: string): Promise<ToolOutcome<RelateResponse>> {
    return this._route("relate", () => this._deps.ollama.relate(a, b), () => this._deps.k3.relate(a, b));
  }
  verifyStructure(claim: string): Promise<ToolOutcome<VerifyResponse>> {
    return this._route(
      "verifyStructure",
      () => this._deps.ollama.verifyStructure(claim),
      () => this._deps.k3.verifyStructure(claim),
    );
  }
  lexical(word: string): Promise<ToolOutcome<LexicalResponse>> {
    return this._route("lexical", () => this._deps.ollama.lexical(word), () => this._deps.k3.lexical(word));
  }
  phrase(labels: string[], ctx: { curiosity: number; coherence: number }): Promise<ToolOutcome<string>> {
    return this._route("phrase", () => this._deps.ollama.phrase(labels, ctx), () => this._deps.k3.phrase(labels, ctx));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Human-facing response — Kimi when ON (else Ollama), with honest failover.
  // ───────────────────────────────────────────────────────────────────────────

  answer(
    question: string,
    context: { engineFacts: string; concepts: Array<{ labels: string[]; resonance: number }> },
    depth: "standard" | "deep" = "standard",
  ): Promise<ToolOutcome<string>> {
    // The toggle resolves the PRIMARY; the other instrument is the failover.
    const preferK3 = this._kimiOn && this._deps.k3.available;
    const primary = preferK3 ? () => this._deps.k3.answer(question, context, depth) : () => this._deps.ollama.answer(question, context, depth);
    const secondary = preferK3 ? () => this._deps.ollama.answer(question, context, depth) : () => this._deps.k3.answer(question, context, depth);
    const secondaryAvailable = preferK3 ? this._deps.ollamaAvailable() : this._deps.k3.available;
    const secondaryName: ServingInstrument = preferK3 ? "ollama" : "k3";
    return this._routeWith("answer", primary, secondary, secondaryAvailable, secondaryName);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Failover internals
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Route a COGNITION call: Ollama primary, K3 failover. Failover fires only on
   * an ERROR outcome (never on a valid-but-surprising answer) and only when K3
   * is actually available — never into a dead instrument.
   */
  private async _route<T>(
    tool: string,
    ollamaCall: () => Promise<ToolOutcome<T>>,
    k3Call: () => Promise<ToolOutcome<T>>,
  ): Promise<ToolOutcome<T>> {
    const primary = await ollamaCall();
    if (primary.ok) return primary;
    if (this._deps.k3.available) {
      this._journal("instrument.failover", { tool, from: "ollama", to: "k3", reason: primary.reason });
      const secondary = await k3Call();
      if (secondary.ok) return secondary;
      // Both failed — report the primary's reason honestly (it was the routed one).
      return { ok: false, reason: `ollama: ${primary.reason}; k3 failover: ${secondary.reason}`, elapsedMs: primary.elapsedMs + secondary.elapsedMs };
    }
    return primary;
  }

  /**
   * Route a call with an EXPLICIT primary/secondary and an availability probe
   * for the secondary (used by answer(), where the toggle picks the primary).
   */
  private async _routeWith<T>(
    tool: string,
    primaryCall: () => Promise<ToolOutcome<T>>,
    secondaryCall: () => Promise<ToolOutcome<T>>,
    secondaryAvailable: boolean,
    secondaryName: ServingInstrument,
  ): Promise<ToolOutcome<T>> {
    const primary = await primaryCall();
    if (primary.ok) return primary;
    if (secondaryAvailable) {
      const from: ServingInstrument = secondaryName === "ollama" ? "k3" : "ollama";
      this._journal("instrument.failover", { tool, from, to: secondaryName, reason: primary.reason });
      const secondary = await secondaryCall();
      if (secondary.ok) return secondary;
      return { ok: false, reason: `${from}: ${primary.reason}; ${secondaryName} failover: ${secondary.reason}`, elapsedMs: primary.elapsedMs + secondary.elapsedMs };
    }
    return primary;
  }

  private _journal(kind: JournalKind, data: Record<string, unknown>): void {
    try {
      this._deps.store?.journal({ t: Date.now(), kind, data });
    } catch {
      // Journaling must never crash the instrument.
    }
  }
}
