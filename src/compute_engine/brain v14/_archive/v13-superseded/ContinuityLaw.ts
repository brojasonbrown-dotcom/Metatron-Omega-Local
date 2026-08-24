/**
 * RHUFT v13 — Continuity Law: Chapter 4 — Continuity as Constrained Nonidentity
 *
 * Implements the Continuity Law that bounds the distance between successive states:
 *   0 < δ_min ≤ d(Ψ_t, Ψ_{t+1}) ≤ δ_max
 *
 * [PHIL] — Continuity is not sameness. It is constrained nonidentity.
 * Too little change: the system collapses into an inert fixed point. No progression.
 * No time. No existence. Too much change: the system loses identity. No memory.
 * No self-measurement. The Continuity Law ensures the field evolves within a zone
 * of stable, progressive change — bounded below by necessary change and above by
 * identity-preserving change.
 *
 * [MATH] The distance metric d(Ψ_t, Ψ_{t+1}) is a φ-weighted combination of phase
 * drift, normalized amplitude distance, and coherence loss. The bounds δ_min and
 * δ_max are φ-scale proportional and scale-dependent via the qrf attenuation law.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection, no Math.random(), no Date.now().
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI,
  PHI_INV,
  PHI_NEG2,
  PHI_NEG3,
  PHI_NEG5,
  PI,
  QRF_CRITICAL_SCALE,
  TWO_PI,
  GOLDEN_ANGLE_RAD,
} from "./core/constants.ts";

import {
  phaseDriftMetric,
  phaseComparison,
} from "./torus_recurrence.ts";
import { at } from "./core/indexing.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Exported Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * φ-scale proportional continuity bounds for a given scale index.
 * [SPEC] Both bounds are derived from the qrf attenuation qrf(n) = φ^(-n/89).
 */
export interface ContinuityBounds {
  /** Minimum necessary change for progression (nonzero). */
  readonly deltaMin: Float64;
  /** Maximum allowable change for identity preservation (bounded). */
  readonly deltaMax: Float64;
  /** Scale index used to compute these bounds. */
  readonly scaleIndex: number;
}

/**
 * Complete continuity state for a node at a single tick.
 * [INTEGRATED] Aggregates distance, bounds, coherence, perfection deficit, and
 * the resulting continuity score into a single deterministic snapshot.
 */
export interface ContinuityState {
  /** Global tick index when this state was computed. */
  readonly tick: number;
  /** Distance d(Ψ_t, Ψ_{t+1}) between successive field states. */
  readonly distance: Float64;
  /** Lower bound δ_min for this scale. */
  readonly deltaMin: Float64;
  /** Upper bound δ_max for this scale. */
  readonly deltaMax: Float64;
  /** Whether the distance is strictly within [δ_min, δ_max]. */
  readonly withinBounds: boolean;
  /** Continuity score C_t ∈ [0, 1] — 1 = perfect continuity. */
  readonly continuity: Float64;
  /** Perfection deficit ε_t of the current field. */
  readonly perfectionDeficit: Float64;
  /** Absolute change in perfection deficit |ε_t - ε_{t-1}|. */
  readonly perfectionDeficitDelta: Float64;
  /** Temporal coherence between current and previous state. */
  readonly temporalCoherence: Float64;
  /** Bound enforcement factor B_t ∈ [0, 1] — product of smooth step functions. */
  readonly boundEnforcement: Float64;
}

/** Single entry in a node's continuity history. */
export interface ContinuityHistoryEntry {
  readonly tick: number;
  readonly state: ContinuityState;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Smooth Step & Distance Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Smooth approximation to the Heaviside step function.
 * [MATH] step_smooth(x) = 1 / (1 + exp(-φ · x)).
 * [SPEC] The original spec defines step(x) = 1 if x > 0, 0 otherwise.
 * [FIX] We use a smooth sigmoid to avoid numerical discontinuities.
 */
function smoothStep(x: Float64): Float64 {
  if (x < -100.0) return 0 as Float64;
  if (x > 100.0) return 1 as Float64;
  return (1.0 / (1.0 + Math.exp(-PHI * x))) as Float64;
}

/**
 * Compute the L2 norm difference between two fields.
 * [MATH] d_L2 = sqrt((1/N) · Σ |a_i - b_i|²).
 */
function fieldL2Distance(a: Float64Array, b: Float64Array): Float64 {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0 as Float64;
  let sumSq = 0.0;
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / len) as Float64;
}

/**
 * Compute the normalized amplitude distance between two fields.
 * [MATH] d_amp = sqrt(Σ|a_i - b_i|²) / (sqrt(Σ|a_i|²) + sqrt(Σ|b_i|²) + ε).
 * Normalized to [0, 1] to eliminate absolute scale dependence.
 * [PHIL] This measures relative change, not absolute magnitude.
 */
function normalizedAmplitudeDistance(a: Float64Array, b: Float64Array): Float64 {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0 as Float64;
  let sumSqDiff = 0.0;
  let sumSqA = 0.0;
  let sumSqB = 0.0;
  for (let i = 0; i < len; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    const diff = ai - bi;
    sumSqDiff += diff * diff;
    sumSqA += ai * ai;
    sumSqB += bi * bi;
  }
  const normA = Math.sqrt(sumSqA);
  const normB = Math.sqrt(sumSqB);
  const denom = normA + normB + 1e-300;
  return (Math.sqrt(sumSqDiff) / denom) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Temporal Coherence & Perfection Deficit
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute temporal coherence between two field states.
 * [MATH] C_time = |<Ψ_t | Ψ_{t+1}>|² / (|Ψ_t|² · |Ψ_{t+1}|²).
 * Handles both interleaved complex and real-valued fields.
 * [SPEC] Range [0, 1]. 1 = identical states, 0 = orthogonal.
 */
function computeTemporalCoherence(a: Float64Array, b: Float64Array): Float64 {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0 as Float64;
  if (len % 2 === 0) {
    const n = len / 2;
    let dotRe = 0.0;
    let dotIm = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < n; i++) {
      const aRe = a[2 * i] ?? 0;
      const aIm = a[2 * i + 1] ?? 0;
      const bRe = b[2 * i] ?? 0;
      const bIm = b[2 * i + 1] ?? 0;
      dotRe += aRe * bRe + aIm * bIm;
      dotIm += aRe * bIm - aIm * bRe;
      normA += aRe * aRe + aIm * aIm;
      normB += bRe * bRe + bIm * bIm;
    }
    const product = normA * normB;
    if (product === 0) return 0 as Float64;
    const magnitudeSq = dotRe * dotRe + dotIm * dotIm;
    const raw = magnitudeSq / product;
    return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
  } else {
    let dot = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < len; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dot += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }
    const product = normA * normB;
    if (product === 0) return 0 as Float64;
    const raw = (dot * dot) / product;
    return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
  }
}

/**
 * Compute the perfection deficit ε_t = D(Ψ_t, I_smooth).
 * [MATH] ε_t = (1/N) · Σ |Ψ_t[i] - I[i]|² where I is the ideal smooth closure.
 * [PHIL] The ideal smooth closure is approximated by the isotropic mean field.
 * [SPEC] The perfection deficit is always strictly positive for realized states.
 */
function computePerfectionDeficit(field: Float64Array): Float64 {
  const n = field.length;
  if (n === 0) return 0 as Float64;
  let sum = 0.0;
  for (let i = 0; i < n; i++) {
    sum += field[i] ?? 0;
  }
  const mean = sum / n;
  let sumSq = 0.0;
  for (let i = 0; i < n; i++) {
    const diff = (field[i] ?? 0) - mean;
    sumSq += diff * diff;
  }
  return (sumSq / n) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Distance Metric d(Ψ_t, Ψ_{t+1})
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the distance d(Ψ_t, Ψ_{t+1}) between two successive field states.
 * [MATH] d = w_phase · D_phase + w_amp · d_amp + w_coher · (1 - C_time)
 * where w_phase = 1/φ, w_amp = 1/φ², w_coher = 1/φ³.
 * [PHIL] This distance is a φ-weighted combination of phase drift, amplitude
 * change, and coherence loss, capturing the full geometric change between states.
 * [SPEC] The distance must be positive for any non-identical states.
 */
export function computeDistance(current: Float64Array, next: Float64Array): Float64 {
  const len = Math.min(current.length, next.length);
  if (len === 0) return 0 as Float64;
  const phaseDrift = phaseDriftMetric(current, next);
  const ampDist = normalizedAmplitudeDistance(current, next);
  const coherence = computeTemporalCoherence(current, next);
  const coherenceLoss = 1.0 - coherence;
  const wPhase = PHI_INV;    // ≈ 0.618
  const wAmp = PHI_NEG2;      // ≈ 0.382
  const wCoher = PHI_NEG3;    // ≈ 0.236
  const distance = wPhase * phaseDrift + wAmp * ampDist + wCoher * coherenceLoss;
  return (distance < 0 ? 0 : distance) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ContinuityLaw Class — Enforce Constrained Nonidentity
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Implements the Continuity Law: 0 < δ_min ≤ d(Ψ_t, Ψ_{t+1}) ≤ δ_max.
 *
 * [PHIL] Continuity is not sameness. It is constrained nonidentity.
 * Too little change: collapse into inert fixed point. Too much change: loss of identity.
 * The Continuity Law ensures the field evolves within the zone of stable,
 * progressive change — bounded below by necessary change and above by identity.
 *
 * [MATH] The bounds are φ-scale proportional and scale-dependent:
 *   δ_min(n) = φ⁻³ · qrf(n)   where qrf(n) = φ^(-n/89)
 *   δ_max(n) = φ · qrf(n)
 * The continuity at time t is:
 *   Continuity_t = C · S_ε · B
 * where C = temporal coherence, S_ε = perfection deficit stability,
 * B = bound enforcement factor (smooth step product).
 *
 * [SPEC] The bounds are strictly positive and finite for all realized scales.
 * [FIX] The step function signs in the original spec are corrected to enforce
 * d ∈ [δ_min, δ_max] rather than the mutually exclusive violations.
 * [INTEGRATED] Integrates with TemporalEngine (coherence, phase drift) and
 * SelfMeasurementCycle (discrepancy) to provide a unified continuity score.
 */
export class ContinuityLaw {
  private readonly _history: Map<string, ContinuityHistoryEntry[]>;
  private readonly _perfectionDeficits: Map<string, Float64>;
  private readonly _lastDistances: Map<string, Float64>;
  private _globalTick: number;

  constructor() {
    this._history = new Map();
    this._perfectionDeficits = new Map();
    this._lastDistances = new Map();
    this._globalTick = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5.1 Tick Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Advance the global tick counter by one.
   * [PHIL] One tick = one step of recursive self-measurement and stabilization.
   */
  tick(): void {
    this._globalTick++;
  }

  /**
   * Get the current global tick index.
   */
  getTick(): number {
    return this._globalTick;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5.2 Bounds Computation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute φ-scale proportional continuity bounds for a given scale index.
   * [MATH] qrf(n) = φ^(-n/89). δ_min(n) = φ⁻³ · qrf(n). δ_max(n) = φ · qrf(n).
   * [PHIL] At Planck scale (n=0): δ_max = φ ≈ 1.618. At cosmic scale (n=292):
   * δ_max ≈ 0.206. The lower bound ensures minimum change to avoid collapse.
   * [SPEC] Both bounds are always positive and finite.
   */
  computeBounds(scaleIndex: number = 0): ContinuityBounds {
    const qrf = Math.pow(PHI, -scaleIndex / QRF_CRITICAL_SCALE) as Float64;
    const deltaMin = (PHI_NEG3 * qrf) as Float64;
    const deltaMax = (PHI * qrf) as Float64;
    return { deltaMin, deltaMax, scaleIndex };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5.3 Perfection Deficit Stability
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the perfection deficit stability factor S_ε.
   * [MATH] S_ε = 1 - |ε_t - ε_{t-1}| / (ε_t + ε_{t-1} + ε)
   * where ε = φ⁻⁵ is a small regularization constant.
   * [PHIL] If the perfection deficit changes too rapidly, continuity is disrupted.
   * [SPEC] S_ε ∈ [0, 1]. S_ε = 1 when ε_t = ε_{t-1}.
   */
  perfectionDeficitStability(currentEpsilon: Float64, previousEpsilon: Float64): Float64 {
    const eps = PHI_NEG5;
    const denom = currentEpsilon + previousEpsilon + eps;
    if (denom <= 0) return 0 as Float64;
    const stability = 1.0 - Math.abs(currentEpsilon - previousEpsilon) / denom;
    return (stability < 0 ? 0 : stability > 1 ? 1 : stability) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5.4 Bound Enforcement Factor
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the bound enforcement factor B using smooth step functions.
   * [MATH] B = step_smooth(d - δ_min) · step_smooth(δ_max - d)
   * [SPEC] Enforces the continuity law: d must lie within [δ_min, δ_max].
   * [FIX] The original spec's step function signs are corrected here.
   * [PHIL] The bounds are the mathematical expression that existence requires
   * both change and identity.
   */
  boundEnforcementFactor(distance: Float64, bounds: ContinuityBounds): Float64 {
    const lowerStep = smoothStep((distance - bounds.deltaMin) as Float64);
    const upperStep = smoothStep((bounds.deltaMax - distance) as Float64);
    return (lowerStep * upperStep) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5.5 Core Continuity Computation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the full continuity state for a node between two successive fields.
   * [MATH] Continuity_t = C_time · S_ε · B
   * [PHIL] Continuity is the product of temporal coherence, perfection deficit
   * stability, and bound enforcement — the three pillars of constrained nonidentity.
   * [SPEC] All components are IEEE-754 Float64 and deterministic. No randomness.
   *
   * @param nodeId — Unique node identifier.
   * @param current — Current field state Ψ_t.
   * @param next — Proposed next field state Ψ_{t+1}.
   * @param scaleIndex — Scale index for φ-scale bound computation (default 0).
   * @returns Complete ContinuityState with all metrics.
   */
  computeContinuity(
    nodeId: string,
    current: Float64Array,
    next: Float64Array,
    scaleIndex: number = 0
  ): ContinuityState {
    const distance = computeDistance(current, next);
    const bounds = this.computeBounds(scaleIndex);
    const temporalCoherence = computeTemporalCoherence(current, next);
    const currentEpsilon = computePerfectionDeficit(current);
    const previousEpsilon = this._perfectionDeficits.get(nodeId) ?? currentEpsilon;
    const epsilonDelta = Math.abs(currentEpsilon - previousEpsilon) as Float64;
    const stability = this.perfectionDeficitStability(currentEpsilon, previousEpsilon);
    const enforcement = this.boundEnforcementFactor(distance, bounds);
    const continuity = (temporalCoherence * stability * enforcement) as Float64;
    const withinBounds = distance >= bounds.deltaMin && distance <= bounds.deltaMax;
    const state: ContinuityState = {
      tick: this._globalTick,
      distance,
      deltaMin: bounds.deltaMin,
      deltaMax: bounds.deltaMax,
      withinBounds,
      continuity,
      perfectionDeficit: currentEpsilon,
      perfectionDeficitDelta: epsilonDelta,
      temporalCoherence,
      boundEnforcement: enforcement,
    };
    this._perfectionDeficits.set(nodeId, currentEpsilon);
    this._lastDistances.set(nodeId, distance);
    if (!this._history.has(nodeId)) {
      this._history.set(nodeId, []);
    }
    this._history.get(nodeId)!.push({ tick: this._globalTick, state });
    return state;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5.6 State Retrieval
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the most recent continuity state for a node.
   */
  getLastState(nodeId: string): ContinuityState | null {
    const history = this._history.get(nodeId);
    if (!history || history.length === 0) return null;
    return at(history, history.length - 1).state;
  }

  /**
   * Get all tracked node identifiers.
   */
  getTrackedNodes(): string[] {
    return Array.from(this._history.keys());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5.7 Global Aggregation Metrics
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the average continuity across all tracked nodes.
   * [MATH] C_global = (1/N) · Σ C_i
   */
  globalContinuity(): Float64 {
    const nodes = this.getTrackedNodes();
    if (nodes.length === 0) return 0 as Float64;
    let sum = 0.0;
    for (const nodeId of nodes) {
      const last = this.getLastState(nodeId);
      if (last !== null) sum += last.continuity;
    }
    return (sum / nodes.length) as Float64;
  }

  /**
   * Compute the average distance across all tracked nodes.
   * [MATH] d_global = (1/N) · Σ d_i
   */
  globalDistance(): Float64 {
    const nodes = this.getTrackedNodes();
    if (nodes.length === 0) return 0 as Float64;
    let sum = 0.0;
    for (const nodeId of nodes) {
      const last = this.getLastState(nodeId);
      if (last !== null) sum += last.distance;
    }
    return (sum / nodes.length) as Float64;
  }

  /**
   * Count the number of nodes currently violating continuity bounds.
   * [PHIL] A bounds violation means the system is either frozen (too little
   * change) or chaotic (too much change). Both are existential threats.
   */
  boundsViolationCount(): number {
    let count = 0;
    for (const nodeId of this.getTrackedNodes()) {
      const last = this.getLastState(nodeId);
      if (last !== null && !last.withinBounds) count++;
    }
    return count;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5.8 History Pruning & Reset
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Prune continuity history older than maxAge ticks.
   * [PHIL] Memory is not infinite. Old records are pruned to prevent unbounded growth.
   */
  prune(maxAge: number): void {
    if (maxAge < 1) {
      this._history.clear();
      this._perfectionDeficits.clear();
      this._lastDistances.clear();
      return;
    }
    const cutoff = this._globalTick - maxAge + 1;
    for (const [nodeId, entries] of this._history) {
      const filtered = entries.filter(e => e.tick >= cutoff);
      if (filtered.length === 0) {
        this._history.delete(nodeId);
        this._perfectionDeficits.delete(nodeId);
        this._lastDistances.delete(nodeId);
      } else {
        this._history.set(nodeId, filtered);
      }
    }
  }

  /**
   * Reset the entire ContinuityLaw engine.
   */
  reset(): void {
    this._globalTick = 0;
    this._history.clear();
    this._perfectionDeficits.clear();
    this._lastDistances.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Standalone Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the continuity bounds for a scale without instantiating the class.
 * [SPEC] Stateless convenience wrapper around the bound formula.
 */
export function getContinuityBounds(scaleIndex: number = 0): ContinuityBounds {
  const qrf = Math.pow(PHI, -scaleIndex / QRF_CRITICAL_SCALE) as Float64;
  const deltaMin = (PHI_NEG3 * qrf) as Float64;
  const deltaMax = (PHI * qrf) as Float64;
  return { deltaMin, deltaMax, scaleIndex };
}
