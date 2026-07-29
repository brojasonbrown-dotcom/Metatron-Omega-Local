/**
 * RHUFT Mind — Cognitive Loop: the mind itself
 *
 * Epistemic Status: [SPEC] + [PHIL] — Cognition layer. Endless, unattended.
 *
 * Per tick (≈146 ms ≈ 1000/φ⁴ [SPEC]):
 *   1. SENSE     — drain ≤ 5 validated frames from the SensorBus into
 *                  engine.process() (the sole sanctioned external-input door).
 *                  Idle ticks still call engine.tick() — the mind never stops.
 *   2. DETECT    — ExistenceDetector.evaluate(root, prevRoot, boundary);
 *                  `exists` sustained ≥ 3 ticks → a stable Thought is born.
 *   3. RECOGNIZE — thought field vs ConceptRegistry by resonance: known →
 *                  reinforce prototype; unknown → new concept + curiosity.
 *   4. ACT       — DriveArbiter picks name/define/relate/verify; the LLMs are
 *                  invoked as instruments (single in-flight per model). Every
 *                  validated answer is re-encoded and pushed back through the
 *                  SensorBus as "llm.answer" — the memories PHYSICALLY learn it.
 *   5. VOICE     — every stable thought is phrased by phi and spoken.
 *   6. PERSIST   — snapshot every 13 stable thoughts + every 987 ticks. [SPEC]
 *
 * Safety rails: the tick body is fully try/caught (an error is journaled and
 * the loop continues); ticks are chained with setTimeout (never overlap);
 * LLM work runs off-loop with a bounded thought queue.
 */

import { encodeText } from "./../adapters/language_codec.ts";
import { createHash } from "node:crypto";
import type { LlmTool } from "./../adapters/llm_tool.ts";
import type { SensorBus } from "./../adapters/sensors/sensor_bus.ts";
import type { VoiceOut } from "./../adapters/voice_out.ts";
import { ExistenceDetector, type ExistenceScore } from "./../existence_detector.ts";
import type { FractalNodeEngine } from "./../fractal_node_engine.ts";
import type { ConceptRegistry, ObserveResult } from "./concept_registry.ts";
import { DriveArbiter, type DriveState, type MindAction } from "./drive_arbiter.ts";
import { HopfieldMemory } from "./hopfield.ts";
import type { MemoryStore } from "./memory_store.ts";
import { ThoughtTracker, type Thought } from "./thought.ts";
import type { ConceptGlossary } from "./glossary.ts";

/** Tick period: 1000/φ⁴ ≈ 146 ms. [SPEC] */
export const TICK_MS = 146;

/** Max sensory frames processed per tick: F_5 = 5. [SPEC] */
const MAX_FRAMES_PER_TICK = 5;

/** Snapshot every N stable thoughts: F_7 = 13. [SPEC] */
const SNAPSHOT_EVERY_THOUGHTS = 13;

/** Snapshot every N ticks regardless: F_16 = 987 (≈ 2.4 min). [SPEC] */
const SNAPSHOT_EVERY_TICKS = 987;

/** Pending thoughts awaiting the phi instrument: max F_4 = 3, oldest dropped. [SPEC] */
const MAX_THOUGHT_QUEUE = 3;

export interface CognitiveLoopDeps {
  readonly engine: FractalNodeEngine;
  readonly bus: SensorBus;
  readonly registry: ConceptRegistry;
  readonly store: MemoryStore;
  readonly llm: LlmTool;
  readonly voice: VoiceOut;
  /** M4 — dictionary-quality memory. Optional: run_mind.ts needs no change. */
  readonly glossary?: ConceptGlossary;
}

export class CognitiveLoop {
  private readonly _deps: CognitiveLoopDeps;
  private readonly _arbiter = new DriveArbiter();
  private readonly _tracker = new ThoughtTracker();
  /**
   * Associative episodic memory: high-capacity modern-Hopfield bank retaining
   * distinct stable-thought attractors (complementary to the registry's averaged
   * prototypes). Enables one-step recall of a stored episode from a partial cue. [MATH]
   */
  private readonly _episodes = new HopfieldMemory();

  private _running = false;
  private _timer: NodeJS.Timeout | null = null;
  private _tickCount = 0;
  private _stableThoughtCount: number;
  private _prevRootField: Float64Array | null = null;
  private _boundaryField: Float64Array | null = null;

  private _phiBusy = false;
  private _mathstralBusy = false;
  private readonly _thoughtQueue: Array<{ thought: Thought; obs: ObserveResult; action: MindAction; drives: DriveState }> = [];

  constructor(deps: CognitiveLoopDeps, restoredStableThoughtCount: number = 0) {
    this._deps = deps;
    this._stableThoughtCount = restoredStableThoughtCount;
  }

  get stableThoughtCount(): number {
    return this._stableThoughtCount;
  }

  /**
   * M4 — read access to the episodic Hopfield bank (predictive recall).
   * The association was telemetry-only; the bridge now uses it as a genuine
   * prediction cue for grounded answers.
   */
  get episodes(): HopfieldMemory {
    return this._episodes;
  }

  get tickCount(): number {
    return this._tickCount;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._scheduleNext();
  }

  stop(): void {
    this._running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._snapshot("stop");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // The tick — sense → detect → recognize → act → persist
  // ───────────────────────────────────────────────────────────────────────────

  private _scheduleNext(): void {
    if (!this._running) return;
    this._timer = setTimeout(() => {
      this._tick();
      this._scheduleNext();
    }, TICK_MS);
    this._timer.unref();
  }

  /** One full cognitive tick. NEVER throws — errors are journaled. [SPEC] */
  private _tick(): void {
    try {
      this._tickCount++;
      const { engine, bus, store } = this._deps;

      // 1. SENSE — validated frames through the sanctioned door.
      const frames = bus.drain(MAX_FRAMES_PER_TICK);
      for (const frame of frames) {
        engine.process(frame.field);
        this._tracker.noteSource(frame.source);
        this._boundaryField = frame.field;
        store.journal({
          t: Date.now(),
          kind: "sense",
          data: { source: frame.source, meta: frame.meta },
        });
      }
      if (frames.length === 0) {
        engine.tick(); // the mind never stops ticking
      }

      // 2. DETECT — existence of the root field.
      const root = engine.get_state().root_node.state.field_state;
      const boundary = this._boundaryField ?? root;
      const score = ExistenceDetector.evaluate(root, this._prevRootField, boundary);
      const drives = this._arbiter.tick(root, this._prevRootField, score);
      const thought = this._tracker.observe(root, score, this._tickCount);
      this._prevRootField = new Float64Array(root);

      // 3-5. RECOGNIZE + ACT + VOICE on a newborn stable thought.
      if (thought) {
        this._onStableThought(thought, score, drives);
      }

      // 6. PERSIST on tick cadence.
      if (this._tickCount % SNAPSHOT_EVERY_TICKS === 0) {
        this._snapshot("tick-cadence");
      }
    } catch (err) {
      // Watchdog: journal and keep living. [SPEC]
      this._deps.store.journal({
        t: Date.now(),
        kind: "error",
        data: { where: "cognitive_loop.tick", error: String(err) },
      });
    }
  }

  private _onStableThought(thought: Thought, score: ExistenceScore, drives: DriveState): void {
    const { registry, store } = this._deps;
    this._stableThoughtCount++;

    // RECOGNIZE by resonance.
    const obs = registry.observe(
      thought.field,
      [],
      `thought:${thought.sources.join("+") || "internal"}`
    );
    thought.labels = [...obs.concept.labels];

    // EPISODIC: retain the distinct attractor and recall what it echoes. [MATH]
    this._episodes.store(thought.field);
    const association = this._episodes.retrieve(thought.field);

    store.journal({
      t: Date.now(),
      kind: "thought",
      data: {
        id: thought.id,
        tick: thought.bornTick,
        stableCount: this._stableThoughtCount,
        concept: obs.concept.id,
        isNew: obs.isNew,
        resonance: obs.resonance,
        labels: thought.labels,
        sources: thought.sources,
        // Associative recall: the stored episode this thought most strongly
        // reactivates, and its resonance — the mind noticing a rhyme across time.
        association: association.ok ? association.resonance : null,
        scores: {
          signal: score.signalScore,
          persistence: score.persistenceScore,
          coherence: score.coherenceScore,
          relation: score.relationScore,
        },
        drives,
      },
    });

    // DECIDE.
    const action = this._arbiter.chooseAction(
      {
        known: !obs.isNew,
        topResonance: obs.resonance,
        reinforcement: obs.concept.reinforcement,
        labelCount: obs.concept.labels.length,
      },
      this._stableThoughtCount,
      this._totalReinforcement()
    );

    // ACT + VOICE off-loop (phi is a single-in-flight instrument).
    this._enqueueThoughtWork(thought, obs, action, drives);

    // PERSIST on thought cadence.
    if (this._stableThoughtCount % SNAPSHOT_EVERY_THOUGHTS === 0) {
      this._snapshot("thought-cadence");
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Tool work — LLMs as instruments, one in flight per model
  // ───────────────────────────────────────────────────────────────────────────

  private _enqueueThoughtWork(
    thought: Thought,
    obs: ObserveResult,
    action: MindAction,
    drives: DriveState
  ): void {
    this._thoughtQueue.push({ thought, obs, action, drives });
    if (this._thoughtQueue.length > MAX_THOUGHT_QUEUE) {
      const dropped = this._thoughtQueue.shift();
      if (dropped) {
        this._deps.store.journal({
          t: Date.now(),
          kind: "tool.fail",
          data: { thought: dropped.thought.id, reason: "thought queue full — dropped oldest" },
        });
      }
    }
    void this._drainPhiQueue();
  }

  private async _drainPhiQueue(): Promise<void> {
    if (this._phiBusy) return;
    this._phiBusy = true;
    try {
      while (this._thoughtQueue.length > 0) {
        const item = this._thoughtQueue.shift();
        if (!item) break;
        await this._workThought(item.thought, item.obs, item.action, item.drives);
      }
    } finally {
      this._phiBusy = false;
    }
  }

  private async _workThought(
    thought: Thought,
    obs: ObserveResult,
    action: MindAction,
    drives: DriveState
  ): Promise<void> {
    const { llm, store, voice } = this._deps;

    // VOICE — every stable thought is spoken. [SPEC]
    const phrased = await llm.phrase(thought.labels, {
      curiosity: drives.curiosity,
      coherence: thought.score.coherenceScore,
    });
    if (phrased.ok) {
      thought.spokenText = phrased.value;
      thought.phase = "voiced";
      voice.speak(phrased.value, { thought: thought.id, concept: obs.concept.id });
    } else {
      store.journal({
        t: Date.now(),
        kind: "tool.fail",
        data: { tool: "phrase", thought: thought.id, reason: phrased.reason },
      });
    }

    // ACT — the drive-chosen instrument.
    switch (action) {
      case "name":
        await this._actName(thought, obs);
        break;
      case "define":
        await this._actDefine(thought, obs);
        break;
      case "relate":
        await this._actRelate(thought, obs);
        break;
      case "verify":
        void this._actVerify(thought); // mathstral has its own in-flight guard
        break;
      case "none":
        break;
    }
  }

  /**
   * P1 — perceptual grounding for the naming path.
   *
   * The dog/cat poison (journal t=1785240418285) happened because `nameThis` was
   * handed ONLY abstract scores and a 3B model, asked to name a perception from
   * bare numbers, invented concrete objects. That is now structurally impossible:
   *
   *  - A thought carries `sources`. Real perceptual content means an actual
   *    external feed reached the engine (vision.*, audio.*, text.feed). The
   *    "llm.answer" source is the mind's OWN prior output fed back — it is NOT
   *    new perceptual content, and an empty source list is pure internal dynamics.
   *  - With no real perceptual source we do NOT call the LLM and do NOT mint a
   *    label. The thought stays honestly "unnamed".
   *  - With a real source we still describe the MEASURED structure (dominant
   *    φ-band energies of the thought field + the source types), never a prompt
   *    that invites object invention, and we stamp a provenance hash so every
   *    minted name is traceable to the exact field+sources that produced it.
   */

  /** Real external perceptual sources (everything except the llm.answer echo). */
  private static readonly _PERCEPTUAL_SOURCES = new Set([
    "vision.screen",
    "vision.file",
    "audio.mic",
    "audio.file",
    "text.feed",
  ]);

  /** True iff the thought was born from at least one real external percept. */
  private _hasPerceptualGrounding(thought: Thought): boolean {
    return thought.sources.some((s) => CognitiveLoop._PERCEPTUAL_SOURCES.has(s));
  }

  /**
   * Build a measured-structure description from the thought field's dominant
   * φ-band energies. The field is 28 interleaved-complex = 14 modes; we report
   * the top modal energies and the real source types. This is structure the
   * engine actually measured — it names WHAT was sensed, not an invented object.
   */
  private _describePerceptStructure(thought: Thought): string {
    const f = thought.field;
    const modes: number[] = [];
    for (let k = 0; k + 1 < f.length; k += 2) {
      modes.push(f[k] * f[k] + f[k + 1] * f[k + 1]); // |mode_k|²
    }
    const total = modes.reduce((a, b) => a + b, 0) || 1;
    const ranked = modes
      .map((e, k) => ({ k, frac: e / total }))
      .sort((a, b) => b.frac - a.frac)
      .slice(0, 3);
    const bandStr = ranked.map((m) => `band${m.k}=${(m.frac * 100).toFixed(0)}%`).join(", ");
    const srcStr = thought.sources.filter((s) => CognitiveLoop._PERCEPTUAL_SOURCES.has(s)).join(", ");
    return `measured field structure (dominant φ-bands: ${bandStr}); sensed via [${srcStr}]`;
  }

  /** A6 — provenance hash: traceable to field structure + sources + labels. */
  private _provenanceHash(thought: Thought, labels: readonly string[]): string {
    const h = createHash("sha1");
    h.update(thought.id);
    h.update("|");
    h.update(thought.sources.join(","));
    h.update("|");
    for (let i = 0; i < thought.field.length; i++) h.update(String(thought.field[i].toFixed(6)));
    h.update("|");
    h.update(labels.join(","));
    return h.digest("hex").slice(0, 16);
  }

  /** Unknown percept → phi proposes labels → concept named + learned. */
  private async _actName(thought: Thought, obs: ObserveResult): Promise<void> {
    const { llm, registry, store } = this._deps;

    // P1 GATE — no perceptual grounding → no naming. Never a label from scores.
    if (!this._hasPerceptualGrounding(thought)) {
      store.journal({
        t: Date.now(),
        kind: "name.suppressed",
        data: {
          tool: "nameThis",
          thought: thought.id,
          reason: "no perceptual content — sources are internal/echo only",
          sources: thought.sources,
        },
      });
      return;
    }

    const description = this._describePerceptStructure(thought);

    store.journal({ t: Date.now(), kind: "tool.call", data: { tool: "nameThis", thought: thought.id } });
    const out = await llm.nameThis(description);
    if (!out.ok) {
      store.journal({
        t: Date.now(),
        kind: "tool.fail",
        data: { tool: "nameThis", thought: thought.id, reason: out.reason },
      });
      return;
    }

    const provenance = this._provenanceHash(thought, out.value.labels);
    registry.addLabels(obs.concept.id, out.value.labels, "llm.nameThis");
    // Symbol grounding: fuse each label's word-geometry into the concept so the
    // percept and its name become one attractor. [PHIL]
    for (const label of out.value.labels) registry.bindLabel(obs.concept.id, label);
    thought.labels = [...out.value.labels];
    store.journal({
      t: Date.now(),
      kind: "tool.ok",
      data: {
        tool: "nameThis",
        thought: thought.id,
        labels: out.value.labels,
        confidence: out.value.confidence,
        elapsedMs: out.elapsedMs,
        provenance, // A6 — every minted name is traceable to its measured field.
        grounded: true,
      },
    });
    this._learnText(out.value.labels.join(" "), "nameThis", thought.id);
  }

  /** Known-but-shallow concept → phi defines its first label → learned. */
  private async _actDefine(thought: Thought, obs: ObserveResult): Promise<void> {
    const { llm, registry, store } = this._deps;
    const word = obs.concept.labels[0];
    if (!word) {
      // A concept with no labels cannot be defined — name it instead.
      await this._actName(thought, obs);
      return;
    }

    store.journal({ t: Date.now(), kind: "tool.call", data: { tool: "define", word, thought: thought.id } });
    const out = await llm.define(word);
    if (!out.ok) {
      store.journal({
        t: Date.now(),
        kind: "tool.fail",
        data: { tool: "define", word, thought: thought.id, reason: out.reason },
      });
      return;
    }

    registry.addLabels(obs.concept.id, out.value.related, "llm.define");
    // Bind the defined word + its related words into the concept's geometry. [PHIL]
    registry.bindLabel(obs.concept.id, word);
    for (const rel of out.value.related) registry.bindLabel(obs.concept.id, rel);
    // M4 — persist the MEANING in the glossary (dictionary, not just journal).
    this._deps.glossary?.learn({
      conceptId: obs.concept.id,
      definition: out.value.definition,
      related: [word, ...out.value.related],
      source: "define",
      confidence: 0.5,
    });
    store.journal({
      t: Date.now(),
      kind: "tool.ok",
      data: { tool: "define", word, definition: out.value.definition, related: out.value.related, elapsedMs: out.elapsedMs },
    });
    this._learnText(out.value.definition, "define", thought.id);
  }

  /** Known concept with ≥ 2 labels → phi relates them → learned. */
  private async _actRelate(thought: Thought, obs: ObserveResult): Promise<void> {
    const { llm, registry, store } = this._deps;
    const [a, b] = obs.concept.labels;
    if (!a || !b) {
      await this._actDefine(thought, obs);
      return;
    }

    store.journal({ t: Date.now(), kind: "tool.call", data: { tool: "relate", a, b, thought: thought.id } });
    const out = await llm.relate(a, b);
    if (!out.ok) {
      store.journal({
        t: Date.now(),
        kind: "tool.fail",
        data: { tool: "relate", a, b, thought: thought.id, reason: out.reason },
      });
      return;
    }

    // Strengthen the shared geometry of both related labels on this concept. [PHIL]
    registry.bindLabel(obs.concept.id, a);
    registry.bindLabel(obs.concept.id, b);

    // M4 — the relation IS a meaning: persist it in the glossary.
    this._deps.glossary?.learn({
      conceptId: obs.concept.id,
      definition: out.value.relation,
      related: [a, b],
      source: "relate",
      confidence: out.value.strength,
    });

    store.journal({
      t: Date.now(),
      kind: "tool.ok",
      data: { tool: "relate", a, b, relation: out.value.relation, strength: out.value.strength, elapsedMs: out.elapsedMs },
    });
    this._learnText(out.value.relation, "relate", thought.id);
  }

  /** Structural thought → mathstral verifies a real numeric claim about it. */
  private async _actVerify(thought: Thought): Promise<void> {
    if (this._mathstralBusy) return; // single in-flight per model. [SPEC]
    this._mathstralBusy = true;
    const { llm, store } = this._deps;
    try {
      const s = thought.score;
      const mean = ((s.signalScore + s.persistenceScore + s.coherenceScore + s.relationScore) / 4).toFixed(6);
      const claim =
        `Given the four scores a=${s.signalScore.toFixed(6)}, b=${s.persistenceScore.toFixed(6)}, ` +
        `c=${s.coherenceScore.toFixed(6)}, d=${s.relationScore.toFixed(6)}, ` +
        `the arithmetic mean (a+b+c+d)/4 equals ${mean}.`;

      store.journal({ t: Date.now(), kind: "tool.call", data: { tool: "verifyStructure", thought: thought.id } });
      const out = await llm.verifyStructure(claim);
      if (!out.ok) {
        store.journal({
          t: Date.now(),
          kind: "tool.fail",
          data: { tool: "verifyStructure", thought: thought.id, reason: out.reason },
        });
        return;
      }

      if (out.value.verdict === "valid") thought.phase = "verified";
      store.journal({
        t: Date.now(),
        kind: "tool.ok",
        data: { tool: "verifyStructure", thought: thought.id, verdict: out.value.verdict, reasoning: out.value.reasoning, elapsedMs: out.elapsedMs },
      });
      this._learnText(out.value.reasoning || claim, "verifyStructure", thought.id);
    } finally {
      this._mathstralBusy = false;
    }
  }

  /**
   * Feed a tool answer BACK into the mind: encode → SensorBus ("llm.answer")
   * → next tick's engine.process() — L1/L2/L4′ physically learn it. [SPEC]
   */
  private _learnText(text: string, tool: string, thoughtId: string): void {
    const { bus, store } = this._deps;
    try {
      const field = encodeText(text);
      // Containment: never push a degenerate field into the engine. [SPEC]
      if (field.length === 0 || !field.every((x) => Number.isFinite(x))) {
        store.journal({
          t: Date.now(),
          kind: "error",
          data: { where: "cognitive_loop.learnText", tool, reason: "encoded field not finite" },
        });
        return;
      }
      const accepted = bus.push({
        source: "llm.answer",
        timestamp: Date.now(),
        meta: { tool, thought: thoughtId, excerpt: text.slice(0, 120) },
        field,
      });
      store.journal({
        t: Date.now(),
        kind: "learn",
        data: { tool, thought: thoughtId, accepted, excerpt: text.slice(0, 120) },
      });
    } catch (err) {
      store.journal({
        t: Date.now(),
        kind: "error",
        data: { where: "cognitive_loop.learnText", tool, error: String(err) },
      });
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Persistence
  // ───────────────────────────────────────────────────────────────────────────

  private _totalReinforcement(): number {
    let total = 0;
    for (const c of this._deps.registry.all()) total += c.reinforcement;
    return total;
  }

  private _snapshot(trigger: string): void {
    const { store, registry, bus } = this._deps;
    try {
      store.save(registry, this._stableThoughtCount);
      const busStats = bus.stats();
      store.journal({
        t: Date.now(),
        kind: "snapshot",
        data: {
          trigger,
          concepts: registry.size,
          stableThoughts: this._stableThoughtCount,
          ticks: this._tickCount,
          // Honest learning-health telemetry (TRUTH_SOURCES — never fabricated).
          episodes: this._episodes.size,
          annIndexSize: registry.size >= registry.annThreshold ? registry.size : 0,
          bus: { accepted: busStats.accepted, rejected: busStats.rejected, dropped: busStats.dropped },
        },
      });
    } catch (err) {
      store.journal({
        t: Date.now(),
        kind: "error",
        data: { where: "cognitive_loop.snapshot", error: String(err) },
      });
    }
  }
}
