/**
 * FILE 11 — dynamics/crossScaleFlow.ts
 *
 * Toroidal closure BETWEEN scales — the recursive pushback. Scale n's
 * unclosable residual (File 6: never exactly zero, Lucas obstruction) becomes
 * the input boundary condition of its ladder neighbours and ±13 octave
 * partners. This is the L2 flux transport made toroidal: the leftover of one
 * rung's attempted closure is the drive of the next.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. LADDER ADJACENCY. "Residual of n → input of n±1" (CORE_VISION §3)
 *      cannot mean raw integer n±1: stable rungs satisfy n ≡ {1,13,15,27}
 *      (mod 28) — all odd — so n±1 is even and NEVER stable. It means the
 *      adjacent stable rung in ladder order (…, 13, 15, 27, 29, …), exactly
 *      the domain File 4's table is built on (LUCAS_STABLE_RUNGS_293, the 18
 *      dense-core + 24 continuation rungs). [EXACT — parity theorem]
 *
 *   2. OCTAVE PARTNERS ARE THEMSELVES OBSTRUCTED. The contract fixes the
 *      octave step at ±13 (the Metatron winding). But 13 is odd, so n±13
 *      flips parity: for EVERY stable n, neither n−13 nor n+13 is stable.
 *      [EXACT — same parity theorem; also visible mod 28: {1,13,15,27}±13 =
 *      {14,26,0,12} ∪ {16,0,2,14}, disjoint from the stable classes.]
 *      This is not a defect to hide — it is the Lucas obstruction expressed
 *      in the octave channel: octave flux lands on a minimally-open, unstable
 *      rung and cannot be absorbed into a stable structure there. The engine
 *      records such links honestly as OPEN endpoints in the ledger; it never
 *      silently reroutes them to a stable rung it invented.
 *
 *   3. CONSERVATION IS BOOKKEEPING, NOT PHYSICS. "No flux created or
 *      destroyed" is enforced by double-entry accounting: every injection
 *      writes the SAME Float64 amount to the source's outflux and the
 *      target's influx, so each individual transfer balances to 0 ulp by
 *      construction (2-scale contract vector: outflux(n) = influx(n+1)
 *      bit-for-bit). GLOBAL re-summation, however, groups the same amounts
 *      differently (per-source vs per-target), and Float64 addition is not
 *      associative — regrouped sums can differ by O(n·ε). The global check
 *      therefore uses an explicit relative tolerance (default 1e-12, ample
 *      for ≲10⁹ transfers) instead of pretending exactness it cannot have.
 *      [EXACT per transfer; honest tol for regrouped totals]
 *      Reading the transported number as physical flux inherits File 6's
 *      POSTULATE taint — the transport arithmetic adds no new claims.
 *
 * Share convention: a boundary condition splits the residual uniformly over
 * its targets, with the LAST share defined as 1 − Σ(previous) so the shares
 * sum to exactly 1.0 in Float64. Uniform splitting is a [SPEC] convention
 * (the contract constrains totals, not shares); swap-friendly by passing an
 * explicit target list.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   crossScaleFlow(11) → { closureResidual(06), scaleTable(04), lucas(03) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { isStable, LUCAS_STABLE_RUNGS_293 } from "../core/lucas.ts";
import type { Classified } from "../core/provenance.ts";
import { getScale } from "../core/scaleTable.ts";

// ─────────────────────────────────────────────────────────────────────────────
// The ladder — the ordered domain flux moves on
// ─────────────────────────────────────────────────────────────────────────────

/** The Metatron octave step. Links between non-adjacent rungs are ±13 ONLY. */
export const OCTAVE_STEP = 13;

/**
 * The full stable ladder File 4's table is built on: 18 dense-core rungs
 * (1…125) + 25 continuation rungs (127…293), ascending. Frozen at module load.
 */
export const LADDER: readonly number[] = LUCAS_STABLE_RUNGS_293;

/** O(1) rung → ladder-position lookup. */
const LADDER_POS = new Map<number, number>(LADDER.map((n, i) => [n, i]));

/** Throw unless n is a Lucas-stable rung on the ladder. */
function assertOnLadder(n: number, fn: string): void {
  if (!LADDER_POS.has(n)) {
    throw new RangeError(`${fn}: n=${n} is not a Lucas-stable rung on the ladder (1…293)`);
  }
}

/**
 * The adjacent stable rungs in ladder order — the "n±1" of the contract,
 * resolved onto the actual stable domain (ground-truth fact 1).
 * `null` at the ladder's ends (below n=1 / above n=293 nothing is built).
 */
export function ladderNeighbors(n: number): readonly [number | null, number | null] {
  assertOnLadder(n, "ladderNeighbors");
  const i = LADDER_POS.get(n)!;
  // Bounds are guarded, so the indexed reads are safe (noUncheckedIndexedAccess).
  return [i > 0 ? LADDER[i - 1]! : null, i < LADDER.length - 1 ? LADDER[i + 1]! : null];
}

/**
 * The ±13 octave partners of a stable rung — EXACTLY [n−13, n+13] per the
 * contract. By the parity theorem (ground-truth fact 2) neither partner is
 * ever stable: octave flux terminates on an OPEN rung. Callers can verify
 * with `isStable` (File 3); this function never lies about the indices.
 */
export function octavePartners(n: number): readonly [number, number] {
  assertOnLadder(n, "octavePartners");
  return [n - OCTAVE_STEP, n + OCTAVE_STEP];
}

/**
 * Is source→target a legal cross-scale link? Legal ⇔ ladder-adjacent
 * (the n±1 channel) OR exactly ±13 (the octave channel). Contract clause:
 * "octave links only ±13" — anything else is a wiring bug and throws upstream.
 */
export function isValidLink(source: number, target: number): boolean {
  if (!LADDER_POS.has(source)) return false;
  if (!Number.isInteger(target)) return false;
  if (Math.abs(target - source) === OCTAVE_STEP) return true;
  const [prev, next] = ladderNeighbors(source);
  return target === prev || target === next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Boundary conditions — residual → neighbour input
// ─────────────────────────────────────────────────────────────────────────────

/** One recipient of a boundary condition: a rung index and its share of the residual. */
export interface FluxTarget {
  /** Recipient rung. Stable (ladder channel) or open (octave channel). */
  readonly n: number;
  /** Fraction of the residual routed here. All shares sum to exactly 1.0. */
  readonly share: number;
}

/**
 * A boundary condition: scale n's measured residual, routed to its targets.
 * The residual number is File 6's POSTULATE-read measurement; this record
 * only transports it (ground-truth fact 3).
 */
export interface BoundaryCondition {
  /** The emitting stable rung. */
  readonly sourceN: number;
  /** The measured closure residual (dimensionless, ≥ 0, never exactly 0 by theorem). */
  readonly residual: number;
  /** The recipients, shares summing to exactly 1.0. */
  readonly targets: readonly FluxTarget[];
}

/**
 * Build the boundary condition that pushes scale n's residual to its
 * neighbours — the recursive pushback itself.
 *
 * - `residual` may be the raw number or File 6's `Classified<number>`
 *   (the `.value` is transported; provenance stays with the measurement).
 * - `targets` defaults to the UPWARD ladder neighbour (CORE_VISION §3:
 *   "scale n's residual is the input boundary condition for scale n+1");
 *   pass an explicit list to include the downward neighbour and/or the ±13
 *   octave partners. Every target must be a legal link from n.
 * - Shares are uniform, last-share-closed so they sum to exactly 1.0.
 *
 * Throws when the residual is not a finite positive number (a zero residual
 * is impossible by the Lucas closure theorem — passing one means the caller
 * measured nothing) or when any target is an illegal link.
 */
export function residualToBoundary(
  sourceN: number,
  residual: number | Classified<number>,
  targets?: readonly number[],
): BoundaryCondition {
  assertOnLadder(sourceN, "residualToBoundary");
  const r = typeof residual === "number" ? residual : residual.value;
  if (!Number.isFinite(r) || r <= 0) {
    throw new RangeError(
      `residualToBoundary: residual must be finite and > 0 (Lucas theorem: never exactly 0); got ${r}`,
    );
  }
  let list: readonly number[];
  if (targets === undefined) {
    const next = ladderNeighbors(sourceN)[1];
    if (next === null) {
      throw new RangeError(
        `residualToBoundary: n=${sourceN} is the top of the ladder; pass explicit targets`,
      );
    }
    list = [next];
  } else {
    if (targets.length === 0) {
      throw new RangeError("residualToBoundary: targets must be non-empty");
    }
    list = targets;
  }
  for (const t of list) {
    if (!isValidLink(sourceN, t)) {
      throw new RangeError(
        `residualToBoundary: ${sourceN}→${t} is not a legal link (ladder-adjacent or ±${OCTAVE_STEP} only)`,
      );
    }
  }
  // Uniform shares, last-share-closed: exact sum 1.0 in Float64.
  const k = list.length;
  const even = 1 / k;
  const fluxTargets: FluxTarget[] = list.map((n, i) => ({
    n,
    share: i === k - 1 ? 1 - even * (k - 1) : even,
  }));
  return Object.freeze({
    sourceN,
    residual: r,
    targets: Object.freeze(fluxTargets),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// The flux ledger — double-entry conservation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Global flux ledger. Every transfer is one double-entry record: the SAME
 * amount leaves the source and arrives at the target, so each transfer
 * balances to 0 ulp by construction. Global regrouped sums carry O(n·ε)
 * Float64 association error — see `totalFluxConserved` (ground-truth fact 3).
 *
 * Rungs appear in the ledger lazily (only once flux touches them). Octave
 * targets (never stable, fact 2) are tracked like any other endpoint: flux
 * parked on an open rung is still flux, and still balances.
 */
export class FluxLedger {
  /** Total emitted per rung. */
  private readonly _out = new Map<number, number>();
  /** Total received per rung. */
  private readonly _in = new Map<number, number>();
  /** Running totals (kept separately as an internal cross-check). */
  private _totalOut = 0;
  private _totalIn = 0;

  /**
   * Record one transfer of `amount` from `source` to `target`.
   * Contract guards: source must be a stable ladder rung; the link must be
   * ladder-adjacent or exactly ±13; the amount must be finite and > 0
   * (there is no such thing as transporting nothing, and negative flux would
   * be a disguised second link direction — model it as its own transfer).
   */
  injectFlux(source: number, target: number, amount: number): void {
    assertOnLadder(source, "injectFlux");
    if (!isValidLink(source, target)) {
      throw new RangeError(
        `injectFlux: ${source}→${target} is not a legal link (ladder-adjacent or ±${OCTAVE_STEP} only)`,
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RangeError(`injectFlux: amount must be finite and > 0; got ${amount}`);
    }
    this._out.set(source, (this._out.get(source) ?? 0) + amount);
    this._in.set(target, (this._in.get(target) ?? 0) + amount);
    this._totalOut += amount;
    this._totalIn += amount;
  }

  /**
   * Apply a boundary condition: push residual·share to every target.
   * The 2-scale contract vector falls out exactly: a single-target boundary
   * condition transfers residual·1.0 = the measured residual, bit-for-bit.
   */
  applyBoundary(bc: BoundaryCondition): void {
    for (const t of bc.targets) {
      this.injectFlux(bc.sourceN, t.n, bc.residual * t.share);
    }
  }

  /** Total flux emitted by rung n (0 if untouched). */
  outflux(n: number): number {
    return this._out.get(n) ?? 0;
  }

  /** Total flux received by rung n (0 if untouched). */
  influx(n: number): number {
    return this._in.get(n) ?? 0;
  }

  /** Net flux through rung n: received − emitted. */
  netFlux(n: number): number {
    return this.influx(n) - this.outflux(n);
  }

  /** Every rung the ledger has touched (sources and targets), ascending. */
  touchedRungs(): readonly number[] {
    const all = new Set<number>([...this._out.keys(), ...this._in.keys()]);
    return [...all].sort((a, b) => a - b);
  }

  /**
   * Does the ledger balance — no flux created or destroyed?
   *
   * Checks BOTH books against each other and against the running totals:
   *   Σ per-rung outflux ≈ Σ per-rung influx ≈ running totals,
   * to a RELATIVE tolerance `tol` (default 1e-12). Why not 0: each transfer
   * is exact double-entry, but the two books group the same amounts by
   * source vs by target, and Float64 addition is not associative — regrouped
   * sums legitimately differ by O(n·ε). 1e-12 relative covers ≲10⁹ transfers
   * of O(1) amounts; a violation beyond it means real corruption, not noise.
   * (The running totals _totalOut/_totalIn are updated by identical addition
   * sequences and stay bitwise equal — that pair IS compared at 0.)
   *
   * `scales` restricts the CLOSED-SYSTEM check to a sub-graph: flux is
   * conserved over `scales` iff every touched rung is in the set (nothing
   * leaked out of the sub-system) and the books balance. A sub-graph with an
   * external endpoint honestly reports false — flux left the system.
   */
  totalFluxConserved(scales?: readonly number[], tol = 1e-12): boolean {
    let sumOut = 0;
    for (const v of this._out.values()) sumOut += v;
    let sumIn = 0;
    for (const v of this._in.values()) sumIn += v;
    // Absolute bound derived from the relative tol and the ledger's magnitude.
    const bound = tol * Math.max(1, Math.abs(this._totalOut));
    const booksBalance =
      this._totalOut === this._totalIn && // identical addition sequences: exact
      Math.abs(sumOut - sumIn) <= bound &&
      Math.abs(sumOut - this._totalOut) <= bound &&
      Math.abs(sumIn - this._totalIn) <= bound;
    if (!booksBalance) return false;
    if (scales !== undefined) {
      const inside = new Set(scales);
      for (const n of this.touchedRungs()) {
        if (!inside.has(n)) return false; // flux crossed the sub-system boundary
      }
    }
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports so downstream files depend only on this seam
// ─────────────────────────────────────────────────────────────────────────────

export { getScale, isStable };

