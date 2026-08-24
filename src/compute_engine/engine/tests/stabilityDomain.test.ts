/**
 * core/stabilityDomain contract test — the gate for the unified mod-28 stability law.
 *
 * This battery proves TWO things, and together they are the "no parallel system"
 * guarantee:
 *
 *   (A) THE LAW — the three equivalent characterizations of Lucas-stability stay
 *       pinned, plus the supporting theorems (period 28, closure impossible, parity,
 *       octave). Any edit that drifts the law fails here loudly.
 *   (B) THE UNIFICATION — the census is owned ONCE at the root (lucas.ts) and every
 *       consumer (scaleTable, crossScaleFlow, scaleReconciler, this view) reads the
 *       SAME array with bit-identical content. No recomputed copy may diverge.
 */
import { describe, it, expect } from "vitest";
import {
  CLOSURE_MODULUS,
  RESIDUE_PERIOD,
  STABLE_RESIDUES,
  OCTAVE_STEP,
  DOMAIN_MAX_RUNG,
  DENSE_CORE_MAX_RUNG,
  STABLE_CENSUS,
  DENSE_CORE_RUNGS,
  CONTINUATION_RUNGS,
  stableRungCount,
  isOnCensus,
  isRawNeighborStable,
  octavePartnersOf,
  octaveFluxLandsOpen,
  stabilityDomainSummary,
} from "../src/core/stabilityDomain.ts";
import {
  closureResidueMin,
  isStable,
  lucas,
  stableScalesUpTo,
  LUCAS_STABLE_RUNGS_293,
  MAX_STABLE_DOMAIN,
} from "../src/core/lucas.ts";
import { getScale, allScales, CONTINUATION, DENSE_CORE_N } from "../src/core/scaleTable.ts";
import { LADDER, ladderNeighbors, octavePartners } from "../src/dynamics/crossScaleFlow.ts";
import { nearestStableRung, reconciliationResidual, isStableRung } from "../src/core/scaleReconciler.ts";
import { STABLE_SCALES, CONTINUATION_COUNT } from "../src/core/constants.ts";

describe("stabilityDomain — the law (A)", () => {
  it("exposes the exact modulus structure 13 × 28 and residues {1,13,15,27}", () => {
    expect(CLOSURE_MODULUS).toBe(13);
    expect(RESIDUE_PERIOD).toBe(28);
    expect([...STABLE_RESIDUES]).toEqual([1, 13, 15, 27]);
    expect(OCTAVE_STEP).toBe(13);
    expect(DOMAIN_MAX_RUNG).toBe(293);
    expect(DENSE_CORE_MAX_RUNG).toBe(125);
  });

  it("the three characterizations agree on every n across a wide window", () => {
    for (let n = 1; n <= 560; n++) {
      const residueMin = closureResidueMin(n) === 1;
      const mod28 = STABLE_RESIDUES.includes(((n % 28) + 28) % 28 as 1 | 13 | 15 | 27);
      const r = Number(lucas(n) % 13n);
      const plusMinusOne = r === 1 || r === 12;
      expect(residueMin, `n=${n} residueMin vs mod28`).toBe(mod28);
      expect(mod28, `n=${n} mod28 vs ±1`).toBe(plusMinusOne);
      expect(isStable(n), `n=${n} predicate`).toBe(mod28);
    }
  });

  it("odd(n) ∧ 7∤n is only a NECESSARY superset, never sufficient (locks the doc fix)", () => {
    for (const n of STABLE_CENSUS) {
      expect(n % 2, `n=${n} odd`).toBe(1);
      expect(n % 7, `n=${n} not mult of 7`).not.toBe(0);
    }
    for (const n of [3, 5, 9, 11, 17, 19, 23, 25, 31, 33]) {
      expect(n % 2).toBe(1);
      expect(n % 7).not.toBe(0);
      expect(isStable(n), `n=${n} must NOT be stable`).toBe(false);
    }
  });

  it("the residue pattern has period exactly 28", () => {
    for (let n = 1; n <= 200; n++) {
      expect(closureResidueMin(n + 28)).toBe(closureResidueMin(n));
    }
  });

  it("exact 13-fold closure is impossible: Lₙ ≢ 0 (mod 13) for all n", () => {
    for (let n = 1; n <= 560; n++) {
      expect(Number(lucas(n) % 13n), `n=${n}`).not.toBe(0);
    }
  });
});

describe("stabilityDomain — the structural theorems as predicates", () => {
  it("parity theorem: no raw n±1 neighbour of a stable rung is ever stable", () => {
    for (const n of STABLE_CENSUS) {
      expect(isRawNeighborStable(n), `n=${n}`).toBe(false);
    }
  });

  it("octave theorem: ±13 partners of every stable rung land on open (non-stable) rungs", () => {
    for (const n of STABLE_CENSUS) {
      expect(octaveFluxLandsOpen(n), `n=${n}`).toBe(true);
      const [lo, hi] = octavePartnersOf(n);
      expect(lo).toBe(n - OCTAVE_STEP);
      expect(hi).toBe(n + OCTAVE_STEP);
      expect(isStable(lo)).toBe(false);
      expect(isStable(hi)).toBe(false);
    }
  });
});

describe("stabilityDomain — the unification (B): ONE census, read identically everywhere", () => {
  it("the root census is the single materialization, frozen, and equals a fresh derivation", () => {
    expect(Object.isFrozen(LUCAS_STABLE_RUNGS_293)).toBe(true);
    expect([...LUCAS_STABLE_RUNGS_293]).toEqual(stableScalesUpTo(293));
    expect(LUCAS_STABLE_RUNGS_293.length).toBe(42);
  });

  it("the view re-exports the SAME census array (no copy, no second store)", () => {
    expect(STABLE_CENSUS).toBe(LUCAS_STABLE_RUNGS_293); // reference identity — not a recomputation
    expect(stableRungCount()).toBe(42);
  });

  it("crossScaleFlow.LADDER is the census, bit-identical (no independent ladder)", () => {
    expect([...LADDER]).toEqual([...LUCAS_STABLE_RUNGS_293]);
  });

  it("dense core (18) and continuation (24) partition the census consistently across files", () => {
    expect(DENSE_CORE_RUNGS.length).toBe(18);
    expect(CONTINUATION_RUNGS.length).toBe(24);
    expect([...DENSE_CORE_RUNGS]).toEqual([...STABLE_SCALES]);
    expect([...DENSE_CORE_RUNGS]).toEqual([...DENSE_CORE_N]);
    expect(allScales().map((r) => r.n)).toEqual([...STABLE_SCALES]);
    expect(CONTINUATION.length).toBe(24); // scaleTable's continuation, not 25
    expect(CONTINUATION_RUNGS.length + DENSE_CORE_RUNGS.length).toBe(stableRungCount());
  });

  it("every census rung is materialized by scaleTable and marked stable", () => {
    for (const n of STABLE_CENSUS) {
      const rec = getScale(n);
      expect(rec.stable, `getScale(${n}).stable`).toBe(true);
      expect(rec.lucasResidue, `getScale(${n}).lucasResidue`).toBe(1);
    }
  });

  it("isOnCensus agrees with the predicate over the whole domain (and rejects beyond)", () => {
    for (let n = 0; n <= MAX_STABLE_DOMAIN + 5; n++) {
      const onCensus = n >= 1 && n <= MAX_STABLE_DOMAIN && isStable(n);
      expect(isOnCensus(n), `n=${n}`).toBe(onCensus);
    }
  });

  it("scaleReconciler bridges land on census rungs and read the census bit-identically", () => {
    for (const n of [0, 2, 60, 96, 200, 250, 292, 293]) {
      const r = nearestStableRung(n);
      expect(r).not.toBeNull();
      expect(isOnCensus(r!)).toBe(true);
    }
    // reconciler's residual must be 0 exactly on stable rungs and positive elsewhere (in-domain)
    for (const n of STABLE_CENSUS) expect(reconciliationResidual(n)).toBe(0);
    expect(reconciliationResidual(2)).toBeGreaterThan(0);
  });

  it("the reconciler's isStableRung re-export agrees with the predicate (single seam)", () => {
    for (let n = 0; n <= 300; n++) {
      expect(isStableRung(n), `n=${n}`).toBe(isStable(n));
    }
  });

  it("ladder topology is preserved: neighbors and octaves match the census order", () => {
    for (let i = 0; i < STABLE_CENSUS.length; i++) {
      const n = STABLE_CENSUS[i]!;
      const [prev, next] = ladderNeighbors(n);
      expect(prev).toBe(i > 0 ? STABLE_CENSUS[i - 1]! : null);
      expect(next).toBe(i < STABLE_CENSUS.length - 1 ? STABLE_CENSUS[i + 1]! : null);
      expect(octavePartners(n)).toEqual([n - 13, n + 13]);
    }
  });
});

describe("stabilityDomain — the verified summary", () => {
  it("is internally consistent, honest, and reports the theorems holding", () => {
    const s = stabilityDomainSummary();
    expect(s.totalCount).toBe(42);
    expect(s.totalCount).toBe(s.denseCoreCount + s.continuationCount);
    expect(s.denseCoreCount).toBe(18);
    expect(s.continuationCount).toBe(24);
    expect(s.maxRung).toBe(293);
    expect([...s.stableResidues]).toEqual([1, 13, 15, 27]);
    expect(s.censusMatchesSpec).toBe(true);
    expect(s.everyOctaveLandsOpen).toBe(true);
    expect(s.noRawNeighborStable).toBe(true);
  });
});
