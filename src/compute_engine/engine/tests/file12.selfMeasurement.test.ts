/**
 * FILE 12 acceptance tests — dynamics/selfMeasurement.ts
 *
 * Every assertion targets a DERIVED LAW or an EXACT contract clause (B12):
 *   1. BOUND: C ∈ [0,1] for arbitrary finite fields, including degenerate ones.
 *   2. PHASE-LOCKED ⇒ C ≈ 1. A field proportional to its golden-delayed past
 *      (same spatial pattern, scaled) has cos²θ = 1.
 *   3. DECORRELATED ⇒ C ≈ 0. An orthogonal pattern has cos²θ = 0.
 *   4. THRESHOLD EXACTLY φ⁻², EXCLUSIVE: C just below does not ignite, C just
 *      above does, C == φ⁻² exactly does NOT (boundary is >, not ≥).
 *   5. GOLDEN DELAY = φ·τ, NOT τ: the look-back index is t−φ (irrational),
 *      verified by constructing a field whose value at t−φ is known exactly.
 *   6. IGNITION STATS: count / mean / min / max / spacing / rate on a known
 *      event sequence; empty sequence ⇒ honest zeros (no NaN).
 *   7. FOOLPROOF GUARDS: malformed history, out-of-range tIndex, non-finite C
 *      all rejected before any arithmetic.
 */

import { describe, expect, it } from "vitest";
import { PHI, PHI_NEG2 } from "../src/core/constants.js";
import {
    detectIgnition,
    exceedsThreshold,
    GOLDEN_DELAY_FACTOR,
    IGNITION_THRESHOLD,
    ignitionEvents,
    selfOverlap,
    type FieldHistory,
    type IgnitionEvent,
} from "../src/dynamics/selfMeasurement.js";

// ── helpers ────────────────────────────────────────────────────────────────

/** Build a uniform-τ history from per-snapshot spatial patterns. */
function hist(snapshots: number[][], tau = 1): FieldHistory {
  return { snapshots, tau };
}

/** A smooth spatial pattern over `len` nodes. */
function pattern(len: number, fn: (j: number) => number): number[] {
  return Array.from({ length: len }, (_, j) => fn(j));
}

describe("FILE 12 — golden-delay self-measurement", () => {
  // ── 1. Bound C ∈ [0,1] ─────────────────────────────────────────────────
  it("keeps C within [0,1] for arbitrary finite fields", () => {
    const len = 32;
    const snapshots = [
      pattern(len, (j) => Math.sin(j)),
      pattern(len, (j) => Math.cos(j * 1.7)),
      pattern(len, (j) => Math.sin(j * 0.3) + 0.5 * Math.cos(j)),
      pattern(len, (j) => Math.exp(-j / 10)),
    ];
    const h = hist(snapshots);
    // Only t ≥ φ has a valid golden-delayed look-back; start there.
    const t0 = Math.ceil(PHI);
    for (let t = t0; t < snapshots.length; t++) {
      const { value: C } = selfOverlap(h, t);
      expect(C).toBeGreaterThanOrEqual(0);
      expect(C).toBeLessThanOrEqual(1);
      expect(Number.isFinite(C)).toBe(true);
    }
  });

  it("returns 0 (orthogonal by convention) for a degenerate zero field", () => {
    // The golden-delayed look-back from tIndex=2 is backIndex = 2−φ ≈ 0.382,
    // interpolating snapshots 0 and 1. Make that bracket the ZERO field so the
    // delayed field is zero regardless of the interpolation weight; "now" is a
    // nonzero field. Zero direction ⇒ overlap 0 by convention.
    const h: FieldHistory = {
      tau: 1,
      snapshots: [
        [0, 0], // s0
        [0, 0], // s1 → delayed = interp(s0,s1) = (0,0)
        [5, 7], // s2 = "now", nonzero
      ],
    };
    const { value: C } = selfOverlap(h, 2);
    expect(C).toBe(0);
  });

  // ── 2. Phase-locked ⇒ C ≈ 1 ────────────────────────────────────────────
  it("gives C ≈ 1 when the field is proportional to its golden-delayed past", () => {
    const len = 24;
    // Constant spatial pattern across all snapshots (any look-back lands on
    // the same direction) — only the amplitude grows. cos²θ = 1 exactly.
    const base = pattern(len, (j) => Math.sin((j / len) * 2 * Math.PI));
    const snapshots = [base, base.map((v) => 2 * v), base.map((v) => 3 * v), base.map((v) => 4 * v)];
    const h = hist(snapshots);
    const { value: C } = selfOverlap(h, 3);
    expect(C).toBeCloseTo(1, 12);
  });

  // ── 3. Decorrelated ⇒ C ≈ 0 ────────────────────────────────────────────
  it("gives C ≈ 0 when present and golden-delayed past are orthogonal", () => {
    // Two-node patterns are the cleanest way to force exact orthogonality:
    // present = (1,0), delayed = (0,1) ⇒ dot = 0 ⇒ C = 0.
    // Construct a history whose snapshot at the golden-delayed index is (0,1)
    // and whose "now" snapshot is (1,0). With φ·τ look-back from tIndex=2 and
    // τ=1, backIndex = 2−φ ≈ 0.382, interpolating snapshots 0 and 1. Choose
    // snapshots 0,1 such that the interpolation is exactly (0,1):
    //   (1−0.382)·s0 + 0.382·s1 = (0,1). Take s0 = s1 = (0,1) ⇒ delayed=(0,1).
    const h: FieldHistory = {
      tau: 1,
      snapshots: [[0, 1], [0, 1], [1, 0]],
    };
    const { value: C } = selfOverlap(h, 2);
    expect(C).toBeCloseTo(0, 12);
  });

  // ── 4. Threshold exactly φ⁻², exclusive ────────────────────────────────
  it("sets the threshold at exactly φ⁻²", () => {
    expect(IGNITION_THRESHOLD).toBe(PHI_NEG2);
    expect(GOLDEN_DELAY_FACTOR).toBe(PHI);
  });

  it("treats the threshold as EXCLUSIVE (C > φ⁻², not ≥)", () => {
    expect(exceedsThreshold(PHI_NEG2)).toBe(false); // exactly on ⇒ no ignition
    expect(exceedsThreshold(PHI_NEG2 - 1e-12)).toBe(false); // just below
    expect(exceedsThreshold(PHI_NEG2 + 1e-12)).toBe(true); // just above
    expect(exceedsThreshold(1)).toBe(true);
    expect(exceedsThreshold(0)).toBe(false);
  });

  // ── 5. Golden delay = φ·τ, not τ ───────────────────────────────────────
  it("looks back by φ samples (irrational), not by 1 sample", () => {
    // A field growing linearly in time with a constant spatial shape lets us
    // read the DELAY directly off the overlap-free amplitude. Use a 1-node
    // field (direction is trivially locked, C = 1) and instead verify the
    // interpolation landed at the φ index by checking a 2-node construction
    // where the two nodes grow at different rates.
    //
    // Simpler exact probe: snapshots are CONSTANT-in-space but step in time as
    // s[k] = k (node value = snapshot index). With τ=1, tIndex=2, backIndex =
    // 2−φ. The golden-delayed value is (1−frac)·s0 + frac·s1 where frac =
    // (2−φ)−0 = 2−φ ≈ 0.382: value = (1−0.382)·0 + 0.382·1 = 2−φ.
    // The present value is s2 = 2. cos²θ for a 1-node field is 1 regardless,
    // so instead assert the interpolation via a 2-node field with an
    // orthogonal structure is overkill — we directly test goldenDelayedField
    // behaviour through selfOverlap on a crafted 2-node field below.
    //
    // Crafted check: nodes encode (time, 1). present=(2,1); delayed should be
    // (2−φ, 1). dot = 2(2−φ)+1; norms √(5)·√((2−φ)²+1). We compute expected C.
    const frac = 2 - PHI; // ≈ 0.381966 = φ⁻² (a golden identity: 2−φ = φ⁻²)
    const h: FieldHistory = {
      tau: 1,
      snapshots: [
        [0, 1], // s0 = (0,1)
        [1, 1], // s1 = (1,1)
        [2, 1], // s2 = (2,1)  "now"
      ],
    };
    const { value: C } = selfOverlap(h, 2);
    // delayed = (1−frac)·(0,1) + frac·(1,1) = (frac, 1)
    const dx = frac;
    const dy = 1;
    const dot = 2 * dx + 1 * dy;
    const na = 2 * 2 + 1 * 1;
    const nb = dx * dx + dy * dy;
    const expected = (dot / (Math.sqrt(na) * Math.sqrt(nb))) ** 2;
    expect(C).toBeCloseTo(expected, 12);
    // Sanity: the golden identity 2−φ = φ⁻² used above really holds.
    expect(frac).toBeCloseTo(PHI_NEG2, 12);
  });

  it("rejects a look-back that falls before the start of history", () => {
    const h = hist([
      [1, 2],
      [3, 4],
    ]);
    // tIndex=0 → backIndex = −φ < 0 → cannot look back.
    expect(() => selfOverlap(h, 0)).toThrow(RangeError);
  });

  // ── 6. Ignition events + statistics ────────────────────────────────────
  it("detects ignition events where C exceeds φ⁻² and computes their statistics", () => {
    // A phase-locked history: every snapshot is the same direction ⇒ C ≈ 1
    // everywhere ⇒ every scanned sample ignites.
    const len = 12;
    const base = pattern(len, (j) => Math.cos((j / len) * 2 * Math.PI));
    const snapshots = Array.from({ length: 6 }, (_, k) => base.map((v) => (k + 1) * v));
    const h = hist(snapshots);
    const events = ignitionEvents(h);
    // Samples whose backIndex ≥ 0 ignite: t−φ ≥ 0 ⇒ t ≥ φ ⇒ t ∈ {2,3,4,5}.
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.overlap).toBeGreaterThan(PHI_NEG2);
    }
    const stats = detectIgnition(events, 6);
    expect(stats.count).toBe(events.length);
    expect(stats.meanOverlap).toBeCloseTo(1, 6);
    expect(stats.minOverlap).toBeGreaterThan(PHI_NEG2);
    expect(stats.maxOverlap).toBeLessThanOrEqual(1);
    expect(stats.rate).toBeCloseTo(events.length / 6, 12);
    if (events.length >= 2) {
      expect(stats.meanSpacing).toBeGreaterThan(0);
    }
  });

  it("returns honest zeros (no NaN) for an empty event list", () => {
    const stats = detectIgnition([]);
    expect(stats.count).toBe(0);
    expect(stats.meanOverlap).toBe(0);
    expect(stats.minOverlap).toBe(0);
    expect(stats.maxOverlap).toBe(0);
    expect(stats.meanSpacing).toBe(0);
    expect(stats.rate).toBe(0);
  });

  it("computes spacing and rate from a hand-built event sequence", () => {
    const events: IgnitionEvent[] = [
      { tIndex: 2, overlap: 0.5 },
      { tIndex: 4, overlap: 0.7 },
      { tIndex: 9, overlap: 0.9 },
    ];
    const stats = detectIgnition(events, 10);
    expect(stats.count).toBe(3);
    expect(stats.meanOverlap).toBeCloseTo((0.5 + 0.7 + 0.9) / 3, 12);
    expect(stats.minOverlap).toBeCloseTo(0.5, 12);
    expect(stats.maxOverlap).toBeCloseTo(0.9, 12);
    // spacings 2 and 5 → mean 3.5
    expect(stats.meanSpacing).toBeCloseTo(3.5, 12);
    expect(stats.rate).toBeCloseTo(3 / 10, 12);
  });

  // ── 7. Foolproof guards ────────────────────────────────────────────────
  it("rejects malformed history before any arithmetic", () => {
    // fewer than 2 snapshots
    expect(() => selfOverlap(hist([[1, 2]]))).toThrow(RangeError);
    // ragged snapshots
    expect(() => selfOverlap(hist([[1, 2], [1, 2, 3]]))).toThrow(RangeError);
    // non-finite node
    expect(() => selfOverlap(hist([[1, NaN], [1, 2]]))).toThrow(RangeError);
    // bad tau
    expect(() => selfOverlap({ snapshots: [[1, 2], [3, 4]], tau: 0 })).toThrow(RangeError);
    // tIndex out of range
    expect(() => selfOverlap(hist([[1, 2], [3, 4]]), 5)).toThrow(RangeError);
    // non-finite C to threshold
    expect(() => exceedsThreshold(NaN)).toThrow(RangeError);
  });
});
