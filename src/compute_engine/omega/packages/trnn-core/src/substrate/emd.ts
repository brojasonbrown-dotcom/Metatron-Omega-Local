/**
 * emd — Ω-REAL M2 · S003: Empirical Mode Decomposition + Hilbert–Huang spectrum.
 *
 * The Hilbert transform (analytic signal) already lives in `signalStats.ts` as
 * `hilbertAnalytic`; this module supplies the missing decomposition that turns a
 * non-stationary series into a sum of intrinsic mode functions (IMFs), each of
 * which `hilbertAnalytic` then turns into an instantaneous amplitude and phase —
 * together, the Hilbert–Huang transform (S003).
 *
 * Sifting: repeatedly (1) find local extrema, (2) interpolate the upper/lower
 * envelopes through them with a natural cubic spline, (3) subtract the mean
 * envelope. An IMF is accepted once the mean envelope is negligible relative to
 * the candidate (bounded by a sift cap, so the loop can never spin).
 * Deterministic: no RNG, no clock; the spline solves a tridiagonal system via
 * the Thomas algorithm over exactly-specified IEEE ops, and the Hilbert phase is
 * wrapped through `dmath`'s deterministic `datan2`.
 *
 * DESIGN RULES (identical to the rest of the substrate):
 *   • abstain, never fabricate: below EMD_MIN_SAMPLES, a non-finite input, or
 *     a series with fewer than two extrema (no envelope → no IMF) abstains;
 *   • reuse, never reimplement: the Hilbert half is `hilbertAnalytic`, not a
 *     local copy.
 */

import { datan2, dcos, dsin } from '../core/dmath';
import { hilbertAnalytic } from './signalStats';

/** F9 floor, shared with the Level-2 correlation stack — an IMF is a claim. */
export const EMD_MIN_SAMPLES = 34;
/** Hard cap on sifting iterations per IMF (an envelope that never settles). */
export const EMD_MAX_SIFTS = 20;
/** Relative mean-envelope tolerance for accepting an IMF. */
export const EMD_IMF_TOL = 1e-6;

export interface EmdOptions {
  readonly maxImfs?: number;
  readonly tol?: number;
  readonly maxSifts?: number;
}

export interface EmdReport {
  readonly length: number;
  /** Intrinsic mode functions, highest-frequency first. */
  readonly imfs: readonly Float64Array[];
  /** What remains after every IMF is removed (monotone or near-constant). */
  readonly residual: Float64Array;
  /** Sift iterations consumed per IMF (auditability, not just the result). */
  readonly siftCounts: readonly number[];
  readonly abstained: boolean;
  readonly reason?: string;
}

export interface HhtComponent {
  readonly imf: Float64Array;
  /** Instantaneous amplitude |analytic|. */
  readonly amplitude: Float64Array;
  /** Instantaneous phase in radians. */
  readonly phase: Float64Array;
  /** Mean instantaneous frequency in cycles/sample, or null when unmeasurable. */
  readonly meanFrequency: number | null;
}

export interface HhtReport {
  readonly length: number;
  readonly imfs: readonly Float64Array[];
  readonly residual: Float64Array;
  readonly components: readonly HhtComponent[];
  readonly abstained: boolean;
  readonly reason?: string;
}

function extrema(x: Float64Array): { maxima: number[]; minima: number[] } {
  const maxima: number[] = [];
  const minima: number[] = [];
  for (let i = 1; i < x.length - 1; i++) {
    if (x[i] > x[i - 1] && x[i] > x[i + 1]) maxima.push(i);
    else if (x[i] < x[i - 1] && x[i] < x[i + 1]) minima.push(i);
  }
  return { maxima, minima };
}

function maxAbs(x: Float64Array): number {
  let m = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > m) m = a;
  }
  return m;
}

/** Natural-cubic-spline second derivatives (M[0] = M[m-1] = 0 by construction). */
function splineSecondDerivs(xs: number[], ys: number[]): Float64Array {
  const m = xs.length;
  const M = new Float64Array(m);
  const n = m - 2;
  if (n <= 0) return M; // two knots → linear interpolation (M stays 0)
  const h = new Float64Array(m - 1);
  for (let i = 0; i < m - 1; i++) h[i] = xs[i + 1] - xs[i];
  const diag = new Float64Array(n);
  const lower = new Float64Array(n - 1);
  const upper = new Float64Array(n - 1);
  const rhs = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const hp = h[k]; // h[i-1]
    const hn = h[k + 1]; // h[i]
    diag[k] = 2 * (hp + hn);
    rhs[k] = 6 * ((ys[k + 2] - ys[k + 1]) / hn - (ys[k + 1] - ys[k]) / hp);
    if (k > 0) lower[k - 1] = hp;
    if (k < n - 1) upper[k] = hn;
  }
  const u = thomas(lower, diag, upper, rhs);
  for (let k = 0; k < n; k++) M[k + 1] = u[k];
  return M;
}

function thomas(
  lower: Float64Array,
  diag: Float64Array,
  upper: Float64Array,
  rhs: Float64Array,
): Float64Array {
  const n = diag.length;
  const cp = new Float64Array(n);
  const dp = new Float64Array(n);
  cp[0] = upper[0] / diag[0];
  dp[0] = rhs[0] / diag[0];
  for (let i = 1; i < n; i++) {
    const den = diag[i] - lower[i - 1] * cp[i - 1];
    cp[i] = (i < n - 1 ? upper[i] : 0) / den;
    dp[i] = (rhs[i] - lower[i - 1] * dp[i - 1]) / den;
  }
  const x = new Float64Array(n);
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
  return x;
}

function splineEval(xs: number[], ys: number[], M: Float64Array, t: number): number {
  const m = xs.length;
  if (t <= xs[0]) return ys[0];
  if (t >= xs[m - 1]) return ys[m - 1];
  let i = 0;
  while (i < m - 2 && t > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i];
  const A = (xs[i + 1] - t) / h;
  const B = (t - xs[i]) / h;
  const c = ((A * A * A - A) * M[i] + (B * B * B - B) * M[i + 1]) * (h * h) / 6;
  return A * ys[i] + B * ys[i + 1] + c;
}

/** Envelope interpolated through the samples at `idx`, evaluated on [0, n). */
function envelope(x: Float64Array, idx: number[], n: number): Float64Array {
  const ys = idx.map((i) => x[i]);
  const M = splineSecondDerivs(idx, ys);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = splineEval(idx, ys, M, i);
  return out;
}

export function emd(x: ArrayLike<number>, opts: EmdOptions = {}): EmdReport {
  const n = x.length;
  const src = Float64Array.from(x as ArrayLike<number>);
  if (n < EMD_MIN_SAMPLES) {
    return { length: n, imfs: [], residual: src, siftCounts: [], abstained: true, reason: `need ${EMD_MIN_SAMPLES} samples, have ${n}` };
  }
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(src[i])) {
      return { length: n, imfs: [], residual: src, siftCounts: [], abstained: true, reason: 'non-finite sample' };
    }
  }

  const tol = opts.tol ?? EMD_IMF_TOL;
  const maxSifts = opts.maxSifts ?? EMD_MAX_SIFTS;
  const maxImfs = opts.maxImfs ?? Infinity;

  const r = Float64Array.from(src);
  const imfs: Float64Array[] = [];
  const siftCounts: number[] = [];

  while (imfs.length < maxImfs) {
    const { maxima, minima } = extrema(r);
    if (maxima.length < 2 || minima.length < 2) break;

    let h = Float64Array.from(r);
    let sifts = 0;
    for (sifts = 0; sifts < maxSifts; sifts++) {
      const { maxima: mx, minima: mn } = extrema(h);
      if (mx.length < 2 || mn.length < 2) break;
      const upper = envelope(h, mx, n);
      const lower = envelope(h, mn, n);
      let meanMax = 0;
      for (let i = 0; i < n; i++) {
        const m = (upper[i] + lower[i]) / 2;
        h[i] -= m;
        const a = Math.abs(m);
        if (a > meanMax) meanMax = a;
      }
      const scale = maxAbs(h);
      if (scale === 0 || meanMax <= tol * scale) break;
    }

    if (maxAbs(h) <= 1e-12) break; // flat — nothing left to decompose
    imfs.push(h);
    siftCounts.push(sifts);
    for (let i = 0; i < n; i++) r[i] -= h[i];
  }

  if (imfs.length === 0) {
    return { length: n, imfs, residual: r, siftCounts, abstained: true, reason: 'no IMF extracted (fewer than two extrema)' };
  }
  return { length: n, imfs, residual: r, siftCounts, abstained: false };
}

/** Unwrap phase in place, removing 2π jumps via the deterministic bank. */
function unwrap(phase: Float64Array): Float64Array {
  const out = new Float64Array(phase.length);
  out[0] = phase[0];
  for (let i = 1; i < phase.length; i++) {
    const d = phase[i] - phase[i - 1];
    out[i] = out[i - 1] + datan2(dsin(d), dcos(d));
  }
  return out;
}

/** Mean instantaneous frequency from unwrapped phase, cycles/sample. */
export function meanInstantaneousFrequency(phase: ArrayLike<number>, dt = 1): number | null {
  const n = phase.length;
  if (n < 3) return null;
  const u = unwrap(Float64Array.from(phase as ArrayLike<number>));
  let sum = 0;
  for (let i = 1; i < n - 1; i++) sum += (u[i + 1] - u[i - 1]) / (2 * dt);
  return sum / (n - 2) / (2 * Math.PI);
}

/** Full Hilbert–Huang transform: EMD, then per-IMF analytic envelope. */
export function hilbertHuang(x: ArrayLike<number>, opts: EmdOptions = {}): HhtReport {
  const e = emd(x, opts);
  if (e.abstained) {
    return { length: e.length, imfs: e.imfs, residual: e.residual, components: [], abstained: true, reason: e.reason };
  }
  const components: HhtComponent[] = e.imfs.map((imf) => {
    const an = hilbertAnalytic(imf);
    const amplitude = new Float64Array(imf.length);
    const phase = new Float64Array(imf.length);
    for (let i = 0; i < imf.length; i++) {
      const re = an.re[i];
      const im = an.im[i];
      amplitude[i] = Math.sqrt(re * re + im * im);
      phase[i] = datan2(im, re);
    }
    return { imf, amplitude, phase, meanFrequency: meanInstantaneousFrequency(phase) };
  });
  return { length: e.length, imfs: e.imfs, residual: e.residual, components, abstained: false };
}
