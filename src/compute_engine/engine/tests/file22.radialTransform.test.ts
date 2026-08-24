/**
 * File 22 — analysis/radialTransform.ts verification.
 * Done-when:
 *   - sphericalBesselJ matches exact closed forms & its defining recurrence
 *   - the Gaussian is a fixed point of the l=0 transform (self-reciprocity)
 *   - the spherical top-hat transform matches its analytic sinc form
 *   - forward∘inverse recovers a smooth mode (inversion certificate)
 *   - high-degree partial-wave Gaussians transform correctly (spline regime)
 */
import { describe, it, expect } from "vitest";
import {
  sphericalBesselJ, radialTransform, inverseRadialTransform, inversionResidual,
} from "../src/analysis/radialTransform.ts";

const gaussGrid = (n: number, rmax: number, f: (r: number) => number) => {
  const r: number[] = [], u: number[] = [];
  for (let i = 0; i < n; i++) { const rv = (rmax * i) / (n - 1); r.push(rv); u.push(f(rv)); }
  return { r, u };
};

describe("sphericalBesselJ", () => {
  it("matches closed forms j₀ and j₁ across the domain", () => {
    for (const x of [0.1, 1, 5, 12, 40]) {
      expect(sphericalBesselJ(0, x)).toBeCloseTo(Math.sin(x) / x, 12);
      expect(sphericalBesselJ(1, x)).toBeCloseTo(Math.sin(x) / (x * x) - Math.cos(x) / x, 10);
    }
  });
  it("honours j_l(0) = δ_{l0}", () => {
    expect(sphericalBesselJ(0, 0)).toBe(1);
    expect(sphericalBesselJ(4, 0)).toBe(0);
  });
  it("satisfies its defining recurrence deep in the sub-turning region", () => {
    for (const l of [3, 10, 24, 48]) {
      const x = 0.5 * l;
      const jm1 = sphericalBesselJ(l - 1, x), jl = sphericalBesselJ(l, x), jp1 = sphericalBesselJ(l + 1, x);
      const resid = Math.abs(jp1 - ((2 * l + 1) / x) * jl + jm1);
      const scale = Math.max(Math.abs(jm1), Math.abs(jl), Math.abs(jp1), 1e-300);
      expect(resid / scale).toBeLessThan(1e-8);
    }
  });
});

describe("radialTransform — spherical Bessel / Hankel", () => {
  it("transforms the l=0 Gaussian to itself (self-reciprocal fixed point)", () => {
    const { r, u } = gaussGrid(240, 8, (rv) => Math.exp(-rv * rv / 2));
    const k = Array.from({ length: 200 }, (_, a) => (8 * a) / 199);
    const spec = radialTransform(r, u, 0, k, 8);
    for (let a = 0; a < k.length; a++)
      expect(Math.abs(spec.uk[a]! - Math.exp(-k[a]! * k[a]! / 2))).toBeLessThan(1e-6);
  });

  it("transforms the spherical top-hat to its analytic sinc form", () => {
    const { r, u } = gaussGrid(240, 6, (rv) => (rv < 1 ? 1 : 0));
    const k = Array.from({ length: 120 }, (_, a) => (6 * a) / 119);
    const spec = radialTransform(r, u, 0, k, 6);
    for (let a = 2; a < k.length; a++) { // skip k→0 where the form is 0/0
      const kv = k[a]!;
      const exact = Math.sqrt(2 / Math.PI) * (Math.sin(kv) - kv * Math.cos(kv)) / (kv * kv * kv);
      expect(Math.abs(spec.uk[a]! - exact)).toBeLessThan(2e-2); // Gibbs at the discontinuity
    }
  });

  it("recovers a smooth mode under forward∘inverse (inversion certificate)", () => {
    const { r, u } = gaussGrid(240, 8, (rv) => Math.exp(-rv * rv / 2));
    const k = Array.from({ length: 200 }, (_, a) => (8 * a) / 199);
    expect(inversionResidual(r, u, 0, k, 8)).toBeLessThan(1e-5);
  });

  it.each([0, 1, 2, 4, 8])("transforms the partial-wave Gaussian r^%d·exp(−r²/2) correctly", (l) => {
    const { r, u } = gaussGrid(240, 8, (rv) => Math.pow(rv, l) * Math.exp(-rv * rv / 2));
    const k = Array.from({ length: 200 }, (_, a) => (8 * a) / 199);
    const spec = radialTransform(r, u, l, k, 8);
    let worst = 0;
    for (let a = 0; a < k.length; a++)
      worst = Math.max(worst, Math.abs(spec.uk[a]! - Math.pow(k[a]!, l) * Math.exp(-k[a]! * k[a]! / 2)));
    expect(worst).toBeLessThan(1e-4);
  });
});
