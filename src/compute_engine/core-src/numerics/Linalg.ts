/**
 * METATRON V11 — LINEAR ALGEBRA (f64 hot path)
 * =============================================
 *
 * Real-valued primitives operating on Float64Array. Used for:
 *   - Modified Gram–Schmidt (driver orthogonalisation)
 *   - Lanczos top-k eigenpairs of the φ-Toeplitz operator
 *   - Mat-vec for the SuperpositionField evolution step
 *
 * All operations are exact (within float64 ULP). No mock numerics.
 */

/**
 * Modified Gram–Schmidt orthonormalisation, in-place on `rows`.
 * Returns the indices of rows that survived (rejected = below `tol` after
 * projection). Orthonormality holds to ~1e-13 in well-conditioned inputs.
 *
 * Each row is a Float64Array of length `dim`.
 */
export function modifiedGramSchmidt(
  rows: Float64Array[],
  dim: number,
  tol: number = 1e-6,
): number[] {
  const kept: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i];
    if (v.length !== dim) {
      throw new RangeError(`modifiedGramSchmidt: row ${i} has length ${v.length}, expected ${dim}`);
    }
    // Project out previously-kept rows.
    for (const k of kept) {
      const u = rows[k];
      let dot = 0;
      for (let j = 0; j < dim; j++) dot += u[j] * v[j];
      for (let j = 0; j < dim; j++) v[j] -= dot * u[j];
    }
    // Normalise.
    let norm = 0;
    for (let j = 0; j < dim; j++) norm += v[j] * v[j];
    norm = Math.sqrt(norm);
    if (norm < tol) continue; // collinear or zero
    const inv = 1 / norm;
    for (let j = 0; j < dim; j++) v[j] *= inv;
    kept.push(i);
  }
  return kept;
}

/** Dot product of two equal-length Float64Arrays. */
export function dot(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length) throw new RangeError('dot: length mismatch');
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** y ← α·x + y  (axpy, BLAS-1). */
export function axpy(alpha: number, x: Float64Array, y: Float64Array): void {
  if (x.length !== y.length) throw new RangeError('axpy: length mismatch');
  for (let i = 0; i < x.length; i++) y[i] += alpha * x[i];
}

/** L2 norm of a Float64Array. */
export function l2(x: Float64Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s);
}

/**
 * Symmetric tridiagonal Lanczos. Computes an orthonormal Krylov basis Q
 * (k columns of length n) and the tridiagonal entries (alpha, beta) such that
 *
 *     A · Q ≈ Q · T_k    where T_k = tridiag(beta, alpha, beta).
 *
 * `apply(x, y)` must compute y ← A · x for n-dim x and y. This is the
 * matrix-free operator interface — perfect for the φ-Toeplitz, which is
 * specified analytically and never materialised as n×n.
 */
export function lanczos(
  n: number,
  k: number,
  apply: (x: Float64Array, y: Float64Array) => void,
  seed?: Float64Array,
): { Q: Float64Array[]; alpha: Float64Array; beta: Float64Array } {
  const Q: Float64Array[] = [];
  const alpha = new Float64Array(k);
  const beta = new Float64Array(k);

  // q0: random unit vector (deterministic seed for reproducibility).
  const q0 = seed ? new Float64Array(seed) : new Float64Array(n);
  if (!seed) {
    // Phyllotactic seed: golden-angle distribution. Stable, dense, deterministic.
    const ga = 2 * Math.PI * (1 - 1 / 1.618033988749895);
    for (let i = 0; i < n; i++) q0[i] = Math.cos(i * ga);
  }
  const norm0 = l2(q0);
  if (norm0 === 0) throw new Error('lanczos: zero seed');
  for (let i = 0; i < n; i++) q0[i] /= norm0;
  Q.push(q0);

  let qPrev: Float64Array | null = null;
  const w = new Float64Array(n);

  for (let j = 0; j < k; j++) {
    const qj = Q[j];
    apply(qj, w);
    const a = dot(qj, w);
    alpha[j] = a;
    // w ← w − α·q_j − β_{j−1}·q_{j−1}
    axpy(-a, qj, w);
    if (qPrev) axpy(-beta[j - 1], qPrev, w);

    // Full reorthogonalisation against all prior Q (numerical safety).
    for (const q of Q) {
      const proj = dot(q, w);
      axpy(-proj, q, w);
    }

    const b = l2(w);
    if (j + 1 < k) {
      beta[j] = b;
      if (b < 1e-14) break; // invariant subspace reached
      const qNext = new Float64Array(n);
      const inv = 1 / b;
      for (let i = 0; i < n; i++) qNext[i] = w[i] * inv;
      Q.push(qNext);
    }
    qPrev = qj;
  }
  return { Q, alpha, beta };
}
