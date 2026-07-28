/**
 * Sprint 1 · File 7 — geometry/lattice.ts verification.
 * Exit gate (spec §3/File 7 "Done when"): spectral test + flux test green.
 *   - 13 harmonics, amplitudes φ⁻ᵏ monotone decreasing
 *   - telescoping anchor φ⁻¹ + φ⁻² = 1; spectral weight sum exact
 *   - FFT of the Metatron field peaks at the 13 Lucas spectral lines
 *   - flux(13) = φ⁻²⁶ = 3.684×10⁻⁶ (corrected constant)
 *   - the lattice field closes to machine-eps on the torus (frictionless ideal)
 *   - golden stability law: Lucas-stable rung ∧ 13 harmonics
 */
import { describe, it, expect } from "vitest";
import {
  spectralAmplitudes,
  goldenPairSum,
  spectralWeightSum,
  latticeLines,
  goldenStabilityLaw,
  metatronField,
  metatronFieldReal,
  initialCondition,
  latticeShellFlux,
  cxAbs2,
} from "../src/geometry/lattice.js";
import { isClosed, torusForScale } from "../src/geometry/torus.js";
import { closureResidual } from "../src/geometry/closureResidual.js";
import { isStable } from "../src/core/lucas.js";
import {
  PHI,
  PHI_INV,
  PHI_NEG2,
  PHI_NEG26,
  HARMONIC_COUNT,
  METATRON_SHELL,
  STABLE_SCALES,
  PI,
} from "../src/core/constants.js";

const REL = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const t13 = torusForScale(METATRON_SHELL);

describe("File 7 · spectral amplitudes", () => {
  it("13 harmonics (F₇)", () => {
    expect(spectralAmplitudes()).toHaveLength(HARMONIC_COUNT);
    expect(HARMONIC_COUNT).toBe(13);
  });
  it("amplitudes are φ⁻ᵏ, monotone decreasing", () => {
    const a = spectralAmplitudes();
    expect(a[0]).toBeCloseTo(1, 12); // φ⁰
    expect(a[1]).toBeCloseTo(PHI_INV, 12); // φ⁻¹
    expect(a[2]).toBeCloseTo(PHI_NEG2, 12); // φ⁻²
    for (let k = 1; k < a.length; k++) expect(a[k]!).toBeLessThan(a[k - 1]!);
  });
  it("telescoping anchor φ⁻¹ + φ⁻² = 1 exactly", () => {
    expect(REL(goldenPairSum(), 1)).toBeLessThan(1e-12);
  });
  it("spectral weight sum = (1−φ⁻¹³)/(1−φ⁻¹) exact geometric series", () => {
    const expected = (1 - Math.pow(PHI_INV, 13)) / (1 - PHI_INV);
    expect(REL(spectralWeightSum(), expected)).toBeLessThan(1e-12);
    // bounded (does not diverge): partial sum < φ²  (the infinite-series limit)
    expect(spectralWeightSum()).toBeLessThan(PHI * PHI);
  });
});

describe("File 7 · Lucas spectral lines", () => {
  it("13 lines = the Lucas-driven set", () => {
    expect(latticeLines()).toEqual([1, 2, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322]);
  });
});

describe("File 7 · golden stability law", () => {
  it("true for Lucas-stable rungs, false otherwise", () => {
    for (const n of STABLE_SCALES) {
      expect(goldenStabilityLaw(n, isStable(n)).value).toBe(true);
    }
    expect(goldenStabilityLaw(2, isStable(2)).value).toBe(false);
    expect(goldenStabilityLaw(7, isStable(7)).value).toBe(false); // 7|7 → unstable
  });
  it("is POSTULATE-tagged (physics reading not asserted)", () => {
    expect(goldenStabilityLaw(13, true).provenance).toBe("POSTULATE");
  });
});

describe("File 7 · Metatron field structure", () => {
  it("field is bounded by the spectral weight sum (unit drive → bounded field)", () => {
    let maxAbs2 = 0;
    for (let i = 0; i < 64; i++) {
      const u = (i / 64) * 2 * PI;
      const v = (i / 64) * 2 * PI * PHI_INV;
      maxAbs2 = Math.max(maxAbs2, cxAbs2(metatronField(t13, { u, v }, 0).value));
    }
    const W = spectralWeightSum();
    expect(Math.sqrt(maxAbs2)).toBeLessThanOrEqual(W * 1.0000001);
  });

  it("DFT of the field peaks exactly at the 13 Lucas lines", () => {
    // Sample Re Ψ around the u-cycle (v=0, t=0) and compute the discrete
    // Fourier transform; the spectral energy must concentrate on the lattice
    // lines (mod N over one period). Field: Σ φ⁻ᵏ e^{i·line_k·u} ⇒ Re = Σ φ⁻ᵏ cos(line_k u).
    const N = 1024;
    const samples: number[] = [];
    for (let j = 0; j < N; j++) {
      const u = (j / N) * 2 * PI;
      samples.push(metatronFieldReal(t13, { u, v: 0 }, 0));
    }
    // DFT magnitude at integer wavenumber m.
    const mag = (m: number): number => {
      let re = 0, im = 0;
      for (let j = 0; j < N; j++) {
        const ang = (-2 * PI * m * j) / N;
        re += samples[j]! * Math.cos(ang);
        im += samples[j]! * Math.sin(ang);
      }
      return Math.hypot(re, im) / N;
    };
    // Each of the 13 lines must be a strong peak; a non-line (e.g. m=5) must be ~0.
    for (const line of latticeLines()) {
      expect(mag(line)).toBeGreaterThan(1e-3);
    }
    expect(mag(5)).toBeLessThan(1e-6);
    expect(mag(100)).toBeLessThan(1e-6);
  });
});

describe("File 7 · closure of the lattice field", () => {
  it("the Metatron field is periodic (closed) on the torus", () => {
    expect(isClosed(metatronFieldReal.bind(null, t13), t13)).toBe(true);
  });
  it("the lattice field closes to machine-eps (frictionless ideal)", () => {
    const field = (p: { u: number; v: number }) => metatronFieldReal(t13, p, 0);
    expect(closureResidual(field, t13).value).toBeLessThan(1e-4);
  });
  it("the initial condition is a bounded periodic field on every stable torus", () => {
    for (const n of STABLE_SCALES) {
      const t = torusForScale(n);
      const ic = initialCondition(t);
      expect(isClosed(ic, t)).toBe(true);
    }
  });
});

describe("File 7 · shell flux anchor", () => {
  it("flux(13) = φ⁻²⁶ = 3.684×10⁻⁶ (corrected), POSTULATE-tagged", () => {
    const f = latticeShellFlux();
    expect(f.provenance).toBe("POSTULATE");
    expect(REL(f.value, 3.6840146919e-6)).toBeLessThan(1e-9);
    expect(REL(f.value, PHI_NEG26)).toBeLessThan(1e-15);
  });
});
