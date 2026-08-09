/**
 * RHUFT v13 — Temporal Engine: Chapter 7 — Time as Recursive Self-Measurement Index
 *
 * Implements time tracking as the ordered record of recursive self-measurement
 * updates. Tracks temporal coherence, phase drift, memory retention, and
 * provides the temporal scaffolding for the engine's tick loop.
 *
 * [PHIL] — Time is not a primitive river flowing independently of the world.
 * Time is the index of recursive self-measurement and stabilization. A system
 * has time because it retains trace, compares states, resolves mismatch, and
 * moves to a next coherent step. No retention, no comparison, no recursive
 * update — no meaningful time.
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
  PI,
} from "./core/constants.ts";

import {
  phaseComparison,
  phaseDriftMetric,
} from "./torus_recurrence.ts";
import { at } from "./core/indexing.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. TemporalRecord — Single Node's History
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A record of a single node's field state at a specific tick.
 */
interface TemporalRecord {
  readonly tick: number;
  readonly field: Float64Array;
  readonly coherence: Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TemporalEngine Class — Time as Update Index
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tracks temporal evolution across all nodes in the fractal tree.
 *
 * [PHIL] — Time is not assumed fundamental. Instead, time is defined as the
 * ordered index of recursive actualization steps. The temporal engine records
 * the field state at each tick, enabling temporal coherence measurement,
 * phase drift tracking, and memory retention scoring.
 */
export class TemporalEngine {
  private _tickCount: number;
  private readonly _history: Map<string, TemporalRecord[]>; // nodeId → history
  private readonly _lastSeen: Map<string, number>; // nodeId → last tick

  constructor() {
    this._tickCount = 0;
    this._history = new Map();
    this._lastSeen = new Map();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Tick Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Advance the global tick counter by one.
   *
   * [PHIL] — One tick = one step of recursive self-measurement and
   * stabilization across the entire fractal tree. Time is the count of
   * these updates, not an independent flowing substance.
   */
  tick(): void {
    this._tickCount++;
  }

  /**
   * Get the current tick index.
   */
  getTick(): number {
    return this._tickCount;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Field Recording
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Record a node's field state at the current tick.
   *
   * [PHIL] — Memory is a precondition for temporal continuity. The record
   * stores a copy of the field state (not a reference), ensuring that the
   * history is immutable and deterministic.
   *
   * @param nodeId — Unique node identifier.
   * @param field — Field state at current tick (copied, not referenced).
   * @param coherence — Coherence value at current tick.
   */
  record(nodeId: string, field: Float64Array, coherence: Float64 = 1.0 as Float64): void {
    if (!this._history.has(nodeId)) {
      this._history.set(nodeId, []);
    }

    const records = this._history.get(nodeId)!;
    records.push({
      tick: this._tickCount,
      field: new Float64Array(field), // copy, don't reference
      coherence,
    });

    this._lastSeen.set(nodeId, this._tickCount);
  }

  /**
   * Get the most recent record for a node.
   */
  getLastRecord(nodeId: string): TemporalRecord | null {
    const records = this._history.get(nodeId);
    if (!records || records.length === 0) return null;
    return records[records.length - 1];
  }

  /**
   * Get the record at a specific tick for a node.
   */
  getRecordAt(nodeId: string, tick: number): TemporalRecord | null {
    const records = this._history.get(nodeId);
    if (!records) return null;
    for (let i = records.length - 1; i >= 0; i--) {
      if (at(records, i).tick === tick) return records[i];
    }
    return null;
  }

  /**
   * Get the record before the current tick for a node.
   */
  getPreviousRecord(nodeId: string): TemporalRecord | null {
    const records = this._history.get(nodeId);
    if (!records || records.length < 2) return null;
    return records[records.length - 2];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Temporal Coherence — |<Ψ_t | Ψ_{t-1}>|² / (|Ψ_t|² · |Ψ_{t-1}|²)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute temporal coherence between the current and previous field states.
   *
   * [MATH] — C_time = |<Ψ_t | Ψ_{t-1}>|² / (|Ψ_t|² · |Ψ_{t-1}|²).
   * This is the normalized complex inner product between successive states.
   * Range [0, 1]. 1 = identical states (perfect continuity), 0 = orthogonal.
   *
   * @param nodeId — Node identifier.
   * @returns Temporal coherence in [0, 1]. If no previous record, returns 1.0.
   */
  temporalCoherence(nodeId: string): Float64 {
    const current = this.getLastRecord(nodeId);
    const previous = this.getPreviousRecord(nodeId);

    if (!current || !previous) return 1.0 as Float64;

    return this._computeTemporalCoherence(current.field, previous.field);
  }

  /**
   * Compute temporal coherence between two arbitrary fields.
   */
  private _computeTemporalCoherence(current: Float64Array, previous: Float64Array): Float64 {
    const len = Math.min(current.length, previous.length);
    if (len === 0) return 0 as Float64;

    if (len % 2 === 0) {
      // Interleaved complex field
      const n = len / 2;
      let dotRe = 0.0;
      let dotIm = 0.0;
      let normA = 0.0;
      let normB = 0.0;

      for (let i = 0; i < n; i++) {
        const aRe = current[2 * i] ?? 0;
        const aIm = current[2 * i + 1] ?? 0;
        const bRe = previous[2 * i] ?? 0;
        const bIm = previous[2 * i + 1] ?? 0;

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
      // Real-valued field
      let dot = 0.0;
      let normA = 0.0;
      let normB = 0.0;

      for (let i = 0; i < len; i++) {
        const a = current[i] ?? 0;
        const b = previous[i] ?? 0;
        dot += a * b;
        normA += a * a;
        normB += b * b;
      }

      const product = normA * normB;
      if (product === 0) return 0 as Float64;

      const raw = (dot * dot) / product;
      return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Phase Drift — Mean Squared Phase Difference
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute phase drift between current and previous field states.
   *
   * [MATH] — D_phase = (1/N) Σ (Δθ_i)². This measures how much the phase
   * structure has changed between successive ticks. High drift = unstable.
   *
   * @param nodeId — Node identifier.
   * @returns Phase drift (non-negative). If no previous record, returns 0.0.
   */
  phaseDrift(nodeId: string): Float64 {
    const current = this.getLastRecord(nodeId);
    const previous = this.getPreviousRecord(nodeId);

    if (!current || !previous) return 0.0 as Float64;

    return phaseDriftMetric(current.field, previous.field);
  }

  /**
   * Compute weighted phase drift (emphasizes large deviations).
   */
  weightedPhaseDrift(nodeId: string): Float64 {
    const current = this.getLastRecord(nodeId);
    const previous = this.getPreviousRecord(nodeId);

    if (!current || !previous) return 0.0 as Float64;

    const diffs = phaseComparison(current.field, previous.field);
    const n = diffs.length;
    if (n === 0) return 0.0 as Float64;

    let sum = 0.0;
    const phiSq = PHI * PHI;
    for (let i = 0; i < n; i++) {
      const d = diffs[i] ?? 0;
      const weight = 1.0 / (1.0 + (d * d) / phiSq);
      sum += d * d * weight;
    }

    return (sum / n) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Memory Retention — How Much Prior State Persists
  // ─────────────────══════════════════════════════════════════════════════════

  /**
   * Compute memory retention score: exp(-drift / φ).
   *
   * [MATH] — Retention = exp(-D_phase / φ). This is an exponential decay with
   * φ-scaled time constant. High drift (unstable) → low retention. Low drift
   * (stable) → high retention. Range [0, 1].
   *
   * @param nodeId — Node identifier.
   * @returns Memory retention in [0, 1]. If no previous record, returns 1.0.
   */
  memoryRetention(nodeId: string): Float64 {
    const drift = this.phaseDrift(nodeId);
    const retention = Math.exp(-drift / PHI);
    return (retention < 0 ? 0 : retention > 1 ? 1 : retention) as Float64;
  }

  /**
   * Compute long-term memory retention across multiple ticks.
   *
   * [MATH] — Long-term retention = exp(-cumulative_drift / (φ · tick_count)).
   * This measures how much the field has retained its overall structure across
   * the entire recorded history, not just the last tick.
   */
  longTermRetention(nodeId: string): Float64 {
    const records = this._history.get(nodeId);
    if (!records || records.length < 2) return 1.0 as Float64;

    let cumulativeDrift = 0.0;
    for (let i = 1; i < records.length; i++) {
      const current = at(records, i).field;
      const previous = at(records, i - 1).field;
      cumulativeDrift += phaseDriftMetric(current, previous);
    }

    const avgDrift = cumulativeDrift / (records.length - 1);
    const retention = Math.exp(-avgDrift / (PHI * records.length));
    return (retention < 0 ? 0 : retention > 1 ? 1 : retention) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Temporal Trend Analysis
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute the temporal trend of coherence for a node.
   *
   * [MATH] — Trend = (C_last - C_first) / (tick_count - 1).
   * Positive trend = increasing coherence (stabilizing).
   * Negative trend = decreasing coherence (destabilizing).
   */
  coherenceTrend(nodeId: string): Float64 {
    const records = this._history.get(nodeId);
    if (!records || records.length < 2) return 0.0 as Float64;

    const first = at(records, 0).coherence;
    const last = at(records, records.length - 1).coherence;
    const ticks = at(records, records.length - 1).tick - at(records, 0).tick;

    if (ticks === 0) return 0.0 as Float64;
    return ((last - first) / ticks) as Float64;
  }

  /**
   * Compute the average coherence over the recorded history.
   */
  averageCoherence(nodeId: string): Float64 {
    const records = this._history.get(nodeId);
    if (!records || records.length === 0) return 0.0 as Float64;

    let sum = 0.0;
    for (const r of records) {
      sum += r.coherence;
    }
    return (sum / records.length) as Float64;
  }

  /**
   * Compute the variance of coherence over the recorded history.
   */
  coherenceVariance(nodeId: string): Float64 {
    const records = this._history.get(nodeId);
    if (!records || records.length < 2) return 0.0 as Float64;

    const mean = this.averageCoherence(nodeId);
    let sumSq = 0.0;
    for (const r of records) {
      const diff = r.coherence - mean;
      sumSq += diff * diff;
    }
    return (sumSq / records.length) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Global Temporal Metrics
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all tracked node IDs.
   */
  getTrackedNodes(): string[] {
    return Array.from(this._history.keys());
  }

  /**
   * Compute the global temporal coherence (average across all nodes).
   */
  globalTemporalCoherence(): Float64 {
    const nodes = this.getTrackedNodes();
    if (nodes.length === 0) return 0.0 as Float64;

    let sum = 0.0;
    for (const nodeId of nodes) {
      sum += this.temporalCoherence(nodeId);
    }
    return (sum / nodes.length) as Float64;
  }

  /**
   * Compute the global phase drift (average across all nodes).
   */
  globalPhaseDrift(): Float64 {
    const nodes = this.getTrackedNodes();
    if (nodes.length === 0) return 0.0 as Float64;

    let sum = 0.0;
    for (const nodeId of nodes) {
      sum += this.phaseDrift(nodeId);
    }
    return (sum / nodes.length) as Float64;
  }

  /**
   * Compute the global memory retention (average across all nodes).
   */
  globalMemoryRetention(): Float64 {
    const nodes = this.getTrackedNodes();
    if (nodes.length === 0) return 0.0 as Float64;

    let sum = 0.0;
    for (const nodeId of nodes) {
      sum += this.memoryRetention(nodeId);
    }
    return (sum / nodes.length) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Pruning — Prevent Unbounded Memory Growth
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Prune history older than maxAge ticks.
   *
   * [PHIL] — Memory is not infinite. The temporal engine prunes old records
   * to prevent unbounded memory growth, similar to how biological memory
   * consolidates and forgets. This is a form of active forgetting that preserves
   * the most recent and relevant traces.
   *
   * @param maxAge — Maximum number of ticks to retain per node.
   */
  prune(maxAge: number): void {
    if (maxAge < 1) {
      this._history.clear();
      this._lastSeen.clear();
      return;
    }

    const cutoff = this._tickCount - maxAge + 1;

    for (const [nodeId, records] of this._history) {
      // Keep only records from cutoff onwards
      const filtered = records.filter(r => r.tick >= cutoff);
      if (filtered.length === 0) {
        this._history.delete(nodeId);
        this._lastSeen.delete(nodeId);
      } else {
        this._history.set(nodeId, filtered);
      }
    }
  }

  /**
   * Prune nodes that haven't been recorded in the last maxAge ticks.
   */
  pruneInactive(maxAge: number): void {
    const cutoff = this._tickCount - maxAge;

    for (const [nodeId, lastTick] of this._lastSeen) {
      if (lastTick < cutoff) {
        this._history.delete(nodeId);
        this._lastSeen.delete(nodeId);
      }
    }
  }

  /**
   * Get the total number of records stored across all nodes.
   */
  getTotalRecords(): number {
    let total = 0;
    for (const records of this._history.values()) {
      total += records.length;
    }
    return total;
  }

  /**
   * Get the number of tracked nodes.
   */
  getTrackedNodeCount(): number {
    return this._history.size;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Reset
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reset the entire temporal engine (clear all history).
   */
  reset(): void {
    this._tickCount = 0;
    this._history.clear();
    this._lastSeen.clear();
  }
}
