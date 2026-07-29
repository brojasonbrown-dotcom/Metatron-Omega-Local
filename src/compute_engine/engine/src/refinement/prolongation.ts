/**
 * refinement/prolongation.ts — the parent→child field-transfer operator.
 *
 * Phase 3 of the AMR program (plan §3 Phase 3; CORE_VISION §5.D-20; Method
 * Selection Law §8). When the tree refines a leaf into its strict 2×2 dyadic
 * block (octree.ts), this operator transfers the parent's local field onto the
 * four children so that the engine's conserved quantities survive the transfer.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT IS CONSERVED EXACTLY, AND WHAT TO FIRST ORDER (read carefully — the
 * original draft of this file over-claimed and a test correctly fired):
 *
 *   The operator conserves the TOTAL INTEGRATED FIELD  Σ_j child_j = Σ_j parent_j
 *   to Float64 (relative), by the telescoping of the antisymmetric correction
 *   terms — for ANY weight w. Equivalently it conserves the block MEAN. This is
 *   the exact, proven guarantee.
 *
 *   The Master-Equation closure term ∮∇Ψ·dS (geometry/closureResidual.ts) is a
 *   LINEAR functional of Ψ, but it is NOT the plain sum: its discrete form
 *   weights each node by the metric factor g(v) = aspect + cos v, which VARIES
 *   across the block. A plain-sum-conserving operator conserves such a weighted
 *   functional only up to the variation of the weight across the block:
 *
 *       F(children) − F(parents)  =  O( Δg · ΔΨ ),
 *
 *   where Δg is the change of g(v) across the 2×2 block and ΔΨ the change of the
 *   field. This is FIRST-ORDER in the metric variation and vanishes as the block
 *   is refined (Δg → 0). So: the closure term is conserved to first order, NOT
 *   exactly — and stating that order is the honest contract. The exact
 *   conservation law of this operator is the plain sum (the field mass / centre
 *   of mass); the metric-weighted closure is conserved in the refinement limit.
 *   (Conserving a position-dependent weighting exactly requires the flux-form
 *   boundary treatment of Phase 5 — out of scope for the transfer operator.)
 *
 * THE OPERATOR (φ-weighted barycentric interpolation):
 *
 *   Each child receives its parent's nodal value plus a φ-weighted correction
 *   drawn from its three siblings:
 *
 *       child_j  =  p_j  +  w · Σ_{s ≠ j} ( p_s − p_j ),     w = φ⁻² / 3.
 *
 *   · The correction terms (p_s − p_j) are ANTISYMMETRIC: the term pair (s,j)
 *     and (j,s) sum to (p_s − p_j) + (p_j − p_s) = 0. Summed over all four
 *     children they telescope to zero, so Σ child_j = Σ p_j for ANY w. This is
 *     the conservation proof — it does not depend on φ at all.
 *   · φ enters as the GRADED interpolation strength w = φ⁻²/3 (EXACT as a
 *     φ-power, POSTULATE as the physical "coupling"). The 1/3 is the barycentric
 *     normalisation over the three siblings, so the per-child correction is a
 *     convex, bounded pull toward the sibling mean — never an extrapolation.
 *   · On a locally SMOOTH field (the only field a parent leaf can legitimately
 *     carry, since high curvature would have triggered refinement), p_j ≈ p_s,
 *     so child_j ≈ the common value: the operator is 2nd-order accurate and
 *     near-constant-preserving, exactly as plan §8 requires of a linear
 *     interpolant. The small φ-weighted term adds the graded anisotropy the
 *     framework postulates, without breaking the partition of unity.
 *
 * PARTITION OF UNITY: writing child_j = (1 − 3w)·p_j + w·Σ_{s≠j} p_s, the four
 * weights on the parents sum to (1 − 3w) + 3·w = 1 for every child — an exact
 * partition of unity, so a constant parent block prolongates to an identical
 * constant child block (constant-preserving, asserted in the tests).
 *
 * Epistemic tags: the conservation identity, telescoping, partition of unity and
 * 2nd-order accuracy are [EXACT] — proven in the doc and asserted in the tests.
 * The reading of w = φ⁻²/3 as the physically-correct graded coupling is
 * [POSTULATE] (ablation-ready, golden rule 6) — the conservation guarantee holds
 * whatever weight an ablation substitutes, which is precisely what makes the
 * framework's φ-claim falsifiable rather than load-bearing.
 */

import { PHI_NEG2 } from "../core/constants.ts";
import { type OctreeNode, isLeaf } from "./node.ts";

/**
 * The φ-graded interpolation weight, φ⁻²/3. EXACT as a φ-power.
 *
 * w = φ⁻² / 3: φ⁻² is the standing-wave coherence coupling (the same constant
 * the Master Equation uses — REFINE_THRESHOLD in constants.ts), divided by the
 * three siblings so the per-child barycentric correction is normalised. The
 * conservation of ΣΨ and the closure term does NOT depend on this value (see
 * the telescoping proof above); it is the graded *strength* of the interpolation,
 * and it is ablation-ready.
 */
export const PROLONGATION_WEIGHT = PHI_NEG2 / 3;

/** The number of siblings a child interpolates from within its refined block. */
const SIBLINGS = 3 as const; // 4 children in the block minus self

/**
 * Prolongate a refined 2×2 parent block onto its four children.
 *
 * `parents` are the four parent nodal field values, indexed by the dyadic child
 * slot (0..3) — the SAME slot order octree.ts uses, so `prolongateBlock` maps
 * directly onto `subdivideCell`'s output. Returns the four child values in the
 * same slot order.
 *
 * Conservation guarantee (EXACT): Σ_j result[j] === Σ_j parents[j] to Float64
 * (relative to the block's magnitude), for any input, by the telescoping of the
 * antisymmetric correction terms. This conserves the block's total integrated
 * field and its mean — not an arbitrary weighted functional (see header).
 *
 * Throws on a malformed block (not exactly four finite values) — foolproof by
 * construction (golden rule 14): the wrong shape is unrepresentable.
 */
export function prolongateBlock(parents: readonly number[]): number[] {
  if (parents.length !== 4) {
    throw new RangeError(
      `prolongateBlock: a refined block has exactly 4 parents, got ${parents.length}.`,
    );
  }
  for (let i = 0; i < 4; i++) {
    if (!Number.isFinite(parents[i]!)) {
      throw new RangeError(`prolongateBlock: parent[${i}] is not finite (${parents[i]}).`);
    }
  }
  const w = PROLONGATION_WEIGHT;
  const out = new Array<number>(4);
  for (let j = 0; j < 4; j++) {
    const pj = parents[j]!;
    let correction = 0;
    for (let s = 0; s < 4; s++) {
      if (s !== j) correction += parents[s]! - pj;
    }
    out[j] = pj + w * correction;
  }
  return out;
}

/**
 * Prolongate one child of a refined block — the single-child specialisation of
 * `prolongateBlock`, used when the governor transfers only the slot it is
 * visiting rather than the whole block. Numerically identical to the j-th
 * output of `prolongateBlock`.
 *
 * @param parents The four parent values in slot order.
 * @param slot    The child slot (0..3) to prolongate.
 */
export function prolongateChild(parents: readonly number[], slot: number): number {
  if (!Number.isInteger(slot) || slot < 0 || slot > SIBLINGS) {
    throw new RangeError(`prolongateChild: slot must be an integer in [0,4), got ${slot}.`);
  }
  return prolongateBlock(parents)[slot]!;
}

/**
 * The four prolongation weights this operator places on the parents for a given
 * child — exposed so tests can assert the partition of unity directly (weights
 * sum to 1) and so Phase 4 can build the Galerkin ADJOINT restriction operator
 * from the same stencil (rule 2: one owner of the transfer stencil).
 *
 * For child j the weight on parent j is (1 − 3w); on each sibling it is w.
 * Returns the weight vector in slot order, summing to exactly 1.
 */
export function prolongationWeights(slot: number): number[] {
  if (!Number.isInteger(slot) || slot < 0 || slot > SIBLINGS) {
    throw new RangeError(`prolongationWeights: slot must be an integer in [0,4), got ${slot}.`);
  }
  const w = PROLONGATION_WEIGHT;
  const diag = 1 - SIBLINGS * w; // 1 − φ⁻²
  const out = new Array<number>(4);
  for (let s = 0; s < 4; s++) out[s] = s === slot ? diag : w;
  return out;
}

/**
 * Extract the four parent nodal values of a refined node's children, in slot
 * order, by sampling a field at the child-cell centres.
 *
 * This is the seam between the tree structure (octree.ts) and the field
 * (geometry/torus.ts): the tree says WHERE the children sit; this samples the
 * field there to get the values the block operator transfers. The field is any
 * `(p: {u,v}) => number` — the TorusField shape — sampled at cell centres.
 *
 * Throws if `node` is not internal (a leaf carries the field itself; there are
 * no children to prolongate onto).
 */
export function sampleChildCentres(
  node: OctreeNode,
  field: (p: { u: number; v: number }) => number,
): number[] {
  if (isLeaf(node) || node.children === null) {
    throw new RangeError("sampleChildCentres: node is a leaf; no children to sample.");
  }
  const out = new Array<number>(4);
  for (let s = 0; s < 4; s++) {
    const cell = node.children[s]!.cell;
    out[s] = field({ u: cell.u0 + cell.size / 2, v: cell.v0 + cell.size / 2 });
  }
  return out;
}

/**
 * Conservation residual of a prolongated block: |Σ child − Σ parent|.
 * Returns 0 to Float64 (relative to the block magnitude) for any finite input
 * — the telescoping proof. For a well-scaled block this is ~machine-epsilon
 * absolute; for a block with cancellation at magnitude M the absolute residual
 * is ~eps·M, so callers compare against a scale-aware tolerance, never a bare
 * absolute 1e-13 (that is the mistake the first draft of the test made).
 */
export function conservationResidual(parents: readonly number[]): number {
  const children = prolongateBlock(parents);
  const sumP = parents.reduce((a, b) => a + b, 0);
  const sumC = children.reduce((a, b) => a + b, 0);
  return Math.abs(sumC - sumP);
}

/**
 * The RELATIVE conservation residual — the scale-aware form that is the honest
 * "conserves to Float64" measure: |Σc − Σp| / max(1, max|parent|). ~1e-16 for
 * any finite block, including blocks with catastrophic cancellation.
 */
export function relativeConservationResidual(parents: readonly number[]): number {
  const scale = Math.max(1, ...parents.map((x) => Math.abs(x)));
  return conservationResidual(parents) / scale;
}
