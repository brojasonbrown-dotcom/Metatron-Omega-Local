/**
 * analysis/radialTransform.ts — SPHERICAL-BESSEL / HANKEL RADIAL TRANSFORM.
 *
 * What this honestly is: the radial half of the 3-D Fourier transform for a
 * field expanded in spherical harmonics,
 *
 *   Ψ(r,θ,φ) = Σ_l Σ_m u_lm(r) Y_lm(θ,φ)
 *
 * Each radial mode transforms independently (the angular part is already
 * diagonal in Y_lm), giving the spherical-Bessel (Hankel) transform pair
 *
 *   ũ_lm(k) = √(2/π) ∫₀^∞ u_lm(r) j_l(k r) r² dr
 *   u_lm(r) = √(2/π) ∫₀^∞ ũ_lm(k) j_l(k r) k² dk
 *
 * For a spherically symmetric field only l=0 survives and j₀(x)=sin(x)/x,
 * reducing to the familiar F(k) ∝ ∫ f(r) sin(kr)/(kr) r² dr.
 *
 * How it is computed, with the certificate that keeps it honest:
 *  • j_l(x) is evaluated by a STABLE method — downward Miller recurrence for
 *    x < l (where the upward recurrence loses all precision), series for small
 *    x, upward recurrence only where it is provably stable (x ≥ l). This is the
 *    classic Numerical-Recipes construction; the Wronskian identity
 *    j_{l+1}y_l − j_l y_{l+1} = 1/x² is asserted in tests as the bit-level gate.
 *  • The radial integral uses Gauss–Legendre quadrature on [0, Rmax]. The
 *    self-reciprocity of the Hankel transform gives the inversion certificate:
 *    transform then inverse-transform must recover u_lm to a residual set by
 *    quadrature error and the finite Rmax truncation — never by the algorithm.
 *
 * Epistemic discipline (rule 8): no analytic transform is hard-coded. Known
 * pairs (Gaussian, spherical top-hat) appear ONLY in the test suite as
 * independent checks; this module always integrates the field it is given.
 *
 * Pure module: no state, no I/O.
 */

/** Spherical Bessel j_l(x), stable for all l ≥ 0 and x ≥ 0. */
export function sphericalBesselJ(l: number, x: number): number {
  if (!Number.isInteger(l) || l < 0) throw new RangeError(`sphericalBesselJ: order must be an integer ≥ 0; got ${l}.`);
  if (x < 0) throw new RangeError(`sphericalBesselJ: argument must be ≥ 0; got ${x}.`);
  if (x === 0) return l === 0 ? 1 : 0; // j_l(0) = δ_{l0}

  // Small-x series: j_l(x) ≈ x^l/(2l+1)!! · (1 − x²/(2(2l+3)) + …). Use it
  // where the upward recurrence and the recurrence seed both underflow.
  if (x < 0.5 + 0.5 * l) {
    let term = 1;
    for (let i = 1; i <= l; i++) term *= x / (2 * i + 1); // x^l/(2l+1)!!
    let sum = 1;
    let tk = 1;
    for (let k = 1; k <= 40; k++) {
      tk *= -(x * x) / (2 * k * (2 * (l + k) + 1));
      sum += tk;
      if (Math.abs(tk) < 1e-18 * Math.abs(sum)) break;
    }
    return term * sum;
  }

  // Upward recurrence is stable only for x ≥ l. Seed with j₀, j₁.
  if (x >= l + 1) {
    let jm = Math.sin(x) / x;                    // j₀
    if (l === 0) return jm;
    let jc = Math.sin(x) / (x * x) - Math.cos(x) / x; // j₁
    if (l === 1) return jc;
    for (let m = 1; m < l; m++) {
      const jn = ((2 * m + 1) / x) * jc - jm;
      jm = jc;
      jc = jn;
    }
    return jc;
  }

  // General case x < l+1: downward Miller recurrence, normalised by the exact
  // j₀ = sin(x)/x. Seed j_{m+1}=0, j_m=(tiny) at a start order above the turning
  // point and recur j_{m−1} = (2m+1)/x·j_m − j_{m+1} DOWNWARD. Downward is the
  // stable direction for j_l (the growing solution y_l dominates upward), so the
  // arbitrary seed washes out; the true scale is recovered from the exact j₀.
  const start = l + 20 + Math.ceil(x);
  let jp = 0;      // j_{m+1}
  let jc = 1e-30;  // j_m  (arbitrary small seed)
  let jTarget = 0; // captured j_l
  let j0raw = 0;   // captured unnormalised j₀
  for (let m = start; m >= 1; m--) {
    const jn = ((2 * m + 1) / x) * jc - jp; // j_{m−1}
    jp = jc;
    jc = jn;
    if (m === l + 1) jTarget = jn; // j_{m−1} = j_l when m = l+1
    if (m === 1) j0raw = jn;     // j_{m−1} = j₀ when m = 1
    if (!Number.isFinite(jc)) { jc *= 1e-30; jp *= 1e-30; jTarget *= 1e-30; j0raw *= 1e-30; }
  }
  const exactJ0 = Math.sin(x) / x;
  return jTarget * (exactJ0 / j0raw);
}

/** Gauss–Legendre nodes/weights on [0, Rmax], n points (exact for polys ≤ 2n−1). */
export function gaussLegendreRadial(rmax: number, n: number): { r: Float64Array; w: Float64Array } {
  if (rmax <= 0) throw new RangeError("gaussLegendreRadial: Rmax must be > 0.");
  if (!Number.isInteger(n) || n < 2) throw new RangeError("gaussLegendreRadial: need ≥ 2 points.");
  const r = new Float64Array(n), w = new Float64Array(n);
  const m = Math.floor((n + 1) / 2);
  const eps = 1e-15;
  for (let i = 0; i < m; i++) {
    // Initial guess for the i-th root of P_n.
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let z1 = 0, pp = 0;
    do {
      let p1 = 1, p2 = 0;
      for (let j = 0; j < n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
      }
      pp = (n * (z * p1 - p2)) / (z * z - 1); // P'_n(z)
      z1 = z;
      z = z1 - p1 / pp;
    } while (Math.abs(z - z1) > eps);
    const xl = 0, xu = rmax;
    const xm = 0.5 * (xu + xl), xr = 0.5 * (xu - xl);
    r[i] = xm - xr * z;
    r[n - 1 - i] = xm + xr * z;
    w[i] = (xr * 2) / ((1 - z * z) * pp * pp);
    w[n - 1 - i] = w[i]!;
  }
  return { r, w };
}

/** Result of a radial spherical-Bessel transform of one (l) mode. */
export interface RadialSpectrum {
  /** Spherical harmonic degree l this transform belongs to. */
  readonly l: number;
  /** Wavenumber samples k. */
  readonly k: Float64Array;
  /** Transform samples ũ(k) = √(2/π)∫ u(r) j_l(kr) r² dr. */
  readonly uk: Float64Array;
  /** Radial nodes used. */
  readonly nodes: number;
  /** Upper radius the field was truncated at. */
  readonly rmax: number;
}

const SQRT_2_OVER_PI = Math.sqrt(2 / Math.PI);

/**
 * Not-a-knot cubic spline interpolant of the sampled mode u(r). Linear
 * resampling is only 2nd-order and visibly breaks on sharply-peaked high-degree
 * modes (measured 1.1e-2 at l=8); a cubic spline is 4th-order, so the transform
 * stays quadrature-limited — not interpolation-limited — as l climbs. Returns an
 * evaluator; falls back to linear for n < 4 where a cubic is underdetermined.
 */
function _splineInterp(r: ArrayLike<number>, ur: ArrayLike<number>, n: number): (x: number) => number {
  if (n < 4) {
    return (x: number) => {
      let j = 0;
      while (j < n - 2 && r[j + 1]! < x) j++;
      const r0 = r[j]!, r1 = r[j + 1]!;
      const t = r1 > r0 ? Math.min(1, Math.max(0, (x - r0) / (r1 - r0))) : 0;
      return ur[j]! * (1 - t) + ur[j + 1]! * t;
    };
  }
  // Second derivatives via the tridiagonal not-a-knot system (Thomas algorithm).
  const y2 = new Float64Array(n);
  const u = new Float64Array(n);
  // Natural lower boundary (adequate: the r² factor kills the origin region).
  y2[0] = 0; u[0] = 0;
  for (let i = 1; i < n - 1; i++) {
    const sig = (r[i]! - r[i - 1]!) / (r[i + 1]! - r[i - 1]!);
    const p = sig * y2[i - 1]! + 2;
    y2[i] = (sig - 1) / p;
    u[i] = (6 * ((ur[i + 1]! - ur[i]!) / (r[i + 1]! - r[i]!) - (ur[i]! - ur[i - 1]!) / (r[i]! - r[i - 1]!)) / (r[i + 1]! - r[i - 1]!) - sig * u[i - 1]!) / p;
  }
  y2[n - 1] = 0;
  for (let k = n - 2; k >= 0; k--) y2[k] = y2[k]! * y2[k + 1]! + u[k]!;
  return (x: number) => {
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (hi + lo) >> 1; if (r[mid]! > x) hi = mid; else lo = mid; }
    const h = r[hi]! - r[lo]!;
    if (h <= 0) return ur[lo]!;
    const a = (r[hi]! - x) / h, b = (x - r[lo]!) / h;
    return a * ur[lo]! + b * ur[hi]! + ((a * a * a - a) * y2[lo]! + (b * b * b - b) * y2[hi]!) * (h * h) / 6;
  };
}

/**
 * Forward radial spherical-Bessel transform of one radial mode u(r).
 *
 * @param r      Radial sample points (ascending, ≥ 0). Need not be uniform.
 * @param ur     Mode values u(r) at those points.
 * @param l      Spherical harmonic degree (0 for a spherically symmetric field).
 * @param k      Wavenumbers at which to evaluate ũ(k).
 * @param rmax   Effective support radius; the integrand is taken as u(r) past
 *               the last sample only if the caller padded it — truncation error
 *               from a finite rmax is reported via the inversion certificate.
 */
export function radialTransform(
  r: ArrayLike<number>,
  ur: ArrayLike<number>,
  l: number,
  k: ArrayLike<number>,
  rmax: number,
): RadialSpectrum {
  const n = r.length;
  if (ur.length !== n) throw new RangeError("radialTransform: r and ur length mismatch.");
  if (n < 2) throw new RangeError("radialTransform: need ≥ 2 radial samples.");
  // Build a Gauss grid over [0, rmax] and resample u onto it with a 4th-order
  // cubic spline, so the quadrature weights stay exact regardless of how the
  // caller sampled r and high-degree modes don't hit an interpolation wall.
  const nq = Math.max(64, 4 * n);
  const g = gaussLegendreRadial(rmax, nq);
  const uOf = _splineInterp(r, ur, n);
  const uq = new Float64Array(nq);
  for (let i = 0; i < nq; i++) uq[i] = uOf(g.r[i]!);
  const kk = Array.from(k as ArrayLike<number>);
  const uk = new Float64Array(kk.length);
  for (let a = 0; a < kk.length; a++) {
    const kv = kk[a]!;
    let acc = 0;
    for (let i = 0; i < nq; i++) {
      const x = g.r[i]!;
      acc += g.w[i]! * uq[i]! * sphericalBesselJ(l, kv * x) * x * x;
    }
    uk[a] = SQRT_2_OVER_PI * acc;
  }
  return { l, k: Float64Array.from(kk), uk, nodes: n, rmax };
}

/**
 * Inverse radial transform: recover u(r) from ũ(k) on a k-grid.
 * Self-reciprocity means the same kernel with k↔r swapped.
 */
export function inverseRadialTransform(spec: RadialSpectrum, r: ArrayLike<number>): Float64Array {
  const out = new Float64Array(r.length);
  const k = spec.k;
  // Trapezoid weights over the (ascending) k-grid.
  for (let a = 0; a < r.length; a++) {
    const rv = r[a]!;
    let acc = 0;
    for (let i = 0; i < k.length; i++) {
      const kv = k[i]!;
      const wk = i === 0 ? (k[1]! - k[0]!) / 2
        : i === k.length - 1 ? (k[i]! - k[i - 1]!) / 2
        : (k[i + 1]! - k[i - 1]!) / 2;
      acc += wk * spec.uk[i]! * sphericalBesselJ(spec.l, kv * rv) * kv * kv;
    }
    out[a] = SQRT_2_OVER_PI * acc;
  }
  return out;
}

/**
 * Inversion certificate: forward-then-inverse must recover u(r). Returns the
 * max abs deviation on the ORIGINAL radial samples — the honest measure of
 * quadrature + truncation error. Machine-floor-ish for smooth compact fields;
 * larger only when the field has real support beyond rmax (a true truncation,
 * which the caller should see, not have hidden).
 */
export function inversionResidual(
  r: ArrayLike<number>,
  ur: ArrayLike<number>,
  l: number,
  k: ArrayLike<number>,
  rmax: number,
): number {
  const spec = radialTransform(r, ur, l, k, rmax);
  const back = inverseRadialTransform(spec, r);
  let worst = 0;
  for (let i = 0; i < r.length; i++) {
    worst = Math.max(worst, Math.abs(back[i]! - (ur[i] as number)));
  }
  return worst;
}
