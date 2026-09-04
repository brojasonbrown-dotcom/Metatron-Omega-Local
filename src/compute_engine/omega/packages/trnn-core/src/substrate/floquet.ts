/**
 * floquet — Ω-REAL M2 · B002: Floquet theory of a periodic linear map.
 *
 * For a period-P linear system x_{t+1} = A_t x_t with A_{t+P} = A_t, the
 * monodromy matrix M = A_{P-1}···A_0 governs stability over one period. Its
 * eigenvalues are the Floquet multipliers; their log-magnitude over the period
 * is the continuous growth rate (Floquet exponent), and their argument gives the
 * frequency. Deterministic; reuses the exact Francis-double-shift eigen-solver
 * from dmd.ts — no new linear algebra.
 */

import { generalEigenvalues } from './dmd';
import { dlog, datan2 } from '../core/dmath';

export interface FloquetMode {
  readonly lambdaRe: number;
  readonly lambdaIm: number;
  /** |λ| of the multiplier. */
  readonly magnitude: number;
  /** Continuous growth rate = ln|λ| / period. */
  readonly growth: number;
  /** Frequency = arg(λ) / (2π·period) in cycles per unit time. */
  readonly frequency: number;
}

export interface FloquetReport {
  readonly period: number;
  readonly multipliers: readonly FloquetMode[];
  /** max|λ| of the monodromy matrix. */
  readonly spectralRadius: number;
}

function identityMatrix(n: number): Float64Array {
  const I = new Float64Array(n * n);
  for (let i = 0; i < n; i++) I[i * n + i] = 1;
  return I;
}

function matMul(A: Float64Array, B: Float64Array, n: number): Float64Array {
  const C = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += A[i * n + k] * B[k * n + j];
      C[i * n + j] = s;
    }
  }
  return C;
}

/** Monodromy matrix over one period: M = A_{P-1}···A_0 (maps applied in order). */
export function monodromy(maps: readonly Float64Array[], n: number): Float64Array {
  if (maps.length === 0) return identityMatrix(n);
  let M = identityMatrix(n);
  for (const A of maps) M = matMul(A, M, n);
  return M;
}

/** Floquet multipliers and exponents from a monodromy matrix. */
export function floquet(M: Float64Array, n: number, period: number): FloquetReport {
  const { re, im } = generalEigenvalues(Float64Array.from(M), n);
  const modes: FloquetMode[] = [];
  let radius = 0;
  for (let j = 0; j < n; j++) {
    const mag = Math.sqrt(re[j] * re[j] + im[j] * im[j]);
    radius = Math.max(radius, mag);
    modes.push({
      lambdaRe: re[j],
      lambdaIm: im[j],
      magnitude: mag,
      growth: mag > 0 ? dlog(mag) / period : Number.NEGATIVE_INFINITY,
      frequency: datan2(im[j], re[j]) / (2 * Math.PI * period),
    });
  }
  return { period, multipliers: modes, spectralRadius: radius };
}
