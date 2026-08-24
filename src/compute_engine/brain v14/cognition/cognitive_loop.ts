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
import type { LanguageInstrument } from "./../adapters/language_instrument.ts";
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
import type { Lexicon } from "./lexicon.ts";
import { LinguisticGate, gateEchoText } from "./linguistic_gate.ts";
import type { RecordPerceptron } from "./record_perceptron.ts";
import type { LexiconTriples } from "./lexicon_triples.ts";
import { verifyPrediction } from "./prediction_ledger.ts";
import { SpectralMemory } from "./spectral_memory.ts";
import { NoveltyGate, type NoveltyVerdict } from "./novelty_gate.ts";
import { at } from "../core/indexing.ts";

/**
 * The language instrument the engine queries. Any model satisfying the
 * structural LanguageInstrument contract — the local phi/mathstral pair
 * (LlmTool), the Kimi K3 frontier model (KimiK3Tool), or the switchable
 * InstrumentRouter — both satisfy the
 * same structural contract: they PROPOSE language; the LinguisticGate MEASURES
 * every proposal before it may touch memory. The mind never learns an
 * instrument's word on the instrument's say-so. [PHIL]
 */
export type { LanguageInstrument };

/** Tick period: 1000/φ⁴ ≈ 146 ms. [SPEC] */
export const TICK_MS = 146;

/** Max sensory frames processed per tick: F_5 = 5. [SPEC] */
const MAX_FRAMES_PER_TICK = 5;

/** Snapshot every N stable thoughts: F_7 = 13. [SPEC] */
const SNAPSHOT_EVERY_THOUGHTS = 13;

/** Snapshot every N ticks regardless: F_16 = 987 (≈ 2.4 min). [SPEC] */
const SNAPSHOT_EVERY_TICKS = 987;

/**
 * Pending thoughts awaiting the phi instrument: max F_7 = 13, oldest dropped. [SPEC]
 *
 * Was F_4 = 3: at a 146 ms tick with a multi-second LLM instrument, depth 3 saturated
 * and silently dropped stable thoughts (measured: 175 "thought queue full" events over
 * ~419 h of journal). F_7 = 13 matches the SensorBus F_11 = 89 / snapshot F_7 = 13 rungs
 * — deep enough that real stable thoughts survive a slow instrument, bounded enough that
 * a stuck phi still sheds load (oldest-first: present > stale).
 */
const MAX_THOUGHT_QUEUE = 13;

export interface CognitiveLoopDeps {
  readonly engine: FractalNodeEngine;
  readonly bus: SensorBus;
  readonly registry: ConceptRegistry;
  readonly store: MemoryStore;
  readonly llm: LanguageInstrument;
  readonly voice: VoiceOut;
  /** M4 — dictionary-quality memory. Optional: run_mind.ts needs no change. */
  readonly glossary?: ConceptGlossary;
  /** M7 — the grounded language front. Optional: run_mind.ts needs no change. */
  readonly lexicon?: Lexicon;
  /**
   * M8 — the linguistic gate. When present, every instrument proposal is
   * MEASURED against the concept's geometry before it may bind/learn; rejected
   * words are journaled and dropped. Optional so run_mind.ts needs no change,
   * but the loop is strictly more truthful with it attached. [SPEC]
   */
  readonly gate?: LinguisticGate;
  /**
   * M9 — the record-perceptron. When present, every admitted binding leaves a
   * residual RECORD (with provenance) that trains a shared cross-modal
   * associator, and after a successful bind the concept's labels are re-weighted
   * by the percept's own vote — so a label the percept does not recognise is
   * CORRECTED (removed), not merely refused next time. Optional so run_mind.ts
   * needs no change. [SPEC]
   */
  readonly recordPerceptron?: RecordPerceptron;
  /**
   * M10 — the lexicon triple store. When present, the mind can assert and query
   * RELATIONAL facts (subject role object) as FHRR bind/unbind composites — the
   * knowledge-graph layer above grounded labels. Optional so run_mind.ts needs
   * no change. [SPEC]
   */
  readonly lexiconTriples?: LexiconTriples;
  /**
   * Phase 5 — the Field-State Genome. When present, every tick's full field
   * lattice ([nodeCount][28]) is recorded into the checksummed, φ-tiered ring,
   * and recall can feed a remembered field back into the engine through its
   * deterministic sensory door. Optional so run_mind.ts needs no change. [SPEC]
   */
  readonly genome?: import("./field_genome.ts").FieldGenome;
  /**
   * P6-B — the resonance manifold. When present, every stable thought that
   * resolves to a concept derives its measured, typed relations (is-a /
   * shares-feature / analogous-to) into the ontology layer. Optional so
   * run_mind.ts needs no change. [SPEC]
   */
  readonly manifold?: import("./resonance_manifold.ts").ResonanceManifold;
  /**
   * P6-D — the learning-mode governor. When present, it gates whether the P6-A
   * reinjection loop runs (TRAINING/REPLAY) and whether idle-time genome replay
   * consolidates memory (REPLAY only), deferring to the HardwareGovernor's
   * measured depth ceiling. Absent => EFFICIENT behaviour (reinjection off).
   * Optional so run_mind.ts needs no change. [SPEC]
   */
  readonly modeGovernor?: import("./learning_mode.ts").LearningModeGovernor;
  readonly noveltyGate?: NoveltyGate;
  /**
   * Upgrade 5 — the genome's spectral signature ("DNA scan"). When present, the
   * loop feeds each tick's lattice into a rolling 144-tick window and the mind's
   * spectral fingerprint (standing waves, tempo, diversity, drift) becomes
   * computable on demand via `loop.genomeDNA.signature()`. Optional so
   * run_mind.ts needs no change. [SPEC]
   */
  readonly genomeDNA?: import("./genome_spectral_signature.ts").GenomeSpectralSignature;
  /**
   * ADR-001 — the Telemetry Tape: the engine's own certified spectrum +
   * continuity invariants re-encoded onto the 28-field and pushed onto the bus
   * as the internal "engine.fourier" sense. When present AND enabled, the loop
   * emits one bounded tape frame per tick. Optional so run_mind.ts needs no
   * change; absent/disabled ⇒ no tape, today's behaviour. [SPEC]
   */
  readonly telemetryTape?: import("./telemetry_tape.ts").TelemetryTape;
  /**
   * L1 — the cross-scale flow observer. When present AND enabled, each tick the
   * tree's per-scale closure residual is routed through the engine's File-11
   * FluxLedger across the ladder + ±13 octave channels. Read-only; absent/disabled
   * ⇒ no cross-scale lane, today's behaviour. [SPEC]
   */
  readonly crossScaleFlow?: import("./cross_scale_flow.ts").CrossScaleFlow;
  /**
   * L3 — the eigenmode-grid observer. When present AND enabled, each tick the
   * tree's lattice is decomposed into per-node ring-Laplacian eigenmodes + the
   * lattice n-D superposition grid (φ-graded modal occupancy). Read-only;
   * absent/disabled ⇒ no grid, today's behaviour. [SPEC]
   */
  readonly eigenmodeGrid?: import("./eigenmode_grid.ts").EigenmodeGridObserver;
  /**
   * L5 — the multiscale bridge. When present AND enabled, the closed 18-torus
   * engine steps in lockstep with the mind and its four-invariant readout is
   * pushed as an `engine.multiscale` sense. Read-only off the engine's own step;
   * absent/disabled ⇒ no multiscale sense, today's behaviour. [SPEC]
   */
  readonly multiscaleBridge?: import("./multiscale_bridge.ts").MultiscaleBridge;
  /**
   * Cross-modal co-occurrence correlator (learning-layer gap). When present AND
   * enabled, each tick measures the BETWEEN-modality resonance of co-arriving
   * frames (φ-decayed, with sample sizes) — the cross-correlation substrate of
   * grounded meaning. Read-only; absent/disabled ⇒ today's behaviour. [SPEC]
   */
  readonly crossModalCorrelator?: import("./cross_modal_correlator.ts").CrossModalCorrelator;
  /**
   * ADR-001 — the Retained Memory gate. When present AND enabled, each stable
   * thought's measured coherence is judged against the retention threshold
   * (default 0.66) plus novelty and the HardwareGovernor's headroom; the honest
   * verdict is journaled. The thought's learning is NEVER blocked — retention
   * is an additive read, not a gate on the engine's sensory door. Optional so
   * run_mind.ts needs no change. [SPEC]
   */
  readonly retainedMemory?: import("./retained_memory.ts").RetainedMemory;
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
  private readonly _spectral = new SpectralMemory();
  /** Latest novelty verdict per source this tick (Upgrade 3). Reset each sense pass. */
  private readonly _lastNovelty = new Map<string, NoveltyVerdict>();

  private _phiBusy = false;
  private _mathstralBusy = false;
  private readonly _thoughtQueue: Array<{ thought: Thought; obs: ObserveResult; action: MindAction; drives: DriveState }> = [];

  // -- P6-A recall->reinjection channel state (off-loop, stability-gated) --
  /** One reinjection in flight at a time; the live tick always wins. [SPEC] */
  private _reinjectBusy = false;
  /** Post-injection stability watchdog: backoff while unstable. */
  private _reinjectHoldUntil = 0;
  /** Honest telemetry: attempted vs stability-aborted reinjections. [SPEC] */
  private _reinjectAttempts = 0;
  private _reinjectAborts = 0;
  /** The last field we reinjected — guards against immediate self-echo. */
  private _lastReinjectedField: Float64Array | null = null;
  private _lastReinjectedTick = -1;

  // -- P6-D learning-mode / replay channel state --
  /** Tick of the last idle replay sweep (anti-thrash interval). [SPEC] */
  private _lastReplayTick = -1000;
  /** Honest replay telemetry: sweeps run vs co-governor deferrals. [SPEC] */
  private _replaySweeps = 0;
  private _replayDefers = 0;

  constructor(
    deps: CognitiveLoopDeps,
    restoredStableThoughtCount: number = 0,
    restoredEpisodes: readonly string[] = []
  ) {
    this._deps = deps;
    this._stableThoughtCount = restoredStableThoughtCount;
    // Restore the episodic attractors so correlation-across-time survives a
    // restart (previously RAM-only — the mind forgot its episodes each session).
    if (restoredEpisodes.length > 0) this._episodes.restore(restoredEpisodes);
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

  /** Read access to the deep observer lanes (L1/L3/L5) for the answer spine. [SPEC] */
  get crossScaleFlow(): import("./cross_scale_flow.ts").CrossScaleFlow | undefined {
    return this._deps.crossScaleFlow;
  }
  get eigenmodeGrid(): import("./eigenmode_grid.ts").EigenmodeGridObserver | undefined {
    return this._deps.eigenmodeGrid;
  }
  get multiscaleBridge(): import("./multiscale_bridge.ts").MultiscaleBridge | undefined {
    return this._deps.multiscaleBridge;
  }
  get crossModalCorrelator(): import("./cross_modal_correlator.ts").CrossModalCorrelator | undefined {
    return this._deps.crossModalCorrelator;
  }

  get tickCount(): number {
    return this._tickCount;
  }
  /**
   * Read access to the spectral memory tap — the live record of measured
   * percept complexity + identity across every enriched sense. Cross-modally
   * commensurable; the substrate for novelty-by-complexity gating. [SPEC]
   */
  get spectral(): SpectralMemory {
    return this._spectral;
  }

  /**
   * Upgrade 5 — the genome's spectral signature ("DNA scan") window, when the
   * opt-in dep is attached. Call `.signature()` for the mind's fingerprint. [SPEC]
   */
  get genomeDNA(): import("./genome_spectral_signature.ts").GenomeSpectralSignature | undefined {
    return this._deps.genomeDNA;
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
      void this._tick();
      this._scheduleNext();
    }, TICK_MS);
    this._timer.unref();
  }

  /** One full cognitive tick. NEVER throws — errors are journaled. [SPEC] */
  private async _tick(): Promise<void> {
    try {
      this._tickCount++;
      const { engine, bus, store } = this._deps;

      // 1. SENSE — validated frames through the sanctioned door.
      const frames = bus.drain(MAX_FRAMES_PER_TICK);
      // CROSS-MODAL CORRELATOR — measure BETWEEN-modality co-occurrence resonance
      // over this tick's frames (a sight + a sound arriving together). Read-only;
      // never perturbs the sensory door below. Inert until enabled. [SPEC]
      if (this._deps.crossModalCorrelator?.enabled && frames.length > 1) {
        this._deps.crossModalCorrelator.observe(frames);
      }
      // M3 — advance the correlator's confidence-decay clock once per loop tick. [SPEC]
      this._deps.crossModalCorrelator?.tickClock(this._tickCount);
      for (const frame of frames) {
        await engine.process(frame.field);
        this._tracker.noteSource(frame.source);
        this._boundaryField = frame.field;
        // SPECTRAL TAP — when the sensor attached a certified spectral enrichment,
        // record its measured complexity + identity (cross-modally commensurable) and
        // journal it. The engine already received the locked 28-field above; this tap
        // NEVER perturbs dynamics — it only reads the additive enrichment. [SPEC]
        if (frame.spectral) {
          const spectralSummary = this._spectral.record(this._tickCount, frame.source, frame.spectral);
          store.journal({
            t: Date.now(),
            kind: "spectral.percept",
            data: spectralSummary,
          });
          // NOVELTY GATE (Upgrade 3) — judge this percept's surprise against its
          // source's running entropy baseline (already updated by record() above).
          // The verdict modulates ONLY downstream concept-learning pressure; the
          // engine's sensory door (engine.process, already run) is NEVER gated.
          if (this._deps.noveltyGate) {
            const verdict = this._deps.noveltyGate.judge(
              this._spectral,
              frame.source,
              frame.spectral.complexity.entropyNorm,
            );
            this._lastNovelty.set(frame.source, verdict);
            store.journal({
              t: Date.now(),
              kind: "novelty.gate",
              data: {
                source: verdict.source,
                entropyNorm: verdict.entropyNorm,
                ...(verdict.zScore !== undefined && Number.isFinite(verdict.zScore) ? { zScore: verdict.zScore } : {}),
                threshold: verdict.threshold,
                novel: verdict.novel,
                reason: verdict.reason,
              },
            });
          }
        }
        store.journal({
          t: Date.now(),
          kind: "sense",
          data: { source: frame.source, meta: frame.meta },
        });
      }
      if (frames.length === 0) {
        await engine.tick(); // the mind never stops ticking
      }

      // Phase 5 — GENOME: record this tick's full field lattice. The engine
      // has just advanced (tick/process above), so the node field_states are
      // the current committed field. Recorded BEFORE DETECT reads the root, so
      // the snapshot is the same field the mind is about to reason over. The
      // genome owns a copy; recording never perturbs the dynamics. [SPEC]
      if (this._deps.genome) {
        const lattice = engine.snapshot_field_lattice();
        this._deps.genome.record(this._tickCount, lattice, engine.get_state().total_nodes);
        // Upgrade 5 — feed the same lattice into the DNA-scan window. The scan
        // copies; it never perturbs recording or the dynamics. [SPEC]
        this._deps.genomeDNA?.observe(lattice, engine.get_state().total_nodes);
      }

      // 2. DETECT — existence of the root field.
      const root = engine.get_state().root_node.state.field_state;
      const boundary = this._boundaryField ?? root;
      const score = ExistenceDetector.evaluate(root, this._prevRootField, boundary);
      const drives = this._arbiter.tick(root, this._prevRootField, score);
      const thought = this._tracker.observe(root, score, this._tickCount);

      // ADR-001 — TELEMETRY TAPE: re-encode the engine's own readouts (spectrum
      // + the four continuity invariants) as the internal "engine.fourier" sense.
      // Read-only off the committed root field; the tape self-throttles and defers
      // to live perception. Computed AFTER the current root is known but BEFORE
      // _prevRootField is overwritten, so coherence is the honest self-overlap. [SPEC]
      if (this._deps.telemetryTape?.enabled) {
        const inv = this._continuityInvariants(root, this._prevRootField);
        // P1 — hand the whole-tree lattice so the frame ALSO carries the certified
        // multidimensional spectral enrichment (spectrumND over [nodes][28]); the
        // root field is the honest 1-node fallback when no genome is attached.
        const lattice = this._deps.genome ? engine.snapshot_field_lattice() : root;
        this._deps.telemetryTape.emit(this._tickCount, { field: root, invariants: inv }, lattice);
      }

      // L1 — CROSS-SCALE FLOW: route each scale's measured closure residual through
      // the engine's File-11 FluxLedger across the ladder + ±13 octave channels.
      // Read-only off the committed tree; never perturbs dynamics. The κ·cc factor
      // is read from the ROOT membrane's own contract so the residual matches the
      // node's surface term exactly. Inert until enabled (default off). [SPEC]
      if (this._deps.crossScaleFlow?.enabled) {
        const rootNode = engine.get_state().root_node;
        const CLOSURE_COUPLING = 0.1967263286200249; // core/constants CLOSURE_COUPLING
        const kappaCc = CLOSURE_COUPLING * rootNode.membrane.curvature_coupling;
        this._deps.crossScaleFlow.observe(rootNode, kappaCc);
      }

      // L3 — EIGENMODE GRID: decompose the tree lattice into per-node standing-wave
      // superpositions + the lattice n-D modal-occupancy grid. Read-only off the
      // committed lattice (same snapshot the genome/tape read); never perturbs
      // dynamics. Inert until enabled (default off). [SPEC]
      if (this._deps.eigenmodeGrid?.enabled) {
        const lattice = this._deps.genome ? engine.snapshot_field_lattice() : root;
        this._deps.eigenmodeGrid.observe(lattice);
      }

      // L5 — MULTISCALE BRIDGE: step the closed 18-torus engine in lockstep with
      // the mind and push its four-invariant readout as an engine.multiscale sense,
      // so the mind perceives its own deep engine's multiscale closure. Read-only
      // off the engine's step result; never perturbs the tree. Inert until enabled
      // (default off). [SPEC]
      if (this._deps.multiscaleBridge?.enabled) {
        this._deps.multiscaleBridge.step();
      }

      this._prevRootField = new Float64Array(root);

      // 3-5. RECOGNIZE + ACT + VOICE on a newborn stable thought.
      if (thought) {
        this._onStableThought(thought, score, drives);
      }

      // 6. PERSIST on tick cadence.
      if (this._tickCount % SNAPSHOT_EVERY_TICKS === 0) {
        this._snapshot("tick-cadence");
      }

      // P6-D — REPLAY: when the bus was idle this tick, consolidate memory by
      // reliving one genome snapshot through the sensory door. The mode governor
      // decides (REPLAY only), deferring to the measured depth ceiling. [SPEC]
      if (frames.length === 0) {
        this._replaySweep();
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

    // M6 — PREDICT before recognizing: what does the mind's own episodic memory
    // expect this field to resonate with? This is the anticipation. Then the
    // field is recognized (the measurement) and the prediction is VERIFIED
    // against the φ-prior. Learning is the gain, never the accretion. [SPEC]
    const masteryPrior = registry.masteryOf(
      registry.nearest(thought.field, 1)[0]?.concept.id ?? ""
    );
    const { outcome, next: masteryNext } = verifyPrediction(masteryPrior, this._episodes, thought.field);
    store.journal({
      t: Date.now(),
      kind: "prediction",
      data: {
        thought: thought.id,
        predicted: outcome.predicted,
        measured: outcome.measured,
        baseline: 0.6180339887498949, // φ⁻¹ — the prior, stated honestly
        gain: outcome.gain,
        surprise: outcome.surprise,
      },
    });

    // RECOGNIZE by resonance. Upgrade 3 (novelty gate): when the gate is enabled
    // and EVERY modality that fed this thought was redundant this tick, recognize
    // without reinforcing — the mind stops re-learning what it already knows.
    // When the gate is absent/disabled, or any source was novel, learn as today.
    let reinforce = true;
    const gate = this._deps.noveltyGate;
    if (gate && gate.enabled && thought.sources.length > 0) {
      const anyNovel = thought.sources.some((src) => this._lastNovelty.get(src)?.novel === true);
      const anyVerdict = thought.sources.some((src) => this._lastNovelty.has(src));
      // Suppress only when we have a verdict for the thought and none were novel.
      reinforce = anyVerdict ? anyNovel : true;
    }
    const obs = registry.observe(
      thought.field,
      [],
      `thought:${thought.sources.join("+") || "internal"}`,
      { reinforce }
    );
    thought.labels = [...obs.concept.labels];

    // M6 — fold the verified gain onto the concept the thought resolved to.
    registry.recordMastery(obs.concept.id, masteryNext);
    store.journal({
      t: Date.now(),
      kind: "verification",
      data: {
        thought: thought.id,
        concept: obs.concept.id,
        gain: outcome.gain,
        mastery: masteryNext.mastery,
        verifications: masteryNext.verifications,
        learned: masteryNext.learned,
        meanSurprise: masteryNext.meanSurprise,
      },
    });

    // P6-B — derive the concept's manifold relations (the ontology layer).
    // Measured, typed edges only; a relation is asserted solely when its
    // resonance clears the high-margin floor. Off the hot path of recognition.
    if (this._deps.manifold) {
      const derived = this._deps.manifold.indexConcept(obs.concept, registry);
      const asserted = derived.filter((e) => e.evidence > 0);
      if (asserted.length > 0) {
        store.journal({
          t: Date.now(),
          kind: "manifold.relation",
          data: {
            concept: obs.concept.id,
            relations: asserted.length,
            kinds: [...new Set(asserted.map((e) => e.kind))],
          },
        });
      }
    }

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
        // M6 — the honest learning signal: verified prediction gain + mastery.
        predictionGain: outcome.gain,
        mastery: masteryNext.mastery,
        learned: masteryNext.learned,
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
        surprise: outcome.surprise, // M6 — verified broken expectation
        predictionGain: outcome.gain, // M6 — verified gain vs the φ-prior
        // M7 — has this concept been defined? (gates the lexical instrument)
        defined: this._deps.glossary?.get(obs.concept.id) !== undefined,
      },
      this._stableThoughtCount,
      this._totalReinforcement()
    );

    // ACT + VOICE off-loop (phi is a single-in-flight instrument).
    this._enqueueThoughtWork(thought, obs, action, drives);

    // P6-A — close the recall loop (off-loop, stability-gated). The mind just
    // resolved a stable thought; if a remembered field lattice resonates with
    // it strongly enough, re-feed that memory through the engine's sensory
    // door so experience re-enters the dynamics. Never blocks the tick. [SPEC]
    if (this._deps.genome && (this._deps.modeGovernor?.reinjectionEnabled ?? false)) {
      void this._recallReinject(thought);
    }

    // ADR-001 — RETAINED MEMORY: judge this thought's measured coherence against
    // the retention gate (≥ 0.66 + novel + governor headroom). The verdict is
    // journaled honestly; the thought's own learning above is NEVER blocked —
    // retention is an additive read of the coherence the DETECT step measured. [SPEC]
    if (this._deps.retainedMemory?.enabled) {
      const gate = this._deps.noveltyGate;
      const novel = gate && gate.enabled && thought.sources.length > 0
        ? thought.sources.some((src) => this._lastNovelty.get(src)?.novel !== false)
        : true; // gate off / internal thought — treat as novel (learn-everything)
      this._deps.retainedMemory.admit(
        {
          source: `thought:${thought.sources.join("+") || "internal"}`,
          coherence: score.coherenceScore,
          novel,
          meta: { thought: thought.id, concept: obs.concept.id },
        },
        this._deps.engine.get_state().total_nodes,
      );
    }

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
      case "lexical":
        await this._actLexical(thought, obs);
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
    "doc.feed",
    "ui.observe",
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
      modes.push(at(f, k) * at(f, k) + at(f, k + 1) * at(f, k + 1)); // |mode_k|²
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
    for (let i = 0; i < thought.field.length; i++) h.update(String(at(thought.field, i).toFixed(6)));
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

    // M8 — PRE-BIND GATE (now SOUND in the phasor hypervector space).
    //
    // On the 28-field a λ-threshold was UNSOUND (tests/gate-discrimination.mjs,
    // 2026-07-29): unrelated words resonated 0.773 on the shared φ-DFT floor
    // while bound labels read 0.215, so a threshold straddled both and naming
    // fell back to admit-then-verify. In D-space the unrelated floor collapses
    // to 1/√D ≈ 0.011 while a bound label surfaces at ≈ its bind weight
    // (tests/gate-soundness-dspace.mjs, tests/partial-bind-detect.mjs), so the
    // gate now MEASURES each proposed label BEFORE it binds — the sound half of
    // M8 the audit asked for. The post-bind convergence invariant is kept as a
    // second check on the fusion.
    const gate = this._deps.gate;
    const gateReport = gate ? gate.gateWords(obs.concept, out.value.labels) : null;
    const admittedLabels = gateReport ? [...gateReport.admitted] : out.value.labels;

    // Every proposed label failed the gate — reject the whole naming honestly.
    // Nothing binds, nothing is learned; the rejection is journaled with the
    // per-word measured resonances. (For an un-named concept the gate falls back
    // to the 28-field measure, so this is the honest "no label coheres" path.)
    if (admittedLabels.length === 0) {
      store.journal({
        t: Date.now(),
        kind: "gate.reject",
        data: {
          tool: "nameThis",
          thought: thought.id,
          concept: obs.concept.id,
          reason: "every proposed label failed the pre-bind gate",
          verdicts: gateReport
            ? gateReport.verdicts.map((v) => ({ word: v.word, resonance: v.resonance, admitted: v.admitted, reason: v.reason }))
            : [],
        },
      });
      return;
    }

    // Rollback snapshot (gate contract: a failed invariant restores the concept).
    const snapshot = gate
      ? {
          labels: [...obs.concept.labels],
          prototype: new Float64Array(obs.concept.prototype),
          semantic: obs.concept.semantic !== null ? new Float64Array(obs.concept.semantic) : null,
          reinforcement: obs.concept.reinforcement,
          coherenceBefore: gateReport ? gateReport.coherenceBefore : null,
        }
      : null;

    const provenance = this._provenanceHash(thought, admittedLabels);
    registry.addLabels(obs.concept.id, admittedLabels, "llm.nameThis");
    // Symbol grounding: fuse each admitted label's word-geometry into the
    // concept so the percept and its name become one attractor. [PHIL]
    for (const label of admittedLabels) registry.bindLabel(obs.concept.id, label);

    // M8 CONVERGENCE INVARIANT — the binding must not de-cohere the attractor,
    // measured against the PRE-BIND coherence. On failure: full rollback per
    // the gate contract (admit-then-verify — the sound half of M8).
    if (gate && snapshot) {
      const inv = gate.checkInvariant(obs.concept, snapshot.coherenceBefore);
      if (!inv.ok) {
        obs.concept.labels = snapshot.labels;
        obs.concept.prototype.set(snapshot.prototype);
        if (snapshot.semantic === null) {
          obs.concept.semantic = null;
        } else if (obs.concept.semantic === null) {
          obs.concept.semantic = new Float64Array(snapshot.semantic);
        } else {
          obs.concept.semantic.set(snapshot.semantic);
        }
        obs.concept.reinforcement = snapshot.reinforcement;
        store.journal({
          t: Date.now(),
          kind: "gate.invariant",
          data: { tool: "nameThis", thought: thought.id, concept: obs.concept.id, reason: inv.reason, after: inv.after, rolledBack: true },
        });
        return; // nothing is learned from an incoherent fusion
      }
    }

    thought.labels = [...admittedLabels];

    // M9 — record each admitted binding as a residual record (with provenance)
    // so the shared cross-modal associator accumulates trusted percept→label
    // structure, then CORRECT: re-weight this concept's labels by the percept's
    // own vote and remove any label the percept does not recognise. The gate
    // refused NEW poison pre-bind; this removes a label that slipped through
    // or was bound pre-gate (the dog/cat echo class). [FIX]
    const perceptron = this._deps.recordPerceptron;
    if (perceptron) {
      for (const label of admittedLabels) perceptron.record(obs.concept, label, "llm.nameThis");
      const verdicts = perceptron.reweight(obs.concept);
      const corrected = verdicts.filter((v) => !v.believed).map((v) => v.word);
      if (corrected.length > 0) {
        obs.concept.labels = obs.concept.labels.filter((l) => !corrected.includes(l));
        thought.labels = thought.labels.filter((l) => !corrected.includes(l));
        store.journal({
          t: Date.now(),
          kind: "gate.corrected",
          data: {
            tool: "nameThis",
            thought: thought.id,
            concept: obs.concept.id,
            corrected,
            verdicts: verdicts.map((v) => ({ word: v.word, vote: v.vote, weight: v.weight, believed: v.believed })),
          },
        });
      }
    }

    store.journal({
      t: Date.now(),
      kind: "tool.ok",
      data: {
        tool: "nameThis",
        thought: thought.id,
        labels: admittedLabels,
        confidence: out.value.confidence,
        elapsedMs: out.elapsedMs,
        provenance, // A6 — every minted name is traceable to its measured field.
        grounded: true,
      },
    });
    this._learnText(admittedLabels.join(" "), "nameThis", thought.id, obs.concept);
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
    this._learnText(out.value.definition, "define", thought.id, obs.concept);
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
    this._learnText(out.value.relation, "relate", thought.id, obs.concept);
  }

  /**
   * M7 — defined concept → phi produces its dictionary entry (pos + gloss +
   * typed relations) → the lexicon's grounded graph grows. The gloss refreshes
   * the M4 glossary; each relation becomes an edge hardened by the pair's
   * MEASURED geometry (never a hand-picked weight). This is the language front
   * learning how its known words connect. [SPEC]
   */
  private async _actLexical(thought: Thought, obs: ObserveResult): Promise<void> {
    const { llm, store, lexicon } = this._deps;
    const word = obs.concept.labels[0];
    if (!word || !lexicon) return; // nothing to lexicalize / front not attached

    store.journal({ t: Date.now(), kind: "tool.call", data: { tool: "lexical", word, thought: thought.id } });
    const out = await llm.lexical(word);
    if (!out.ok) {
      store.journal({
        t: Date.now(),
        kind: "tool.fail",
        data: { tool: "lexical", word, thought: thought.id, reason: out.reason },
      });
      return;
    }

    // Part of speech + the refined gloss onto the M4 glossary (newest wins).
    if (out.value.pos.length > 0) lexicon.recordPos(word, out.value.pos);
    this._deps.glossary?.learn({
      conceptId: obs.concept.id,
      definition: out.value.gloss,
      related: [word, ...out.value.relations.map((r) => r.to)],
      source: "define",
      confidence: 0.5,
    });

    // Each typed relation becomes a grounded edge — but only when the target
    // word is ALSO grounded (a relation to an unknown word is not language),
    // and the edge's strength is the pair's measured co-occurrence resonance.
    let edges = 0;
    let triples = 0;
    const tripleStore = this._deps.lexiconTriples;
    for (const rel of out.value.relations) {
      const measured = lexicon.measurePairResonance(word, rel.to);
      if (lexicon.assertRelation(word, rel.to, rel.kind, measured) !== null) {
        edges++;
        // M10: mirror the GROUNDED edge into the geometric triple store
        // (subject=word, role=rel.kind, object=rel.to). Gating on the same
        // non-null assertRelation keeps the two graphs consistent: a fact
        // lands in FHRR space iff both endpoints are grounded. This is the
        // living assertion path over the proven bind/unbind algebra. [SPEC]
        if (tripleStore && tripleStore.assert(word, rel.kind, rel.to) !== null) triples++;
      }
    }

    store.journal({
      t: Date.now(),
      kind: "tool.ok",
      data: {
        tool: "lexical",
        word,
        pos: out.value.pos,
        gloss: out.value.gloss.slice(0, 160),
        relations: out.value.relations,
        groundedEdges: edges,
        triples, // M10 — how many of those edges also landed in FHRR space.
        elapsedMs: out.elapsedMs,
      },
    });
    this._learnText(out.value.gloss, "lexical", thought.id, obs.concept);
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
      // verifyStructure's reasoning is a structural/numeric claim, not concept
      // language — it is not gated against a concept (none in scope). [SPEC]
      this._learnText(out.value.reasoning || claim, "verifyStructure", thought.id);
    } finally {
      this._mathstralBusy = false;
    }
  }

  /**
   * Feed a tool answer BACK into the mind: encode → SensorBus ("llm.answer")
   * → next tick's engine.process() — L1/L2/L4′ physically learn it. [SPEC]
   *
   * M8 ECHO GATE — when the gate is attached and the originating concept is
   * known, the text is encoded and MEASURED against that concept's geometry
   * before it may re-enter memory. An incoherent echo (the dog/cat poison
   * vector: the mind learning its own ungrounded invention) is dropped and
   * journaled, never learned. [FIX]
   */
  private _learnText(text: string, tool: string, thoughtId: string, concept?: ObserveResult["concept"]): void {
    const { bus, store, gate } = this._deps;
    try {
      let field: ReturnType<typeof encodeText>;
      if (gate && concept) {
        const verdict = gateEchoText(concept, text);
        if (verdict.field === null) {
          store.journal({
            t: Date.now(),
            kind: "gate.echo",
            data: { tool, thought: thoughtId, reason: verdict.reason, resonance: verdict.resonance },
          });
          return; // the echo is incoherent — never learned
        }
        field = verdict.field;
      } else {
        field = encodeText(text);
      }
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
    // P6-A — Recall → reinjection (the closing of the memory loop)
    // ───────────────────────────────────────────────────────────────────────────
    //
    // WHAT THIS IS [SPEC]
    // The genome records every tick's field lattice (Phase 5) but until now
    // nothing fed a remembered field back into the dynamics — the mind had a
    // memory it could read but never relive. This stage closes that loop: when a
    // stable thought is born, we ask the genome for the stored lattice nearest
    // to the thought's field and, if it resonates strongly, reinject it through
    // engine.process() (the L4_Sensory door) so the memory physically re-enters
    // the field. That is how experience accelerates the mind — a recognized
    // situation re-awakens the field that produced it.
    //
    // THE SAFETY DISCIPLINE (never compromised)
    //   1. HIGH MARGIN — only reinject when similarity clears ~0.618.
    //   2. DETERMINISTIC DOOR — through engine.process() (L4_Sensory), the same
    //      sanctioned input as any real sense; the genome never writes node state.
    //   3. STABILITY GATE — measure the root-field delta over the injection tick;
    //      if it destabilizes, back off and refuse further injections until it
    //      settles. Memory accelerates, never breaks.
    //   4. OFF-LOOP — reinjection runs async and never stalls the 146 ms tick.
    /** Similarity floor for reinjection: λ + φ⁻¹·λ ≈ 0.618. [MATH] */
    private static readonly _REINJECT_MIN_SIM = 0.6180339887498949;
    /** Stability gate: abort if post-injection root delta/norm clears φ⁻¹. [MATH] */
    private static readonly _REINJECT_MAX_DELTA = 0.6180339887498949;
    /** Do not reinject the same lattice within this many ticks (anti-echo). [SPEC] */
    private static readonly _REINJECT_COOLDOWN_TICKS = 3;

    private async _recallReinject(thought: Thought): Promise<void> {
      const { engine, genome, store } = this._deps;
      if (!genome) return;
      const nowTick = this._tickCount;
      if (nowTick < this._reinjectHoldUntil) return; // backoff window active
      if (this._lastReinjectedField !== null && nowTick - this._lastReinjectedTick < CognitiveLoop._REINJECT_COOLDOWN_TICKS) return; // anti-echo
      // Recall against the thought's root field; the genome matches over the shared
      // prefix (the root slice is the field's place in the pre-order DFS). [MATH]
      const recalled = genome.recall(thought.field);
      if (recalled === null) return; // empty genome — honest nothing
      if (recalled.similarity < CognitiveLoop._REINJECT_MIN_SIM) {
        store.journal({ t: Date.now(), kind: "recall.belowmargin", data: { thought: thought.id, similarity: recalled.similarity, tick: recalled.snapshot.tick } });
        return;
      }
      if (this._reinjectBusy) return; // one in flight; the live tick wins
      this._reinjectBusy = true;
      this._reinjectAttempts++;
      try {
        const preRoot = new Float64Array(engine.get_state().root_node.state.field_state);
        await engine.process(recalled.snapshot.lattice); // the deterministic sensory door
        const postRoot = engine.get_state().root_node.state.field_state;
        let num = 0; let den = 0;
        const n = Math.min(preRoot.length, postRoot.length);
        for (let i = 0; i < n; i++) { const d = postRoot[i]! - preRoot[i]!; num += d * d; den += preRoot[i]! * preRoot[i]!; }
        const delta = den > 0 ? Math.sqrt(num / den) : Math.sqrt(num);
        const stable = delta <= CognitiveLoop._REINJECT_MAX_DELTA;
        if (!stable) {
          this._reinjectAborts++;
          this._reinjectHoldUntil = nowTick + 4 * this._reinjectAborts; // backoff
        } else {
          this._lastReinjectedField = recalled.snapshot.lattice;
          this._lastReinjectedTick = nowTick;
        }
        store.journal({ t: Date.now(), kind: "recall.reinjection", data: { thought: thought.id, genomeTick: recalled.snapshot.tick, similarity: recalled.similarity, fieldDelta: delta, stable, attempts: this._reinjectAttempts, aborts: this._reinjectAborts } });
      } catch (err) {
        store.journal({ t: Date.now(), kind: "error", data: { where: "cognitive_loop.recallReinject", error: String(err) } });
      } finally {
        this._reinjectBusy = false;
      }
    }

    /** Honest reinjection telemetry for the Sigma panel / tests. [SPEC] */
    get recallReinjectStats(): { attempts: number; aborts: number; abortRate: number } {
      return { attempts: this._reinjectAttempts, aborts: this._reinjectAborts, abortRate: this._reinjectAttempts > 0 ? this._reinjectAborts / this._reinjectAttempts : 0 };
    }

    // ─── P6-D — learning mode + idle replay ───────────────────────────────────

    /** Current learning mode (EFFICIENT when no governor is injected). [SPEC] */
    get learningMode(): import("./learning_mode.ts").LearningMode {
      return this._deps.modeGovernor?.mode ?? "EFFICIENT";
    }

    /**
     * Set the learning mode. Journals an honest mode.change (never silent). With
     * no governor injected the mind is fixed at EFFICIENT and the call is a no-op
     * (journals nothing — there is no mode to change). [SPEC]
     */
    setLearningMode(next: import("./learning_mode.ts").LearningMode): void {
      const gov = this._deps.modeGovernor;
      if (!gov) return;
      const prev = gov.setMode(next);
      if (prev !== next) {
        this._deps.store.journal({ t: Date.now(), kind: "mode.change", data: { from: prev, to: next, tick: this._tickCount } });
      }
    }

    /** Honest replay/mode telemetry for the Sigma panel / tests. [SPEC] */
    get learningModeStats(): { mode: string; reinjectionEnabled: boolean; replaySweeps: number; replayDefers: number } {
      return {
        mode: this.learningMode,
        reinjectionEnabled: this._deps.modeGovernor?.reinjectionEnabled ?? false,
        replaySweeps: this._replaySweeps,
        replayDefers: this._replayDefers,
      };
    }

    /** ADR-001 — live tape + retention telemetry for the Sigma panel / tests. [SPEC] */
    get trainingLoopStats(): {
      tape: import("./telemetry_tape.ts").TapeStats | null;
      retention: import("./retained_memory.ts").RetentionStats | null;
    } {
      return {
        tape: this._deps.telemetryTape?.stats() ?? null,
        retention: this._deps.retainedMemory?.stats() ?? null,
      };
    }

    /**
     * ADR-001 — flip a training-loop sense live (the Sigma panel toggles). Honest:
     * returns the NEW enabled state, or null when that sense was never wired into
     * the loop (the caller reports not-present, never fakes the flip). The sense
     * own setEnabled journals the transition; we mirror it to the store so the
     * toggle survives as an auditable event. [SPEC]
     */
    setSense(kind: "retention" | "telemetry", enabled: boolean): boolean | null {
      const target =
        kind === "retention" ? this._deps.retainedMemory :
        kind === "telemetry" ? this._deps.telemetryTape : undefined;
      if (!target) return null;
      target.setEnabled(enabled);
      this._deps.store.journal({
        t: Date.now(),
        kind: "sense.toggle",
        data: { sense: kind, enabled, tick: this._tickCount },
      });
      return target.enabled;
    }

    /**
     * ADR-001 — the four continuity invariants of the committed root field,
     * computed fresh each tick the tape is enabled. Mirrors the engine loop's own
     * definitions so the tape and the Σ panel report the SAME measured numbers:
     * coherence = cos²(u_t, u_{t-1}) self-overlap; closure = |Σu|/Σ|u| net-flux
     * fraction; drift = |log(E/E_prev)| energy slide; burden = Σu². [SPEC]
     */
    private _continuityInvariants(
      u: Float64Array,
      up: Float64Array | null,
    ): import("./telemetry_tape.ts").ContinuityInvariants {
      let sum = 0, sumAbs = 0, energy = 0;
      for (let i = 0; i < u.length; i++) {
        const v = u[i]!;
        sum += v;
        sumAbs += Math.abs(v);
        energy += v * v;
      }
      const closure = sumAbs === 0 ? 0 : Math.abs(sum) / sumAbs;
      const burden = energy;

      // Coherence + drift need a previous state; the first tick reports the honest
      // "no past" read (coherence 1, drift 0), matching temporal_engine's convention.
      let coherence = 1;
      let drift = 0;
      if (up !== null) {
        let dot = 0, na = 0, nb = 0, ePrev = 0;
        const n = Math.min(u.length, up.length);
        for (let i = 0; i < n; i++) {
          dot += u[i]! * up[i]!;
          na += u[i]! * u[i]!;
          nb += up[i]! * up[i]!;
          ePrev += up[i]! * up[i]!;
        }
        const denom = Math.sqrt(na) * Math.sqrt(nb);
        coherence = denom === 0 ? 0 : Math.min(1, (dot / denom) ** 2);
        drift = ePrev > 0 && energy > 0 ? Math.abs(Math.log(energy / ePrev)) : 0;
      }
      return { coherence, closure, drift, burden };
    }

    /**
     * P6-D — REPLAY sweep: relive ONE genome snapshot through the engine's
     * deterministic sensory door to consolidate memory while idle. The mode
     * governor gates the decision (REPLAY only, bus idle, genome non-empty,
     * anti-thrash, co-governor depth ceiling). A deferral is journaled honestly
     * as replay.deferred; a real sweep as replay.step. Never throws. [SPEC]
     */
    private _replaySweep(): void {
      const { engine, genome, bus, store, modeGovernor } = this._deps;
      if (!genome || !modeGovernor) return; // EFFICIENT: no offline reliving
      const tele = engine.get_scaling_telemetry();
      const decision = modeGovernor.mayReplay({
        tick: this._tickCount,
        queuedSensors: bus.stats().queued,
        depth: tele.depth,
        maxDepth: tele.maxDepth,
        emaTickMs: tele.emaTickMs,
        genomeSize: genome.hotSize + genome.warmSize,
        lastReplayTick: this._lastReplayTick,
      });
      if (!decision.allow) {
        this._replayDefers++;
        store.journal({ t: Date.now(), kind: "replay.deferred", data: { reason: decision.reason, tick: this._tickCount, depth: tele.depth, maxDepth: tele.maxDepth } });
        return;
      }
      try {
        // Relive the most recent snapshot: it is the freshest attractor, and
        // re-feeding it through the sensory door consolidates its basin without
        // new external input. engine.process is the ONLY sanctioned door. [SPEC]
        const latest = genome.latest();
        if (!latest) return;
        this._lastReplayTick = this._tickCount;
        this._replaySweeps++;
        void engine.process(latest.lattice);
        store.journal({ t: Date.now(), kind: "replay.step", data: { genomeTick: latest.tick, nodeCount: latest.nodeCount, checksum: latest.checksum, sweeps: this._replaySweeps, tick: this._tickCount } });
      } catch (err) {
        store.journal({ t: Date.now(), kind: "error", data: { where: "cognitive_loop.replaySweep", error: String(err) } });
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
      // Consolidation: fold duplicate attractors into one before persisting, so
      // the lexicon accretes meaning instead of fragmenting. [FIX]
      const { merged, absorbed } = registry.consolidate();
      if (merged > 0) {
        const rekeyed = this._deps.glossary?.rekey(absorbed) ?? 0;
        store.journal({
          t: Date.now(),
          kind: "snapshot",
          data: { trigger: "consolidate", merged, rekeyed, concepts: registry.size },
        });
      }
      store.save(registry, this._stableThoughtCount, this._episodes.serialize());
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
