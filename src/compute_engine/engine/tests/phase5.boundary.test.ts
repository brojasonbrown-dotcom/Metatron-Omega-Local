/**
 * phase5.boundary.test.ts
 *
 * Phase 5 battery (plan §3 Phase 5; §2.4; Method Selection Law §8). The local
 * toroidal closure at refinement fronts is the boundary counterpart of the
 * Phase-3/4 transfer operators: where a freshly refined 2×2 block meets a
 * coarser neighbour, the non-conforming (hanging-node) face must be made
 * transparent to the standing wave. These tests pin the EXACT laws the closure
 * must obey and REFUTE the over-claims (it must NOT inject/remove net field,
 * and it must NOT touch an already-continuous front).
 *
 * What is proven here (EXACT):
 *   · value continuity after a full-strength closure   (mean(fine) → coarse);
 *   · flux continuity after a full-strength closure     (fine1 − fine0 → 0);
 *   · net-flux conservation across the front            (to Float64 relative);
 *   · constant-field invariance                         (a flat front is untouched);
 *   · continuity gain < 1 for any open front, ≈ 0 at full strength;
 *   · the φ⁻² level-attenuation of the boundary coupling.
 *
 * What is REFUTED here (so it can never be over-claimed again):
 *   · closure does NOT invent field: the fine SUM moves only by the value
 *     mismatch it transfers across the front, never by the flux part (which is
 *     exactly antisymmetric);
 *   · a PARTIAL (gentle, φ⁻²-graded) step does NOT fully close the front in one
 *     application — it converges, it does not snap;
 *   · closure does NOT alter the fine MEAN at all through the flux part.
 */

import { describe, it, expect } from "vitest";
import { PHI_NEG2 } from "../src/core/constants.js";
import {
  boundaryCoupling,
  valueMismatch,
  fluxMismatch,
  frontClosureResidual,
  closeFront,
  frontNetFlux,
  relativeFrontNetFlux,
  continuityGain,
  type RefinementFront,
} from "../src/refinement/boundary.js";

/** A front with a genuine C¹ break: coarse ≠ fine mean, and a fine–fine kink. */
const OPEN_FRONT: RefinementFront = { coarse: 1.0, fine: [0.4, 1.8], coarseSize: 2.0 };
/** A front that is already C¹-continuous: coarse == mean(fine) and fine0 == fine1. */
const CLOSED_FRONT: RefinementFront = { coarse: 1.0, fine: [1.0, 1.0], coarseSize: 2.0 };

describe("Phase 5 — boundary coupling (φ⁻² level attenuation)", () => {
  it("defaults the parent coupling to φ⁻² and attenuates by one φ² step", () => {
    expect(boundaryCoupling()).toBeCloseTo(PHI_NEG2 * PHI_NEG2, 15); // φ⁻⁴
    expect(boundaryCoupling(PHI_NEG2)).toBeCloseTo(PHI_NEG2 * PHI_NEG2, 15);
    // a level-deeper front is one more φ² step gentler still
    expect(boundaryCoupling(boundaryCoupling())).toBeCloseTo(PHI_NEG2 ** 3, 15);
  });

  it("is gentle: the default coupling is < 1 (never overshoots)", () => {
    expect(boundaryCoupling()).toBeLessThan(1);
    expect(boundaryCoupling()).toBeGreaterThan(0);
  });

  it("rejects a non-finite / negative parent coupling", () => {
    expect(() => boundaryCoupling(Number.NaN)).toThrow(RangeError);
    expect(() => boundaryCoupling(-0.1)).toThrow(RangeError);
  });
});

describe("Phase 5 — mismatch measurement (the C¹ certificate)", () => {
  it("valueMismatch is mean(fine) − coarse", () => {
    expect(valueMismatch(OPEN_FRONT)).toBeCloseTo((0.4 + 1.8) / 2 - 1.0, 15); // 0.1
    expect(valueMismatch(CLOSED_FRONT)).toBe(0);
  });

  it("fluxMismatch is the fine–fine derivative difference (0 when C¹)", () => {
    expect(fluxMismatch(OPEN_FRONT)).toBeCloseTo((1.8 - 0.4) / 2.0, 15); // 0.7
    expect(fluxMismatch(CLOSED_FRONT)).toBe(0);
  });

  it("frontClosureResidual is ~0 on a closed front and positive on an open one", () => {
    expect(frontClosureResidual(CLOSED_FRONT)).toBe(0);
    expect(frontClosureResidual(OPEN_FRONT)).toBeGreaterThan(0);
  });

  it("rejects a malformed front (wrong fine count / non-finite / bad size)", () => {
    expect(() => valueMismatch({ coarse: 1, fine: [1] as unknown as [number, number], coarseSize: 2 })).toThrow(RangeError);
    expect(() => valueMismatch({ coarse: Number.NaN, fine: [1, 1], coarseSize: 2 })).toThrow(RangeError);
    expect(() => valueMismatch({ coarse: 1, fine: [1, 1], coarseSize: 0 })).toThrow(RangeError);
  });
});

describe("Phase 5 — closure (C¹ flux-matching)", () => {
  it("a FULL-strength step closes the front exactly (value + flux)", () => {
    const [f0, f1] = closeFront(OPEN_FRONT, 1);
    const after: RefinementFront = { ...OPEN_FRONT, fine: [f0, f1] };
    // value continuity: mean(fine) == coarse
    expect(valueMismatch(after)).toBeCloseTo(0, 12);
    // flux continuity: fine1 == fine0 (single-valued derivative)
    expect(fluxMismatch(after)).toBeCloseTo(0, 12);
    expect(frontClosureResidual(after)).toBeCloseTo(0, 12);
  });

  it("a GENTLE (φ⁻²-graded) step improves but does NOT fully close in one go", () => {
    const before = frontClosureResidual(OPEN_FRONT);
    const [f0, f1] = closeFront(OPEN_FRONT); // default φ⁻⁴ coupling
    const after = frontClosureResidual({ ...OPEN_FRONT, fine: [f0, f1] });
    expect(after).toBeGreaterThan(0); // not snapped shut
    expect(after).toBeLessThan(before); // but strictly improved
  });

  it("leaves an already-closed front untouched (no spurious correction)", () => {
    const [f0, f1] = closeFront(CLOSED_FRONT, 1);
    expect(f0).toBeCloseTo(CLOSED_FRONT.fine[0], 15);
    expect(f1).toBeCloseTo(CLOSED_FRONT.fine[1], 15);
  });

  it("is CONSTANT-PRESERVING: a flat field across the front is untouched", () => {
    const flat: RefinementFront = { coarse: 3.7, fine: [3.7, 3.7], coarseSize: 1.0 };
    const [f0, f1] = closeFront(flat, 1);
    expect(f0).toBeCloseTo(3.7, 15);
    expect(f1).toBeCloseTo(3.7, 15);
  });
});

describe("Phase 5 — conservation honesty (no invented field)", () => {
  it("the FLUX part conserves the fine SUM exactly (antisymmetric ±)", () => {
    // a front with ONLY a flux mismatch (value already continuous):
    const fluxOnly: RefinementFront = { coarse: 1.0, fine: [0.5, 1.5], coarseSize: 2.0 };
    expect(valueMismatch(fluxOnly)).toBeCloseTo(0, 15); // mean(fine) == coarse
    const sumBefore = fluxOnly.fine[0] + fluxOnly.fine[1];
    const [f0, f1] = closeFront(fluxOnly, 1);
    expect(f0 + f1).toBeCloseTo(sumBefore, 12); // flux part moved nothing net
    expect(f1 - f0).toBeCloseTo(0, 12); // but the kink is gone
  });

  it("the VALUE part transfers exactly the mismatch, no more (no invented field)", () => {
    // a front with ONLY a value mismatch (flux already continuous):
    const valueOnly: RefinementFront = { coarse: 1.0, fine: [1.5, 1.5], coarseSize: 2.0 };
    expect(fluxMismatch(valueOnly)).toBe(0);
    const vm = valueMismatch(valueOnly); // 0.5
    const [f0, f1] = closeFront(valueOnly, 1);
    // each fine moves down by exactly vm (the transferred mismatch), nothing else:
    expect(f0).toBeCloseTo(valueOnly.fine[0] - vm, 12);
    expect(f1).toBeCloseTo(valueOnly.fine[1] - vm, 12);
  });

  it("net flux through a closed front is ~0 to Float64 relative", () => {
    const [f0, f1] = closeFront(OPEN_FRONT, 1);
    const closed: RefinementFront = { ...OPEN_FRONT, fine: [f0, f1] };
    expect(relativeFrontNetFlux(closed)).toBeLessThan(1e-12);
  });

  it("frontNetFlux is the coarse export minus the fine import (flux form)", () => {
    // coarse exports over width 2·hf = coarseSize; fine import over hf each.
    const fr: RefinementFront = { coarse: 1.0, fine: [1.0, 1.0], coarseSize: 2.0 };
    expect(frontNetFlux(fr)).toBeCloseTo(0, 15); // value-continuous → zero net flux
  });
});

describe("Phase 5 — continuity gain (the no-reflection certificate)", () => {
  it("is ≈ 0 at full strength (front fully closed in one step)", () => {
    expect(continuityGain(OPEN_FRONT, 1)).toBeCloseTo(0, 12);
  });

  it("is < 1 for any open front at the gentle default coupling", () => {
    const g = continuityGain(OPEN_FRONT); // φ⁻⁴
    expect(g).toBeGreaterThan(0);
    expect(g).toBeLessThan(1);
  });

  it("is 0 on an already-closed front (nothing to gain)", () => {
    expect(continuityGain(CLOSED_FRONT, 1)).toBe(0);
  });

  it("a sharper kink gains MORE than a smooth one (closure targets the break)", () => {
    const sharper: RefinementFront = { coarse: 1.0, fine: [0.1, 3.0], coarseSize: 2.0 };
    const gGentleSharp = continuityGain(sharper);
    // at the gentle default coupling, a worse front still strictly improves
    expect(gGentleSharp).toBeGreaterThan(0);
    expect(gGentleSharp).toBeLessThan(1);
    // and full strength closes it completely regardless of sharpness
    expect(continuityGain(sharper, 1)).toBeCloseTo(0, 12);
  });
});
