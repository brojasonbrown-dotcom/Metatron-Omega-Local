/**
 * RHUFT Mind — Product Quantization Codec (memory-efficient field bitmapping)
 *
 * Epistemic Status: [MATH] — Jégou, Douze & Schmid, "Product Quantization for
 * Nearest Neighbor Search" (IEEE TPAMI 2011) — the core of FAISS's IVFADC.
 *
 * [PHIL] — High-resolution memory must be cheap to keep. A raw 28-dim Float64
 * field costs 224 bytes; thousands of episodic traces would be the largest
 * structure in the mind. Product quantization splits the field into sub-vectors
 * and replaces each with the index of its nearest centroid — one byte per
 * sub-vector — compressing the field ~14× while keeping enough geometry to
 * reconstruct and to rank by asymmetric distance.
 *
 * [MATH] — Field x ∈ R^28 split into m = 4 contiguous sub-vectors of d_sub = 7.
 * Each sub-space gets k = 256 centroids trained by deterministic Lloyd iteration
 * (k-means). Encode: x → (c_0, c_1, c_2, c_3), one byte each. Decode: centroids
 * re-concatenated → ≈ x. Asymmetric distance: ||q − decode(encode(x))|| computed
 * without decompressing the database (ADC). [MATH]
 *
 * DETERMINISM [SPEC] — Centroid initialisation is deterministic (evenly-spaced
 * data quantiles, not k-means++ RNG), and Lloyd iterations are deterministic.
 * No Math.random anywhere. Bounded and Float64Array throughout.
 */

import { FIELD_SIZE } from "./../adapters/language_codec.ts";

/** Number of sub-vector spaces: m = 4. [SPEC] */
export const PQ_SUBSPACES = 4;
/** Centroids per sub-space: k = 256 (one byte per code). [SPEC] */
export const PQ_CENTROIDS = 256;
/** Lloyd-iteration passes when training. [SPEC] */
const PQ_ITERATIONS = 13; // F_7

export interface TrainedPQ {
  readonly subspaces: number;
  readonly centroidsPerSubspace: number;
  readonly subDim: number;
  /** codebook[s][c] = Float64Array(subDim) centroid c of subspace s. */
  readonly codebook: Float64Array[][];
}

/**
 * Train a product quantizer on a set of fields via deterministic Lloyd iteration.
 *
 * @param samples — Training fields (each length FIELD_SIZE). Need ≥ k for a
 *                  full codebook; with fewer, unused centroids sit at zero.
 */
export function trainPQ(samples: Float64Array[]): TrainedPQ {
  const subspaces = PQ_SUBSPACES;
  const k = PQ_CENTROIDS;
  const dim = FIELD_SIZE;
  if (dim % subspaces !== 0) {
    throw new Error(`trainPQ: dim ${dim} not divisible by ${subspaces} subspaces`);
  }
  const subDim = dim / subspaces;

  const codebook: Float64Array[][] = [];
  for (let s = 0; s < subspaces; s++) {
    const offset = s * subDim;
    // Collect this sub-space's training sub-vectors.
    const subVecs: Float64Array[] = samples.map((f) => f.slice(offset, offset + subDim));

    // Deterministic init: pick k evenly spaced samples (or repeat if fewer).
    const centroids: Float64Array[] = [];
    const n = subVecs.length;
    for (let c = 0; c < k; c++) {
      const idx = n > 0 ? Math.floor((c * n) / k) % n : 0;
      centroids.push(n > 0 ? new Float64Array(subVecs[idx]) : new Float64Array(subDim));
    }

    // Lloyd iterations.
    if (n > 0) {
      const assignments = new Int32Array(n);
      for (let iter = 0; iter < PQ_ITERATIONS; iter++) {
        // Assign each sub-vector to its nearest centroid.
        for (let i = 0; i < n; i++) {
          assignments[i] = nearestCentroidIndex(subVecs[i], centroids);
        }
        // Recompute centroids as the mean of assigned sub-vectors.
        const sums: Float64Array[] = [];
        const counts = new Int32Array(k);
        for (let c = 0; c < k; c++) sums.push(new Float64Array(subDim));
        for (let i = 0; i < n; i++) {
          const a = assignments[i];
          counts[a]++;
          const v = subVecs[i];
          for (let d = 0; d < subDim; d++) sums[a][d] += v[d];
        }
        for (let c = 0; c < k; c++) {
          if (counts[c] > 0) {
            for (let d = 0; d < subDim; d++) centroids[c][d] = sums[c][d] / counts[c];
          }
        }
      }
    }
    codebook.push(centroids);
  }

  return { subspaces, centroidsPerSubspace: k, subDim, codebook };
}

/** Index of the centroid nearest to `v` within `centroids`. */
function nearestCentroidIndex(v: Float64Array, centroids: Float64Array[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let c = 0; c < centroids.length; c++) {
    const cen = centroids[c];
    let dist = 0.0;
    for (let d = 0; d < v.length; d++) {
      const diff = v[d] - cen[d];
      dist += diff * diff;
    }
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

/** Encode a field to its PQ code (one byte per sub-space). */
export function pqEncode(pq: TrainedPQ, field: Float64Array): Uint8Array {
  const code = new Uint8Array(pq.subspaces);
  for (let s = 0; s < pq.subspaces; s++) {
    const offset = s * pq.subDim;
    const sub = field.slice(offset, offset + pq.subDim);
    code[s] = nearestCentroidIndex(sub, pq.codebook[s]);
  }
  return code;
}

/** Decode a PQ code back to an approximate field. */
export function pqDecode(pq: TrainedPQ, code: Uint8Array): Float64Array {
  const out = new Float64Array(pq.subspaces * pq.subDim);
  for (let s = 0; s < pq.subspaces; s++) {
    const centroid = pq.codebook[s][code[s] ?? 0];
    const offset = s * pq.subDim;
    for (let d = 0; d < pq.subDim; d++) out[offset + d] = centroid[d];
  }
  return out;
}

/**
 * Asymmetric distance between a raw query and a PQ code (ADC): the query is
 * NOT quantized, the database vector IS — preserving ranking fidelity. [MATH]
 */
export function pqAsymmetricDistance(pq: TrainedPQ, query: Float64Array, code: Uint8Array): number {
  let dist = 0.0;
  for (let s = 0; s < pq.subspaces; s++) {
    const centroid = pq.codebook[s][code[s] ?? 0];
    const offset = s * pq.subDim;
    for (let d = 0; d < pq.subDim; d++) {
      const diff = query[offset + d] - centroid[d];
      dist += diff * diff;
    }
  }
  return Math.sqrt(dist);
}

/** Mean relative reconstruction error of a set of fields under this codec. */
export function pqDistortion(pq: TrainedPQ, samples: Float64Array[]): number {
  if (samples.length === 0) return 0;
  let total = 0;
  for (const f of samples) {
    const recon = pqDecode(pq, pqEncode(pq, f));
    let num = 0;
    let den = 0;
    for (let i = 0; i < f.length; i++) {
      const diff = f[i] - recon[i];
      num += diff * diff;
      den += f[i] * f[i];
    }
    total += den > 0 ? Math.sqrt(num) / Math.sqrt(den) : 0;
  }
  return total / samples.length;
}
