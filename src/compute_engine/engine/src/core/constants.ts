/**
 * FILE 1 — core/constants.ts
 * RHUFT 18-stable-scale engine · single source of truth for every constant.
 *
 * Epistemic discipline (spec §0/B-blockers, §8 rule 8):
 *   every constant carries a Provenance tag — EXACT (mathematical identity),
 *   CODATA (2022 least-squares adjustment), or POSTULATE (framework assumption,
 *   ablation-ready). Nothing enters the engine untagged. No constant is computed
 *   at runtime from another module — all are literal or closed-form.
 *
 * Numeric ground truth verified against notebooks/verification_suite.py
 * (mpmath, 50–60 digit) and the audited RHUFT_Ultimate_Framework.md.
 */

import type { Provenance, Classified } from "./provenance.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Golden ratio family — EXACT mathematical identities (Float64 truncation).
// ─────────────────────────────────────────────────────────────────────────────

/** φ = (1+√5)/2 — the golden ratio. EXACT. */
export const PHI = 1.6180339887498948482 as const;

/** 1/φ = φ − 1. EXACT. */
export const PHI_INV = 0.6180339887498948482 as const;

/** φ² = φ + 1. EXACT. */
export const PHI_SQUARED = 2.6180339887498948482 as const;

/** φ⁻² = 1/φ² = (3−√5)/2 — the conservative memory-coupling λ. EXACT. */
export const PHI_NEG2 = 0.3819660112501051518 as const;

/** φ⁻³. EXACT. */
export const PHI_NEG3 = 0.2360679774997896964 as const;

/**
 * φ⁻²⁶ — Metatron-shell flux; spec §2 invariant anchor. EXACT.
 * DERIVED (not a literal) so it is the single source of truth: the prior literal
 * 3.684014691873265e-6 was off by 7.4e-12 and disagreed with torus.ts's pow form.
 * True value 3.68401469190059041585…e-6 (mpmath dps=50). [audit F1]
 */
export const PHI_NEG26 = Math.pow(PHI, -26);

/** π and 2π. EXACT (mathematical). */
export const PI = 3.1415926535897932385 as const;
export const TWO_PI = 6.2831853071795864769 as const;

/** Silver ratio δ_S = 1+√2. EXACT; distinct from φ — retained as ablation alternative. */
export const SILVER_RATIO = 2.4142135623730950488 as const;

// ─────────────────────────────────────────────────────────────────────────────
// CODATA 2022 Planck units — the physical anchors of the ladder.
// ─────────────────────────────────────────────────────────────────────────────

/** Speed of light, exact SI definition 299 792 458 m/s. CODATA (exact by SI). */
export const C = 299792458 as const;

/** Reduced Planck constant ℏ = 1.054571817e-34 J·s. CODATA 2022. */
export const HBAR = 1.054571817e-34 as const;

/** Newtonian gravitational constant G = 6.67430e-11 m³·kg⁻¹·s⁻². CODATA 2022. */
export const G = 6.6743e-11 as const;

/**
 * Planck length ℓ_P = √(ℏG/c³) = 1.616255×10⁻³⁵ m. CODATA 2022 (full precision).
 * Base of the length ladder L(n) = ℓ_P·φⁿ.
 */
export const PLANCK_LENGTH = 1.6162550244237053e-35 as const;

/** Planck time t_P = ℓ_P/c = 5.391246×10⁻⁴⁴ s. CODATA 2022 (full precision). */
export const PLANCK_TIME = 5.3912464466619439e-44 as const;

/** Planck mass m_P = √(ℏc/G) = 2.176434e-8 kg. CODATA 2022. */
export const PLANCK_MASS = 2.176434e-8 as const;

/** Planck energy E_P = m_P·c² = 1.956081e9 J. CODATA 2022. */
export const PLANCK_ENERGY = 1.956081e9 as const;

/**
 * Fine-structure constant inverse α⁻¹ = 137.035999177. CODATA 2022.
 * Anchored as fact; any φ-derived approximation stays POSTULATE (Class-B numerology).
 */
export const ALPHA_INV = 137.035999177 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Engine parameters
// ─────────────────────────────────────────────────────────────────────────────

/** Golden-delay fractional offset ε = 0.01 in τ(n) = t_P·φⁿ·(1+ε·n). POSTULATE. */
export const GOLDEN_DELAY_EPS = 0.01 as const;

/**
 * Information-density normalization ρ₀ = ℓ_P⁻³ (units m⁻³, stored as Scaled upstream).
 * ρ_I(n) = ρ₀·φ⁻ⁿ. CODATA-derived (from ℓ_P), φ-envelope is POSTULATE.
 */
export const RHO_0_EXP10 = 104 as const; // log10 exponent of ℓ_P⁻³ ≈ 2.37e104

/** Number of harmonics in the Metatron lattice — Fibonacci F₇ = 13. EXACT. */
export const HARMONIC_COUNT = 13 as const;

// ─────────────────────────────────────────────────────────────────────────────
// The 18 Lucas-stable scale indices — corrected ladder (spec §2, erratum E13).
// Stable ⇔ Lₙ ≡ ±1 (mod 13)  ⇔  n ≡ {1,13,15,27} (mod 28). 42 rungs ≤ 293.
// This REPLACES the discredited source table (which was wrong by up to 10¹⁴ at n=292).
// ─────────────────────────────────────────────────────────────────────────────

/** Lucas-stable scale index. The dense computational core: first 18 of 43 rungs. */
export type StableScaleIndex =
  | 1 | 13 | 15 | 27 | 29 | 41 | 43 | 55 | 57
  | 69 | 71 | 83 | 85 | 97 | 99 | 111 | 113 | 125;

/** The 18 stable rungs, ascending. EXACT (theorem-derived). */
export const STABLE_SCALES: readonly StableScaleIndex[] = [
  1, 13, 15, 27, 29, 41, 43, 55, 57, 69, 71, 83, 85, 97, 99, 111, 113, 125,
] as const;

/** The Metatron shell — the n=13 rung carries the φ⁻²⁶ flux. EXACT. */
export const METATRON_SHELL: StableScaleIndex = 13;

/**
 * Continuation rungs beyond the dense core, up to the cosmic rung n≈293.
 * The exact Lucas census gives 42 stable rungs ≤ 293 (40 from 10 full mod-28
 * periods + n=281, 293), so rungs 19–42 = 24 continuation records. The prior
 * value 25 was a stale miscount (the engine's own CONTINUATION array holds 24).
 * [audit F2]
 */
export const CONTINUATION_COUNT = 24 as const;

// ─────────────────────────────────────────────────────────────────────────────
// B2 — Open postulates surfaced, never silently resolved (spec §0/B2).
// ─────────────────────────────────────────────────────────────────────────────

export const UNRESOLVED = {
  /**
   * Medium wave-speed form v_wave = c/√(ρ_I·κ·φ⁻ⁿᐟ²) is dimensionally incoherent:
   * ρ_I = ℓ_P⁻³φ⁻ⁿ is a NUMBER density [m⁻³]; κ is undefined (would need units of
   * mass). Disagrees with the canonical ladder form by 10⁻⁵² (n=1) → 10²⁴ (n=293).
   * Engine uses v_wave = c·φ⁻ⁿᐟ². Do NOT compute the medium form until κ is defined.
   */
  mediumWaveSpeed:
    "OPEN POSTULATE: v_wave = c/sqrt(rho_I * kappa * phi^(-n/2)) requires a defined κ (units of mass); dimensionally incoherent as written. Canonical form c·phi^(-n/2) is used. Do not compute.",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Provenance-tagged anchors (typed so tests can assert tags survive).
// ─────────────────────────────────────────────────────────────────────────────

const tag = <T>(value: T, provenance: Provenance, note?: string): Classified<T> =>
  note === undefined ? { value, provenance } : { value, provenance, note };

export const ANCHORS = {
  PHI: tag(PHI, "EXACT", "φ = (1+√5)/2"),
  PHI_NEG2: tag(PHI_NEG2, "EXACT", "λ = φ⁻² = (3−√5)/2, memory coupling"),
  PLANCK_LENGTH: tag(PLANCK_LENGTH, "CODATA", "ℓ_P = √(ℏG/c³), 2022 adjustment"),
  PLANCK_TIME: tag(PLANCK_TIME, "CODATA"),
  ALPHA_INV: tag(ALPHA_INV, "CODATA", "α⁻¹; φ-derived forms stay POSTULATE"),
  GOLDEN_DELAY_EPS: tag(GOLDEN_DELAY_EPS, "POSTULATE", "τ(n)=t_P·φⁿ(1+εn) form"),
  METATRON_SHELL_FLUX: tag(PHI_NEG26, "EXACT", "flux(13) = φ⁻²⁶"),
} as const;
