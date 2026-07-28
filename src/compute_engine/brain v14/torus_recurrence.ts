/**
 * RHUFT v13 — Torus Recurrence: Chapter 6 — The Torus as Local Self-Sustaining Recursion
 *
 * Implements toroidal shift operators, toroidal coherence scoring, delayed
 * feedback loops, and phase comparison for recurrent memory dynamics.
 *
 * [PHIL] — The torus is the local geometry of self-sustaining recursive
 * circulation. It supports recurrence, return, and persistent cyclic process.
 * Memory naturally arises from toroidal re-entry. Self-reference emerges when
 * a process receives and compares its own returned trace.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI,
  PHI_INV,
  PHI_NEG2,
  CLOSURE_COUPLING,
  PI,
} from "./core/constants.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Toroidal Grid Mapping — 1D Array ↔ 2D Torus (major × minor)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute default toroidal grid dimensions for a field of given length.
 *
 * [MATH] — The torus has two fundamental cycles: major and minor. We map
 * a 1D array to a 2D grid by choosing dimensions that multiply to the field
 * length. If the length is not factorizable, we pad to the next valid size.
 *
 * For a 28-element field (14 complex pairs), we use 7×4 (major=7, minor=4).
 * For other lengths, we find the closest factor pair.
 *
 * @param length — Field array length.
 * @returns { majorSteps, minorSteps } where majorSteps × minorSteps ≥ length.
 */
function _toroidalGridDimensions(length: number): { majorSteps: number; minorSteps: number } {
  // For 28 elements: 7 × 4 = 28 (classic toroidal mapping)
  if (length === 28) return { majorSteps: 7, minorSteps: 4 };
  if (length === 14) return { majorSteps: 7, minorSteps: 2 };
  if (length === 56) return { majorSteps: 7, minorSteps: 8 };

  // General factorization: find the pair closest to square
  let bestMajor = 1;
  let bestMinor = length;
  let bestDiff = Math.abs(length - 1);

  for (let major = 1; major <= Math.sqrt(length); major++) {
    if (length % major === 0) {
      const minor = length / major;
      const diff = Math.abs(major - minor);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMajor = major;
        bestMinor = minor;
      }
    }
  }

  return { majorSteps: bestMajor, minorSteps: bestMinor };
}

/**
 * Map 1D index to 2D toroidal coordinates (major, minor).
 */
function _toTorusCoords(
  index: number,
  majorSteps: number,
  minorSteps: number
): { major: number; minor: number } {
  return {
    major: index % majorSteps,
    minor: Math.floor(index / majorSteps) % minorSteps,
  };
}

/**
 * Map 2D toroidal coordinates (major, minor) to 1D index.
 */
function _fromTorusCoords(
  major: number,
  minor: number,
  majorSteps: number
): number {
  return minor * majorSteps + major;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Toroidal Shift Operator — Shift Along Major/Minor Cycles
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shift a field along the toroidal cycles with wrap-around.
 *
 * [MATH] — The torus has two angular coordinates: u (major circulation) and
 * v (minor circulation). Shifting by (δ₁, δ₂) moves the field around both cycles
 * with periodic boundary conditions. This is the toroidal equivalent of a
 * translation operator.
 *
 * @param field — Input field array (interleaved complex or real).
 * @param deltaMajor — Shift along major cycle (can be negative, wraps around).
 * @param deltaMinor — Shift along minor cycle (can be negative, wraps around).
 * @returns New shifted Float64Array of same length.
 */
export function toroidalShift(
  field: Float64Array,
  deltaMajor: number,
  deltaMinor: number
): Float64Array {
  const len = field.length;
  if (len === 0) return new Float64Array(0);

  const { majorSteps, minorSteps } = _toroidalGridDimensions(len);
  const result = new Float64Array(len);

  for (let i = 0; i < len; i++) {
    const { major, minor } = _toTorusCoords(i, majorSteps, minorSteps);
    const newMajor = ((major + deltaMajor) % majorSteps + majorSteps) % majorSteps;
    const newMinor = ((minor + deltaMinor) % minorSteps + minorSteps) % minorSteps;
    const j = _fromTorusCoords(newMajor, newMinor, majorSteps);
    if (j < len) {
      result[j] = field[i] ?? 0;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Toroidal Coherence — Autocorrelation After Shift
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute toroidal coherence: autocorrelation after toroidal shift.
 *
 * [MATH] — C_tor(δ₁, δ₂) = |∫ Ψ · Ψ_shifted|² / (∫|Ψ|²)². This measures how
 * well the field matches itself after recurrence around the toroidal cycles.
 * Perfect recurrence → C_tor = 1. Complete decorrelation → C_tor = 0.
 *
 * @param field — Input field array.
 * @param deltaMajor — Shift along major cycle.
 * @param deltaMinor — Shift along minor cycle.
 * @returns Toroidal coherence in [0, 1].
 */
export function toroidalCoherence(
  field: Float64Array,
  deltaMajor: number,
  deltaMinor: number
): Float64 {
  const len = field.length;
  if (len === 0) return 0 as Float64;

  const shifted = toroidalShift(field, deltaMajor, deltaMinor);

  let dotProduct = 0.0;
  let normSquared = 0.0;

  for (let i = 0; i < len; i++) {
    const f = field[i] ?? 0;
    const s = shifted[i] ?? 0;
    dotProduct += f * s;
    normSquared += f * f;
  }

  if (normSquared === 0) return 0 as Float64;

  const coherence = (dotProduct * dotProduct) / (normSquared * normSquared);
  // Clamp to [0, 1] for floating-point safety
  return (coherence < 0 ? 0 : coherence > 1 ? 1 : coherence) as Float64;
}

/**
 * Compute average toroidal coherence over a range of shifts.
 *
 * [MATH] — Average coherence over all non-zero shifts within a window.
 * This measures the overall "recurrent stability" of the field.
 */
export function averageToroidalCoherence(
  field: Float64Array,
  maxShiftMajor: number = 1,
  maxShiftMinor: number = 1
): Float64 {
  let sum = 0.0;
  let count = 0;

  for (let dm = -maxShiftMajor; dm <= maxShiftMajor; dm++) {
    for (let dn = -maxShiftMinor; dn <= maxShiftMinor; dn++) {
      if (dm === 0 && dn === 0) continue; // skip identity
      sum += toroidalCoherence(field, dm, dn);
      count++;
    }
  }

  return (count > 0 ? sum / count : 0) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Delayed Feedback — α·current + β·memory_delayed
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply delayed toroidal feedback: blend current field with memory after shift.
 *
 * [MATH] — Ψ_{t+1} = α · T[Ψ_t] + β · R[Ψ_{t-τ}]. This is the core toroidal
 * recurrence equation. T is the transport operator (identity here, or shift),
 * R is the recurrent injection operator (shifted memory). The delay τ is
 * implemented as a toroidal shift of the memory field.
 *
 * [PHIL] — The torus supports persistent circulation classes that cannot simply
 * collapse to a point. The delayed feedback creates a memory loop where the
 * field revisits itself, creating the seed of self-reference.
 *
 * @param current — Current field state.
 * @param memory — Memory field state (from previous tick).
 * @param alpha — Weight for current (transport coefficient). [SPEC] Default 1/φ.
 * @param beta — Weight for memory (recurrence coefficient). [SPEC] Default 1/φ².
 * @param delay — Toroidal shift delay (applied to memory before blending).
 * @returns Blended field.
 */
export function delayedFeedback(
  current: Float64Array,
  memory: Float64Array,
  alpha: number = PHI_INV,
  beta: number = PHI_NEG2,
  delay: number = 0
): Float64Array {
  const len = current.length;
  if (len === 0) return new Float64Array(0);

  // Apply toroidal shift to memory if delay is non-zero
  const shiftedMemory = delay !== 0 ? toroidalShift(memory, delay, 0) : new Float64Array(memory);

  const result = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const c = current[i] ?? 0;
    const m = shiftedMemory[i] ?? 0;
    result[i] = (alpha * c + beta * m) as Float64;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Phase Comparison — Phase Difference Between Current and Returned
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute phase difference between two interleaved complex fields.
 *
 * [MATH] — For each complex pair (Re, Im), compute the phase angle via atan2.
 * The phase difference is Δθ = θ₁ - θ₂, wrapped to [-π, π]. This measures
 * the angular drift between the current field and a returned/reflected trace.
 *
 * @param current — Current interleaved complex field [Re₀, Im₀, Re₁, Im₁, ...].
 * @param returned — Returned/reflected interleaved complex field.
 * @returns Real-valued array of phase differences (one per complex element).
 */
export function phaseComparison(
  current: Float64Array,
  returned: Float64Array
): Float64Array {
  const n = Math.floor(Math.min(current.length, returned.length) / 2);
  if (n === 0) return new Float64Array(0);

  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const re1 = current[2 * i] ?? 0;
    const im1 = current[2 * i + 1] ?? 0;
    const re2 = returned[2 * i] ?? 0;
    const im2 = returned[2 * i + 1] ?? 0;

    const theta1 = Math.atan2(im1, re1);
    const theta2 = Math.atan2(im2, re2);
    let diff = theta1 - theta2;

    // Wrap to [-π, π]
    while (diff > PI) diff -= 2 * PI;
    while (diff < -PI) diff += 2 * PI;

    result[i] = diff as Float64;
  }

  return result;
}

/**
 * Compute phase drift metric: mean squared phase difference.
 *
 * [MATH] — D_phase = (1/N) Σ (Δθ_i)². This is the core "drift from ideal"
 * metric for self-measurement. High drift means the returned trace differs
 * significantly from the current state, indicating instability or mismatch.
 *
 * @param current — Current interleaved complex field.
 * @param returned — Returned/reflected interleaved complex field.
 * @returns Phase drift (non-negative, 0 = perfect match).
 */
export function phaseDriftMetric(
  current: Float64Array,
  returned: Float64Array
): Float64 {
  const diffs = phaseComparison(current, returned);
  const n = diffs.length;
  if (n === 0) return 0 as Float64;

  let sumSq = 0.0;
  for (let i = 0; i < n; i++) {
    const d = diffs[i] ?? 0;
    sumSq += d * d;
  }

  return (sumSq / n) as Float64;
}

/**
 * Compute weighted phase drift with a preference for small differences.
 *
 * [MATH] — D_weighted = (1/N) Σ (Δθ_i)² · w(|Δθ_i|) where w(x) = 1/(1+x²/φ²).
 * This weights large phase differences more heavily, emphasizing catastrophic
 * drift over minor fluctuations.
 */
export function weightedPhaseDrift(
  current: Float64Array,
  returned: Float64Array
): Float64 {
  const diffs = phaseComparison(current, returned);
  const n = diffs.length;
  if (n === 0) return 0 as Float64;

  let sum = 0.0;
  const phiSq = PHI * PHI;
  for (let i = 0; i < n; i++) {
    const d = diffs[i] ?? 0;
    const weight = 1.0 / (1.0 + (d * d) / phiSq);
    sum += d * d * weight;
  }

  return (sum / n) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Toroidal Memory — Persistent Recurrence Tracking
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Toroidal memory state for tracking recurrent field traces.
 *
 * [PHIL] — Memory naturally arises from toroidal re-entry. When a process
 * receives and compares its own returned trace, it creates a memory loop.
 * The toroidal structure provides the geometric framework for this recurrence.
 */
export class ToroidalMemory {
  private _memory: Float64Array;
  private _delay: number;
  private _alpha: number;
  private _beta: number;

  constructor(
    fieldLength: number,
    delay: number = 0,
    alpha: number = PHI_INV,
    beta: number = PHI_NEG2
  ) {
    this._memory = new Float64Array(fieldLength);
    this._delay = delay;
    this._alpha = alpha;
    this._beta = beta;
  }

  /**
   * Update memory with the current field state.
   *
   * [MATH] — Memory update: M_{t+1} = α · Ψ_t + β · M_t. This is a simple
   * exponential moving average with φ-scaled weights. The memory retains a
   * trace of prior states, enabling temporal comparison and self-measurement.
   */
  update(current: Float64Array): void {
    const len = Math.min(current.length, this._memory.length);
    for (let i = 0; i < len; i++) {
      this._memory[i] = (this._alpha * (current[i] ?? 0) + this._beta * this._memory[i]) as Float64;
    }
  }

  /**
   * Apply delayed feedback: blend current with shifted memory.
   */
  apply(current: Float64Array): Float64Array {
    return delayedFeedback(current, this._memory, this._alpha, this._beta, this._delay);
  }

  /**
   * Get the current memory state (copy).
   */
  getMemory(): Float64Array {
    return new Float64Array(this._memory);
  }

  /**
   * Reset memory to zero.
   */
  reset(): void {
    this._memory.fill(0);
  }

  /**
   * Compute phase drift between current field and memory.
   */
  phaseDrift(current: Float64Array): Float64 {
    return phaseDriftMetric(current, this._memory);
  }

  /**
   * Compute toroidal coherence of the memory.
   */
  coherence(): Float64 {
    return averageToroidalCoherence(this._memory, 1, 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Toroidal Shift Variants — Specialized Shifts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shift along the major cycle only (poloidal circulation).
 */
export function shiftMajor(field: Float64Array, delta: number): Float64Array {
  return toroidalShift(field, delta, 0);
}

/**
 * Shift along the minor cycle only (toroidal circulation).
 */
export function shiftMinor(field: Float64Array, delta: number): Float64Array {
  return toroidalShift(field, 0, delta);
}

/**
 * Shift along both cycles with the same delta (diagonal circulation).
 */
export function shiftDiagonal(field: Float64Array, delta: number): Float64Array {
  return toroidalShift(field, delta, delta);
}
