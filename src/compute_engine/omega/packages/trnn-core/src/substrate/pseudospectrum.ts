/**
 * pseudospectrum — Ω-REAL M2 · S007: ε-pseudospectra of a real operator.
 *
 * The eigenvalues of a non-normal matrix are the wrong place to read stability:
 * a small perturbation can move them far. The ε-pseudospectrum
 *   Λ_ε(A) = { z : σ_min(zI − A) < ε }
 * is the honest region — it marks where the resolvent (zI − A)⁻¹ is large, i.e.
 * where the dynamics are effectively resonant. σ_min is computed with the
 * one-sided Jacobi SVD (never the Gram AᵀA), so the small singular values stay
 * trustworthy to ~eps.
 *
 * A complex shift zI − A is handled by the standard 2n×2n real block embedding
 *   [ Re(zI−A)   −Im(zI−A) ]
 *   [ Im(zI−A)    Re(zI−A) ]
 * whose singular values are those of the complex matrix (each doubled), so the
 * smallest singular value is exact.
 */

import { oneSidedJacobi } from './dmd';

/** σ_min(zI − A) at a complex shift z = re + i·im, via the real block embedding. */
export function sigmaMinAt(A: Float64Array, n: number, re: number, im: number): number {
  const N = 2 * n;
  const M = new Float64Array(N * N);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = A[i * n + j];
      const real = (i === j ? re : 0) - a;
      const imag = i === j ? im : 0;
      M[i * N + j] = real;
      M[i * N + j + n] = -imag;
      M[(i + n) * N + j] = imag;
      M[(i + n) * N + j + n] = real;
    }
  }
  const { S } = oneSidedJacobi(M, N, N);
  return S[N - 1]; // smallest singular value (S is descending)
}

export interface PseudoPoint {
  readonly re: number;
  readonly im: number;
  readonly sigmaMin: number;
}

/**
 * σ_min over a real×imaginary grid. The imaginary axis is taken as given (≥ 0
 * for the upper half-plane; the lower half is conjugate-symmetric for a real A).
 */
export function pseudospectrum(
  A: Float64Array,
  n: number,
  reGrid: readonly number[],
  imGrid: readonly number[],
): PseudoPoint[] {
  const out: PseudoPoint[] = [];
  for (const im of imGrid) {
    for (const re of reGrid) {
      out.push({ re, im, sigmaMin: sigmaMinAt(A, n, re, im) });
    }
  }
  return out;
}
