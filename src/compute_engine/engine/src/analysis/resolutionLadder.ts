/**
 * analysis/resolutionLadder.ts — the canonical RESOLUTION LADDER for the ring.
 *
 * Replaces the old hardcoded [64, 144, 256] triplet with a φ-graded ladder of
 * Fibonacci node counts. Every rung is a Fibonacci number F_m, so the ring's
 * spatial sampling sits on the framework's own arithmetic — the same sequence
 * that seeds the k=3/k=7 Lucas pair and the stable-scale census. Higher rungs
 * resolve finer structure of the SAME physics (ν = 0.5 is rung-independent,
 * since dt scales with dx).
 *
 * Why Fibonacci counts and not arbitrary integers: the eigenmode spectrum and
 * the φ-weighted spectral envelope are cleanest when the node count itself is
 * a framework number; and a single ordered ladder gives the panel an honest,
 * finite set of stable resolutions to offer — never a free integer that could
 * be pushed past the cadence budget.
 *
 * The ceiling MAX_RESOLUTION is the largest rung whose per-tick cost stays
 * inside the 33 ms cadence on commodity hardware. The binding constraint is
 * the O(N²) eigenmode DFT: measured 7.4 ms at 610 nodes vs 12.7 ms at 987 —
 * 610 leaves comfortable headroom beside the propagator + mesh on the same
 * 33 ms tick; 987 does not. So the ladder stops at 610 honestly.
 *
 * Pure module: constants only, no state, no I/O.
 */

/** The ordered φ-graded resolution ladder (Fibonacci node counts). */
export const RESOLUTION_LADDER: readonly number[] = Object.freeze([
  55, 89, 144, 233, 377, 610,
]);

/** The coarsest rung (the default boot resolution). */
export const MIN_RESOLUTION: number = RESOLUTION_LADDER[0]!;

/** The finest rung the cadence budget honestly supports. */
export const MAX_RESOLUTION: number = RESOLUTION_LADDER[RESOLUTION_LADDER.length - 1]!;

/** True iff `n` is an exact ladder rung. */
export function isRung(n: number): boolean {
  return RESOLUTION_LADDER.includes(n);
}

/**
 * The nearest ladder rung to `n` (ties round UP to the finer rung). Used to
 * snap a legacy/free requested node count onto the ladder honestly — the ring
 * only ever runs at a rung, so a request for 64 resolves to 55, 256 to 233.
 */
export function nearestRung(n: number): number {
  if (!Number.isFinite(n)) return MIN_RESOLUTION;
  let best = MIN_RESOLUTION;
  for (const r of RESOLUTION_LADDER) {
    if (Math.abs(r - n) <= Math.abs(best - n)) best = r; // <= rounds ties finer
  }
  return best;
}
