/**
 * METATRON V11 — COMPLEX NUMBER over Real
 * ========================================
 *
 * Complex z = a + bi where a, b are Real (mode 'f64' | 'bd').
 * Both components must share the same mode; mixing throws.
 *
 * Storage rationale: a struct of two Reals (not interleaved Float64Array) so
 * 'bd' mode is a first-class citizen. Hot loops over many complex values
 * should use the dedicated `ComplexBuffer` (interleaved Float64Array, f64-only)
 * defined here for cache locality.
 */

import { Real, RealMode, real, add, sub, mul, sqrt, atan2, lift } from './Real';

export interface Complex {
  readonly re: Real;
  readonly im: Real;
}

export function cplx(re: number | Real, im: number | Real, mode: RealMode = 'f64'): Complex {
  const r = typeof re === 'number' ? real(re, mode) : re;
  const i = typeof im === 'number' ? real(im, mode) : im;
  if (r.mode !== i.mode) {
    return { re: lift(r, 'bd'), im: lift(i, 'bd') };
  }
  return { re: r, im: i };
}

export const C_ZERO = cplx(0, 0);
export const C_ONE = cplx(1, 0);
export const C_I = cplx(0, 1);

export function cAdd(a: Complex, b: Complex): Complex {
  return { re: add(a.re, b.re), im: add(a.im, b.im) };
}

export function cSub(a: Complex, b: Complex): Complex {
  return { re: sub(a.re, b.re), im: sub(a.im, b.im) };
}

export function cMul(a: Complex, b: Complex): Complex {
  // (a+bi)(c+di) = (ac − bd) + (ad + bc)i
  const ac = mul(a.re, b.re);
  const bd = mul(a.im, b.im);
  const ad = mul(a.re, b.im);
  const bc = mul(a.im, b.re);
  return { re: sub(ac, bd), im: add(ad, bc) };
}

export function cAbs(a: Complex): Real {
  return sqrt(add(mul(a.re, a.re), mul(a.im, a.im)));
}

export function cArg(a: Complex): Real {
  return atan2(a.im, a.re);
}

// ───────────────────────── ComplexBuffer (hot path, f64) ─────────────────────────

/**
 * Interleaved Float64Array of complex values: [re0, im0, re1, im1, …].
 * Use for tight evolution loops where allocation pressure matters.
 * f64 only — promote to per-element Complex when entering 'bd' workflows.
 */
export class ComplexBuffer {
  readonly data: Float64Array;
  readonly n: number;

  constructor(n: number, init?: Float64Array) {
    this.n = n;
    if (init) {
      if (init.length !== n * 2) {
        throw new RangeError(`ComplexBuffer: init length ${init.length} != 2*n ${n * 2}`);
      }
      this.data = init;
    } else {
      this.data = new Float64Array(n * 2);
    }
  }

  re(i: number): number {
    return this.data[i * 2];
  }
  im(i: number): number {
    return this.data[i * 2 + 1];
  }
  set(i: number, re: number, im: number): void {
    this.data[i * 2] = re;
    this.data[i * 2 + 1] = im;
  }
  abs(i: number): number {
    const r = this.data[i * 2];
    const m = this.data[i * 2 + 1];
    return Math.sqrt(r * r + m * m);
  }
  absSq(i: number): number {
    const r = this.data[i * 2];
    const m = this.data[i * 2 + 1];
    return r * r + m * m;
  }

  clone(): ComplexBuffer {
    return new ComplexBuffer(this.n, new Float64Array(this.data));
  }

  /** L2 norm of the entire buffer. */
  norm(): number {
    let s = 0;
    const d = this.data;
    for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    return Math.sqrt(s);
  }
}
