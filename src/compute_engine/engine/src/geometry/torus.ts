/**
 * FILE 5 — geometry/torus.ts
 *
 * Toroidal geometry for each Lucas-stable scale. Every stable rung n hosts a
 * torus whose major radius is the scale length L(n) and whose aspect ratio is
 * exactly φ — the golden mean. The aspect is the one and only geometric
 * postulate; everything else is classical differential geometry (EXACT).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RESEARCH GROUNDING (provenance per claim, per the no-mistakes firewall):
 *
 *   Metric + area            ds² = r²du² + (R + r·cos v)²dv²,  A = 4π²Rr.
 *                            First fundamental form of a ring torus.
 *                            [EXACT] — Wolfram MathWorld "Torus"; MIT
 *                            Patrikalakis–Maekawa–Cho, §3.2 first fundamental
 *                            form. Classical, settled.
 *
 *   φ = [1;1,1,1,…]          The golden mean's continued fraction is all 1s —
 *                            the slowest-converging, "most irrational" number.
 *                            φ⁻¹ + φ⁻² = 1 telescopes exactly.
 *                            [EXACT] — verified to 30 digits (mpmath dps=50).
 *
 *   aspect = R/r = φ         WHY φ? KAM theory (Kolmogorov–Arnold–Moser):
 *                            invariant tori whose winding number is "sufficiently
 *                            irrational" survive perturbation longest; the golden
 *                            mean is the most robust winding of all (its tori are
 *                            the last to break up — see standard-map critical
 *                            function, Scholarpedia "Kolmogorov–Arnold–Moser
 *                            theory"). A torus with golden aspect is therefore
 *                            maximally resistant to resonant destruction.
 *                            [POSTULATE] — the KAM mathematics is real and
 *                            rigorous; reading it as a *physical* stability law
 *                            for RHUFT scale-tori is the framework's conjecture.
 *                            Ablation-ready: swap aspect and the engine still runs.
 *
 *   13-circle shell (n=13)   Metatron's-cube motif; flux(13) = φ⁻²⁶.
 *                            [POSTULATE] — sacred-geometry literature, NOT
 *                            peer-reviewed. Flagged, never asserted as physics.
 *
 * Dependency direction (strictly downward, spec §264):
 *   torus(05) → scaleTable(04) → { constants(01), lucas(03), provenance(02) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI, PHI_INV, PI, TWO_PI, type StableScaleIndex } from "../core/constants.js";
import { getScale } from "../core/scaleTable.js";
import { Scaled, classify, type Classified } from "../core/provenance.js";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

/** A 2D point on the torus surface, in radians: u = toroidal, v = poloidal. */
export interface TorusPoint {
  readonly u: number; // ∈ [0, 2π)
  readonly v: number; // ∈ [0, 2π)
}

/**
 * Torus parameters for one scale. aspect is POSTULATE-tagged (golden ratio as a
 * physical stability assumption); R and r derive from the CODATA scale length.
 */
export interface TorusParams {
  readonly n: StableScaleIndex;
  /** Major radius R = L(n) — the distance from tube-centre to torus-centre. */
  readonly R: Scaled;
  /** Minor radius r = L(n)/φ — the tube radius. */
  readonly r: Scaled;
  /** Aspect R/r — exactly φ (POSTULATE). */
  readonly aspect: number;
  /** Provenance of the aspect assumption — carried so the taint propagates. */
  readonly aspectProvenance: "POSTULATE";
  readonly isMetatronShell: boolean;
}

/** First-fundamental-form coefficients at a point (diagonal metric). */
export interface TorusMetric {
  /** g_uu = r² */
  readonly guu: number;
  /** g_vv = (R + r·cos v)² */
  readonly gvv: number;
  /** √det g = r·(R + r·cos v) — the area-element Jacobian. */
  readonly sqrtDet: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Construction
// ─────────────────────────────────────────────────────────────────────────────

/** Wrap an angle into [0, 2π). */
export const wrapAngle = (theta: number): number => {
  if (!Number.isFinite(theta)) throw new RangeError(`wrapAngle: non-finite ${theta}`);
  const t = theta % (2 * PI);
  return t < 0 ? t + 2 * PI : t;
};

/**
 * Build the torus for a Lucas-stable scale n.
 *   R = L(n)            (CODATA scale length, exact in φⁿ)
 *   r = L(n)/φ = R·φ⁻¹  (so aspect = R/r = φ exactly, by construction)
 *
 * aspect = φ is the engine's single geometric POSTULATE (KAM-motivated, see
 * header). It is POSTULATE-tagged so the taint propagates to every derived
 * closure/flux quantity and can never be silently read as established physics.
 */
export function torusForScale(n: StableScaleIndex): TorusParams {
  const rec = getScale(n);
  const R = rec.L;
  const r = R.mul(Scaled.from(PHI_INV)); // r = R·φ⁻¹  ⇒  R/r = φ
  return Object.freeze({
    n,
    R,
    r,
    aspect: PHI,
    aspectProvenance: "POSTULATE" as const,
    isMetatronShell: rec.isMetatronShell,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric + area element (pure dimensionless shape — EXACT geometry)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * First fundamental form at (u,v), evaluated in units of the minor radius so
 * the numbers stay Float64-safe across all 18 scales (the absolute metric is
 * recovered by multiplying by r² — see areaElement). Because aspect = R/r is a
 * pure number, the shape of the torus is scale-invariant; only its size changes.
 *
 *   ds² = r² [ du² + (aspect + cos v)² dv² ]
 *        └── r² · guu ──┘   └── r² · gvv ──┘
 *
 * Invariants: guu = 1 (constant), gvv = (aspect + cos v)² > 0 because
 * aspect = φ > 1 ≥ −cos v, so R + r·cos v ≥ r(φ − 1) = r·φ⁻¹ > 0. The ring
 * torus never self-intersects precisely because aspect > 1.
 */
export function metric(torus: TorusParams, p: TorusPoint): TorusMetric {
  const v = wrapAngle(p.v);
  const gvvFactor = torus.aspect + Math.cos(v); // = (R + r cos v)/r, dimensionless
  // guu (dimensionless) = 1 by construction; gvv (dimensionless) = (aspect+cos v)².
  const guu = 1;
  const gvv = gvvFactor * gvvFactor;
  return Object.freeze({ guu, gvv, sqrtDet: Math.sqrt(guu * gvv) });
}

/**
 * Surface area element dA = r·(R + r·cos v) du dv  →  a Scaled physical area
 * per unit (du·dv). = r²·√det g in SI units, so it is large for Planck tori
 * and enormous for cosmological tori — exactly why it is a Scaled.
 */
export function areaElement(torus: TorusParams, p: TorusPoint): Scaled {
  const m = metric(torus, p);
  return torus.r.pow(2).mul(Scaled.from(m.sqrtDet));
}

/**
 * Total surface area A = 4π²Rr. Classical identity [EXACT]. Computed as a
 * Scaled so it is representable at every rung without overflow.
 */
export function surfaceArea(torus: TorusParams): Scaled {
  const fourPi2 = Scaled.from(4 * PI * PI);
  return fourPi2.mul(torus.R).mul(torus.r);
}

/**
 * Gaussian curvature K(v) = cos v / [ r·(R + r·cos v) ]. Positive on the outer
 * equator (v=0), negative on the inner (v=π), zero on the top/bottom circles.
 * Its integral over the surface vanishes (∮K dA = 0), the Gauss–Bonnet theorem
 * for genus 1 — χ(torus) = 0. Returned dimensionless-in-r: K·r².
 */
export function gaussianCurvatureTimesR2(torus: TorusParams, p: TorusPoint): number {
  const v = wrapAngle(p.v);
  return Math.cos(v) / (torus.aspect + Math.cos(v));
}

// ─────────────────────────────────────────────────────────────────────────────
// Closure / periodicity — the geometric half of frictionlessness
// ─────────────────────────────────────────────────────────────────────────────

/** A sampled scalar/complex field on the torus: value at (u,v) in radians. */
export type TorusField = (p: TorusPoint) => number;

/**
 * Is the field periodic (closed) on the torus, to tolerance tol? A field is
 * closed iff f(u,v) = f(u+2π, v) = f(u, v+2π) everywhere — i.e. it respects the
 * torus's two fundamental cycles. This is the geometric precondition for the
 * closure residual (File 6) to be machine-eps small.
 *
 * We probe the SEAM: continuity across the u=0/2π and v=0/2π identification.
 * A genuinely periodic field has f(ε, v) = f(2π−ε, v); a non-periodic field
 * (e.g. sin(u/2)) jumps across the seam and is caught. Points are sampled on a
 * golden-ratio low-discrepancy orbit (KAM-optimal equidistribution) so no
 * single harmonic is aliased.
 */
export function isClosed(
  field: TorusField,
  torus: TorusParams,
  tol = 1e-4,
  samples = 64,
): boolean {
  if (tol <= 0) throw new RangeError(`isClosed: tol must be > 0, got ${tol}`);
  void torus;
  // Measure the seam JUMP, not field smoothness. A genuinely periodic field's
  // cross-seam defect is O(L·eps) — it shrinks to zero as eps→0 no matter how
  // large its Lipschitz constant L. A non-periodic field's defect is O(jump),
  // eps-independent. A single fixed-eps probe conflates the two (it reads
  // O(L·eps), so high-Lipschitz periodic fields false-negative once L·eps > tol —
  // the audit found this cutoff at m≈50–60 for cos(m·u+v) [F6]). We probe at two
  // widths a decade apart and linearly extrapolate the defect to eps→0: smooth
  // periodic fields extrapolate to ~0; jumped fields keep their finite jump.
  const measure = (eps: number): number => {
    let m = 0;
    for (let i = 0; i < samples; i++) {
      // Golden-ratio low-discrepancy orbit for the cross-seam coordinate.
      const u = wrapAngle(eps + i * 2 * PI * PHI_INV);
      const v = wrapAngle(eps + i * 2 * PI * PHI_INV * PHI_INV);
      m = Math.max(
        m,
        // Continuity across the u-seam: f(eps, v) ≈ f(2π−eps, v).
        Math.abs(field({ u: eps, v }) - field({ u: TWO_PI - eps, v })),
        // Continuity across the v-seam: f(u, eps) ≈ f(u, 2π−eps).
        Math.abs(field({ u, v: eps }) - field({ u, v: TWO_PI - eps })),
      );
    }
    return m;
  };
  const e1 = 1e-5, e2 = 1e-6;
  const d1 = measure(e1), d2 = measure(e2);
  // Linear extrapolation to eps=0 (defect d ≈ jump + L·eps ⇒ intercept = jump).
  const jump = Math.max(0, d2 - ((d1 - d2) * e2) / (e1 - e2));
  return jump <= tol;
}

/**
 * Flux through the Metatron shell (n=13): flux(13) = φ⁻²⁶ = 3.684×10⁻⁶.
 * EXACT as a number. Its interpretation as a physical flux is POSTULATE.
 */
export function metatronShellFlux(): Classified<Scaled> {
  return classify(
    Scaled.from(Math.pow(PHI, -26)),
    "POSTULATE",
    undefined,
    "flux(13) = φ⁻²⁶; numerically EXACT, physically a RHUFT conjecture",
  );
}
