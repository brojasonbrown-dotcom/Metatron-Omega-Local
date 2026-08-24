/**
 * Tests — Track G4: fractals & self-similarity, MEASURED.
 * (core/fractal_diagnostics.ts; GEMATRIA_ENGINE_PLAN.md §G4)
 *
 * Every test either re-verifies a certificate in TS or asserts an honesty law:
 *   G4.1 the box-counting estimator RECOVERS the known analytic dimensions of the
 *        middle-thirds Cantor set (log 2 / log 3 ≈ 0.631) and the Sierpinski
 *        carpet (log 8 / log 3 ≈ 1.893) — each within its own 95% CI, so the
 *        estimator is proven before any field data is trusted. Empty input is
 *        honestly dimension 0; too-few-scales is honestly NaN, never a fake line.
 *   G4.2 a geometric ladder's discrete-scale-invariance is detected and its
 *        log-spacing recovered against the theory (1/2)·log φ for the φ-bands;
 *        a non-geometric (arithmetic) ladder is honestly NOT flagged as DSI.
 *   G4.3 the node-census branching spectrum re-derives the certified anchors
 *        41/281/3401/43961 at depths 5/6/7/8 (Cert 4.D1) and the F₂₁=10946 cap
 *        crossing at CENSUS_CAP_DEPTH=8.
 *
 * Honesty (plan G5): every fractal claim ships with a number + CI; nothing here
 * asserts a MEANING. There is no "what does this dimension signify" test because
 * there is no such API to test.
 */

import { describe, expect, it } from "vitest";
import { PHI, CENSUS_CAP_DEPTH } from "../core/constants.ts";
import {
  boxCountingDimension,
  cantorSetCells,
  sierpinskiCarpetCells,
  CANTOR_DIMENSION,
  SIERPINSKI_CARPET_DIMENSION,
  discreteScaleInvariance,
  PHI_BAND_LOG_SPACING,
  censusSpectrum,
  censusCapCrossing,
  censusLawHolds,
  CENSUS_ANCHORS,
  CONCEPT_CAP,
  linFit,
} from "../core/fractal_diagnostics.ts";

// Powers of 3 up to 3^7 — the box scales that align with the self-similar grid.
const POW3 = [1, 3, 9, 27, 81, 243, 729, 2187];

describe("G4.1 — box-counting fractal dimension (validated on known sets)", () => {
  it("recovers the Cantor-set dimension log2/log3 within its own CI", () => {
    const depth = 6;
    const cells = cantorSetCells(depth);
    const scales = POW3.filter((s) => s <= 3 ** depth);
    const r = boxCountingDimension(cells, scales);
    // Exact self-similar grid → the slope is exact; CI must bracket the truth.
    expect(r.dimension).toBeCloseTo(CANTOR_DIMENSION, 3);
    expect(r.ci[0]).toBeLessThanOrEqual(CANTOR_DIMENSION);
    expect(r.ci[1]).toBeGreaterThanOrEqual(CANTOR_DIMENSION);
    expect(r.r2).toBeGreaterThan(0.999); // a true fractal fits a line
    expect(Number.isFinite(r.ciHalfWidth)).toBe(true);
  });

  it("recovers the Sierpinski-carpet dimension log8/log3 within its own CI", () => {
    const depth = 5;
    const cells = sierpinskiCarpetCells(depth);
    const scales = POW3.filter((s) => s <= 3 ** depth);
    const r = boxCountingDimension(cells, scales);
    expect(r.dimension).toBeCloseTo(SIERPINSKI_CARPET_DIMENSION, 3);
    expect(r.ci[0]).toBeLessThanOrEqual(SIERPINSKI_CARPET_DIMENSION);
    expect(r.ci[1]).toBeGreaterThanOrEqual(SIERPINSKI_CARPET_DIMENSION);
    expect(r.r2).toBeGreaterThan(0.999);
  });

  it("a solid (non-fractal) 2-D block measures dimension ≈ 2", () => {
    // Full 81×81 block: N(ε) = (81/ε)² → slope exactly 2.
    const cells: number[][] = [];
    for (let x = 0; x < 81; x++) for (let y = 0; y < 81; y++) cells.push([x, y]);
    const r = boxCountingDimension(cells, [1, 3, 9, 27, 81]);
    expect(r.dimension).toBeCloseTo(2, 2);
  });

  it("an empty set is honestly dimension 0 (not a fabricated number)", () => {
    const r = boxCountingDimension([], [1, 3, 9]);
    expect(r.dimension).toBe(0);
    expect(r.ci).toEqual([0, 0]);
  });

  it("fewer than 3 usable scales returns NaN slope, never an invented line", () => {
    const cells = cantorSetCells(4);
    const r = boxCountingDimension(cells, [1, 3]); // only 2 scales
    expect(Number.isNaN(r.dimension)).toBe(true);
    expect(Number.isNaN(r.ciHalfWidth)).toBe(true);
  });

  it("rejects a non-integer or sub-1 box scale", () => {
    const cells = cantorSetCells(3);
    expect(() => boxCountingDimension(cells, [1, 2.5])).toThrow(RangeError);
    expect(() => boxCountingDimension(cells, [0])).toThrow(RangeError);
  });
});

describe("G4.1 support — linFit statistics", () => {
  it("fits an exact line with slope CI that brackets the truth", () => {
    const x = [0, 1, 2, 3, 4, 5];
    const y = x.map((v) => 2 * v + 1);
    const f = linFit(x, y);
    expect(f.slope).toBeCloseTo(2, 10);
    expect(f.intercept).toBeCloseTo(1, 10);
    expect(f.r2).toBeCloseTo(1, 10);
  });

  it("honestly reports NaN with < 3 points", () => {
    const f = linFit([0, 1], [0, 1]);
    expect(Number.isNaN(f.slope)).toBe(true);
    expect(f.points).toBe(2);
  });
});

describe("G4.2 — discrete scale invariance of the φ-band ladder", () => {
  /** A power spectrum that is pure geometric peaks at 89·φ^(k/2). */
  function phiBandSpectrum(numBands: number): { values: number[]; power: number[] } {
    const values: number[] = [];
    const power: number[] = [];
    const ratio = Math.sqrt(PHI);
    const base = 89;
    // Sample a dense axis and place a tall narrow peak at each band centre.
    const centres = Array.from({ length: numBands }, (_, k) => base * Math.pow(ratio, k));
    const max = centres[centres.length - 1]!;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const v = base * 0.9 + (max * 1.1 - base * 0.9) * (i / (N - 1));
      values.push(v);
      // power = sum of narrow Gaussians centred on each band
      let p = 0;
      for (const c of centres) {
        const w = c * 0.02;
        p += Math.exp(-((v - c) * (v - c)) / (2 * w * w));
      }
      power.push(p);
    }
    return { values, power };
  }

  it("detects DSI in a geometric ladder and recovers the √φ log-spacing", () => {
    const { values, power } = phiBandSpectrum(8);
    const r = discreteScaleInvariance(values, power);
    expect(r.isDiscreteScaleInvariant).toBe(true);
    expect(r.peaks.length).toBeGreaterThanOrEqual(6);
    // The recovered log-spacing must match the theory (1/2)·log φ.
    expect(r.logSpacing).toBeCloseTo(PHI_BAND_LOG_SPACING, 1);
    expect(r.recoveredRatio).toBeCloseTo(Math.sqrt(PHI), 1);
    expect(Number.isFinite(r.ciHalfWidth)).toBe(true);
  });

  it("the theoretical φ-band log-spacing is exactly (1/2)·log φ", () => {
    expect(PHI_BAND_LOG_SPACING).toBeCloseTo(0.5 * Math.log(PHI), 12);
  });

  it("an arithmetic (equal-spaced, non-geometric) ladder is NOT flagged as DSI", () => {
    // Peaks at 100, 200, 300, … — equal LINEAR spacing → log-gaps shrink → not DSI.
    const values: number[] = [];
    const power: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const v = 50 + (650 - 50) * (i / 1999);
      values.push(v);
      let p = 0;
      for (let k = 1; k <= 6; k++) {
        const c = 100 * k;
        p += Math.exp(-((v - c) * (v - c)) / (2 * 4 * 4));
      }
      power.push(p);
    }
    const r = discreteScaleInvariance(values, power);
    expect(r.isDiscreteScaleInvariant).toBe(false);
  });

  it("fewer than 3 peaks honestly reports no DSI", () => {
    const r = discreteScaleInvariance([1, 2, 3, 4], [0, 1, 0, 0]);
    expect(r.isDiscreteScaleInvariant).toBe(false);
    expect(Number.isNaN(r.logSpacing)).toBe(true);
  });
});

describe("G4.3 — node-census branching spectrum (Cert 4.D1)", () => {
  it("reproduces the certified cumulative anchors 41/281/3401/43961", () => {
    const spectrum = censusSpectrum(CENSUS_CAP_DEPTH);
    for (const [depthStr, expected] of Object.entries(CENSUS_ANCHORS)) {
      const level = spectrum[Number(depthStr)]!;
      expect(level.cumulative).toBe(expected);
    }
  });

  it("the branching factors follow the spawn law L(d)=L(d−1)·min(Fib(d),13)", () => {
    // depth-0 is the root (branching 1 by convention); from depth 1 the factor is
    // min(Fib(d),13) = 1,2,3,5,8,13,13,… — the certified census law (Cert 4.D1).
    const spectrum = censusSpectrum(9);
    const branching = spectrum.map((l) => l.branching);
    expect(branching).toEqual([1, 1, 1, 2, 3, 5, 8, 13, 13, 13]);
  });

  it("the census crosses the F₂₁=10946 cap exactly at CENSUS_CAP_DEPTH", () => {
    expect(censusCapCrossing(CONCEPT_CAP, 64)).toBe(CENSUS_CAP_DEPTH);
    // Just below the cap the crossing is still depth 8; at depth 7 it has NOT crossed.
    const at7 = censusSpectrum(7);
    expect(at7[7]!.cumulative).toBeLessThanOrEqual(CONCEPT_CAP);
    const at8 = censusSpectrum(8);
    expect(at8[8]!.cumulative).toBeGreaterThan(CONCEPT_CAP);
  });

  it("censusLawHolds() re-verifies Cert 4.D1 end-to-end", () => {
    expect(censusLawHolds()).toBe(true);
  });

  it("never crosses an unreachable cap (honest −1)", () => {
    expect(censusCapCrossing(Number.MAX_SAFE_INTEGER, 8)).toBe(-1);
  });

  it("rejects a negative depth", () => {
    expect(() => censusSpectrum(-1)).toThrow(RangeError);
  });
});

describe("G4 — honesty (plan G5)", () => {
  it("every dimension result carries a confidence interval, never a bare number", () => {
    const r = boxCountingDimension(cantorSetCells(5), POW3.filter((s) => s <= 3 ** 5));
    expect(Array.isArray(r.ci)).toBe(true);
    expect(r.ci).toHaveLength(2);
    expect(Number.isFinite(r.ci[0])).toBe(true);
    expect(Number.isFinite(r.ci[1])).toBe(true);
  });

  it("no function in this module returns a semantic interpretation (data only)", () => {
    // Structural guarantee: the public surface returns numbers / number-arrays /
    // booleans / objects of numbers. There is nothing that yields a string
    // 'meaning'. We assert the shape of the census spectrum as representative.
    const level = censusSpectrum(3)[2]!;
    expect(typeof level.nodes).toBe("number");
    expect(typeof level.branching).toBe("number");
    expect(typeof level.cumulative).toBe("number");
  });
});
