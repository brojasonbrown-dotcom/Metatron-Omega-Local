/**
 * Integration — P6-D learning modes + co-governor replay.
 *
 * The honest speed/consolidation dial. Every assertion is wired to a real lever:
 * the mode gates whether the P6-A reinjection loop runs and whether idle-time
 * genome replay relives a snapshot through the engine's deterministic sensory
 * door, DEFERRING to the HardwareGovernor's measured depth ceiling (never
 * overriding it). No speedup is asserted — only the gating behaviour.
 *
 * What is proven:
 *   1. MODE GATE — reinjection is enabled in TRAINING and REPLAY, disabled in
 *      EFFICIENT (the conservative default).
 *   2. REPLAY ONLY IN REPLAY — mayReplay refuses in EFFICIENT/TRAINING.
 *   3. IDLE-ONLY — replay refuses while sensor frames are queued (live wins).
 *   4. CO-GOVERNOR DEFER — at the measured depth ceiling (depth ≥ maxDepth) the
 *      replay defers, yielding to the RAM law; the defer is journaled honestly.
 *   5. REAL SWEEP — with headroom + idle + a non-empty genome, exactly one
 *      snapshot is relived through engine.process, journaled as replay.step.
 *   6. SET MODE — setLearningMode flips the mode and journals a mode.change.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveLoop } from "../cognition/cognitive_loop.ts";
import { LearningModeGovernor, REPLAY_MIN_INTERVAL_TICKS } from "../cognition/learning_mode.ts";
import { FIELD_COMPONENTS } from "../cognition/field_genome.ts";

import { at } from "../core/indexing.ts";
function rootField(k: number): Float64Array {
  const f = new Float64Array(FIELD_COMPONENTS);
  f[(2 * k) % FIELD_COMPONENTS] = 1;
  f[(2 * k + 1) % FIELD_COMPONENTS] = 0.5;
  return f;
}

interface FakeEngine {
  calls: Float64Array[];
  depth: number;
  maxDepth: number;
  process(d: Float64Array): Promise<void>;
  get_state(): { root_node: { state: { field_state: Float64Array } } };
  get_scaling_telemetry(): { depth: number; nodes: number; emaTickMs: number; maxDepth: number; forceDepth: number | null };
}

function makeEngine(depth: number, maxDepth: number): FakeEngine {
  return {
    calls: [],
    depth,
    maxDepth,
    rootField: new Float64Array(FIELD_COMPONENTS).fill(0.1),
    async process(d: Float64Array) { this.calls.push(new Float64Array(d)); },
    get_state() { return { root_node: { state: { field_state: (this as FakeEngine & { rootField: Float64Array }).rootField } } }; },
    get_scaling_telemetry() { return { depth: this.depth, nodes: 41, emaTickMs: 24, maxDepth: this.maxDepth, forceDepth: null }; },
  } as FakeEngine;
}

describe("P6-D — learning modes + co-governor replay", () => {
  let stateDir: string;
  beforeEach(() => { stateDir = mkdtempSync(path.join(tmpdir(), "p6d-")); });
  afterEach(() => { rmSync(stateDir, { recursive: true, force: true }); });

  function loopWith(opts: {
    engine: FakeEngine;
    mode: "EFFICIENT" | "TRAINING" | "REPLAY";
    queuedSensors?: number;
    genomeSize?: number;
    hasLatest?: boolean;
  }) {
    const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
    const gov = new LearningModeGovernor();
    gov.setMode(opts.mode);
    const genomeSize = opts.genomeSize ?? 1;
    const genome = {
      hotSize: genomeSize,
      warmSize: 0,
      latest: () => (opts.hasLatest === false ? null : { tick: 4, lattice: rootField(2), nodeCount: 41, checksum: "abc", timestamp: 0, tier: "hot" }),
    };
    const bus = { stats: () => ({ queued: opts.queuedSensors ?? 0, accepted: 0, rejected: 0, dropped: 0 }) };
    const deps = {
      engine: opts.engine,
      genome,
      bus,
      modeGovernor: gov,
      store: { journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e) },
    };
    const loop = new CognitiveLoop(deps as never);
    return { loop, journal, gov };
  }

  it("gates reinjection by mode: off in EFFICIENT, on in TRAINING and REPLAY", () => {
    const g = new LearningModeGovernor();
    expect(g.mode).toBe("EFFICIENT");
    expect(g.reinjectionEnabled).toBe(false);
    g.setMode("TRAINING");
    expect(g.reinjectionEnabled).toBe(true);
    g.setMode("REPLAY");
    expect(g.reinjectionEnabled).toBe(true);
    g.setMode("EFFICIENT");
    expect(g.reinjectionEnabled).toBe(false);
  });

  it("replay is refused outside REPLAY mode", () => {
    const g = new LearningModeGovernor();
    const ctx = { tick: 100, queuedSensors: 0, depth: 5, maxDepth: 8, emaTickMs: 24, genomeSize: 3, lastReplayTick: -1000 };
    g.setMode("EFFICIENT");
    expect(g.mayReplay(ctx).allow).toBe(false);
    g.setMode("TRAINING");
    expect(g.mayReplay(ctx).allow).toBe(false);
    g.setMode("REPLAY");
    expect(g.mayReplay(ctx).allow).toBe(true);
  });

  it("replay is refused while sensors are queued (live perception wins)", () => {
    const g = new LearningModeGovernor();
    g.setMode("REPLAY");
    const busy = { tick: 100, queuedSensors: 2, depth: 5, maxDepth: 8, emaTickMs: 24, genomeSize: 3, lastReplayTick: -1000 };
    const d = g.mayReplay(busy);
    expect(d.allow).toBe(false);
    expect(d.reason).toMatch(/live perception wins/);
  });

  it("anti-thrash: replay refuses within the min interval since the last sweep", () => {
    const g = new LearningModeGovernor();
    g.setMode("REPLAY");
    const recent = { tick: 100, queuedSensors: 0, depth: 5, maxDepth: 8, emaTickMs: 24, genomeSize: 3, lastReplayTick: 100 - (REPLAY_MIN_INTERVAL_TICKS - 1) };
    expect(g.mayReplay(recent).allow).toBe(false);
    const allowed = { ...recent, lastReplayTick: 100 - REPLAY_MIN_INTERVAL_TICKS };
    expect(g.mayReplay(allowed).allow).toBe(true);
  });

  it("CO-GOVERNOR: replay defers at the measured depth ceiling and journals honestly", () => {
    const engine = makeEngine(8, 8); // depth pinned at the ceiling — no RAM headroom
    const { loop, journal } = loopWith({ engine, mode: "REPLAY", queuedSensors: 0, genomeSize: 3 });
    (loop as unknown as { _replaySweep(): void })._replaySweep();
    expect(engine.calls.length).toBe(0); // never relived against a saturated tree
    expect(journal.some((j) => j.kind === "replay.deferred")).toBe(true);
    expect(journal.some((j) => j.kind === "replay.step")).toBe(false);
    const stats = (loop as unknown as { learningModeStats: { replayDefers: number } }).learningModeStats;
    expect(stats.replayDefers).toBe(1);
  });

  it("a real sweep relives exactly one snapshot through engine.process, journaled as replay.step", () => {
    const engine = makeEngine(5, 8); // headroom below the ceiling
    const { loop, journal } = loopWith({ engine, mode: "REPLAY", queuedSensors: 0, genomeSize: 3 });
    (loop as unknown as { _replaySweep(): void })._replaySweep();
    expect(engine.calls.length).toBe(1);
    expect(at(engine.calls, 0).length).toBe(FIELD_COMPONENTS);
    expect(journal.some((j) => j.kind === "replay.step")).toBe(true);
    const stats = (loop as unknown as { learningModeStats: { replaySweeps: number } }).learningModeStats;
    expect(stats.replaySweeps).toBe(1);
  });

  it("setLearningMode flips the mode and journals a mode.change", () => {
    const engine = makeEngine(5, 8);
    const { loop, journal } = loopWith({ engine, mode: "EFFICIENT" });
    const l = loop as unknown as { setLearningMode(m: string): void; learningMode: string };
    expect(l.learningMode).toBe("EFFICIENT");
    l.setLearningMode("REPLAY");
    expect(l.learningMode).toBe("REPLAY");
    expect(journal.some((j) => j.kind === "mode.change" && j.data.to === "REPLAY")).toBe(true);
  });

  it("with no governor injected the mind is fixed at EFFICIENT and replay is a no-op", () => {
    const engine = makeEngine(5, 8);
    const journal: Array<{ kind: string }> = [];
    const deps = {
      engine,
      genome: { hotSize: 3, warmSize: 0, latest: () => ({ tick: 1, lattice: rootField(1), nodeCount: 41, checksum: "x", timestamp: 0, tier: "hot" }) },
      bus: { stats: () => ({ queued: 0 }) },
      store: { journal: (e: { kind: string }) => journal.push(e) },
      // no modeGovernor
    };
    const loop = new CognitiveLoop(deps as never);
    (loop as unknown as { _replaySweep(): void })._replaySweep();
    expect(engine.calls.length).toBe(0);
    expect((loop as unknown as { learningMode: string }).learningMode).toBe("EFFICIENT");
  });
});
