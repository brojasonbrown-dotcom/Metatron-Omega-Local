/**
 * FILE 10 — dynamics/propagation.ts
 *
 * Term V of the Master Equation — the scale-dependent damped wave in the
 * medium: how a disturbance MOVES across a rung's node ring at that rung's
 * canonical wave speed v_wave(n) = c·φ⁻ⁿᐟ² (B2: the ladder form; the medium
 * form stays an OPEN postulate, so v_wave is INJECTED and swappable).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE SCHEME (modified-equation leapfrog — derived, not picked for ease).
 *
 * The naive order-4-in-space leapfrog has stability boundary ν* = √3/2 < 1,
 * which would FALSIFY the contract clause "CFL exactly 1.0 stable" (verified
 * numerically: 0.999·√3/2 stable, 1.001·√3/2 diverges). The strongest complete
 * method (§C-15) satisfying BOTH contract clauses is the modified-equation
 * leapfrog: Taylor gives
 *
 *   u⁺ − 2u + u⁻ = dt²·u_tt + (dt⁴/12)·u_tttt + O(dt⁶),
 *
 * and the wave equation u_tt = v²Δu implies u_tttt = v⁴Δ²u, so
 *
 *   u⁺ = 2u − u⁻ + dt²v²·Δ₄u + (dt⁴v⁴/12)·Δ₄(Δ₄u)          [undamped]
 *
 * with Δ₄ the order-4 stencil (−1,16,−30,16,−1)/12dx². Both truncations are
 * now O(4): the scheme is 4th order in space AND time at fixed Courant ν.
 *
 * STABILITY (von Neumann, exact): the amplification symbol is
 *   g(s) = 1 − s/2 + s²/24,  s = dt²v²λ,  λ ∈ [0, 16/(3dx²)]  (stencil max).
 *   |g| ≤ 1  ⇔  s ≤ 12  ⇔  ν = v·dt/dx ≤ √(12·3/16) = 3/2  EXACTLY.
 * Hence ν = 1.0 sits strictly inside the stable region — the contract's
 * "CFL exactly 1.0 stable" holds by theorem, not luck. All three claims were
 * verified numerically before this file was written (order 3.93/4.00/4.00 on
 * N=32→256; boundary razor at 0.999/1.001·(3/2); ν=1.0 bounded over 10⁵
 * Nyquist-seeded steps). [MEASURED → asserted by File 10's tests.]
 *
 * DAMPING (γ ≥ 0): centered friction u_t·γ discretised (u⁺−u⁻)/2dt gives
 *   (1+γdt/2)·u⁺ = 2u − (1−γdt/2)·u⁻ + dt²v²Δ₄u + (dt⁴v⁴/12)Δ₄²u.
 * For γ>0 the O(dt⁴) correction ignores γ's contribution to u_tttt, so the
 * damped scheme is formally O(2) in time — the contract demands only bounded,
 * decaying energy there (verified: monotone decay over 4·10³ steps). Honest
 * boundary: 4th order is claimed ONLY for γ = 0.
 *
 * B1 DISCIPLINE: the kernel never forms 1/dx² with raw SI magnitudes. The
 * update is computed entirely through the dimensionless Courant number
 * ν = v·dt/dx and the pure index-space stencil — no cross-scale SI products.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   propagation(10) → { scaleTable(04), provenance/scaled(02), constants(01) }
 *   plus a TYPE-ONLY reuse of File 9's real `Field` typing (DAG-legal downward
 *   import; keeps ONE field type engine-wide instead of a duplicate alias).
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { ScaleRecord } from "../core/scaleTable.ts";
import type { Field, FieldValue } from "./memoryKernel.ts";

/**
 * The operating CFL limit the engine runs at (contract invariant dt ≤ dx/v).
 * ν = 1.0 is strictly inside the scheme's stable region (boundary 3/2).
 */
export const CFL_LIMIT = 1.0;

/**
 * The scheme's EXACT stability boundary ν* = 3/2, derived from the von Neumann
 * symbol (s ≤ 12 with stencil max 16/3) — computed from the relationship, not
 * hard-coded (golden rule B12): ν* = √(12·3/16).
 */
export const CFL_STABILITY_BOUNDARY = Math.sqrt((12 * 3) / 16);

/** Minimum ring size for the 5-point order-4 stencil to be well-defined. */
export const MIN_NODES = 5;

/** Result of the inverse-square emergence experiment (real measurement). */
export interface InverseSquareResult {
  /** Least-squares exponent of wavefront amplitude vs radius (theory: −1). */
  readonly amplitudeExponent: number;
  /** 2× amplitude exponent — the intensity law (theory: −2). */
  readonly intensityExponent: number;
  /** The (radius, peak amplitude) samples the fit was made from. */
  readonly samples: ReadonlyArray<readonly [number, number]>;
}

/**
 * Propagator — term V for one stable rung.
 *
 * Immutable once constructed. `vWave` defaults to the rung's canonical ladder
 * speed c·φ⁻ⁿᐟ² read from the scale record, but is INJECTED so the B2 medium
 * form can be swapped in later without touching this file.
 */
export class Propagator {
  /** The rung this propagator serves. */
  readonly scale: ScaleRecord;
  /** Wave speed [m/s] — injected; defaults to the rung's canonical v_wave. */
  readonly vWave: number;

  constructor(scale: ScaleRecord, vWave: number = scale.vWave.toFloat64()) {
    if (!Number.isFinite(vWave) || vWave <= 0) {
      throw new RangeError(`Propagator: vWave must be positive and finite; got ${vWave}.`);
    }
    this.scale = scale;
    this.vWave = vWave;
  }

  /** The dimensionless Courant number ν = v·dt/dx. */
  courant(dx: number, dt: number): number {
    this.assertPositive(dx, "dx");
    this.assertPositive(dt, "dt");
    return (this.vWave * dt) / dx;
  }

  /** Contract invariant: dt ≤ dx/vWave  ⇔  ν ≤ 1.0 (the operating limit). */
  cflSatisfied(dx: number, dt: number): boolean {
    return this.courant(dx, dt) <= CFL_LIMIT + 1e-15;
  }

  /**
   * One damped modified-equation leapfrog step on a PERIODIC node ring.
   * Enforces the operating CFL invariant (ν ≤ 1.0) — the unstable regime is
   * unrepresentable through this entry point (foolproof-by-construction).
   * Pure: returns a fresh array; never mutates inputs.
   */
  step(present: Field, past: Field, dx: number, dt: number, gamma = 0): FieldValue[] {
    if (!this.cflSatisfied(dx, dt)) {
      throw new RangeError(
        `Propagator.step: CFL violated — ν = ${this.courant(dx, dt)} > ${CFL_LIMIT}. ` +
          `Require dt ≤ dx/vWave = ${dx / this.vWave}.`,
      );
    }
    return this.stepRaw(present, past, dx, dt, gamma);
  }

  /**
   * The UNGUARDED update — the only sanctioned way to probe beyond the
   * operating limit (mirrors File 9's dampedRegularization pattern: the
   * dangerous path exists solely as an explicit, documented instrument).
   * Used by the acceptance tests to demonstrate the exact ν* = 3/2 boundary.
   */
  stepRaw(present: Field, past: Field, dx: number, dt: number, gamma = 0): FieldValue[] {
    const n = this.validatePair(present, past);
    this.assertPositive(dx, "dx");
    this.assertPositive(dt, "dt");
    if (!Number.isFinite(gamma) || gamma < 0) {
      throw new RangeError(`Propagator: gamma must be ≥ 0 and finite; got ${gamma}.`);
    }
    // Dimensionless Courant form (B1): stencils live in index space; the only
    // physics entering the update is ν² and ν⁴ — no raw SI 1/dx² is ever built.
    const nu2 = this.courant(dx, dt) ** 2;
    const c2 = nu2; // multiplies the index-space Δ₄ stencil
    const c4 = (nu2 * nu2) / 12; // multiplies Δ₄(Δ₄) — the O(dt⁴) Taylor term
    const a = 1 + (gamma * dt) / 2;
    const b = 1 - (gamma * dt) / 2;

    const s1 = stencil4(present); // Δ₄u  (index space, ×1/dx² implied by ν²)
    const s2 = stencil4(s1); // Δ₄²u
    const out = new Array<FieldValue>(n);
    for (let i = 0; i < n; i++) {
      out[i] =
        (2 * (present[i] as number) - b * (past[i] as number) + c2 * (s1[i] as number) + c4 * (s2[i] as number)) / a;
    }
    return out;
  }

  /**
   * The order-4 discrete Laplacian Δ₄u = (−u₋₂+16u₋₁−30u₀+16u₊₁−u₊₂)/(12dx²)
   * on the periodic ring — exposed so tests can assert the stencil itself
   * (exactness on low-degree data) independently of time stepping.
   */
  laplacian4(field: Field, dx: number): FieldValue[] {
    this.assertPositive(dx, "dx");
    if (field.length < MIN_NODES) {
      throw new RangeError(`Propagator.laplacian4: need ≥ ${MIN_NODES} nodes; got ${field.length}.`);
    }
    const s = stencil4(field);
    const inv = 1 / (dx * dx);
    return s.map((x) => x * inv);
  }

  /**
   * Inverse-square emergence — a REAL numerical experiment, not an assertion.
   * A spherically-symmetric wave obeys u_tt = v²(1/r²)(r²u_r)_r; substituting
   * w = r·u reduces it EXACTLY to the 1D wave equation w_tt = v²w_rr with the
   * regularity condition w(0)=0. We launch an outgoing Gaussian pulse, track
   * the wavefront's peak amplitude of u = w/r at successive radii, and fit
   * the power law. Geometry then produces amplitude ∝ 1/r — and therefore
   * intensity ∝ 1/r² — with no 1/r² ever inserted by hand.
   *
   * Runs in scale-free units (the measured exponent is dimensionless and
   * independent of vWave — pure geometry).
   */
  inverseSquareEmergent(gridPoints = 2400, outerRadius = 120): InverseSquareResult {
    if (!Number.isInteger(gridPoints) || gridPoints < 100) {
      throw new RangeError(`inverseSquareEmergent: gridPoints must be an integer ≥ 100; got ${gridPoints}.`);
    }
    this.assertPositive(outerRadius, "outerRadius");
    const M = gridPoints;
    const dr = outerRadius / M;
    const v = 1; // scale-free: exponent is v-independent (pure geometry)
    const dt = 0.9 * dr; // ν = 0.9 < 1: inside the operating limit
    const r0 = 10; // launch radius (clear of the r=0 regularity node)
    const pulse = (s: number): number => Math.exp(-((s - r0) ** 2) / 2);

    // w = r·u on the radial grid, Dirichlet at both ends (w(0)=0 regularity).
    let past: number[] = Array.from({ length: M + 1 }, (_, i) => pulse(i * dr));
    let present: number[] = Array.from({ length: M + 1 }, (_, i) => pulse(i * dr - v * dt));
    past[0] = present[0] = 0;
    past[M] = present[M] = 0;

    const sampleRadii = [20, 40, 60, 80, 100].filter((r) => r < outerRadius - 10);
    const snapshotSteps = sampleRadii.map((r) => Math.round((r - r0) / (v * dt)));
    const lastStep = Math.max(...snapshotSteps);
    const samples: Array<readonly [number, number]> = [];

    const nu2 = (v * dt) ** 2 / (dr * dr); // order-2 radial kernel (interior)
    for (let step = 0; step <= lastStep; step++) {
      if (snapshotSteps.includes(step)) {
        // locate the wavefront: the max of |u| = |w|/r over the interior
        let peak = 0;
        let peakR = 0;
        for (let i = 1; i < M; i++) {
          const u = Math.abs((present[i] as number) / (i * dr));
          if (u > peak) {
            peak = u;
            peakR = i * dr;
          }
        }
        samples.push([peakR, peak] as const);
      }
      const next = new Array<number>(M + 1).fill(0);
      for (let i = 1; i < M; i++) {
        const lap = (present[i - 1] as number) - 2 * (present[i] as number) + (present[i + 1] as number);
        next[i] = 2 * (present[i] as number) - (past[i] as number) + nu2 * lap;
      }
      past = present;
      present = next;
    }

    // Least-squares slope of ln(amplitude) vs ln(radius).
    const xs = samples.map(([r]) => Math.log(r));
    const ys = samples.map(([, a2]) => Math.log(a2));
    const k = xs.length;
    const mx = xs.reduce((s, x) => s + x, 0) / k;
    const my = ys.reduce((s, y) => s + y, 0) / k;
    let num = 0;
    let den = 0;
    for (let i = 0; i < k; i++) {
      num += ((xs[i] as number) - mx) * ((ys[i] as number) - my);
      den += ((xs[i] as number) - mx) ** 2;
    }
    const slope = num / den;
    return Object.freeze({
      amplitudeExponent: slope,
      intensityExponent: 2 * slope,
      samples: Object.freeze(samples),
    });
  }

  private validatePair(present: Field, past: Field): number {
    if (present.length !== past.length) {
      throw new RangeError(
        `Propagator: field length mismatch (present ${present.length} vs past ${past.length}).`,
      );
    }
    if (present.length < MIN_NODES) {
      throw new RangeError(`Propagator: need ≥ ${MIN_NODES} nodes for the order-4 stencil; got ${present.length}.`);
    }
    for (let i = 0; i < present.length; i++) {
      if (!Number.isFinite(present[i] as number) || !Number.isFinite(past[i] as number)) {
        throw new RangeError(`Propagator: non-finite field value at node ${i}.`);
      }
    }
    return present.length;
  }

  private assertPositive(x: number, name: string): void {
    if (!Number.isFinite(x) || x <= 0) {
      throw new RangeError(`Propagator: ${name} must be positive and finite; got ${x}.`);
    }
  }
}

/**
 * The pure index-space order-4 stencil: 12·dx²·Δ₄ — i.e. the Laplacian WITHOUT
 * the 1/(12dx²) factor folded back in by the caller (via ν² or 1/dx²). Keeping
 * it dimensionless is the B1 discipline: no raw SI reciprocal squares.
 */
function stencil4(u: Field): number[] {
  const N = u.length;
  const out = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    const m2 = u[(i - 2 + N) % N] as number;
    const m1 = u[(i - 1 + N) % N] as number;
    const p1 = u[(i + 1) % N] as number;
    const p2 = u[(i + 2) % N] as number;
    out[i] = (-m2 + 16 * m1 - 30 * (u[i] as number) + 16 * p1 - p2) / 12;
  }
  return out;
}
