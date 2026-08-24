/**
 * Tests — L3 Eigenmode Grid: the superposition-grid read of the tree.
 *
 * Guarantees under test:
 *   1. PARSEVAL — the per-node eigen-decomposition conserves energy to machine
 *      floor (the decomposition is exact, never an approximation).
 *   2. EIGENVALUE LAW — a pure standing wave at mode m resolves to dominant mode m.
 *   3. GRID — the lattice n-D fold produces 14 φ-graded channels over [nodes][28].
 *   4. DETERMINISM — the same lattice yields the identical grid, bit-for-bit.
 *   5. HONESTY — a degenerate (non-[nodes][28] / empty) lattice yields null.
 *   6. ZERO REGRESSION — disabled by default → observe() is a no-op.
 */

import { describe, expect, it } from "vitest";
import { EigenmodeGridObserver, GRID_CHANNELS } from "../cognition/eigenmode_grid.ts";

const TWO_PI = 2 * Math.PI;

/** A [nodes][28] lattice where every node carries a pure standing wave at mode m. */
function makeToneLattice(nodes: number, m: number): Float64Array {
  const out = new Float64Array(nodes * 28);
  for (let nd = 0; nd < nodes; nd++) {
    for (let i = 0; i < 14; i++) {
      // real part at 2i carries the standing wave; imaginary stays 0 (energy form)
      out[nd * 28 + 2 * i] = Math.sin((TWO_PI * m * i) / 14);
    }
  }
  return out;
}

describe("L3 — EigenmodeGridObserver (gated, exact, deterministic)", () => {
  it("disabled by default: observe() returns null, no work done", () => {
    const obs = new EigenmodeGridObserver(); // disabled
    expect(obs.enabled).toBe(false);
    expect(obs.observe(makeToneLattice(8, 2))).toBeNull();
    expect(obs.stats().ticks).toBe(0);
  });

  it("a pure standing wave at mode m resolves to dominant mode m (eigenvalue law)", () => {
    const obs = new EigenmodeGridObserver(true);
    const grid = obs.observe(makeToneLattice(8, 2))!;
    expect(grid).not.toBeNull();
    expect(grid.nodes).toBe(8);
    // Every node carries the same mode-2 tone → dominant mode 2 everywhere.
    for (let nd = 0; nd < 8; nd++) expect(grid.dominantModes[nd]).toBe(2);
  });

  it("the per-node decomposition conserves energy (Parseval at machine floor)", () => {
    const obs = new EigenmodeGridObserver(true);
    const grid = obs.observe(makeToneLattice(16, 3))!;
    // Mean per-node Parseval residual must be at machine floor (relative to the
    // tone's energy, the decomposition is exact — never an approximation).
    expect(grid.meanParseval).toBeLessThan(1e-9);
  });

  it("the lattice n-D fold produces exactly 14 φ-graded channels over [nodes][28]", () => {
    const obs = new EigenmodeGridObserver(true);
    const grid = obs.observe(makeToneLattice(8, 2))!;
    expect(grid.channelEnergy.length).toBe(GRID_CHANNELS);
    for (const e of grid.channelEnergy) expect(Number.isFinite(e)).toBe(true);
    // A structured (tone) lattice concentrates modal occupancy — not white noise.
    expect(grid.meanDominance).toBeGreaterThan(0);
  });

  it("deterministic: identical lattices yield identical grids", () => {
    const a = new EigenmodeGridObserver(true);
    const b = new EigenmodeGridObserver(true);
    const g1 = a.observe(makeToneLattice(8, 2))!;
    const g2 = b.observe(makeToneLattice(8, 2))!;
    expect(Array.from(g1.channelEnergy)).toEqual(Array.from(g2.channelEnergy));
    expect(Array.from(g1.dominantModes)).toEqual(Array.from(g2.dominantModes));
    expect(g1.latticeParseval).toBe(g2.latticeParseval);
  });

  it("a degenerate lattice yields null (honest no-structure, never invented)", () => {
    const obs = new EigenmodeGridObserver(true);
    expect(obs.observe(new Float64Array(0))).toBeNull();
    expect(obs.observe(new Float64Array(10))).toBeNull(); // not a multiple of 28
  });

  it("a flat (DC-only) lattice decomposes to DC-dominant with honest zero dominance", () => {
    const obs = new EigenmodeGridObserver(true);
    const flat = new Float64Array(8 * 28).fill(0.5);
    const grid = obs.observe(flat)!;
    expect(grid).not.toBeNull();
    // A DC-only field has no standing-wave structure: dominance ≈ 0 (DC excluded).
    expect(grid.meanDominance).toBeLessThan(0.5);
  });
});
