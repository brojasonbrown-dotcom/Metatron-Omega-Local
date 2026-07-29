/**
 * phase3.prolongation.test.ts → phase4.restriction.test.ts
 *
 * Phase 4 battery (plan §3 Phase 4; Method Selection Law §8). Restriction is
 * the Galerkin ADJOINT (transpose) of prolongation — R = Pᵀ = P because P is
 * symmetric — so these tests pin the EXACT laws the operator must obey and,
 * just as hard, REFUTE the over-claims the plan's §2.3 invites ("conserves
 * energy and coherence"). As with Phase 3, the honesty tests are load-bearing:
 * they exist so a future refactor cannot silently reintroduce a claim the
 * mathematics does not support.
 *
 * What is proven here (EXACT):
 *   · mass / mean conservation  Σ parent = Σ child   (double stochasticity);
 *   · constant preservation     restrict(C) = C       (rows sum to 1);
 *   · round-trip identity on the constant mode        (eigenvalue 1);
 *   · round-trip attenuation (1−4w)² on zero-mean     (anti-aliasing coarsen);
 *   · restriction is the transpose of prolongation    (R = P, weight-for-weight).
 *
 * What is REFUTED here (so it can never be over-claimed again):
 *   · restriction does NOT conserve the energy of a resolved block;
 *   · restriction does NOT round-trip a sharp feature to identity;
 *   · a PARTIAL restriction is NOT conservation-valid.
 */

import { describe, it, expect } from "vitest";
import { PHI_NEG2 } from "../src/core/constants.js";
import { prolongateBlock, PROLONGATION_WEIGHT } from "../src/refinement/prolongation.js";
import {
  restrictBlock,
  restrictParent,
  restrictionWeights,
  restrictPartial,
  roundTripDefect,
  relativeRoundTripDefect,
  energyRatio,
  restrictionConservationResidual,
  relativeRestrictionResidual,
  RESTRICTION_WEIGHT,
} from "../src/refinement/restriction.js";

const W = RESTRICTION_WEIGHT;
/** (1−4w)² — the proven zero-mean round-trip eigenvalue (P = (1−4w)I + wJ). */
const ATTENUATION = (1 - 4 * W) ** 2;

/** A spread of blocks covering constant, mixed, cancelling and sharp cases. */
const BLOCKS: readonly (readonly number[])[] = [
  [1, 2, 3, 4],
  [0, 0, 0, 0],
  [1e8, -1e8, 1e8, -1e8], // catastrophic cancellation at 1e8
  [-5, 2.5, 0.1, -0.6],
  [3.7, 3.7, 3.7, 3.7], // constant
  [0.1, -0.2, 0.3, -0.4], // zero-mean
  [1, -1, 1, -1], // pure alternating (sharpest resolvable)
  [Number.MIN_VALUE, -Number.MIN_VALUE, Number.MIN_VALUE, -Number.MIN_VALUE], // subnormal
];

describe("Phase 4 · restriction — the adjoint transfer and its exact laws", () => {
  it("exposes the SAME φ⁻²/3 weight as prolongation (one owner, golden rule 2)", () => {
    expect(RESTRICTION_WEIGHT).toBe(PROLONGATION_WEIGHT);
    expect(RESTRICTION_WEIGHT).toBeCloseTo(PHI_NEG2 / 3, 15);
  });

  it("is the transpose of prolongation: restriction weights equal prolongation weights (R = P)", () => {
    // P is symmetric, so R = Pᵀ = P. The per-parent restriction stencil must be
    // weight-for-weight identical to the per-child prolongation stencil.
    for (let slot = 0; slot < 4; slot++) {
      const w = restrictionWeights(slot);
      expect(w[slot]).toBeCloseTo(1 - 3 * W, 15); // self-weight
      for (let r = 0; r < 4; r++) {
        if (r !== slot) expect(w[r]).toBeCloseTo(W, 15); // sibling weight
      }
    }
  });

  it("restriction weights sum to exactly 1 per parent (constant-preserving partition)", () => {
    for (let slot = 0; slot < 4; slot++) {
      expect(restrictionWeights(slot).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    }
  });

  it("conserves the integrated field Σ parent = Σ child to Float64 (relative)", () => {
    for (const block of BLOCKS) {
      expect(relativeRestrictionResidual(block)).toBeLessThan(1e-14);
    }
  });

  it("conserves the block MEAN exactly (mass conservation ÷ 4)", () => {
    for (const block of BLOCKS) {
      const meanC = block.reduce((a, b) => a + b, 0) / 4;
      const meanP = restrictBlock(block).reduce((a, b) => a + b, 0) / 4;
      const scale = Math.max(1, ...block.map((x) => Math.abs(x)));
      expect(Math.abs(meanP - meanC) / scale).toBeLessThan(1e-14);
    }
  });

  it("preserves a constant field EXACTLY: restrict(C,C,C,C) = (C,C,C,C)", () => {
    for (const C of [0, 1, -3.5, 7, 1e6, Number.MIN_VALUE]) {
      const out = restrictBlock([C, C, C, C]);
      for (const v of out) {
        const scale = Math.max(1, Math.abs(C));
        expect(Math.abs(v - C) / scale).toBeLessThan(1e-14);
      }
    }
  });

  it("is LINEAR: restrict(αx + βy) = α·restrict(x) + β·restrict(y)", () => {
    const x = [1, -2, 0.5, 3];
    const y = [0.25, 4, -1, 2];
    const alpha = 2.5;
    const beta = -1.75;
    const combined = x.map((xi, i) => alpha * xi + beta * y[i]!);
    const lhs = restrictBlock(combined);
    const rx = restrictBlock(x);
    const ry = restrictBlock(y);
    const rhs = rx.map((v, i) => alpha * v + beta * ry[i]!);
    for (let i = 0; i < 4; i++) expect(lhs[i]).toBeCloseTo(rhs[i]!, 10);
  });

  it("restrictParent(slot) equals the slot output of restrictBlock", () => {
    const c = [2, -1, 0.5, 3];
    for (let slot = 0; slot < 4; slot++) {
      expect(restrictParent(c, slot)).toBe(restrictBlock(c)[slot]);
    }
  });

  it("conservation residual helpers agree (absolute vs relative)", () => {
    const block = [1e8, -1e8, 1e8, -1e8];
    const abs = restrictionConservationResidual(block);
    const rel = relativeRestrictionResidual(block);
    // absolute can be ~eps·1e8 ≈ 1e-8; relative must be ~1e-16. This is the
    // Phase-3 lesson: "to Float64" is a RELATIVE claim, never a bare absolute.
    expect(abs).toBeLessThan(1e-6);
    expect(rel).toBeLessThan(1e-14);
  });

  it("round-trips a CONSTANT parent block to identity (eigenvalue 1)", () => {
    for (const C of [0, 1, -2.5, 1e4]) {
      expect(relativeRoundTripDefect([C, C, C, C])).toBeLessThan(1e-14);
    }
  });

  it("round-trips a zero-mean feature attenuated by EXACTLY (1−4w)² (anti-aliasing)", () => {
    // restrict∘prolong on a pure zero-mean mode multiplies it by (1−4w)². This
    // is the proven coarsening attenuation — the operator removes ~76% of the
    // sub-grid energy rather than aliasing it. Measured against the independent
    // prolongateBlock, to 9 decimal places.
    const mode = [1, 1, -1, -1];
    const rt = restrictBlock(prolongateBlock(mode));
    for (let i = 0; i < 4; i++) {
      expect(rt[i]! / mode[i]!).toBeCloseTo(ATTENUATION, 9);
    }
  });

  it("attenuates a general block's zero-mean component, keeps its constant component", () => {
    // Decompose p = mean + zeroMean; the round-trip must return
    // mean + (1−4w)²·zeroMean. Pin the constant part survives and the sharp
    // part is attenuated by the proven factor — not identity, not annihilation.
    const p = [2, -1, 0.5, 3];
    const mean = p.reduce((a, b) => a + b, 0) / 4;
    const rt = restrictBlock(prolongateBlock(p));
    for (let i = 0; i < 4; i++) {
      const expected = mean + ATTENUATION * (p[i]! - mean);
      expect(rt[i]).toBeCloseTo(expected, 9);
    }
  });

  it("energyRatio is 1 on a constant block (mean fully retained)", () => {
    expect(energyRatio([3, 3, 3, 3])).toBeCloseTo(1, 12);
    expect(energyRatio([0, 0, 0, 0])).toBe(1); // defined convention, no ÷0
  });

  it("energyRatio is (1−4w)² on a pure zero-mean block (76% energy removed)", () => {
    expect(energyRatio([1, 1, -1, -1])).toBeCloseTo(ATTENUATION, 9);
    expect(energyRatio([1, -1, 1, -1])).toBeCloseTo(ATTENUATION, 9);
    // strictly between 0 and 1: energy is measured, not "conserved"
    expect(energyRatio([1, 1, -1, -1])).toBeLessThan(1);
    expect(energyRatio([1, 1, -1, -1])).toBeGreaterThan(0);
  });

  // ── Honesty tests: these REFUTE the over-claims and must keep passing ──────

  it("HONESTY: restriction does NOT conserve the energy of a resolved block", () => {
    // Plan §2.3 says restriction "conserves energy". It does not. On a sharp
    // resolved block the energy ratio is (1−4w)² ≈ 0.24, not 1. If a future
    // change makes restriction energy-conserving (impossible for a 4→4 smoother
    // that also conserves mass and constants), this test SHOULD fail — it is the
    // guard against the over-claim being silently reintroduced.
    const sharp = [1, -1, 1, -1];
    expect(energyRatio(sharp)).not.toBeCloseTo(1, 6);
    expect(energyRatio(sharp)).toBeCloseTo(ATTENUATION, 9);
  });

  it("HONESTY: a sharp feature does NOT round-trip to identity", () => {
    // The refine→coarsen cycle attenuates a sharp feature by ~76%, so the
    // round-trip defect is O(1), NOT Float64-small. Only the constant/mean
    // component round-trips exactly.
    const sharp = [1, -1, 1, -1];
    expect(relativeRoundTripDefect(sharp)).toBeGreaterThan(0.5);
  });

  it("HONESTY: a PARTIAL restriction is NOT conservation-valid", () => {
    // Restricting a subset leaves the unprocessed slots as raw child values, so
    // the block sum is no longer the conserved parent sum. The exact law holds
    // only for the full restrictBlock. This pins that partial ≠ conserved.
    const c = [1, 2, 3, 4];
    const part = restrictPartial(c, [0, 1]);
    const sumPart = part.reduce((a, b) => a + b, 0);
    const sumC = c.reduce((a, b) => a + b, 0);
    expect(Math.abs(sumPart - sumC)).toBeGreaterThan(1e-9); // NOT conserved
    // …but the FULL restriction of the same block IS conserved.
    expect(relativeRestrictionResidual(c)).toBeLessThan(1e-14);
  });

  it("partial restriction restricts exactly the requested slots, passes the rest through", () => {
    const c = [1, 2, 3, 4];
    const full = restrictBlock(c);
    const part = restrictPartial(c, [1, 3]);
    expect(part[0]).toBe(1); // untouched
    expect(part[2]).toBe(3); // untouched
    expect(part[1]).toBe(full[1]); // restricted
    expect(part[3]).toBe(full[3]); // restricted
  });

  it("restrictPartial([]) is the identity (no slots staged)", () => {
    const c = [1, 2, 3, 4];
    expect(restrictPartial(c, [])).toEqual(c);
  });

  it("staged coarsen converges to restrictBlock when each slot is taken FROM THE ORIGINAL block", () => {
    // The correct incremental-coarsen discipline: hold the ORIGINAL child block
    // immutable and accumulate each restricted slot from it (restrictPartial
    // computes slot s from the block you hand it). Staged this way, the result
    // lands EXACTLY on the atomic restrictBlock and conserves the sum. This is
    // the governor's downscale path (§5.E): restrict slot-by-slot under memory
    // pressure, but always read the source children, never a half-built block.
    const c = [2, -1, 0.5, 3];
    const original = c.slice();
    const accumulated = c.slice();
    for (const slot of [0, 1, 2, 3]) {
      accumulated[slot] = restrictPartial(original, [slot])[slot]!;
    }
    const atomic = restrictBlock(original);
    for (let i = 0; i < 4; i++) expect(accumulated[i]).toBeCloseTo(atomic[i]!, 12);
    expect(relativeRestrictionResidual(original)).toBeLessThan(1e-14);
  });

  it("HONESTY: feeding a half-restricted block back in is NOT conservation-valid", () => {
    // If a caller (incorrectly) feeds the partially-restricted block back as the
    // source for the next slot, a restricted value leaks into its siblings'
    // computation and the sum drifts off the conserved value. This pins that
    // the feedback pattern is wrong — the source must stay the original block.
    const c = [2, -1, 0.5, 3];
    const sumC = c.reduce((a, b) => a + b, 0);
    let feedback = c.slice();
    for (const slot of [0, 1, 2, 3]) feedback = restrictPartial(feedback, [slot]);
    const sumFeedback = feedback.reduce((a, b) => a + b, 0);
    // The feedback result is NOT the conserved sum (it has drifted), whereas the
    // accumulate-from-original result IS. The contrast is the contract.
    expect(Math.abs(sumFeedback - sumC)).toBeGreaterThan(1e-9);
  });

  // ── Foolproof-by-construction input validation (golden rule 14) ───────────

  it("throws on a malformed block (wrong length or non-finite)", () => {
    expect(() => restrictBlock([1, 2, 3])).toThrow(RangeError);
    expect(() => restrictBlock([1, 2, 3, 4, 5])).toThrow(RangeError);
    expect(() => restrictBlock([1, 2, NaN, 4])).toThrow(RangeError);
    expect(() => restrictBlock([1, 2, Infinity, 4])).toThrow(RangeError);
  });

  it("throws on an out-of-range slot", () => {
    const c = [1, 2, 3, 4];
    expect(() => restrictParent(c, -1)).toThrow(RangeError);
    expect(() => restrictParent(c, 4)).toThrow(RangeError);
    expect(() => restrictionWeights(4)).toThrow(RangeError);
    expect(() => restrictPartial(c, [0, 4])).toThrow(RangeError);
    expect(() => restrictPartial(c, [1.5])).toThrow(RangeError);
  });

  it("roundTripDefect validates its input (wrong length / non-finite)", () => {
    expect(() => roundTripDefect([1, 2, 3])).toThrow(RangeError);
    expect(() => roundTripDefect([1, 2, NaN, 4])).toThrow(RangeError);
  });

  it("conserves on subnormal (denormal) blocks without underflowing the sum", () => {
    const sub = [Number.MIN_VALUE, -Number.MIN_VALUE, Number.MIN_VALUE, -Number.MIN_VALUE];
    expect(relativeRestrictionResidual(sub)).toBeLessThan(1e-14);
  });
});
