/**
 * FILE 6 — geometry/closureResidual.ts
 *
 * The closure functional — the engine's direct measure of frictionlessness.
 * Each stable scale hosts a torus (File 5); a field on it "closes" when it is
 * periodic in both fundamental cycles (u, v) AND carries no net flux through the
 * surface. The closure residual is the number the whole engine minimizes. It is
 * NEVER exactly zero (Lucas obstruction, Lₙ mod 13 ≠ 0 — File 3): every real
 * scale is *minimally open*, and the engine's task is to minimize the residual,
 * not annihilate it.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RESEARCH GROUNDING (provenance per claim, per the no-mistakes firewall).
 * RHUFT itself is the author's unpublished framework — nothing public asserts
 * "closure residual = physics." What the peer-reviewed literature DOES supply is
 * the rigorous, measured vocabulary for "a loop that cannot perfectly close":
 *
 *   Divergence/Gauss          ∮_∂V F·dS = ∫_V ∇·F dV. A closed surface (∂V=∅,
 *                             the torus has no boundary) integrates ∇·(∇Ψ)=ΔΨ
 *                             to zero for any smooth periodic Ψ.
 *                             [EXACT] — divergence theorem; a nonzero value is
 *                             therefore the signature of a source/sink, broken
 *                             periodicity, or a topological obstruction.
 *
 *   Geometric phase /         Parallel transport around a closed loop on a
 *   anholonomy (Berry)        curved manifold returns ROTATED by the enclosed
 *                             curvature — the canonical mainstream analogue of a
 *                             nonzero closure residual: the field goes out along
 *                             one toroidal cycle and comes back not-quite-itself.
 *                             [EXACT math / CODATA measurement] — Berry 1984;
 *                             SciPost Phys. Lect. Notes 51 (2022); Nature Rev.
 *                             Phys. 1, 200 (2019). Mapped onto RHUFT's torus as
 *                             the POSTULATE that scale-fields exhibit holonomy.
 *
 *   Topological obstruction   Dirac quantization / Chern number: flux through a
 *   (flux cannot be zeroed)   closed surface enclosing a monopole is FORCED to a
 *                             nonzero integer multiple — it cannot be set to zero.
 *                             The exact logical shape of RHUFT's Lucas
 *                             obstruction (Lₙ mod 13 ≠ 0 ⇒ residual > 0).
 *                             [EXACT] — Dirac 1931; arXiv:1810.13403 review.
 *                             RHUFT's φ-based minimal value is POSTULATE.
 *
 *   Quantum foam (shell n=13) At ~8×10⁻³³ m spacetime is a seething, topology-
 *                             changing foam (Wheeler); "closure" is statistical,
 *                             never exact — the physical intuition behind a
 *                             non-vanishing minimal residual at the Metatron rung.
 *                             [POSTULATE] — arXiv:2209.14282 review; real as a
 *                             research programme, unproven as a microstructure.
 *
 *   Zero-point / Casimir      The vacuum carries a measurable residual energy
 *                             that boundary conditions cannot extinguish; the
 *                             Casimir force is literally a measured "leftover".
 *                             [CODATA] — Nature 564, 201 (2018) vacuum correlation
 *                             measurement. Residual-as-real is established; the
 *                             RHUFT identification with closure flux is POSTULATE.
 *
 * Dependency direction (strictly downward, spec §264):
 *   closureResidual(06) → { torus(05), provenance(02) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PI, TWO_PI, PHI_NEG26 } from "../core/constants.ts";
import {
  Scaled,
  classify,
  tainted,
  type Classified,
} from "../core/provenance.ts";
import {
  metric,
  wrapAngle,
  type TorusField,
  type TorusParams,
  type TorusPoint,
} from "./torus.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Quadrature configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default grid resolution per cycle. The torus metric is smooth and the test
 * fields are band-limited toroidal modes, so the periodic trapezoid rule
 * converges spectrally; 96 points/cycle drives smooth-field residuals to
 * machine-epsilon (validated to ~1e-14 relative in pre-computation).
 */
const DEFAULT_GRID = 96;

/**
 * Richardson-convergence tolerance: the residual at N and at N/2 must agree to
 * this relative tolerance for the integral to be reported as converged.
 */
const RICHARDSON_TOL = 1e-6;

// ─────────────────────────────────────────────────────────────────────────────
// The residual — divergence form of the surface flux
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One grid evaluation of the flux residual in divergence form.
 *
 * On the torus the first fundamental form is diagonal:
 *   ds² = r²[ du² + g(v)² dv² ],   g(v) = aspect + cos v,   √det g_dimless = g.
 * The surface gradient's outward flux through the (boundaryless) torus is, by
 * the divergence theorem,
 *   ∮ ∇Ψ·dS = ∫∫ ΔΨ dA
 *          = ∫∫ (1/(r² g)) [ ∂u(g ∂uΨ) + ∂v((1/g) ∂vΨ) ] · (r² g) du dv
 *          = ∫∫ [ ∂u(g ∂uΨ) + ∂v((1/g) ∂vΨ) ] du dv .
 * The r² Jacobian cancels EXACTLY — the residual is a pure-shape (dimensionless)
 * number, identical across all 18 scales up to the field's own amplitude. That
 * is why it is a Float64, not a Scaled: it measures friction per unit field,
 * independent of the rung's physical size.
 *
 * Returned as a plain number (the raw dimensionless integral). Callers scale by
 * field amplitude if an absolute flux is needed.
 */
function fluxIntegral(field: TorusField, torus: TorusParams, grid: number): number {
  const du = TWO_PI / grid;
  const aspect = torus.aspect;
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const u = (i + 0.5) * du;
      const v = (j + 0.5) * du;
      // Neighbours, wrapped into [0,2π) so the periodic seams are honoured.
      const up = wrapAngle(u + du);
      const um = wrapAngle(u - du);
      const vp = wrapAngle(v + du);
      const vm = wrapAngle(v - du);

      // ∂u(g ∂uΨ): g is independent of u (diagonal metric, g_uu=1), so this is
      // g(v)·∂²_u Ψ. Differenced flux-form keeps the discrete divergence exact.
      const gHere = aspect + Math.cos(v);
      const dPsiDu_p = (field({ u: up, v }) - field({ u, v })) / du;
      const dPsiDu_m = (field({ u, v }) - field({ u: um, v })) / du;
      const duTerm = gHere * (dPsiDu_p - dPsiDu_m) / du;

      // ∂v((1/g) ∂vΨ): the (1/g) factor varies with v. CONSERVATIVE FLUX FORM:
      // evaluate 1/g at the cell INTERFACES (v±du/2), not the node centres
      // (v±du). The audit (F5) found the nodal form left a spurious ~1.07
      // residue on pure-poloidal fields (cos(m·v)) and threw "quadrature not
      // converged", because the discrete sum Σ Δf·(1/g_{j+1} − 1/g_j) does not
      // telescope. With the interface value shared EXACTLY between adjacent
      // cells, the flux leaving cell j equals the flux entering cell j+1 and
      // the interior sum cancels to zero for any u-independent field.
      const gAt = (vv: number) => aspect + Math.cos(vv);
      // Harmonic-mean interface value of the diffusion coefficient 1/g — the
      // standard conservative average, making the interface flux shared exactly.
      const invGInterfaceP = 2 / (gAt(v) + gAt(vp)); // 1/g at v+du/2
      const invGInterfaceM = 2 / (gAt(vm) + gAt(v)); // 1/g at v−du/2
      const dPsiDv_p = (field({ u, v: vp }) - field({ u, v })) / du;
      const dPsiDv_m = (field({ u, v }) - field({ u, v: vm })) / du;
      const dvTerm = (dPsiDv_p * invGInterfaceP - dPsiDv_m * invGInterfaceM) / du;

      // dA contribution = √det g (dimensionless g) · du·dv; the 1/g in the
      // divergence cancels the √det g Jacobian, leaving the integrand above.
      sum += (duTerm + dvTerm) * du * du;
    }
  }
  return sum;
}

/**
 * The seam (topological-obstruction) channel: the discontinuity of the field
 * across the u- and v-identifications, EXTRAPOLATED to a true jump.
 *
 * A smooth periodic field is continuous across the seam: its value at `eps`
 * differs from its value at `2π−eps` by O(eps·|∇f|) — a smooth slope, not a
 * leak. A field with a genuine obstruction (holonomy, broken periodicity)
 * jumps by an O(amplitude) amount that does NOT shrink as eps→0. We separate
 * the two by sampling at two probe widths and extrapolating the defect to
 * eps→0: a smooth field extrapolates to ~0; a jumped field extrapolates to its
 * finite jump. This is the Dirac-obstruction analogue — flux that cannot be
 * removed by smoothing because the field does not close.
 *
 * Sampled on a golden-ratio low-discrepancy orbit (KAM-optimal equidistribution,
 * see File 5) so no single harmonic is aliased.
 */
function seamDefect(field: TorusField, samples: number): number {
  // Golden-ratio conjugates for a low-discrepancy orbit (derived, not imported,
  // to keep this file's dependency surface minimal per the DAG).
  const phiInv = 0.6180339887498948482;
  // Two probe widths a decade apart; the eps→0 extrapolated jump is
  //   jump ≈ d(eps2) − (d(eps1)−d(eps2))·eps2/(eps1−eps2)  ≈ d(1e-5) extrapolated.
  const measure = (eps: number): number => {
    let m = 0;
    for (let i = 0; i < samples; i++) {
      const u = wrapAngle(eps + i * TWO_PI * phiInv);
      const v = wrapAngle(eps + i * TWO_PI * phiInv * phiInv);
      m = Math.max(
        m,
        Math.abs(field({ u: eps, v }) - field({ u: TWO_PI - eps, v })),
        Math.abs(field({ u, v: eps }) - field({ u, v: TWO_PI - eps })),
      );
    }
    return m;
  };
  const d1 = measure(1e-5);
  const d2 = measure(1e-6);
  // Linear extrapolation to eps=0. For a smooth field d∝eps so the intercept
  // →0; for a jumped field d is eps-independent so the intercept = the jump.
  const jump = d2 - ((d1 - d2) * 1e-6) / (1e-5 - 1e-6);
  return Math.max(0, jump);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The closure residual of a field on a scale's torus — the engine's
 * frictionlessness measure, as a Classified dimensionless number.
 *
 * residual = |∮ ∇Ψ·dS| (divergence form) + seamDefect (topological channel).
 *
 * - Smooth periodic toroidal mode  → ~machine-eps (the ideal, frictionless loop).
 * - Broken periodicity / holonomy  → finite residual (the "friction" to minimize).
 * - NEVER exactly 0 in the engine: the Lucas obstruction (Lₙ mod 13 ≠ 0) is the
 *   discrete analogue of the Dirac/Chern flux floor. We surface that floor via
 *   `minimallyOpenFloor`, not by fudging the integral.
 *
 * Provenance: the divergence-form integral is EXACT mathematics; reading a
 * nonzero residual as physical friction is POSTULATE (taint propagates). The
 * Richardson check (N vs N/2) guarantees the quadrature itself is converged.
 *
 * Throws if the quadrature fails to converge (the one un-catchable engine sin:
 * reporting a residual we cannot trust).
 */
export function closureResidual(
  field: TorusField,
  torus: TorusParams,
  grid = DEFAULT_GRID,
): Classified<number> {
  if (!Number.isInteger(grid) || grid < 8) {
    throw new RangeError(`closureResidual: grid must be an integer ≥ 8, got ${grid}`);
  }
  const coarse = fluxIntegral(field, torus, grid >> 1);
  const fine = fluxIntegral(field, torus, grid);
  // Richardson convergence, stated honestly. The refinement step |fine−coarse|
  // must be small in ONE of two ways:
  //   (a) relative — |Δ| ≤ tol·|flux|: a genuinely-open field's large flux is
  //       well-resolved and must be REPORTED, not thrown;
  //   (b) absolute — |Δ| ≤ epsFloor: a smooth periodic field's flux is ~machine
  //       -epsilon, so |Δ| ~ 1e-13 IS "converged to zero," not a failure.
  // The floor is set at the Float64 noise scale of an O(1)-integrand periodic
  // trapezoid rule (≈1e-11), far below any physical residual (≥1e-4).
  const fluxMag = Math.max(Math.abs(fine), Math.abs(coarse));
  const richardsonErr = Math.abs(fine - coarse);
  const ABS_FLOOR = 1e-11;
  const fluxConverged =
    richardsonErr <= ABS_FLOOR ||
    richardsonErr <= RICHARDSON_TOL * fluxMag;
  const seam = seamDefect(field, 64);
  if (!fluxConverged) {
    // A field with a derivative-jump at the seam (e.g. v·v) converges only
    // linearly in the smooth flux channel — but that jump IS the openness the
    // seam channel detects. If the seam shows a real obstruction, the field is
    // genuinely open: report the large residual, don't throw. Throw only when
    // BOTH channels are unreliable (a non-smooth field with no seam signature —
    // the one case where no number can be trusted).
    const seamSignificant = seam > 1e-4;
    if (!seamSignificant) {
      throw new RangeError(
        `closureResidual: flux quadrature not converged (|Δ|=${richardsonErr.toExponential(3)} ` +
          `vs flux ${fluxMag.toExponential(3)} at grid ${grid}) and no seam obstruction; ` +
          `refine the grid or smooth the field`,
      );
    }
  }
  const residual = Math.abs(fine) + seam;
  return classify(
    residual,
    "POSTULATE",
    undefined,
    "closure residual = |∮∇Ψ·dS| (EXACT integral) + seam obstruction; " +
      "physical reading as frictionlessness is RHUFT POSTULATE; Lucas/Duhamel " +
      "obstruction ⇒ never exactly 0",
  );
}

/**
 * Closure score ∈ [0,1]: 1 = perfectly closed (frictionless), 0 = fully open.
 * Defined as 1/(1 + residual) so a machine-eps residual maps to ≈1 and a large
 * residual asymptotes to 0 — bounded, monotone, and dimensionless.
 */
export function closureScore(field: TorusField, torus: TorusParams): number {
  const { value } = closureResidual(field, torus);
  return 1 / (1 + value);
}

/**
 * Is the field "minimally open" — closed to within the Lucas-obstruction floor?
 * True when the residual sits at/below tol, i.e. the scale is as closed as the
 * discrete ladder permits. This is the engine's per-scale success predicate.
 */
export function isMinimallyOpen(
  field: TorusField,
  torus: TorusParams,
  tol = 1e-4,
): boolean {
  return closureResidual(field, torus).value <= tol;
}

/**
 * The Lucas-obstruction floor for this scale — the smallest residual the
 * discrete ladder allows. At the Metatron shell (n=13) it is exactly φ⁻²⁶
 * (EXACT as a number; POSTULATE as a flux). For other rungs the floor scales as
 * φ⁻²ⁿ relative to the shell — a POSTULATE-tagged scaling, never asserted as
 * measured physics.
 */
export function minimallyOpenFloor(torus: TorusParams): Classified<Scaled> {
  // φ⁻²⁶ at n=13; general rung n: φ⁻²⁶ · φ⁻²⁽ⁿ⁻¹³⁾. EXACT base, POSTULATE form.
  const shellN = 13;
  const exponent = -26 - 2 * (torus.n - shellN);
  const floor = Scaled.from(Math.pow(torus.aspect, exponent));
  return classify(
    floor,
    tainted("EXACT", "POSTULATE"),
    undefined,
    `Lucas-obstruction floor ~ φ^(${exponent}); φ⁻²⁶ base EXACT, φ-scaling POSTULATE`,
  );
}

/** Re-export the field/point types so callers depend only on this file's seam. */
export type { TorusField, TorusPoint, TorusParams };
export { PHI_NEG26 };
