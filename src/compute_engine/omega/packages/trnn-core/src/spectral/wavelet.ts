/**
 * wavelet — Ω-REAL M2 · S002: orthonormal Discrete Wavelet Transform.
 *
 * The FFT is the right lens for a signal whose frequency content is stationary.
 * The field's telemetry is not: coherence/energy rings carry transients (a rung
 * warming up, a chord firing, an injection landing) that the Fourier basis
 * smears across every bin. The DWT localises those transients in both time and
 * scale — the missing S002 half of the spectral column.
 *
 * Two orthonormal kernels, both deterministic and Parseval-exact:
 *   Haar          — 2-tap box; the simplest orthonormal wavelet, exact on steps.
 *   Daubechies-4  — 4-tap, compact support; its low-pass kills linear trend
 *                   within a level, the workhorse for piecewise-smooth telemetry.
 *
 * DESIGN RULES (identical to the rest of the substrate):
 *   • deterministic: every filter coefficient is a closed form over Math.sqrt
 *     (an exactly-specified IEEE op), never a libm transcendental — the same
 *     input gives the same bits on every engine;
 *   • abstain, never fabricate: fewer samples than the kernel's tap count, an
 *     odd-length window, or a non-finite sample yields an abstained report —
 *     never a zeroed level;
 *   • orthonormal: each level preserves energy exactly, so the test asserts
 *     Parseval instead of eyeballing coefficients.
 */

export type WaveletKind = 'haar' | 'db4';

export interface WaveletLevel {
  readonly level: number;
  readonly approx: Float64Array;
  readonly detail: Float64Array;
}

export interface WaveletOptions {
  readonly kind?: WaveletKind;
  readonly levels?: number;
}

export interface WaveletReport {
  readonly kind: WaveletKind;
  readonly length: number;
  readonly levels: readonly WaveletLevel[];
  readonly abstained: boolean;
  readonly reason?: string;
}

export const WAVELET_HAAR_MIN = 2;
export const WAVELET_DB4_MIN = 4;

const INV_SQRT2 = 1 / Math.sqrt(2);

function haarLevel(a: Float64Array): { approx: Float64Array; detail: Float64Array } {
  const m = a.length >> 1;
  const approx = new Float64Array(m);
  const detail = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const x0 = a[2 * i];
    const x1 = a[2 * i + 1];
    approx[i] = (x0 + x1) * INV_SQRT2;
    detail[i] = (x0 - x1) * INV_SQRT2;
  }
  return { approx, detail };
}

// Daubechies-4 orthonormal filter bank (scaling H, wavelet G = reversed H with
// alternating signs). √3 and √2 are algebraic — computed via the exactly
// specified Math.sqrt, not a libm transcendental.
const SQ3 = Math.sqrt(3);
const K4 = 1 / (4 * Math.sqrt(2));
const H0 = (1 + SQ3) * K4;
const H1 = (3 + SQ3) * K4;
const H2 = (3 - SQ3) * K4;
const H3 = (1 - SQ3) * K4;
const G0 = H3;
const G1 = -H2;
const G2 = H1;
const G3 = -H0;

function db4Level(a: Float64Array): { approx: Float64Array; detail: Float64Array } {
  const n = a.length;
  const m = n >> 1;
  const approx = new Float64Array(m);
  const detail = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    const i0 = (2 * k) % n;
    const i1 = (2 * k + 1) % n;
    const i2 = (2 * k + 2) % n;
    const i3 = (2 * k + 3) % n;
    approx[k] = H0 * a[i0] + H1 * a[i1] + H2 * a[i2] + H3 * a[i3];
    detail[k] = G0 * a[i0] + G1 * a[i1] + G2 * a[i2] + G3 * a[i3];
  }
  return { approx, detail };
}

/**
 * Multi-level DWT. `levels` caps the decomposition depth; by default it runs
 * until the approximation is too short (or odd) to split again. Levels are
 * returned finest-first (`levels[0]` is the first split); the last level's
 * `approx` is the final coarse approximation.
 */
export function waveletDwt(x: ArrayLike<number>, opts: WaveletOptions = {}): WaveletReport {
  const kind = opts.kind ?? 'haar';
  const min = kind === 'haar' ? WAVELET_HAAR_MIN : WAVELET_DB4_MIN;
  const n = x.length;
  if (n < min) {
    return { kind, length: n, levels: [], abstained: true, reason: `need ${min} samples, have ${n}` };
  }
  if (n % 2 !== 0) {
    return { kind, length: n, levels: [], abstained: true, reason: `odd length ${n} — a DWT level needs an even window` };
  }
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(x[i])) {
      return { kind, length: n, levels: [], abstained: true, reason: 'non-finite sample' };
    }
  }

  const maxLevels = opts.levels ?? Infinity;
  const levels: WaveletLevel[] = [];
  let cur: Float64Array = Float64Array.from(x as ArrayLike<number>);
  let level = 1;
  while (level <= maxLevels && cur.length >= min && cur.length % 2 === 0) {
    const lv = kind === 'haar' ? haarLevel(cur) : db4Level(cur);
    levels.push({ level, approx: lv.approx, detail: lv.detail });
    cur = lv.approx;
    level++;
  }
  return { kind, length: n, levels, abstained: false };
}
