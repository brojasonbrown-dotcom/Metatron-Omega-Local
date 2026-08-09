/**
 * DimensionalStability.ts — RHUFT v13 Deep Ontology Module
 *
 * [SPEC] Implements the 7×7 dimensional stability tensor S_{αβ}(t) per
 * RHUFT Foundational Logic Extraction v1, Sections 5.2 and 11.3.
 *
 * [PHIL] The stability tensor is the field’s self-measurement of structural
 * integrity across all dimensions of existence. Diagonal S_{αα} is intrinsic
 * stability; off-diagonal S_{αβ} is cross-dimensional coupling.
 *
 * [MATH] All arithmetic is IEEE-754 Float64. Deterministic. No randomness.
 * Scale-invariant via φ-law constants from `./core/constants.ts`.
 *
 * Epistemic labels: [SPEC], [PHIL], [MATH], [FIX], [INTEGRATED].
 */

import {
  PHI,
  PHI_INV,
  PHI_SQUARED,
  PHI_CUBED,
  PHI_NEG2,
  PHI_NEG3,
  PHI_NEG5,
  PHI_NEG8,
  COHERENCE_THRESHOLD,
  CLOSURE_COUPLING,
  QRF_CRITICAL_SCALE,
} from "./core/constants.ts";
import { at } from "./core/indexing.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Type Aliases & Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** [MATH] IEEE-754 double-precision alias for deterministic Float64 semantics. */
export type Float64 = number;

/** [FIX] Seven canonical dimensions of the RHUFT stability hierarchy. */
export const DIMENSION_COUNT = 7;

/** [FIX] Type-safe dimension index: 0..6. */
export type DimensionIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/** [SPEC] Field state snapshot for all seven dimensions. */
export interface FieldState {
  spatial: Float64[];
  temporal: Float64[];
  scale: Float64[];
  phase: Float64[];
  coherence: Float64[];
  closure: Float64[];
  memory: Float64[];
}

/** [SPEC] Continuity bounds for a canonical scale. */
export interface ContinuityBounds {
  deltaMin: Float64;
  deltaMax: Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DimensionalStability Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] 7×7 stability tensor, cross-dimensional coupling, global aggregation,
 * eigenvalue verification, and perfection-deficit continuity.
 *
 * [MATH] S_{αβ}(t) = w_{αβ} · C_{αβ}(t) / (1 + D_{αβ}(t) + L_{αβ}(t))
 * where C = coherence, D = drift, L = leak, w_{αβ} = φ^{-|α-β|}.
 */
export class DimensionalStability {
  /** [MATH] Current 7×7 stability tensor S_{αβ}. */
  tensor: Float64[][];
  /** [MATH] Previous tensor for temporal evolution. */
  previousTensor: Float64[][];
  /** [MATH] Eigenvalues of symmetrized tensor. */
  eigenvalues: Float64[];
  /** [MATH] Scalar global stability. */
  globalStability: Float64;
  /** [MATH] Previous perfection deficit for continuity law. */
  previousEpsilon: Float64;
  /** [MATH] Current perfection deficit. */
  currentEpsilon: Float64;
  /** [FIX] Monotonic tick counter. */
  tickIndex: number;

  constructor(fieldState: FieldState) {
    this.tensor = this._alloc();
    this.previousTensor = this._alloc();
    this.eigenvalues = Array(DIMENSION_COUNT).fill(0.0 as Float64);
    this.globalStability = 0.0 as Float64;
    this.previousEpsilon = 0.0 as Float64;
    this.currentEpsilon = 0.0 as Float64;
    this.tickIndex = 0;
    this.update(fieldState);
  }

  /** [FIX] Allocate zero 7×7 matrix. */
  private _alloc(): Float64[][] {
    return Array.from({ length: DIMENSION_COUNT }, () =>
      Array(DIMENSION_COUNT).fill(0.0 as Float64)
    );
  }

  /** [FIX] Deep-copy a 7×7 matrix. */
  private _copy(src: Float64[][]): Float64[][] {
    return src.map((row) => row.map((v) => v as Float64));
  }

  /** [FIX] Flatten all seven field arrays. */
  private _flatten(fs: FieldState): Float64[] {
    return [
      ...fs.spatial, ...fs.temporal, ...fs.scale, ...fs.phase,
      ...fs.coherence, ...fs.closure, ...fs.memory,
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.1 Core Tensor Update
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Recompute tensor, eigenvalues, and global stability from field state.
   * [MATH] Archives previous tensor, computes S_{αβ}, symmetrizes, eigen-decomposes.
   */
  update(fieldState: FieldState): void {
    this.previousTensor = this._copy(this.tensor);
    this.tensor = this.computeStabilityTensor(fieldState);
    this.eigenvalues = this.computeEigenvalues();
    this.globalStability = this.computeGlobalStability();
    this.previousEpsilon = this.currentEpsilon;
    this.currentEpsilon = this.computePerfectionDeficit(this._flatten(fieldState));
    this.tickIndex += 1;
  }

  /**
   * [SPEC] Compute the full 7×7 stability tensor.
   * [MATH] Diagonal = intrinsic stability; off-diagonal = cross-dimensional.
   * Symmetrized: S_{sym} = (S + S^T) / 2 to guarantee real eigenvalues.
   */
  computeStabilityTensor(fieldState: FieldState): Float64[][] {
    const vals: Float64[][] = [
      fieldState.spatial, fieldState.temporal, fieldState.scale,
      fieldState.phase, fieldState.coherence, fieldState.closure, fieldState.memory,
    ];
    const tensor = this._alloc();
    for (let a = 0; a < DIMENSION_COUNT; a++) {
      for (let b = 0; b < DIMENSION_COUNT; b++) {
        at(tensor, a)[b] = a === b
          ? this.computeIntrinsicStability(a as DimensionIndex, at(vals, a))
          : this.computeCrossDimensionalStability(a as DimensionIndex, b as DimensionIndex, at(vals, a), at(vals, b));
      }
    }
    for (let a = 0; a < DIMENSION_COUNT; a++) {
      for (let b = a + 1; b < DIMENSION_COUNT; b++) {
        const sym = ((at(at(tensor, a), b) + at(at(tensor, b), a)) / 2.0) as Float64;
        at(tensor, a)[b] = sym;
        at(tensor, b)[a] = sym;
      }
    }
    return tensor;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.2 Intrinsic & Cross-Dimensional Stability
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Intrinsic stability S_{αα}.
   * [MATH] S_{αα} = 1 / (1 + ε_{α} + φ^{-1}·corner_{α})
   * where ε = perfection deficit, corner = discrete Laplacian defect.
   */
  computeIntrinsicStability(dim: DimensionIndex, values: Float64[]): Float64 {
    if (values.length === 0) return 0.0 as Float64;
    const deficit = this.computePerfectionDeficit(values);
    const corner = this.computeCornerDefect(values);
    return (1.0 / (1.0 + deficit + PHI_INV * corner)) as Float64;
  }

  /**
   * [SPEC] Cross-dimensional stability S_{αβ} (α ≠ β).
   * [MATH] S_{αβ} = w_{αβ} · C_{αβ} / (1 + D_{αβ} + L_{αβ})
   */
  computeCrossDimensionalStability(
    a: DimensionIndex, b: DimensionIndex, va: Float64[], vb: Float64[]
  ): Float64 {
    const coherence = this.computeCoherence(va, vb);
    const drift = this.computeDrift(va, vb);
    const leak = this.computeLeak(va, vb);
    const weight = this.computeWeight(a, b);
    return ((weight * coherence) / (1.0 + drift + leak)) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.3 Tensor Constituents
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Coherence C_{αβ} — cosine similarity of two field vectors.
   * [MATH] C = |Σ a_i·b_i| / (sqrt(Σ a_i²)·sqrt(Σ b_i²) + ε)
   */
  computeCoherence(a: Float64[], b: Float64[]): Float64 {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0.0 as Float64;
    let dot = 0.0, na = 0.0, nb = 0.0;
    for (let i = 0; i < len; i++) {
      dot += at(a, i) * at(b, i); na += at(a, i) * at(a, i); nb += at(b, i) * at(b, i);
    }
    return (Math.abs(dot) / (Math.sqrt(na) * Math.sqrt(nb) + 1e-15)) as Float64;
  }

  /**
   * [SPEC] Drift D_{αβ} — mean relative absolute difference.
   * [MATH] D = (1/N) Σ |a_i - b_i| / (max(|a_i|,|b_i|) + ε)
   */
  computeDrift(a: Float64[], b: Float64[]): Float64 {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0.0 as Float64;
    let d = 0.0;
    for (let i = 0; i < len; i++) {
      d += Math.abs(at(a, i) - at(b, i)) / (Math.max(Math.abs(at(a, i)), Math.abs(at(b, i))) + 1e-15);
    }
    return (d / len) as Float64;
  }

  /**
   * [SPEC] Leak L_{αβ} — relative standard-deviation difference.
   * [MATH] L = |σ_A - σ_B| / (σ_A + σ_B + ε)
   */
  computeLeak(a: Float64[], b: Float64[]): Float64 {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0.0 as Float64;
    let ma = 0.0, mb = 0.0;
    for (let i = 0; i < len; i++) { ma += at(a, i); mb += at(b, i); }
    ma /= len; mb /= len;
    let va = 0.0, vb = 0.0;
    for (let i = 0; i < len; i++) { va += (at(a, i) - ma) ** 2; vb += (at(b, i) - mb) ** 2; }
    const sa = Math.sqrt(va / len), sb = Math.sqrt(vb / len);
    return (Math.abs(sa - sb) / (sa + sb + 1e-15)) as Float64;
  }

  /**
   * [SPEC] Dimensional weight w_{αβ}.
   * [MATH] w_{αβ} = φ^{-|α-β|}. Diagonal w_{αα} = 1.0.
   */
  computeWeight(a: DimensionIndex, b: DimensionIndex): Float64 {
    return Math.pow(PHI_INV, Math.abs(a - b)) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.4 Perfection Deficit & Corner Defect (Sphere Principle)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Perfection deficit ε_t = D(Ψ_t, I_smooth).
   * [PHIL] The ideal smooth closure is never attained; ε_t > 0 strictly.
   * [MATH] ε_t = (1/N) Σ |Ψ_i - I_i|² where I is Laplacian-smoothed mean.
   */
  computePerfectionDeficit(values: Float64[]): Float64 {
    const N = values.length;
    if (N === 0) return 0.0 as Float64;
    const ideal = this.computeIdealSmooth(values);
    let deficit = 0.0;
    for (let i = 0; i < N; i++) { const d = at(values, i) - at(ideal, i); deficit += d * d; }
    return (deficit / N) as Float64;
  }

  /**
   * [SPEC] Approximate ideal smooth closure manifold I_smooth.
   * [MATH] I_i = (φ^{-1}·μ + φ^{-3}·Ψ_{i-1} + φ^{-3}·Ψ_{i+1}) / (φ^{-1} + 2·φ^{-3})
   */
  computeIdealSmooth(values: Float64[]): Float64[] {
    const N = values.length;
    if (N === 0) return [];
    let mean = 0.0;
    for (const v of values) mean += v;
    mean /= N;
    const ideal: Float64[] = new Array(N);
    const denom = PHI_INV + 2.0 * PHI_NEG3;
    for (let i = 0; i < N; i++) {
      const l = at(values, (i - 1 + N) % N), r = at(values, (i + 1) % N);
      ideal[i] = ((PHI_INV * mean + PHI_NEG3 * l + PHI_NEG3 * r) / denom) as Float64;
    }
    return ideal;
  }

  /**
   * [SPEC] Corner defect (No-Corner Ideal, Section 11.2).
   * [MATH] defect = Σ (Ψ_{i-1} - 2Ψ_i + Ψ_{i+1})²
   */
  computeCornerDefect(values: Float64[]): Float64 {
    const N = values.length;
    if (N < 3) return 0.0 as Float64;
    let defect = 0.0;
    for (let i = 0; i < N; i++) {
      const l = at(values, (i - 1 + N) % N), c = at(values, i), r = at(values, (i + 1) % N);
      const lap = l - 2.0 * c + r;
      defect += lap * lap;
    }
    return defect as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.5 Global Stability & Eigenvalues
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Global stability S_global = (1/49) Σ_{α,β} S_{αβ}.
   * [MATH] Unweighted mean over all 49 entries.
   */
  computeGlobalStability(): Float64 {
    let total = 0.0;
    for (let a = 0; a < DIMENSION_COUNT; a++) {
      for (let b = 0; b < DIMENSION_COUNT; b++) total += at(at(this.tensor, a), b);
    }
    return (total / (DIMENSION_COUNT * DIMENSION_COUNT)) as Float64;
  }

  /**
   * [SPEC] Eigenvalues of the symmetrized 7×7 tensor via Jacobi iteration.
   * [MATH] 50 sweeps guarantee convergence to ~1e-15 for n=7.
   * [FIX] Returns diagonal of converged matrix = eigenvalues.
   */
  computeEigenvalues(): Float64[] {
    const n = DIMENSION_COUNT;
    const M = this._copy(this.tensor);
    const V = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => ((i === j ? 1.0 : 0.0) as Float64))
    );
    for (let sweep = 0; sweep < 50; sweep++) {
      let max = 0.0, p = 0, q = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const av = Math.abs(at(at(M, i), j));
          if (av > max) { max = av; p = i; q = j; }
        }
      }
      if (max < 1e-15) break;
      const diff = at(at(M, q), q) - at(at(M, p), p);
      const phi = 0.5 * Math.atan2(2.0 * at(at(M, p), q), diff);
      const c = Math.cos(phi), s = Math.sin(phi);
      const app = at(at(M, p), p), aqq = at(at(M, q), q), apq = at(at(M, p), q);
      at(M, p)[p] = (c * c * app - 2.0 * c * s * apq + s * s * aqq) as Float64;
      at(M, q)[q] = (s * s * app + 2.0 * c * s * apq + c * c * aqq) as Float64;
      at(M, p)[q] = 0.0 as Float64; at(M, q)[p] = 0.0 as Float64;
      for (let i = 0; i < n; i++) {
        if (i !== p && i !== q) {
          const aip = at(at(M, i), p), aiq = at(at(M, i), q);
          at(M, i)[p] = (c * aip - s * aiq) as Float64; at(M, p)[i] = at(M, i)[p];
          at(M, i)[q] = (s * aip + c * aiq) as Float64; at(M, q)[i] = at(M, i)[q];
        }
      }
      for (let i = 0; i < n; i++) {
        const vip = at(at(V, i), p), viq = at(at(V, i), q);
        at(V, i)[p] = (c * vip - s * viq) as Float64;
        at(V, i)[q] = (s * vip + c * viq) as Float64;
      }
    }
    return M.map((row, i) => row[i] as Float64);
  }

  /**
   * [SPEC] Positive-definite check (Test T5).
   * [MATH] True iff all eigenvalues > 0.
   */
  checkPositiveDefinite(): boolean {
    return this.eigenvalues.every((ev) => ev > 0.0);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.6 Cross-Dimensional Coupling
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Cross-dimensional coupling strength.
   * [MATH] |S_{αβ}| / sqrt(S_{αα}·S_{ββ})
   * [PHIL] Perturbation propagation from α into β.
   */
  computeCrossDimensionalCoupling(src: DimensionIndex, tgt: DimensionIndex): Float64 {
    const num = Math.abs(at(at(this.tensor, src), tgt));
    const denom = Math.sqrt(at(at(this.tensor, src), src) * at(at(this.tensor, tgt), tgt)) + 1e-15;
    return (num / denom) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.7 Stability Equation (Section 11.2)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Scalar stability equation S_t.
   * [MATH] S_t = α·Q_total + β·r_t + γ·P_t - μ·D_t - ν·L_t - ξ·ε_excess
   * α=φ^{-1}, β=φ^{-2}, γ=φ^{-3}, μ=φ^{-4}, ν=φ^{-5}, ξ=φ^{-8}.
   */
  computeStabilityEquation(
    Q_total: Float64, coherence: Float64, persistence: Float64,
    drift: Float64, leak: Float64, epsilon_excess: Float64
  ): Float64 {
    const alpha = PHI_INV, beta = PHI_NEG2, gamma = PHI_NEG3;
    const mu = (PHI_NEG3 * PHI_INV) as Float64; // φ^{-4}
    const nu = PHI_NEG5, xi = PHI_NEG8;
    return (
      alpha * Q_total + beta * coherence + gamma * persistence
      - mu * drift - nu * leak - xi * epsilon_excess
    ) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.8 Continuity Law (Section 4)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Continuity bounds δ_min, δ_max for a scale index.
   * [MATH] qrf(n) = φ^{-n/89}; δ_min = φ^{-1}·qrf; δ_max = φ²·qrf.
   */
  getContinuityBounds(scaleIndex: number): ContinuityBounds {
    const qrf = Math.pow(PHI_INV, scaleIndex / QRF_CRITICAL_SCALE) as Float64;
    return {
      deltaMin: (PHI_INV * qrf) as Float64,
      deltaMax: (PHI_SQUARED * qrf) as Float64,
    };
  }

  /**
   * [SPEC] Continuity_t measure (Section 4.2, 11.2).
   * [MATH] Continuity_t = C(Ψ_t, Ψ_{t-1}) · (1 - |ε_t - ε_{t-1}| / (ε_t + ε_{t-1} + ε))
   * [PHIL] Continuity is constrained nonidentity.
   */
  computeContinuity(curr: Float64[], prev: Float64[]): Float64 {
    const len = Math.min(curr.length, prev.length);
    if (len === 0) return 0.0 as Float64;
    let dot = 0.0, nc = 0.0, np = 0.0;
    for (let i = 0; i < len; i++) {
      dot += at(curr, i) * at(prev, i); nc += at(curr, i) * at(curr, i); np += at(prev, i) * at(prev, i);
    }
    const tc = (Math.abs(dot) / (Math.sqrt(nc) * Math.sqrt(np) + 1e-15)) as Float64;
    const eps = this.currentEpsilon + this.previousEpsilon + 1e-15;
    const epsStab = (1.0 - Math.abs(this.currentEpsilon - this.previousEpsilon) / eps) as Float64;
    return (tc * epsStab) as Float64;
  }

  /**
   * [SPEC] Enforce continuity bounds on a scalar distance.
   * [MATH] Smooth step: 0.5·(1 + x / sqrt(x² + ε)).
   * [FIX] Returns 1.0 inside bounds, 0.0 outside, smooth transition.
   */
  enforceContinuityBounds(distance: Float64, scaleIndex: number): Float64 {
    const b = this.getContinuityBounds(scaleIndex);
    const step = (x: Float64) => (0.5 * (1.0 + x / Math.sqrt(x * x + 1e-12))) as Float64;
    return (step(distance - b.deltaMin) * step(b.deltaMax - distance)) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.9 Burden & Temporal Evolution
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Total burden (Section 11.5).
   * [MATH] burden = w_m·|M| + w_meas·|M_cycle| + w_c·(1-Q) + w_s·SC + w_t·T
   * Weights: w_m=φ^{-1}, w_meas=φ^{-2}, w_c=φ^{-3}, w_s=φ^{-5}, w_t=φ^{-8}.
   */
  computeTotalBurden(
    memory: Float64[], Q_total: Float64, scale: Float64[],
    curr: Float64[], prev: Float64[]
  ): Float64 {
    const w_m = PHI_INV, w_meas = PHI_NEG2, w_c = PHI_NEG3, w_s = PHI_NEG5, w_t = PHI_NEG8;
    // Memory burden L2 norm
    let mSum = 0.0;
    for (const v of memory) mSum += v * v;
    const M = Math.sqrt(mSum);
    // Measurement burden = Frobenius norm of tensor
    let meas = 0.0;
    for (let a = 0; a < DIMENSION_COUNT; a++) {
      for (let b = 0; b < DIMENSION_COUNT; b++) {
        const t = at(at(this.tensor, a), b); meas += t * t;
      }
    }
    const Meas = Math.sqrt(meas);
    // Closure burden
    const C = 1.0 - Q_total;
    // Cross-scale burden (mean pairwise relative difference)
    const N = scale.length;
    let sc = 0.0, pairs = 0;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        sc += Math.abs(at(scale, i) - at(scale, j)) / (Math.max(Math.abs(at(scale, i)), Math.abs(at(scale, j))) + 1e-15);
        pairs++;
      }
    }
    const SC = pairs > 0 ? sc / pairs : 0.0;
    // Temporal burden (mean relative change)
    const len = Math.min(curr.length, prev.length);
    let tSum = 0.0;
    for (let i = 0; i < len; i++) {
      tSum += Math.abs(at(curr, i) - at(prev, i)) / (Math.max(Math.abs(at(curr, i)), Math.abs(at(prev, i))) + 1e-15);
    }
    const T = len > 0 ? tSum / len : 0.0;
    return (w_m * M + w_meas * Meas + w_c * C + w_s * SC + w_t * T) as Float64;
  }

  /**
   * [SPEC] Frobenius norm of tensor evolution.
   * [MATH] ||ΔS||_F = sqrt(Σ (S_{αβ}^t - S_{αβ}^{t-1})²)
   */
  getTemporalEvolution(): Float64 {
    let sum = 0.0;
    for (let a = 0; a < DIMENSION_COUNT; a++) {
      for (let b = 0; b < DIMENSION_COUNT; b++) {
        const d = at(at(this.tensor, a), b) - at(at(this.previousTensor, a), b);
        sum += d * d;
      }
    }
    return Math.sqrt(sum) as Float64;
  }

  /**
   * [SPEC] Extract intrinsic stability vector (diagonal).
   * [MATH] [S_{00}, S_{11}, ..., S_{66}]
   */
  getStabilityVector(): Float64[] {
    return Array.from({ length: DIMENSION_COUNT }, (_, i) => at(this.tensor, i)[i]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Standalone Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] qrf attenuation factor.
 * [MATH] qrf(n) = φ^{-n/89}.
 */
export function computeQRF(scaleIndex: number): Float64 {
  return Math.pow(PHI_INV, scaleIndex / QRF_CRITICAL_SCALE) as Float64;
}

/**
 * [SPEC] Determinism verification utility (Test T1–T20).
 * [FIX] Runs 5 identical constructions and compares snapshots.
 */
export function verifyDeterminism(fieldState: FieldState, runs = 5): boolean {
  const ds = new DimensionalStability(fieldState);
  const first = JSON.stringify({
    t: ds.tensor, e: ds.eigenvalues, g: ds.globalStability, p: ds.checkPositiveDefinite(),
  });
  for (let i = 1; i < runs; i++) {
    const ds2 = new DimensionalStability(fieldState);
    const next = JSON.stringify({
      t: ds2.tensor, e: ds2.eigenvalues, g: ds2.globalStability, p: ds2.checkPositiveDefinite(),
    });
    if (next !== first) return false;
  }
  return true;
}
