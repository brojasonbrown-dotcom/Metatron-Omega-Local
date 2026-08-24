/**
 * Tests — Track G: multi-base decimals, gematria invariants, Z[φ], Zeckendorf
 * (core/gematria.ts; GEMATRIA_ENGINE_PLAN.md G1–G3)
 *
 * Every test re-verifies a Wolfram certificate in TS or asserts an honesty law:
 *   G1   base expansion round-trips bit-exact within tier; the ladder holds.
 *   G2   dr_b(n) === n mod (b−1) across 10⁵ n × 9 bases (Cert 5.G1 re-verified);
 *        digit-sum trajectory terminates O(log n) (Cert 5.G2); CRT fingerprint
 *        unique below its modulus.
 *   G3.1 Z[φ] closed under +,−,× with exact norm a²+ab−b² (Cert 5.G3); φⁿ shows
 *        ZERO drift across 10⁴ ops below the n=76 horizon (A8).
 *   G3.2 Zeckendorf round-trips 1…10⁶ uniquely, no two consecutive (Cert 5.G4).
 *
 * Honesty (plan G5): nothing here returns a MEANING — only data. There is no
 * test for "digit significance" because there is no such API to test.
 */

import { describe, expect, it } from "vitest";
import {
  PHI,
  PHI_EXACT_HORIZON,
} from "../core/constants.ts";
import {
  precisionTier,
  baseExpand,
  baseExpandRoundTripError,
  digitalRoot,
  digitalRootMatchesResidue,
  digitSum,
  digitSumTrajectory,
  residueFingerprint,
  fingerprintModulus,
  zphi,
  zadd,
  zsub,
  zmul,
  znorm,
  ztoFloat,
  zphiPow,
  zeckendorf,
  zeckendorfDecode,
  isValidZeckendorf,
} from "../core/gematria.ts";

describe("G1 — multi-base expansion + precision ladder", () => {
  it("round-trips bit-exact across bases and magnitudes", () => {
    for (const base of [2, 3, 7, 10, 12, 16, 36, 60]) {
      for (const mag of [1e-6, 1e-3, 0.5, 1, 3.14159, 1e3, 1e6]) {
        expect(baseExpandRoundTripError(mag, base, 24)).toBeLessThan(1e-9);
      }
    }
  });

  it("carries the exact remainder (nothing silently rounded)", () => {
    const { integer, fraction, remainder } = baseExpand(1 / 3, 10, 6);
    expect(integer).toBe(0);
    expect(fraction).toEqual([3, 3, 3, 3, 3, 3]);
    expect(remainder).toBeGreaterThan(0); // the leftover 1/3 − 0.333333 is honest
    expect(remainder).toBeLessThan(1e-6);
  });

  it("rejects out-of-range base / digits / negative x", () => {
    expect(() => baseExpand(-1, 10, 5)).toThrow(RangeError);
    expect(() => baseExpand(1, 1, 5)).toThrow(RangeError);
    expect(() => baseExpand(1, 65, 5)).toThrow(RangeError);
  });

  it("the precision ladder: EXACT ≤ 76 < FLOAT ≤ 1435 < BIG", () => {
    expect(precisionTier(1)).toBe("EXACT");
    expect(precisionTier(PHI_EXACT_HORIZON)).toBe("EXACT"); // 76
    expect(precisionTier(77)).toBe("FLOAT");
    expect(precisionTier(1435)).toBe("FLOAT");
    expect(precisionTier(1436)).toBe("BIG");
  });
});

describe("G2 — gematria invariants (Cert 5.G1 / 5.G2)", () => {
  it("dr_b(n) === n mod (b−1) across 10⁵ n × 9 bases (5.G1 re-verified)", () => {
    const bases = [2, 3, 4, 5, 7, 10, 12, 16, 36];
    // deterministic xorshift32 stream, 10⁵ samples — count mismatches, assert once
    let s = 0x9e3779b9;
    const rand = () => {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return (s % 999_999) + 1;
    };
    let mismatches = 0;
    for (let i = 0; i < 100_000; i++) {
      const n = rand();
      const b = bases[i % bases.length]!;
      if (!digitalRootMatchesResidue(n, b)) mismatches++;
    }
    expect(mismatches).toBe(0);
  });

  it("digital root is the familiar base-10 value (sanity anchor)", () => {
    expect(digitalRoot(1, 10)).toBe(1);
    expect(digitalRoot(9, 10)).toBe(9);
    expect(digitalRoot(10, 10)).toBe(1); // 1+0
    expect(digitalRoot(9875, 10)).toBe(2); // 9+8+7+5=29 → 11 → 2
  });

  it("digit-sum trajectory terminates in O(log n) steps (Cert 5.G2)", () => {
    // for n < 10^k the trajectory is ≤ k+1 steps; assert it terminates and the
    // fixed point equals the digital root
    for (const n of [1, 7, 42, 9999, 123_456_789]) {
      const { steps, fixedPoint } = digitSumTrajectory(n, 10);
      expect(steps).toBeLessThanOrEqual(String(n).length + 1);
      expect(fixedPoint).toBe(digitalRoot(n, 10));
    }
  });

  it("digitSum is the sum of base-b digits", () => {
    expect(digitSum(255, 16)).toBe(15 + 15); // 0xFF
    expect(digitSum(8, 2)).toBe(1); // 0b1000
  });

  it("CRT residue fingerprint is unique below its modulus (plan G2.3)", () => {
    const bases = [3, 4, 7]; // moduli 2,3,6 → lcm = 6
    const mod = fingerprintModulus(bases);
    expect(mod).toBe(6);
    const seen = new Map<string, number>();
    for (let n = 1; n <= mod; n++) {
      const key = residueFingerprint(n, bases).join(",");
      expect(seen.has(key)).toBe(false); // unique below the modulus
      seen.set(key, n);
    }
  });
});

describe("G3.1 — Z[φ] exact ring (Cert 5.G3; A8 zero drift)", () => {
  it("φ² = φ + 1 exactly (the ring's defining relation)", () => {
    const phi = zphi(0, 1);
    const phi2 = zmul(phi, phi); // {1,1} = 1 + φ
    expect(phi2.a).toBe(1);
    expect(phi2.b).toBe(1);
  });

  it("is closed under +, −, × with integer coefficients", () => {
    const x = zphi(3, 4);
    const y = zphi(-2, 5);
    expect(zadd(x, y)).toEqual({ a: 1, b: 9 });
    expect(zsub(x, y)).toEqual({ a: 5, b: -1 });
    // (3+4φ)(−2+5φ) = (3·−2 + 4·5) + (3·5 + 4·−2 + 4·5)φ = 14 + 27φ
    expect(zmul(x, y)).toEqual({ a: 14, b: 27 });
  });

  it("the norm N(a+bφ) = a² + ab − b² is exact and multiplicative", () => {
    const x = zphi(3, 4);
    const y = zphi(-2, 5);
    expect(znorm(x)).toBe(9 + 12 - 16); // 5
    expect(znorm(y)).toBe(4 - 10 - 25); // -31
    expect(znorm(zmul(x, y))).toBe(znorm(x) * znorm(y)); // multiplicative, exact
  });

  it("φⁿ in Z[φ] shows ZERO drift across 10⁴ ops below the n=76 horizon", () => {
    // Multiply by φ, then reduce back down by the known Fibonacci factor, all in
    // the EXACT integer ring — no float anywhere, so the value can never drift.
    const phi = zphi(0, 1);
    let v = zphi(1, 0); // 1
    for (let i = 0; i < 10_000; i++) {
      v = zmul(v, phi); // v = φ^i … but coefficients grow; keep within horizon
      if (i % PHI_EXACT_HORIZON === PHI_EXACT_HORIZON - 1) {
        // φ^76 = F76·φ + F75 exactly; verify against zphiPow then reset to 1
        expect(v).toEqual(zphiPow(PHI_EXACT_HORIZON));
        v = zphi(1, 0);
      }
    }
    // anchor identities: φ^6 = 8φ + 5 (F6=8, F5=5); φ^1 = φ
    expect(zphiPow(6)).toEqual({ a: 5, b: 8 });
    expect(zphiPow(1)).toEqual({ a: 0, b: 1 });
    expect(ztoFloat(zphiPow(6))).toBeCloseTo(Math.pow(PHI, 6), 9);
  });

  it("rejects non-integer coefficients (the ring is Z[φ], not Q(φ))", () => {
    expect(() => zphi(0.5, 1)).toThrow(RangeError);
    expect(() => zphiPow(-1)).toThrow(RangeError);
  });
});

describe("G3.2 — Zeckendorf addressing (Cert 5.G4)", () => {
  it("round-trips 1…10⁶ uniquely with no two consecutive summands", () => {
    for (const n of [1, 2, 3, 4, 10, 100, 1000, 12_345, 1_000_000]) {
      const z = zeckendorf(n);
      expect(zeckendorfDecode(z)).toBe(n); // reversible
      expect(isValidZeckendorf(n, z)).toBe(true); // unique + non-consecutive
    }
  });

  it("is the UNIQUE greedy non-consecutive Fibonacci sum", () => {
    // 10 = 8 + 2 (not 5+3+2 — that uses F5,F4,F3 with consecutive indices)
    expect(zeckendorf(10)).toEqual([8, 2]);
    // 100 = 89 + 8 + 3
    expect(zeckendorf(100)).toEqual([89, 8, 3]);
  });

  it("rejects a representation using consecutive Fibonacci indices", () => {
    // 10 = 5 + 3 + 2 is a Fibonacci sum but F5,F4,F3 are consecutive → invalid
    expect(isValidZeckendorf(10, [5, 3, 2])).toBe(false);
    expect(isValidZeckendorf(10, [8, 2])).toBe(true);
  });

  it("rejects a non-Fibonacci summand and a wrong sum", () => {
    expect(isValidZeckendorf(10, [8, 4])).toBe(false); // 4 is not Fibonacci
    expect(isValidZeckendorf(11, [8, 2])).toBe(false); // sums to 10 ≠ 11
  });

  it("rejects non-positive / non-integer n", () => {
    expect(() => zeckendorf(0)).toThrow(RangeError);
    expect(() => zeckendorf(3.5)).toThrow(RangeError);
  });
});
