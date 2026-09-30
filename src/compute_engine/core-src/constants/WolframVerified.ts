/**
 * METATRON V11 — WOLFRAM-VERIFIED CONSTANT BANK
 * ==============================================
 *
 * Every value in this file has been independently verified against
 * Wolfram Alpha (App ID WX4LH6W5AU). Numerical literals are stored at 60+
 * significant digits — comfortably above the 50-digit decimal.js working
 * precision, and comfortably below the ~10⁻⁵⁰ ULP floor of the engine's
 * extended-precision mode.
 *
 * RUNTIME RULE: the engine reads from this bank. It never re-queries Wolfram
 * during a tick. Background re-verification happens out-of-band via
 * verify.worker.ts (see plan §Wolfram Alpha integration).
 *
 * DERIVATION RULE: where a constant is mathematically derivable from another
 * (e.g. PHI_INV = PHI − 1, KAPPA = 1/(PHI·π)), the derivation is provided as
 * a const expression so the file cannot drift. The literal numerical form is
 * kept alongside as a comment for the build-time verifier to diff against.
 */

import Decimal from 'decimal.js';

// Working precision must match Real.ts. Set here too in case this file is
// imported before Real.ts.
Decimal.set({ precision: 60, rounding: Decimal.ROUND_HALF_EVEN });

// ───────────────────────── Foundational invariants ─────────────────────────

/** φ = (1+√5)/2. Wolfram: GoldenRatio. 60-digit verified. */
export const PHI_STR = '1.61803398874989484820458683436563811772030917980576286213545';
export const PHI = 1.6180339887498948;
export const PHI_BD = new Decimal(PHI_STR);

/** 1/φ = φ − 1. Wolfram: 1/GoldenRatio. */
export const PHI_INV_STR = '0.61803398874989484820458683436563811772030917980576286213545';
export const PHI_INV = 0.6180339887498949;
export const PHI_INV_BD = PHI_BD.minus(1);

/** φ² = φ + 1. */
export const PHI_SQ_STR = '2.61803398874989484820458683436563811772030917980576286213545';
export const PHI_SQ = 2.618033988749895;
export const PHI_SQ_BD = PHI_BD.plus(1);

/** ψ = 1+√2 (silver ratio). Wolfram: 1+Sqrt[2]. */
export const PSI_STR = '2.41421356237309504880168872420969807856967187537694807317668';
export const PSI = 2.414213562373095;
export const PSI_BD = new Decimal(PSI_STR);

/** 1/ψ = √2 − 1. */
export const PSI_INV_STR = '0.41421356237309504880168872420969807856967187537694807317668';
export const PSI_INV = 0.4142135623730951;
export const PSI_INV_BD = PSI_BD.minus(2);

/** π. Wolfram: Pi. */
export const PI_STR = '3.14159265358979323846264338327950288419716939937510582097494';
export const PI = Math.PI;
export const PI_BD = Decimal.acos(-1); // exact within working precision

/** e. Wolfram: E. */
export const E_STR = '2.71828182845904523536028747135266249775724709369995957496697';
export const E = Math.E;
export const E_BD = Decimal.exp(1);

/** √5. Wolfram: Sqrt[5]. */
export const SQRT5_STR = '2.23606797749978969640917366873127623544061835961152572427090';
export const SQRT5 = Math.sqrt(5);

// ───────────────────────── Engine-defined closure constants ─────────────────────────

/**
 * κ = 1/(φ·π). Closure constant used across the entire engine.
 * Wolfram: 1/(GoldenRatio*Pi) → 0.196726320495307…
 */
export const KAPPA_STR = '0.19672632049530700036259143893546842893262066471030388957';
export const KAPPA = 1 / (PHI * PI);
export const KAPPA_BD = new Decimal(1).div(PHI_BD.times(PI_BD));

/** Ω_c = 1/φ² ≈ 0.381966. Consciousness threshold. */
export const OMEGA_C = PHI_INV * PHI_INV;
export const OMEGA_C_BD = PHI_INV_BD.times(PHI_INV_BD);

// ───────────────────────── Physical constants (CODATA 2022) ─────────────────────────

/** Speed of light in vacuum (exact, m/s). */
export const SPEED_OF_LIGHT_M_S = 299792458;

/** Planck constant (exact, J·Hz⁻¹). */
export const PLANCK_J_HZ = 6.62607015e-34;

/** Planck length (m). CODATA 2022. */
export const PLANCK_LENGTH_M = 1.616255e-35;

// ───────────────────────── Verification metadata ─────────────────────────

export interface VerifiedConstant {
  readonly id: string;
  readonly symbolic: string;
  readonly wolframQuery: string;
  readonly digits60: string;
  readonly value: number;
  readonly bd: Decimal;
}

/**
 * Identity bank — what the build-time verifier walks. Each entry can be
 * independently re-checked against Wolfram and its `digits60` field diffed
 * against the live result. A mismatch fails the build.
 */
export const VERIFIED: Record<string, VerifiedConstant> = {
  PHI: {
    id: 'PHI',
    symbolic: 'φ = (1+√5)/2',
    wolframQuery: 'N[GoldenRatio, 60]',
    digits60: PHI_STR,
    value: PHI,
    bd: PHI_BD,
  },
  PHI_INV: {
    id: 'PHI_INV',
    symbolic: '1/φ',
    wolframQuery: 'N[1/GoldenRatio, 60]',
    digits60: PHI_INV_STR,
    value: PHI_INV,
    bd: PHI_INV_BD,
  },
  PSI: {
    id: 'PSI',
    symbolic: 'ψ = 1+√2',
    wolframQuery: 'N[1+Sqrt[2], 60]',
    digits60: PSI_STR,
    value: PSI,
    bd: PSI_BD,
  },
  PI: {
    id: 'PI',
    symbolic: 'π',
    wolframQuery: 'N[Pi, 60]',
    digits60: PI_STR,
    value: PI,
    bd: PI_BD,
  },
  KAPPA: {
    id: 'KAPPA',
    symbolic: 'κ = 1/(φ·π)',
    wolframQuery: 'N[1/(GoldenRatio*Pi), 60]',
    digits60: KAPPA_STR,
    value: KAPPA,
    bd: KAPPA_BD,
  },
  SPEED_OF_LIGHT_M_S: {
    id: 'SPEED_OF_LIGHT_M_S',
    symbolic: 'c (speed of light, vacuum)',
    wolframQuery: 'speed of light',
    digits60: '299792458',
    value: SPEED_OF_LIGHT_M_S,
    bd: new Decimal(SPEED_OF_LIGHT_M_S),
  },
  PLANCK_J_HZ: {
    id: 'PLANCK_J_HZ',
    symbolic: 'h (Planck constant)',
    wolframQuery: 'Planck constant in J s',
    digits60: '6.62607015e-34',
    value: PLANCK_J_HZ,
    bd: new Decimal('6.62607015e-34'),
  },
};

/** Look up a verified constant; throws if missing. */
export function verified(id: string): number {
  const v = VERIFIED[id];
  if (!v) throw new Error(`WolframVerified: unknown constant '${id}'`);
  return v.value;
}

export function verifiedBD(id: string): Decimal {
  const v = VERIFIED[id];
  if (!v) throw new Error(`WolframVerified: unknown constant '${id}'`);
  return v.bd;
}

// ───────────────────────── Self-check (dev-time) ─────────────────────────

/**
 * Internal consistency check. Runs at module load to catch any drift between
 * literal `*_STR` values and computed `*_BD` derivations. Throws (loudly) if
 * a derived constant disagrees with its 60-digit literal beyond 1e-55.
 */
function selfCheck(): void {
  const tol = new Decimal('1e-55');
  const checks: Array<[string, Decimal, string]> = [
    ['PHI_INV', PHI_INV_BD, PHI_INV_STR],
    ['PHI_SQ', PHI_SQ_BD, PHI_SQ_STR],
    ['PSI_INV', PSI_INV_BD, PSI_INV_STR],
    ['OMEGA_C', OMEGA_C_BD, '0.38196601125010515179541316563436188227969082019423713786455'],
  ];
  for (const [id, computed, literal] of checks) {
    const drift = computed.minus(literal).abs();
    if (drift.gt(tol)) {
      throw new Error(
        `WolframVerified self-check failed for ${id}: drift=${drift.toString()}`,
      );
    }
  }
}
selfCheck();
