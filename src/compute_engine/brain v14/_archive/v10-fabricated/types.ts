/**
 * v10/types.ts — Shared toroidal-kernel types for the RHUFT Phase-3 engine.
 *
 * Epistemic discipline (mirrors the v6.0 corpus):
 *   [MATH FACT]  φ, φ⁻¹, φ⁻², κ=1/(φπ) are exact algebraic identities.
 *   [GEOM]       Toroidal closure is a geometric phase-coherence reading, not a
 *                physical prediction. Closure → 1 means zero net phase momentum
 *                around the loop (a "perfect torus" of the field).
 *   [SPEC]       The mapping of closure to "energy confinement" or "vacuum
 *                preference" is a RHUFT postulate, labeled as such at call sites.
 *
 * These types are the single source of truth for the Toroidal / MesoTori /
 * MicroTori kernels. No physical accuracy is claimed; only internal geometric
 * consistency is asserted and tested.
 */

/** Golden ratio φ = (1+√5)/2 — [MATH FACT] exact algebraic identity. */
export const PHI = 1.618033988749895;
/** 1/φ = φ − 1 — [MATH FACT]. */
export const PHI_INV = 0.6180339887498949;
/** λ = φ⁻² = 2 − φ ≈ 0.381966 — [MATH FACT]; the conservative memory weight. */
export const LAMBDA = 0.3819660112501051;
/** κ = 1/(φπ) ≈ 0.196726 — [MATH FACT] dimensionless closure coupling. */
export const KAPPA = 1 / (PHI * Math.PI);
/** ψ-damping exponent base ψ = φ⁻¹ (the "silver" damping of the torus). */
export const PSI = PHI_INV;

/** A phase sample: angle (radians) + amplitude weight ∈ [0,1]. */
export interface PhaseSample {
  /** Phase angle θ ∈ (−π, π]. */
  readonly theta: number;
  /** Amplitude / coherence weight w ∈ [0,1]. */
  readonly weight: number;
}

/**
 * Options for one toroidal-closure evaluation. Exactly one of `damping` or
 * `resonance` is meaningful at a time (see Toroidal.ts):
 *  - `damping`:   explicit ψ-damping coefficient ∈ [0,1]. 0 = pure structural read.
 *  - `resonance`: previous closure value used as a self-consistent damping proxy
 *                 (higher prior closure ⇒ stronger damping ⇒ tighter convergence).
 */
export interface ClosureOptions {
  readonly damping?: number;
  readonly resonance?: number;
}

/**
 * Result of a single toroidal-closure reading.
 * `closure` and `coherence` are both ∈ [0,1]; `residual` ≥ 0 is the net phase
 * momentum magnitude (the "leak"); `dampingApplied` echoes the damping used.
 */
export interface ClosureResult {
  /** Toroidal closure ∈ [0,1]. 1 = perfect loop (zero net momentum). */
  readonly closure: number;
  /** Mean resultant length of the weighted phasors ∈ [0,1] (phase coherence). */
  readonly coherence: number;
  /** Net phase-momentum residual ≥ 0 (the complement of closure). */
  readonly residual: number;
  /** The ψ-damping coefficient actually applied ∈ [0,1]. */
  readonly dampingApplied: number;
}

/** Result of driving a scalar map to its fixed point. */
export interface FixedPointResult {
  /** Converged value ∈ [0,1]. */
  readonly closure: number;
  /** |x_n − x_{n−1}| on the final iteration. */
  readonly delta: number;
  /** Iterations actually performed (≤ maxIterations). */
  readonly iterations: number;
  /** True if delta < tolerance was reached within maxIterations. */
  readonly converged: boolean;
}
