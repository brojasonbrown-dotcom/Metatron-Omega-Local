/**
 * core/gematria.ts — Track G: multi-base decimals, gematria invariants, Z[φ]
 * exact arithmetic, Zeckendorf addressing. (GEMATRIA_ENGINE_PLAN.md G1–G3.)
 *
 * Epistemic Status: [MATH] — every operator here is a proven theorem with a
 * Wolfram certificate (Cert 5.G1–G4) or an explicitly-labelled exploratory
 * signal. THE ONE LAW (plan G0): a digit pattern is DATA; a digit *meaning* is
 * NUMEROLOGY. This module computes the former and REFUSES the latter — there is
 * no API that turns a digit pattern into an asserted meaning (plan G5).
 *
 * What is implemented (each hardcodable, each gated):
 *   G1  multi-base expansion with exact rational remainder + the 3-tier
 *       precision ladder (EXACT Z[φ] / FLOAT / BIG), selected by magnitude.
 *   G2  digital root dr_b(n) = n mod (b−1)  [Cert 5.G1], digit-sum trajectory
 *       [Cert 5.G2], and the CRT residue-fingerprint (reversible hash).
 *   G3.1 Z[φ] exact ring {a,b} = a+bφ, closed under +,−,×, exact norm
 *       a²+ab−b²  [Cert 5.G3] — φ-arithmetic with ZERO drift below n=76.
 *   G3.2 Zeckendorf representation (unique non-consecutive Fibonacci sum)
 *       [Cert 5.G4] — a canonical, reversible, fractal addressing scheme.
 *
 * What is REFUSED by construction (plan G5 honesty table):
 *   · any "meaning"/"vibration" of a digit pattern;
 *   · gematria word-equivalence ("cat" ≡ "dog" via letter sum);
 *   · predicting events from digit roots.
 * These are not implemented and cannot be — no function here returns a meaning.
 */

import { PHI, PHI_EXACT_HORIZON } from "./constants.ts";

// ─────────────────────────────────────────────────────────────────────────────
// G1 — Multi-base expansion with exact remainder, and the precision ladder.
// ─────────────────────────────────────────────────────────────────────────────

/** The precision tier a magnitude is computed under (plan G1.2). */
export type PrecisionTier = "EXACT" | "FLOAT" | "BIG";

/**
 * The precision ladder (Cert 5.G6 / 4.D4): φⁿ is Float64-integer-exact for
 * n ≤ PHI_EXACT_HORIZON (76, since φ⁷⁶ < 2⁵³ < φ⁷⁷); φ^k overflows binary64 at
 * k ≈ 1435. Below the horizon we carry the EXACT Z[φ] tier (zero drift); above
 * it we use FLOAT (drift measured). "BIG" marks a magnitude that would need
 * arbitrary precision — flagged honestly, never silently rounded.
 */
export function precisionTier(phiPower: number): PrecisionTier {
  if (!Number.isFinite(phiPower)) {
    throw new RangeError(`precisionTier: power must be finite; got ${phiPower}.`);
  }
  const n = Math.abs(phiPower);
  if (n <= PHI_EXACT_HORIZON) return "EXACT";
  if (n <= 1435) return "FLOAT"; // PHI_OVERFLOW_HORIZON
  return "BIG";
}

/**
 * The greedy base-b expansion of x ≥ 0 to `digits` fractional digits, with the
 * EXACT rational remainder carried alongside so nothing is silently rounded.
 *
 * Returns the integer part, the `digits` fractional digits (each in [0,b)), and
 * the leftover remainder as a value in [0, b^-digits) — the honest "what's left
 * over" that a pure float expansion would hide. For a rational x the fractional
 * digits are eventually periodic; the period is a computable INVARIANT (a
 * feature, never a meaning — plan G1.1).
 */
export function baseExpand(
  x: number,
  base: number,
  digits: number,
): { integer: number; fraction: number[]; remainder: number } {
  if (!Number.isFinite(x) || x < 0) {
    throw new RangeError(`baseExpand: x must be finite ≥ 0; got ${x}.`);
  }
  if (!Number.isInteger(base) || base < 2 || base > 64) {
    throw new RangeError(`baseExpand: base must be an integer in [2,64]; got ${base}.`);
  }
  if (!Number.isInteger(digits) || digits < 0 || digits > 64) {
    throw new RangeError(`baseExpand: digits must be an integer in [0,64]; got ${digits}.`);
  }
  const integer = Math.floor(x);
  let rem = x - integer;
  const fraction: number[] = [];
  for (let i = 0; i < digits; i++) {
    rem *= base;
    const d = Math.floor(rem);
    fraction.push(d);
    rem -= d;
  }
  // rem is the leftover in [0, b^-digits): the exact residual after `digits`.
  const scale = Math.pow(base, digits);
  return { integer, fraction, remainder: rem / scale };
}

/**
 * Round-trip check: rebuild the value from its expansion + remainder and return
 * the absolute reconstruction error |x̂ − x|. ~0 to Float64 for well-scaled x —
 * the Gate-G1 "bit-exact within tier" measure.
 */
export function baseExpandRoundTripError(
  x: number,
  base: number,
  digits: number,
): number {
  const { integer, fraction, remainder } = baseExpand(x, base, digits);
  let acc = integer;
  let place = 1 / base;
  for (const d of fraction) {
    acc += d * place;
    place /= base;
  }
  acc += remainder; // carry the exact leftover back in
  return Math.abs(acc - x);
}

// ─────────────────────────────────────────────────────────────────────────────
// G2 — Gematria invariants (the rigorous part). Cert 5.G1 / 5.G2.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Digital root in base b:  dr_b(n) = ((n−1) mod (b−1)) + 1.
 *
 * THEOREM (Cert 5.G1): dr_b(n) ≡ n (mod b−1). A basis-independent residue
 * revealed by the base-b digits — cheap, deterministic, safe to hardcode. n is
 * a positive integer. This is DATA (a residue), never a meaning.
 */
export function digitalRoot(n: number, base: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`digitalRoot: n must be an integer ≥ 1; got ${n}.`);
  }
  if (!Number.isInteger(base) || base < 2 || base > 64) {
    throw new RangeError(`digitalRoot: base must be an integer in [2,64]; got ${base}.`);
  }
  return ((n - 1) % (base - 1)) + 1;
}

/**
 * Verify the Cert-5.G1 identity directly: dr_b(n) === n mod (b−1) (with the
 * dr= b−1 ↔ residue-0 convention). The Gate-G2 re-verification in TS.
 */
export function digitalRootMatchesResidue(n: number, base: number): boolean {
  const dr = digitalRoot(n, base);
  const residue = n % (base - 1);
  return dr === (residue === 0 ? base - 1 : residue);
}

/**
 * Digit-sum of n in base b (one step of the map n ↦ digitsum_b(n)). [Cert 5.G2]
 */
export function digitSum(n: number, base: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`digitSum: n must be an integer ≥ 0; got ${n}.`);
  }
  if (!Number.isInteger(base) || base < 2 || base > 64) {
    throw new RangeError(`digitSum: base must be an integer in [2,64]; got ${base}.`);
  }
  let sum = 0;
  let m = n;
  while (m > 0) {
    sum += m % base;
    m = Math.floor(m / base);
  }
  return sum;
}

/**
 * The digit-sum trajectory length: how many digit-sum steps until n collapses
 * to a single base-b digit (its fixed point, the digital root). Terminates in
 * O(log_b n) steps [Cert 5.G2]. The trajectory length and fixed point are
 * computable FEATURES; no meaning is attached to the fixed point (plan G2.2).
 */
export function digitSumTrajectory(n: number, base: number): {
  steps: number;
  fixedPoint: number;
} {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`digitSumTrajectory: n must be an integer ≥ 1; got ${n}.`);
  }
  let steps = 0;
  let m = n;
  while (m >= base) {
    m = digitSum(m, base);
    steps++;
  }
  return { steps, fixedPoint: m };
}

/**
 * The CRT residue-fingerprint of n across coprime-modulus bases (plan G2.3).
 * dr_b(n) = n mod (b−1), so the vector [dr_{b1}, dr_{b2}, …] is the residue of
 * n across the moduli (b₁−1, b₂−1, …). By the Chinese Remainder Theorem this
 * UNIQUELY identifies n mod lcm(b₁−1, b₂−1, …) — a rigorous, reversible hash.
 * The honest version of "gematria": an addressing/fingerprinting tool, never a
 * mystical one.
 */
export function residueFingerprint(n: number, bases: readonly number[]): number[] {
  return bases.map((b) => digitalRoot(n, b));
}

/**
 * The CRT modulus of a fingerprint: lcm(b₁−1, b₂−1, …). Below this, the
 * fingerprint is unique (Gate G2 asserts uniqueness below the modulus).
 */
export function fingerprintModulus(bases: readonly number[]): number {
  const gcd = (a: number, c: number): number => (c === 0 ? a : gcd(c, a % c));
  const lcm = (a: number, c: number) => (a / gcd(a, c)) * c;
  return bases.reduce((acc, b) => lcm(acc, b - 1), 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// G3.1 — Z[φ] exact ring. Cert 5.G3. The A8 "zero drift" tier.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * An element of Z[φ]:  {a, b}  represents  a + b·φ,  a,b ∈ ℤ.
 * Closed under +, −, × (because φ² = φ + 1). The multiplicative norm is
 * N(a + bφ) = a² + ab − b² (exact integer). Below the n=76 horizon this carries
 * φ-power ratios and coupling constants with ZERO drift, ever (plan G3.1).
 */
export interface ZPhi {
  readonly a: number; // integer coefficient of 1
  readonly b: number; // integer coefficient of φ
}

/** Construct a + bφ. Both must be integers (the ring is Z[φ], not Q(φ)). */
export function zphi(a: number, b: number): ZPhi {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new RangeError(`zphi: coefficients must be integers; got {${a}, ${b}}.`);
  }
  return Object.freeze({ a, b });
}

/** Addition: (a+bφ) + (c+dφ) = (a+c) + (b+d)φ. EXACT. */
export function zadd(x: ZPhi, y: ZPhi): ZPhi {
  return zphi(x.a + y.a, x.b + y.b);
}

/** Subtraction: (a+bφ) − (c+dφ) = (a−c) + (b−d)φ. EXACT. */
export function zsub(x: ZPhi, y: ZPhi): ZPhi {
  return zphi(x.a - y.a, x.b - y.b);
}

/**
 * Multiplication, using φ² = φ + 1 (the ring's defining relation):
 *   (a+bφ)(c+dφ) = ac + (ad+bc)φ + bd·φ² = (ac + bd) + (ad + bc + bd)φ.
 * EXACT — no rounding, ever. This is the zero-drift φ-arithmetic the plan's A8
 * asks for.
 */
export function zmul(x: ZPhi, y: ZPhi): ZPhi {
  const { a, b } = x;
  const { a: c, b: d } = y;
  return zphi(a * c + b * d, a * d + b * c + b * d);
}

/** The exact multiplicative norm  N(a+bφ) = a² + ab − b²  (an integer). */
export function znorm(x: ZPhi): number {
  const { a, b } = x;
  return a * a + a * b - b * b;
}

/**
 * Evaluate a + bφ to Float64 (for comparison/display only — the EXACT value is
 * the {a,b} pair; the float is a projection, clearly labelled as such).
 */
export function ztoFloat(x: ZPhi): number {
  return x.a + x.b * PHI;
}

/** φⁿ in Z[φ], EXACT for any n within the exact horizon (and beyond, until the
 *  integer coefficients overflow Float64 — flagged by precisionTier). φⁿ =
 *  Fₙ·φ + Fₙ₋₁ (Fibonacci), so this is zphi(F(n-1), F(n)) for n ≥ 1. */
export function zphiPow(n: number): ZPhi {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`zphiPow: n must be an integer ≥ 0; got ${n}.`);
  }
  // φ⁰ = 1 = {1,0}; φ¹ = φ = {0,1}; then multiply by φ = {0,1} n times.
  let result = zphi(1, 0);
  const phi = zphi(0, 1);
  for (let i = 0; i < n; i++) result = zmul(result, phi);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// G3.2 — Zeckendorf representation. Cert 5.G4. Fractal addressing.
// ─────────────────────────────────────────────────────────────────────────────

/** The Fibonacci numbers up to n, F₂=1, F₃=2, F₄=3, … (the Zeckendorf basis,
 *  no F₁=1 duplicate so the representation is unique). */
function fibsUpTo(n: number): number[] {
  const fibs: number[] = [];
  let a = 1; // F₂
  let b = 2; // F₃
  while (a <= n) {
    fibs.push(a);
    const next = a + b;
    a = b;
    b = next;
  }
  return fibs;
}

/**
 * Zeckendorf representation (Cert 5.G4): every positive integer n has a UNIQUE
 * sum of non-consecutive Fibonacci numbers (greedy works). Returns the Fibonacci
 * summands in DECREASING order. Canonical and reversible — a fractal addressing
 * scheme (the bit-string is self-similar), used to address memory slots and
 * concept ids (plan G3.2). DATA, never meaning.
 */
export function zeckendorf(n: number): number[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`zeckendorf: n must be an integer ≥ 1; got ${n}.`);
  }
  const fibs = fibsUpTo(n);
  const out: number[] = [];
  let rem = n;
  for (let i = fibs.length - 1; i >= 0 && rem > 0; i--) {
    const f = fibs[i]!;
    if (f <= rem) {
      out.push(f);
      rem -= f;
    }
  }
  return out;
}

/** Inverse of zeckendorf: sum the summands back to n. Exact round-trip. */
export function zeckendorfDecode(summands: readonly number[]): number {
  return summands.reduce((a, b) => a + b, 0);
}

/**
 * Zeckendorf uniqueness check for a claimed representation of n: the summands
 * must (a) sum to n, (b) each be a Fibonacci number (F₂=1,F₃=2,…), and (c) use
 * no two CONSECUTIVE Fibonacci indices. The Gate-G3 round-trip+uniqueness proof
 * relies on this predicate.
 */
export function isValidZeckendorf(n: number, summands: readonly number[]): boolean {
  if (summands.reduce((a, b) => a + b, 0) !== n) return false;
  const fibs = fibsUpTo(n);
  const indexOf = new Map(fibs.map((f, i) => [f, i]));
  let prevIndex = -2;
  for (const f of summands) {
    const idx = indexOf.get(f);
    if (idx === undefined) return false; // not a Fibonacci summand
    if (prevIndex >= 0 && idx === prevIndex - 1) return false; // consecutive
    prevIndex = idx;
  }
  return true;
}
