/**
 * core/scaleReconciler verification — the dual-registry bridge must:
 *   1. agree with getScale exactly on every stable rung (no drift vs the table),
 *   2. compute the scale law at ARBITRARY n exactly (the mind's larger domain),
 *   3. reconcile any n to its nearest stable rung deterministically,
 *   4. report residual 0 on stable rungs, >0 off-rung,
 *   5. never overflow into Float64 Infinity where Math.pow would (n up to 1434).
 */
import { describe, it, expect } from "vitest";
import {
  nearestStableRung,
  isStableRung,
  scaleLengthAt,
  scaleTimeAt,
  scaleFrequencyAt,
  reconciliationResidual,
  stableRecordAt,
} from "../src/core/scaleReconciler.js";
import { getScale } from "../src/core/scaleTable.js";
import { STABLE_SCALES, PLANCK_LENGTH, C, PHI } from "../src/core/constants.js";
import { stableScalesUpTo } from "../src/core/lucas.js";

describe("scaleReconciler (dual-registry bridge)", () => {
  it("agrees with getScale exactly on all stable rungs", () => {
    for (const n of STABLE_SCALES) {
      const viaTable = getScale(n).L;
      const viaReconciler = scaleLengthAt(n);
      expect(viaReconciler.equals(viaTable)).toBe(true);
    }
  });

  it("computes the scale law at arbitrary (non-stable) n exactly", () => {
    for (const n of [0, 2, 60, 96, 200, 292]) {
      const L = scaleLengthAt(n);
      // independent ground truth: ℓ_P · φⁿ computed in float (finite here)
      const expected = PLANCK_LENGTH * Math.pow(PHI, n);
      const got = L.toFloat64();
      expect(Math.abs(got - expected) / expected).toBeLessThan(1e-9);
    }
  });

  it("reconciles any n to its nearest stable rung, ties break downward", () => {
    expect(nearestStableRung(1)).toBe(1);
    expect(nearestStableRung(13)).toBe(13);
    // 96 is not stable; nearest stable rung is 97 (stable) — |97-96|=1 beats |85-96|=11
    expect(nearestStableRung(96)).toBe(97);
    // every canonical-ladder scale reconciles to a genuinely stable rung
    for (const n of [0, 96, 120, 134, 168, 192, 235, 250, 270, 292]) {
      const r = nearestStableRung(n);
      expect(r).not.toBeNull();
      expect(isStableRung(r!)).toBe(true);
    }
  });

  it("residual is 0 on stable rungs and >0 off-rung", () => {
    for (const n of STABLE_SCALES) expect(reconciliationResidual(n)).toBe(0);
    expect(reconciliationResidual(96)).toBeGreaterThan(0);
    expect(reconciliationResidual(96)).toBeLessThanOrEqual(1);
  });

  it("never overflows where Math.pow would stay finite (n up to 1434)", () => {
    // φ^1434 ≈ 4.9e299 — finite; the Scaled must represent it without Infinity.
    const L = scaleLengthAt(1434);
    expect(Number.isFinite(L.mantissa)).toBe(true);
    expect(L.exp10).toBeGreaterThan(260);
    // and the value matches the float computation within Float64 tolerance
    const expected = PLANCK_LENGTH * Math.pow(PHI, 1434);
    expect(Math.abs(L.toFloat64() - expected) / expected).toBeLessThan(1e-9);
  });

  it("frequency is the exact reciprocal-law of length (single-sourced C)", () => {
    for (const n of [1, 13, 96, 292]) {
      const f = scaleFrequencyAt(n);
      const L = scaleLengthAt(n);
      // f · L ≡ C in Scaled arithmetic: f·L = (C/L)·L = C exactly
      const product = f.mul(L).toFloat64();
      expect(Math.abs(product - C) / C).toBeLessThan(1e-9);
    }
  });

  it("stableRecordAt returns a record only on stable rungs", () => {
    expect(stableRecordAt(13)).not.toBeNull();
    expect(stableRecordAt(96)).toBeNull();
    // the record matches the canonical table
    expect(stableRecordAt(13)!.L.equals(getScale(13).L)).toBe(true);
  });

  it("covers the full stable range without gaps", () => {
    const all = stableScalesUpTo(125);
    for (const n of all) expect(stableRecordAt(n)).not.toBeNull();
  });
});
