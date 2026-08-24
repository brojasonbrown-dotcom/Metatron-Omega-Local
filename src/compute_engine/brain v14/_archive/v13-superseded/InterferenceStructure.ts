/**
 * InterferenceStructure.ts — RHUFT v13 Fractal Node Engine
 *
 * [SPEC] Implements cross-mode interference analysis, mode coherence matrix,
 * phase locking index, and beat frequency spectrum per
 * RHUFT Foundational Logic Extraction v1, Sections 6 and 11.4.
 *
 * [PHIL] The superposition Ψ = Σ_k φ^(-k) e^(iθ_k) is not merely a sum;
 * it is an interference pattern. The phase relationships between modes
 * determine whether the field actualizes constructively or destructively.
 *
 * [MATH] All arithmetic is IEEE-754 Float64. Deterministic. No randomness.
 * Scale-invariant via φ-law constants from `./core/constants.ts`.
 *
 * Epistemic labels: [SPEC], [PHIL], [MATH], [FIX].
 */

import type { Float64 } from "./types.ts";

import {
  PHI,
  PHI_INV,
  PHI_SQUARED,
  PHI_NEG2,
  PI,
  TWO_PI,
  MASTER_EQUATION_N,
  QRF_CRITICAL_SCALE,
  PLANCK_FREQUENCY,
} from "./core/constants.ts";
import { at } from "./core/indexing.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Constants & Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** [MATH] Number of geometric modes in the Master Equation: N = 13 + 1 terms. */
export const DEFAULT_MODE_COUNT = MASTER_EQUATION_N + 1; // 14

/**
 * [MATH] Phase-lock threshold: π/φ² ≈ 1.20096 rad.
 *
 * [PHIL] Two modes are considered phase-locked only when their circular
 * phase difference is smaller than this φ-scale proportional bound.
 * The threshold is deliberately strict to avoid conflating constructive
 * interference with coincidental alignment.
 */
export const LOCK_THRESHOLD: Float64 = (PI / PHI_SQUARED) as Float64;

/**
 * [MATH] Deterministic phase angle θ_k = 2π·k·φ⁻¹·n / 89.
 *
 * [SPEC] The phase is derived from the scale parameter n and the QRF
 * critical scale 89. It is periodic in [0, 2π) and computed without
 * any stochastic component.
 */
export function computePhaseAngle(k: number, n: number): Float64 {
  const base = (TWO_PI * k * PHI_INV * n) / QRF_CRITICAL_SCALE;
  const normalized = base % TWO_PI;
  return (normalized >= 0 ? normalized : normalized + TWO_PI) as Float64;
}

/**
 * [MATH] Circular difference on the unit circle.
 *
 * Returns the minimal absolute angular distance between two angles
 * measured in radians, accounting for the 2π wrap-around.
 */
export function circularDifference(a: Float64, b: Float64): Float64 {
  let diff = Math.abs(a - b) % TWO_PI;
  if (diff > PI) {
    diff = TWO_PI - diff;
  }
  return diff as Float64;
}

/**
 * [MATH] Amplitude weight a_k = φ^(-k).
 *
 * [SPEC] The Master Equation uses φ-weighted geometric series amplitudes.
 */
export function computeAmplitude(k: number): Float64 {
  return Math.pow(PHI_INV, k) as Float64;
}

/**
 * [MATH] Phase-lock factor lock_{kj}.
 *
 * [SPEC] lock_{kj} = 1 if the circular phase difference between modes k
 * and j is strictly smaller than LOCK_THRESHOLD; otherwise 0.
 */
export function computeLock(phaseDiff: Float64): Float64 {
  return (phaseDiff < LOCK_THRESHOLD ? 1.0 : 0.0) as Float64;
}

/**
 * [SPEC] Characteristic frequency of mode k: f_k = f_P · φ^(-k).
 *
 * [MATH] Derived from the RHUFT scaling law f(n) = f_P · φ^(-n).
 */
export function computeModeFrequency(k: number): Float64 {
  return (PLANCK_FREQUENCY * Math.pow(PHI_INV, k)) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Single geometric mode descriptor for interference analysis.
 *
 * Each mode k carries a deterministic φ-weighted amplitude and phase.
 */
export interface InterferenceMode {
  /** Mode index k = 0..M-1. */
  readonly k: number;
  /** φ-weighted amplitude a_k = φ^(-k). */
  readonly amplitude: Float64;
  /** Deterministic phase angle θ_k in radians. */
  readonly phase: Float64;
}

/**
 * [SPEC] Complete deterministic interference analysis for a given
 * scale parameter n and mode count M.
 *
 * [MATH] All numeric fields are IEEE-754 Float64 computed without
 * randomness or entropy injection.
 */
export interface InterferenceAnalysis {
  /** Scale parameter n used in θ_k = 2πkφ⁻¹n/89. */
  readonly n: number;
  /** Number of modes M (default 14). */
  readonly modeCount: number;
  /** Per-mode amplitude and phase descriptors. */
  readonly modes: readonly InterferenceMode[];
  /** Σ_k |a_k|² — the self (incoherent) intensity. */
  readonly selfIntensity: Float64;
  /** Σ_{k≠j} a_k a_j cos(θ_k-θ_j) lock_{kj} — the cross (coherent) intensity. */
  readonly crossIntensity: Float64;
  /** |Ψ|² = selfIntensity + crossIntensity. */
  readonly totalIntensity: Float64;
  /**
   * M×M mode coherence matrix C_{kj} = cos(θ_k - θ_j).
   *
   * Stored as a flat Float64Array in row-major order: index = k*M + j.
   * Values lie in [-1, 1]. Diagonal entries are 1.0.
   */
  readonly modeCoherenceMatrix: Float64Array;
  /**
   * M×M phase-lock matrix lock_{kj}.
   *
   * Stored as a flat Float64Array in row-major order.
   * Binary values: 1.0 (locked) or 0.0 (slipping). Diagonal entries are 1.0.
   */
  readonly phaseLockMatrix: Float64Array;
  /** Scalar phase locking index = average of upper-triangular lock entries. */
  readonly phaseLockingIndex: Float64;
  /** Kuramoto order parameter R = |Σ e^{iθ_k}| / M. */
  readonly orderParameter: Float64;
  /**
   * M×M beat frequency matrix: |f_k - f_j| in Hz.
   *
   * Stored as a flat Float64Array in row-major order. Diagonal is 0.0.
   */
  readonly beatFrequencyMatrix: Float64Array;
  /** Sorted unique beat frequencies for all pairs k < j (Hz). */
  readonly beatFrequencySpectrum: Float64Array;
  /**
   * Per-mode interference quality q_k = Σ_j a_j cos(θ_k - θ_j) lock_{kj}.
   *
   * This measures how constructively mode k interferes with the total field.
   */
  readonly interferenceQuality: Float64Array;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. InterferenceStructure Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Computes the full interference structure of the geometric
 * superposition Ψ = Σ_k a_k e^(iθ_k) for a deterministic scale parameter n.
 *
 * [MATH] Precomputes all pairwise quantities in the constructor so that
 * every accessor is O(1). The algorithms are bit-for-bit deterministic
 * given the same inputs.
 *
 * [PHIL] The interference pattern is the engine’s self-measurement of
 * how its own modes relate to one another. Phase locking is not
 * a synchronization of oscillators but a geometric alignment condition.
 */
export class InterferenceStructure {
  /** [MATH] Scale parameter n used in θ_k = 2πkφ⁻¹n/89. */
  readonly n: number;
  /** [MATH] Number of modes M (default 14). */
  readonly modeCount: number;

  private readonly _modes: InterferenceMode[];
  private readonly _selfIntensity: Float64;
  private readonly _crossIntensity: Float64;
  private readonly _totalIntensity: Float64;
  private readonly _coherenceMatrix: Float64Array;
  private readonly _lockMatrix: Float64Array;
  private readonly _beatMatrix: Float64Array;
  private readonly _phaseLockingIndex: Float64;
  private readonly _orderParameter: Float64;
  private readonly _spectrum: Float64Array;
  private readonly _quality: Float64Array;

  /**
   * Construct an interference analysis for scale parameter n.
   *
   * @param n — Scale parameter (e.g., scale index or tick index).
   * @param modeCount — Number of modes M (default 14).
   */
  constructor(n: number, modeCount: number = DEFAULT_MODE_COUNT) {
    if (!Number.isInteger(modeCount) || modeCount < 1) {
      throw new Error(
        `[SPEC] modeCount must be a positive integer, got ${modeCount}`
      );
    }
    this.n = n;
    this.modeCount = modeCount;

    // ── Precompute mode descriptors ───────────────────────────────────────
    const modes: InterferenceMode[] = new Array(modeCount);
    const amplitudes = new Float64Array(modeCount);
    const phases = new Float64Array(modeCount);
    const frequencies = new Float64Array(modeCount);

    for (let k = 0; k < modeCount; k++) {
      const a = computeAmplitude(k);
      const theta = computePhaseAngle(k, n);
      const f = computeModeFrequency(k);
      amplitudes[k] = a;
      phases[k] = theta;
      frequencies[k] = f;
      modes[k] = { k, amplitude: a, phase: theta };
    }
    this._modes = modes;

    // ── Precompute pairwise matrices and aggregates ────────────────────
    const M = modeCount;
    const M2 = M * M;
    const coherence = new Float64Array(M2);
    const locks = new Float64Array(M2);
    const beats = new Float64Array(M2);

    let selfIntensity = 0.0;
    let crossIntensity = 0.0;
    let phaseLockSum = 0.0;
    let sumCos = 0.0;
    let sumSin = 0.0;

    // Accumulators for spectrum (unique beat frequencies, k < j)
    const beatSet = new Set<number>();

    for (let k = 0; k < M; k++) {
      const ak = at(amplitudes, k);
      const thetaK = at(phases, k);

      selfIntensity += ak * ak;
      sumCos += Math.cos(thetaK);
      sumSin += Math.sin(thetaK);

      for (let j = 0; j < M; j++) {
        const idx = k * M + j;
        const thetaJ = at(phases, j);
        const diff = circularDifference(thetaK, thetaJ);
        const cosDiff = Math.cos(diff);

        coherence[idx] = cosDiff as Float64;

        const lockVal = k === j ? 1.0 : computeLock(diff);
        locks[idx] = lockVal as Float64;

        const beatVal = Math.abs(at(frequencies, k) - at(frequencies, j)) as Float64;
        beats[idx] = beatVal;

        if (j > k) {
          // Upper-triangular aggregates only
          crossIntensity += 2.0 * ak * at(amplitudes, j) * cosDiff * lockVal;
          phaseLockSum += lockVal;
          beatSet.add(beatVal);
        }
      }
    }

    this._coherenceMatrix = coherence;
    this._lockMatrix = locks;
    this._beatMatrix = beats;

    this._selfIntensity = selfIntensity as Float64;
    this._crossIntensity = crossIntensity as Float64;
    this._totalIntensity = (selfIntensity + crossIntensity) as Float64;

    const pairCount = (M * (M - 1)) / 2;
    this._phaseLockingIndex = (pairCount > 0 ? phaseLockSum / pairCount : 1.0) as Float64;

    this._orderParameter = (
      Math.sqrt(sumCos * sumCos + sumSin * sumSin) / M
    ) as Float64;

    // ── Beat frequency spectrum (sorted unique, k < j) ─────────────────
    const spectrumArray = new Float64Array(beatSet.size);
    let sIdx = 0;
    for (const val of beatSet) {
      spectrumArray[sIdx++] = val;
    }
    spectrumArray.sort((a, b) => a - b);
    this._spectrum = spectrumArray;

    // ── Per-mode interference quality ─────────────────────────────────
    const quality = new Float64Array(M);
    for (let k = 0; k < M; k++) {
      let q = at(amplitudes, k); // j = k term (lock_{kk} = 1, cos(0) = 1)
      for (let j = 0; j < M; j++) {
        if (j === k) continue;
        const idx = k * M + j;
        const lockVal = at(locks, idx);
        if (lockVal > 0.0) {
          q += at(amplitudes, j) * at(coherence, idx) * lockVal;
        }
      }
      quality[k] = q as Float64;
    }
    this._quality = quality;
  }

  /** [SPEC] Per-mode amplitude and phase descriptors. */
  get modes(): readonly InterferenceMode[] {
    return this._modes;
  }

  /** [MATH] Σ_k |a_k|². */
  get selfIntensity(): Float64 {
    return this._selfIntensity;
  }

  /** [MATH] Σ_{k≠j} a_k a_j cos(θ_k - θ_j) lock_{kj}. */
  get crossIntensity(): Float64 {
    return this._crossIntensity;
  }

  /** [MATH] |Ψ|² = selfIntensity + crossIntensity. */
  get totalIntensity(): Float64 {
    return this._totalIntensity;
  }

  /**
   * [MATH] M×M mode coherence matrix C_{kj} = cos(θ_k - θ_j).
   *
   * Returns a defensive copy as a flat Float64Array in row-major order.
   */
  get modeCoherenceMatrix(): Float64Array {
    return new Float64Array(this._coherenceMatrix);
  }

  /**
   * [SPEC] M×M phase-lock matrix lock_{kj}.
   *
   * Returns a defensive copy as a flat Float64Array in row-major order.
   */
  get phaseLockMatrix(): Float64Array {
    return new Float64Array(this._lockMatrix);
  }

  /** [MATH] Scalar phase locking index (0..1). */
  get phaseLockingIndex(): Float64 {
    return this._phaseLockingIndex;
  }

  /** [MATH] Kuramoto order parameter R = |Σ e^{iθ_k}| / M. */
  get orderParameter(): Float64 {
    return this._orderParameter;
  }

  /**
   * [SPEC] M×M beat frequency matrix |f_k - f_j| in Hz.
   *
   * Returns a defensive copy as a flat Float64Array in row-major order.
   */
  get beatFrequencyMatrix(): Float64Array {
    return new Float64Array(this._beatMatrix);
  }

  /**
   * [SPEC] Sorted unique beat frequencies for all pairs k < j (Hz).
   *
   * Returns a defensive copy as a Float64Array.
   */
  get beatFrequencySpectrum(): Float64Array {
    return new Float64Array(this._spectrum);
  }

  /**
   * [MATH] Per-mode interference quality q_k.
   *
   * Returns a defensive copy as a Float64Array of length M.
   */
  get interferenceQuality(): Float64Array {
    return new Float64Array(this._quality);
  }

  /**
   * [SPEC] Return a complete immutable snapshot of the interference analysis.
   *
   * [PHIL] This snapshot is the engine’s self-measurement of how its
   * own modes constructively and destructively interfere.
   */
  analyze(): InterferenceAnalysis {
    return {
      n: this.n,
      modeCount: this.modeCount,
      modes: this._modes,
      selfIntensity: this._selfIntensity,
      crossIntensity: this._crossIntensity,
      totalIntensity: this._totalIntensity,
      modeCoherenceMatrix: new Float64Array(this._coherenceMatrix),
      phaseLockMatrix: new Float64Array(this._lockMatrix),
      phaseLockingIndex: this._phaseLockingIndex,
      orderParameter: this._orderParameter,
      beatFrequencyMatrix: new Float64Array(this._beatMatrix),
      beatFrequencySpectrum: new Float64Array(this._spectrum),
      interferenceQuality: new Float64Array(this._quality),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Standalone Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Convenience factory that instantiates InterferenceStructure
 * and returns its full analysis snapshot.
 *
 * [MATH] Deterministic — same (n, modeCount) always yields identical
 * bit-for-bit Float64 results.
 */
export function computeInterferenceAnalysis(
  n: number,
  modeCount: number = DEFAULT_MODE_COUNT
): InterferenceAnalysis {
  const structure = new InterferenceStructure(n, modeCount);
  return structure.analyze();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Actualization Objective Helper (optional but required by ontology)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] Compute the interference-weighted actualization objective:
 *
 *   J = Σ_k coherence_k · persistence_k · closure_k · interference_quality_k
 *
 * [PHIL] This is the engine’s selective persistence criterion: modes that
 * are both coherent and constructively interfering are more likely to
 * persist in the actualized field.
 *
 * @param coherence — Per-mode coherence array (length M).
 * @param persistence — Per-mode persistence array (length M).
 * @param closure — Per-mode closure array (length M).
 * @param interferenceQuality — Per-mode interference quality array (length M).
 * @returns Scalar J_actualization.
 */
export function computeActualizationObjective(
  coherence: Float64Array,
  persistence: Float64Array,
  closure: Float64Array,
  interferenceQuality: Float64Array
): Float64 {
  const M = coherence.length;
  if (
    persistence.length !== M ||
    closure.length !== M ||
    interferenceQuality.length !== M
  ) {
    throw new Error(
      `[SPEC] All input arrays must have the same length (got ${M}, ${persistence.length}, ${closure.length}, ${interferenceQuality.length}).`
    );
  }
  let sum = 0.0;
  for (let k = 0; k < M; k++) {
    sum +=
      at(coherence, k) *
      at(persistence, k) *
      at(closure, k) *
      at(interferenceQuality, k);
  }
  return sum as Float64;
}

/** Default export for ergonomic module loading. */
export default InterferenceStructure;
