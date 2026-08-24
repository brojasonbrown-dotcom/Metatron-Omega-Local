/**
 * core/stabilityDomain.ts — the verified VIEW over the mod-28 stability law.
 *
 * NOT a store. The single materialized census lives at the root — core/lucas.ts
 * (LUCAS_STABLE_RUNGS_293), derived once from the theorem-level predicate isStable
 * and cross-checked against the mod-28 residue corollary at load. This module is the
 * ANALYTICAL surface over that one census: it re-exports the census unchanged and
 * layers on the taxonomy and structural theorems the engine reasons with, every one
 * derived from (never restating) the root law.
 *
 * What this file OWNS (and only this):
 *   • the modulus structure 13 (closure) × 28 (residue period) and residues {1,13,15,27};
 *   • the dense-core / continuation taxonomy (the engine's two-tier ladder);
 *   • the parity & octave theorems (why n±1 is never stable, why ±13 flux always
 *     lands on an open rung) as computable predicates, so the reasoning in
 *     dynamics/crossScaleFlow.ts is checkable rather than asserted in a comment;
 *   • a load-time certificate that re-proves the three equivalent characterizations
 *     agree across a proof window and refuses to expose a drifted census.
 *
 * It deliberately does NOT import scaleTable/scaleReconciler/crossScaleFlow — those
 * are consumers of the same root; a view must not depend on its consumers. Strict
 * dependency direction (downward only): stabilityDomain → { lucas, constants }.
 */

import {
  closureResidueMin,
  isStable,
  lucas,
  LUCAS_STABLE_RUNGS_293,
  MAX_STABLE_DOMAIN,
} from "./lucas.ts";
import { CONTINUATION_COUNT, STABLE_SCALES } from "./constants.ts";

// ─────────────────────────────────────────────────────────────────────────────
// The modulus structure (EXACT, theorem-derived)
// ─────────────────────────────────────────────────────────────────────────────

/** The closure modulus: stability is decided by Lₙ mod CLOSURE_MODULUS. */
export const CLOSURE_MODULUS = 13 as const;

/** The residue period: the pattern Lₙ (mod 13) repeats with period RESIDUE_PERIOD. */
export const RESIDUE_PERIOD = 28 as const;

/**
 * The stable residue classes mod 28. n is stable ⇔ n mod 28 ∈ STABLE_RESIDUES.
 * EXACT (erratum E13). This is the corollary form of closureResidueMin(n) === 1.
 */
export const STABLE_RESIDUES: readonly [1, 13, 15, 27] = [1, 13, 15, 27] as const;

/** The Metatron octave step (the winding); links between non-adjacent rungs are ±this. */
export const OCTAVE_STEP = 13 as const;

/** The dense computational core ends here; the continuation ladder runs to 293. */
export const DENSE_CORE_MAX_RUNG = 125 as const;

/** The largest rung of the materialized domain (re-exported from the root). */
export const DOMAIN_MAX_RUNG = MAX_STABLE_DOMAIN;

// ─────────────────────────────────────────────────────────────────────────────
// Load-time certificate — the three characterizations must agree, or this view is void
// ─────────────────────────────────────────────────────────────────────────────

/** n mod 28 is a stable residue class (the corollary form). */
function isResidueClassStable(n: number): boolean {
  const r = ((n % RESIDUE_PERIOD) + RESIDUE_PERIOD) % RESIDUE_PERIOD;
  return (STABLE_RESIDUES as readonly number[]).includes(r);
}

/** Lₙ ≡ ±1 (mod 13) — the direct ±1 form of the theorem. */
function isPlusMinusOneStable(n: number): boolean {
  const r = Number(lucas(n) % BigInt(CLOSURE_MODULUS));
  return r === 1 || r === CLOSURE_MODULUS - 1;
}

const PROOF_WINDOW = 600; // > 21 full mod-28 periods; ample for the equivalence proof.

/**
 * Re-prove the three equivalent characterizations agree across the proof window, the
 * residue pattern is genuinely period-28, and exact closure never occurs. Throws —
 * refusing to expose the census — on any inconsistency. This is the certificate that
 * lets the engine treat the mod-28 law as settled rather than re-argued per call site.
 */
function certify(): void {
  for (let n = 1; n <= PROOF_WINDOW; n++) {
    const a = closureResidueMin(n) === 1; // theorem-level predicate
    const b = isResidueClassStable(n); // mod-28 corollary
    const c = isPlusMinusOneStable(n); // Lₙ ≡ ±1
    if (!(a === b && b === c)) {
      throw new Error(
        `stabilityDomain: characterization mismatch at n=${n} (predicate=${a}, mod28=${b}, ±1=${c}) — the stability law is inconsistent`,
      );
    }
    if (closureResidueMin(n) === 0) {
      throw new Error(`stabilityDomain: L_${n} ≡ 0 (mod 13) — exact closure must be impossible`);
    }
  }
  for (let n = 1; n <= PROOF_WINDOW - RESIDUE_PERIOD; n++) {
    if (closureResidueMin(n) !== closureResidueMin(n + RESIDUE_PERIOD)) {
      throw new Error(`stabilityDomain: Lₙ mod 13 is not period-${RESIDUE_PERIOD} at n=${n}`);
    }
  }
}
certify();

// ─────────────────────────────────────────────────────────────────────────────
// The census view — re-exported from the single root owner, never re-derived here
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete Lucas-stable census ≤ 293 (42 rungs), ascending — the SAME frozen array
 * owned by core/lucas.ts. Re-exported so analytical callers have one import site.
 * Immutable; do not mutate.
 */
export const STABLE_CENSUS: readonly number[] = LUCAS_STABLE_RUNGS_293;

/** The dense computational core (the 18 rungs ≤ 125), ascending. */
export const DENSE_CORE_RUNGS: readonly number[] = Object.freeze(
  STABLE_CENSUS.filter((n) => n <= DENSE_CORE_MAX_RUNG),
);

/** The continuation rungs (126…293), ascending — the coarse-graining ladder. */
export const CONTINUATION_RUNGS: readonly number[] = Object.freeze(
  STABLE_CENSUS.filter((n) => n > DENSE_CORE_MAX_RUNG),
);

/** O(1) membership in the materialized census. */
const CENSUS_SET: ReadonlySet<number> = new Set(STABLE_CENSUS);

/** The number of stable rungs in the materialized domain (42). */
export function stableRungCount(): number {
  return STABLE_CENSUS.length;
}

/** True iff n lies on the materialized census (1…293). O(1); for hot paths. */
export function isOnCensus(n: number): boolean {
  return CENSUS_SET.has(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Structural theorems as computable predicates (the high-resolution reasoning)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parity theorem: every stable rung is ODD, so the raw integer neighbours n±1 are
 * even and NEVER stable. "Adjacent scale" therefore means the adjacent rung in
 * ladder order, not n±1. Exposed as a predicate so the claim is checkable, not
 * asserted in a comment.
 */
export function isRawNeighborStable(n: number): boolean {
  // n±1 of an odd rung is even; stable ⇒ odd, so raw neighbours are never stable.
  return isStable(n - 1) || isStable(n + 1);
}

/**
 * Octave theorem: the ±13 step flips parity (13 is odd), so for EVERY stable n the
 * partners n±13 are non-stable. Octave flux always terminates on a minimally-open,
 * unstable rung — the Lucas obstruction expressed in the octave channel. Returns the
 * two partners; callers verify non-stability with isStableRung / octaveFluxLandsOpen.
 */
export function octavePartnersOf(n: number): readonly [number, number] {
  return [n - OCTAVE_STEP, n + OCTAVE_STEP] as const;
}

/** True iff the ±13 octave partners of a stable rung are both non-stable (the theorem). */
export function octaveFluxLandsOpen(n: number): boolean {
  if (!isStable(n)) return false; // the theorem is about stable sources
  return !isStable(n - OCTAVE_STEP) && !isStable(n + OCTAVE_STEP);
}

// ─────────────────────────────────────────────────────────────────────────────
// Structural summary — a verified snapshot for diagnostics and the contract test
// ─────────────────────────────────────────────────────────────────────────────

export interface StabilityDomainSummary {
  readonly closureModulus: number;
  readonly residuePeriod: number;
  readonly stableResidues: readonly number[];
  readonly denseCoreCount: number;
  readonly continuationCount: number;
  readonly totalCount: number;
  readonly maxRung: number;
  readonly proofWindow: number;
  readonly censusMatchesSpec: boolean;
  readonly everyOctaveLandsOpen: boolean;
  readonly noRawNeighborStable: boolean;
}

/**
 * A verified snapshot of the domain's structure. Every value is derived from the
 * root census and the live predicate, not from a literal — so a drift anywhere
 * surfaces here as a false flag.
 */
export function stabilityDomainSummary(): StabilityDomainSummary {
  const censusMatchesSpec =
    DENSE_CORE_RUNGS.length === STABLE_SCALES.length &&
    DENSE_CORE_RUNGS.every((n, i) => n === STABLE_SCALES[i]) &&
    STABLE_CENSUS.length === STABLE_SCALES.length + CONTINUATION_COUNT;
  const everyOctaveLandsOpen = STABLE_CENSUS.every((n) => octaveFluxLandsOpen(n));
  const noRawNeighborStable = STABLE_CENSUS.every((n) => !isRawNeighborStable(n));
  return Object.freeze({
    closureModulus: CLOSURE_MODULUS,
    residuePeriod: RESIDUE_PERIOD,
    stableResidues: Object.freeze([...STABLE_RESIDUES]),
    denseCoreCount: DENSE_CORE_RUNGS.length,
    continuationCount: CONTINUATION_RUNGS.length,
    totalCount: STABLE_CENSUS.length,
    maxRung: DOMAIN_MAX_RUNG,
    proofWindow: PROOF_WINDOW,
    censusMatchesSpec,
    everyOctaveLandsOpen,
    noRawNeighborStable,
  });
}
