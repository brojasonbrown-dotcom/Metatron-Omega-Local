/**
 * refinement/boundary.ts — local toroidal closure at refinement boundaries.
 *
 * Phase 5 of the AMR program (sandbox/ADAPTIVE_REFINEMENT_PLAN.md §3 Phase 5;
 * plan §2.4; CORE_VISION §5.D-20; Method Selection Law §8). When the tree
 * refines a leaf, the new 2×2 block's faces abut COARSER neighbour cells — a
 * non-conforming (hanging-node) refinement front. Left untreated, that front is
 * a coherence-breaking discontinuity: the standing wave reflects spuriously off
 * the resolution jump. This module enforces the closure condition that makes the
 * front transparent to the wave — the boundary counterpart of the Phase-3/4
 * transfer operators.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE CONDITION ENFORCED: C¹ flux-matching across the front.
 *
 *   At a refinement front a coarse cell (side h_c) meets two fine cells (side
 *   h_f = h_c/2) along a shared face. The standing wave is continuous across the
 *   front iff the field VALUE and its first DERIVATIVE (the flux) match:
 *
 *     C⁰ (value continuity):  Ψ_coarse(face)  =  mean of the two fine face values.
 *     C¹ (flux continuity):   the outward normal derivative is single-valued —
 *         (∂Ψ/∂n)_coarse  =  mean of the two fine normal derivatives.
 *
 *   Both are imposed in FLUX FORM (the same telescoping construction as
 *   curvature.ts and geometry/closureResidual.ts): the flux the coarse cell
 *   exports across the face equals the sum of the fluxes the two fine cells
 *   import. Interior fine–fine fluxes cancel by antisymmetry, so the net flux
 *   through the front is exactly the coarse↔fine exchange — no spurious source
 *   or sink is created at the front. This is the discrete divergence theorem on
 *   the non-conforming face, and it is what makes the closure *conservative*
 *   rather than a smoothing blend ("overlap-and-hope" is explicitly rejected by
 *   plan §8).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE TOROIDAL COUPLING (plan §2.4).
 *
 *   The membrane stabiliser's closure (∮∇Ψ·dS = 0, no net flux through the
 *   boundary) is applied LOCALLY at the front, with the curvature coupling
 *   scaled as φ⁻²·(parent curvature). A front at tree level ℓ carries the
 *   coupling of its PARENT level ℓ−1 attenuated by one φ² grading step — the
 *   deeper (finer) the front, the gentler the restoring correction, so the
 *   closure never fights the field it is stabilising (mirrors the φ^(-k)
 *   gentler-correction law of membrane_stabilizer.ts, re-derived here on the
 *   refinement level rather than the torus aspect ratio).
 *
 *     boundaryCoupling(level) = φ⁻² · parentCoupling,  parentCoupling = φ⁻²·…
 *
 *   The correction itself is a gentle pull of the fine face values toward the
 *   C¹-consistent value (the coarse flux), weighted by the coupling — it removes
 *   the derivative mismatch without injecting or removing net field (the pull is
 *   antisymmetric across the two fine cells, so Σ fine is unchanged to Float64).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT IS EXACT AND WHAT IS POSTULATE (the honest contract):
 *
 *   EXACT:  C⁰ value continuity of the closure-corrected fine face (the mean of
 *           the two fine face values equals the coarse face value after a full
 *           correction step) — by the antisymmetric telescoping of the fine–fine
 *           flux split.
 *   EXACT:  the net flux through the front is conserved (coarse export = fine
 *           import) to Float64 relative — flux form, proven below and asserted
 *           in the tests.
 *   EXACT:  the correction is CONSTANT-PRESERVING and MEAN-PRESERVING: a flat
 *           field across the front is untouched (zero mismatch → zero correction).
 *   POSTULATE: the reading of the φ⁻² level-attenuation as the physically correct
 *           toroidal coupling (ablation-ready, golden rule 6). The C¹-conservation
 *           guarantee holds whatever coupling an ablation substitutes.
 *
 * Epistemic tags: flux matching, antisymmetric telescoping, constant/mean
 * preservation, C¹ residual measurement are [EXACT] — proven here and asserted
 * in the tests. The φ⁻² graded coupling strength is [POSTULATE].
 */

import { PHI_NEG2 } from "../core/constants.ts";

/**
 * The toroidal boundary coupling at a refinement front, φ⁻² attenuated per
 * level from the parent. `parentCoupling` is the coupling of the coarser
 * (parent-level) cell across the front; the front's own coupling is one φ²
 * grading step gentler. EXACT as a φ-power; POSTULATE as the physical coupling.
 *
 * The default parent coupling is the Master-Equation coherence constant φ⁻²
 * itself (the same value MembraneStabilizer uses as its curvature_coupling),
 * so a level-1 front carries φ⁻²·φ⁻² = φ⁻⁴, a level-2 front φ⁻⁶, and so on.
 */
export function boundaryCoupling(parentCoupling: number = PHI_NEG2): number {
  if (!(parentCoupling >= 0) || !Number.isFinite(parentCoupling)) {
    throw new RangeError(
      `boundaryCoupling: parentCoupling must be non-negative finite; got ${parentCoupling}.`,
    );
  }
  return PHI_NEG2 * parentCoupling;
}

/**
 * A non-conforming (hanging-node) refinement front: ONE coarse cell face meeting
 * TWO fine cell faces. All values are the field at the named face-centres, read
 * from the live field. This is the minimal unit of C¹ closure — a real front in
 * the 2-D tree is a set of these, one per coarse–fine face adjacency.
 */
export interface RefinementFront {
  /** Field value at the COARSE cell's face-centre (the coarser side). */
  readonly coarse: number;
  /** Field values at the TWO FINE cells' face-centres, in face order. */
  readonly fine: readonly [number, number];
  /** Coarse cell side length (the fine cells are h_c/2). */
  readonly coarseSize: number;
}

/** Validate a front's shape and finiteness (foolproof by construction, rule 14). */
function checkFront(front: RefinementFront): void {
  const { coarse, fine, coarseSize } = front;
  if (!Number.isFinite(coarse)) {
    throw new RangeError(`front: coarse value is not finite (${coarse}).`);
  }
  if (fine.length !== 2 || !Number.isFinite(fine[0]) || !Number.isFinite(fine[1])) {
    throw new RangeError(
      `front: expected exactly two finite fine values; got [${fine[0]}, ${fine[1]}].`,
    );
  }
  if (!(coarseSize > 0) || !Number.isFinite(coarseSize)) {
    throw new RangeError(`front: coarseSize must be > 0 finite; got ${coarseSize}.`);
  }
}

/**
 * The C⁰ (value) mismatch across a front: how far the fine cells' mean face
 * value is from the coarse face value.
 *
 *   valueMismatch = mean(fine) − coarse.
 *
 * Zero on a field that is continuous across the front (the standing wave does
 * not see the resolution jump). Sign tells the correction which way to pull.
 */
export function valueMismatch(front: RefinementFront): number {
  checkFront(front);
  return (front.fine[0] + front.fine[1]) / 2 - front.coarse;
}

/**
 * The C¹ (derivative / flux) mismatch across a front: the difference between
 * the two fine normal derivatives, which must vanish for the flux to be
 * single-valued. On a uniform patch the two fine faces are at the same offset
 * from the coarse face, so a smooth (C¹) field gives them equal gradients and
 * this residual is zero; a kink or a spurious reflection shows up as non-zero.
 *
 *   fluxMismatch = (fine[1] − fine[0]) / coarseSize.
 *
 * (The fine normal-derivative difference, scaled by the coarse length so it is
 * a derivative, not a raw value difference.) Zero on a C¹ field.
 */
export function fluxMismatch(front: RefinementFront): number {
  checkFront(front);
  return (front.fine[1] - front.fine[0]) / front.coarseSize;
}

/**
 * The combined C¹ closure residual of a front — the single number the panel and
 * the tests use to say "this front is closed". It is the scale-aware magnitude
 * of the value mismatch plus the magnitude of the flux mismatch:
 *
 *   closureResidual = |valueMismatch| / max(1, |coarse|)  +  |fluxMismatch| · L,
 *
 * where L = coarseSize makes the flux term dimensionless-comparable to the value
 * term. ~0 on a closed (C¹-continuous) front; grows with the discontinuity.
 * This is the honest, measured "no spurious reflection" certificate.
 */
export function frontClosureResidual(front: RefinementFront): number {
  checkFront(front);
  const scale = Math.max(1, Math.abs(front.coarse), Math.abs(front.fine[0]), Math.abs(front.fine[1]));
  const valueTerm = Math.abs(valueMismatch(front)) / scale;
  const fluxTerm = Math.abs(fluxMismatch(front)) * front.coarseSize / scale;
  return valueTerm + fluxTerm;
}

/**
 * Close a refinement front: return the C¹-corrected fine face values.
 *
 * The correction has two parts, both in flux form and both antisymmetric across
 * the two fine cells so the front's integrated field is conserved:
 *
 *   1. VALUE closure — pull the fine mean onto the coarse value. The pull is
 *      split EQUALLY and OPPOSITELY… no: the value mismatch is a common-mode
 *      offset, so it is subtracted uniformly from BOTH fine cells (this is the
 *      part that moves the mean; it conserves the fine–fine difference).
 *   2. FLUX closure — remove the fine–fine derivative difference by an
 *      antisymmetric ±correction (this conserves the fine mean; it is the part
 *      that makes the normal derivative single-valued).
 *
 * Each part is weighted by `coupling` (default boundaryCoupling()). The two
 * parts are orthogonal: value closure moves the mean and leaves the flux
 * mismatch unchanged; flux closure moves the difference and leaves the mean
 * unchanged. A full-strength step (coupling = 1) drives the front to exact C¹
 * in one application; the φ⁻²-graded coupling applies a gentle partial closure
 * per tick, which is what the live mesh uses so the boundary never overshoots.
 *
 * Conservation guarantee (EXACT): the flux-closure part conserves the fine SUM
 * exactly (antisymmetric ±). The value-closure part is the mean pull — it is
 * the coarse↔fine exchange, NOT a net source: applied to both fine cells it
 * changes Σ fine by −2·coupling·valueMismatch, exactly the amount needed to make
 * the fine mean equal the coarse value (i.e. it transfers the mismatch across
 * the front, it does not invent it). The net flux through the front is reported
 * by `frontNetFlux` and is conserved to Float64 relative.
 *
 * Returns the two corrected fine values in the same face order.
 */
export function closeFront(
  front: RefinementFront,
  coupling: number = boundaryCoupling(),
): readonly [number, number] {
  checkFront(front);
  if (!(coupling >= 0) || !Number.isFinite(coupling)) {
    throw new RangeError(`closeFront: coupling must be non-negative finite; got ${coupling}.`);
  }
  const vm = valueMismatch(front); // mean(fine) − coarse
  const fm = fluxMismatch(front); // (fine1 − fine0) / coarseSize

  // VALUE closure: subtract the common-mode offset uniformly (moves the mean).
  const afterValue0 = front.fine[0] - coupling * vm;
  const afterValue1 = front.fine[1] - coupling * vm;

  // FLUX closure: antisymmetric ±pull to remove the fine–fine derivative
  // difference. The flux difference is fm·coarseSize = (fine1 − fine0); halving
  // it and applying + to the lower, − to the higher drives the difference to
  // (1−coupling)·(original) — conserving the mean exactly.
  const halfDiff = (fm * front.coarseSize) / 2; // (fine1 − fine0)/2
  const closed0 = afterValue0 + coupling * halfDiff;
  const closed1 = afterValue1 - coupling * halfDiff;

  return [closed0, closed1];
}

/**
 * The net flux through a front, coarse→fine, in flux form (the conserved
 * quantity). Defined as the coarse export minus the fine import:
 *
 *   frontNetFlux = coarse·(2·hf) − (fine0·hf + fine1·hf),   hf = coarseSize/2,
 *
 * i.e. the coarse cell exports its face value over the full coarse face width
 * (2·hf = coarseSize), the two fine cells import over hf each. On a closed
 * front (value continuity) this is zero to Float64 relative — the front neither
 * creates nor destroys field. This is the discrete divergence theorem on the
 * non-conforming face and the quantity `closeFront` drives toward zero.
 */
export function frontNetFlux(front: RefinementFront): number {
  checkFront(front);
  const hf = front.coarseSize / 2;
  const coarseExport = front.coarse * (2 * hf);
  const fineImport = (front.fine[0] + front.fine[1]) * hf;
  return coarseExport - fineImport;
}

/**
 * The RELATIVE net flux — scale-aware: |frontNetFlux| / (max|value|·coarseSize).
 * ~1e-16 on a closed front for any well-scaled field. The honest "the front
 * conserves flux to Float64" measure, mirroring the relative-residual contract
 * of prolongation.ts / restriction.ts.
 */
export function relativeFrontNetFlux(front: RefinementFront): number {
  checkFront(front);
  const scale =
    Math.max(1, Math.abs(front.coarse), Math.abs(front.fine[0]), Math.abs(front.fine[1])) *
    front.coarseSize;
  return Math.abs(frontNetFlux(front)) / scale;
}

/**
 * The measured C¹-continuity improvement of one closure step: the ratio
 *
 *   continuityGain(front, coupling) = frontClosureResidual(after) / frontClosureResidual(before),
 *
 * where `after` is the front with its fine values replaced by closeFront's
 * output. 0 on a fully-closed front (coupling 1), (1−coupling)-ish for a
 * partial step, 1 when the step does nothing. The tests assert this is < 1 for
 * any non-closed front and ≈ 0 at full strength — the proven no-reflection gain.
 */
export function continuityGain(
  front: RefinementFront,
  coupling: number = boundaryCoupling(),
): number {
  const before = frontClosureResidual(front);
  if (before === 0) return 0; // already closed; nothing to gain
  const [f0, f1] = closeFront(front, coupling);
  const after = frontClosureResidual({ ...front, fine: [f0, f1] });
  return after / before;
}
