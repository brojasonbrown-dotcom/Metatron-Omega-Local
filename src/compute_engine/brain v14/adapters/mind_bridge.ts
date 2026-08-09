/**
 * RHUFT Mind — Mind Bridge: NDJSON-over-stdio adapter for an external host UI
 *
 * Epistemic Status: [SPEC] — Adapter-layer transport. ADDITIVE module: no
 * existing v14 file is modified; the bridge is attached at composition time
 * by run_mind_bridge.ts.
 *
 * OUT (mind → host): every event already flows through MemoryStore.journal —
 * boot, sense, thought, voice, tool.call, tool.fail, error, snapshot. The
 * bridge wraps THAT ONE method on the composed store instance and re-emits
 * each entry as a newline-delimited JSON frame on stdout. The journal is the
 * mind's own audit stream; the bridge adds no new truth, it only relays it.
 *
 * IN (host → mind): NDJSON lines on stdin, each validated before use:
 *   {type:"chat", text}            → encodeText → bus as "text.feed"
 *   {type:"sensor.audio", field}   → 28-field   → bus as "audio.mic"
 *   {type:"sensor.vision", field}  → 28-field   → bus as "vision.screen"
 *   {type:"state"}                 → emits a state frame
 *   {type:"shutdown"}              → asks the host entry to sleep gracefully
 * (SensorySource is a closed union — these are the honest mappings; no schema
 * edits were made.)
 *
 * CHANNEL HYGIENE: stdout carries ONLY NDJSON frames. run_mind_bridge.ts
 * redirects console.log to stderr at boot, so the mind's console voice
 * (boot logs, 🗣 utterances) never corrupts the protocol.
 */

import * as readline from "node:readline";
import { encodeText, resonance } from "./language_codec.ts";
import { chunkText } from "./sensors/text_feed.ts";
import type { SensorBus } from "./sensors/sensor_bus.ts";
import type { MemoryStore } from "./../cognition/memory_store.ts";
import type { CognitiveLoop } from "./../cognition/cognitive_loop.ts";
import type { ConceptRegistry } from "./../cognition/concept_registry.ts";
import type { InstrumentRouter, InstrumentId } from "./../cognition/instrument_router.ts";
import type { OllamaSupervisor } from "./ollama_supervisor.ts";
import type { DomainCurriculum, Corpus, CorpusResult } from "./domain_curriculum.ts";

export interface MindBridgeDeps {
  readonly bus: SensorBus;
  readonly store: MemoryStore;
  readonly loop: CognitiveLoop;
  readonly registry: ConceptRegistry;
  readonly llm: import("./language_instrument.ts").LanguageInstrument;
  readonly glossary?: import("./../cognition/glossary.ts").ConceptGlossary;
  readonly lexicon?: import("./../cognition/lexicon.ts").Lexicon;
  /** Engine for live auto-scaling telemetry (depth / nodes / tick cost). */
  readonly engine?: import("./../fractal_node_engine.ts").FractalNodeEngine;
  /** The switchable instrument — when present, the bridge serves instrument.* frames. */
  readonly instrument?: InstrumentRouter;
  /**
   * The Ollama runtime supervisor — present when the bridge serves the Ollama
   * off-switch (ollama.set). The bridge cold-stops / cold-starts the process to
   * honour the router's switch; the router's flag is the source of truth.
   */
  readonly supervisor?: OllamaSupervisor;
  /**
   * P6-E — the domain curriculum adapter. When present, the bridge exposes
   * teachCorpus/teachCurriculum so the host specialises the mind by feeding
   * business + software corpora through the sanctioned bus door.
   */
  readonly curriculum?: DomainCurriculum;
}

/** The subset of journal kinds forwarded to the host (the rest is noise). */
const FORWARDED_KINDS = new Set(["boot", "thought", "voice", "tool.fail", "error"]);

export class MindBridge {
  /** M5 — minimum resonance between an emitted commentary and its question. */
  static readonly ANSWER_RESONANCE_FLOOR = 0.05;

  /**
   * Choose how deep an answer the human's question warrants. A short, simple
   * lookup stays tight; a longer or explicitly analytical question gets the
   * deep budget (the no-compromise path — the model may develop a real answer
   * instead of a clipped paragraph). Heuristic over the question's shape only;
   * the instruments translate it into a token budget.
   */
  private static _answerDepth(question: string): "standard" | "deep" {
    const q = question.trim();
    const analytical = /\b(explain|why|how does|how do|compare|contrast|describe|detail|elaborate|analy[sz]e|in depth|step[- ]by[- ]step|pros and cons|difference between|walk me through|teach me)\b/i;
    if (analytical.test(q)) return "deep";
    if (q.split(/\s+/).length >= 18) return "deep"; // a long, developed question
    return "standard";
  }

  private readonly _deps: MindBridgeDeps;
  private _onShutdown: (() => void) | null = null;
  private _attached = false;
  /** Live telemetry push: re-emits `state` on a cadence so the host panel's
   *  mind counters (ticks / thoughts / concepts) stay live between thoughts. */
  private _stateTimer: NodeJS.Timeout | null = null;

  constructor(deps: MindBridgeDeps) {
    this._deps = deps;
  }

  /** Emit one NDJSON frame to the host. Never throws — a dead pipe must not kill the mind. */
  private _emit(frame: Record<string, unknown>): void {
    try {
      process.stdout.write(JSON.stringify({ t: Date.now(), ...frame }) + "\n");
    } catch {
      /* host gone — the mind keeps living */
    }
  }

  /** Register the graceful-sleep callback (invoked on {type:"shutdown"}). */
  onShutdown(cb: () => void): void {
    this._onShutdown = cb;
  }

  /**
   * P6-E — teach one domain corpus. Returns the honest per-corpus verdict
   * (frames fed + measured mastery + learned flag). Throws if no curriculum
   * adapter is wired (the mind cannot be specialised without one). [SPEC]
   */
  teachCorpus(corpus: Corpus): CorpusResult {
    const curriculum = this._deps.curriculum;
    if (!curriculum) throw new Error("teachCorpus: no domain curriculum adapter wired");
    return curriculum.teach(corpus);
  }

  /** P6-E — teach a whole curriculum (several corpora), one verdict each. [SPEC] */
  teachCurriculum(corpora: readonly Corpus[]): CorpusResult[] {
    const curriculum = this._deps.curriculum;
    if (!curriculum) throw new Error("teachCurriculum: no domain curriculum adapter wired");
    return curriculum.teachAll(corpora);
  }

  /** P6-E — curriculum counters (corpora run, frames accepted/rejected). [SPEC] */
  curriculumStats(): ReturnType<DomainCurriculum["stats"]> | null {
    return this._deps.curriculum ? this._deps.curriculum.stats() : null;
  }

  /** Wrap the composed store's journal stream and open the stdin command channel. */
  attach(): void {
    if (this._attached) return;
    this._attached = true;
    const { store } = this._deps;

    const original = store.journal.bind(store);
    const emit = this._emit.bind(this);
    // Composition-time wrap of OUR OWN instance — v14 sources untouched.
    (store as { journal: typeof original }).journal = (entry) => {
      original(entry);
      if (FORWARDED_KINDS.has(entry.kind)) {
        emit({ type: "journal", kind: entry.kind, data: sanitize(entry.data) });
      }
    };

    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return;
      let msg: unknown;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        this._emit({ type: "error", where: "bridge.parse", message: "invalid JSON line" });
        return;
      }
      this._handle(msg);
    });
    rl.on("close", () => {
      // stdin closed = host gone → sleep gracefully (same as Ctrl+C).
      this._stopStatePush();
      if (this._onShutdown) this._onShutdown();
    });

    // Push live state so the host panel reflects the running mind without
    // polling. ~2 Hz is well under the cognitive cadence and costs one frame.
    this._stateTimer = setInterval(() => this.state(), 500);
    this._stateTimer.unref();

    this._emit({ type: "bridge", phase: "attached" });
  }

  private _stopStatePush(): void {
    if (this._stateTimer) {
      clearInterval(this._stateTimer);
      this._stateTimer = null;
    }
  }

  /** Current mind state, on demand. */
  state(): void {
    const { bus, loop, registry, lexicon, engine, instrument } = this._deps;
    this._emit({
      type: "state",
      ticks: loop.tickCount,
      stableThoughts: loop.stableThoughtCount,
      concepts: registry.size,
      bus: bus.stats(),
      // M7 — the language front: how many grounded words / relations it holds.
      ...(lexicon ? { lexicon: { words: lexicon.wordCount, relations: lexicon.relationCount } } : {}),
      // Auto-scaling: the depth the governor settled on + the measured tick cost.
      ...(engine ? { scaling: engine.get_scaling_telemetry() } : {}),
      // The active language instrument (which model is answering). Cached so the
      // push cadence never blocks on a live probe; refresh on instrument.get/set.
      ...(instrument ? { instrument: { active: instrument.active, ollamaModel: instrument.ollamaModel, kimiOn: instrument.kimiOn, answerSource: instrument.split.answerSource } } : {}),
      // P6-D — the learning-mode dial (EFFICIENT/TRAINING/REPLAY) so the panel
      // reflects the consolidation governor without polling.
      learningMode: loop.learningModeStats,
      // P6-E — curriculum counters (corpora run, frames accepted/rejected).
      ...(this._deps.curriculum ? { curriculum: this._deps.curriculum.stats() } : {}),
    });
  }

  /**
   * The grounded query pipeline (M3). Assemble the question's field, find the
   * mind's nearest learned concepts, and ask phi to phrase an answer over
   * THAT context plus any computed engine facts the host supplied.
   * Also feeds the question into the sensory stream (the mind hears it).
   */
  private async _answerQuery(id: string, text: string, facts: string): Promise<void> {
    const { registry, llm, bus, lexicon } = this._deps;
    try {
      const queryField = encodeText(text);
      // CORRELATE the question: route its words through label-grounded
      // recognition so it reinforces the concept it is ABOUT (the fix for
      // fragmentation), then let the mind hear it as a percept too.
      registry.observeText(text, "ava.query");
      // the mind hears the question too (same as chat — cognition is continuous)
      bus.push({
        source: "text.feed",
        timestamp: Date.now(),
        meta: { origin: "ava.query", excerpt: text.slice(0, 120) },
        field: queryField,
      });
      // TEXT-SIDE recognition (sound): nearestText measures the query's WORDS in
      // the phasor space where meaning separates (grounded word ≈ 1, unrelated
      // ≈ 0), taking the max with the 28-field resonance so no field-only match
      // is lost. The question is text, so recognise it as text.
      const matches = registry.nearestText(text, 3);
      // grounded concepts: deduped labels, resonance-floor filtered
      const seen = new Set<string>();
      const concepts = matches
        .filter((m) => m.resonance >= 0.1)
        .map((m) => ({ labels: [...m.concept.labels], resonance: m.resonance }))
        .filter((c) => {
          const key = c.labels.join("|");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

      // M4 — DICTIONARY FIRST: if a learned meaning covers the question at
      // recognition strength (resonance ≥ λ = φ⁻²), answer from the glossary
      // itself — no LLM call, no hallucination surface, instant recall.
      const glossary = this._deps.glossary;
      const topMatch = matches[0];
      // P1.3 — MARGIN RULE: in a tiny lexicon the top match can clear λ while
      // still being off-topic (a near-tie with the runner-up). Require the top
      // match to clearly WIN: resonance(top) − resonance(runner-up) ≥ φ⁻².
      const runnerUp = matches[1];
      const MARGIN = 0.3819660112501051; // φ⁻²
      const clearsMargin = !runnerUp || topMatch.resonance - runnerUp.resonance >= MARGIN;
      if (glossary && topMatch && topMatch.resonance >= 0.3819660112501051 && clearsMargin) {
        const learned = glossary.get(topMatch.concept.id);
          if (learned) {
            const spine = facts.trim().length > 0 ? `${facts.trim()}

` : "";
            // M7 — the language front enriches the dictionary answer with the
            // word's grounded relations + part of speech when it knows them.
            const word = topMatch.concept.labels[0] ?? "";
            const binding = lexicon && word.length > 0 ? lexicon.resolve(word) : null;
            const relTail =
              binding && binding.relations.length > 0
                ? ` [${binding.relations.slice(0, 4).map((r) => `${r.kind} ${r.to}`).join("; ")}]`
                : "";
            this._emit({
              type: "answer",
              id,
              text: `${spine}ψ (learned): ${learned.definition}${relTail}`,
              grounded: [...new Set(concepts.map((c) => c.labels[0] ?? "unnamed"))],
              source: "glossary",
              confidence: learned.confidence,
              ...(binding ? { pos: binding.pos, relations: binding.relations, wordMastery: { mastery: binding.mastery, verifications: binding.verifications, learned: binding.learned } } : {}),
              elapsedMs: 0,
            });
            return;
          }
      }

      // M6 — Hopfield prediction: the episode this question most strongly
      // reactivates, scored as GAIN vs the φ-prior (never a bare resonance —
      // a prediction is only meaningful against the baseline it must beat).
      let prediction: number | null = null;
      let predictionBaseline: number | null = null;
      const recall = this._deps.loop.episodes.retrieve(queryField);
      if (recall.ok) {
        predictionBaseline = 0.6180339887498949; // φ⁻¹ — the unconditioned prior
        prediction = recall.resonance - predictionBaseline;
      }
      // M6 — the mastery of the concept this question resolves to: the honest
      // "has the mind actually learned this" signal (verified, not accreted).
      const mastery = topMatch ? this._deps.registry.masteryOf(topMatch.concept.id) : null;

      // glossary context enriches the LLM prompt (learned meanings in play)
      const glossaryContext = glossary
        ? concepts
            .map((c, i) => {
              const entry = glossary.get(matches[i]!.concept.id);
              return entry ? `${c.labels[0]}: ${entry.definition}` : null;
            })
            .filter((x): x is string => x !== null)
            .join("\n")
        : "";
      const enrichedFacts = [facts, glossaryContext].filter((s) => s.trim().length > 0).join("\n\nLEARNED MEANINGS:\n");

      const out = await llm.answer(text, { engineFacts: enrichedFacts, concepts }, MindBridge._answerDepth(text));
      if (out.ok) {
        // FACT-SPINE assembly (measured necessity, Gate M3): the deterministic
        // facts are ALWAYS the core of the answer; phi's sentence rides along
        // as clearly-labelled commentary. Hallucination is now structurally
        // impossible in the spine.
        let commentary = out.value;
        let verification: string | null = null;
        let certificate = 0;

        // M5 — OUTPUT STABILIZATION, certificate 1 (resonance): the commentary
        // must resonate with the question it claims to answer. One retry on
        // failure, then honest spine-only silence (measured, never assumed).
        certificate = resonance(encodeText(commentary), queryField);
        if (certificate < MindBridge.ANSWER_RESONANCE_FLOOR) {
          const retry = await llm.answer(text, { engineFacts: enrichedFacts, concepts }, MindBridge._answerDepth(text));
          if (retry.ok) {
            const c2 = resonance(encodeText(retry.value), queryField);
            if (c2 > certificate) {
              commentary = retry.value;
              certificate = c2;
            }
          }
        }
        const resonanceOk = certificate >= MindBridge.ANSWER_RESONANCE_FLOOR;

        // M5 — certificate 2 (numeric truth): any digits in the commentary are
        // checked by mathstral against the REAL facts. An invalid verdict
        // drops the commentary — numbers are never trusted from a 3B model.
        if (resonanceOk && /\d/.test(commentary)) {
          const claim = `Claim: ${commentary}\nFacts: ${facts || "(none)"}`;
          const v = await llm.verifyStructure(claim);
          if (v.ok) {
            verification = v.value.verdict;
            if (v.value.verdict === "invalid") {
              this._emit({
                type: "answer",
                id,
                text: facts.trim().length > 0
                  ? `${facts.trim()}\n\nψ: (commentary suppressed — mathstral invalidated its numerics: ${v.value.reasoning ?? "no numbers match the facts"})`
                  : `ψ: (I cannot give a verified answer to that yet — my commentary failed numeric verification)`,
                grounded: [...new Set(concepts.map((c) => c.labels[0] ?? "unnamed"))],
                source: "verified-suppressed",
                certificate,
                verification,
                prediction,
                predictionBaseline,
                mastery,
                elapsedMs: out.elapsedMs,
              });
              return;
            }
          }
        }

        const spine = facts.trim().length > 0 ? facts.trim() : "";
        const body = resonanceOk
          ? commentary
          : `(my phrasing didn't stabilize — here is only what I can verify)`;
        const answerText = spine.length > 0 ? `${spine}\n\nψ: ${body}` : `ψ: ${body}`;
        const grounded = [...new Set(concepts.map((c) => c.labels[0] ?? "unnamed"))];
        this._emit({
          type: "answer",
          id,
          text: answerText,
          commentary: resonanceOk ? commentary : null,
          grounded,
          source: "llm",
          certificate,
          verification,
          prediction,
          predictionBaseline,
          mastery,
          elapsedMs: out.elapsedMs,
        });
      } else {
        this._emit({ type: "answer", id, text: null, reason: out.reason, elapsedMs: out.elapsedMs });
      }
    } catch (err) {
      this._emit({ type: "answer", id, text: null, reason: String(err instanceof Error ? err.message : err) });
    }
  }

  /**
   * The switchable language instrument (M9). `instrument.get` replies with the
   * full honest availability snapshot (which instruments are reachable, which
   * Ollama models are installed); `instrument.set` switches the active
   * instrument / Ollama model and replies with the result. Both replies are
   * id-keyed so the host can await them like a query. Rejections are honest:
   * an unreachable instrument or an uninstalled model returns ok:false with
   * the reason, and the active instrument is left untouched.
   */
  private async _handleInstrument(id: string, o: Record<string, unknown>): Promise<void> {
    const instrument = this._deps.instrument;
    if (!instrument) {
      this._emit({ type: "instrument", id, ok: false, reason: "no switchable instrument attached (single-instrument boot)" });
      return;
    }
    try {
      if (o["type"] === "instrument.get") {
        const status = await instrument.availability();
        this._emit({ type: "instrument", id, ok: true, ...status });
        return;
      }
      // k3.setKey — { apiKey: string }. Runtime K3 key entry, no restart. The
      // token is a secret: it is never re-emitted (the reply carries only the
      // availability snapshot, whose k3 entry reports the key via `available`).
      if (o["type"] === "k3.setKey") {
        const apiKey = typeof o["apiKey"] === "string" ? o["apiKey"] : "";
        const result = await instrument.setK3Key(apiKey);
        if (!result.ok) {
          this._emit({ type: "instrument", id, ok: false, reason: result.reason });
          return;
        }
        this._emit({ type: "instrument", id, ok: true, ...result.status });
        return;
      }
      // ollama.set — { enabled: boolean }. The Ollama off-switch: flip the
      // router's flag, then COLD stop/start the process to honour it. Stop frees
      // the model memory; start re-runs ensureRunning + warm (a real cold start
      // — no keep-warm). The router flag is the source of truth.
      if (o["type"] === "ollama.set") {
        const enabled = o["enabled"] === true;
        const result = await instrument.setOllamaEnabled(enabled);
        if (!result.ok) {
          this._emit({ type: "instrument", id, ok: false, reason: result.reason });
          return;
        }
        await this._applyOllamaPower(enabled);
        this._emit({ type: "instrument", id, ok: true, ...(await instrument.availability()) });
        return;
      }
      // k3.set — { enabled: boolean }. THE KIMI TOGGLE (M10). ON → Kimi answers the
      // human-facing answer() path over the brain's measured layers while Ollama
      // keeps every thought method (name/define/relate/verify/lexical/voice);
      // OFF → Ollama answers too. Pure routing — Ollama never stops either way.
      // Honest: ON is rejected when no K3 key can serve.
      if (o["type"] === "k3.set") {
        const enabled = o["enabled"] === true;
        const result = await instrument.setKimiOn(enabled);
        if (!result.ok) {
          this._emit({ type: "instrument", id, ok: false, reason: result.reason });
          return;
        }
        this._emit({ type: "instrument", id, ok: true, ...(await instrument.availability()) });
        return;
      }
      // instrument.set — { instrument: "ollama"|"k3", model?: string }
      const target = o["instrument"];
      if (target !== "ollama" && target !== "k3") {
        this._emit({ type: "instrument", id, ok: false, reason: `instrument must be "ollama" or "k3", got ${JSON.stringify(target)}` });
        return;
      }
      const model = typeof o["model"] === "string" && o["model"].length > 0 ? o["model"] : undefined;
      const result = await instrument.setInstrument(target as InstrumentId, model);
      if (!result.ok) {
        this._emit({ type: "instrument", id, ok: false, reason: result.reason });
        return;
      }
      this._emit({ type: "instrument", id, ok: true, ...result.status });
    } catch (err) {
      this._emit({ type: "instrument", id, ok: false, reason: String(err instanceof Error ? err.message : err) });
    }
  }

  /**
   * Honour the Ollama off-switch at the PROCESS level. OFF → cold stop: kill the
   * supervised `ollama serve` so the model memory is actually released (no
   * keep-warm). ON → cold start: ensureRunning() then warm the language model so
   * the next real call is not ice-cold. Best-effort and honest — a spawn/probe
   * failure leaves the router reporting unavailable, which is the truthful state.
   */
  private async _applyOllamaPower(enabled: boolean): Promise<void> {
    const supervisor = this._deps.supervisor;
    if (!supervisor) return; // single-instrument boot: nothing to power-cycle
    try {
      if (!enabled) {
        supervisor.stop();
        return;
      }
      const status = await supervisor.ensureRunning();
      if (status.running) {
        await supervisor.warmModels();
      }
    } catch {
      // A failed cold start is reported by the next availability() probe — the
      // router never claims a server it cannot reach.
    }
  }

  /**
   * The operator's force-depth override (Phase 4). Validates the request,
   * applies it to the engine, and replies with the live scaling snapshot so
   * the host can re-render. {depth: n} pins the shrink floor to n; {depth:
   * null} releases the override back to the governor's measured auto-scale.
   * Honest: an engine that isn't attached, or a depth out of range, replies
   * ok:false with the reason and leaves the current depth untouched.
   */
  private async _handleScaling(id: string, o: Record<string, unknown>): Promise<void> {
    const engine = this._deps.engine;
    if (!engine) {
      this._emit({ type: "scaling.set", id, ok: false, reason: "no engine attached" });
      return;
    }
    try {
      const raw = o["depth"];
      // null/undefined releases the override (auto); a finite number pins it.
      const depth = raw === null || raw === undefined ? null : Number(raw);
      if (depth !== null && (!Number.isInteger(depth) || depth < 1 || depth > 9)) {
        this._emit({ type: "scaling.set", id, ok: false, reason: `depth must be an integer in [1,9] or null, got ${JSON.stringify(raw)}` });
        return;
      }
      await engine.set_force_depth(depth);
      const scaling = engine.get_scaling_telemetry();
      this._emit({ type: "scaling.set", id, ok: true, depth, scaling });
      // Push a full state frame so every open panel re-renders immediately.
      this.state();
    } catch (err) {
      this._emit({ type: "scaling.set", id, ok: false, reason: String(err instanceof Error ? err.message : err) });
    }
  }

  /**
   * P6-D — the operator's learning-mode override. {mode: "EFFICIENT"|"TRAINING"|
   * "REPLAY"} flips the consolidation governor; the loop journals mode.change.
   * Honest: an unknown mode replies ok:false and leaves the current mode set.
   */
  private _handleMode(id: string, o: Record<string, unknown>): void {
    const loop = this._deps.loop;
    const raw = o["mode"];
    if (raw !== "EFFICIENT" && raw !== "TRAINING" && raw !== "REPLAY") {
      this._emit({ type: "mode.set", id, ok: false, reason: `mode must be EFFICIENT|TRAINING|REPLAY, got ${JSON.stringify(raw)}` });
      return;
    }
    loop.setLearningMode(raw);
    this._emit({ type: "mode.set", id, ok: true, ...loop.learningModeStats });
    // Push a full state frame so every open panel re-renders immediately.
    this.state();
  }

  /**
   * P6-E — teach one domain corpus through the curriculum adapter. {corpus} is
   * validated structurally (name + probes[] + items[]); the adapter does the
   * codec + bus + mastery measurement. Replies with the honest verdict. [SPEC]
   */
  private _handleTeach(id: string, o: Record<string, unknown>): void {
    const curriculum = this._deps.curriculum;
    if (!curriculum) {
      this._emit({ type: "teach.corpus", id, ok: false, reason: "no domain curriculum adapter wired" });
      return;
    }
    const corpus = o["corpus"];
    if (typeof corpus !== "object" || corpus === null) {
      this._emit({ type: "teach.corpus", id, ok: false, reason: "teach.corpus requires a corpus object" });
      return;
    }
    const c = corpus as Partial<Corpus>;
    if (typeof c.name !== "string" || !Array.isArray(c.probes) || !Array.isArray(c.items)) {
      this._emit({ type: "teach.corpus", id, ok: false, reason: "corpus needs name:string, probes:[], items:[]" });
      return;
    }
    try {
      const result = curriculum.teach(c as Corpus);
      this._emit({ type: "teach.corpus", id, ok: true, result });
      this.state(); // curriculum counters changed — re-render panels
    } catch (err) {
      this._emit({ type: "teach.corpus", id, ok: false, reason: String(err instanceof Error ? err.message : err) });
    }
  }

  private _handle(msg: unknown): void {
    if (typeof msg !== "object" || msg === null) {
      this._emit({ type: "error", where: "bridge.shape", message: "frame is not an object" });
      return;
    }
    const o = msg as Record<string, unknown>;
    const { bus } = this._deps;
    switch (o["type"]) {
      case "chat": {
        if (typeof o["text"] !== "string" || o["text"].trim().length === 0) {
          this._emit({ type: "error", where: "bridge.chat", message: "chat.text must be non-empty" });
          return;
        }
        try {
          // CORRELATE first: route the whole message through label-grounded
          // recognition so repeated words reinforce ONE concept (the fix for
          // the "doesn't correlate" fragmentation), then feed the percept.
          this._deps.registry.observeText(o["text"], "ava.chat");
          // M5 — INPUT STABILIZATION: long messages arrive as sentence-aware
          // 144-char chunks (the text_feed discipline), not one overloaded field.
          const parts = chunkText(o["text"].slice(0, 2000), 144).slice(0, 21);
          let acceptedAll = true;
          for (let i = 0; i < parts.length; i++) {
            const field = encodeText(parts[i]!);
            const accepted = bus.push({
              source: "text.feed",
              timestamp: Date.now(),
              meta: {
                origin: "ava.chat",
                excerpt: parts[i]!.slice(0, 120),
                ...(parts.length > 1 ? { part: `${i + 1}/${parts.length}` } : {}),
              },
              field,
            });
            acceptedAll = acceptedAll && accepted;
          }
          this._emit({ type: "chat.ack", accepted: acceptedAll, parts: parts.length, bus: bus.stats() });
        } catch (err) {
          this._emit({ type: "error", where: "bridge.chat", message: String(err instanceof Error ? err.message : err) });
        }
        return;
      }
      case "sensor.audio":
      case "sensor.vision": {
        const fieldRaw = o["field"];
        if (!Array.isArray(fieldRaw) || fieldRaw.length !== 28 || !fieldRaw.every((v) => Number.isFinite(v))) {
          this._emit({ type: "error", where: "bridge.sensor", message: "field must be 28 finite numbers" });
          return;
        }
        const isAudio = o["type"] === "sensor.audio";
        const accepted = bus.push({
          source: isAudio ? "audio.mic" : "vision.screen",
          timestamp: Date.now(),
          meta: {
            origin: isAudio ? "ava.mic" : "ava.camera",
            ...(typeof o["energy"] === "number" ? { energy: String(o["energy"]) } : {}),
            ...(typeof o["mean"] === "number" ? { mean: String(o["mean"]) } : {}),
          },
          field: Float64Array.from(fieldRaw as number[]),
        });
        if (!accepted) {
          this._emit({ type: "error", where: "bridge.sensor", message: bus.lastRejectReason ?? "frame rejected" });
        }
        return;
      }
      case "state":
        this.state();
        return;
      case "instrument.get":
      case "instrument.set":
      case "ollama.set":
      case "k3.set":
      case "k3.setKey": {
        // M9/M10 — the switchable instrument + the Ollama off-switch + the Kimi
        // toggle + the K3 runtime key. id-keyed replies, awaited by the host.
        const iid = typeof o["id"] === "string" ? o["id"] : "inst";
        void this._handleInstrument(iid, o);
        return;
      }
      case "scaling.set": {
        // The operator's force-depth override (Phase 4). {depth: n} pins the
        // governor's shrink floor; {depth: null} releases it to auto. id-keyed.
        const sid = typeof o["id"] === "string" ? o["id"] : "scale";
        void this._handleScaling(sid, o);
        return;
      }
      case "mode.set": {
        // P6-D — the learning-mode dial. {mode} flips the consolidation
        // governor (EFFICIENT/TRAINING/REPLAY); id-keyed, journaled mode.change.
        const mid = typeof o["id"] === "string" ? o["id"] : "mode";
        this._handleMode(mid, o);
        return;
      }
      case "teach.corpus": {
        // P6-E — feed one domain corpus (business doc / software UI / operator
        // instruction) through the curriculum; id-keyed honest verdict.
        const tid = typeof o["id"] === "string" ? o["id"] : "teach";
        this._handleTeach(tid, o);
        return;
      }
      case "query": {
        // M3 — the grounded-answer path: phi phrases REAL context (engine
        // facts + learned concepts at the question's own resonance), never
        // invents it. Synchronous: one answer frame per query id.
        if (typeof o["text"] !== "string" || o["text"].trim().length === 0) {
          this._emit({ type: "error", where: "bridge.query", message: "query.text must be non-empty" });
          return;
        }
        const id = typeof o["id"] === "string" ? o["id"] : "q";
        void this._answerQuery(id, o["text"].slice(0, 1000), typeof o["facts"] === "string" ? o["facts"].slice(0, 1500) : "");
        return;
      }
      case "shutdown":
        this._emit({ type: "bridge", phase: "sleep-requested" });
        if (this._onShutdown) this._onShutdown();
        return;
      default:
        this._emit({ type: "error", where: "bridge.type", message: `unknown frame type "${String(o["type"])}"` });
    }
  }
}

/** Journal data may contain Float64Arrays/BigInts — make it JSON-safe. */
function sanitize(data: unknown): unknown {
  if (data instanceof Float64Array) return { field28: Array.from(data.slice(0, 4)), len: data.length };
  if (typeof data === "bigint") return data.toString();
  if (Array.isArray(data)) return data.map(sanitize);
  if (typeof data === "object" && data !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) out[k] = sanitize(v);
    return out;
  }
  return data;
}
