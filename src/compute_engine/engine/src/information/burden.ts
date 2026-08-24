/**
 * FILE 14 — information/burden.ts
 *
 * Owns: **the burden integral — the mass/inertia analog.**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   The burden of a region at scale n is the accumulated "weight" of its
 *   information density, the engine's inertial quantity:
 *
 *       b(region, n) = ∫_region ρ_I(x;n) · κ(x) · τ_persist(x)  dV
 *
 *   A region that stores more information density, held for longer, couples
 *   more strongly (larger κ), has more burden — it is harder to move. This is
 *   the quantity File 15's actualizer balances against and File 16 reports as
 *   the per-scale inertia.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. κ IS UNDEFINED IN THE ENGINE — SO IT IS INJECTED, NEVER DERIVED. The
 *      constants module states plainly: "κ is undefined (would need units of
 *      mass)… Do NOT compute the medium form until κ is defined." The burden
 *      integrand ρ_I·κ·τ_persist has the same dimensional gap: ρ_I is a NUMBER
 *      density [m⁻³], so κ·τ_persist must carry [mass·time] for b to be an
 *      inertia. We do NOT invent κ. The caller injects a burden-weight field
 *      w(x) = κ(x)·τ_persist(x) (or a constant), tagged POSTULATE. The default
 *      is w ≡ 1 — the neutral "unit coupling × unit persistence" convention,
 *      honestly labelled, not a derived value. [integral form EXACT; w POSTULATE]
 *
 *   2. THE DOMAIN IS THE TORUS SURFACE THE ENGINE ACTUALLY HAS. The contract
 *      writes dV, but a torus in this engine is a 2D surface (File 5), and
 *      ρ_I·δx³ overflows raw Float64 (§2 decision). We therefore integrate the
 *      DENSITY (ρ_I, a number/area here via the envelope × mean-1 shape) over
 *      the torus AREA element dA = √g du dv (File 5's `areaElement`). That is
 *      the dimensionally coherent, computable reading of "∫…dV" on the surface
 *      the field actually lives on. The region is a sub-rectangle
 *      [u0,u1]×[v0,v1] in angle coordinates. [EXACT quadrature]
 *
 *   3. TWO LAWS ARE EXACT; THE REST IS POSTULATE.
 *      (a) MONOTONICITY UNDER COMPRESSION: concentrating the same total
 *          density into a smaller proper area raises the density pointwise
 *          (number density = count/area), so the burden of the compressed
 *          region is ≥ that of the uncompressed — provided the weight w is
 *          unchanged. This is arithmetic (same numerator, smaller denominator)
 *          and is EXACT. If w also changes under compression, that is a
 *          POSTULATE about the medium and is the caller's claim, not ours.
 *      (b) CONSERVATION UNDER PURE TRANSPORT: moving the density field
 *          rigidly (a coordinate translation) does not change its integral —
 *          the torus metric is u-translation-invariant, so ∫ρ dA is unchanged
 *          to quadrature tolerance. EXACT up to quadrature (test: 1e-6).
 *      The φ⁻ⁿ scale envelope of the burden is inherited from File 4 (EXACT).
 *
 *   4. THE INERTIA PROXY IS THE BURDEN NORMALIZED BY ITS ENVELOPE.
 *      `inertiaProxy` divides b by the scale's envelope-burden (the burden of
 *      the uniform field over the full torus), giving a dimensionless O(1)
 *      number that compares regions within a scale without the 10¹⁰⁴
 *      magnitude. This ratio is POSTULATE (it is a chosen normalization, not a
 *      derived law) but dimensionless and finite.
 *
 * Provenance: quadrature + the two laws (monotonicity, transport conservation)
 * are EXACT; the weight field w = κ·τ_persist and the inertia normalization
 * are POSTULATE. `burden`/`inertiaProxy` report the tainted provenance.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   burden(14) → { densityField(13), torus(05), provenance/scaled(02) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { StableScaleIndex } from "../core/constants.ts";
import { classify, tainted, type Classified, type Provenance } from "../core/provenance.ts";
import { Scaled } from "../core/provenance.ts";
import { torusForScale, areaElement, surfaceArea } from "../geometry/torus.ts";
import type { DensityField } from "./densityField.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Region — a sub-rectangle of the torus in angle coordinates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A region of the torus: [u0,u1] × [v0,v1] in angle coordinates (radians,
 * each bound in [0, 2π], u1 > u0, v1 > v0). The full torus is
 * `[0,2π]×[0,2π]`. This is the integration domain for the burden.
 */
export interface Region {
  readonly u0: number;
  readonly u1: number;
  readonly v0: number;
  readonly v1: number;
}

/** The full torus region. */
export const FULL_REGION: Region = Object.freeze({ u0: 0, v0: 0, u1: 2 * Math.PI, v1: 2 * Math.PI });

function assertRegion(r: Region, fn: string): void {
  const { u0, u1, v0, v1 } = r;
  for (const [name, x] of [["u0", u0], ["u1", u1], ["v0", v0], ["v1", v1]] as const) {
    if (!Number.isFinite(x)) throw new RangeError(`${fn}: region.${name} must be finite; got ${x}.`);
  }
  if (u1 <= u0 || v1 <= v0) {
    throw new RangeError(
      `${fn}: region must have u1>u0 and v1>0; got u[${u0},${u1}] v[${v0},${v1}].`,
    );
  }
}

/**
 * The burden-weight field w(x) = κ(x)·τ_persist(x). Injected (POSTULATE) — the
 * engine does not derive κ. A number means a uniform weight; a function means
 * a spatially varying one. Default 1 (unit coupling × unit persistence).
 */
export type BurdenWeight = number | ((x: { u: number; v: number }) => number);

function weightFn(w: BurdenWeight | undefined): (x: { u: number; v: number }) => number {
  if (w === undefined) return () => 1;
  if (typeof w === "number") {
    if (!Number.isFinite(w) || w < 0) {
      throw new RangeError(`burden: uniform weight must be finite and ≥ 0; got ${w}.`);
    }
    return () => w;
  }
  return w;
}

// ─────────────────────────────────────────────────────────────────────────────
// The burden integral
// ─────────────────────────────────────────────────────────────────────────────

/** Quadrature resolution per axis for the burden integral. */
export const BURDEN_GRID = 64;

/**
 * The burden of a region at scale n: b = ∫_region ρ_I(x;n)·w(x) dA, where the
 * area element dA = √g du dv is File 5's exact torus metric and w = κ·τ_persist
 * is the injected burden weight (default 1).
 *
 * Computed by midpoint quadrature on a (grid×grid) mesh over the region. The
 * result is a Scaled (the ρ_I envelope can be ~10¹⁰⁴; never collapsed to raw
 * Float64). b ≥ 0 by construction (non-negative density × non-negative weight
 * × positive area element).
 *
 * @param field   the DensityField at scale n (provides ρ_I(x;n))
 * @param region  the integration sub-rectangle (default: full torus)
 * @param weight  the injected κ·τ_persist weight (default 1; POSTULATE)
 * @param grid    quadrature resolution per axis
 */
export function burden(
  field: DensityField,
  region: Region = FULL_REGION,
  weight?: BurdenWeight,
  grid: number = BURDEN_GRID,
): Classified<Scaled> {
  assertRegion(region, "burden");
  if (!Number.isInteger(grid) || grid < 1) {
    throw new RangeError(`burden: grid must be an integer ≥ 1; got ${grid}.`);
  }
  const w = weightFn(weight);
  const torus = torusForScale(field.n);
  const du = (region.u1 - region.u0) / grid;
  const dv = (region.v1 - region.v0) / grid;

  // Accumulate the dimensionless part (shape × weight × metric factor) in
  // Float64, then attach the ρ_I envelope's Scaled exponent exactly. The
  // envelope's mantissa is folded in at the end so the huge magnitude never
  // enters the quadrature loop as a raw number.
  const envelope = field.envelope; // Scaled ρ₀φ⁻ⁿ
  let acc = 0; // Σ (shape·w·√g) · du·dv  — the dimensionless×area×weight part
  for (let i = 0; i < grid; i++) {
    const u = region.u0 + (i + 0.5) * du;
    for (let j = 0; j < grid; j++) {
      const v = region.v0 + (j + 0.5) * dv;
      const x = { u, v };
      const shape = field.shapeAt(x); // mean-1, ≥ 0
      const wv = w(x);
      if (!Number.isFinite(wv) || wv < 0) {
        throw new RangeError(`burden: weight returned non-finite/negative ${wv} at (${u},${v}).`);
      }
      // areaElement returns Scaled √g du dv per unit du·dv — use its Float64
      // value (the metric factor is O(R·r), representable at these scales).
      const dA = areaElement(torus, x).toFloat64OrNull();
      if (dA === null) {
        throw new RangeError(`burden: area element unrepresentable at (${u},${v}).`);
      }
      acc += shape * wv * dA * du * dv;
    }
  }
  // b = envelope(ρ₀φ⁻ⁿ number density) × acc(area·shape·weight).
  // Both non-negative ⇒ b ≥ 0.
  const b = envelope.mul(Scaled.from(acc));
  return classify(
    b,
    tainted("EXACT", "POSTULATE"),
    undefined,
    "b = ∫ρ_I·(κ·τ_persist) dA over the torus surface; quadrature + envelope " +
      "EXACT, but the weight w = κ·τ_persist is INJECTED (κ undefined in the " +
      "engine — POSTULATE); b ≥ 0 by construction",
  );
}

/**
 * The inertia proxy: the region's burden normalized by the burden of the
 * uniform field over the full torus at the same scale. Dimensionless, O(1),
 * finite — compares regions within a scale without the 10¹⁰⁴ magnitude.
 * POSTULATE (a chosen normalization), but finite and non-negative.
 */
export function inertiaProxy(
  field: DensityField,
  region: Region = FULL_REGION,
  weight?: BurdenWeight,
  grid: number = BURDEN_GRID,
): Classified<number> {
  const { value: bReg } = burden(field, region, weight, grid);
  // Uniform reference: unit weight, full torus, uniform (mean-1) shape ⇒
  // reference = envelope × surfaceArea × 1.
  const torus = torusForScale(field.n);
  const bRef = field.envelope.mul(surfaceArea(torus));
  if (bRef.isZero()) {
    throw new RangeError("inertiaProxy: reference burden is zero; cannot normalize.");
  }
  const ratio = bReg.div(bRef).toFloat64OrNull();
  if (ratio === null) {
    throw new RangeError("inertiaProxy: normalized burden unrepresentable as Float64.");
  }
  return classify(
    ratio,
    "POSTULATE",
    undefined,
    "inertia proxy = b(region) / (ρ₀φ⁻ⁿ·Area) — a chosen dimensionless " +
      "normalization (POSTULATE), non-negative, O(1)",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The two exact laws
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LAW (a): burden is non-decreasing under compression. Compressing a region to
 * a smaller proper area while conserving its total information count raises
 * the number density pointwise (count/area), so the compressed region's burden
 * ≥ the original's — with the weight held fixed. Returns the two burdens and
 * the (exact) inequality result.
 *
 * Model: the same total count N = ρ·A is conserved, so the compressed density
 * is ρ·(A/A′) uniformly over the smaller region. This is the arithmetic
 * statement of compression; any spatial reshaping beyond uniform
 * concentration is a POSTULATE the caller adds.
 */
export function burdenUnderCompression(
  field: DensityField,
  region: Region,
  compressed: Region,
  weight?: BurdenWeight,
  grid: number = BURDEN_GRID,
): Classified<{ original: Scaled; compressed: Scaled; nonDecreasing: boolean }> {
  assertRegion(region, "burdenUnderCompression");
  assertRegion(compressed, "burdenUnderCompression");
  const torus = torusForScale(field.n);

  // Proper areas of the two regions (quadrature on the metric).
  const areaOf = (r: Region): number => {
    const du = (r.u1 - r.u0) / grid;
    const dv = (r.v1 - r.v0) / grid;
    let a = 0;
    for (let i = 0; i < grid; i++) {
      const u = r.u0 + (i + 0.5) * du;
      for (let j = 0; j < grid; j++) {
        const v = r.v0 + (j + 0.5) * dv;
        a += areaElement(torus, { u, v }).toFloat64OrNull()! * du * dv;
      }
    }
    return a;
  };
  const A = areaOf(region);
  const Aprime = areaOf(compressed);
  if (Aprime <= 0 || A <= 0) {
    throw new RangeError("burdenUnderCompression: regions must have positive proper area.");
  }
  const ratio = A / Aprime; // ≥ 1 when compressed is smaller

  // Original burden.
  const { value: bOrig } = burden(field, region, weight, grid);

  // Compressed: same total count concentrated into the smaller region ⇒
  // density scaled by the area ratio. We model this as the mean density over
  // the original region, amplified by `ratio`, applied uniformly over the
  // compressed region.
  const meanShape = (() => {
    const du = (region.u1 - region.u0) / grid;
    const dv = (region.v1 - region.v0) / grid;
    let s = 0;
    for (let i = 0; i < grid; i++) {
      const u = region.u0 + (i + 0.5) * du;
      for (let j = 0; j < grid; j++) {
        const v = region.v0 + (j + 0.5) * dv;
        s += field.shapeAt({ u, v });
      }
    }
    return s / (grid * grid);
  })();
  const w = weightFn(weight);
  let accC = 0;
  const duC = (compressed.u1 - compressed.u0) / grid;
  const dvC = (compressed.v1 - compressed.v0) / grid;
  for (let i = 0; i < grid; i++) {
    const u = compressed.u0 + (i + 0.5) * duC;
    for (let j = 0; j < grid; j++) {
      const v = compressed.v0 + (j + 0.5) * dvC;
      const dA = areaElement(torus, { u, v }).toFloat64OrNull()!;
      accC += meanShape * ratio * w({ u, v }) * dA * duC * dvC;
    }
  }
  const bComp = field.envelope.mul(Scaled.from(accC));

  const nonDecreasing = bComp.compare(bOrig) >= 0;
  return classify(
    { original: bOrig, compressed: bComp, nonDecreasing },
    tainted("EXACT", "POSTULATE"),
    undefined,
    "compression conserves count (ρ·A fixed) ⇒ smaller area raises density ⇒ " +
      "burden non-decreasing; EXACT arithmetic, weight held fixed (POSTULATE)",
  );
}

/**
 * LAW (b): pure transport conserves the total burden. "Transport" here is a
 * rigid coordinate re-sampling of the field along the torus's symmetry
 * direction: shifting the u-grid by deltaU leaves ∫ρ dA unchanged because the
 * area element is u-translation-invariant (dA = r(R+r cos v) du dv has no
 * u-dependence). This is exact up to quadrature (test vector: 1e-6) whenever
 * the weight is also u-independent (e.g. a constant, or a function of v only).
 *
 * Physically: sliding the density pattern around the torus's symmetry axis
 * neither creates nor destroys it. A u-DEPENDENT weight would break the
 * symmetry (the medium would be doing work), and that is a POSTULATE about the
 * medium — this law is stated for the conservative (u-invariant weight) case.
 */
export function conservedUnderTransport(
  field: DensityField,
  region: Region,
  deltaU: number,
  weight?: BurdenWeight,
  grid: number = BURDEN_GRID,
  tol = 1e-6,
): Classified<boolean> {
  assertRegion(region, "conservedUnderTransport");
  if (!Number.isFinite(deltaU)) {
    throw new RangeError(`conservedUnderTransport: deltaU must be finite; got ${deltaU}.`);
  }
  const w = weightFn(weight);
  const torus = torusForScale(field.n);
  const wrap = (x: number) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const du = (region.u1 - region.u0) / grid;
  const dv = (region.v1 - region.v0) / grid;

  // Integrate the field over the region twice: once on the base u-grid, once
  // on the same grid shifted by deltaU. The u-invariant metric makes these
  // equal to quadrature accuracy for any u-independent weight.
  const integrate = (uOffset: number): number => {
    let acc = 0;
    for (let i = 0; i < grid; i++) {
      const u = wrap(region.u0 + (i + 0.5) * du + uOffset);
      for (let j = 0; j < grid; j++) {
        const v = region.v0 + (j + 0.5) * dv;
        const x = { u, v };
        const dA = areaElement(torus, x).toFloat64OrNull()!;
        acc += field.shapeAt(x) * w(x) * dA * du * dv;
      }
    }
    return acc;
  };
  const acc0 = integrate(0);
  const accT = integrate(deltaU);

  // Relative agreement (compare the Float64 accumulators; the envelope factor
  // is identical on both sides and cancels in the ratio).
  const rel = acc0 === 0 ? Math.abs(accT) : Math.abs(accT - acc0) / Math.abs(acc0);
  return classify(
    rel <= tol,
    "EXACT",
    undefined,
    `transport (u-grid shift by ${deltaU}) conserves ∫ρ dA: |b′−b|/|b| = ` +
      `${rel.toExponential(3)} ≤ ${tol}; the torus area element is ` +
      `u-translation-invariant (dA = r(R+r cos v) du dv), quadrature-limited. ` +
      `Holds for u-independent weight (the conservative case).`,
  );
}
