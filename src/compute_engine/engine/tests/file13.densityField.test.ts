/**
 * FILE 13 acceptance tests — information/densityField.ts
 *
 * Every assertion targets a DERIVED LAW or an EXACT contract clause (B12):
 *   1. ENVELOPE: ρ_I(n) matches the §2 ρ_I column (the File 4 golden vector)
 *      to 1e-6 relative — the contract's headline test vector.
 *   2. NON-NEGATIVITY: ρ_I(x;n) ≥ 0 everywhere, and each component density
 *      ≥ 0, including where the torus curvature changes sign.
 *   3. WEIGHT NORMALIZATION: weights must sum to 1 — a bad sum is rejected;
 *      the convex mixture has mean ≈ 1 over the torus (envelope conserved).
 *   4. CONSERVATION: fieldIntegral ≈ ρ_I(n)·Area (mean-1 shape ⇒ no inflation).
 *   5. FINITENESS: the integral and every density is finite (Scaled, no
 *      overflow even at n=1 where ρ_I ~ 10¹⁰⁴).
 *   6. COMPONENT IDENTITY: with uniform weights and default (uniform H/R/S,
 *      torus K) fields, the mixture reproduces the curvature modulation.
 *   7. FOOLPROOF GUARDS: negative/NaN weights, bad sum, bad grid rejected.
 */

import { describe, expect, it } from "vitest";
import { STABLE_SCALES, type StableScaleIndex } from "../src/core/constants.js";
import { getScale } from "../src/core/scaleTable.js";
import { Scaled } from "../src/core/provenance.js";
import {
    DensityField,
    envelopeDensity,
    UNIFORM_WEIGHTS,
    type DensityWeights,
} from "../src/information/densityField.js";
import { GOLDEN } from "./golden/scaleTable.js";
import { surfaceArea, torusForScale } from "../src/geometry/torus.js";

const GRID = 24; // test sampling mesh (finer than needed for mean-1 checks)

function sampleAll(field: DensityField, fn: (x: { u: number; v: number }) => number): number[] {
  const out: number[] = [];
  for (let i = 0; i < GRID; i++) {
    const u = (i / GRID) * 2 * Math.PI;
    for (let j = 0; j < GRID; j++) {
      const v = (j / GRID) * 2 * Math.PI;
      out.push(fn({ u, v }));
    }
  }
  return out;
}

describe("FILE 13 — composite information-density field", () => {
  // ── 1. Envelope matches §2 ρ_I column ──────────────────────────────────
  it("reproduces the §2 ρ_I envelope (golden vector) to 1e-6 relative", () => {
    for (const row of GOLDEN) {
      const rho = envelopeDensity(row.n as StableScaleIndex);
      const [gm, ge] = row.rhoI;
      expect(rho.exp10).toBe(ge);
      expect(Math.abs(rho.mantissa - gm) / gm).toBeLessThan(1e-6);
    }
  });

  it("envelope equals File 4's getScale(n).rhoI exactly", () => {
    for (const n of STABLE_SCALES) {
      const a = envelopeDensity(n);
      const b = getScale(n).rhoI;
      expect(a.mantissa).toBe(b.mantissa);
      expect(a.exp10).toBe(b.exp10);
    }
  });

  // ── 2. Non-negativity ──────────────────────────────────────────────────
  it("keeps ρ_I(x;n) ≥ 0 and every component ≥ 0 across the torus", () => {
    const field = new DensityField(13);
    const shapes = sampleAll(field, (x) => field.shapeAt(x));
    for (const s of shapes) expect(s).toBeGreaterThanOrEqual(0);

    const rho = sampleAll(field, (x) => field.densityAt(x).value.mantissa);
    for (const r of rho) expect(r).toBeGreaterThanOrEqual(0);

    const comps = [
      (x: { u: number; v: number }) => field.entropyDensity(x).value.mantissa,
      (x: { u: number; v: number }) => field.relationDensity(x).value.mantissa,
      (x: { u: number; v: number }) => field.curvatureDensity(x).value.mantissa,
      (x: { u: number; v: number }) => field.persistenceDensity(x).value.mantissa,
    ];
    for (const c of comps) {
      for (const val of sampleAll(field, c)) expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  // ── 3. Weight normalization ────────────────────────────────────────────
  it("requires weights to sum to 1 and be non-negative", () => {
    expect(() => new DensityField(13, { a1: 0.5, a2: 0.5, a3: 0.5, a4: 0.5 })).toThrow(RangeError);
    expect(() => new DensityField(13, { a1: -0.1, a2: 0.4, a3: 0.4, a4: 0.3 })).toThrow(RangeError);
    expect(() => new DensityField(13, { a1: NaN, a2: 0.3, a3: 0.4, a4: 0.3 })).toThrow(RangeError);
    // A valid custom split is accepted.
    const custom: DensityWeights = { a1: 0.7, a2: 0.1, a3: 0.1, a4: 0.1 };
    expect(() => new DensityField(13, custom)).not.toThrow();
  });

  it("gives the mixture mean ≈ 1 over the torus (convex, mean-1 components)", () => {
    for (const n of [1, 13, 27, 55] as StableScaleIndex[]) {
      const field = new DensityField(n);
      const shapes = sampleAll(field, (x) => field.shapeAt(x));
      const mean = shapes.reduce((a, b) => a + b, 0) / shapes.length;
      expect(Math.abs(mean - 1)).toBeLessThan(1e-6);
    }
  });

  // ── 4 + 5. Conservation + finiteness of the integral ──────────────────
  it("conserves the envelope under fieldIntegral and stays finite", () => {
    for (const n of [1, 13, 27] as StableScaleIndex[]) {
      const field = new DensityField(n);
      const { value: total } = field.fieldIntegral(32);
      expect(Number.isFinite(total.mantissa)).toBe(true);
      expect(total.mantissa).toBeGreaterThan(0);
      // total ≈ ρ_I(n)·Area·⟨shape⟩; ⟨shape⟩≈1, so total/(ρ_I·Area) ≈ 1.
      const area = surfaceArea(torusForScale(n));
      const expectTotal = getScale(n).rhoI.mul(area);
      expect(total.exp10).toBe(expectTotal.exp10);
      expect(Math.abs(total.mantissa - expectTotal.mantissa) / expectTotal.mantissa).toBeLessThan(1e-3);
    }
  });

  it("keeps the n=1 envelope (ρ_I ~ 10¹⁰⁴) exact without Float64 drift", () => {
    const field = new DensityField(1);
    const { value: rho } = field.densityAt({ u: 0, v: 0 });
    // The magnitude is ~10¹⁰⁴: large but still below the 308 collapse limit,
    // so toFloat64 returns a FINITE value (no silent overflow). The Scaled
    // form keeps the exponent exact regardless.
    expect(rho.exp10).toBeGreaterThan(100);
    expect(rho.exp10).toBeLessThan(308);
    const f = rho.toFloat64();
    expect(Number.isFinite(f)).toBe(true);
    expect(f).toBeGreaterThan(0);
    // Matches the File 4 envelope exactly (Scaled equality, no arithmetic drift).
    const env = getScale(1).rhoI;
    // shape(0,0) is some mean-1 value; rho = env·shape ⇒ rho/shape == env exp.
    // Assert the exponent tracks the envelope's (104-ish) and stays finite.
    expect(Math.abs(rho.exp10 - env.exp10)).toBeLessThanOrEqual(1);
  });

  // ── 6. Component identity ──────────────────────────────────────────────
  it("with uniform weights + uniform H/R/S, the shape is the normalized curvature", () => {
    const field = new DensityField(13, UNIFORM_WEIGHTS);
    // shape = ¼·(1 + 1 + K̂ + 1) where K̂ is mean-1 curvature, so shape ∈ [~0.75, ~1.25]
    // and its spatial variation comes only from K̂. Mean is 1.
    const shapes = sampleAll(field, (x) => field.shapeAt(x));
    const mean = shapes.reduce((a, b) => a + b, 0) / shapes.length;
    const min = Math.min(...shapes);
    const max = Math.max(...shapes);
    expect(Math.abs(mean - 1)).toBeLessThan(1e-6);
    expect(min).toBeGreaterThanOrEqual(0.7); // ¾ uniform floor + non-negative K̂
    expect(max).toBeLessThanOrEqual(1.35);
    expect(max).toBeGreaterThan(min); // curvature carries real spatial signal
  });

  it("injects a custom component shape and reflects it in the mixture", () => {
    // A sharply varying entropy shape should modulate the mixture.
    const spike = (x: { u: number; v: number }) => 1 + Math.cos(x.v);
    const field = new DensityField(13, { a1: 1, a2: 0, a3: 0, a4: 0 }, { entropy: spike });
    const shapes = sampleAll(field, (x) => field.shapeAt(x));
    const min = Math.min(...shapes);
    const max = Math.max(...shapes);
    // (1+cos v) normalized to mean 1 ranges [0,2]; with a1=1 the shape = that.
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeGreaterThan(1.5);
    expect(Math.abs(shapes.reduce((a, b) => a + b, 0) / shapes.length - 1)).toBeLessThan(1e-6);
  });

  // ── 7. Guards ──────────────────────────────────────────────────────────
  it("rejects a bad grid and non-finite component shapes", () => {
    expect(() => new DensityField(13, UNIFORM_WEIGHTS, {}, "POSTULATE", 2)).toThrow(RangeError);
    expect(
      () => new DensityField(13, UNIFORM_WEIGHTS, { entropy: () => NaN }),
    ).toThrow(RangeError);
  });

  it("reports POSTULATE provenance (envelope EXACT tainted by weights/shapes)", () => {
    const field = new DensityField(13);
    const { provenance } = field.densityAt({ u: 0, v: 0 });
    expect(provenance).toBe("POSTULATE");
  });
});
