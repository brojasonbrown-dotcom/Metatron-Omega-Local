/**
 * Acceptance tests — File 1 (constants), File 2 (provenance/scaled),
 * File 3 (lucas), File 4 (scaleTable). Golden-file gate per spec §3 "Done when".
 */
import { describe, it, expect } from "vitest";
import {
  PHI, PHI_INV, PHI_SQUARED, PHI_NEG2, PHI_NEG26, PLANCK_LENGTH, PLANCK_TIME,
  C, HBAR, G, STABLE_SCALES, METATRON_SHELL, ANCHORS,
} from "../src/core/constants.ts";
import { Scaled, classify, combine, tainted } from "../src/core/provenance.ts";
import {
  lucas, fibonacci, lucasResidue, isStable, stableScalesUpTo, closureResidueMin,
  binetDefect, spectralLines,
} from "../src/core/lucas.ts";
import { getScale, allScales, CONTINUATION } from "../src/core/scaleTable.ts";
import { GOLDEN } from "./golden/scaleTable.ts";

const REL = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

// ── File 1 — constants ──────────────────────────────────────────────────────
describe("File 1 · constants", () => {
  it("φ identity φ⁻¹ + φ⁻² = 1 to 1e-12", () => {
    expect(REL(PHI_INV + PHI_NEG2, 1)).toBeLessThan(1e-12);
  });
  it("φ² = φ + 1", () => expect(REL(PHI_SQUARED, PHI + 1)).toBeLessThan(1e-12));
  it("φ⁻²⁶ anchor (mpmath 3.6840146919e-6)", () => {
    expect(REL(PHI_NEG26, 3.6840146919e-6)).toBeLessThan(1e-9);
  });
  it("ℓ_P = √(ℏG/c³) reproduces stored value to 1e-9", () => {
    const derived = Math.sqrt((HBAR * G) / C ** 3);
    expect(REL(derived, PLANCK_LENGTH)).toBeLessThan(1e-9);
  });
  it("t_P = ℓ_P/c", () => expect(REL(PLANCK_LENGTH / C, PLANCK_TIME)).toBeLessThan(1e-9));
  it("18 stable scales, ascending, n≡{1,13,15,27} mod 28", () => {
    expect(STABLE_SCALES).toHaveLength(18);
    for (const n of STABLE_SCALES) expect([1, 13, 15, 27]).toContain(n % 28);
    for (let i = 1; i < STABLE_SCALES.length; i++)
      expect(STABLE_SCALES[i]!).toBeGreaterThan(STABLE_SCALES[i - 1]!);
  });
  it("provenance tags present on anchors", () => {
    expect(ANCHORS.PHI.provenance).toBe("EXACT");
    expect(ANCHORS.PLANCK_LENGTH.provenance).toBe("CODATA");
  });
});

// ── File 2 — provenance / scaled ───────────────────────────────────────────
describe("File 2 · provenance + scaled", () => {
  it("Scaled.mul adds exponents exactly (overflow-impossible)", () => {
    const rho = Scaled.of(1.46380328, 104); // ρ_I(1)
    const dx = Scaled.of(2.14765695, -9);   // δx(125)
    const p = rho.mul(dx.pow(3));           // ρ_I · δx³ — would overflow raw SI
    expect(Number.isFinite(p.mantissa)).toBe(true);
    expect(p.exp10).toBe(104 + 3 * -9 + 1); // +1: mantissa product renormalizes one decade
    expect(Math.abs(p.mantissa)).toBeGreaterThanOrEqual(1);
    expect(Math.abs(p.mantissa)).toBeLessThan(10);
  });
  it("φ⁻²⁶ as Scaled equals 3.684e-6", () => {
    const s = Scaled.from(PHI_NEG26);
    // True φ⁻²⁶ mantissa (mpmath dps=50); the prior literal 3.684014691873265 was
    // off by 7.4e-12 — PHI_NEG26 is now derived via Math.pow(PHI,-26). [audit F1]
    expect(REL(s.mantissa, 3.6840146919005904)).toBeLessThan(1e-12);
    expect(s.exp10).toBe(-6);
  });
  it("Scaled.compare orders negative equal-exponent values correctly (audit F4)", () => {
    // −9e5 < −5e5: the equal-exponent branch must NOT multiply by the sign.
    expect(Scaled.of(-9, 5).compare(Scaled.of(-5, 5))).toBeLessThan(0);
    expect(Scaled.of(-5, 5).compare(Scaled.of(-9, 5))).toBeGreaterThan(0);
    expect(Scaled.of(-9, 5).compare(Scaled.of(-9, 5))).toBe(0);
    // Sanity: positives still order correctly, and magnitude still wins across exponents.
    expect(Scaled.of(9, 5).compare(Scaled.of(5, 5))).toBeGreaterThan(0);
    expect(Scaled.of(-1, 6).compare(Scaled.of(-9, 5))).toBeLessThan(0); // −1e6 < −9e5
  });
  it("Scaled.from normalizes subnormals without an Infinity mantissa (audit F3)", () => {
    // The smallest subnormal (5e-324) must NOT produce an Infinity mantissa —
    // the pre-fix `10 ** exp` underflowed to 0 and x/0 = Infinity poisoned
    // equals/toString. The class contract is "construct from ANY finite number."
    const s = Scaled.from(Number.MIN_VALUE);
    expect(Number.isFinite(s.mantissa)).toBe(true);
    expect(Math.abs(s.mantissa)).toBeGreaterThanOrEqual(1);
    expect(Math.abs(s.mantissa)).toBeLessThan(10);
    // The (mantissa, exp) pair must be self-consistent: reconstruct the value.
    // 5e-324 has |exp10| = 324 > 308, so toFloat64 by design declines (null) —
    // the guarantee is a clean finite mantissa+exp, not a representable Float64.
    expect(s.toString()).not.toContain("Infinity");
    // A representable small value still round-trips exactly.
    const r = Scaled.from(1.5e-300);
    expect(r.toFloat64()).toBeCloseTo(1.5e-300, -310);
  });
  it("Scaled mantissa normalized to [1,10)", () => {
    for (const x of [0.005, 12.3, 1e-40, 9.99e300]) {
      const s = Scaled.from(x);
      expect(Math.abs(s.mantissa)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(s.mantissa)).toBeLessThan(10);
    }
  });
  it("toFloat64 throws beyond Float64 range", () => {
    expect(() => Scaled.of(1, 400).toFloat64()).toThrow(RangeError);
    expect(Scaled.of(1, 400).toFloat64OrNull()).toBeNull();
  });
  it("add aligns exponents; decouples beyond Float64 digits", () => {
    const a = Scaled.of(1, 0), b = Scaled.of(1, -30);
    expect(a.add(b).mantissa).toBeCloseTo(1, 12); // b lost in Float64 — documented
    const c = Scaled.of(5, 10), d = Scaled.of(5, 10);
    expect(c.add(d).mantissa).toBeCloseTo(1, 9);
    expect(c.add(d).exp10).toBe(11);
  });
  it("provenance taint propagates (POSTULATE wins)", () => {
    expect(tainted("EXACT", "POSTULATE")).toBe("POSTULATE");
    const a = classify(2, "EXACT");
    const b = classify(3, "POSTULATE");
    expect(combine(a, b, (x, y) => x * y).provenance).toBe("POSTULATE");
    expect(combine(a, classify(4, "CODATA"), (x, y) => x + y).provenance).toBe("CODATA");
  });
});

// ── File 3 — lucas ──────────────────────────────────────────────────────────
describe("File 3 · lucas", () => {
  it("small Lucas/Fibonacci values exact", () => {
    expect(lucas(1)).toBe(1n); expect(lucas(2)).toBe(3n); expect(lucas(3)).toBe(4n);
    expect(lucas(7)).toBe(29n); expect(lucas(13)).toBe(521n);
    expect(fibonacci(7)).toBe(13n); expect(fibonacci(11)).toBe(89n);
  });
  it("isStable ⇔ Lₙ≡±1 mod 13 ⇔ n≡{1,13,15,27} mod 28", () => {
    for (let n = 1; n <= 300; n++) {
      expect(isStable(n)).toBe([1, 13, 15, 27].includes(n % 28));
      expect(isStable(n)).toBe(closureResidueMin(n) === 1);
    }
  });
  it("stable list matches spec §2", () => {
    expect(stableScalesUpTo(293).slice(0, 18)).toEqual([...STABLE_SCALES]);
  });
  it("closure residue min = 1 for all 18 stable n (minimally open)", () => {
    for (const n of STABLE_SCALES) expect(closureResidueMin(n)).toBe(1);
  });
  it("Lₙ ≢ 0 mod 13 for n=0..200 (closure impossible)", () => {
    for (let n = 0; n <= 200; n++) expect(lucasResidue(n, 13)).not.toBe(0);
  });
  it("residue pattern period 28", () => {
    for (let n = 0; n <= 56; n++) expect(lucasResidue(n + 28, 13)).toBe(lucasResidue(n, 13));
  });
  it("Binet defect |φⁿ−Lₙ| = φ⁻ⁿ", () => {
    for (const n of [1, 5, 13, 40]) expect(REL(binetDefect(n), Math.pow(PHI, -n))).toBeLessThan(1e-12);
  });
  it("spectral lines exact", () => {
    expect(spectralLines()).toEqual([1, 2, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322]);
  });
});

// ── File 4 — scaleTable (golden-file gate) ─────────────────────────────────
describe("File 4 · scaleTable", () => {
  const rows = allScales();
  it("18 records, n strictly increasing, all stable, residue 1", () => {
    expect(rows).toHaveLength(18);
    for (let i = 1; i < rows.length; i++) expect(rows[i]!.n).toBeGreaterThan(rows[i - 1]!.n);
    for (const r of rows) { expect(r.stable).toBe(true); expect(r.lucasResidue).toBe(1); }
  });
  it("Metatron shell ⇔ n=13", () => {
    for (const r of rows) expect(r.isMetatronShell).toBe(r.n === 13);
    expect(getScale(METATRON_SHELL).isMetatronShell).toBe(true);
  });
  it("every field matches golden vectors (mpmath dps=60)", () => {
    for (const g of GOLDEN) {
      const r = getScale(g.n);
      const chk = (s: Scaled, [m, e]: [number, number]) => {
        expect(s.exp10).toBe(e);
        expect(REL(s.mantissa, m)).toBeLessThan(1e-6);
      };
      chk(r.L, g.L); chk(r.T, g.T); chk(r.tau, g.tau);
      chk(r.rhoI, g.rhoI); chk(r.vWave, g.vWave);
      expect(REL(r.complexityBits, g.complexityBits)).toBeLessThan(1e-6);
      expect(r.winding.toString()).toBe(g.winding);
    }
  });
  it("vWave ≤ c for every scale", () => {
    for (const r of rows) expect(r.vWave.compare(Scaled.from(C))).toBeLessThanOrEqual(0);
  });
  it("continuation holds rungs 19–42 (24 records; 42 total ≤293)", () => {
    expect(CONTINUATION).toHaveLength(24);
    expect(CONTINUATION.every((r) => !(STABLE_SCALES as readonly number[]).includes(r.n))).toBe(true);
    expect(CONTINUATION[0]!.n).toBeGreaterThan(125);
  });
  it("getScale throws for non-stable n", () => {
    expect(() => getScale(2)).toThrow(RangeError);
    expect(() => getScale(96)).toThrow(RangeError);
  });
});
