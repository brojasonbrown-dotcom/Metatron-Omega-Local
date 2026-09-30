/**
 * METATRON Ω — Omega loop: the LIVE brain service in the Electron main process.
 *
 * What it honestly is: the certified MultiTorusEngine (18-rung dense core) driven
 * by EngineHost at a wall-clock cadence, with the host's sensory plane fed by the
 * app's mic/cam/chat/file channels. Every reported number is the host's own
 * HostSnapshot — coherence, energy, flux, rung telemetry, braid memory, cognition
 * — computed live each tick, never canned.
 *
 * The host is the authoritative compute: its `pump()` advances the engine a
 * fractional number of ticks per slice so the measured tick rate matches the
 * target Hz under load, and its sensory plane resolves once per web tick so
 * every rung reads the same sensory instant (Jacobi discipline).
 *
 * Channels (declared once, fed per frame):
 *   audio  → encodeAudio   (mic waveform)
 *   vision → encodeGrid    (camera luminance grid)
 *   text   → encodeText    (chat + ingested documents)
 */
"use strict";

const O = require("./omega-bundle.cjs");
const os = require("node:os");

const TICK_MS = 33; // ~30 Hz wall-clock pump cadence
const HEAVY_VIEW_MS = 1000; // deep views (describe/web/spectral/scan/perception) refresh cadence
const MEDIUM_VIEW_MS = 500; // medium views (memory/cognition/lexicon/relations/reflect) refresh cadence
const AUDIT_VIEW_MS = 10000; // coarse self-audit cadence (certification harness, off the hot poll)

/**
 * Honest host throughput: measure the FULL host (engine + observe-only folds),
 * not the raw engine, so the governor does not over-select a profile the real
 * app (stepOnce) cannot sustain. Same work-unit as tickWorkUnits, so the rate
 * is directly comparable to profileCost.
 */
function benchmarkHostThroughput() {
  const h = new O.EngineHost({ profile: 'NANO', seed: 'bench:host' });
  for (let i = 0; i < 50; i++) h.stepOnce();
  const nodes = h.snapshot().totalNodes;
  const modes = 13;
  const perTick = O.tickWorkUnits(nodes, modes);
  const N = 300;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) h.stepOnce();
  const dt = Math.max(Date.now() - t0, 1);
  const rate = (perTick * N) / (dt / 1000);
  return {
    nodeTicksPerSecond: rate,
    workUnitsPerSecond: rate,
    workUnitsPerTick: perTick,
    benchNodes: nodes,
    benchModes: modes,
    msPerTick: dt / N,
    ticks: N,
    elapsedMs: dt,
    jitter: 0,
  };
}

/**
 * One-time measured profile selection: run the real host throughput benchmark and
 * ask the governor which profile fits at 75% headroom on BOTH axes (compute +
 * memory). This is the "resolution/depth adapts to the hardware automatically"
 * path. Falls back to MESO if the probe throws — never blocks startup.
 */
function autoProfile(targetHz) {
  try {
    const throughput = benchmarkHostThroughput();
    const probe = {
      cores: os.cpus().length,
      coresSource: "os",
      memoryBudget: os.totalmem(),
      memorySource: "os",
      webgpu: { available: false, vendor: null, architecture: null, maxBufferSize: null, maxComputeWorkgroupSizeX: null, maxStorageBufferBindingSize: null },
      throughput,
      userAgent: null,
      probedAt: Date.now(),
    };
    return O.selectProfile(probe, { targetHz: targetHz ?? 30 }).selected.id;
  } catch (err) {
    console.error("[omegaLoop] auto-profile probe failed, defaulting to MESO:", err && err.message ? err.message : err);
    return "MESO";
  }
}

class OmegaLoop {
  /**
   * @param {{profile?: string, targetHz?: number, drive?: number}} [opts]
   * profile: a ProfileId from the omega runtime (defaults to the host's own
   * default). targetHz: measured tick rate target. drive: vacuum setpoint
   * (default the host's own φ⁻¹ arming).
   */
  constructor(opts = {}) {
    // Profile selection: explicit > "auto" (governor-measured) > MESO default.
    const profile = opts.profile === "auto" ? autoProfile(opts.targetHz) : (opts.profile ?? "MESO");
    this._host = new O.EngineHost({
      profile,
      targetHz: opts.targetHz,
      drive: opts.drive,
    });
    this._profile = this._host.profile.id;
    this._timer = null;
    this._ticks = 0;
    this._startedAt = null;
    this._lastNow = null;
    // Heavy-view throttle: the deep views (describe/web/spectral/organ/scan/
    // perception) are recomputed at most every HEAVY_VIEW_MS so the telemetry
    // poll never saturates the main thread (and a close request can always run).
    this._heavyCache = null;
    this._heavyAt = 0;
    this._mediumCache = null;
    this._mediumAt = 0;
    this._auditAt = 0;
    // Declare the sensory channels once; each push feeds the plane.
    this._host.declareChannel("audio", "audio");
    this._host.declareChannel("vision", "grid");
    this._host.declareChannel("text", "text");
    this._host.declareChannel("touch", "touch");
    this._host.declareChannel("scalar", "scalar");
    // Static self-knowledge: the declared memory taxonomy (computed once — the
    // store types/layers/techniques never change during a run).
    this._memoryTaxonomy = O.memoryTaxonomy();
  }

  get running() {
    return this._timer !== null;
  }

  get profile() {
    return this._profile;
  }

  get ticks() {
    return this._ticks;
  }

  start() {
    if (this._timer) return this.state();
    this._host.start();
    this._startedAt = Date.now();
    this._lastNow = this._startedAt;
    this._timer = setInterval(() => this._pump(), TICK_MS);
    return this.state();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._host.stop();
    return this.state();
  }

  _pump() {
    const now = Date.now();
    const elapsed = this._lastNow === null ? TICK_MS : now - this._lastNow;
    this._lastNow = now;
    // Clamp: a stalled main thread (GC, UI, another window) must not turn into
    // a large catch-up burst when the loop resumes — the host already caps its
    // own debt, this is a defensive ceiling so the app yields back promptly.
    const done = this._host.pump(now, Math.min(elapsed, 250));
    this._ticks += done;
    // Coarse self-audit (certification harness) -- throttled off the state() hot path.
    if (now - this._auditAt >= AUDIT_VIEW_MS) {
      try { this._host.selfAudit(); } catch { /* advisory only */ }
      this._auditAt = now;
    }
  }

  /**
   * Advance the host synchronously by one frame. The responder calls this right
   * after injecting a chat/answer text so the input is actually PROCESSED before
   * its effect is read — otherwise every report is one tick stale and rapid
   * prompts return identical numbers. No-op while asleep: the input then waits
   * in the sensory plane and is consumed on the first tick after wake (the
   * host's pump refuses to run when stopped).
   */
  step() {
    if (!this.running) return 0;
    const now = Date.now();
    const done = this._host.pump(now, TICK_MS);
    this._ticks += done;
    this._lastNow = now;
    return done;
  }

  /**
   * Feed a sensory channel. kind: "audio" (number[] pcm), "vision"
   * (number[] luminance grid + width/height), "text" (string).
   * Returns the brain's EncodeReport ({ peak, energy, support, scale, … }) so the
   * caller can see what the encoder actually did — a malformed frame returns
   * { error } instead of throwing, never fatal to the loop.
   */
  injectSensor(kind, data, extra = {}) {
    try {
      if (kind === "audio") {
        return this._host.pushChannel("audio", data);
      } else if (kind === "vision") {
        return this._host.pushChannel("vision", data, { width: extra.width, height: extra.height });
      } else if (kind === "text") {
        return this._host.pushChannel("text", String(data));
      } else if (kind === "touch") {
        return this._host.pushChannel("touch", data);
      } else if (kind === "scalar") {
        return this._host.pushChannel("scalar", data);
      }
      return { error: `unknown sensor kind "${kind}"` };
    } catch (err) {
      return { error: String(err && err.message ? err.message : err) };
    }
  }

  /** The live HostSnapshot, trimmed to the panel's contract. */
  state() {
    const now = Date.now();
    const s = this._host.snapshot();

    // Medium views (memory/cognition/lexicon/relations/reflect) — recomputed at
    // most every MEDIUM_VIEW_MS, so the fast headline numbers can be polled at
    // high frequency without the main thread rebuilding the cognitive surface
    // every frame. Between refreshes the cached views are returned — a stable
    // field is a stable view, nothing is fabricated.
    let medium = this._mediumCache;
    if (!medium || now - this._mediumAt >= MEDIUM_VIEW_MS) {
      medium = {};
      try { medium.memory = this._host.memory(); } catch { medium.memory = null; }
      try { medium.cognition = this._host.cognition(); } catch { medium.cognition = null; }
      try { medium.lexicon = this._host.lexiconView(); } catch { medium.lexicon = null; }
      try { medium.relations = this._host.relationsView(); } catch { medium.relations = null; }
      try {
        const d = this._host.deepReflect();
        medium.reflect = {
          projectSize: d.projectSize,
          projectMeanDepth: d.projectMeanDepth,
          associativeSize: d.associativeSize,
          associativeLabels: d.associativeLabels.slice(-16),
        };
      } catch { medium.reflect = null; }
      this._mediumCache = medium;
      this._mediumAt = now;
    }

    // Heavy views (describe/web/spectral/organ/scan/perception) — recomputed at
    // most every HEAVY_VIEW_MS. Guarded so a not-yet-ticked host still returns
    // a coherent (if empty) shape, never a throw.
    let heavy = this._heavyCache;
    if (!heavy || now - this._heavyAt >= HEAVY_VIEW_MS) {
      heavy = {};
      try { heavy.describe = this._host.describe(); } catch { heavy.describe = null; }
      try { heavy.web = this._host.web(); } catch { heavy.web = null; }
      try { heavy.spectral = this._host.spectral(0); } catch { heavy.spectral = null; }
      try { heavy.organ = this._host.organSnapshot(); } catch { heavy.organ = null; }
      try { heavy.learn = this._host.learnState(); } catch { heavy.learn = null; }
      // N1 — the six-section sensory scan of the base rung: per-node vibration
      // spectrum, instantaneous frequency, energy state, superpositional flux,
      // band capture. The deepest sensory-depth readout the engine computes.
      try { heavy.scan = this._host.scan(0); } catch { heavy.scan = null; }
      // Ω-P8 — the perceptual Mind's report: what the senses have learned.
      try { heavy.perception = this._host.perception(); } catch { heavy.perception = null; }
      this._heavyCache = heavy;
      this._heavyAt = now;
    }
    const { describe, web, spectral, organ, learn, scan, perception } = heavy;
    const mem = medium.memory;
    const cog = medium.cognition;
    return {
      running: this.running,
      ticks: this._ticks,
      uptimeMs: this._startedAt && this.running ? Date.now() - this._startedAt : 0,
      profile: this._profile,
      tickRate: s.tickRate,
      busHz: s.busHz,
      totalNodes: s.totalNodes,
      digest: s.digest,
      finite: s.finite,
      // Headline invariants (the warm readings are the honest ones to show).
      // coherenceWarm is NaN until a rung's coherence ring fills — report the
      // raw mean then, so the panel never shows a hole where a number belongs.
      coherence: Number.isFinite(s.coherenceWarm) ? s.coherenceWarm : s.coherence,
      coherenceRaw: s.coherence,
      warmRungs: s.warmRungs,
      energy: s.energy,
      fluxMoved: s.fluxMoved,
      fluxImbalance: s.fluxImbalance,
      orderingViolations: s.orderingViolations,
      rowSumDefect: s.rowSumDefect,
      worstEnergyRatio: s.worstEnergyRatio,
      // Per-rung telemetry (the dense-core ladder).
      rungs: s.rungs.map((r) => ({
        n: r.n,
        nodes: r.nodes,
        coherence: r.coherence,
        warm: r.warm,
        energy: r.energy,
        regime: r.regime,
        closureDefect: r.closureDefect,
        closureQuality: r.closureQuality,
        skill: r.skill,
      })),
      // Sensory + memory + cognition.
      senseChannels: s.senseChannels,
      sensePeak: s.sensePeak,
      memoryLoad: s.memoryLoad,
      memoryCapacity: s.memoryCapacity,
      familiarity: s.familiarity,
      memoryStage: s.memoryStage,
      concepts: s.concepts,
      novelty: s.novelty,
      surprise: s.surprise,
      selfModel: s.selfModel,
      selfMargin: s.selfMargin,
      // Deep self-model readout — the Mind's SSM-vs-RLS-vs-persistence scores
      // (medium cadence) and the per-rung field self-model Q4 (fast, snapshot).
      selfModelSkill: cog?.selfModel?.skill ?? 0,
      selfModelSsmMse: cog?.selfModel?.ssmMse ?? 0,
      selfModelRlsMse: cog?.selfModel?.rlsMse ?? 0,
      selfModelPersistenceMse: cog?.selfModel?.persistenceMse ?? 0,
      selfModelSpectralRadius: cog?.selfModel?.spectralRadius ?? 0,
      fieldSelfModelEnabled: s.fieldSelfModelEnabled,
      fieldSelfModelSsmMse: s.fieldSelfModelSsmMse,
      fieldSelfModelPersistenceMse: s.fieldSelfModelPersistenceMse,
      // Ω-REAL R13 — weighted resonance index + associative memory.
      resonance: s.resonance,
      resonanceGated: s.resonanceGated,
      associativeSize: s.associativeSize,
      // Ω-REAL measure stack + genome + lexicon (observe-only, computed live).
      friction: s.friction,
      situation: s.situation,
      flow: s.flow,
      qualiaCphi: s.qualiaCphi,
      qualiaIgnited: s.qualiaIgnited,
      lyapunov: s.lyapunov,
      scaleEntropy: s.scaleEntropy,
      scaleDrift: s.scaleDrift,
      burden: s.burden,
      depth: s.depth,
      projectSize: s.projectSize,
      projectMeanDepth: s.projectMeanDepth,
      deepMemory: s.deepMemory,
      deepResolution: s.deepResolution,
      precision: s.precision,
      genomeSize: s.genomeSize,
      genomeCycles: s.genomeCycles,
      lexiconSize: s.lexiconSize,
      lexiconTokens: s.lexiconTokens,
      // The full memory + cognition views for the panel's detail sections.
      memory: mem,
      cognition: cog,
      // Self-knowledge: the declared memory taxonomy (store type/layer/retention/
      // technique per memory system) — static, computed once at construction.
      memoryTaxonomy: this._memoryTaxonomy,
      // The structure views: salience-weighted catalogue + typed relation graph.
      lexicon: medium.lexicon,
      relations: medium.relations,
      relationDigest: s.relationDigest,
      // The live sensory report (per-channel fusion + bound check).
      sense: this._host.sense(),
      // The deeper structural views (additive, read-only).
      // Ω-P8 — perceptual grounding headline.
      perceptConcepts: s.perceptConcepts,
      perceptNovelty: s.perceptNovelty,
      perceptSurprise: s.perceptSurprise,
      perception,
      // Ω-REAL — reflection: the deepest stored patterns (project + associative).
      reflect: medium.reflect,
      depthExtensions: s.depthExtensions,
      selfAudit: s.selfAudit,
      describe, web, spectral, organ, learn, scan,
    };
  }

  /**
   * Ω-REAL — seal the project's accumulated deep shape into the genome as one
   * durable record (deepReflectAndConsolidate). Explicit operator action,
   * deterministic, observe-only. Returns the sealed record's leaf index (0 when
   * the project is empty).
   */
  seal() {
    return this._host.deepReflectAndConsolidate();
  }

  /** Ω-REAL — canonical cross-session document (durable memory). */
  save() {
    return this._host.serializeMemory();
  }

  /** Ω-REAL — restore durable memory from a saved document. */
  load(doc) {
    this._host.restoreMemory(String(doc ?? ""));
  }

  /** Ω-REAL — refined semantic recall over the HOST lexicon + relations. */
  recallSimilar(text, k = 5, floor) {
    return this._host.recallSimilar(String(text ?? ""), k, floor);
  }

  /**
   * Ω-REAL — measured hardware + governor verdict (RAM/CPU, on demand).
   * Runs the real engine throughput benchmark, reads host cores + total memory,
   * and asks the governor which profile fits at 75% headroom. Synchronous and
   * expensive — call on demand, never from the telemetry poll. Observe-only.
   */
  hardware() {
    const throughput = O.benchmarkThroughput();
    const probe = {
      cores: os.cpus().length,
      coresSource: "os",
      memoryBudget: os.totalmem(),
      memorySource: "os",
      webgpu: {
        available: false, vendor: null, architecture: null,
        maxBufferSize: null, maxComputeWorkgroupSizeX: null, maxStorageBufferBindingSize: null,
      },
      throughput,
      userAgent: null,
      probedAt: Date.now(),
    };
    const verdict = O.selectProfile(probe, { targetHz: 30 });
    return {
      cores: probe.cores,
      memoryBytes: probe.memoryBudget,
      throughput: {
        workUnitsPerSecond: throughput.workUnitsPerSecond,
        msPerTick: throughput.msPerTick,
        jitter: throughput.jitter,
      },
      governor: {
        selected: verdict.selected.id,
        targetHz: verdict.targetHz,
        headroom: verdict.headroom,
        maxHz: verdict.maxHz,
        degraded: verdict.degraded,
        table: verdict.table.map((v) => ({ id: v.id, fits: v.fits, reason: v.reason, computeLoad: v.computeLoad, memoryLoad: v.memoryLoad })),
      },
    };
  }
}

module.exports = { OmegaLoop };
