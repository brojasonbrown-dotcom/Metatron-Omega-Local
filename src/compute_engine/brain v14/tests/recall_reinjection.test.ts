/**
 * Integration — P6-A recall→reinjection loop, stability-gated.
 *
 * The genome records every tick's field lattice (Phase 5); this proves the loop
 * CLOSES: when a stable thought resonates strongly with a remembered lattice,
 * the loop re-feeds that memory through the engine's deterministic sensory door
 * (engine.process) — never a direct state write — and a stability gate aborts
 * and backs off when an injection destabilizes the field.
 *
 * What is proven:
 *   1. HIGH-MARGIN GATE — a weakly-resonant recall (below ~0.618) is journaled
 *      as recall.belowmargin and NEVER touches the engine.
 *   2. REINJECTION — a strongly-resonant recall calls engine.process exactly
 *      once with the remembered lattice, journaled as recall.reinjection.
 *   3. STABILITY GATE — when the field delta post-injection clears φ⁻¹, the
 *      abort is counted and the loop backs off (no further injections while held).
 *   4. HONEST TELEMETRY — recallReinjectStats reports attempts/aborts truthfully.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveLoop } from "../cognition/cognitive_loop.ts";
import { FIELD_COMPONENTS } from "../cognition/field_genome.ts";
import type { Thought } from "../cognition/thought.ts";
import type { ExistenceScore } from "../existence_detector.ts";

import { at } from "../core/indexing.ts";
function makeScore(): ExistenceScore {
  return { signalScore: 0.9, persistenceScore: 1.0, coherenceScore: 0.92, relationScore: 0.28, exists: true } as ExistenceScore;
}
function thoughtFor(field: Float64Array): Thought {
  return {
    id: "t-p6a",
    bornAt: Date.now(),
    bornTick: 1,
    field,
    score: makeScore(),
    sources: ["text.feed"] as Thought["sources"],
    phase: "stable",
    labels: [],
    spokenText: null,
  };
}
/** A 28-field whose energy is concentrated in mode `k` (deterministic, no RNG). */
function rootField(k: number): Float64Array {
  const f = new Float64Array(FIELD_COMPONENTS);
  f[(2 * k) % FIELD_COMPONENTS] = 1;
  f[(2 * k + 1) % FIELD_COMPONENTS] = 0.5;
  return f;
}

interface FakeEngine {
  calls: Float64Array[];
  rootField: Float64Array;
  process(d: Float64Array): Promise<void>;
  get_state(): { root_node: { state: { field_state: Float64Array } } };
}

/** An engine double whose root field moves by a controllable amount on process. */
function makeEngine(deltaPerCall: number): FakeEngine {
  const eng: FakeEngine = {
    calls: [],
    rootField: new Float64Array(FIELD_COMPONENTS).fill(0.1),
    async process(d: Float64Array) {
      this.calls.push(new Float64Array(d));
      // Simulate the field's response: a bounded perturbation scaled by deltaPerCall.
      for (let i = 0; i < this.rootField.length; i++) this.rootField[i] = at(this.rootField, i) + deltaPerCall;
    },
    get_state() {
      return { root_node: { state: { field_state: this.rootField } } };
    },
  };
  return eng;
}

describe("P6-A — recall→reinjection loop, stability-gated", () => {
  let stateDir: string;
  beforeEach(() => { stateDir = mkdtempSync(path.join(tmpdir(), "p6a-")); });
  afterEach(() => { rmSync(stateDir, { recursive: true, force: true }); });

  function loopWith(engine: FakeEngine, recalled: { snapshot: { tick: number; lattice: Float64Array }; similarity: number } | null) {
    const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
    const genome = { recall: () => recalled };
    const deps = {
      engine,
      genome,
      store: { journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e) },
    };
    const loop = new CognitiveLoop(deps as never);
    return { loop, journal };
  }

  it("below-margin recall is journaled and NEVER touches the engine", async () => {
    const engine = makeEngine(0);
    const recalled = { snapshot: { tick: 3, lattice: rootField(1) }, similarity: 0.4 }; // < 0.618
    const { loop, journal } = loopWith(engine, recalled);
    await (loop as unknown as { _recallReinject(t: Thought): Promise<void> })._recallReinject(thoughtFor(rootField(1)));
    expect(engine.calls.length).toBe(0);
    expect(journal.some((j) => j.kind === "recall.belowmargin")).toBe(true);
    expect(journal.some((j) => j.kind === "recall.reinjection")).toBe(false);
  });

  it("a strongly-resonant recall is reinjected through engine.process exactly once", async () => {
    const engine = makeEngine(0); // stable: zero field delta
    const lattice = rootField(2);
    const recalled = { snapshot: { tick: 5, lattice }, similarity: 0.93 };
    const { loop, journal } = loopWith(engine, recalled);
    await (loop as unknown as { _recallReinject(t: Thought): Promise<void> })._recallReinject(thoughtFor(rootField(2)));
    expect(engine.calls.length).toBe(1);
    // The exact remembered lattice was fed through the door (a copy, not the same buffer ref is fine).
    expect(Array.from(engine.calls[0]!)).toEqual(Array.from(lattice));
    const inj = journal.find((j) => j.kind === "recall.reinjection");
    expect(inj).toBeDefined();
    expect(inj!.data.stable).toBe(true);
    expect(inj!.data.similarity).toBeCloseTo(0.93, 6);
  });

  it("the stability gate aborts and backs off when an injection destabilizes the field", async () => {
    const engine = makeEngine(2.0); // large perturbation → delta clears φ⁻¹
    const recalled = { snapshot: { tick: 7, lattice: rootField(3) }, similarity: 0.9 };
    const { loop, journal } = loopWith(engine, recalled);
    const call = (loop as unknown as { _recallReinject(t: Thought): Promise<void> })._recallReinject.bind(loop);
    await call(thoughtFor(rootField(3)));
    const inj = journal.find((j) => j.kind === "recall.reinjection");
    expect(inj).toBeDefined();
    expect(inj!.data.stable).toBe(false);
    // Backoff engaged: a second immediate call is held out (no new process call).
    const callsAfterFirst = engine.calls.length;
    await call(thoughtFor(rootField(3)));
    expect(engine.calls.length).toBe(callsAfterFirst);
    // Honest telemetry.
    const stats = (loop as unknown as { recallReinjectStats: { attempts: number; aborts: number; abortRate: number } }).recallReinjectStats;
    expect(stats.attempts).toBe(1);
    expect(stats.aborts).toBe(1);
    expect(stats.abortRate).toBe(1);
  });

  it("empty genome → honest no-op (nothing journaled, nothing injected)", async () => {
    const engine = makeEngine(0);
    const { loop, journal } = loopWith(engine, null);
    await (loop as unknown as { _recallReinject(t: Thought): Promise<void> })._recallReinject(thoughtFor(rootField(0)));
    expect(engine.calls.length).toBe(0);
    expect(journal.length).toBe(0);
  });
});
