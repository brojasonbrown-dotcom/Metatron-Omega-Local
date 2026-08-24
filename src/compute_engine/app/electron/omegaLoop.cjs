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

const TICK_MS = 33; // ~30 Hz wall-clock pump cadence

class OmegaLoop {
  /**
   * @param {{profile?: string, targetHz?: number, drive?: number}} [opts]
   * profile: a ProfileId from the omega runtime (defaults to the host's own
   * default). targetHz: measured tick rate target. drive: vacuum setpoint
   * (default the host's own φ⁻¹ arming).
   */
  constructor(opts = {}) {
    const profile = opts.profile ?? "MESO"; // desktop class (13 rungs, 89–610 nodes)
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
    // Declare the sensory channels once; each push feeds the plane.
    this._host.declareChannel("audio", "audio");
    this._host.declareChannel("vision", "grid");
    this._host.declareChannel("text", "text");
  }

  get running() {
    return this._timer !== null;
  }

  get profile() {
    return this._profile;
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
    const done = this._host.pump(now, elapsed);
    this._ticks += done;
  }

  /**
   * Feed a sensory channel. kind: "audio" (number[] pcm), "vision"
   * (number[] luminance grid + width/height), "text" (string).
   */
  injectSensor(kind, data, extra = {}) {
    try {
      if (kind === "audio") {
        this._host.pushChannel("audio", data);
      } else if (kind === "vision") {
        this._host.pushChannel("vision", data, { width: extra.width, height: extra.height });
      } else if (kind === "text") {
        this._host.pushChannel("text", String(data));
      }
    } catch {
      /* a malformed frame is dropped, never fatal to the loop */
    }
  }

  /** The live HostSnapshot, trimmed to the panel's contract. */
  state() {
    const s = this._host.snapshot();
    const mem = this._host.memory();
    const cog = this._host.cognition();
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
      // The full memory + cognition views for the panel's detail sections.
      memory: mem,
      cognition: cog,
    };
  }
}

module.exports = { OmegaLoop };
