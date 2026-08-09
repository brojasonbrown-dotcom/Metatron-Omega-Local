/**
 * Tests — M8 pre-bind gate in the phasor hypervector space (the sound gate).
 *
 * The 28-field verdict (tests/gate-discrimination.mjs, 2026-07-29) was UNSOUND:
 * an absolute λ-threshold rejected true labels ("dog" 0.215) and admitted
 * garbage ("trampoline" 0.773), because encodeText concentrates every word on
 * the same φ-DFT structure while φ-decay reinforcement dilutes a bound label.
 * Naming therefore used admit-then-verify (post-bind invariant + rollback).
 *
 * In the phasor hypervector space (D = 2^13) the floor collapses to 1/√D and a
 * bound label surfaces at ≈ its bind weight (tests/partial-bind-detect.mjs), so
 * the pre-bind gate is SOUND — provided the concept's D-space semantic channel
 * is built from the SAME canonical word representation the gate measures (the
 * atom). The LinguisticGate measures `similarity(atom(word), bundle(label-atoms))`.
 *
 * These tests prove, against a REAL ConceptRegistry + LinguisticGate:
 *   1. DISCRIMINATION — a named concept ("dog" bound) admits its bound label
 *      and REJECTS unrelated garbage ("trampoline") — the exact split that was
 *      impossible on the 28-field.
 *   2. FLOOR — every unrelated word sits far below λ on a named concept.
 *   3. PRE-BIND WIRING — the CognitiveLoop gates each instrument label BEFORE
 *      binding: a mix of a coherent + an incoherent label binds ONLY the
 *      coherent one; an all-incoherent proposal binds NOTHING (gate.reject).
 */
import { describe, expect, it } from "vitest";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { LinguisticGate, GATE_LAMBDA } from "../cognition/linguistic_gate.ts";
import { CognitiveLoop } from "../cognition/cognitive_loop.ts";
import { encodeText } from "../adapters/language_codec.ts";
import { fieldFromLuminanceGrid } from "../adapters/sensors/signal_codec.ts";
import type { Thought } from "../cognition/thought.ts";
import type { ExistenceScore } from "../existence_detector.ts";

/** Mint a fresh concept from a deterministic percept field. */
function mint(registry: ConceptRegistry, seed: number) {
  const w = 8, h = 8;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.sin(seed * 1.7 + i * 0.618) * Math.cos(seed * 0.3 + i * 0.11);
  }
  return registry.observe(fieldFromLuminanceGrid(grid, w, h), [], "test");
}

const GARBAGE = ["trampoline", "quasar", "algebra", "soup", "vertex", "bureaucracy"];

describe("M8 — pre-bind gate in the phasor hypervector space", () => {
  it("DISCRIMINATION: a named concept admits its bound label and rejects 'trampoline'", () => {
    const registry = new ConceptRegistry();
    const { concept } = mint(registry, 7);
    registry.bindLabel(concept.id, "dog");
    const gate = new LinguisticGate(registry);

    const own = gate.measureWord(concept, "dog");
    const tramp = gate.measureWord(concept, "trampoline");

    // The split that was IMPOSSIBLE on the 28-field: bound label clears λ,
    // garbage falls below it.
    expect(own.admitted).toBe(true);
    expect(own.resonance).toBeGreaterThanOrEqual(GATE_LAMBDA);
    expect(tramp.admitted).toBe(false);
    expect(tramp.resonance).toBeLessThan(GATE_LAMBDA);
    // And the margin is wide — this is a real separation, not a coin-flip.
    expect(own.resonance).toBeGreaterThan(tramp.resonance + 0.3);
  });

  it("FLOOR: every unrelated word sits below λ on a named concept", () => {
    const registry = new ConceptRegistry();
    const { concept } = mint(registry, 11);
    // Mirror the real naming flow: addLabels accretes the labels, bindLabel grounds them.
    for (const label of ["dog", "animal", "pet"]) {
      registry.addLabels(concept.id, [label], "test");
      registry.bindLabel(concept.id, label);
    }
    const gate = new LinguisticGate(registry);

    for (const bad of GARBAGE) {
      const v = gate.measureWord(concept, bad);
      expect(v.admitted).toBe(false);
      expect(v.resonance).toBeLessThan(GATE_LAMBDA);
    }
    // The bound labels still pass.
    for (const good of ["dog", "animal", "pet"]) {
      expect(gate.measureWord(concept, good).admitted).toBe(true);
    }
  });

  it("PRE-BIND WIRING: the loop binds ONLY the gate-passing labels from a mixed proposal", async () => {
    const registry = new ConceptRegistry();
    const { concept } = mint(registry, 3);
    registry.addLabels(concept.id, ["dog"], "test");
    registry.bindLabel(concept.id, "dog");
    const gate = new LinguisticGate(registry);

    const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
    const deps = {
      store: { journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e) },
      registry,
      gate,
      llm: {
        // Instrument proposes a coherent label AND a garbage one.
        nameThis: async () => ({ ok: true as const, value: { labels: ["dog", "trampoline"], confidence: 0.9 }, elapsedMs: 5 }),
      },
    };
    const loop = new CognitiveLoop(deps as never);
    const thought = makeThought(["text.feed"]);
    await (loop as unknown as { _actName(t: Thought, o: unknown): Promise<void> })._actName(thought, {
      concept,
    });

    // "dog" passed the pre-bind gate and was learned; "trampoline" was measured
    // and rejected BEFORE it could bind. The concept never carries the garbage.
    expect(thought.labels).toContain("dog");
    expect(thought.labels).not.toContain("trampoline");
    expect(concept.labels).not.toContain("trampoline");
  });

  it("PRE-BIND WIRING: an all-garbage proposal binds NOTHING and is journaled gate.reject", async () => {
    const registry = new ConceptRegistry();
    const { concept } = mint(registry, 5);
    registry.addLabels(concept.id, ["dog"], "test");
    registry.bindLabel(concept.id, "dog");
    const gate = new LinguisticGate(registry);

    const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
    const deps = {
      store: { journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e) },
      registry,
      gate,
      llm: {
        nameThis: async () => ({ ok: true as const, value: { labels: ["trampoline", "quasar"], confidence: 0.9 }, elapsedMs: 5 }),
      },
    };
    const loop = new CognitiveLoop(deps as never);
    const thought = makeThought(["text.feed"]);
    await (loop as unknown as { _actName(t: Thought, o: unknown): Promise<void> })._actName(thought, {
      concept,
    });

    // Nothing was admitted, nothing was learned.
    expect(thought.labels.length).toBe(0);
    expect(concept.labels).toEqual(["dog"]); // unchanged
    const rej = journal.find((j) => j.kind === "gate.reject");
    expect(rej).toBeDefined();
  });
});

// ── helpers mirroring debiased_naming.test.ts ────────────────────────────────
function makeScore(): ExistenceScore {
  return { signalScore: 0.9, persistenceScore: 1.0, coherenceScore: 0.92, relationScore: 0.28, exists: true } as ExistenceScore;
}
function makeThought(sources: string[]): Thought {
  const w = 8, h = 8;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) grid[i] = Math.sin(7 * 1.7 + i * 0.618) * Math.cos(7 * 0.3 + i * 0.11);
  return {
    id: "t-gate",
    bornAt: Date.now(),
    bornTick: 1,
    field: fieldFromLuminanceGrid(grid, w, h),
    score: makeScore(),
    sources: sources as Thought["sources"],
    phase: "stable",
    labels: [],
    spokenText: null,
  };
}
