/**
 * refinement/curvature.ts — the local field-curvature estimator λ.
 *
 * Phase 1 of the AMR program (sandbox/ADAPTIVE_REFINEMENT_PLAN.md §3; CORE_VISION
 * §5.D-20). λ(node) = |∇²Ψ| / |Ψ| is the signal that decides where the tree
 * spends nodes: high λ marks information-dense (turbulent / shocked / phase-
 * transitional) regions that justify refinement; low λ marks smooth regions to
 * keep sparse. This is "direct the information where it is truly most efficient"
 * made measurable.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * METHOD (§C Method Selection Law — strongest complete method, rule 15/18):
 *
 *   Conservative 5-point discrete Laplacian in FLUX FORM — the same telescoping
 *   construction that fixed audit finding F5 in geometry/closureResidual.ts.
 *   The Laplacian is written as a sum of interface fluxes so that, summed over
 *   a region, interior terms cancel (telescope) to round-off. This is the
 *   discrete analogue of the divergence theorem and is what makes the estimator
 *   *robust* rather than a naive central difference that fails to conserve.
 *
 *     (∇²Ψ)_i ≈ (1/Δx²) · Σ_neighbours (Ψ_j − Ψ_i)
 *
 *   Properties (proven, and asserted in the tests):
 *     · EXACTLY ZERO on constant fields   (all Ψ_j = Ψ_i).
 *     · EXACTLY ZERO on linear fields     (Ψ = a·x + b: symmetric neighbours
 *                                          cancel to round-off).
 *     · EXACT on quadratics to round-off  (Ψ = x² → ∇²Ψ = 2 exactly, the
 *                                          classic 5-point identity).
 *     · BOUNDED on C¹ fields              (|∇²Ψ| ≤ 4·max|Ψ|/Δx²).
 *
 * Epistemic tags: the discrete-Laplacian algebra is [EXACT]; the *interpretation*
 * of λ as "information density justifying refinement" is [POSTULATE]
 * (ablation-ready, golden rule 6).
 */

/** A node's local field sampled on a uniform d-dimensional patch.
 *  `values` holds the centre plus its face-neighbours in CENTER-FIRST order:
 *  index 0 is the node centre, indices 1..2d are the ±axis neighbours.
 *  `dx` is the patch spacing (field length scale at this refinement level). */
export interface FieldPatch {
  /** Centre value first, then the 2·dim face neighbours (+x,−x,+y,−y,…). */
  readonly values: readonly number[];
  /** Uniform grid spacing of the patch (same units as the field coordinate). */
  readonly dx: number;
  /** Topological dimension of the patch (1, 2, or 3). */
  readonly dim: 1 | 2 | 3;
}

/**
 * Discrete Laplacian ∇²Ψ at the patch centre, conservative flux form.
 *
 * Returns the raw second-derivative estimate (units: field/length²). Throws on
 * a malformed patch (wrong neighbour count, non-positive dx) — foolproof by
 * construction (golden rule 14): the wrong shape is unrepresentable.
 */
export function discreteLaplacian(patch: FieldPatch): number {
  const { values, dx, dim } = patch;
  const neighbours = 2 * dim;
  if (values.length !== neighbours + 1) {
    throw new Error(
      `discreteLaplacian: patch needs centre + ${neighbours} neighbours ` +
        `(${neighbours + 1} values), got ${values.length}`
    );
  }
  if (!(dx > 0) || !Number.isFinite(dx)) {
    throw new Error(`discreteLaplacian: dx must be positive finite, got ${dx}`);
  }

  const centre = values[0];
  if (centre === undefined) {
    // Unreachable given the length check above, but strict indexed access
    // (noUncheckedIndexedAccess) requires the guard — foolproof by construction.
    throw new Error("discreteLaplacian: patch is empty");
  }
  // Flux form: Σ (Ψ_j − Ψ_i) over the 2·dim faces. Interior-pair symmetry makes
  // this exact on linear fields; the 1/dx² scaling makes it a 2nd-derivative.
  let fluxSum = 0;
  for (let j = 1; j <= neighbours; j++) {
    fluxSum += (values[j] ?? 0) - centre;
  }
  return fluxSum / (dx * dx);
}

/**
 * Normalised curvature λ = |∇²Ψ| / (|Ψ_centre| + Ψ_floor).
 *
 * The normalisation makes λ scale-invariant (dimensionless): a large-amplitude
 * smooth field and a small-amplitude turbulent field are compared fairly. The
 * floor prevents division by zero on a near-zero field — it is the magnitude
 * floor below which the field is treated as "no signal" (λ = 0, never refines).
 *
 * @param patch  The local field patch.
 * @param floor  Amplitude floor (default AMPLITUDE_FLOOR). Must be ≥ 0.
 * @returns λ ≥ 0, dimensionless (units: 1/length² · length² = dimensionless
 *          per unit field, normalised by the floor).
 */
export function curvatureLambda(patch: FieldPatch, floor: number = AMPLITUDE_FLOOR): number {
  if (!(floor >= 0) || !Number.isFinite(floor)) {
    throw new Error(`curvatureLambda: floor must be non-negative finite, got ${floor}`);
  }
  const lap = discreteLaplacian(patch);
  const amp = Math.abs(patch.values[0] ?? 0);
  const denom = amp + floor;
  // denom > 0 always (floor ≥ 0 and amp ≥ 0; if both are 0 the field is flat → λ 0).
  if (denom === 0) return 0;
  return Math.abs(lap) / denom;
}

/**
 * Amplitude floor for the λ normalisation — the magnitude below which a field
 * is treated as "no signal" and never triggers refinement. POSTULATE operating
 * point (ablation-ready). A tiny positive default keeps λ finite and kills
 * refinement on numerically-flat regions without biasing real structure.
 */
export const AMPLITUDE_FLOOR = 1e-12;

/**
 * Upper bound check: for any patch, |∇²Ψ| ≤ (2·dim)·max|Ψ_j − Ψ_i| / dx².
 * Used by tests to assert the estimator is bounded (robustness guarantee).
 * Exposed so the bound is a *derived relationship*, not a magic number (rule 12).
 */
export function laplacianBound(patch: FieldPatch): number {
  const { values, dx, dim } = patch;
  const centre = values[0] ?? 0;
  let maxDiff = 0;
  for (let j = 1; j < values.length; j++) {
    maxDiff = Math.max(maxDiff, Math.abs((values[j] ?? 0) - centre));
  }
  return (2 * dim * maxDiff) / (dx * dx);
}
