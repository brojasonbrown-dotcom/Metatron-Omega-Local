/**
 * File 24 — analysis/toroidalFlow.ts verification.
 *
 * The toroidal-flow / poles / dipoles analyzer is a PURE OBSERVER (imported by
 * no dynamics file); these tests certify that it reads KNOWN fields correctly
 * against analytic ground truth — never a mocked number. Every expected value
 * below was first measured live on the real module, then asserted as an
 * invariant (assert the law, not a tuned literal).
 *
 * Done-when:
 *   - Parseval: the (m,n) mode spectrum conserves energy to machine floor.
 *   - A pure toroidal mode cos(m·u) reads 100% toroidal-axis, dominant (m,0).
 *   - A pure poloidal mode cos(n·v) reads 100% poloidal-tube, dominant (0,n).
 *   - A mixed mode cos(m·u+n·v) reads 100% mixed, dominant (m,n).
 *   - A closed (periodic) field has ~zero circulation around both cycles.
 *   - A poloidal tube current produces a z-axis toroidal dipole moment.
 *   - A constant field reports ZERO structure and NO dipole axis (honest).
 *   - Emergent flow: toroidal mode → flowRatio 1; poloidal mode → 0.
 *   - Determinism: identical field → byte-identical report.
 */
import { describe, it, expect } from "vitest";
import type { StableScaleIndex } from "../src/core/constants.ts";
import { torusForScale, type TorusPoint } from "../src/geometry/torus.ts";
import {
  modeSpectrum,
  poleStructure,
  toroidalDipoleMoment,
  emergentFlow,
} from "../src/analysis/toroidalFlow.ts";

const torus = torusForScale(13 as StableScaleIndex); // Metatron shell, aspect φ
const G = 64;

// Known fields (all periodic except the deliberately-seamed one).
const fTor = (p: TorusPoint) => Math.cos(3 * p.u);
const fPol = (p: TorusPoint) => Math.cos(2 * p.v);
const fMix = (p: TorusPoint) => Math.cos(p.u + 2 * p.v);
const fConst = () => 1.0;
const fSeam = (p: TorusPoint) => Math.sin(p.u / 2);

describe("toroidalFlow — (m,n) mode spectrum (Parseval-certified)", () => {
  it("conserves energy to machine floor (Parseval)", () => {
    for (const f of [fTor, fPol, fMix, fConst]) {
      const s = modeSpectrum(f, G);
      expect(s.parsevalResidual).toBeLessThan(1e-8);
      expect(s.spectralEnergy).toBeCloseTo(s.realEnergy, 6);
    }
  });

  it("a pure toroidal mode cos(3u) is 100% toroidal-axis, dominant (3,0)", () => {
    const s = modeSpectrum(fTor, G);
    expect(s.dominant).toEqual({ m: 3, n: 0 });
    // Structured power = axis; tube & mixed at machine floor.
    expect(s.toroidalAxisPower).toBeGreaterThan(1e3);
    expect(s.poloidalTubePower / s.toroidalAxisPower).toBeLessThan(1e-20);
    expect(s.mixedPower / s.toroidalAxisPower).toBeLessThan(1e-20);
  });

  it("a pure poloidal mode cos(2v) is 100% poloidal-tube, dominant (0,2)", () => {
    const s = modeSpectrum(fPol, G);
    expect(s.dominant).toEqual({ m: 0, n: 2 });
    expect(s.poloidalTubePower).toBeGreaterThan(1e3);
    expect(s.toroidalAxisPower / s.poloidalTubePower).toBeLessThan(1e-20);
  });

  it("a mixed mode cos(u+2v) is 100% mixed, dominant (1,2)", () => {
    const s = modeSpectrum(fMix, G);
    expect(s.dominant).toEqual({ m: 1, n: 2 });
    expect(s.mixedPower).toBeGreaterThan(1e3);
    expect(s.toroidalAxisPower / s.mixedPower).toBeLessThan(1e-20);
    expect(s.poloidalTubePower / s.mixedPower).toBeLessThan(1e-20);
  });

  it("a constant field has zero structured (non-DC) power", () => {
    const s = modeSpectrum(fConst, G);
    expect(s.toroidalAxisPower).toBeLessThan(1e-20);
    expect(s.poloidalTubePower).toBeLessThan(1e-20);
    expect(s.mixedPower).toBeLessThan(1e-20);
  });
});

describe("toroidalFlow — pole structure & circulations", () => {
  it("a closed periodic field has ~zero toroidal & poloidal circulation", () => {
    for (const f of [fTor, fPol, fMix]) {
      const ps = poleStructure(f, torus, G);
      expect(Math.abs(ps.toroidalCirculation.value)).toBeLessThan(1e-10);
      expect(Math.abs(ps.poloidalCirculation.value)).toBeLessThan(1e-10);
    }
  });

  it("a constant field has exactly zero circulation", () => {
    const ps = poleStructure(fConst, torus, G);
    expect(ps.toroidalCirculation.value).toBe(0);
    expect(ps.poloidalCirculation.value).toBe(0);
  });

  it("the two poles carry the curvature sign split (+1 outer, −1 inner)", () => {
    const ps = poleStructure(fTor, torus, G);
    expect(ps.outer.curvatureSign).toBe(1);
    expect(ps.inner.curvatureSign).toBe(-1);
    expect(ps.outer.v).toBe(0);
    expect(ps.inner.v).toBeCloseTo(Math.PI, 12);
  });

  it("pole asymmetry is 0 for a u-only field (same energy on both equators)", () => {
    const ps = poleStructure(fTor, torus, G);
    expect(ps.poleAsymmetry).toBeCloseTo(0, 10);
  });
});

describe("toroidalFlow — toroidal dipole moment", () => {
  it("a poloidal tube current produces a z-axis toroidal moment", () => {
    const d = toroidalDipoleMoment(fPol, torus, G);
    expect(d.axis).toBe("z");
    expect(Math.abs(d.core.z.value)).toBeGreaterThan(1); // measured ≈ 399
    // Transverse components at machine floor.
    expect(Math.abs(d.core.x.value) / Math.abs(d.core.z.value)).toBeLessThan(1e-8);
    expect(Math.abs(d.core.y.value) / Math.abs(d.core.z.value)).toBeLessThan(1e-8);
    expect(d.magnitude).toBeCloseTo(Math.abs(d.core.z.value), 6);
  });

  it("a constant field has exactly zero dipole and NO axis (honest, not fabricated)", () => {
    const d = toroidalDipoleMoment(fConst, torus, G);
    expect(d.magnitude).toBe(0);
    expect(d.axis).toBeNull();
  });

  it("a pure toroidal-axis loop has ~zero net dipole (symmetric current cancels)", () => {
    const d = toroidalDipoleMoment(fTor, torus, G);
    expect(d.magnitude).toBeLessThan(1e-9);
  });

  it("the SI prefactor is 1/(10c) with CODATA c", () => {
    const d = toroidalDipoleMoment(fPol, torus, G);
    expect(d.siPrefactor).toBeCloseTo(1 / (10 * 299792458), 20);
  });
});

describe("toroidalFlow — emergent (friction-minimal) flow", () => {
  it("a toroidal mode reports flowRatio 1 (pure symmetry-axis loop)", () => {
    const ef = emergentFlow(fTor, torus, G);
    expect(ef.structured).toBe(true);
    expect(ef.flowRatio).not.toBeNull();
    expect(ef.flowRatio!.value).toBeCloseTo(1, 10);
    expect(ef.poloidalRatio).toBeCloseTo(0, 10);
    // A smooth periodic mode is frictionless: residual at machine floor.
    expect(ef.closureResidual.value).toBeLessThan(1e-8);
  });

  it("a poloidal mode reports flowRatio 0 (pure tube loop)", () => {
    const ef = emergentFlow(fPol, torus, G);
    expect(ef.structured).toBe(true);
    expect(ef.flowRatio!.value).toBeCloseTo(0, 10);
    expect(ef.poloidalRatio).toBeCloseTo(1, 10);
  });

  it("flowRatio + poloidalRatio + mixedRatio = 1 for any structured field", () => {
    for (const f of [fTor, fPol, fMix, fSeam]) {
      const ef = emergentFlow(f, torus, G);
      expect(ef.structured).toBe(true);
      expect(ef.flowRatio!.value + ef.poloidalRatio + ef.mixedRatio).toBeCloseTo(1, 10);
    }
  });

  it("a constant field reports flowRatio null honestly (no structured flow)", () => {
    const ef = emergentFlow(fConst, torus, G);
    expect(ef.structured).toBe(false);
    expect(ef.flowRatio).toBeNull();
    expect(ef.poloidalRatio).toBe(0);
    expect(ef.mixedRatio).toBe(0);
  });
});

describe("toroidalFlow — determinism & guards", () => {
  it("is deterministic: identical field → byte-identical report", () => {
    const a = modeSpectrum(fMix, G);
    const b = modeSpectrum(fMix, G);
    expect(a.parsevalResidual).toBe(b.parsevalResidual);
    expect(a.toroidalAxisPower).toBe(b.toroidalAxisPower);
    expect(a.mixedPower).toBe(b.mixedPower);
    expect(a.dominant).toEqual(b.dominant);
  });

  it("rejects a degenerate grid", () => {
    expect(() => modeSpectrum(fTor, 4)).toThrow(RangeError);
    expect(() => modeSpectrum(fTor, 63)).toThrow(RangeError); // odd
    expect(() => poleStructure(fTor, torus, 2)).toThrow(RangeError);
    expect(() => toroidalDipoleMoment(fTor, torus, 0)).toThrow(RangeError);
  });

  it("rejects a non-finite field", () => {
    const bad = () => Number.NaN;
    expect(() => modeSpectrum(bad, G)).toThrow(RangeError);
  });
});
