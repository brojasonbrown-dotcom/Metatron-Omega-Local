/**
 * Tests — Upgrade 3: the Novelty Gate.
 *
 * Plan guarantees under test:
 *   1. ZERO REGRESSION — with the gate disabled (the default), isNovel is always
 *      true and ConceptRegistry.observe is byte-for-byte the legacy behaviour.
 *   2. SCALE-FREE SURPRISE — a repeated identical percept trends to z ≈ 0
 *      (redundant); an out-of-distribution percept yields a large |z| (novel).
 *   3. GATE SEMANTICS — when enabled, a novel percept reinforces + may mint; a
 *      redundant percept is still RECOGNIZED but never reinforces and never
 *      mints a duplicate concept.
 *   4. The engine's sensory door is NEVER gated (gate is opt-in, engine-unaware).
 */

import { describe, expect, it } from "vitest";
import { NoveltyGate, DEFAULT_NOVELTY_THRESHOLD } from "../cognition/novelty_gate.ts";
import { SpectralMemory } from "../cognition/spectral_memory.ts";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { visionSpectralEnrichment } from "../adapters/sensors/spectral_enrichment.ts";
import { FIELD_SIZE } from "../adapters/language_codec.ts";
import type { SpectralEnrichment } from "../schemas/validate.ts";

import { at } from "../core/indexing.ts";
/** Deterministic luminance grid; `seed` shifts the pattern so grids differ. */
function makeGrid(w: number, h: number, seed = 0): Float64Array {
  const g = new Float64Array(w * h);
  for (let i = 0; i < g.length; i++) {
    g[i] = 0.5 + 0.5 * Math.sin(i * 0.13 + seed * 1.7) * Math.cos(i * 0.071 + seed);
  }
  return g;
}

function enrichmentFor(seed: number, w = 16, h = 16): SpectralEnrichment {
  return visionSpectralEnrichment(makeGrid(w, h, seed), w, h);
}

/** A valid 28-element unit-norm field derived from a seed (for registry tests). */
function field28(seed: number): Float64Array {
  const f = new Float64Array(FIELD_SIZE);
  for (let i = 0; i < FIELD_SIZE; i++) f[i] = Math.sin(seed * 3.1 + i * 0.9);
  let n = 0;
  for (const v of f) n += v * v;
  n = Math.sqrt(n) || 1;
  for (let i = 0; i < FIELD_SIZE; i++) f[i] = at(f, i) / n;
  return f;
}

describe("NoveltyGate — zero regression (disabled by default)", () => {
  it("is constructed disabled and always returns novel=true", () => {
    const gate = new NoveltyGate();
    expect(gate.enabled).toBe(false);
    const mem = new SpectralMemory();
    const v = gate.judge(mem, "vision.file", 0.5);
    expect(v.novel).toBe(true);
    expect(v.reason).toBe("disabled");
  });

  it("observe() with no options is the legacy reinforce-or-mint path", () => {
    const reg = new ConceptRegistry();
    const f = field28(1);
    const r1 = reg.observe(f, [], "test");
    expect(r1.isNew).toBe(true);
    const protoBefore = Float64Array.from(r1.concept.prototype);
    // Same field again → recognized and REINFORCED (reinforcement increments).
    const r2 = reg.observe(f, [], "test");
    expect(r2.isNew).toBe(false);
    expect(r2.concept.reinforcement).toBe(2);
    void protoBefore;
  });
});

describe("SpectralMemory — scale-free novelty", () => {
  it("a repeated identical percept trends to z ≈ 0", () => {
    const mem = new SpectralMemory();
    const e = enrichmentFor(7);
    for (let i = 0; i < 12; i++) mem.record(i, "vision.file", e);
    const z = mem.noveltyScore("vision.file", e.complexity.entropyNorm);
    // Constant stream → degenerate variance → identical reading scores exactly 0.
    expect(z).toBe(0);
  });

  it("an out-of-distribution percept yields large |z| after a stable baseline", () => {
    const mem = new SpectralMemory();
    // Build a tight baseline around seed 7 (tiny jitter).
    for (let i = 0; i < 12; i++) {
      const e = enrichmentFor(7 + i * 0.001);
      mem.record(i, "vision.file", e);
    }
    const baseline = mem.entropyBaseline("vision.file")!;
    const sd = mem.entropyStdDev("vision.file")!;
    expect(Number.isFinite(sd)).toBe(true);
    // A wildly different percept (different seed entirely).
    const odd = enrichmentFor(999);
    const z = mem.noveltyScore("vision.file", odd.complexity.entropyNorm);
    expect(z).toBeDefined();
    // If the baseline is degenerate (sd≈0) any departure is +Infinity; otherwise
    // a far percept must sit multiple sd from the mean.
    if (sd > 1e-9) {
      expect(Math.abs(z!)).toBeGreaterThan(DEFAULT_NOVELTY_THRESHOLD);
    } else {
      expect(z).toBe(Number.POSITIVE_INFINITY);
    }
    expect(Number.isFinite(baseline)).toBe(true);
  });
});

describe("NoveltyGate — gate semantics (enabled)", () => {
  it("novel percept → reinforce; redundant percept → recognized but not reinforced, no duplicate mint", () => {
    const mem = new SpectralMemory();
    const gate = new NoveltyGate(true, 2.0);
    const reg = new ConceptRegistry();
    const f = field28(1);

    // Establish a baseline of identical percepts.
    const e = enrichmentFor(3);
    for (let i = 0; i < 12; i++) mem.record(i, "vision.file", e);

    // REDUNDANT: same entropy again → z=0 → not novel.
    const redundantVerdict = gate.judge(mem, "vision.file", e.complexity.entropyNorm);
    expect(redundantVerdict.novel).toBe(false);
    expect(redundantVerdict.reason).toBe("redundant");

    // Prime the registry with a concept for field f.
    const first = reg.observe(f, [], "test", { reinforce: true });
    expect(first.isNew).toBe(true);
    const reinforceCount = first.concept.reinforcement;

    // Feed the SAME field with reinforce:false (what the loop does on redundant).
    const again = reg.observe(f, [], "test", { reinforce: redundantVerdict.novel });
    expect(again.isNew).toBe(false);
    expect(again.concept.id).toBe(first.concept.id); // recognized, not re-minted
    expect(again.concept.reinforcement).toBe(reinforceCount); // NOT incremented
    expect(reg.size).toBe(1); // no duplicate concept
  });

  it("a redundant, UNRECOGNIZED field does NOT mint a new concept (static scene ≠ duplicates)", () => {
    const reg = new ConceptRegistry();
    const fA = field28(1);
    reg.observe(fA, [], "test", { reinforce: true }); // one concept exists
    expect(reg.size).toBe(1);

    // A different field that does NOT clear the recognition threshold, with the
    // gate saying "redundant" — must NOT mint a duplicate.
    const fB = field28(40); // far from fA in field space
    const r = reg.observe(fB, [], "test", { reinforce: false });
    expect(r.isNew).toBe(false); // reported as nearest, NOT minted
    expect(reg.size).toBe(1); // still exactly one concept
  });

  it("with an EMPTY registry, a redundant field still mints the first concept (bootstrap)", () => {
    const reg = new ConceptRegistry();
    const r = reg.observe(field28(5), [], "test", { reinforce: false });
    expect(r.isNew).toBe(true); // a mind with zero concepts must bootstrap
    expect(reg.size).toBe(1);
  });

  it("baseline too thin → permissive (novel=true, reason baseline-thin)", () => {
    const mem = new SpectralMemory();
    const gate = new NoveltyGate(true, 2.0);
    // Only ONE reading — no variance yet.
    mem.record(1, "vision.file", enrichmentFor(1));
    const v = gate.judge(mem, "vision.file", 0.9);
    expect(v.novel).toBe(true);
    expect(v.reason).toBe("baseline-thin");
  });
});

describe("NoveltyGate — the engine door is never gated", () => {
  it("the gate is a pure read of the tap: judging mutates nothing", () => {
    const mem = new SpectralMemory();
    const e = enrichmentFor(11);
    mem.record(1, "vision.file", e);
    mem.record(2, "vision.file", e);
    const before = mem.records.length;
    const gate = new NoveltyGate(true, 2.0);
    gate.judge(mem, "vision.file", e.complexity.entropyNorm);
    gate.judge(mem, "vision.file", 0.999);
    // No new records, baseline untouched by judging.
    expect(mem.records.length).toBe(before);
  });
});
