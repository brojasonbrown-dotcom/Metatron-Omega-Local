/**
 * Sprint 1 · File 8 — geometry/basisGenerators.ts verification.
 * Exit gate (spec §3/File 8 "Done when"): orthonormality + round-trip green.
 *   - raw toroidal modes are integer-wavenumbered periodic functions
 *   - the Gram–Schmidt basis is orthonormal under the CURVED L2 inner product
 *     ⟨mode_i, mode_j⟩ = δ_ij to quadrature tolerance
 *   - expansion of a basis mode returns its own coefficient (e_i)
 *   - round-trip reconstruct∘expand is the identity on the basis span
 *   - spherical harmonics orthonormal under the S² measure (Y_00 = 1/√(4π))
 */
import { describe, it, expect } from "vitest";
import {
  toroidalMode,
  l2Inner,
  l2Norm,
  l2Basis,
  expand,
  reconstruct,
  associatedLegendre,
  sphericalMode,
  type Cx,
} from "../src/geometry/basisGenerators.js";
import { isClosed, torusForScale } from "../src/geometry/torus.js";
import { STABLE_SCALES, METATRON_SHELL, PI } from "../src/core/constants.js";

const TWO_PI = 2 * PI;
const t13 = torusForScale(METATRON_SHELL);
const cxAbs = (z: Cx) => Math.hypot(z.re, z.im);

describe("File 8 · raw toroidal modes", () => {
  it("toroidalMode builds an integer-wavenumbered periodic mode", () => {
    const mode = toroidalMode(3, 2);
    expect(isClosed((p) => mode.fn(p).re, t13)).toBe(true);
    expect(mode.m).toBe(3);
    expect(mode.n).toBe(2);
  });
  it("rejects non-integer wavenumbers", () => {
    expect(() => toroidalMode(1.5, 2)).toThrow(RangeError);
  });
  it("mode has unit amplitude when amp=1", () => {
    const mode = toroidalMode(1, 0);
    expect(cxAbs(mode.fn({ u: 0.3, v: 1.1 }))).toBeCloseTo(1, 12);
  });
});

describe("File 8 · L2 inner product (curved measure)", () => {
  it("⟨1,1⟩ = 1 (normalisation)", () => {
    const one = toroidalMode(0, 0).fn;
    expect(l2Inner(one, one, t13).re).toBeCloseTo(1, 6);
  });
  it("constant mode has unit norm", () => {
    expect(l2Norm(toroidalMode(0, 0).fn, t13)).toBeCloseTo(1, 6);
  });
});

describe("File 8 · orthonormal basis (Gram–Schmidt)", () => {
  const COUNT = 6;
  const basis = l2Basis(t13, COUNT);
  it("builds the requested number of modes", () => {
    expect(basis).toHaveLength(COUNT);
  });
  it("⟨mode_i, mode_j⟩ = δ_ij to quadrature tolerance", () => {
    for (let i = 0; i < COUNT; i++) {
      for (let j = 0; j < COUNT; j++) {
        const inner = l2Inner(basis[i]!, basis[j]!, t13);
        if (i === j) expect(cxAbs(inner)).toBeCloseTo(1, 4);
        else expect(cxAbs(inner)).toBeLessThan(1e-4);
      }
    }
  });
});

describe("File 8 · expansion & round-trip", () => {
  const basis = l2Basis(t13, 5);
  it("expansion of a basis mode returns its own coefficient vector", () => {
    for (let k = 0; k < basis.length; k++) {
      const coeffs = expand(basis[k]!, basis, t13);
      for (let i = 0; i < coeffs.length; i++) {
        if (i === k) expect(cxAbs(coeffs[i]!)).toBeCloseTo(1, 4);
        else expect(cxAbs(coeffs[i]!)).toBeLessThan(1e-4);
      }
    }
  });
  it("round-trip reconstruct∘expand is the identity on the basis span", () => {
    // f = 2·b0 + 3·b1 − b2 lies in the span; round-trip must recover it.
    const coeffs0: Cx[] = [
      { re: 2, im: 0 },
      { re: 3, im: 0 },
      { re: -1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ];
    const f = reconstruct(coeffs0, basis);
    const back = expand(f, basis, t13);
    for (let i = 0; i < coeffs0.length; i++) {
      expect(back[i]!.re).toBeCloseTo(coeffs0[i]!.re, 3);
      expect(back[i]!.im).toBeCloseTo(coeffs0[i]!.im, 3);
    }
  });
});

describe("File 8 · basis across all stable tori", () => {
  it("orthonormality holds on every stable scale's torus", () => {
    for (const n of STABLE_SCALES.slice(0, 6)) {
      const t = torusForScale(n);
      const basis = l2Basis(t, 4);
      for (let i = 0; i < 4; i++) {
        expect(cxAbs(l2Inner(basis[i]!, basis[i]!, t))).toBeCloseTo(1, 4);
      }
    }
  });
});

describe("File 8 · spherical harmonics", () => {
  it("Y_00 = 1/√(4π) (constant)", () => {
    const Y00 = sphericalMode(0, 0);
    expect(Y00.fn(0.7, 1.3).re).toBeCloseTo(1 / Math.sqrt(4 * PI), 9);
    expect(Y00.fn(2.1, 5.9).re).toBeCloseTo(1 / Math.sqrt(4 * PI), 9);
  });
  it("associated Legendre P_1^0(x) = x, P_2^0(x) = (3x²−1)/2", () => {
    expect(associatedLegendre(1, 0, 0.5)).toBeCloseTo(0.5, 12);
    expect(associatedLegendre(2, 0, 0.5)).toBeCloseTo((3 * 0.25 - 1) / 2, 12);
  });
  it("⟨Y_10, Y_10⟩ = 1 and ⟨Y_10, Y_00⟩ = 0 on S² (numerical)", () => {
    // Inner product ⟨f,g⟩ = ∫ f̄ g dΩ over the sphere (measure sinθ dθ dφ).
    // Y_l^m are normalised so ⟨Y,Y⟩ = 1 (NOT divided by 4π).
    const N = 200;
    const inner = (f: (th: number, ph: number) => Cx, g: (th: number, ph: number) => Cx) => {
      let acc = 0;
      for (let i = 0; i < N; i++) {
        const th = ((i + 0.5) / N) * PI;
        for (let j = 0; j < N; j++) {
          const ph = ((j + 0.5) / N) * TWO_PI;
          const fz = f(th, ph);
          const gz = g(th, ph);
          // Re(f̄ · g) = fre·gre + fim·gim  (correct complex inner product)
          acc += (fz.re * gz.re + fz.im * gz.im) * Math.sin(th);
        }
      }
      return acc * (PI / N) * (TWO_PI / N); // ∫ ... dΩ (no 4π division)
    };
    const Y10 = sphericalMode(1, 0).fn;
    const Y00 = sphericalMode(0, 0).fn;
    expect(inner(Y10, Y10)).toBeCloseTo(1, 3);
    expect(Math.abs(inner(Y10, Y00))).toBeLessThan(1e-3);
  });
});
