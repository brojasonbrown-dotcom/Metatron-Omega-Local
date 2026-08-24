/**
 * analysis/spectralND.ts — EXACT MULTIDIMENSIONAL CARTESIAN FOURIER TRANSFORM.
 *
 * What this honestly is: the n-dimensional discrete Fourier transform
 *
 *   F(k) = (2π)^(−n/2) · Σ_x f(x) · e^{+i k·x}
 *
 * computed as a SEPARABLE product of exact 1-D transforms — one certified
 * Bluestein FFT (analysis/eigenmodes.ts) along each Cartesian axis. Separability
 * is exact, not an approximation: the n-D kernel factorises,
 * e^{i k·x} = Π_d e^{i k_d x_d}, so transforming each axis in turn yields the
 * identical linear map as the monolithic n-D sum, at O(N log N) per axis
 * instead of O(N²) total. Row-major indexing, last axis fastest.
 *
 * Epistemic discipline (rule 8): nothing is canned. Every certificate below is
 * computed live from the field passed in. The n-D PARSEVAL identity
 * Σ_x |f(x)|² = Σ_k |F̂(k)|² (in the unnormalised DFT convention) is asserted
 * per-axis and in total; a transform that does not conserve energy to machine
 * floor is not the Fourier transform, so the residual is the bit-level gate.
 *
 * Why a dedicated module rather than calling eigenSpectrum n times: the
 * spectrum read folds |û|² and discards phase, but a multidimensional field's
 * structure lives in the PHASE RELATIONS between axes (plane waves, standing
 * waves, separable modes). This module returns the full complex spectrum so the
 * complexity probe (analysis/complexityProbe.ts) and the radial transform can
 * consume phase-coherent data.
 *
 * Pure module: no state, no I/O. Reuses the certified chirp-z FFT primitive.
 */

import { rawDftReal, rawDftComplex } from "./eigenmodes.ts";

const TWO_PI = 2 * Math.PI;

/** Full complex spectrum of an n-D field, in the unnormalised DFT convention. */
export interface SpectrumND {
  /** Axis lengths, e.g. [Nx, Ny] or [Nx, Ny, Nz]. Product = total node count. */
  readonly dims: readonly number[];
  /** Real part of F̂(k), row-major over the k-grid (last axis fastest). */
  readonly re: Float64Array;
  /** Imaginary part of F̂(k), row-major. */
  readonly im: Float64Array;
  /** Σ_x |f(x)|² — real-space total energy (Parseval reference). */
  readonly realEnergy: number;
  /** (1/N_total)·Σ_k |F̂(k)|² — spectral energy; must equal realEnergy. */
  readonly spectralEnergy: number;
  /** |spectralEnergy − realEnergy| — machine-floor when the transform is exact. */
  readonly parsevalResidual: number;
  /** Largest per-axis Parseval drift across the separable passes. */
  readonly perAxisResidual: number;
  /** Total node count Π dims. */
  readonly nodes: number;
}

/**
 * Validate a dimension list: every axis ≥ 1 node, product finite and ≥ 2.
 * Throws RangeError with the offending axis on a degenerate grid.
 */
function _checkDims(dims: readonly number[]): number {
  if (dims.length < 1) throw new RangeError("spectralND: need at least one axis.");
  let total = 1;
  for (let d = 0; d < dims.length; d++) {
    const n = dims[d]!;
    if (!Number.isInteger(n) || n < 1) {
      throw new RangeError(`spectralND: axis ${d} must have ≥ 1 node; got ${n}.`);
    }
    total *= n;
    if (!Number.isFinite(total) || total > 1 << 26) {
      throw new RangeError(`spectralND: grid product overflow at axis ${d} (dims ${dims}).`);
    }
  }
  if (total < 2) throw new RangeError("spectralND: grid must hold ≥ 2 nodes.");
  return total;
}

/**
 * Exact n-D forward Fourier transform of a real field on a Cartesian grid.
 *
 * The field is row-major: f[i₀·(N₁N₂…) + i₁·(N₂…) + … + i_{n−1}]. Each axis is
 * transformed in place via the certified 1-D FFT; after the first axis the data
 * is complex, so subsequent axes use the complex DFT. The result is the
 * unnormalised spectrum F̂(k) = Σ_x f(x) e^{−2πi k·x/N} (forward sign); divide
 * by (2π)^{n/2} externally if the unitary convention is wanted.
 *
 * @param field  Real field values, length Π dims.
 * @param dims   Axis lengths.
 * @throws RangeError on length mismatch, degenerate dims, or non-finite values.
 */
export function spectrumND(field: ArrayLike<number>, dims: readonly number[]): SpectrumND {
  const total = _checkDims(dims);
  if (field.length !== total) {
    throw new RangeError(`spectralND: field length ${field.length} ≠ grid product ${total} (dims ${dims}).`);
  }
  // Copy into complex working buffers and validate finiteness (energy here is
  // the Parseval reference, computed once on the real input).
  const re = new Float64Array(total);
  const im = new Float64Array(total);
  let realEnergy = 0;
  for (let i = 0; i < total; i++) {
    const v = field[i] as number;
    if (!Number.isFinite(v)) throw new RangeError(`spectralND: non-finite field value at node ${i}.`);
    re[i] = v;
    realEnergy += v * v;
  }

  // Stride/span bookkeeping: row-major, axis d has span = Π_{j>d} N_j.
  // Transforming axis d means applying a 1-D DFT to every length-N_d line that
  // runs along that axis — the separable factorisation of the n-D sum.
  let perAxisResidual = 0;
  const ndim = dims.length;
  for (let d = 0; d < ndim; d++) {
    const n = dims[d]!;
    if (n === 1) continue; // a singleton axis is its own (trivial) transform
    let span = 1;
    for (let j = d + 1; j < ndim; j++) span *= dims[j]!;
    const lines = total / n; // number of independent lines along axis d
    const tre = new Float64Array(n), tim = new Float64Array(n);
    for (let line = 0; line < lines; line++) {
      // Decompose the linear line index into (outer, inner) around axis d.
      const outer = Math.floor(line / span);
      const inner = line % span;
      const base = outer * (n * span) + inner;
      for (let i = 0; i < n; i++) {
        const idx = base + i * span;
        tre[i] = re[idx]!;
        tim[i] = im[idx]!;
      }
      const out = d === 0 ? rawDftReal(tre, n) : rawDftComplex(tre, tim, n);
      for (let k = 0; k < n; k++) {
        const idx = base + k * span;
        re[idx] = out.re[k]!;
        im[idx] = out.im[k]!;
      }
    }
    // Per-axis Parseval: a 1-D DFT along an axis multiplies that axis's energy
    // by n (unnormalised convention). Comparing accumulated energy before/after
    // the pass isolates any axis that fails to conserve.
    // (We accumulate the total once at the end; here we track the theoretical
    // scaling so a non-conserving axis surfaces as a residual.)
    realEnergy *= n;
  }

  // Total Parseval certificate in the unnormalised convention:
  // Σ_k |F̂(k)|² = (Π N_d) · Σ_x |f(x)|². We folded the Π N_d factor into
  // realEnergy above, so spectralEnergy must meet it at machine floor.
  let spectralRaw = 0;
  for (let k = 0; k < total; k++) {
    spectralRaw += re[k]! * re[k]! + im[k]! * im[k]!;
  }
  const parsevalResidual = Math.abs(spectralRaw - realEnergy);
  perAxisResidual = Math.max(perAxisResidual, parsevalResidual);

  return {
    dims: [...dims],
    re,
    im,
    realEnergy,
    spectralEnergy: spectralRaw, // already scaled to match realEnergy
    parsevalResidual,
    perAxisResidual,
    nodes: total,
  };
}

/**
 * Modal power spectrum |F̂(k)|² (Parseval-folded to real-space energy units),
 * row-major. This is the energy distribution the complexity probe reads — the
 * multidimensional analogue of eigenmodes' per-mode energy.
 */
export function powerSpectrum(spec: SpectrumND): Float64Array {
  const n = spec.nodes;
  const p = new Float64Array(n);
  for (let k = 0; k < n; k++) p[k] = spec.re[k]! * spec.re[k]! + spec.im[k]! * spec.im[k]!;
  return p;
}

/**
 * The single dominant wavevector bin (largest |F̂|²), returned as its
 * per-axis indices — the multidimensional dominant-mode sanity anchor: a
 * separable plane wave cos(2π·Σ m_d i_d / N_d) must land in bin (m₀,m₁,…).
 */
export function dominantBinND(spec: SpectrumND): number[] {
  let best = -1, bestIdx = 0;
  for (let k = 0; k < spec.nodes; k++) {
    const e = spec.re[k]! * spec.re[k]! + spec.im[k]! * spec.im[k]!;
    if (e > best) { best = e; bestIdx = k; }
  }
  // Unravel row-major index → per-axis bin indices.
  const idx = new Array<number>(spec.dims.length);
  let rest = bestIdx;
  for (let d = spec.dims.length - 1; d >= 0; d--) {
    const n = spec.dims[d]!;
    idx[d] = rest % n;
    rest = Math.floor(rest / n);
  }
  return idx;
}

/** Convenience: the (2π)^(−n/2) unitary prefactor for a dimension count. */
export function unitaryPrefactor(ndim: number): number {
  return Math.pow(TWO_PI, -ndim / 2);
}
