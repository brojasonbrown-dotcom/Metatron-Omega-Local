/**
 * file20.resonanceScanner.test.ts — the File-20 contract.
 *
 * Asserts relationships (robust insight), not hard literals, per the repo's
 * testing law: the aliasing guard resolves high-k modes, the golden delay is
 * tested against its neighbours, determinism is bit-identical, and the
 * spectral-line ablation is answerable only when off-line k are present.
 */
import { describe, it, expect } from "vitest";
import { ResonanceScanner, gridForWavenumber, SCAN_RUNG, GRID_MIN } from "../src/engine/resonanceScanner.ts";
import { spectralLines } from "../src/core/lucas.js";
import { PHI, PHI_NEG2 } from "../src/core/constants.js";

describe("gridForWavenumber — the aliasing guard", () => {
  it("never goes below the File-6 floor", () => {
    expect(gridForWavenumber(1)).toBeGreaterThanOrEqual(GRID_MIN);
    expect(gridForWavenumber(7)).toBeGreaterThanOrEqual(GRID_MIN);
  });
  it("keeps every mode below the quadrature Nyquist (grid/2 ≥ k, with margin)", () => {
    for (const k of spectralLines()) {
      const g = gridForWavenumber(k);
      expect(g / 2).toBeGreaterThanOrEqual(k);
      // and the guard actually engages for the high lines (k=322 needs > 96)
      expect(Number.isInteger(Math.log2(g))).toBe(true); // power of two
    }
  });
  it("refines the grid for the super-Nyquist Lucas lines", () => {
    // k=322 at the default grid-96 would alias (Nyquist 48); the guard must lift it.
    expect(gridForWavenumber(322)).toBeGreaterThan(96);
    expect(gridForWavenumber(199)).toBeGreaterThan(96);
  });
  it("rejects non-integer / non-positive wavenumbers", () => {
    expect(() => gridForWavenumber(0)).toThrow(RangeError);
    expect(() => gridForWavenumber(2.5)).toThrow(RangeError);
  });
});

describe("ResonanceScanner — cell semantics", () => {
  const scanner = new ResonanceScanner({ wavenumbers: [3], settleSteps: 16 });

  it("closure is small for a smooth periodic mode and provenance-tagged", () => {
    const cell = scanner.scanCell(3, PHI);
    expect(cell.closure.value).toBeGreaterThan(0); // Lucas obstruction: never exactly 0
    expect(cell.closure.value).toBeLessThan(1e-6); // but machine-scale for a smooth mode
    expect(cell.grid).toBe(gridForWavenumber(3));
    expect(cell.onSpectralLine).toBe(true);
  });

  it("coherence is in [0,1] and the ignition flag matches the φ⁻² threshold", () => {
    const cell = scanner.scanCell(3, PHI);
    expect(cell.coherence.value).toBeGreaterThanOrEqual(0);
    expect(cell.coherence.value).toBeLessThanOrEqual(1);
    expect(cell.ignition).toBe(cell.coherence.value > PHI_NEG2);
  });

  it("flags off-line wavenumbers as not on a spectral line", () => {
    expect(scanner.scanCell(5, PHI).onSpectralLine).toBe(false);
  });

  it("is deterministic — identical cell, bit-identical result", () => {
    const a = scanner.scanCell(7, PHI);
    const b = scanner.scanCell(7, PHI);
    expect(a.closure.value).toBe(b.closure.value);
    expect(a.coherence.value).toBe(b.coherence.value);
  });
});

describe("ResonanceScanner — the scan surface", () => {
  it("scans every (k, δ) cell", () => {
    const r = new ResonanceScanner({ wavenumbers: [1, 4, 18], settleSteps: 12 }).scan();
    expect(r.diagnostics.cellsScanned).toBe(3 * 6); // 3 k × 6 default delays
    expect(r.cells.length).toBe(3 * 6);
  });

  it("varies the delay axis over the golden bracket, including φ itself", () => {
    const r = new ResonanceScanner({ wavenumbers: [2], settleSteps: 12 }).scan();
    const deltas = r.cells.map((c) => c.delta);
    expect(deltas).toContain(PHI);
    expect(new Set(deltas).size).toBeGreaterThan(3); // a real bracket, not one delay
  });

  it("reports spectralLinesDistinguished=null when only Lucas lines are scanned", () => {
    const r = new ResonanceScanner({ wavenumbers: [1, 2, 3], settleSteps: 12 }).scan();
    expect(r.diagnostics.spectralLinesDistinguished).toBeNull();
  });

  it("answers the ablation when off-line wavenumbers are present", () => {
    const r = new ResonanceScanner({ wavenumbers: [1, 2, 5, 9], settleSteps: 12 }).scan();
    expect(typeof r.diagnostics.spectralLinesDistinguished).toBe("boolean");
  });

  it("emits resonances only from igniting cells", () => {
    const r = new ResonanceScanner({ wavenumbers: spectralLines(), settleSteps: 16 }).scan();
    const igniting = new Set(r.cells.filter((c) => c.ignition).map((c) => `${c.k}:${c.delta}`));
    for (const res of r.resonances) {
      expect(igniting.has(`${res.k}:${res.delta}`)).toBe(true);
      expect(res.coherence).toBeGreaterThan(PHI_NEG2);
    }
  });

  it("is deterministic — two full scans are bit-identical", () => {
    const a = new ResonanceScanner({ wavenumbers: [1, 11], settleSteps: 12 }).scan();
    const b = new ResonanceScanner({ wavenumbers: [1, 11], settleSteps: 12 }).scan();
    expect(a.diagnostics.mostClosed).toEqual(b.diagnostics.mostClosed);
    expect(a.cells.map((c) => c.coherence.value)).toEqual(b.cells.map((c) => c.coherence.value));
  });

  it("rejects invalid config", () => {
    expect(() => new ResonanceScanner({ wavenumbers: [0] })).toThrow(RangeError);
    expect(() => new ResonanceScanner({ delays: [-1] })).toThrow(RangeError);
    expect(() => new ResonanceScanner({ settleSteps: 2 })).toThrow(RangeError);
  });

  it("exposes the canonical scan rung as the Metatron shell", () => {
    expect(SCAN_RUNG).toBe(13);
  });
});
