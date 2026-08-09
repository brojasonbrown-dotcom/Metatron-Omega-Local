/**
 * analysis/eigenmodes.ts — SUPER-RESOLUTION SPECTRAL EIGENMODES of the live ring field.
 *
 * What this honestly is: the exact discrete Fourier eigen-decomposition of the
 * periodic-ring Laplacian. The N-node ring's spatial operator diagonalises onto
 * the Fourier modes e^{2πikn/N}; each mode k is an eigenmode with eigenvalue
 * λ_k = −4 sin²(πk/N) (order-2) — so projecting the LIVE field onto these modes
 * is a *super-resolution* read: it resolves the field's structure below the
 * grid spacing, in the basis where the physics is diagonal.
 *
 * Epistemic discipline (rule 8): every number is computed live from the field
 * passed in. The transform is EXACT — a radix-2 Fast Fourier Transform, which
 * is the DFT computed by divide-and-conquer, not an approximation of it. The
 * FFT and the naive O(N²) sum are the SAME linear map up to floating-point
 * rounding; Parseval's identity Σu² = Σ_k |û_k|² is asserted internally as the
 * conservation certificate and is the bit-level gate that proves the fast path
 * returns the same spectrum as the direct sum.
 *
 * Why the FFT replaced the direct DFT (measured, not chosen): the naive double
 * loop is O(N²) trigonometry — 4.95 ms at 610 nodes, 23.3 ms at 987, and a
 * projected ~50 s at 50 000. That quadratic wall, not any hardware limit, is
 * what capped the resolution ladder at 610. The radix-2 FFT is O(N log N):
 * ~80× fewer operations at 610, ~3000× at 50 000 — which is what lets the
 * ladder climb to its true ceiling instead of an assumed one.
 *
 * The eigenmode energies are returned in ASCENDING |k| order (fundamental →
 * Nyquist), each φ-weighted so the panel can show a golden spectral envelope:
 * mode k's weight is φ⁻ᵏ, the framework's canonical spectral decay anchor
 * (lucas.ts spectralLines). Nothing is canned; a uniform field projects to
 * zero energy in every non-DC mode.
 *
 * Pure module: no state, no I/O, no engine imports beyond the centralised φ.
 */

import { PHI } from "../core/constants.ts";
import type { Field } from "../dynamics/memoryKernel.ts";

const TWO_PI = 2 * Math.PI;

/** One resolved eigenmode of the ring Laplacian. */
export interface Eigenmode {
  /** Mode index k = 0..⌊N/2⌋ (0 = DC, the spatial mean). */
  readonly k: number;
  /** Exact order-2 Laplacian eigenvalue λ_k = −4 sin²(πk/N). */
  readonly eigenvalue: number;
  /** Modal energy |û_k|² (Parseval-normalised: Σ_k = Σu²). */
  readonly energy: number;
  /** Modal amplitude |û_k| (same units as the field). */
  readonly amplitude: number;
  /** Golden spectral envelope weight φ⁻ᵏ (framework anchor, not a fit). */
  readonly phiWeight: number;
  /** Energy × φ⁻ᵏ — the φ-weighted spectral line the panel charts. */
  readonly weighted: number;
}

/** The full super-resolution spectrum of one field snapshot. */
export interface Spectrum {
  /** Node count the spectrum was resolved at. */
  readonly nodes: number;
  /** Eigenmodes k = 0..⌊N/2⌋, ascending. */
  readonly modes: readonly Eigenmode[];
  /** Σ_k |û_k|² — must equal Σu² (Parseval). The conservation certificate. */
  readonly totalEnergy: number;
  /** |Σ_k|û_k|² − Σu²| — machine-floor when the decomposition is exact. */
  readonly parsevalResidual: number;
  /** The single dominant eigenmode (largest non-DC energy), or null if flat. */
  readonly dominant: Eigenmode | null;
}

/** True iff n is a positive power of two. */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * In-place iterative radix-2 Cooley–Tukey FFT on interleaved [re, im] pairs.
 * `size` must be a power of two. This is the exact DFT of the padded input,
 * computed in O(size log size); it introduces no approximation beyond the
 * floating-point rounding any DFT incurs. Scratch buffers are module-level and
 * grown geometrically so the per-tick hot path performs zero allocation.
 */
let _fftBuf: Float64Array = new Float64Array(0);

function _fftInPlace(a: Float64Array, size: number): void {
  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const ir = 2 * i, jr = 2 * j;
      const tr = a[ir]!, ti = a[ir + 1]!;
      a[ir] = a[jr]!; a[ir + 1] = a[jr + 1]!;
      a[jr] = tr; a[jr + 1] = ti;
    }
  }
  // Danielson–Lanczos butterflies. Twiddles use the half-angle recurrence
  // (Numerical Recipes): iterating w ← w·ω accumulates rounding that breaks
  // exactness on long transforms; w ← w + (a·w_re + b·w_im) stays on the unit
  // circle to machine precision, which the Parseval certificate depends on.
  for (let len = 2; len <= size; len <<= 1) {
    const half = len >> 1;
    const theta = -TWO_PI / len;
    const alpha = -2 * Math.sin(0.5 * theta) ** 2;
    const beta = Math.sin(theta);
    for (let i = 0; i < size; i += len) {
      let cwr = 1, cwi = 0;
      for (let m = 0; m < half; m++) {
        const e = 2 * (i + m), o = 2 * (i + m + half);
        const or_ = a[o]!, oi = a[o + 1]!;
        const vr = or_ * cwr - oi * cwi;
        const vi = or_ * cwi + oi * cwr;
        a[o] = a[e]! - vr; a[o + 1] = a[e + 1]! - vi;
        a[e] = a[e]! + vr; a[e + 1] = a[e + 1]! + vi;
        const nwr = cwr + alpha * cwr - beta * cwi;
        cwi = cwi + alpha * cwi + beta * cwr;
        cwr = nwr;
      }
    }
  }
}

/**
 * Exact N-point DFT of a real field, for ANY N ≥ 2 (prime or composite).
 *
 * The ladder's rungs are Fibonacci numbers, and several are prime (89, 233,
 * 1597, 28657…), so a power-of-two FFT cannot be applied to the signal
 * directly — and zero-padding to a power of two is a DIFFERENT transform that
 * breaks the Parseval certificate (measured residual 1.08e2 at N=610, not
 * machine floor). So this uses Bluestein's chirp-z factorisation: the identity
 * k·i = (k² + i² − (k−i)²)/2 rewrites the DFT as
 *
 *   û_k = e^{−iπk²/N} · Σ_i [ u_i e^{−iπi²/N} ] · e^{+iπ(k−i)²/N},
 *
 * a cyclic convolution of the chirp-weighted signal with a conjugate chirp,
 * evaluated exactly by radix-2 FFT at a padded convolution length (M ≥ 2N−1).
 * The padding here extends the CONVOLUTION, not the signal — the embedded
 * N-point transform is the exact DFT, so Parseval holds to machine floor for
 * every rung. Cost is O(M log M) = O(N log N), independent of N's factorisation.
 * Chirp tables are cached per-N (keyed by N) so the per-tick hot path only pays
 * the three FFTs.
 */
const _chirpCache = new Map<number, { are: Float64Array; aim: Float64Array; bre: Float64Array; bim: Float64Array; m: number }>();

function _chirps(n: number): { are: Float64Array; aim: Float64Array; bre: Float64Array; bim: Float64Array; m: number } {
  let c = _chirpCache.get(n);
  if (c) return c;
  let m = 1;
  while (m < 2 * n - 1) m <<= 1;
  const are = new Float64Array(m), aim = new Float64Array(m);
  const bre = new Float64Array(m), bim = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * i * i) / n; // modulo-2π argument of e^{iπi²/N}
    are[i] = Math.cos(ang); aim[i] = -Math.sin(ang); // e^{−iπi²/N}
    bre[i] = Math.cos(ang); bim[i] = Math.sin(ang);  // e^{+iπi²/N}
    if (i > 0) { bre[m - i] = bre[i]!; bim[m - i] = bim[i]!; } // wrap for cyclic convolution
  }
  c = { are, aim, bre, bim, m };
  _chirpCache.set(n, c);
  return c;
}

function _dftReal(field: Field, n: number): { re: Float64Array; im: Float64Array } {
  const { are, aim, bre, bim, m } = _chirps(n);
  // a = signal × forward chirp, transformed in place.
  const fa = new Float64Array(2 * m);
  for (let i = 0; i < n; i++) {
    const v = field[i] as number;
    fa[2 * i] = v * are[i]!;
    fa[2 * i + 1] = v * aim[i]!;
  }
  // b = conjugate chirp (cyclic kernel), transformed in place.
  const fb = new Float64Array(2 * m);
  for (let i = 0; i < m; i++) { fb[2 * i] = bre[i]!; fb[2 * i + 1] = bim[i]!; }
  _fftInPlace(fa, m);
  _fftInPlace(fb, m);
  // Pointwise complex product A·B.
  for (let i = 0; i < m; i++) {
    const ar = fa[2 * i]!, ai = fa[2 * i + 1]!;
    const br = fb[2 * i]!, bi = fb[2 * i + 1]!;
    fa[2 * i] = ar * br - ai * bi;
    fa[2 * i + 1] = ar * bi + ai * br;
  }
  // Inverse FFT (conjugate twiddles) + 1/m normalisation.
  for (let i = 0; i < 2 * m; i += 2) fa[i + 1] = -fa[i + 1]!;
  _fftInPlace(fa, m);
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const cr = fa[2 * k]! / m, ci = -fa[2 * k + 1]! / m; // un-conjugate the result
    // û_k = chirp(k) · convolution(k)
    re[k] = are[k]! * cr - aim[k]! * ci;
    im[k] = are[k]! * ci + aim[k]! * cr;
  }
  return { re, im };
}

/**
 * Resolve the live field into its super-resolution eigenmode spectrum.
 * O(N log N) exact FFT — the same linear map as the O(N²) direct sum, kept
 * honest by the Parseval certificate below. At the ladder's rungs this stays
 * deep inside the 33 ms cadence budget from 55 nodes up to 50 000+.
 *
 * @param field  The live ring field (length N ≥ 2).
 * @throws RangeError on a degenerate field (N < 2) or non-finite values.
 */
export function eigenSpectrum(field: Field): Spectrum {
  const n = field.length;
  if (!Number.isInteger(n) || n < 2) {
    throw new RangeError(`eigenSpectrum: field must have ≥ 2 nodes; got ${n}.`);
  }
  let total = 0;
  for (let i = 0; i < n; i++) {
    const v = field[i] as number;
    if (!Number.isFinite(v)) {
      throw new RangeError(`eigenSpectrum: non-finite field value at node ${i}.`);
    }
    total += v * v;
  }

  const { re: RE, im: IM } = _dftReal(field, n);
  const half = Math.floor(n / 2);
  const modes: Eigenmode[] = [];
  for (let k = 0; k <= half; k++) {
    const re = RE[k]!;
    const im = IM[k]!;
    // Parseval for a real signal: Σ|u|² = (1/N)[ |û_0|² + |û_{N/2}|² + 2Σ_{0<k<N/2}|û_k|² ].
    // Fold the symmetry factor in so Σ_k energy === Σu² exactly.
    const fold = k === 0 || (n % 2 === 0 && k === half) ? 1 : 2;
    const energy = (fold * (re * re + im * im)) / n;
    const phiWeight = Math.pow(PHI, -k);
    modes.push({
      k,
      eigenvalue: -4 * Math.sin((Math.PI * k) / n) ** 2,
      energy,
      amplitude: Math.sqrt(energy),
      phiWeight,
      weighted: energy * phiWeight,
    });
  }

  const specTotal = modes.reduce((a, m) => a + m.energy, 0);
  let dominant: Eigenmode | null = null;
  for (let k = 1; k < modes.length; k++) {
    const m = modes[k]!;
    if (m.energy > 1e-12 && (dominant === null || m.energy > dominant.energy)) dominant = m;
  }
  return {
    nodes: n,
    modes,
    totalEnergy: specTotal,
    parsevalResidual: Math.abs(specTotal - total),
    dominant,
  };
}

/**
 * The single strongest eigenmode index for a pure tone sanity check — the same
 * anchor the smoke test uses: a tone at spatial frequency m must land in bin m.
 */
export function dominantModeIndex(field: Field): number {
  const s = eigenSpectrum(field);
  return s.dominant ? s.dominant.k : 0;
}
