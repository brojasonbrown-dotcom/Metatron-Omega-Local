/**
 * FILE 11 acceptance tests — dynamics/crossScaleFlow.ts
 *
 * Contract (BUILD_SPEC File 11):
 *   - outflux(n) = influx(n+1) — conservation to tol (double-entry ⇒ exact);
 *   - octave links only ±13;
 *   - no flux created or destroyed — global ledger balances each step;
 *   - test vectors: 2-scale toy pushes exactly the measured residual;
 *     3-scale chain conserves the total.
 *
 * Plus the ground-truth theorems certified in the pre-build audit:
 *   - stable rungs are all odd ⇒ n±1 (raw) and n±13 are NEVER stable;
 *   - ladder adjacency is the real "n±1" channel.
 */

import { describe, expect, it } from "vitest";
import { STABLE_SCALES } from "../src/core/constants.js";
import { isStable } from "../src/core/lucas.js";
import { classify } from "../src/core/provenance.js";
import {
    FluxLedger,
    LADDER,
    OCTAVE_STEP,
    isValidLink,
    ladderNeighbors,
    octavePartners,
    residualToBoundary,
} from "../src/dynamics/crossScaleFlow.js";
import { closureResidual } from "../src/geometry/closureResidual.js";
import { torusForScale } from "../src/geometry/torus.js";

// ─────────────────────────────────────────────────────────────────────────────
// The ladder
// ─────────────────────────────────────────────────────────────────────────────

describe("File 11 · ladder", () => {
  it("LADDER = all Lucas-stable rungs 1…293, ascending, starting with the 18 dense-core rungs", () => {
    expect(LADDER.slice(0, 18)).toEqual([...STABLE_SCALES]);
    for (const n of LADDER) expect(isStable(n)).toBe(true);
    for (let i = 1; i < LADDER.length; i++) expect(LADDER[i]!).toBeGreaterThan(LADDER[i - 1]!);
    // Completeness: nothing stable in 1…293 is missing.
    let count = 0;
    for (let n = 1; n <= 293; n++) if (isStable(n)) count++;
    expect(LADDER.length).toBe(count);
  });

  it("ladderNeighbors resolves the contract's n±1 onto the stable domain", () => {
    expect(ladderNeighbors(13)).toEqual([1, 15]);
    expect(ladderNeighbors(15)).toEqual([13, 27]);
    expect(ladderNeighbors(1)).toEqual([null, 13]); // bottom of the ladder
    const top = LADDER[LADDER.length - 1]!;
    expect(ladderNeighbors(top)[1]).toBeNull(); // top of the ladder
  });

  it("ladderNeighbors throws off-ladder (raw n±1 is even, hence never stable)", () => {
    expect(() => ladderNeighbors(14)).toThrow(RangeError);
    expect(() => ladderNeighbors(2)).toThrow(RangeError);
    expect(() => ladderNeighbors(0)).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Octave partners
// ─────────────────────────────────────────────────────────────────────────────

describe("File 11 · octave partners (±13 only)", () => {
  it("octavePartners(n) = [n−13, n+13] exactly, for every ladder rung", () => {
    for (const n of LADDER) {
      expect(octavePartners(n)).toEqual([n - OCTAVE_STEP, n + OCTAVE_STEP]);
    }
  });

  it("THEOREM: no octave partner is ever stable (parity: stable ⇒ odd; ±13 flips parity)", () => {
    for (const n of LADDER) {
      const [lo, hi] = octavePartners(n);
      expect(isStable(lo)).toBe(false);
      expect(isStable(hi)).toBe(false);
    }
  });

  it("octavePartners throws for non-ladder input", () => {
    expect(() => octavePartners(26)).toThrow(RangeError);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Link legality — "octave links only ±13"
// ─────────────────────────────────────────────────────────────────────────────

describe("File 11 · link legality", () => {
  it("ladder-adjacent and exact ±13 links are legal; everything else is not", () => {
    expect(isValidLink(13, 15)).toBe(true); // ladder up
    expect(isValidLink(13, 1)).toBe(true); // ladder down
    expect(isValidLink(13, 26)).toBe(true); // octave up (open rung — still legal)
    expect(isValidLink(13, 0)).toBe(true); // octave down
    expect(isValidLink(13, 27)).toBe(false); // skips a rung
    expect(isValidLink(13, 29)).toBe(false); // Δ=16 is neither channel
    expect(isValidLink(13, 13)).toBe(false); // self-link
    expect(isValidLink(14, 15)).toBe(false); // unstable source
    expect(isValidLink(13, 14.5)).toBe(false); // non-integer target
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boundary conditions
// ─────────────────────────────────────────────────────────────────────────────

describe("File 11 · residualToBoundary", () => {
  it("default target is the upward ladder neighbour with share exactly 1", () => {
    const bc = residualToBoundary(13, 0.25);
    expect(bc.sourceN).toBe(13);
    expect(bc.residual).toBe(0.25);
    expect(bc.targets).toEqual([{ n: 15, share: 1 }]);
  });

  it("accepts File 6's Classified<number> and transports its .value", () => {
    const measured = classify(0.125, "POSTULATE", undefined, "test residual");
    const bc = residualToBoundary(15, measured);
    expect(bc.residual).toBe(0.125);
    expect(bc.targets).toEqual([{ n: 27, share: 1 }]);
  });

  it("explicit targets: shares are uniform and sum to EXACTLY 1.0 (last-share-closed)", () => {
    // 3 targets: both ladder neighbours + one octave partner of n=15.
    const bc = residualToBoundary(15, 1.0, [13, 27, 28]);
    expect(bc.targets.length).toBe(3);
    const sum = bc.targets.reduce((a, t) => a + t.share, 0);
    expect(sum).toBe(1.0); // exact, not toBeCloseTo
  });

  it("rejects zero/negative/non-finite residuals (Lucas theorem: never exactly 0)", () => {
    expect(() => residualToBoundary(13, 0)).toThrow(RangeError);
    expect(() => residualToBoundary(13, -1)).toThrow(RangeError);
    expect(() => residualToBoundary(13, Number.NaN)).toThrow(RangeError);
  });

  it("rejects illegal targets and empty target lists", () => {
    expect(() => residualToBoundary(13, 1, [27])).toThrow(RangeError); // skips 15
    expect(() => residualToBoundary(13, 1, [])).toThrow(RangeError);
  });

  it("top of the ladder has no default upward target — must be explicit", () => {
    const top = LADDER[LADDER.length - 1]!;
    expect(() => residualToBoundary(top, 1)).toThrow(RangeError);
    const [prev] = ladderNeighbors(top);
    const bc = residualToBoundary(top, 1, [prev!]);
    expect(bc.targets).toEqual([{ n: prev!, share: 1 }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The flux ledger — conservation
// ─────────────────────────────────────────────────────────────────────────────

describe("File 11 · FluxLedger conservation", () => {
  it("CONTRACT VECTOR (2-scale toy): the pushed amount equals the measured residual bit-for-bit", () => {
    // A REAL measurement: an open (non-periodic) field on the n=13 torus.
    const torus = torusForScale(13);
    const open = ({ u, v }: { u: number; v: number }) => u * 0.1 + Math.cos(v);
    const measured = closureResidual(open, torus);
    expect(measured.value).toBeGreaterThan(0);

    const ledger = new FluxLedger();
    ledger.applyBoundary(residualToBoundary(13, measured));
    expect(ledger.outflux(13)).toBe(measured.value); // exact
    expect(ledger.influx(15)).toBe(measured.value); // exact — outflux(n) = influx(n+1)
    expect(ledger.totalFluxConserved()).toBe(true);
    expect(ledger.totalFluxConserved([13, 15])).toBe(true);
  });

  it("CONTRACT VECTOR (3-scale chain): total conserved, per-node books exact", () => {
    const ledger = new FluxLedger();
    const r1 = 0.375; // 1 → 13
    ledger.applyBoundary(residualToBoundary(1, r1));
    // 13 relays what it received plus its own residual.
    const r13 = 0.125;
    ledger.applyBoundary(residualToBoundary(13, ledger.influx(13) + r13));
    expect(ledger.outflux(1)).toBe(r1);
    expect(ledger.influx(13)).toBe(r1);
    expect(ledger.outflux(13)).toBe(r1 + r13);
    expect(ledger.influx(15)).toBe(r1 + r13);
    // Net through the middle node = own contribution flowing out.
    expect(ledger.netFlux(13)).toBe(-r13);
    expect(ledger.totalFluxConserved()).toBe(true);
    expect(ledger.totalFluxConserved([1, 13, 15])).toBe(true);
  });

  it("global ledger balances over a long deterministic injection orbit (rel. 1e-12)", () => {
    const ledger = new FluxLedger();
    const PHI_INV = 0.6180339887498948482;
    let x = 0.5;
    for (let i = 0; i < 1000; i++) {
      // Golden-orbit deterministic amounts and rung choices — no RNG.
      x = (x + PHI_INV) % 1;
      const src = LADDER[i % LADDER.length]!;
      const [prev, next] = ladderNeighbors(src);
      const target = next ?? prev!;
      ledger.injectFlux(src, target, 1e-6 + x);
    }
    // Each transfer is exact double-entry; regrouped Float64 sums carry O(n·ε)
    // association error — the check is honest about that (default rel. 1e-12).
    expect(ledger.totalFluxConserved()).toBe(true);
    // Books cross-check: Σ out ≈ Σ in over every touched rung, same bound.
    let out = 0;
    let inn = 0;
    for (const n of ledger.touchedRungs()) {
      out += ledger.outflux(n);
      inn += ledger.influx(n);
    }
    expect(Math.abs(out - inn)).toBeLessThanOrEqual(1e-12 * out);
  });

  it("sub-system check reports false when flux crossed the boundary (octave → open rung)", () => {
    const ledger = new FluxLedger();
    ledger.injectFlux(13, 26, 0.5); // octave channel: 26 is an OPEN rung
    expect(ledger.totalFluxConserved()).toBe(true); // globally still balanced
    expect(ledger.totalFluxConserved([13, 15])).toBe(false); // but it left {13,15}
    expect(ledger.totalFluxConserved([13, 26])).toBe(true); // honest sub-system
  });

  it("rejects illegal links and non-positive amounts (no flux invented, none silently dropped)", () => {
    const ledger = new FluxLedger();
    expect(() => ledger.injectFlux(13, 27, 1)).toThrow(RangeError); // skips 15
    expect(() => ledger.injectFlux(14, 15, 1)).toThrow(RangeError); // unstable source
    expect(() => ledger.injectFlux(13, 15, 0)).toThrow(RangeError);
    expect(() => ledger.injectFlux(13, 15, -0.1)).toThrow(RangeError);
    expect(() => ledger.injectFlux(13, 15, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    // Nothing was recorded by the failed attempts.
    expect(ledger.touchedRungs()).toEqual([]);
    expect(ledger.totalFluxConserved()).toBe(true);
  });
});
