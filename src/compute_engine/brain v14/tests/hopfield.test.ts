import { describe, it, expect } from "vitest";
import { HopfieldMemory } from "./../cognition/hopfield.ts";
import { FIELD_SIZE, resonance, normalizeField } from "./../adapters/language_codec.ts";
import { fieldFromLuminanceGrid } from "./../adapters/sensors/signal_codec.ts";
import { at } from "../core/indexing.ts";

function makeField(seed: number): Float64Array {
  const w = 8, h = 8;
  const g = new Float64Array(w * h);
  for (let i = 0; i < g.length; i++) {
    g[i] = Math.sin(seed * 1.7 + i * 0.618) * Math.cos(seed * 0.3 + i * 0.11);
  }
  return fieldFromLuminanceGrid(g, w, h);
}

/**
 * Deterministic, well-separated field: golden-angle phase spacing makes
 * distinct seeds near-orthogonal (resonance ≈ 0), so each is its own attractor.
 * Raw luminance fields are NOT reliably orthogonal (res(200,500)≈0.98), so
 * tests that need DISTINCT attractors use this instead of makeField.
 */
function orthogonalField(seed: number): Float64Array {
  const f = new Float64Array(FIELD_SIZE);
  for (let i = 0; i < FIELD_SIZE; i++) {
    f[i] = Math.sin((seed + 1) * (i + 1) * 2.399963); // golden angle (rad)
  }
  return normalizeField(f);
}

/** Perturb a field with small deterministic noise, re-normalized. */
function noisy(field: Float64Array, amount: number): Float64Array {
  const out = new Float64Array(field.length);
  for (let i = 0; i < field.length; i++) {
    out[i] = at(field, i) + amount * Math.sin(i * 12.9898 + 78.233);
  }
  return normalizeField(out);
}

describe("HopfieldMemory", () => {
  it("starts empty and reports itself empty on retrieve", () => {
    const mem = new HopfieldMemory();
    expect(mem.size).toBe(0);
    const r = mem.retrieve(makeField(1));
    expect(r.ok).toBe(false);
    expect(r.resonance).toBe(0);
    // Zero field, never a fabricated attractor.
    expect(r.field.every((v) => v === 0)).toBe(true);
  });

  it("validates dim", () => {
    expect(() => new HopfieldMemory(0)).toThrow();
    expect(() => new HopfieldMemory(-4)).toThrow();
    expect(() => new HopfieldMemory(2.5)).toThrow();
  });

  it("uses the standard mind dimension by default", () => {
    expect(new HopfieldMemory().dim).toBe(FIELD_SIZE);
  });

  it("stores a new attractor and retrieves it exactly from itself", () => {
    const mem = new HopfieldMemory();
    const a = orthogonalField(1);
    expect(mem.store(a)).toBe(true);
    expect(mem.size).toBe(1);
    const r = mem.retrieve(a);
    expect(r.ok).toBe(true);
    expect(resonance(r.field, a)).toBeGreaterThan(0.95);
  });

  it("returns a valid unit-norm attractor resonant with the cue", () => {
    const mem = new HopfieldMemory();
    mem.store(orthogonalField(1));
    mem.store(orthogonalField(2));
    mem.store(orthogonalField(3));
    const cue = noisy(orthogonalField(2), 0.05);
    const r = mem.retrieve(cue);
    expect(r.ok).toBe(true);
    // Output is a genuine field (unit-norm) and positively resonant with the cue.
    let norm = 0;
    for (const v of r.field) norm += v * v;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 6);
    expect(r.resonance).toBeGreaterThan(0);
  });

  it("with well-separated attractors, retrieval is dominated by the nearest memory", () => {
    const mem = new HopfieldMemory();
    const a = orthogonalField(1);
    const b = orthogonalField(2);
    const c = orthogonalField(3);
    mem.store(a);
    mem.store(b);
    mem.store(c);
    // A near-exact cue for b retrieves something closest to b.
    const r = mem.retrieve(b);
    expect(r.ok).toBe(true);
    expect(resonance(r.field, b)).toBeGreaterThan(resonance(r.field, a));
    expect(resonance(r.field, b)).toBeGreaterThan(resonance(r.field, c));
  });

  it("merges near-duplicate patterns instead of duplicating", () => {
    const mem = new HopfieldMemory();
    const a = orthogonalField(7);
    mem.store(a);
    // A tiny perturbation is the same attractor (resonance ≥ 1 − 1/φ³).
    const near = noisy(a, 0.02);
    expect(resonance(a, near)).toBeGreaterThanOrEqual(1 - 1 / 1.618 ** 3);
    expect(mem.store(near)).toBe(false); // merged, not added
    expect(mem.size).toBe(1);
  });

  it("stores well-separated patterns as separate attractors", () => {
    const mem = new HopfieldMemory();
    // Golden-angle fields 1, 2, 3 are pairwise near-orthogonal (see helper).
    expect(mem.store(orthogonalField(1))).toBe(true);
    expect(mem.store(orthogonalField(2))).toBe(true);
    expect(mem.store(orthogonalField(3))).toBe(true);
    expect(mem.size).toBe(3);
  });

  it("evicts the oldest pattern past the 89 cap (FIFO)", () => {
    const mem = new HopfieldMemory();
    for (let i = 0; i < 100; i++) mem.store(orthogonalField(i));
    expect(mem.size).toBeLessThanOrEqual(89);
  });

  it("throws on dimension mismatch", () => {
    const mem = new HopfieldMemory();
    expect(() => mem.store(new Float64Array(4))).toThrow();
    expect(() => mem.retrieve(new Float64Array(4))).toThrow();
  });

  it("retrieval output is unit-norm", () => {
    const mem = new HopfieldMemory();
    mem.store(orthogonalField(3));
    mem.store(orthogonalField(9));
    const r = mem.retrieve(orthogonalField(4));
    let norm = 0;
    for (const v of r.field) norm += v * v;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 6);
  });

  it("clear() empties the memory", () => {
    const mem = new HopfieldMemory();
    mem.store(orthogonalField(1));
    mem.clear();
    expect(mem.size).toBe(0);
    expect(mem.retrieve(orthogonalField(1)).ok).toBe(false);
  });

  it("patterns() returns defensive copies", () => {
    const mem = new HopfieldMemory();
    mem.store(orthogonalField(1));
    const copy = mem.patterns()[0];
    copy[0] = 999;
    expect(at(mem.patterns(), 0)[0]).not.toBe(999);
  });
});
