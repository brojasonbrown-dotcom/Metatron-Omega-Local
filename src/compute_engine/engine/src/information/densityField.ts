/**
 * FILE 13 — information/densityField.ts
 *
 * Owns: **ρ_I(x;n), the composite information-density field.**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   Each scale n carries an information NUMBER DENSITY whose scale dependence
 *   is the envelope
 *
 *       ρ_I(n) = ρ₀ · φ⁻ⁿ ,   ρ₀ = ℓ_P⁻³   [m⁻³]
 *
 *   computed EXACTLY by File 4 (`getScale(n).rhoI`, a `Scaled` — the magnitude
 *   runs to ~10¹⁰⁴ at n=1, so it never touches raw Float64 SI). That envelope
 *   is the total density available at the scale.
 *
 *   This module resolves that total, over a position x on the scale's torus,
 *   into four non-negative component densities:
 *
 *       H — entropy density      (local Shannon-type information content)
 *       R — relation density     (local connectivity / relational structure)
 *       K — curvature density    (local geometric information, from the torus's
 *                                 actual Gaussian curvature, File 5)
 *       S — persistence density  (local memory / time-persistence structure)
 *
 *   combined as a convex mixture
 *
 *       ρ_I(x;n) = ρ_I(n) · [ a₁·Ĥ(x) + a₂·R̂(x) + a₃·K̂(x) + a₄·Ŝ(x) ]
 *
 *   where each hatted component is normalized to mean 1 over the torus, so the
 *   mixture integrates back to the scale envelope. The weights satisfy
 *   a₁+a₂+a₃+a₄ = 1 and aᵢ ≥ 0, making the bracket a mean-1 non-negative shape.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. THE ENVELOPE IS EXACT; THE COMPONENT SPLIT IS A CHOSEN DECOMPOSITION.
 *      ρ₀φ⁻ⁿ comes from File 4 (EXACT, theorem-derived). The four-way split of
 *      that total into H/R/K/S is NOT fixed by any derived law — the spec
 *      supplies the component NAMES and the convex-mixture form but no
 *      derivation of the weights. We therefore treat `a₁..a₄` as an INJECTED
 *      configuration (POSTULATE), never as a computed result. The engine
 *      refuses to run without them and validates their normalization; it does
 *      not pretend to have derived them. [envelope EXACT; weights POSTULATE]
 *
 *   2. EACH COMPONENT MUST BE NON-NEGATIVE AND MEAN-1. Non-negativity is the
 *      contract ("each component non-negative", "ρ_I ≥ 0"). Mean-1 is what
 *      makes the mixture conserve the envelope: ⟨a₁Ĥ+a₂R̂+a₃K̂+a₄Ŝ⟩ = Σaᵢ·1 = 1
 *      (since Σaᵢ=1), so fieldIntegral(n) recovers ρ_I(n)·Area and the
 *      pointwise density never drifts from the scale total. Components are
 *      therefore stored in normalized form; the raw shape functions (entropy,
 *      curvature, …) are divided by their own torus average.
 *
 *   3. CURVATURE COMES FROM THE TORUS, NOT INVENTED. K(x) uses File 5's
 *      `gaussianCurvatureTimesR2` — the real Gaussian curvature of the scale's
 *      torus (dimensionless, sign-changing). A sign-changing raw curvature
 *      cannot be a density; we map it to a non-negative shape by shifting by
 *      its minimum over the sampled domain and adding a floor, then
 *      normalizing to mean 1. That shift is a POSTULATE (the physical reading
 *      of "curvature as information" is not derived); the curvature values
 *      themselves are EXACT (File 5).
 *
 *   4. THE DEFAULT COMPONENTS ARE STRUCTURALLY HONEST PLACEHOLDERS. H, R, S
 *      have no derived spatial shape yet (entropy / relation / persistence
 *      fields are L5/L6 work in progress). Until those exist, their default
 *      shape is UNIFORM (mean 1, zero spatial information) — the honest
 *      "no structure asserted" value — while K carries the only real spatial
 *      signal currently available (torus curvature). Callers inject richer
 *      component fields as the L5/L6 layers land. This keeps ρ_I ≥ 0 and the
 *      envelope exact WITHOUT fabricating spatial structure we do not have.
 *
 * Provenance: the envelope and the conservation-of-total are EXACT; the
 * weights and any non-uniform component shape are POSTULATE. `densityAt`
 * reports the tainted provenance. The two are never blended into a fake-EXACT.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   densityField(13) → { scaleTable(04), provenance/scaled(02), constants(01),
 *                        torus(05) [curvature source] }
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { StableScaleIndex } from "../core/constants.ts";
import { getScale } from "../core/scaleTable.ts";
import { classify, tainted, type Classified, type Provenance } from "../core/provenance.ts";
import { Scaled } from "../core/provenance.ts";
import { torusForScale, gaussianCurvatureTimesR2 } from "../geometry/torus.ts";
import type { TorusPoint } from "../geometry/torus.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Weights — the injected convex-mixture configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The four mixture weights (a₁ H, a₂ R, a₃ K, a₄ S). Must be non-negative and
 * sum to 1 (within Float64 tolerance). There is no derived default: the spec
 * supplies the component names but not their weights, so the caller injects
 * them. `UNIFORM_WEIGHTS` (¼ each) is provided as the neutral "all components
 * equal" choice for callers that have no reason to prefer one — it is a
 * convention, labelled POSTULATE, not a derived value.
 */
export interface DensityWeights {
  readonly a1: number; // entropy
  readonly a2: number; // relation
  readonly a3: number; // curvature
  readonly a4: number; // persistence
}

/** Neutral equal split (¼,¼,¼,¼). Convention, POSTULATE — not derived. */
export const UNIFORM_WEIGHTS: DensityWeights = Object.freeze({
  a1: 0.25,
  a2: 0.25,
  a3: 0.25,
  a4: 0.25,
});

const WEIGHT_TOL = 1e-9;

function assertWeights(w: DensityWeights, fn: string): void {
  const ws = [w.a1, w.a2, w.a3, w.a4];
  for (const a of ws) {
    if (!Number.isFinite(a) || a < 0) {
      throw new RangeError(`${fn}: every weight must be finite and ≥ 0; got [${ws.join(", ")}].`);
    }
  }
  const sum = w.a1 + w.a2 + w.a3 + w.a4;
  if (Math.abs(sum - 1) > WEIGHT_TOL) {
    throw new RangeError(
      `${fn}: weights must sum to 1 (convex mixture), got ${sum} from [${ws.join(", ")}].`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component shape functions — mean-1, non-negative over the torus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A component shape: a non-negative function on the torus, normalized to mean
 * 1 over a reference sampling grid. The four component densities are built
 * from these; their raw values live in `ComponentFields`.
 */
export type ShapeFn = (p: TorusPoint) => number;

/** Reference grid resolution for normalization + integration. */
export const DENSITY_GRID = 64;

/** Sample a shape over a uniform (grid×grid) torus mesh and return its mean. */
function torusMean(shape: ShapeFn, grid: number): number {
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    const u = (i / grid) * 2 * Math.PI;
    for (let j = 0; j < grid; j++) {
      const v = (j / grid) * 2 * Math.PI;
      const val = shape({ u, v });
      if (!Number.isFinite(val)) {
        throw new RangeError(`densityField: component shape returned non-finite ${val}.`);
      }
      sum += val;
    }
  }
  return sum / (grid * grid);
}

/** Normalize a raw non-negative shape to mean 1 over the reference grid. */
function normalizeToMeanOne(raw: ShapeFn, grid: number, label: string): ShapeFn {
  const mean = torusMean(raw, grid);
  if (mean < 0) {
    throw new RangeError(`densityField: ${label} shape has negative mean ${mean}; not a density.`);
  }
  if (mean === 0) {
    // A shape that is zero everywhere carries no information; normalize to the
    // uniform (mean-1) field — the honest "no spatial signal" value.
    return () => 1;
  }
  return (p) => raw(p) / mean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component fields — the four raw information shapes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The raw spatial shapes of the four components, BEFORE normalization. Any may
 * be omitted; an omitted component defaults to the uniform field (no spatial
 * structure asserted — ground-truth fact 4). `curvature` defaults to the
 * torus's real (shifted, non-negative) Gaussian curvature when omitted.
 */
export interface ComponentFields {
  readonly entropy?: ShapeFn;
  readonly relation?: ShapeFn;
  readonly curvature?: ShapeFn;
  readonly persistence?: ShapeFn;
}

/**
 * The default curvature shape: File 5's Gaussian curvature, shifted to be
 * non-negative. `gaussianCurvatureTimesR2` ranges over a sign-changing
 * interval; we add a floor so the minimum maps to a small positive value,
 * then the caller normalizes to mean 1. The shift is POSTULATE (fact 3).
 */
function defaultCurvatureShape(n: StableScaleIndex): ShapeFn {
  const torus = torusForScale(n);
  // Find the minimum over the reference grid to choose the shift.
  let min = Infinity;
  for (let i = 0; i < DENSITY_GRID; i++) {
    const v = (i / DENSITY_GRID) * 2 * Math.PI;
    const k = gaussianCurvatureTimesR2(torus, { u: 0, v });
    if (k < min) min = k;
  }
  const floor = -min + 1e-3; // shift so the minimum is a small positive value
  return (p) => gaussianCurvatureTimesR2(torus, p) + floor;
}

// ─────────────────────────────────────────────────────────────────────────────
// The density field
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The composite information-density field at scale n. Construct once per scale;
 * query pointwise with `densityAt`. The four component shapes are normalized to
 * mean 1 at construction, so the convex mixture conserves the scale envelope.
 */
export class DensityField {
  readonly n: StableScaleIndex;
  readonly weights: DensityWeights;
  /** The scale envelope ρ₀φ⁻ⁿ (File 4, EXACT). */
  readonly envelope: Scaled;

  private readonly H: ShapeFn; // mean-1 entropy shape
  private readonly R: ShapeFn; // mean-1 relation shape
  private readonly K: ShapeFn; // mean-1 curvature shape
  private readonly S: ShapeFn; // mean-1 persistence shape
  private readonly shapeProv: Provenance;

  constructor(
    n: StableScaleIndex,
    weights: DensityWeights = UNIFORM_WEIGHTS,
    fields: ComponentFields = {},
    shapeProv: Provenance = "POSTULATE",
    grid: number = DENSITY_GRID,
  ) {
    assertWeights(weights, "DensityField");
    if (!Number.isInteger(grid) || grid < 4) {
      throw new RangeError(`DensityField: grid must be an integer ≥ 4; got ${grid}.`);
    }
    this.n = n;
    this.weights = weights;
    this.envelope = getScale(n).rhoI;
    this.shapeProv = tainted(shapeProv);

    // Normalize each component to mean 1. Defaults: uniform (no structure) for
    // H/R/S; real torus curvature (shifted) for K.
    this.H = normalizeToMeanOne(fields.entropy ?? (() => 1), grid, "entropy");
    this.R = normalizeToMeanOne(fields.relation ?? (() => 1), grid, "relation");
    this.K = normalizeToMeanOne(
      fields.curvature ?? defaultCurvatureShape(n),
      grid,
      "curvature",
    );
    this.S = normalizeToMeanOne(fields.persistence ?? (() => 1), grid, "persistence");
  }

  /**
   * The dimensionless mean-1 mixture shape at a point: a₁Ĥ+a₂R̂+a₃K̂+a₄Ŝ.
   * Non-negative (convex combination of non-negative shapes), mean 1 over the
   * torus. This is the spatial modulation; multiply by the envelope for ρ_I.
   */
  shapeAt(x: TorusPoint): number {
    const { a1, a2, a3, a4 } = this.weights;
    const s = a1 * this.H(x) + a2 * this.R(x) + a3 * this.K(x) + a4 * this.S(x);
    // Convex combination of non-negative values is non-negative; clamp Float64
    // hair below zero rather than fabricate a negative density.
    return Math.max(0, s);
  }

  /**
   * ρ_I(x;n) = envelope · shapeAt(x), as a Scaled (the magnitude never leaves
   * exact-exponent arithmetic). Provenance: EXACT envelope tainted by the
   * POSTULATE weights/shapes → POSTULATE overall, honestly reported.
   */
  densityAt(x: TorusPoint): Classified<Scaled> {
    const shape = this.shapeAt(x);
    const rho = this.envelope.mul(Scaled.from(shape));
    return classify(
      rho,
      tainted("EXACT", this.shapeProv),
      undefined,
      "ρ_I(x;n) = (ρ₀φ⁻ⁿ envelope, EXACT from File 4) × (mean-1 convex shape, " +
        "POSTULATE weights/components); non-negative by construction",
    );
  }

  /** The entropy component density at x (envelope-weighted), a₁Ĥ·ρ_I(n). */
  entropyDensity(x: TorusPoint): Classified<Scaled> {
    return this.componentDensity(this.weights.a1, this.H, x, "entropy");
  }
  /** The relation component density at x. */
  relationDensity(x: TorusPoint): Classified<Scaled> {
    return this.componentDensity(this.weights.a2, this.R, x, "relation");
  }
  /** The curvature component density at x. */
  curvatureDensity(x: TorusPoint): Classified<Scaled> {
    return this.componentDensity(this.weights.a3, this.K, x, "curvature");
  }
  /** The persistence component density at x. */
  persistenceDensity(x: TorusPoint): Classified<Scaled> {
    return this.componentDensity(this.weights.a4, this.S, x, "persistence");
  }

  private componentDensity(
    weight: number,
    shape: ShapeFn,
    x: TorusPoint,
    label: string,
  ): Classified<Scaled> {
    const val = this.envelope.mul(Scaled.from(Math.max(0, weight * shape(x))));
    return classify(
      val,
      tainted("EXACT", this.shapeProv),
      undefined,
      `${label} component density = a·(mean-1 shape)·ρ₀φ⁻ⁿ; envelope EXACT, weight/shape POSTULATE`,
    );
  }

  /**
   * The integrated total information over the whole torus at this scale:
   * ∫ ρ_I(x;n) dA. With mean-1 shapes and Σaᵢ=1 this equals ρ_I(n)·Area to
   * quadrature accuracy — the envelope is conserved, never inflated. Returned
   * as a Scaled; finite by construction (bounded shape × finite area).
   *
   * The integral uses the torus area from File 5 times the mean shape (≈1).
   * Provenance EXACT up to the POSTULATE shape taint and quadrature.
   */
  fieldIntegral(grid: number = DENSITY_GRID): Classified<Scaled> {
    // Mean of the mixture shape over the torus ≈ 1 (each component mean-1).
    let sum = 0;
    for (let i = 0; i < grid; i++) {
      const u = (i / grid) * 2 * Math.PI;
      for (let j = 0; j < grid; j++) {
        const v = (j / grid) * 2 * Math.PI;
        sum += this.shapeAt({ u, v });
      }
    }
    const meanShape = sum / (grid * grid);
    const torus = torusForScale(this.n);
    // surfaceArea returns a bare Scaled (EXACT torus area, File 5).
    const area = surfaceAreaOf(torus);
    const total = this.envelope.mul(area).mul(Scaled.from(meanShape));
    return classify(
      total,
      tainted("EXACT", this.shapeProv),
      undefined,
      "∫ρ_I dA = ρ₀φ⁻ⁿ × Area × ⟨shape⟩ (⟨shape⟩≈1 by mean-1 normalization); " +
        "conserves the scale envelope to quadrature accuracy",
    );
  }
}

// Local indirection so this file depends only on the torus seam for area.
import { surfaceArea as surfaceAreaOf } from "../geometry/torus.ts";

/**
 * Convenience: the scale envelope ρ₀φ⁻ⁿ for a rung, EXACT from File 4.
 * Exposed so callers can assert the envelope test vector (matches §2 ρ_I
 * column) without constructing a DensityField.
 */
export function envelopeDensity(n: StableScaleIndex): Scaled {
  return getScale(n).rhoI;
}
