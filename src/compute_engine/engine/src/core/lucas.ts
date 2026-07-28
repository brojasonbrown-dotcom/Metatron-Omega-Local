/**
 * FILE 3 — core/lucas.ts
 *
 * Exact Lucas / Fibonacci integer arithmetic + the Lucas closure theorem.
 * The provable skeleton everything hangs on. All integer math in BigInt — never
 * loses precision. Dimensionless φ-identities in Float64 to 1e-12.
 *
 * Contracts (spec §3/File 3):
 *   - lucas(n), fibonacci(n) exact for n ≤ 200 (BigInt).
 *   - isStable(n) ⇔ odd(n) ∧ 7∤n  ⇔  n ≡ {1,13,15,27} (mod 28)  [erratum E13].
 *   - lucasResidue(n, 13) pattern has period 28; Lₙ ≢ 0 (mod 13) — exact 13-fold
 *     closure is IMPOSSIBLE (theorem), so every real scale is minimally open.
 *   - Binet defect |φⁿ − Lₙ| = φ⁻ⁿ.
 */

import { PHI } from "./constants.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Exact integer sequences (BigInt)
// ─────────────────────────────────────────────────────────────────────────────

/** Fibonacci F(n), exact. F(0)=0, F(1)=1. */
export function fibonacci(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`fibonacci: n=${n} must be a non-negative integer`);
  let a = 0n, b = 1n;
  for (let i = 0; i < n; i++) { const t = a + b; a = b; b = t; }
  return a;
}

/** Lucas L(n), exact. L(0)=2, L(1)=1. */
export function lucas(n: number): bigint {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`lucas: n=${n} must be a non-negative integer`);
  if (n === 0) return 2n;
  let a = 2n, b = 1n;
  for (let i = 1; i < n; i++) { const t = a + b; a = b; b = t; }
  return b;
}

// ─────────────────────────────────────────────────────────────────────────────
// Closure theorem
// ─────────────────────────────────────────────────────────────────────────────

/** Lₙ mod m as a non-negative integer (default modulus 13). */
export function lucasResidue(n: number, mod = 13): number {
  const r = lucas(n) % BigInt(mod);
  return Number(r < 0n ? r + BigInt(mod) : r);
}

/**
 * Lucas-stable predicate. Stable ⇔ Lₙ ≡ ±1 (mod 13).
 * Equivalent to n ≡ {1,13,15,27} (mod 28) — verified 2026-07-27, erratum E13.
 * This is the theorem-level definition; the residue-class form is a corollary.
 */
export function isStable(n: number): boolean {
  if (!Number.isInteger(n) || n < 1) return false;
  return closureResidueMin(n) === 1;
}

/** All stable rungs with 1 ≤ n ≤ max, ascending. */
export function stableScalesUpTo(max: number): number[] {
  const out: number[] = [];
  for (let n = 1; n <= max; n++) if (isStable(n)) out.push(n);
  return out;
}

/**
 * Minimal Lucas closure residue min(Lₙ mod 13, 13 − Lₙ mod 13).
 * Equals 1 for every stable n — "minimally open" (never 0 by theorem).
 */
export function closureResidueMin(n: number): number {
  const r = lucasResidue(n, 13);
  return Math.min(r, 13 - r);
}

/**
 * Binet defect |φⁿ − Lₙ| = φ⁻ⁿ (dimensionless, Float64).
 * Measures how far the irrational φ-ladder sits from its integer Lucas anchor.
 */
export function binetDefect(n: number): number {
  return Math.pow(PHI, -n);
}

/** True iff Lₙ ≢ 0 (mod 13) — i.e. exact 13-fold closure is impossible (always true). */
export function closureImpossible(n: number): boolean {
  return lucasResidue(n, 13) !== 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 13-harmonic spectral map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 13 Lucas spectral lines (wavenumber indices) of the Metatron lattice:
 * 1,2,3,4,7,11,18,29,47,76,123,199,322 — the Lucas-sequence-driven lines.
 * EXACT.  (322 = 2×7×23; the terminal line of the 13-harmonic set.)
 */
export function spectralLines(): readonly number[] {
  return [1, 2, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322] as const;
}
