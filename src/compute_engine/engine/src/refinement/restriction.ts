/**
 * refinement/restriction.ts — the child→parent field-transfer operator.
 *
 * Phase 4 of the AMR program (plan §3 Phase 4; CORE_VISION §5.D-20; Method
 * Selection Law §8). When the tree coarsens a refined 2×2 block back into its
 * parent leaf (or when the governor downscales under memory pressure — §5.E),
 * this operator transfers the four child nodal values back onto the parent
 * block so the engine's conserved quantities survive the transfer in the
 * direction prolongation.ts does not cover.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE OPERATOR, AND WHY IT IS THE TRANSPOSE (derived, then verified against
 * the code — three hand-derivations of this failed and a brute-force
 * finite-difference check against prolongateBlock caught each one; the final
 * form below is the one the evidence supports, not the first one written):
 *
 *   Prolongation is linear: child_j = Σ_s P_js p_s with
 *       P_js = δ_js(1−3w) + (1−δ_js) w,  w = φ⁻²/3   (prolongation.ts).
 *   Rearranged,  P = (1−4w)·I + w·J  where J is the all-ones matrix. Two
 *   structural facts follow immediately and are verified numerically:
 *     · P is SYMMETRIC (P_js = P_sj), so its Galerkin transpose is itself:
 *       Pᵀ = P.  (max|P − Pᵀ| = 0 by finite difference.)
 *     · P is DOUBLY STOCHASTIC (every row AND column sums to exactly 1).
 *
 *   The restriction operator is the Galerkin ADJOINT (transpose) of
 *   prolongation — golden rule 2, one owner of the transfer stencil:
 *       R = Pᵀ = P.
 *   Because P is doubly stochastic, R conserves the integrated field EXACTLY,
 *   with NO extra area factor:
 *       Σ_s (R c)_s = Σ_s Σ_j P_js c_j = Σ_j c_j (Σ_s P_js) = Σ_j c_j · 1.
 *   (The column sums Σ_s P_js are all 1 — that is precisely what makes the
 *   mass come out unchanged. An earlier draft multiplied by the dyadic area
 *   factor ¼; that broke both conservation and constant-preservation, and the
 *   reference harness caught it. There is no ¼ — see the derivation above.)
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT IS CONSERVED EXACTLY, AND WHAT IS ATTENUATED (read carefully — plan
 * §2.3 says restriction "conserves energy and coherence", which is the same
 * species of over-claim Phase 3 caught; the tests below pin the honest law):
 *
 *   EXACT:   the integrated field Σ_s parent_s = Σ_j child_j, equivalently the
 *            block MEAN. Proven by double stochasticity; holds for ANY weight
 *            w, independent of φ. This is the exact conservation law.
 *
 *   EXACT:   constant preservation. A uniform child block c_s = C restricts to
 *            C on every parent (R's rows each sum to 1). A constant field is
 *            untouched by coarsening — as it must be.
 *
 *   ATTENUATED (not conserved — and correctly so): the high-frequency content.
 *   P's eigenvalues are {1, (1−4w), (1−4w), (1−4w)}: 1 on the constant mode,
 *   (1−4w) = 1 − 4φ⁻²/3 ≈ 0.4907 on EVERY zero-mean mode. The round-trip
 *   A = R·P = P² therefore has eigenvalues {1, (1−4w)² ×3} = {1, 0.2408 ×3}:
 *     · a CONSTANT field round-trips EXACTLY (eigenvalue 1);
 *     · every ZERO-MEAN (high-frequency) component is multiplied by
 *       (1−4w)² ≈ 0.241 per refine→coarsen cycle — i.e. ~76% of its energy is
 *       removed. This is the CORRECT behaviour of a coarsening operator: it is
 *       an anti-aliasing smoother that removes the sub-parent-grid content the
 *       coarse block can no longer represent, rather than aliasing it into the
 *       coarse modes. The energy is not "lost" — it is the part of the field
 *       the coarser mesh has genuinely stopped resolving, and `energyRatio`
 *       below measures exactly how much.
 *   This is the honest replacement for "conserves energy": restriction
 *   conserves the MEAN exactly and attenuates the VARIANCE by a measured,
 *   proven factor. Phase 7's falsification battery checks the attenuation
 *   against (1−4w)².
 *
 *   NOT idempotent: R·P·R ≠ R. Coarsening is a smoother, not a projector — a
 *   second coarsen of the same field removes a little more. This is expected
 *   and is why the governor (§5.E) uses hysteresis, never a bare re-refine.
 *
 * THE OPERATOR (Galerkin / mass-conserving restriction, R = P):
 *
 *   parent_s  =  (1 − 3w)·c_s  +  w·Σ_{r ≠ s} c_r ,     w = φ⁻²/3.
 *
 *   · (1−3w)·c_s is the self-weight; w·c_r the φ-weighted pull from each
 *     sibling. Per-parent the weights sum to (1−3w) + 3w = 1 (constant-
 *     preserving); summed over all four parents they conserve Σ child.
 *
 * Epistemic tags: symmetry, double stochasticity, exact mass/mean conservation,
 * constant preservation and the (1−4w)² round-trip attenuation are [EXACT] —
 * proven here and asserted in the tests. The reading of w = φ⁻²/3 as the
 * physically-correct graded coupling is [POSTULATE] (ablation-ready, golden
 * rule 6): the conservation guarantee holds whatever weight an ablation
 * substitutes, which is what makes the φ-claim falsifiable, not load-bearing.
 */

import { PROLONGATION_WEIGHT } from "./prolongation.ts";

/**
 * The φ-graded restriction weight — the SAME φ⁻²/3 as prolongation (golden
 * rule 2: one owner of the transfer stencil). Restriction is the adjoint of
 * prolongation, not an independent operator, so it reads the weight from
 * prolongation.ts rather than re-deriving it. EXACT as a φ-power; POSTULATE as
 * the physical coupling (ablation-ready).
 */
export const RESTRICTION_WEIGHT = PROLONGATION_WEIGHT;

/** The number of siblings a parent gathers from within its coarsened block. */
const SIBLINGS = 3 as const; // 4 children in the block minus self

/**
 * The four restriction weights this operator places on the children for a given
 * parent — exposed so tests can assert the conservation identity directly and
 * so a Galerkin assembler can read the exact transpose stencil (rule 2).
 *
 * For parent s the weight on child s is (1 − 3w); on each sibling it is w —
 * IDENTICAL to prolongationWeights, because P is symmetric (R = Pᵀ = P). The
 * weights sum to exactly 1 per parent (constant-preserving). Returns the weight
 * vector in slot order.
 */
export function restrictionWeights(slot: number): number[] {
  if (!Number.isInteger(slot) || slot < 0 || slot > SIBLINGS) {
    throw new RangeError(`restrictionWeights: slot must be an integer in [0,4), got ${slot}.`);
  }
  const w = RESTRICTION_WEIGHT;
  const diag = 1 - SIBLINGS * w; // 1 − φ⁻²  (the self-weight)
  const out = new Array<number>(4);
  for (let r = 0; r < 4; r++) out[r] = r === slot ? diag : w;
  return out;
}

/**
 * Restrict a refined 2×2 child block onto its four parent nodal values.
 *
 * `children` are the four child nodal field values, indexed by the dyadic child
 * slot (0..3) — the SAME slot order octree.ts and prolongation.ts use. Returns
 * the four parent values in the same slot order.
 *
 * Conservation guarantee (EXACT): Σ_s result[s] === Σ_s children[s] to Float64
 * (relative to the block magnitude), for any input, by double stochasticity of
 * the transpose stencil. Conserves the block's total integrated field and its
 * mean. Does NOT conserve energy/coherence of a resolved block — that content
 * is attenuated by the proven (1−4w)² factor (see the header), never silently.
 *
 * Throws on a malformed block (not exactly four finite values) — foolproof by
 * construction (golden rule 14): the wrong shape is unrepresentable.
 */
export function restrictBlock(children: readonly number[]): number[] {
  if (children.length !== 4) {
    throw new RangeError(
      `restrictBlock: a coarsened block has exactly 4 children, got ${children.length}.`,
    );
  }
  for (let i = 0; i < 4; i++) {
    if (!Number.isFinite(children[i]!)) {
      throw new RangeError(`restrictBlock: child[${i}] is not finite (${children[i]}).`);
    }
  }
  const w = RESTRICTION_WEIGHT;
  const diag = 1 - SIBLINGS * w;
  const out = new Array<number>(4);
  for (let s = 0; s < 4; s++) {
    let siblings = 0;
    for (let r = 0; r < 4; r++) {
      if (r !== s) siblings += children[r]!;
    }
    out[s] = diag * children[s]! + w * siblings;
  }
  return out;
}

/**
 * Restrict one parent of a coarsened block — the single-parent specialisation
 * of `restrictBlock`, used when the governor transfers only the slot it is
 * visiting. Numerically identical to the s-th output of `restrictBlock`.
 *
 * @param children The four child values in slot order.
 * @param slot     The parent slot (0..3) to restrict onto.
 */
export function restrictParent(children: readonly number[], slot: number): number {
  if (!Number.isInteger(slot) || slot < 0 || slot > SIBLINGS) {
    throw new RangeError(`restrictParent: slot must be an integer in [0,4), got ${slot}.`);
  }
  return restrictBlock(children)[slot]!;
}

/**
 * PARTIAL restriction — restrict only the slots present in `slots`, passing the
 * others through unchanged.
 *
 * Plan §3 Phase 4: "handles the case where only some children are refined." In
 * this tree a node is either a leaf or fully internal (node.ts strict dyadic
 * invariant — never a partial child set), so a partially-refined block cannot
 * occur in the STRUCTURE. It occurs in the FIELD during a STAGED coarsen: the
 * governor restricts one slot at a time under memory pressure, so a slot may be
 * restricted while its siblings are not yet processed. This operator restricts
 * exactly the requested slots and leaves the rest as their raw child values, so
 * the governor can stage a coarsen incrementally without ever holding a
 * half-built block.
 *
 * Conservation note (honest): a SUBSET restriction is an intermediate state,
 * not a conserved one. The exact Σ parent = Σ child law holds only once ALL
 * four slots are restricted (i.e. `restrictBlock`). Callers must not treat a
 * partially-restricted block as conservation-valid. Asserted in the tests.
 *
 * @param children The four child values in slot order.
 * @param slots    The slots to restrict; the rest pass through unchanged.
 */
export function restrictPartial(
  children: readonly number[],
  slots: readonly number[],
): number[] {
  const full = restrictBlock(children); // validates shape + finiteness
  const out = children.slice();
  for (const slot of slots) {
    if (!Number.isInteger(slot) || slot < 0 || slot > SIBLINGS) {
      throw new RangeError(`restrictPartial: slot must be an integer in [0,4), got ${slot}.`);
    }
    out[slot] = full[slot]!;
  }
  return out;
}

/**
 * Round-trip defect of refine→coarsen on a parent block:
 *   roundTripDefect(p) = max_s | (restrict ∘ prolong)(p)_s − p_s |.
 *
 * The measurable signature of the round-trip eigenstructure (header):
 *   · 0 to Float64 on a CONSTANT parent block (eigenvalue 1);
 *   · (1 − (1−4w)²) ≈ 0.759 × the size of p's zero-mean component on a block
 *     carrying a high-frequency feature — the proven ~76% attenuation.
 * Compare against a scale-aware tolerance, never a bare absolute value.
 */
export function roundTripDefect(parents: readonly number[]): number {
  const w = RESTRICTION_WEIGHT;
  if (parents.length !== 4) {
    throw new RangeError(`roundTripDefect: expected 4 parents, got ${parents.length}.`);
  }
  for (let i = 0; i < 4; i++) {
    if (!Number.isFinite(parents[i]!)) {
      throw new RangeError(`roundTripDefect: parent[${i}] is not finite (${parents[i]}).`);
    }
  }
  // prolong (inline, to keep the dependency one-way: prolongation.ts does NOT
  // import restriction.ts, so restriction inlines P rather than importing it).
  const diagP = 1 - SIBLINGS * w;
  const prolonged = new Array<number>(4);
  for (let j = 0; j < 4; j++) {
    let siblings = 0;
    for (let s = 0; s < 4; s++) if (s !== j) siblings += parents[s]!;
    prolonged[j] = diagP * parents[j]! + w * siblings;
  }
  const restricted = restrictBlock(prolonged);
  let maxDefect = 0;
  for (let s = 0; s < 4; s++) {
    maxDefect = Math.max(maxDefect, Math.abs(restricted[s]! - parents[s]!));
  }
  return maxDefect;
}

/**
 * The RELATIVE round-trip defect — scale-aware: roundTripDefect(p) /
 * max(1, max|parent|). ~1e-16 on constant blocks; ≈0.759 × (zero-mean
 * fraction) on sharp blocks. The honest "round-trips to Float64" measure for
 * the constant/mean component only.
 */
export function relativeRoundTripDefect(parents: readonly number[]): number {
  const scale = Math.max(1, ...parents.map((x) => Math.abs(x)));
  return roundTripDefect(parents) / scale;
}

/**
 * Energy ratio of a coarsen:  ‖R(c)‖² / ‖c‖²  (both Euclidean norms).
 *
 * The honest, quantitative replacement for the plan's "conserves energy": it
 * does NOT conserve energy, it MEASURES the retained fraction.
 *   · 1.0 on a constant block (the mean is fully retained);
 *   · (1−4w)² ≈ 0.241 on a pure zero-mean mode (76% of the high-frequency
 *     energy is removed by the anti-aliasing coarsen);
 *   · in between for a mixed block, weighted by the constant/zero-mean split.
 * Returns 1 for the all-zero block (no energy to lose; defined as 1 by
 * convention so callers never divide by zero).
 */
export function energyRatio(children: readonly number[]): number {
  const restricted = restrictBlock(children);
  const n2 = (a: readonly number[]) => a.reduce((s, x) => s + x * x, 0);
  const before = n2(children);
  if (before === 0) return 1;
  return n2(restricted) / before;
}

/**
 * Conservation residual of a restricted block: |Σ parent − Σ child|.
 * Returns 0 to Float64 (relative to the block magnitude) for any finite input —
 * the double-stochasticity proof. Scale-aware callers use the relative form.
 */
export function restrictionConservationResidual(children: readonly number[]): number {
  const parents = restrictBlock(children);
  const sumC = children.reduce((a, b) => a + b, 0);
  const sumP = parents.reduce((a, b) => a + b, 0);
  return Math.abs(sumP - sumC);
}

/**
 * The RELATIVE conservation residual — |Σp − Σc| / max(1, max|child|). ~1e-16
 * for any finite block, including blocks with catastrophic cancellation. The
 * honest "conserves to Float64" measure (mirrors prolongation.ts's contract).
 */
export function relativeRestrictionResidual(children: readonly number[]): number {
  const scale = Math.max(1, ...children.map((x) => Math.abs(x)));
  return restrictionConservationResidual(children) / scale;
}
