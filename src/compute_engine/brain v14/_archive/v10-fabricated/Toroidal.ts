/**
 * v10/Toroidal.ts — the shared toroidal-closure kernel (Phase 3a).
 *
 * [GEOM] A "torus" of the field is a closed loop of weighted phasors. The
 * closure reading is the normalised mean resultant length of those phasors:
 * when the field circulates with zero net momentum (phases balance), the
 * resultant vanishes and the loop is "closed". We define:
 *
 *     coherence  C = |Σ w_k e^{iθ_k}| / Σ w_k          (mean resultant length)
 *     residual   R = 1 − C                              (net phase momentum)
 *     closure    Ω = 1 − R·(1 − ψ·d)  =  C + R·ψ·d      (ψ-damped closure)
 *
 * where ψ = φ⁻¹ is the damping base and d ∈ [0,1] the damping coefficient.
 * With d = 0 the closure is the pure structural reading (Ω = C). With d > 0
 * the residual is partially reabsorbed — modelling the conservative λ = φ⁻²
 * memory law at the loop scale (present + past → future). [SPEC] The physical
 * interpretation of Ω as "energy confinement" is a RHUFT postulate, not derived.
 *
 * `fixedPointClosure` drives any scalar φ-contraction map x_{n+1} = f(x_n) to
 * its attractor. Because the blend maps into [0,1] and is a contraction (its
 * feedback factors are all ≤ 1 with the geometric-mean damping), the iteration
 * converges; we stop when |Δx| < tolerance rather than after a fixed count —
 * the corpus's stated preference for proven convergence over "run N and hope".
 *
 * Wolfram-verifiable anchors:
 *   ψ = φ⁻¹ = 0.6180339887…   λ = φ⁻² = 0.3819660112…   κ = 1/(φπ) = 0.1967…
 */

import {
  PHI_INV,
  ClosureOptions,
  ClosureResult,
  FixedPointResult,
} from './types';

const TWO_PI = Math.PI * 2;

/** Clamp to [0,1]; NaN/±∞ collapse to 0 (absence is information, never NaN). */
function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Evaluate the toroidal closure of a loop of phasors.
 *
 * @param phases  Phase angles θ_k in radians.
 * @param amps    Amplitude weights w_k ∈ [0,1] (same length as `phases`).
 * @param opts    `{ damping }` for an explicit ψ-damping coefficient, or
 *                `{ resonance }` to use a prior closure as the damping proxy.
 *                Omit both (or pass `{ damping: 0 }`) for the pure structural read.
 */
export function toroidalClosure(
  phases: ArrayLike<number>,
  amps: ArrayLike<number>,
  opts: ClosureOptions = {},
): ClosureResult {
  const n = Math.min(phases.length, amps.length);
  if (n === 0) {
    return { closure: 0, coherence: 0, residual: 0, dampingApplied: 0 };
  }

  // Mean resultant vector of the weighted unit phasors.
  let re = 0;
  let im = 0;
  let wsum = 0;
  for (let k = 0; k < n; k++) {
    const w = clamp01(amps[k]);
    const th = phases[k];
    if (!Number.isFinite(th)) continue;
    re += w * Math.cos(th);
    im += w * Math.sin(th);
    wsum += w;
  }
  if (wsum <= 0) {
    return { closure: 0, coherence: 0, residual: 0, dampingApplied: 0 };
  }

  // Mean resultant length ∈ [0,1]: the phase coherence of the loop.
  const coherence = clamp01(Math.hypot(re, im) / wsum);
  const residual = 1 - coherence;

  // Resolve the damping coefficient: explicit `damping` wins; otherwise the
  // `resonance` proxy (a prior closure) drives self-consistent damping.
  const d =
    opts.damping !== undefined
      ? clamp01(opts.damping)
      : opts.resonance !== undefined
        ? clamp01(opts.resonance)
        : 0;

  // ψ-damped closure: reabsorb a ψ·d fraction of the residual.
  // Ω = C + R·ψ·d  ⇒  d=0 gives the structural read, d→1 asymptotes to C+R·ψ.
  const closure = clamp01(coherence + residual * PHI_INV * d);

  return { closure, coherence, residual, dampingApplied: d };
}

/**
 * Drive a scalar contraction map to its fixed point.
 *
 * @param step          The map x_{n+1} = step(x_n). Must map [0,1] → [0,1] and
 *                      be a contraction for guaranteed convergence.
 * @param initial       Starting value x_0.
 * @param maxIterations Hard cap on iterations (the engine uses 3).
 * @param tolerance     Convergence threshold on |Δx| (the engine uses 1e-4).
 */
export function fixedPointClosure(
  step: (prev: number) => number,
  initial: number,
  maxIterations: number,
  tolerance: number,
): FixedPointResult {
  let x = clamp01(initial);
  let delta = Number.POSITIVE_INFINITY;
  let iterations = 0;
  let converged = false;

  for (let i = 0; i < maxIterations; i++) {
    const next = clamp01(step(x));
    delta = Math.abs(next - x);
    x = next;
    iterations = i + 1;
    if (delta < tolerance) {
      converged = true;
      break;
    }
  }

  // If the loop exhausted its budget, delta holds the last |Δx| (finite).
  if (!Number.isFinite(delta)) delta = 0;

  return { closure: x, delta, iterations, converged };
}

/**
 * Geometric fixed point of the golden-section order/disorder map.
 * [MATH FACT] x = 1 − x/φ  ⇒  x(1 + 1/φ) = 1  ⇒  x = 1/(1 + 1/φ) = φ/(φ+1)
 *            = φ/φ² = 1/φ = φ⁻¹ ≈ 0.6180339887.
 * This is the thermodynamic critical alignment H* (see Thermodynamic.ts).
 * Returned as a constant for cross-module reuse and direct testing.
 */
export const GOLDEN_SECTION_FIXED_POINT = PHI_INV; // = 1/φ, solves x = 1 − x/φ

/** Helper: wrap an angle to (−π, π]. */
export function wrapPhase(theta: number): number {
  if (!Number.isFinite(theta)) return 0;
  let t = theta % TWO_PI;
  if (t <= -Math.PI) t += TWO_PI;
  else if (t > Math.PI) t -= TWO_PI;
  return t;
}
