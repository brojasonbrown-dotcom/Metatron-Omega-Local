/**
 * RHUFT Mind — Instrument Router: the switchable language instrument
 *
 * Epistemic Status: [SPEC] — Cognition layer. ADDITIVE module.
 *
 * [PHIL] — The engine queries ONE language instrument; which model actually
 * answers is a RUNTIME choice, not a compile-time one. The router is a
 * LanguageInstrument facade: it holds the two instruments (the local Ollama
 * pair via LlmTool, the Kimi K3 frontier model via KimiK3Tool), exposes the
 * union of their availability honestly, and forwards every tool call to
 * whichever is ACTIVE right now. The CognitiveLoop depends on the router as
 * its `llm` and never knows a switch happened — a swap takes effect on the
 * very next drive, with no restart and no re-composition.
 *
 * Three laws, all honest:
 *
 *   1. AUTO-DETECT — the router measures what is actually available: a K3
 *      OAuth token is present (KimiK3Tool.available) and/or an Ollama server
 *      is reachable with ≥1 installed model. It never reports an instrument
 *      it cannot reach, and it never mocks one.
 *
 *   2. EXPLICIT SWITCH — the host (Electron Σ panel, or a bridge frame) picks
 *      the instrument and, for Ollama, the model. A switch to an unavailable
 *      instrument is rejected with the reason; the active instrument is left
 *      untouched. Every successful switch is journaled.
 *
 *   3. PERSISTED CHOICE — the last selection is written beside the mind state
 *      (instrument.json) so a re-booted mind wakes on the instrument the human
 *      last chose, not a hardcoded default. Corrupt → ignored, fall back to
 *      auto-detect. Never blocks boot.
 *
 * TRUTH_SOURCES: availability is derived from live probes (token presence,
 * /api/tags), never assumed. A failed probe is reported, not hidden.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { LanguageInstrument, ToolOutcome } from "./../adapters/language_instrument.ts";
import { LlmTool } from "./../adapters/llm_tool.ts";
import { KimiK3Tool, k3ConfigFromEnv } from "./../adapters/kimi_k3_tool.ts";
import { SplitInstrument } from "./../adapters/split_instrument.ts";
import { MATHSTRAL_MODEL, PHI_MODEL } from "./../adapters/ollama_supervisor.ts";
import { stampProvenance, verifyProvenance, type Provenance } from "./../core/provenance.ts";
import type {
  DefineResponse,
  LexicalResponse,
  NameThisResponse,
  RelateResponse,
  VerifyResponse,
} from "./../schemas/validate.ts";
import type { MemoryStore } from "./memory_store.ts";

/** Journal kind for instrument switches (a closed union member of JournalEntry). */
type JournalKind = Parameters<MemoryStore["journal"]>[0]["kind"];

/** The instrument identities the host may switch between. */
export type InstrumentId = "ollama" | "k3";

/** Honest availability snapshot for one instrument. */
export interface InstrumentAvailability {
  readonly id: InstrumentId;
  /** True iff the router can actually reach this instrument right now. */
  readonly available: boolean;
  /** Why it is unavailable (empty when available). */
  readonly reason: string;
  /** For ollama: the models the reachable server reports installed. */
  readonly models: readonly string[];
  /**
   * For ollama: whether the host has the local instrument switched ON. When
   * false the router does not even probe the server (cold start is explicit).
   * Omitted for k3 (its "switch" is simply the presence of an API key).
   */
  readonly enabled?: boolean;
  /**
   * For k3: whether a bearer token is configured, independent of whether the
   * endpoint is reachable right now. The Σ panel renders "key set" from this so
   * a temporarily-unreachable K3 never looks like a missing key.
   */
  readonly hasKey?: boolean;
}

/** The router's full live status — what the Σ panel renders. */
export interface InstrumentStatus {
  /** Which instrument is currently answering. */
  readonly active: InstrumentId;
  /** For ollama: the language model in use. */
  readonly ollamaModel: string;
  /** For ollama: whether the local instrument is switched on (the off-switch). */
  readonly ollamaEnabled: boolean;
  /** The Kimi toggle: when ON, answer() routes to K3 over the brain layers. */
  readonly kimiOn: boolean;
  /** Which instrument actually serves answer() right now (toggle ∩ availability). */
  readonly answerSource: "ollama" | "k3";
  /** Per-instrument availability. */
  readonly instruments: readonly InstrumentAvailability[];
}

/** The persisted selection written beside the mind state. */
interface PersistedSelection {
  readonly active?: unknown;
  readonly ollamaModel?: unknown;
  /** The Ollama off-switch state (absent in older files → defaults ON). */
  readonly ollamaEnabled?: unknown;
  /** The Kimi toggle (absent in older files → defaults OFF). */
  readonly kimiOn?: unknown;
  /**
   * NOTE: the K3 bearer token is NEVER persisted here — it is a secret held in
   * memory only (set via setK3Key, or KIMI_K3_API_KEY in the environment).
   */
}

export interface InstrumentRouterDeps {
  /** The Ollama base URL the supervisor settled on. */
  readonly ollamaBaseUrl: string;
  /**
   * LIVE Ollama base URL getter (the supervisor's current port). The supervised
   * server can rebind to a fresh port after a crash-restart; when provided, the
   * router re-points its Ollama tool before every availability probe / call so a
   * rebound server is never hit at a stale (dead) URL. Falls back to the static
   * ollamaBaseUrl when omitted. [SPEC]
   */
  readonly ollamaBaseUrlNow?: () => string;
  /** Optional K3 config override (defaults to env via k3ConfigFromEnv). */
  readonly k3Config?: ConstructorParameters<typeof KimiK3Tool>[0];
  /** Directory for instrument.json (defaults to the mind_state dir). */
  readonly stateDir: string;
  /** Optional journal sink — every switch is audited. */
  readonly store?: MemoryStore;
}

export class InstrumentRouter implements LanguageInstrument {
  private readonly _ollama: LlmTool;
  private readonly _k3: KimiK3Tool;
  private readonly _ollamaBaseUrl: string;
  private readonly _ollamaBaseUrlNow: (() => string) | undefined;
  private readonly _stateDir: string;
  private readonly _store: MemoryStore | undefined;
  /**
   * The split-instrument facade the CognitiveLoop actually queries (M10): Kimi
   * answers when its toggle is ON, Ollama always runs the thought methods, and
   * every call fails over honestly. Composed in the constructor after _restore.
   */
  private _split!: SplitInstrument;

  private _active: InstrumentId = "ollama";
  private _ollamaModel: string = PHI_MODEL;
  private _verifyModel: string = MATHSTRAL_MODEL;
  /** A6/P9 — the resolved K3 language-model id, for provenance stamps. */
  private readonly _k3Model: string;
  /**
   * The Ollama off-switch. When false the router treats the local instrument as
   * switched OFF: availability() reports it disabled without probing the server,
   * a switch to it is rejected, and the host cold-stops the process. Default ON
   * (older instrument.json files predate the switch). [SPEC]
   */
  private _ollamaEnabled = true;
  /** The Kimi toggle — restored from instrument.json, flipped via setKimiOn. */
  private _kimiOn = false;
  /** Last successful model list probe (empty until the first refresh). */
  private _ollamaModels: readonly string[] = [];
  /** Wall-clock ms of the last /api/tags probe (0 = never probed). */
  private _ollamaProbedAt = 0;
  /**
   * Model-list probe cache window. The Σ panel polls availability() on a
   * cadence; without a TTL each poll is a fresh network round-trip, which is
   * what made instrument switching feel laggy. A probe fresher than this is
   * reused; anything older is re-measured honestly. [SPEC]
   */
  private static readonly _PROBE_TTL_MS = 1_500;
  /** True once a selection exists (restored from disk or explicitly set). */
  private _hasSelection = false;

  constructor(deps: InstrumentRouterDeps) {
    this._ollamaBaseUrl = deps.ollamaBaseUrl;
    this._ollamaBaseUrlNow = deps.ollamaBaseUrlNow;
    this._stateDir = deps.stateDir;
    this._store = deps.store;
    this._ollama = new LlmTool(deps.ollamaBaseUrl, this._ollamaModel, this._verifyModel);
    const k3Config = deps.k3Config ?? k3ConfigFromEnv();
    this._k3Model = k3Config.languageModel;
    this._k3 = new KimiK3Tool(k3Config);
    // A persisted choice wins; otherwise auto-detect picks the best available.
    this._restore();
    // The split facade the loop queries. Its Ollama-availability probe is LIVE
    // and FORCE-FRESH: at failover time it re-measures /api/tags (bypassing the
    // status TTL cache) so a rebound/crash-restarted server is never read stale
    // and a just-died server is never routed into. [SPEC]
    this._split = new SplitInstrument(
      { ollama: this._ollama, k3: this._k3, ollamaAvailable: () => this._ollamaLiveFresh(), store: deps.store },
      this._kimiOn,
    );
  }

  /**
   * FORCE-FRESH Ollama liveness for failover decisions. Unlike availability()
   * (which is TTL-cached for the polling Σ panel), this always re-probes the
   * live server so a failover never trusts a stale cache. [SPEC]
   */
  private async _ollamaLiveFresh(): Promise<boolean> {
    if (!this._ollamaEnabled) return false;
    const models = await this.refreshOllamaModels(true);
    return models.length > 0;
  }

  /** Re-point the Ollama tool at the supervisor's CURRENT port (a crash-restart can rebind). */
  private _syncOllamaBaseUrl(): void {
    const now = this._ollamaBaseUrlNow?.();
    if (now && now !== this._ollamaBaseUrl) this._ollama.setBaseUrl(now);
  }

  /** The split-instrument facade — the CognitiveLoop's `llm`. */
  get split(): SplitInstrument {
    return this._split;
  }

  /** The Kimi toggle state. */
  get kimiOn(): boolean {
    return this._kimiOn;
  }

  /** The Ollama model currently selected for language work. */
  get ollamaModel(): string {
    return this._ollamaModel;
  }

  /** Which instrument is currently answering. */
  get active(): InstrumentId {
    return this._active;
  }

  /** Whether the local Ollama instrument is switched on. */
  get ollamaEnabled(): boolean {
    return this._ollamaEnabled;
  }

  /** Whether a K3 bearer token is configured (never exposes the token itself). */
  get k3HasKey(): boolean {
    return this._k3.available;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Availability — measured, never assumed
  // ─────────────────────────────────────────────────────────────────────────

  /** Probe Ollama /api/tags and cache the installed model list. */
  async refreshOllamaModels(force = false): Promise<readonly string[]> {
    // Reuse a fresh probe within the TTL; the panel polls faster than the
    // model set realistically changes, and a cache window removes the lag.
    if (!force && Date.now() - this._ollamaProbedAt < InstrumentRouter._PROBE_TTL_MS) {
      return this._ollamaModels;
    }
    this._ollamaProbedAt = Date.now();
    this._syncOllamaBaseUrl(); // a rebound supervised server must be probed at its live port
    const probeUrl = this._ollamaBaseUrlNow?.() ?? this._ollamaBaseUrl;
    try {
      const res = await fetch(`${probeUrl}/api/tags`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (!res.ok) {
        this._ollamaModels = [];
        return this._ollamaModels;
      }
      const body = (await res.json()) as { models?: Array<{ name?: unknown }> };
      this._ollamaModels = Array.isArray(body.models)
        ? body.models
            .map((m) => (typeof m?.name === "string" ? m.name : ""))
            .filter((n) => n.length > 0)
        : [];
      return this._ollamaModels;
    } catch {
      this._ollamaModels = [];
      return this._ollamaModels;
    }
  }

  /** Live availability for both instruments (probes Ollama fresh when enabled). */
  async availability(): Promise<InstrumentStatus> {
    // The off-switch short-circuits the probe: a disabled Ollama is reported
    // unavailable WITHOUT touching the network (the host has it cold-stopped).
    const models = this._ollamaEnabled ? await this.refreshOllamaModels() : [];
    const ollamaUp = this._ollamaEnabled && models.length > 0;
    const k3Up = this._k3.available;
    const instruments: InstrumentAvailability[] = [
      {
        id: "ollama",
        available: ollamaUp,
        reason: this._ollamaEnabled
          ? ollamaUp
            ? ""
            : `no ollama reachable at ${this._ollamaBaseUrlNow?.() ?? this._ollamaBaseUrl} (or no models installed)`
          : "switched off by the host (cold-stopped; flip the switch to cold-start it)",
        models: this._ollamaEnabled ? models : [],
        enabled: this._ollamaEnabled,
      },
      {
        id: "k3",
        available: k3Up,
        reason: k3Up ? "" : "no KIMI_K3_API_KEY configured (set a key in the Σ panel or env)",
        models: k3Up ? [this._k3ModelId()] : [],
        hasKey: this._k3.available,
      },
    ];
    return { active: this._active, ollamaModel: this._ollamaModel, ollamaEnabled: this._ollamaEnabled, kimiOn: this._kimiOn, answerSource: this._split.answerSource, instruments };
  }

  private _k3ModelId(): string {
    // The real model id from the tool's own config (was the literal "k3").
    return this._k3.config.languageModel;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Explicit switch — rejected honestly when the target is unreachable
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Switch the active instrument. For "ollama", `model` selects which installed
   * model serves (defaults to the current one). Returns the honest result; on
   * failure the active instrument is left unchanged.
   */
  async setInstrument(
    id: InstrumentId,
    model?: string,
  ): Promise<{ ok: true; status: InstrumentStatus } | { ok: false; reason: string }> {
    const status = await this.availability();
    const target = status.instruments.find((i) => i.id === id);
    if (!target) return { ok: false, reason: `unknown instrument "${id}"` };
    if (!target.available) return { ok: false, reason: target.reason };

    if (id === "ollama") {
      const chosen = model ?? this._ollamaModel;
      if (!target.models.includes(chosen)) {
        return {
          ok: false,
          reason: `ollama model "${chosen}" is not installed (have: ${target.models.join(", ") || "none"})`,
        };
      }
      this._ollamaModel = chosen;
      // phi+mathstral is the paired instrument; any other single model serves
      // both language and verification (it verifies its own structure).
      this._verifyModel = chosen === PHI_MODEL ? MATHSTRAL_MODEL : chosen;
      this._ollama.setModels(chosen, this._verifyModel);
    }
    this._active = id;
    this._hasSelection = true;
    this._persist();
    this._journal("instrument.switch", {
      active: this._active,
      ollamaModel: this._ollamaModel,
      verifyModel: this._verifyModel,
    });
    return { ok: true, status: await this.availability() };
  }

  /**
   * Choose the boot-time instrument. A REAL selection — one restored from disk
   * or made explicitly — is honoured whenever it is still available. With no
   * selection yet, auto-detect applies the preference: K3 when its token is
   * present (the higher-fidelity instrument), else Ollama. Never throws; a
   * mind with no reachable instrument simply reports its tools unavailable.
   */
  async autoSelect(): Promise<InstrumentStatus> {
    const status = await this.availability();
    // Honour an existing selection if its instrument is still reachable.
    if (this._hasSelection) {
      const current = status.instruments.find((i) => i.id === this._active);
      if (current?.available) return status;
    }
    // No selection (or it went away): prefer K3, fall back to Ollama.
    const k3 = status.instruments.find((i) => i.id === "k3");
    const ollama = status.instruments.find((i) => i.id === "ollama");
    if (k3?.available) this._active = "k3";
    else if (ollama?.available) this._active = "ollama";
    // Neither reachable (e.g. Ollama switched off, no K3 key): leave _active as
    // is — every tool call then fails honestly with the instrument's own reason.
    return this.availability();
  }

  /**
   * The Ollama off-switch. Flip the local instrument ON (cold start) or OFF
   * (cold stop) — persisted, journaled, never mocked. This is a ROUTER-level
   * flag: the actual process stop/start is the host's job (the supervisor lives
   * outside the router); the bridge performs it right after calling this.
   *
   * ON → OFF while ollama is ACTIVE: fail over to K3 if it is reachable; if not,
   * ollama stays nominally active but unavailable, so calls fail honestly with
   * "switched off" until the host re-enables or picks K3. Returns the snapshot.
   */
  async setOllamaEnabled(
    enabled: boolean,
  ): Promise<{ ok: true; status: InstrumentStatus } | { ok: false; reason: string }> {
    const want = !!enabled;
    if (want === this._ollamaEnabled) {
      return { ok: true, status: await this.availability() };
    }
    this._ollamaEnabled = want;
    this._ollamaProbedAt = 0; // state changed — the next probe must be fresh
    if (!want) {
      this._ollamaModels = []; // drop any cached probe; we are cold-stopped now
      if (this._active === "ollama" && this._k3.available) {
        this._active = "k3"; // honest failover to the remaining instrument
      }
    }
    this._persist();
    this._journal("instrument.switch", { ollamaEnabled: want, active: this._active });
    return { ok: true, status: await this.availability() };
  }

  /**
   * Set (or replace) the K3 bearer token at runtime — no restart. The token is
   * held IN MEMORY ONLY and never written to disk, journaled, or echoed into any
   * status frame (only the boolean `hasKey` leaves this object) — it is a secret.
   * The active instrument is left untouched unless the caller also switches.
   */
  async setK3Key(
    apiKey: string,
  ): Promise<{ ok: true; status: InstrumentStatus } | { ok: false; reason: string }> {
    if (typeof apiKey !== "string") {
      return { ok: false, reason: "apiKey must be a string (the OAuth bearer token)" };
    }
    const cur = this._k3.config;
    this._k3.setConfig({
      baseUrl: cur.baseUrl,
      apiKey: apiKey.trim(),
      languageModel: cur.languageModel,
      verifyModel: cur.verifyModel,
    });
    // Only the boolean reaches the journal — the token itself never does.
    this._journal("instrument.switch", { k3KeySet: this._k3.available });
    return { ok: true, status: await this.availability() };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. LanguageInstrument — every call routed through the SPLIT facade, so the
  //    CognitiveLoop gets Kimi-answers / Ollama-thoughts + honest failover for
  //    free, whether it holds the router or the split directly.
  // ─────────────────────────────────────────────────────────────────────────

  nameThis(perceptDescription: string): Promise<ToolOutcome<NameThisResponse>> {
    return this._split.nameThis(perceptDescription);
  }
  define(word: string): Promise<ToolOutcome<DefineResponse>> {
    return this._split.define(word);
  }
  relate(wordA: string, wordB: string): Promise<ToolOutcome<RelateResponse>> {
    return this._split.relate(wordA, wordB);
  }
  verifyStructure(claim: string): Promise<ToolOutcome<VerifyResponse>> {
    return this._split.verifyStructure(claim);
  }
  lexical(word: string): Promise<ToolOutcome<LexicalResponse>> {
    return this._split.lexical(word);
  }
  phrase(
    conceptLabels: string[],
    context: { curiosity: number; coherence: number },
  ): Promise<ToolOutcome<string>> {
    return this._split.phrase(conceptLabels, context);
  }
  answer(
    question: string,
    context: { engineFacts: string; concepts: Array<{ labels: string[]; resonance: number }> },
    depth: "standard" | "deep" = "standard",
  ): Promise<ToolOutcome<string>> {
    return this._split.answer(question, context, depth);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // A6 / P9 — provenance-hashed routing. Every routed output can carry a stamp
  // sha1(model_id ‖ prompt_hash ‖ ts) so the exact model+prompt that produced it
  // is traceable (the dog/cat class of hallucination becomes auditable). The
  // model_id is read LIVE at call time — never a cached default.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * The instrument-qualified model id that would serve `answer()` right now
   * (e.g. "k3/kimi-k3" when the Kimi toggle is live, else "ollama/<model>").
   */
  private get _answerModelId(): string {
    return this._split.answerSource === "k3"
      ? `k3/${this._k3Model}`
      : `ollama/${this._ollamaModel}`;
  }

  /** The instrument-qualified model id that serves `verifyStructure()` (the verifier). */
  private get _verifyModelId(): string {
    return this._split.answerSource === "k3"
      ? `k3/${this._k3Model}`
      : `ollama/${this._verifyModel}`;
  }

  /**
   * Answer with a provenance stamp. Routes through the same split facade (so all
   * failover behaviour is identical), then stamps the outcome with the model that
   * actually served it. The prompt hashed is the exact question string handed to
   * the instrument. A failed route is stamped too — the audit records the attempt.
   */
  async answerWithProvenance(
    question: string,
    context: { engineFacts: string; concepts: Array<{ labels: string[]; resonance: number }> },
    depth: "standard" | "deep" = "standard",
  ): Promise<{ outcome: ToolOutcome<string>; provenance: Provenance }> {
    const modelId = this._answerModelId; // read BEFORE the call: the model that will serve
    const outcome = await this._split.answer(question, context, depth);
    return { outcome, provenance: stampProvenance(modelId, question) };
  }

  /**
   * verifyStructure with a provenance stamp on the verifier (mathstral, or K3 when
   * the toggle is live). The claim being checked is the hashed prompt.
   */
  async verifyStructureWithProvenance(
    claim: string,
  ): Promise<{ outcome: ToolOutcome<VerifyResponse>; provenance: Provenance }> {
    const modelId = this._verifyModelId;
    const outcome = await this._split.verifyStructure(claim);
    return { outcome, provenance: stampProvenance(modelId, claim) };
  }

  /** Re-export so a host can resolve a stamp without importing core/provenance. */
  static verifyProvenance(p: Provenance): boolean {
    return verifyProvenance(p);
  }

  /**
   * The Kimi toggle (M10). ON → answer() routes to K3 (when its key is present)
   * while Ollama keeps every thought method; OFF → Ollama answers too. Persisted
   * and journaled; never touches the Ollama power state (the backbone keeps
   * running either way). Returns the live status snapshot.
   */
  async setKimiOn(on: boolean): Promise<{ ok: true; status: InstrumentStatus } | { ok: false; reason: string }> {
    const want = !!on;
    // Refuse to arm a Kimi that cannot answer — the toggle stays honest. OFF is
    // always allowed (it just returns answering to Ollama).
    if (want && !this._k3.available) {
      return { ok: false, reason: "Kimi cannot be switched ON: no KIMI_K3_API_KEY configured (set a key in the Σ panel or env)" };
    }
    if (want === this._kimiOn) {
      return { ok: true, status: await this.availability() };
    }
    this._kimiOn = want;
    this._split.setKimiOn(want);
    this._persist();
    this._journal("instrument.switch", { kimiOn: want, answerSource: this._split.answerSource });
    return { ok: true, status: await this.availability() };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Persistence + journal
  // ─────────────────────────────────────────────────────────────────────────

  private get _selectionPath(): string {
    return path.join(this._stateDir, "instrument.json");
  }

  private _persist(): void {
    try {
      fs.mkdirSync(this._stateDir, { recursive: true });
      const tmp = `${this._selectionPath}.tmp`;
      fs.writeFileSync(
        tmp,
        JSON.stringify({
          active: this._active,
          ollamaModel: this._ollamaModel,
          ollamaEnabled: this._ollamaEnabled,
          kimiOn: this._kimiOn,
        }),
        "utf8",
      );
      fs.renameSync(tmp, this._selectionPath);
    } catch {
      // Persistence is best-effort; a lost selection falls back to auto-detect.
    }
  }

  private _restore(): void {
    try {
      if (!fs.existsSync(this._selectionPath)) return;
      const parsed = JSON.parse(fs.readFileSync(this._selectionPath, "utf8")) as PersistedSelection;
      if (parsed.active === "ollama" || parsed.active === "k3") {
        this._active = parsed.active;
        this._hasSelection = true;
      }
      if (typeof parsed.ollamaModel === "string" && parsed.ollamaModel.length > 0) {
        this._ollamaModel = parsed.ollamaModel;
        this._verifyModel = parsed.ollamaModel === PHI_MODEL ? MATHSTRAL_MODEL : parsed.ollamaModel;
        this._ollama.setModels(this._ollamaModel, this._verifyModel);
      }
      // The off-switch rides along (absent → default ON, the historical behaviour).
      if (typeof parsed.ollamaEnabled === "boolean") {
        this._ollamaEnabled = parsed.ollamaEnabled;
      }
      // The Kimi toggle rides along (absent → default OFF). Restore only arms it
      // when a key can actually serve; the constructor applies it to _split.
      if (typeof parsed.kimiOn === "boolean") {
        this._kimiOn = parsed.kimiOn && this._k3.available;
      }
    } catch {
      // Corrupt selection → ignore; auto-detect at boot decides.
    }
  }

  private _journal(kind: JournalKind, data: Record<string, unknown>): void {
    try {
      this._store?.journal({ t: Date.now(), kind, data });
    } catch {
      // Journaling must never crash the router.
    }
  }
}
