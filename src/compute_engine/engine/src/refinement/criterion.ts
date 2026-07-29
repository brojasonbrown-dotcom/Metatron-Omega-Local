/**
 * refinement/criterion.ts — the φ⁻² / φ⁻⁴ refinement–coarsening criterion.
 *
 * Phase 1 of the AMR program (plan §3; CORE_VISION §5.D-20). Maps the measured
 * curvature λ (curvature.ts) onto a refine / hold / coarsen decision, with a
 * hysteresis band so the tree never oscillates.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE STANDING-WAVE LAW (the "why", golden rule 12 — derived relationship):
 *
 *   Refine   iff  λ >  φ⁻² · λ_ref   (local standing-wave instability: the
 *                                     field gradient exceeds the Master-
 *                                     Equation coherence threshold → the node
 *                                     cannot resolve its own structure).
 *   Coarsen  iff  λ <  φ⁻⁴ · λ_ref   (comfortably smooth → spend nodes elsewhere).
 *   Hold     otherwise               (the φ⁻²..φ⁻⁴ hysteresis band).
 *
 * The φ⁻²..φ⁻⁴ gap is a *contraction-style* no-oscillation guarantee: a node
 * that just refined (λ crossed φ⁻²) cannot immediately re-coarsen, because
 * coarsening needs λ to fall below the strictly-smaller φ⁻⁴. The band width
 * (φ⁻² − φ⁻⁴ = φ⁻³) is the proven no-chatter margin — EXACT, not tuned.
 *
 * Epistemic tags: the φ thresholds are [EXACT]; the operating point (that λ
 * should drive refinement at all) is [POSTULATE], ablation-ready (rule 6).
 */

import { REFINE_THRESHOLD, COARSEN_THRESHOLD } from "./constants.ts";

/** The three refinement decisions. Binary grow/shrink plus the hysteresis hold. */
export type RefinementDecision = "refine" | "hold" | "coarsen";

/**
 * Decide refine / hold / coarsen for a node from its normalised curvature λ
 * against a reference curvature scale λ_ref.
 *
 * @param lambda   Normalised curvature λ ≥ 0 (from curvatureLambda).
 * @param lambdaRef  Reference curvature scale λ_ref > 0 — the field's own
 *                   typical curvature (e.g. its max or a running normaliser),
 *                   so the criterion is scale-invariant and dimensionless.
 * @returns The decision, plus the threshold crossings for diagnostics.
 */
export function decideRefinement(
  lambda: number,
  lambdaRef: number
): { decision: RefinementDecision; refineAt: number; coarsenAt: number } {
  if (!(lambda >= 0) || !Number.isFinite(lambda)) {
    throw new Error(`decideRefinement: lambda must be ≥ 0 finite, got ${lambda}`);
  }
  if (!(lambdaRef > 0) || !Number.isFinite(lambdaRef)) {
    throw new Error(`decideRefinement: lambdaRef must be > 0 finite, got ${lambdaRef}`);
  }

  const refineAt = REFINE_THRESHOLD * lambdaRef; // φ⁻² · λ_ref
  const coarsenAt = COARSEN_THRESHOLD * lambdaRef; // φ⁻⁴ · λ_ref

  // Order matters: check the (higher) refine threshold first. A λ above φ⁻²
  // refines; a λ below φ⁻⁴ coarsens; anything in the band holds. Because
  // φ⁻⁴ < φ⁻² the two branches are disjoint — the band is the hold region.
  const decision: RefinementDecision =
    lambda > refineAt ? "refine" : lambda < coarsenAt ? "coarsen" : "hold";

  return { decision, refineAt, coarsenAt };
}

/**
 * The hysteresis band width, EXACT: φ⁻² − φ⁻⁴ = φ⁻³.
 * Exposed so tests assert the no-oscillation margin as a derived identity
 * (golden rule 12), not a magic number.
 */
export function hysteresisBandWidth(): number {
  return REFINE_THRESHOLD - COARSEN_THRESHOLD;
}
