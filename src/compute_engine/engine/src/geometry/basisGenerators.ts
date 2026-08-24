/**
 * FILE 8 — geometry/basisGenerators.ts
 *
 * The spherical + toroidal mode basis for field expansion — the measurement
 * dictionary of the L2 layer. Every field the engine measures (File 6 closure,
 * File 12 self-overlap) is expanded into this orthonormal basis, so that a
 * field becomes a vector of coefficients the engine can compare, store, and
 * minimize over. This is the Tier-2 instrument: how measured information is
 * decomposed into a processable form.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RESEARCH GROUNDING (provenance per claim, per the no-mistakes firewall):
 *
 *   Toroidal Fourier basis     e^{i(m u + n v)} on [0,2π)² is orthonormal under
 *                              the FLAT inner product (1/4π²)∫∫ f̄ g du dv.
 *                              Classical Fourier series on the 2-torus.
 *                              [EXACT] — the modes are eigenfunctions of the
 *                              flat Laplacian; orthogonality is exact.
 *
 *   Curved-metric weighting    On the φ-aspect torus the physical area element
 *                              is r²·g(v) du dv with g(v)=aspect+cos v (File 5).
 *                              The flat modes are NOT exactly orthonormal under
 *                              the curved measure; we therefore build the basis
 *                              by Gram–Schmidt under the CURVED L2 inner product
 *                              ⟨f,g⟩ = (1/A)∫∫ f̄ g √det g du dv, which restores
 *                              exact orthonormality by construction.
 *                              [EXACT] — Gram–Schmidt is a theorem, not a fit.
 *
 *   Spherical harmonics        Y_l^m on S² — provided for the spherical end of
 *                              the basis (cross-scale closure). Orthonormal
 *                              under the S² measure. [EXACT] — Condon–Shortley.
 *
 * Dependency direction (strictly downward, spec §4):
 *   basisGenerators(08) → { torus(05), provenance(02), constants(01) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PI } from "../core/constants.ts";
import {
  metric,
  type TorusParams,
  type TorusPoint,
} from "./torus.ts";

const TWO_PI = 2 * PI;

// ─────────────────────────────────────────────────────────────────────────────
// Complex scalars (the basis is complex-valued)
// ─────────────────────────────────────────────────────────────────────────────

/** A complex number in rectangular form. */
export interface Cx {
  readonly re: number;
  readonly im: number;
}
const c = (re: number, im = 0): Cx => ({ re, im });
const cAdd = (a: Cx, b: Cx): Cx => c(a.re + b.re, a.im + b.im);
const cSub = (a: Cx, b: Cx): Cx => c(a.re - b.re, a.im - b.im);
const cMul = (a: Cx, b: Cx): Cx => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cScale = (a: Cx, s: number): Cx => c(a.re * s, a.im * s);
const cConj = (a: Cx): Cx => c(a.re, -a.im);
const cAbs = (a: Cx): number => Math.hypot(a.re, a.im);

// ─────────────────────────────────────────────────────────────────────────────
// Mode type
// ─────────────────────────────────────────────────────────────────────────────

/** A single basis mode: a complex-valued function on the torus. */
export type Mode = (p: TorusPoint) => Cx;

/** A labelled toroidal mode with its (m,n) wavenumbers. */
export interface ToroidalMode {
  readonly m: number; // toroidal wavenumber (u-cycle)
  readonly n: number; // poloidal wavenumber (v-cycle)
  readonly fn: Mode;
}

/**
 * A raw toroidal Fourier mode e^{i(m u + n v)} with amplitude amp and phase
 * alpha. EXACT — the canonical periodic building block.
 */
export function toroidalMode(m: number, n: number, amp = 1, alpha = 0): ToroidalMode {
  if (!Number.isInteger(m) || !Number.isInteger(n)) {
    throw new RangeError(`toroidalMode: wavenumbers must be integers, got m=${m}, n=${n}`);
  }
  return {
    m,
    n,
    fn: (p: TorusPoint) =>
      cScale(c(Math.cos(m * p.u + n * p.v + alpha), Math.sin(m * p.u + n * p.v + alpha)), amp),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The curved-metric L2 inner product on the torus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The L2 inner product on the φ-aspect torus under its curved area measure:
 *   ⟨f,g⟩ = (1/A) ∫∫ f̄(p) g(p) √det g(p) du dv ,
 * with A = 4π²Rr the total area (File 5), so ⟨1,1⟩ = 1. Evaluated by the
 * periodic trapezoid rule, which converges spectrally for band-limited modes.
 * The r² Jacobian is a pure scale factor and cancels against A in the
 * normalisation, so the result is dimensionless (shape-only).
 */
export function l2Inner(f: Mode, g: Mode, torus: TorusParams, grid = 96): Cx {
  const du = TWO_PI / grid;
  // We factor r² out and normalise by the dimensionless integral of √det g, so
  // only the dimensionless √det g (shape) matters — r² cancels against the area.
  let acc = c(0, 0);
  for (let i = 0; i < grid; i++) {
    const u = (i + 0.5) * du;
    for (let j = 0; j < grid; j++) {
      const v = (j + 0.5) * du;
      const w = metric(torus, { u, v }).sqrtDet; // dimensionless Jacobian
      const term = cMul(cConj(f({ u, v })), g({ u, v }));
      acc = cAdd(acc, cScale(term, w));
    }
  }
  // ∫∫ ≈ Σ · du·du ; normalise by the dimensionless integral of √det g.
  // Rather than carry the Scaled area, note ⟨1,1⟩ must be 1: divide by the
  // dimensionless surface integral of √det g.
  const normConst = dimensionlessArea(torus, grid);
  const integral = cScale(acc, du * du);
  return cScale(integral, 1 / normConst);
}

/** ∫∫ √det g du dv over the torus (dimensionless shape area). */
function dimensionlessArea(torus: TorusParams, grid: number): number {
  const du = TWO_PI / grid;
  let s = 0;
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const u = (i + 0.5) * du;
      const v = (j + 0.5) * du;
      s += metric(torus, { u, v }).sqrtDet;
    }
  }
  return s * du * du;
}

/** The L2 norm ‖f‖ = √⟨f,f⟩ under the curved measure. */
export function l2Norm(f: Mode, torus: TorusParams, grid = 96): number {
  return Math.sqrt(Math.max(0, l2Inner(f, f, torus, grid).re));
}

// ─────────────────────────────────────────────────────────────────────────────
// Orthonormal basis construction (Gram–Schmidt under the curved measure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an orthonormal basis of `count` toroidal modes for the given torus by
 * Gram–Schmidt orthonormalisation of the raw Fourier modes under the curved
 * L2 inner product. Modes are taken in order of increasing |m|+|n| (the
 * lowest-frequency, smoothest modes first) so the leading basis vectors carry
 * the large-scale structure. Orthonormality is exact by construction (up to
 * quadrature tolerance).
 */
export function l2Basis(torus: TorusParams, count: number, grid = 96): Mode[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`l2Basis: count must be an integer ≥ 1, got ${count}`);
  }
  // Candidate (m,n) pairs ordered by |m|+|n|, starting with the constant (0,0).
  const candidates: Array<[number, number]> = [];
  for (let band = 0; candidates.length < count * 4; band++) {
    for (let m = -band; m <= band; m++) {
      const n = band - Math.abs(m);
      candidates.push([m, n]);
      if (n !== 0) candidates.push([m, -n]);
    }
  }
  const basis: Mode[] = [];
  let ci = 0;
  while (basis.length < count && ci < candidates.length) {
    const [m, n] = candidates[ci++]!;
    const raw = toroidalMode(m, n).fn;
    // Subtract projections onto existing basis vectors (Gram–Schmidt).
    let v: Mode = raw;
    for (const b of basis) {
      const proj = l2Inner(b, v, torus, grid);
      const vPrev = v;
      v = (p: TorusPoint) => cSub(vPrev(p), cMul(proj, b(p)));
    }
    const nrm = l2Norm(v, torus, grid);
    if (nrm < 1e-8) continue; // linearly dependent (shouldn't happen for distinct modes)
    const vn = v;
    basis.push((p: TorusPoint) => cScale(vn(p), 1 / nrm));
  }
  return basis;
}

// ─────────────────────────────────────────────────────────────────────────────
// Expansion / reconstruction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expand a field into the orthonormal basis: coefficients a_i = ⟨basis_i, f⟩.
 * The expansion of a basis mode returns its own coefficient vector (e_i).
 */
export function expand(field: Mode, basis: readonly Mode[], torus: TorusParams, grid = 96): Cx[] {
  return basis.map((b) => l2Inner(b, field, torus, grid));
}

/**
 * Reconstruct a field from coefficients: f̂(p) = Σ a_i · basis_i(p).
 * Round-trip: reconstruct(expand(f)) ≈ f on the span of the basis.
 */
export function reconstruct(coeffs: readonly Cx[], basis: readonly Mode[]): Mode {
  if (coeffs.length !== basis.length) {
    throw new RangeError(`reconstruct: ${coeffs.length} coeffs vs ${basis.length} basis modes`);
  }
  return (p: TorusPoint) => {
    let acc = c(0, 0);
    for (let i = 0; i < basis.length; i++) acc = cAdd(acc, cMul(coeffs[i]!, basis[i]!(p)));
    return acc;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Spherical harmonics (S² end of the basis) — Condon–Shortley phase
// ─────────────────────────────────────────────────────────────────────────────

/** Factorial for small integers (l ≤ ~20 here). */
function factorial(k: number): number {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return f;
}

/**
 * The associated Legendre polynomial P_l^m(x) (unnormalised, Condon–Shortley).
 * EXACT via the standard recurrence.
 */
export function associatedLegendre(l: number, m: number, x: number): number {
  if (!Number.isInteger(l) || !Number.isInteger(m) || l < 0 || Math.abs(m) > l) {
    throw new RangeError(`associatedLegendre: bad (l,m)=(${l},${m})`);
  }
  const am = Math.abs(m);
  // P_m^m
  let pmm = 1;
  if (am > 0) {
    const somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1;
    for (let i = 1; i <= am; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }
  if (l === am) return pmm;
  // P_{m+1}^m
  let pmmp1 = x * (2 * am + 1) * pmm;
  if (l === am + 1) return pmmp1;
  // Recurrence upward.
  let pll = 0;
  for (let ll = am + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmmp1 - (ll + am - 1) * pmm) / (ll - am);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

/**
 * The spherical harmonic Y_l^m(θ,φ) — normalised, Condon–Shortley phase.
 * EXACT. Orthonormal under the S² measure ⟨Y_l^m, Y_l'^m'⟩ = δ_ll' δ_mm'.
 * Provided so the cross-scale (spherical) closure has the same orthonormal
 * machinery as the toroidal basis.
 */
export function sphericalMode(l: number, m: number) {
  const norm = Math.sqrt(
    ((2 * l + 1) * factorial(l - Math.abs(m))) / (4 * PI * factorial(l + Math.abs(m))),
  );
  return {
    l,
    m,
    /** Evaluate at polar θ ∈ [0,π], azimuthal φ ∈ [0,2π). */
    fn: (theta: number, phi: number): Cx => {
      const P = associatedLegendre(l, m, Math.cos(theta));
      const phase = c(Math.cos(m * phi), Math.sin(m * phi));
      return cScale(phase, norm * P);
    },
  };
}
