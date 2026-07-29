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

export interface MindBridgeDeps {
  readonly bus: SensorBus;
  readonly store: MemoryStore;
  readonly loop: CognitiveLoop;
  readonly registry: ConceptRegistry;
  readonly llm: import("./llm_tool.ts").LlmTool;
  readonly glossary?: import("./../cognition/glossary.ts").ConceptGlossary;
}

/** The subset of journal kinds forwarded to the host (the rest is noise). */
const FORWARDED_KINDS = new Set(["boot", "thought", "voice", "tool.fail", "error"]);

export class MindBridge {
  /** M5 — minimum resonance between an emitted commentary and its question. */
  static readonly ANSWER_RESONANCE_FLOOR = 0.05;

  private readonly _deps: MindBridgeDeps;
  private _onShutdown: (() => void) | null = null;
  private _attached = false;

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
      if (this._onShutdown) this._onShutdown();
    });

    this._emit({ type: "bridge", phase: "attached" });
  }

  /** Current mind state, on demand. */
  state(): void {
    const { bus, loop, registry } = this._deps;
    this._emit({
      type: "state",
      ticks: loop.tickCount,
      stableThoughts: loop.stableThoughtCount,
      concepts: registry.size,
      bus: bus.stats(),
    });
  }

  /**
   * The grounded query pipeline (M3). Assemble the question's field, find the
   * mind's nearest learned concepts, and ask phi to phrase an answer over
   * THAT context plus any computed engine facts the host supplied.
   * Also feeds the question into the sensory stream (the mind hears it).
   */
  private async _answerQuery(id: string, text: string, facts: string): Promise<void> {
    const { registry, llm, bus } = this._deps;
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
      const matches = registry.nearest(queryField, 3);
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
          const spine = facts.trim().length > 0 ? `${facts.trim()}\n\n` : "";
          this._emit({
            type: "answer",
            id,
            text: `${spine}ψ (learned): ${learned.definition}`,
            grounded: [...new Set(concepts.map((c) => c.labels[0] ?? "unnamed"))],
            source: "glossary",
            confidence: learned.confidence,
            elapsedMs: 0,
          });
          return;
        }
      }

      // M4 — Hopfield prediction: the episode this question most strongly
      // reactivates (one-step modern-Hopfield recall, previously telemetry).
      let prediction: number | null = null;
      const recall = this._deps.loop.episodes.retrieve(queryField);
      if (recall.ok) prediction = recall.resonance;

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

      const out = await llm.answer(text, { engineFacts: enrichedFacts, concepts });
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
          const retry = await llm.answer(text, { engineFacts: enrichedFacts, concepts });
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
          elapsedMs: out.elapsedMs,
        });
      } else {
        this._emit({ type: "answer", id, text: null, reason: out.reason, elapsedMs: out.elapsedMs });
      }
    } catch (err) {
      this._emit({ type: "answer", id, text: null, reason: String(err instanceof Error ? err.message : err) });
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
      case "query": {
        // M3 — the grounded-answer path: phi phrases REAL context (engine
        // facts + learned concepts at the question's own resonance), never
        // invents it. Synchronous: one answer frame per query id.
        if (typeof o["text"] !== "string" || o["text"].trim().length === 0) {
          this._emit({ type: "error", where: "bridge.query", message: "query.text must be non-empty" });
          return;
        }
        const id = typeof o["id"] === "string" ? o["id"] : "q";
        void this._answerQuery(id, o["text"].slice(0, 500), typeof o["facts"] === "string" ? o["facts"].slice(0, 1500) : "");
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
