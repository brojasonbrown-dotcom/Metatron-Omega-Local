/**
 * core/scaleReconciler.ts — the dual-registry reconciler.
 *
 * M5 of the engine↔mind unification (INTEGRATION_LEDGER.md). Two scale ladders
 * coexist in the unified system, over the SAME underlying law L(n) = ℓ_P·φⁿ:
 *
 *   - The ENGINE's verified ladder: the Lucas-stable rungs {1,13,15,27,…,125},
 *     where `getScale(n)` returns a fully-provenanced ScaleRecord (stable only).
 *   - The MIND's canonical ladder (brain v14): {0,96,120,134,168,192,235,250,270,292},
 *     navigated by `get_next_scale_down/up` for the fractal-node recursion.
 *
 * These are DIFFERENT registries over the same geometric scale axis. This module
 * reconciles them WITHOUT conflating them: it lets a caller at any scale index n
 * find the nearest engine-stable rung (for verified computation) and the exact
 * scale-law value at ANY integer n (for the mind's arbitrary-n navigation).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE OWNS (one owner, strict DAG, golden rule 2):
 *   • nearestStableRung(n) — closest Lucas-stable rung to any n (the bridge).
 *   • scaleLengthAt(n) / scaleFrequencyAt(n) — the scale law at ARBITRARY n,
 *     exact via Scaled (never Math.pow overflow), available even where no stable
 *     rung exists. This is the mind's compute_length/frequency made exact.
 *   • reconciliationResidual(n) — the fractional distance from n to its nearest
 *     stable rung; 0 when n is itself stable. Read-only, honest.
 *
 * It does NOT redefine either ladder and does NOT force the mind onto the
 * stable-only table — that would regress the mind's larger domain (see M4 note).
 *
 * Dependency direction (strictly downward): scaleReconciler → { scaleTable, lucas,
 * provenance, constants }.
 */

import { PHI, PLANCK_LENGTH, PLANCK_TIME, C } from "./constants.ts";
import { Scaled } from "./provenance.ts";
import { isStable, LUCAS_STABLE_RUNGS_293, MAX_STABLE_DOMAIN } from "./lucas.ts";
import { getScale } from "./scaleTable.ts";

/** The largest n the engine's stable table is materialised for. */
const MAX_STABLE_RUNG = 125;

/**
 * The Lucas-stable rungs to search for a given ceiling, with the canonical census
 * (LUCAS_STABLE_RUNGS_293, owned by lucas.ts) as the base. For ceilings at or below
 * the cosmic rung this IS the census — no recomputation. Only when the mind navigates
 * ABOVE 293 (its larger domain) do we derive the small stable tail beyond the census
 * and append it; the result is bit-identical to stableScalesUpTo(max) in all cases.
 */
function stableRungsUpTo(max: number): number[] {
  if (max <= MAX_STABLE_DOMAIN) {
    return LUCAS_STABLE_RUNGS_293.filter((n) => n <= max);
  }
  // Extend above the materialised domain: census + the stable tail in (293, max].
  const tail: number[] = [];
  for (let n = MAX_STABLE_DOMAIN + 1; n <= max; n++) if (isStable(n)) tail.push(n);
  return [...LUCAS_STABLE_RUNGS_293, ...tail];
}

/**
 * Nearest Lucas-stable rung to `n` (the bridge between the two ladders).
 * Ties break to the LOWER rung (deterministic). Returns null if no stable rung
 * exists at or below the engine's materialised range on the requested side.
 */
export function nearestStableRung(n: number): number | null {
  if (!Number.isInteger(n)) throw new RangeError(`nearestStableRung: non-integer ${n}`);
  const rungs = stableRungsUpTo(Math.max(n, MAX_STABLE_RUNG));
  if (rungs.length === 0) return null;
  let best: number | null = null;
  let bestDist = Infinity;
  for (const r of rungs) {
    const dist = Math.abs(r - n);
    if (dist < bestDist || (dist === bestDist && best !== null && r < best)) {
      best = r;
      bestDist = dist;
    }
  }
  return best;
}

/** True iff n is itself a Lucas-stable rung (delegates to the canonical test). */
export function isStableRung(n: number): boolean {
  return isStable(n);
}

/**
 * Exact characteristic length L(n) = ℓ_P·φⁿ at ANY integer n, as a Scaled.
 * Uses the engine's provenance-tagged PLANCK_LENGTH and exact φ-power — never
 * Math.pow into Float64 overflow. This is the mind's scale law made exact and
 * valid over its full (larger) domain.
 */
export function scaleLengthAt(n: number): Scaled {
  if (!Number.isInteger(n)) throw new RangeError(`scaleLengthAt: non-integer ${n}`);
  return Scaled.from(PLANCK_LENGTH).mul(Scaled.phiPow(n, PHI));
}

/** Exact characteristic time T(n) = t_P·φⁿ at any integer n, as a Scaled. */
export function scaleTimeAt(n: number): Scaled {
  if (!Number.isInteger(n)) throw new RangeError(`scaleTimeAt: non-integer ${n}`);
  return Scaled.from(PLANCK_TIME).mul(Scaled.phiPow(n, PHI));
}

/**
 * Characteristic frequency f(n) = c / L(n) at any integer n, as a Scaled.
 * Equivalent to f_P·φ⁻ⁿ but derived from the single-sourced C and PLANCK_LENGTH
 * so the length and frequency ladders always agree.
 */
export function scaleFrequencyAt(n: number): Scaled {
  const L = scaleLengthAt(n);
  return Scaled.from(C).div(L);
}

/**
 * The reconciliation residual: |n − nearestStableRung(n)| as a fraction of the
 * rung spacing at n. 0 when n is stable (perfect reconciliation), rising toward
 * 1 at the midpoint between rungs. Read-only and honest — it reports how far the
 * mind's arbitrary-n navigation sits from a verified engine rung.
 */
export function reconciliationResidual(n: number): number {
  const nearest = nearestStableRung(n);
  if (nearest === null) return 1; // no stable rung in range: fully unreconciled
  if (nearest === n) return 0;
  // spacing to the next stable rung above `nearest` (local ladder gap)
  const above = stableRungsUpTo(nearest + 40).find((r) => r > nearest) ?? nearest + 14;
  const gap = Math.max(1, above - nearest);
  return Math.abs(n - nearest) / gap;
}

/**
 * Verified ScaleRecord for a stable rung, or null when n is not a stable rung.
 * The bridge INTO the engine's proven table — use this when you need the full
 * provenance-tagged record and n is (or reconciles to) a stable rung.
 */
export function stableRecordAt(n: number): ReturnType<typeof getScale> | null {
  return isStable(n) ? getScale(n) : null;
}
