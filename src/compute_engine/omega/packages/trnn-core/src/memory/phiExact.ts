/**
 * phiExact — exact Z[φ] representation of φ-powers (Ω-REAL deep-precision layer).
 *
 * The engine's φ-mode basis uses amplitudes φ^-k. In float64 those collapse
 * below the half-ULP once k > 76 (empirically: 1 + φ^-76 ≠ 1, 1 + φ^-77 = 1;
 * φ^-77 ≈ 8.1e-17 < 2^-53). The older V11 engine addressed this with a decimal.js
 * 'bd' mode; this module rebuilds that capability WITHOUT a new dependency and
 * WITHOUT approximation.
 *
 * PRECISION ARCHITECTURE — three DISTINCT layers, do NOT merge them:
 *   1. phiExact (this module)     — EXACT Z[φ] arithmetic (BigInt). The live
 *                                   extended-precision tier; dependency-free.
 *   2. s6-wolfram-lock + fixture  — VERIFICATION: asserts the f64 constants equal
 *                                   the 60-digit Wolfram values. A lock, never a
 *                                   runtime source.
 *   3. core-src/constants/WolframVerified.ts (old V11) — a DECIMAL (decimal.js)
 *                                   bank, ~30× slower. Historical reference,
 *                                   NOT used by the certified engine.
 *
 * φ satisfies φ² = φ + 1, so every φ^k is EXACTLY a·φ + b with integer a, b:
 *
 *   φ^k  = F_k·φ + F_{k-1}                      (k ≥ 0)
 *   φ^-m = (-1)^(m+1)·F_m·φ + (-1)^m·F_{m+1}    (m > 0)
 *
 * BigInt Fibonacci keeps every coefficient exact to arbitrary depth, so deep
 * modes survive at full precision — the deterministic (L2) fix for the f64
 * floor. Observe-only: the hot path stays f64 (`phiPow` from core/constants).
 */

import { fibBig } from '../core/fibonacci';
import { phiPow } from '../core/constants';

/** An exact Z[φ] element a·φ + b (a, b BigInt). */
export interface PhiExact {
  /** coefficient of φ. */
  readonly a: bigint;
  /** constant term. */
  readonly b: bigint;
}

/** φ^k as an exact Z[φ] element, k any integer. */
export function phiPowExact(k: number): PhiExact {
  if (!Number.isInteger(k)) throw new RangeError(`phiPowExact: non-integer k ${k}`);
  if (k >= 0) {
    const a = fibBig(k);
    const b = k === 0 ? 1n : fibBig(k - 1); // F_{-1} = 1
    return { a, b };
  }
  const m = -k;
  const Fm = fibBig(m);
  const Fm1 = fibBig(m + 1);
  // φ^-m = (-1)^(m+1)·F_m·φ + (-1)^m·F_{m+1}
  return { a: (m % 2 === 1 ? 1n : -1n) * Fm, b: (m % 2 === 0 ? 1n : -1n) * Fm1 };
}

/** Exact Z[φ] product, reduced by φ² = φ + 1. Deterministic, lossless. */
export function phiMulExact(x: PhiExact, y: PhiExact): PhiExact {
  // (aφ+b)(cφ+d) = ac·φ² + (ad+bc)·φ + bd = (ac+ad+bc)·φ + (ac+bd)
  return { a: x.a * y.a + x.a * y.b + x.b * y.a, b: x.a * y.a + x.b * y.b };
}

/** Exact Z[φ] element → float64 (lossy; the hot path only). */
export function phiExactToF64(x: PhiExact): number {
  return Number(x.a) * 1.6180339887498949 + Number(x.b);
}

/** Whether a φ-mode at index k survives float64 (|φ^-k| above the ULP of 1). */
export function phiModeSurvivesF64(k: number): boolean {
  return Math.abs(k) <= PHI_F64_MODE_CEILING;
}

/**
 * Required working decimal digits to keep φ^-M above the float64 ULP plus a
 * 16-digit safety margin: digits ≥ ⌈M·log10(φ)⌉ + 16 = ⌈0.20899·M⌉ + 16.
 * Rebuilt from the V11 ResourceGovernor.requiredDigits (same formula).
 */
export function requiredDigits(M: number): number {
  return Math.ceil(0.2089876402499087 * Math.max(0, M)) + 16;
}

/** Honest f64 mode ceiling: the largest k whose φ^-k survives in a superposition
 *  with a unit term (empirically: 1 + φ^-76 ≠ 1, 1 + φ^-77 = 1). */
export const PHI_F64_MODE_CEILING = 76;

/** Inverse of requiredDigits: largest mode count M whose φ^-M stays above ULP at
 *  `digits` working precision (plus the 16-digit safety margin). */
export function precisionCeiling(digits: number): number {
  return Math.max(1, Math.floor((Math.max(16, digits) - 16) / 0.2089876402499087));
}

/** Validate a mode count against a working precision. Honest refusal (never a
 *  fabricated value) when M would push the deepest φ-mode below the ULP. */
export function validateModeCount(M: number, digits: number): { ok: boolean; requiredDigits: number; reason?: string } {
  const need = requiredDigits(M);
  if (digits < need) {
    return { ok: false, requiredDigits: need, reason: `M=${M} needs ${need} digits; ${digits} provided → φ-mode collapse` };
  }
  return { ok: true, requiredDigits: need };
}

/** f64 φ^k (the hot-path value; lossy for |k| > 78). */
export { phiPow as phiPowF64 };
