/**
 * Sprint 1 · File 5 — geometry/torus.ts verification.
 * Exit gate (spec §117): geometry identities green on all 18 tori.
 *   - aspect exactly φ, by construction
 *   - metric positive-definite over a grid (ring torus never self-intersects)
 *   - total area(13) and area(n) against 4π²Rr independently
 *   - Gauss–Bonnet: ∮K dA = 0 (genus 1)
 *   - closure: periodic field is closed; broken field is not
 */
import { describe, it, expect } from "vitest";
import {
  torusForScale, metric, areaElement, surfaceArea,
  gaussianCurvatureTimesR2, isClosed, wrapAngle, metatronShellFlux,
} from "../src/geometry/torus.js";
import { STABLE_SCALES, METATRON_SHELL, PHI, PHI_INV, PI } from "../src/core/constants.js";
import { Scaled } from "../src/core/provenance.js";

const TWO_PI = 2 * PI;
const tori = STABLE_SCALES.map((n) => torusForScale(n));

describe("File 5 · torus construction", () => {
  it("builds a torus for every stable scale", () => {
    expect(tori).toHaveLength(18);
    for (const t of tori) {
      expect(t.r.mantissa).toBeGreaterThan(0);
      expect(t.R.mantissa).toBeGreaterThan(0);
    }
  });

  it("aspect is exactly φ on every torus (R/r = φ)", () => {
    for (const t of tori) {
      expect(t.aspect).toBe(PHI);
      // Verify numerically: R/r must reconstruct φ to Float64 precision.
      const ratio = t.R.div(t.r).toFloat64();
      expect(Math.abs(ratio - PHI) / PHI).toBeLessThan(1e-12);
    }
  });

  it("aspect is POSTULATE-tagged (taint propagates, never silent)", () => {
    for (const t of tori) expect(t.aspectProvenance).toBe("POSTULATE");
  });

  it("invariant R > r (aspect > 1) holds — ring torus, no self-intersection", () => {
    for (const t of tori) expect(t.R.compare(t.r)).toBeGreaterThan(0);
  });

  it("flags the Metatron shell at n=13 only", () => {
    for (const t of tori) {
      expect(t.isMetatronShell).toBe(t.n === METATRON_SHELL);
    }
  });
});

describe("File 5 · metric (first fundamental form)", () => {
  it("guu = 1 (dimensionless) everywhere; gvv = (φ + cos v)²", () => {
    for (const t of tori) {
      for (const v of [0, PI / 3, PI / 2, PI, 3 * PI / 2, 1.999 * PI]) {
        const m = metric(t, { u: 0.7, v });
        expect(m.guu).toBe(1);
        const expectGvv = (PHI + Math.cos(v)) ** 2;
        expect(Math.abs(m.gvv - expectGvv) / expectGvv).toBeLessThan(1e-12);
      }
    }
  });

  it("metric is positive-definite over a dense grid on all 18 tori", () => {
    for (const t of tori) {
      for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 24; j++) {
          const m = metric(t, { u: (i / 24) * TWO_PI, v: (j / 24) * TWO_PI });
          expect(m.guu).toBeGreaterThan(0);
          expect(m.gvv).toBeGreaterThan(0);
          expect(m.sqrtDet).toBeGreaterThan(0);
        }
      }
    }
  });

  it("gvv minimum is (φ−1)² = φ⁻² at v=π (the narrowest point, still open)", () => {
    for (const t of tori) {
      const m = metric(t, { u: 0, v: PI });
      // (φ + cos π)² = (φ−1)² = φ⁻² ≈ 0.381966
      expect(Math.abs(m.gvv - PHI_INV * PHI_INV) / (PHI_INV * PHI_INV)).toBeLessThan(1e-12);
    }
  });
});

describe("File 5 · area", () => {
  it("total area = 4π²Rr for every torus (independent reconstruction)", () => {
    for (const t of tori) {
      const A = surfaceArea(t);
      const expected = Scaled.from(4 * PI * PI).mul(t.R).mul(t.r);
      // Scaled equality after normalization.
      expect(A.equals(expected)).toBe(true);
    }
  });

  it("area(13) matches 4π²R(13)r(13) to 1e-12 (the spec test vector)", () => {
    const t = torusForScale(METATRON_SHELL);
    const A = surfaceArea(t).toFloat64();
    const expected = 4 * PI * PI * t.R.toFloat64() * t.r.toFloat64();
    expect(Math.abs(A - expected) / expected).toBeLessThan(1e-12);
  });

  it("areaElement integrates (numerically) to the total area", () => {
    // Midpoint rule on a fine grid; torus Jacobian makes this converge fast.
    const t = torusForScale(1);
    const N = 180;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const u = ((i + 0.5) / N) * TWO_PI;
        const v = ((j + 0.5) / N) * TWO_PI;
        sum += areaElement(t, { u, v }).toFloat64() * (TWO_PI / N) * (TWO_PI / N);
      }
    }
    const A = surfaceArea(t).toFloat64();
    expect(Math.abs(sum - A) / A).toBeLessThan(1e-6);
  });
});

describe("File 5 · Gauss–Bonnet (genus 1, χ=0)", () => {
  it("∮ K dA = 0 numerically on a torus", () => {
    const t = torusForScale(1);
    const N = 240;
    let integral = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const u = ((i + 0.5) / N) * TWO_PI;
        const v = ((j + 0.5) / N) * TWO_PI;
        // K·r² dimensionless × dA-in-r² = sqrtDet·du·dv ; r² cancels globally.
        integral +=
          gaussianCurvatureTimesR2(t, { u, v }) *
          metric(t, { u, v }).sqrtDet *
          (TWO_PI / N) * (TWO_PI / N);
      }
    }
    // χ = (1/2π)∮K dA = 0 for a torus.
    expect(Math.abs(integral) / (2 * PI)).toBeLessThan(1e-6);
  });
});

describe("File 5 · closure / periodicity", () => {
  const t = torusForScale(1);
  it("a periodic toroidal mode is closed", () => {
    const closed = ({ u, v }: { u: number; v: number }) =>
      Math.sin(3 * u) * Math.cos(2 * v);
    expect(isClosed(closed, t)).toBe(true);
  });
  it("a non-periodic field is NOT closed", () => {
    const open = ({ u, v }: { u: number; v: number }) => Math.sin(0.5 * u) + v;
    expect(isClosed(open, t)).toBe(false);
  });
  it("a high-Lipschitz periodic field is still closed (audit F6)", () => {
    // cos(m·u + v) is perfectly periodic for any integer m, but its Lipschitz
    // constant grows with m. The old fixed-eps probe read O(m·eps) and began
    // false-negativing between m=50 and m=60. The eps→0 extrapolated jump must
    // stay ~0 for ALL m — periodicity is about the jump, not the smoothness.
    for (const m of [60, 100, 200]) {
      const hi = ({ u, v }: { u: number; v: number }) => Math.cos(m * u + v);
      expect(isClosed(hi, t)).toBe(true);
    }
    // A genuine obstruction at the SAME Lipschitz scale is still caught. A
    // non-integer wavenumber gives a real VALUE jump across the u-seam:
    // cos(100.5·u) has u-seam defect |cos(100.5ε) − cos(100.5(2π−ε))| →
    // |1 − cos(201π)| = 2, an O(1) jump that must NOT extrapolate away.
    // (Note: sin(m·u/2) would be wrong here — it is value-CONTINUOUS at the seam
    // since sin(m·π)=0, so it is correctly judged closed; only its derivative jumps.)
    const jumped = ({ u }: { u: number; v: number }) => Math.cos(100.5 * u);
    expect(isClosed(jumped, t)).toBe(false);
  });
  it("wrapAngle lands in [0,2π) and is idempotent", () => {
    for (const th of [0, TWO_PI, -1, 7.3, 100 * TWO_PI + 0.5, -13 * TWO_PI - 2]) {
      const w = wrapAngle(th);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThan(TWO_PI);
      expect(wrapAngle(w)).toBe(w);
    }
  });
});

describe("File 5 · Metatron shell flux", () => {
  it("flux(13) = φ⁻²⁶ = 3.684×10⁻⁶ (corrected constant), POSTULATE-tagged", () => {
    const f = metatronShellFlux();
    expect(f.provenance).toBe("POSTULATE");
    expect(Math.abs(f.value.toFloat64() - 3.684014691873265e-6) / 3.684014691873265e-6).toBeLessThan(1e-9);
  });
});
