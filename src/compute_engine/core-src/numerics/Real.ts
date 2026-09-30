/**
 * METATRON V11 — UNIFIED REAL NUMBER (Float64 fast-path + BigDecimal extended)
 * ============================================================================
 *
 * Two precision modes share one API:
 *   - 'f64' : native IEEE-754 double. ULP ≈ 2.22e-16. Fastest.
 *   - 'bd'  : decimal.js BigDecimal at configurable precision (default 50 sig digits).
 *             ULP ≈ 1e-50. ~30× slower; honest resolution well past φ⁻²³² (≈ 2e-49).
 *
 * Why both: the engine's φ-mode basis collapses to φ⁻ᵏ for k > driverCount.
 * Float64 saturates at M ≈ 233. Extended precision lifts the honest ceiling
 * toward M ≈ 610 (F₁₅) — this matches the documented floor in the source
 * project's AutoScaler.ts (φ⁻²³² already < float64 ULP).
 *
 * Zero mock. Every operation is the real numerical operation in the chosen mode.
 */

import Decimal from 'decimal.js';

// Working precision is now DYNAMIC. Default 60 digits (covers M ≈ 210
// honestly). The engine raises it via setWorkingPrecision(requiredDigits(M))
// before promotion, so φ⁻ᴹ stays strictly above ULP at any M. There is no
// fundamental cap — cost scales O(d log d) per multiply.
Decimal.set({ precision: 60, rounding: Decimal.ROUND_HALF_EVEN });

/** Raise (or lower) the global BigDecimal working precision. */
export function setWorkingPrecision(digits: number): void {
  const d = Math.max(16, Math.floor(digits));
  Decimal.set({ precision: d, rounding: Decimal.ROUND_HALF_EVEN });
}

/** Current global BigDecimal working precision. */
export function getWorkingPrecision(): number {
  return Decimal.precision;
}

export type RealMode = 'f64' | 'bd';

export interface Real {
  readonly mode: RealMode;
  /** f64 representation. Lossy in 'bd' mode but always defined. */
  readonly f: number;
  /** BigDecimal representation. Present only in 'bd' mode. */
  readonly d?: Decimal;
}

// ───────────────────────── construction ─────────────────────────

export function real(x: number | string | Decimal, mode: RealMode = 'f64'): Real {
  if (mode === 'f64') {
    const f = typeof x === 'number' ? x : Number(x.toString());
    return { mode, f };
  }
  const d = x instanceof Decimal ? x : new Decimal(x);
  return { mode, f: Number(d.toString()), d };
}

export function lift(r: Real, mode: RealMode): Real {
  if (r.mode === mode) return r;
  if (mode === 'bd') return real(r.f.toString(), 'bd');
  return real(r.f, 'f64');
}

/** Coerce two Reals to the higher precision of the two ('bd' wins). */
function coerce(a: Real, b: Real): { a: Real; b: Real; mode: RealMode } {
  if (a.mode === 'bd' || b.mode === 'bd') {
    return { a: lift(a, 'bd'), b: lift(b, 'bd'), mode: 'bd' };
  }
  return { a, b, mode: 'f64' };
}

// ───────────────────────── arithmetic ─────────────────────────

export function add(a: Real, b: Real): Real {
  const c = coerce(a, b);
  return c.mode === 'f64' ? real(c.a.f + c.b.f) : real(c.a.d!.plus(c.b.d!), 'bd');
}

export function sub(a: Real, b: Real): Real {
  const c = coerce(a, b);
  return c.mode === 'f64' ? real(c.a.f - c.b.f) : real(c.a.d!.minus(c.b.d!), 'bd');
}

export function mul(a: Real, b: Real): Real {
  const c = coerce(a, b);
  return c.mode === 'f64' ? real(c.a.f * c.b.f) : real(c.a.d!.times(c.b.d!), 'bd');
}

export function div(a: Real, b: Real): Real {
  const c = coerce(a, b);
  return c.mode === 'f64' ? real(c.a.f / c.b.f) : real(c.a.d!.div(c.b.d!), 'bd');
}

export function neg(a: Real): Real {
  return a.mode === 'f64' ? real(-a.f) : real(a.d!.neg(), 'bd');
}

export function abs(a: Real): Real {
  return a.mode === 'f64' ? real(Math.abs(a.f)) : real(a.d!.abs(), 'bd');
}

export function pow(a: Real, n: number): Real {
  return a.mode === 'f64' ? real(Math.pow(a.f, n)) : real(a.d!.pow(n), 'bd');
}

export function sqrt(a: Real): Real {
  return a.mode === 'f64' ? real(Math.sqrt(a.f)) : real(a.d!.sqrt(), 'bd');
}

export function ln(a: Real): Real {
  return a.mode === 'f64' ? real(Math.log(a.f)) : real(a.d!.ln(), 'bd');
}

export function exp(a: Real): Real {
  return a.mode === 'f64' ? real(Math.exp(a.f)) : real(a.d!.exp(), 'bd');
}

// Trig stays f64 in 'bd' mode for now (decimal.js trig requires extra setup).
// Engine call sites that need bd-precision trig will register a polynomial.
export function sin(a: Real): Real {
  return real(Math.sin(a.f));
}
export function cos(a: Real): Real {
  return real(Math.cos(a.f));
}
export function atan2(y: Real, x: Real): Real {
  return real(Math.atan2(y.f, x.f));
}

// ───────────────────────── comparison ─────────────────────────

export function eq(a: Real, b: Real, tol: number = 0): boolean {
  const c = coerce(a, b);
  if (c.mode === 'f64') return Math.abs(c.a.f - c.b.f) <= tol;
  return c.a.d!.minus(c.b.d!).abs().lte(tol);
}

export function lt(a: Real, b: Real): boolean {
  const c = coerce(a, b);
  return c.mode === 'f64' ? c.a.f < c.b.f : c.a.d!.lt(c.b.d!);
}

// ───────────────────────── constants ─────────────────────────

export const ZERO_F64 = real(0);
export const ONE_F64 = real(1);
export const TWO_F64 = real(2);

export const ZERO_BD = real('0', 'bd');
export const ONE_BD = real('1', 'bd');

/** Ulp floor for a given mode — the smallest representable relative error. */
export function ulpFloor(mode: RealMode): number {
  return mode === 'f64' ? 2.220446049250313e-16 : Math.pow(10, -getWorkingPrecision());
}

export { Decimal };
