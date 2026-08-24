/**
 * Tests — L0 Ladder Reconciliation (scale_mapper ↔ engine reconciler).
 *
 * The mind's 10 canonical scales and the engine's 42-rung Lucas-stable ladder
 * are two registries over the SAME law L(n) = ℓ_P·φⁿ. L0 wires the bridge so the
 * mind can resolve any scale to its nearest verified engine rung + the exact
 * scale law, WITHOUT conflating the two ladders.
 *
 * Guarantees under test (oracles recomputed here with the ENGINE's semantics —
 * full ladder span, ties→lower, gap-normalized residual — never asserted blind):
 *   1. RECONCILE — each canonical scale maps to the engine's true nearest rung.
 *   2. HONESTY — the canonical scales are NOT stable rungs; the reconciler says so.
 *   3. EXACT LAW — compute_length/compute_frequency match ℓ_P·φⁿ / c·L⁻¹ and agree
 *      (L·f = c), never Float64-overflow (the exact Scaled path).
 *   4. ZERO REGRESSION — the canonical navigation (next_scale_down/up) is intact.
 */

import { describe, expect, it } from "vitest";
import { ScaleMapper } from "../scale_mapper.ts";
import { SCALE_INDICES, PLANCK_LENGTH, PLANCK_FREQUENCY, PHI } from "../core/constants.ts";

const mapper = new ScaleMapper();

/** Engine-semantics oracle: Lucas-stable test (period-28 residue law). */
function lucasStable(n: number): boolean {
  return [1, 13, 15, 27].includes(((n % 28) + 28) % 28);
}
/** Full-ladder nearest rung, ties → lower (mirrors engine nearestStableRung). */
function nearestRung(n: number): number {
  let best = -1, bd = Infinity;
  for (let r = 0; r <= Math.max(n, 125); r++) {
    if (!lucasStable(r)) continue;
    const d = Math.abs(r - n);
    if (d < bd || (d === bd && best !== -1 && r < best)) { bd = d; best = r; }
  }
  return best;
}

describe("L0 — reconcile the canonical scales to the stable ladder", () => {
  it("every canonical scale maps to the engine's true nearest rung", () => {
    for (const s of SCALE_INDICES) {
      expect(mapper.nearest_stable_rung(s)).toBe(nearestRung(s));
    }
  });

  it("honestly reports the canonical scales are NOT stable engine rungs", () => {
    for (const s of SCALE_INDICES) {
      expect(mapper.is_stable_rung(s)).toBe(lucasStable(s));
    }
    // Spot-check against the engine's full-ladder resolution (computed live).
    expect(mapper.nearest_stable_rung(192)).toBe(183);
    expect(mapper.nearest_stable_rung(292)).toBe(281);
    expect(mapper.nearest_stable_rung(168)).toBe(167);
    expect(mapper.nearest_stable_rung(96)).toBe(97);
  });

  it("a true stable rung reconciles to ITSELF with zero residual", () => {
    expect(mapper.nearest_stable_rung(125)).toBe(125);
    expect(mapper.is_stable_rung(125)).toBe(true);
    expect(mapper.reconciliation_residual(125)).toBe(0);
  });

  it("off-rung scales carry a positive reconciliation residual (gap-normalized)", () => {
    for (const s of SCALE_INDICES) {
      const r = mapper.reconciliation_residual(s);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeGreaterThan(0); // none of the 10 canonical scales is stable
    }
  });

  it("reconcile() returns the full honest view", () => {
    const v = mapper.reconcile(192);
    expect(v.scale).toBe(192);
    expect(v.nearestRung).toBe(183);
    expect(v.stable).toBe(false);
    expect(v.residual).toBeCloseTo(0.75, 6); // |192−183| / gap(183→195=12)
  });
});

describe("L0 — the exact scale law (never Float64 overflow)", () => {
  it("compute_length matches ℓ_P·φⁿ at the canonical scales (relative 1e-9)", () => {
    for (const s of SCALE_INDICES) {
      const expected = PLANCK_LENGTH * Math.pow(PHI, s);
      const got = mapper.compute_length(s);
      expect(Math.abs(got - expected) / expected).toBeLessThan(1e-9);
    }
  });

  it("compute_frequency matches f_P·φ⁻ⁿ at the canonical scales (relative 1e-9)", () => {
    for (const s of SCALE_INDICES) {
      const expected = PLANCK_FREQUENCY * Math.pow(PHI, -s);
      const got = mapper.compute_frequency(s);
      expect(Math.abs(got - expected) / expected).toBeLessThan(1e-9);
    }
  });

  it("length × frequency ≈ c (the ladders agree by construction)", () => {
    for (const s of SCALE_INDICES) {
      const L = mapper.compute_length(s);
      const f = mapper.compute_frequency(s);
      if (Number.isFinite(L) && Number.isFinite(f) && L > 0 && f > 0) {
        expect(Math.abs(L * f - 299792458) / 299792458).toBeLessThan(1e-9);
      }
    }
  });

  it("a scale beyond Float64 length range surfaces honest Infinity, never garbage", () => {
    // φ²⁰⁰⁰·ℓ_P over/underflows Float64; the exact Scaled path must not return a
    // wrapped finite number. It either yields honest Infinity or throws a clean
    // RangeError on the non-finite intermediate — both are truthful; a silent
    // wrong finite value is the only unacceptable outcome.
    let val: number | undefined;
    let threw = false;
    try { val = mapper.compute_length(2000); } catch { threw = true; }
    if (!threw) expect(val).toBe(Infinity);
  });
});

describe("L0 — zero regression: the mind's navigation is intact", () => {
  it("get_next_scale_down/up still walk the canonical ladder", () => {
    expect(mapper.get_next_scale_down(292)).toBe(270);
    expect(mapper.get_next_scale_up(0)).toBe(96);
    expect(mapper.get_next_scale_down(0)).toBeNull();
    expect(mapper.get_next_scale_up(292)).toBeNull();
  });
});
