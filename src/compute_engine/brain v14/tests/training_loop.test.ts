/**
 * Integration — ADR-001 the unified training loop: telemetry tape + retention gate.
 *
 * The closed loop, proven end to end against a real SensorBus and the loop's own
 * tick machinery (stubbed engine/registry supply a measured, controllable field):
 *
 *   1. TAPE OPT-IN — with the tape disabled, no "engine.fourier" frame reaches the bus.
 *   2. TAPE EMITTED — with the tape enabled, an idle tick re-encodes the engine's
 *      root field (spectrum + continuity invariants) onto the bus as an
 *      "engine.fourier" frame; the invariants ride the frame's meta.
 *   3. RETENTION GATED — with the gate enabled and a stable thought born of a
 *      coherent stream, the thought's measured coherence is admitted (≥ 0.66).
 *   4. RETENTION OPT-IN — with the gate disabled, nothing is admitted or deferred.
 *   5. THRESHOLD LAW — coherence 0.7 is retained, 0.5 deferred (the 0.66 rule).
 *
 * No LLM, no Ollama, no wall-clock dependence: the private _tick is invoked directly.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveLoop } from "../cognition/cognitive_loop.ts";
import { TelemetryTape, TAPE_FIELD_SIZE } from "../cognition/telemetry_tape.ts";
import { RetainedMemory } from "../cognition/retained_memory.ts";
import { SensorBus } from "../adapters/sensors/sensor_bus.ts";
import { FIELD_COMPONENTS } from "../cognition/field_genome.ts";

/** A root field that is self-similar tick-to-tick (high coherence). */
function coherentField(): Float64Array {
  const f = new Float64Array(FIELD_COMPONENTS);
  for (let i = 0; i < FIELD_COMPONENTS; i++) f[i] = Math.sin((2 * Math.PI * i) / FIELD_COMPONENTS);
  return f;
}

/** A stubbed engine whose root field we control directly. */
function makeEngine(field: Float64Array) {
  return {
    rootField: field,
    async process(_d: Float64Array) { /* sense door: field already set */ },
    async tick() { /* idle tick: field unchanged */ },
    get_state() {
      return { root_node: { state: { field_state: this.rootField } }, total_nodes: 41 };
    },
    get_scaling_telemetry() {
      return { depth: 5, nodes: 41, emaTickMs: 24, maxDepth: 8, forceDepth: null };
    },
    snapshot_field_lattice() { return [this.rootField]; },
  };
}

/** A minimal registry stub: one known concept, honest resonance, mastery ledger. */
function makeRegistry() {
  const concept = { id: "c0", labels: [] as string[], reinforcement: 1 };
  return {
    size: 1,
    nearest: (_f: Float64Array, _k: number) => [{ concept, resonance: 0.7 }],
    masteryOf: (_id: string) => ({ mastery: 0.5, verifications: 1, learned: false, meanSurprise: 0.1 }),
    observe: (_f: Float64Array, _l: string[], _s: string, _o: unknown) => ({ concept, isNew: false, resonance: 0.7 }),
    recordMastery: (_id: string, _m: unknown) => {},
    all: () => [concept],
    consolidate: () => ({ merged: 0, absorbed: [] as string[] }),
  };
}

/**
 * A stubbed language model. phrase() succeeds (VOICE proves a stable thought is
 * spoken); every ACT tool returns { ok:false } so the loop walks the clean
 * tool.fail branch — the perceptual-grounding gate suppresses naming anyway for
 * an internal (non-perceptual) thought.
 */
function makeLlm() {
  const fail = { ok: false as const, reason: "stub" };
  return {
    phrase: async (_l: string[], _c: unknown) => ({ ok: true as const, value: "it thinks" }),
    nameThis: async (_d: string) => fail,
    define: async (_w: string) => fail,
    relate: async (_a: string, _b: string) => fail,
    lexical: async (_w: string) => fail,
    verifyStructure: async (_c: unknown) => fail,
  };
}

/** A stubbed voice — records what would have been spoken. */
function makeVoice() {
  const spoken: string[] = [];
  return { spoken, speak: (text: string, _m: unknown) => { spoken.push(text); } };
}

describe("ADR-001 — the unified training loop", () => {
  let stateDir: string;
  beforeEach(() => { stateDir = mkdtempSync(path.join(tmpdir(), "adr1-")); });
  afterEach(() => { rmSync(stateDir, { recursive: true, force: true }); });

  function makeLoop(opts: { tapeEnabled: boolean; retentionEnabled: boolean }) {
    const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
    const bus = new SensorBus();
    const tape = new TelemetryTape(bus, opts.tapeEnabled);
    const retained = new RetainedMemory(null, null, opts.retentionEnabled);
    const engine = makeEngine(coherentField());
    const registry = makeRegistry();
    const llm = makeLlm();
    const voice = makeVoice();
    const loop = new CognitiveLoop({
      engine, bus, registry, llm, voice, telemetryTape: tape, retainedMemory: retained,
      store: { journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e) },
    } as never);
    return { loop, journal, bus, tape, retained, voice };
  }

  const tick = (loop: unknown) => (loop as { _tick(): Promise<void> })._tick();

  it("tape disabled: no engine.fourier frame reaches the bus across several ticks", async () => {
    const { loop, bus } = makeLoop({ tapeEnabled: false, retentionEnabled: false });
    const collected: string[] = [];
    for (let i = 0; i < 6; i++) {
      await tick(loop);
      for (const f of bus.drain(89)) collected.push(f.source);
    }
    expect(collected.filter((s) => s === "engine.fourier").length).toBe(0);
  });

  it("tape enabled (real loop): engine.fourier frames arrive carrying continuity meta", async () => {
    const { loop, bus } = makeLoop({ tapeEnabled: true, retentionEnabled: false });
    const frames: Array<{ source: string; field: Float64Array; meta: Record<string, string> }> = [];
    for (let i = 0; i < 6; i++) {
      await tick(loop);
      for (const f of bus.drain(89)) frames.push(f);
    }
    const tapeFrames = frames.filter((f) => f.source === "engine.fourier");
    expect(tapeFrames.length).toBeGreaterThanOrEqual(1);
    const f0 = tapeFrames[0]!;
    expect(f0.field.length).toBe(TAPE_FIELD_SIZE);
    expect(f0.meta.origin).toBe("engine.telemetry");
    expect(Number.isFinite(Number(f0.meta.coherence))).toBe(true);
    expect(f0.meta.burden).toBeDefined();
  });

  it("retention enabled: the loop admits the stable, coherent thought it thinks", async () => {
    const { loop, retained, journal, voice } = makeLoop({ tapeEnabled: false, retentionEnabled: true });
    // Drive ticks. The self-similar root field sustains a stable thought; the
    // retention gate judges its measured coherence (≥ 0.66) and admits it.
    for (let i = 0; i < 8; i++) await tick(loop);
    await new Promise((r) => setTimeout(r, 80)); // let the async thought pipeline settle
    const s = retained.stats();
    expect(s.enabled).toBe(true);
    expect(s.threshold).toBeCloseTo(0.66, 12);
    expect(s.admitted).toBeGreaterThanOrEqual(1);
    // The admitted thought was voiced, and naming was correctly suppressed
    // (internal thought, no perceptual grounding). No tick error occurred.
    expect(voice.spoken.length).toBeGreaterThanOrEqual(1);
    expect(journal.some((e) => e.kind === "error")).toBe(false);
  });

  it("retention disabled: nothing is admitted or deferred (zero regression)", async () => {
    const { loop, retained } = makeLoop({ tapeEnabled: false, retentionEnabled: false });
    for (let i = 0; i < 8; i++) await tick(loop);
    const s = retained.stats();
    expect(s.admitted).toBe(0);
    expect(s.deferredCoherence).toBe(0);
    expect(s.deferredRedundant).toBe(0);
    expect(s.deferredHeadroom).toBe(0);
  });

  it("the 0.66 threshold law: 0.7 retained, 0.5 deferred", () => {
    const gate = new RetainedMemory(null, null, true, 0.66);
    expect(gate.admit({ source: "thought:x", coherence: 0.7, novel: true }).retain).toBe(true);
    expect(gate.admit({ source: "thought:y", coherence: 0.5, novel: true }).retain).toBe(false);
  });
});
