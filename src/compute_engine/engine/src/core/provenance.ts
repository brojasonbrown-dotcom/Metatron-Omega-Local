/**
 * FILE 2 — core/provenance.ts  (includes core/scaled.ts per spec §0/B1)
 *
 * Two coupled responsibilities, one file (per the user's no-file-proliferation rule):
 *   1. The epistemic type system — Provenance + Classified<T>. The "no mistakes"
 *      firewall: a value cannot shed its POSTULATE taint silently.
 *   2. Scaled — arbitrary-magnitude arithmetic (mantissa + base-10 exponent) so
 *      ρ_I ~ 10¹⁰⁴ and δx ~ 10⁻⁶¹ and products like ρ_I·δx³ never overflow Float64.
 *
 * Contracts (spec §3/File 2):
 *   - Scaled.mul adds exponents exactly; mantissa renormalized to [1,10).
 *   - Scaled.add aligns exponents; if alignment would flush the smaller addend to
 *     zero in Float64 (|Δexp| > 15), the result is documented as approximate.
 *   - Classified provenance never widens silently: the tainted (least-certain)
 *     provenance of the operands propagates to the result.
 *   - toFloat64 throws when |exp10| > 308 (would overflow/underflow).
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Epistemic type system
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Epistemic status of a value.
 *   EXACT     — mathematical identity (φ, φ⁻², Lucas numbers).
 *   CODATA    — measured physical constant (ℓ_P, α⁻¹).
 *   MEASURED  — engine-measured quantity at runtime.
 *   POSTULATE — framework assumption, ablation-ready (R/r=φ, λ=φ⁻² as physics).
 */
export type Provenance = "EXACT" | "CODATA" | "MEASURED" | "POSTULATE";

/** Certainty ranking; higher index = less certain = "tainted". Propagates max. */
const RANK: Record<Provenance, number> = {
  EXACT: 0,
  CODATA: 1,
  MEASURED: 2,
  POSTULATE: 3,
};

/** A value carrying its provenance (and optional uncertainty / note). */
export interface Classified<T> {
  readonly value: T;
  readonly provenance: Provenance;
  readonly uncertainty?: number;
  readonly note?: string;
}

/** Tag a value. */
export const classify = <T>(
  value: T,
  provenance: Provenance,
  uncertainty?: number,
  note?: string,
): Classified<T> => ({
  value,
  provenance,
  ...(uncertainty === undefined ? {} : { uncertainty }),
  ...(note === undefined ? {} : { note }),
});

/** The least-certain provenance among inputs — the propagated taint. */
export const tainted = (...ps: Provenance[]): Provenance =>
  ps.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "EXACT" as Provenance);

/** Combine two classified values, propagating the tainted provenance. */
export const combine = <A, B, R>(
  a: Classified<A>,
  b: Classified<B>,
  f: (a: A, b: B) => R,
  note?: string,
): Classified<R> => ({
  value: f(a.value, b.value),
  provenance: tainted(a.provenance, b.provenance),
  ...(note === undefined ? {} : { note }),
});

/** Map over a classified value; provenance is preserved (never silently widened). */
export const cmap = <A, R>(c: Classified<A>, f: (a: A) => R): Classified<R> => ({
  value: f(c.value),
  provenance: c.provenance,
  ...(c.uncertainty === undefined ? {} : { uncertainty: c.uncertainty }),
  ...(c.note === undefined ? {} : { note: c.note }),
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Scaled — arbitrary-magnitude arithmetic (mantissa + base-10 exponent)
// ─────────────────────────────────────────────────────────────────────────────

/** Largest |exp10| that round-trips through Float64 without overflow/underflow. */
const MAX_EXP = 308;
/** Decimal digits of Float64 precision; beyond this exponent gap, addends decouple. */
const FLOAT64_DIGITS = 15;

/**
 * Scientific-notation number: value = mantissa × 10^exp10, mantissa ∈ [1,10) or 0.
 * Keeps the ladder computable where raw SI would overflow Float64.
 */
export class Scaled {
  readonly mantissa: number;
  readonly exp10: number;

  private constructor(mantissa: number, exp10: number) {
    this.mantissa = mantissa;
    this.exp10 = exp10;
  }

  /** Construct from any finite number, normalized. */
  static from(x: number): Scaled {
    if (!Number.isFinite(x)) throw new RangeError(`Scaled.from: non-finite ${x}`);
    if (x === 0) return new Scaled(0, 0);
    const exp = Math.floor(Math.log10(Math.abs(x)));
    let m = x / 10 ** exp;
    // Correct the rare |m| ∉ [1,10) from Float64 log10 round-off.
    if (Math.abs(m) >= 10) { m /= 10; return new Scaled(m, exp + 1); }
    if (Math.abs(m) < 1) { m *= 10; return new Scaled(m, exp - 1); }
    return new Scaled(m, exp);
  }

  /** Construct from explicit parts; normalizes. */
  static of(mantissa: number, exp10: number): Scaled {
    if (mantissa === 0) return new Scaled(0, 0);
    const s = Scaled.from(mantissa);
    return new Scaled(s.mantissa, s.exp10 + Math.trunc(exp10));
  }

  /** Zero. */
  static zero(): Scaled {
    return new Scaled(0, 0);
  }

  /** φ^k as a Scaled — exact in the exponent, Float64 mantissa. */
  static phiPow(k: number, PHI: number): Scaled {
    return Scaled.from(Math.pow(PHI, k));
  }

  /** Normalize so mantissa ∈ [1,10) (or exactly 0). Returns a fresh Scaled. */
  normalize(): Scaled {
    return Scaled.of(this.mantissa, this.exp10);
  }

  isZero(): boolean {
    return this.mantissa === 0;
  }

  /** this × other — exponents add exactly; cannot overflow. */
  mul(o: Scaled): Scaled {
    if (this.isZero() || o.isZero()) return Scaled.zero();
    return Scaled.of(this.mantissa * o.mantissa, this.exp10 + o.exp10);
  }

  /** this / other — exponents subtract exactly. */
  div(o: Scaled): Scaled {
    if (o.isZero()) throw new RangeError("Scaled.div: division by zero");
    if (this.isZero()) return Scaled.zero();
    return Scaled.of(this.mantissa / o.mantissa, this.exp10 - o.exp10);
  }

  /** this^k for integer k — exponent scales exactly. */
  pow(k: number): Scaled {
    if (!Number.isInteger(k)) throw new RangeError(`Scaled.pow: non-integer ${k}`);
    if (k === 0) return Scaled.from(1);
    if (this.isZero()) return Scaled.zero();
    return Scaled.of(Math.pow(this.mantissa, k), this.exp10 * k);
  }

  /** √this. */
  sqrt(): Scaled {
    if (this.mantissa < 0) throw new RangeError("Scaled.sqrt: negative");
    if (this.isZero()) return Scaled.zero();
    // Split parity so the exponent stays integer: √(m·10^e) = √(m·10^(e mod 2))·10^((e−(e mod 2))/2)
    const parity = ((this.exp10 % 2) + 2) % 2;
    const m = this.mantissa * 10 ** parity;
    return Scaled.of(Math.sqrt(m), (this.exp10 - parity) / 2);
  }

  /**
   * this + other. If the exponent gap exceeds Float64 precision, the smaller
   * addend is lost in Float64 — the result is the larger operand, and the caller
   * should treat the sum as approximate (documented per spec).
   */
  add(o: Scaled): Scaled {
    if (this.isZero()) return o;
    if (o.isZero()) return this;
    const hi = this.exp10 >= o.exp10 ? this : o;
    const lo = this.exp10 >= o.exp10 ? o : this;
    const gap = hi.exp10 - lo.exp10;
    if (gap > FLOAT64_DIGITS) return hi; // smaller addend decouples in Float64
    const m = hi.mantissa + lo.mantissa / 10 ** gap;
    return Scaled.of(m, hi.exp10);
  }

  /** this − other. */
  sub(o: Scaled): Scaled {
    return this.add(Scaled.of(-o.mantissa, o.exp10));
  }

  /** Sign-aware comparison: −1, 0, +1. */
  compare(o: Scaled): number {
    if (this.isZero() && o.isZero()) return 0;
    const sa = Math.sign(this.mantissa), sb = Math.sign(o.mantissa);
    if (sa !== sb) return sa - sb;
    if (this.exp10 !== o.exp10) return sa * (this.exp10 - o.exp10 > 0 ? 1 : -1);
    return sa * Math.sign(this.mantissa - o.mantissa);
  }

  /** Exact equality of (mantissa, exp10) after normalization. */
  equals(o: Scaled): boolean {
    const a = this.normalize();
    const b = o.normalize();
    return a.mantissa === b.mantissa && a.exp10 === b.exp10;
  }

  /**
   * Collapse to Float64. Throws if the magnitude cannot be represented
   * (|exp10| > 308) — by design, per spec: overflow is surfaced, never silent.
   */
  toFloat64(): number {
    if (this.isZero()) return 0;
    if (Math.abs(this.exp10) > MAX_EXP) {
      throw new RangeError(
        `Scaled.toFloat64: |exp10|=${this.exp10} exceeds ${MAX_EXP}; value would over/underflow Float64`,
      );
    }
    return this.mantissa * 10 ** this.exp10;
  }

  /** Like toFloat64 but returns null instead of throwing when unrepresentable. */
  toFloat64OrNull(): number | null {
    try {
      return this.toFloat64();
    } catch {
      return null;
    }
  }

  toString(): string {
    if (this.isZero()) return "0";
    return `${this.mantissa}e${this.exp10 >= 0 ? "+" : ""}${this.exp10}`;
  }
}
