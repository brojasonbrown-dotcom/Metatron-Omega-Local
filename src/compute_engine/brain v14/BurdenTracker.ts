/**
 * RHUFT v13 — BurdenTracker: Chapter 8.3 — Complexity Burden Components
 *
 * Implements the decomposition of the total burden of maintaining complexity into
 * five φ-scale-weighted components: memory, measurement, closure, cross-scale,
 * and temporal burden.
 *
 * [PHIL] The universe complexifies where net stabilization benefit is positive.
 * But complexification is not free. Every distinction requires memory, measurement,
 * closure, cross-scale consistency, and temporal continuity. BurdenTracker quantifies
 * these costs so NecessityComplexity can evaluate whether ∂J/∂χ > 0.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection, no Math.random(), no Date.now().
 * Scale-invariant by construction: all weights are φ-scale-proportional.
 */

import {
  PHI_INV,
  PHI_NEG2,
  PHI_NEG3,
  PHI_NEG5,
  PHI_NEG8,
} from "./core/constants.ts";

import { type NodeState } from "./MultiscaleClosure.ts";

/** [SPEC] Explicit Float64 type alias for IEEE-754 deterministic arithmetic. */
export type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/** [SPEC] The five canonical burden components. [PHIL] Each represents a distinct ontological cost. */
export interface BurdenComponents {
  /** [MATH] Memory burden |M_t| — cost of storing the memory field. */
  readonly memoryBurden: Float64;
  /** [MATH] Measurement burden |M_cycle(Ψ_t)| — cost of self-measurement. */
  readonly measurementBurden: Float64;
  /** [MATH] Closure burden (1 - Q_total) — cost of maintaining closure. */
  readonly closureBurden: Float64;
  /** [MATH] Cross-scale burden Σ_{n≠m} |Ψ_n - Ψ_m| — consistency cost across scales. */
  readonly crossScaleBurden: Float64;
  /** [MATH] Temporal burden |Ψ_t - Ψ_{t-1}| — cost of sustaining structure over time. */
  readonly temporalBurden: Float64;
}

/** [SPEC] Complete burden result for a single node at a single tick. [INTEGRATED] Aggregates all metrics. */
export interface BurdenResult {
  /** [SPEC] The five decomposed burden components. */
  readonly components: BurdenComponents;
  /** [MATH] Total unweighted burden: sum of all five components. */
  readonly total: Float64;
  /** [MATH] φ-scale weighted burden: Σ w_i · component_i. */
  readonly weighted: Float64;
  /** [MATH] Normalized burden in [0, 1): weighted / (1 + weighted). */
  readonly normalized: Float64;
  /** [SPEC] Deterministic tick index. */
  readonly tick: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BurdenTracker Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * [SPEC] BurdenTracker — computes the five canonical burden components and
 * their φ-scale weighted total for every tracked node.
 *
 * [PHIL] Burden is an ontological cost: to exist as structured distinction is to
 * incur the cost of maintaining that structure. This module makes that cost explicit
 * and measurable, providing the denominator for χ_eff = (∂J/∂χ) / (∂burden/∂χ).
 *
 * [MATH] All weights are φ-scale proportional:
 *   w_m = φ⁻¹, w_meas = φ⁻², w_c = φ⁻³, w_s = φ⁻⁵, w_t = φ⁻⁸.
 * All component computations are deterministic IEEE-754 Float64.
 */
export class BurdenTracker {
  private readonly _history: Map<string, BurdenResult[]>;
  private _globalTick: number;

  private readonly wMemory: Float64 = PHI_INV;
  private readonly wMeasurement: Float64 = PHI_NEG2;
  private readonly wClosure: Float64 = PHI_NEG3;
  private readonly wCrossScale: Float64 = PHI_NEG5;
  private readonly wTemporal: Float64 = PHI_NEG8;

  constructor() {
    this._history = new Map();
    this._globalTick = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.1 Tick Management
  // ─────────────────────────────────────────────────────────────────────────

  /** [PHIL] Advance the global tick counter by one. One tick = one recursive self-measurement step. */
  tick(): void {
    this._globalTick++;
  }

  /** [SPEC] Get the current global tick index. */
  getTick(): number {
    return this._globalTick;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.2 Memory Burden
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [MATH] Compute memory burden |M_t| as the RMS of the memory field.
   * [PHIL] The cost of storing information is proportional to its magnitude.
   * @param memoryField — Stored memory state M_t.
   * @returns Memory burden ≥ 0.
   */
  computeMemoryBurden(memoryField: Float64Array): Float64 {
    const n = memoryField.length;
    if (n === 0) return 0 as Float64;

    let sumSq = 0.0;
    for (let i = 0; i < n; i++) {
      const v = memoryField[i] ?? 0;
      sumSq += v * v;
    }

    return Math.sqrt(sumSq / n) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.3 Measurement Burden
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [MATH] Compute measurement burden |M_cycle(Ψ_t)| = RMS(Ψ) · (1 + CV(Ψ)).
   * [PHIL] Self-measurement cost scales with signal magnitude and variation.
   * @param currentField — Current realized field Ψ_t.
   * @returns Measurement burden ≥ 0.
   */
  computeMeasurementBurden(currentField: Float64Array): Float64 {
    const n = currentField.length;
    if (n === 0) return 0 as Float64;

    let sum = 0.0;
    let sumSq = 0.0;
    for (let i = 0; i < n; i++) {
      const v = currentField[i] ?? 0;
      sum += v;
      sumSq += v * v;
    }

    const mean = sum / n;
    const meanSq = sumSq / n;
    const variance = Math.max(0.0, meanSq - mean * mean);
    const stddev = Math.sqrt(variance);
    const rms = Math.sqrt(meanSq);

    const cv = mean !== 0.0 ? stddev / Math.abs(mean) : 0.0;
    const burden = rms * (1.0 + cv);

    return (burden < 0.0 ? 0.0 : burden) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.4 Closure Burden
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [MATH] Compute closure burden = 1 - Q_total, clamped to [0, 1].
   * [PHIL] The cost of maintaining the boundary is the complement of closure quality.
   * @param totalClosure — Aggregate closure quality Q_total ∈ [0, 1].
   * @returns Closure burden ∈ [0, 1].
   */
  computeClosureBurden(totalClosure: Float64): Float64 {
    const q = totalClosure < 0.0 ? 0.0 : totalClosure > 1.0 ? 1.0 : totalClosure;
    return (1.0 - q) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.5 Cross-Scale Burden
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [MATH] Compute cross-scale burden as the average pairwise absolute difference
   * between per-scale mean field values.
   * [PHIL] Maintaining consistency across ontological strata requires reconciliation.
   * @param nodes — Array of node states with scaleIndex and field.
   * @returns Cross-scale burden ≥ 0.
   */
  computeCrossScaleBurden(nodes: readonly NodeState[]): Float64 {
    if (nodes.length === 0) return 0 as Float64;

    const scaleMap = new Map<number, { sum: number; count: number }>();
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const existing = scaleMap.get(node.scaleIndex);
      if (existing) {
        existing.sum += node.field;
        existing.count++;
      } else {
        scaleMap.set(node.scaleIndex, { sum: node.field, count: 1 });
      }
    }

    const means: Float64[] = [];
    for (const [, entry] of scaleMap) {
      means.push((entry.sum / entry.count) as Float64);
    }

    const s = means.length;
    if (s < 2) return 0 as Float64;

    let totalDiff = 0.0;
    for (let i = 0; i < s; i++) {
      for (let j = i + 1; j < s; j++) {
        totalDiff += Math.abs(means[i] - means[j]);
      }
    }

    const pairCount = (s * (s - 1)) / 2;
    return pairCount > 0 ? (totalDiff / pairCount) as Float64 : 0 as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.6 Temporal Burden
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [MATH] Compute temporal burden as RMS distance between current and previous field states.
   * [PHIL] Greater change between successive states requires more temporal maintenance.
   * @param current — Current field state Ψ_t.
   * @param previous — Previous field state Ψ_{t-1} (or null).
   * @returns Temporal burden ≥ 0.
   */
  computeTemporalBurden(current: Float64Array, previous: Float64Array | null): Float64 {
    if (!previous || previous.length !== current.length) return 0 as Float64;

    const n = current.length;
    let sumSq = 0.0;
    for (let i = 0; i < n; i++) {
      const diff = (current[i] ?? 0) - (previous[i] ?? 0);
      sumSq += diff * diff;
    }

    return Math.sqrt(sumSq / n) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.7 Aggregation
  // ─────────────────────────────────────────────────────────────────────────

  /** [MATH] Compute total unweighted burden: sum of all five components. */
  computeTotalBurden(components: BurdenComponents): Float64 {
    const total =
      components.memoryBurden +
      components.measurementBurden +
      components.closureBurden +
      components.crossScaleBurden +
      components.temporalBurden;
    return (total < 0.0 ? 0.0 : total) as Float64;
  }

  /**
   * [MATH] Compute φ-scale weighted burden: Σ w_i · component_i.
   * [PHIL] Memory is heaviest (φ⁻¹); temporal is lightest (φ⁻⁸).
   */
  computeWeightedBurden(components: BurdenComponents): Float64 {
    const weighted =
      this.wMemory * components.memoryBurden +
      this.wMeasurement * components.measurementBurden +
      this.wClosure * components.closureBurden +
      this.wCrossScale * components.crossScaleBurden +
      this.wTemporal * components.temporalBurden;
    return (weighted < 0.0 ? 0.0 : weighted) as Float64;
  }

  /**
   * [MATH] Normalize burden to [0, 1): normalized = weighted / (1 + weighted).
   * [PHIL] Normalization enables comparison across nodes with different field magnitudes.
   */
  normalizeBurden(weightedBurden: Float64): Float64 {
    const w = weightedBurden < 0.0 ? 0.0 : weightedBurden;
    return (w / (1.0 + w)) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.8 Core Update Cycle
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [SPEC] Compute the complete burden result for a node at the current tick.
   * [INTEGRATED] Orchestrates all five component computations and records the result.
   *
   * @param nodeId — Unique node identifier.
   * @param memoryField — Memory state M_t.
   * @param currentField — Current realized field Ψ_t.
   * @param previousField — Previous field state Ψ_{t-1} (or null).
   * @param totalClosure — Aggregate closure quality Q_total ∈ [0, 1].
   * @param nodes — All nodes in the tree (for cross-scale burden computation).
   * @returns Complete BurdenResult.
   */
  update(
    nodeId: string,
    memoryField: Float64Array,
    currentField: Float64Array,
    previousField: Float64Array | null,
    totalClosure: Float64,
    nodes: readonly NodeState[],
  ): BurdenResult {
    const memoryBurden = this.computeMemoryBurden(memoryField);
    const measurementBurden = this.computeMeasurementBurden(currentField);
    const closureBurden = this.computeClosureBurden(totalClosure);
    const crossScaleBurden = this.computeCrossScaleBurden(nodes);
    const temporalBurden = this.computeTemporalBurden(currentField, previousField);

    const components: BurdenComponents = {
      memoryBurden,
      measurementBurden,
      closureBurden,
      crossScaleBurden,
      temporalBurden,
    };

    const total = this.computeTotalBurden(components);
    const weighted = this.computeWeightedBurden(components);
    const normalized = this.normalizeBurden(weighted);

    const result: BurdenResult = {
      components,
      total,
      weighted,
      normalized,
      tick: this._globalTick,
    };

    if (!this._history.has(nodeId)) {
      this._history.set(nodeId, []);
    }
    this._history.get(nodeId)!.push(result);

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.9 History Retrieval
  // ─────────────────────────────────────────────────────────────────────────

  /** [SPEC] Get the most recent burden result for a node. */
  getLastResult(nodeId: string): BurdenResult | null {
    const history = this._history.get(nodeId);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  /** [SPEC] Get all burden results for a node. */
  getHistory(nodeId: string): readonly BurdenResult[] {
    return this._history.get(nodeId) ?? [];
  }

  /** [SPEC] Get all tracked node identifiers. */
  getTrackedNodes(): string[] {
    return Array.from(this._history.keys());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.10 Global Aggregation
  // ─────────────────────────────────────────────────────────────────────────

  /** [MATH] Compute the average total burden across all tracked nodes: B_global = (1/N) · Σ total_i. */
  globalAverageTotalBurden(): Float64 {
    const nodes = this.getTrackedNodes();
    if (nodes.length === 0) return 0 as Float64;

    let sum = 0.0;
    for (const nodeId of nodes) {
      const last = this.getLastResult(nodeId);
      if (last !== null) sum += last.total;
    }
    return (sum / nodes.length) as Float64;
  }

  /** [MATH] Compute the average weighted burden across all tracked nodes: B_w_global = (1/N) · Σ weighted_i. */
  globalAverageWeightedBurden(): Float64 {
    const nodes = this.getTrackedNodes();
    if (nodes.length === 0) return 0 as Float64;

    let sum = 0.0;
    for (const nodeId of nodes) {
      const last = this.getLastResult(nodeId);
      if (last !== null) sum += last.weighted;
    }
    return (sum / nodes.length) as Float64;
  }

  /** [MATH] Compute the average normalized burden across all tracked nodes. */
  globalAverageNormalizedBurden(): Float64 {
    const nodes = this.getTrackedNodes();
    if (nodes.length === 0) return 0 as Float64;

    let sum = 0.0;
    for (const nodeId of nodes) {
      const last = this.getLastResult(nodeId);
      if (last !== null) sum += last.normalized;
    }
    return (sum / nodes.length) as Float64;
  }

  /**
   * [MATH] Compute the burden trend for a node as the linear regression slope of weighted burden over tick.
   * [PHIL] Positive trend = destabilizing; negative trend = stabilizing.
   * @param nodeId — Node identifier.
   * @returns Trend slope.
   */
  burdenTrend(nodeId: string): Float64 {
    const history = this._history.get(nodeId);
    if (!history || history.length < 2) return 0 as Float64;

    let sumX = 0.0;
    let sumY = 0.0;
    let sumXY = 0.0;
    let sumX2 = 0.0;
    const n = history.length;

    for (let i = 0; i < n; i++) {
      const x = history[i].tick;
      const y = history[i].weighted;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;
    const cov = (sumXY / n) - (meanX * meanY);
    const varX = (sumX2 / n) - (meanX * meanX);

    if (varX === 0.0) return 0 as Float64;
    return (cov / varX) as Float64;
  }

  /**
   * [SPEC] Identify the dominant burden component for a node.
   * [PHIL] Knowing which cost dominates tells the system where to optimize.
   * @param nodeId — Node identifier.
   * @returns Name of the component with the largest raw value, or null.
   */
  dominantComponent(nodeId: string): keyof BurdenComponents | null {
    const last = this.getLastResult(nodeId);
    if (!last) return null;

    const c = last.components;
    let maxVal = c.memoryBurden;
    let maxKey: keyof BurdenComponents = "memoryBurden";

    if (c.measurementBurden > maxVal) { maxVal = c.measurementBurden; maxKey = "measurementBurden"; }
    if (c.closureBurden > maxVal) { maxVal = c.closureBurden; maxKey = "closureBurden"; }
    if (c.crossScaleBurden > maxVal) { maxVal = c.crossScaleBurden; maxKey = "crossScaleBurden"; }
    if (c.temporalBurden > maxVal) { maxVal = c.temporalBurden; maxKey = "temporalBurden"; }

    return maxKey;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2.11 Pruning & Reset
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * [PHIL] Prune burden history older than maxAge ticks to prevent unbounded growth.
   * @param maxAge — Maximum number of ticks to retain per node.
   */
  prune(maxAge: number): void {
    if (maxAge < 1) {
      this._history.clear();
      return;
    }

    const cutoff = this._globalTick - maxAge + 1;
    for (const [nodeId, history] of this._history) {
      const filtered = history.filter(h => h.tick >= cutoff);
      if (filtered.length === 0) {
        this._history.delete(nodeId);
      } else {
        this._history.set(nodeId, filtered);
      }
    }
  }

  /** [SPEC] Reset the entire BurdenTracker, clearing all history and tick state. */
  reset(): void {
    this._globalTick = 0;
    this._history.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Standalone Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/** [SPEC] Standalone total burden computation. [MATH] B = M + Meas + C + S + T. */
export function computeTotalBurden(components: BurdenComponents): Float64 {
  const total =
    components.memoryBurden +
    components.measurementBurden +
    components.closureBurden +
    components.crossScaleBurden +
    components.temporalBurden;
  return (total < 0.0 ? 0.0 : total) as Float64;
}

/** [SPEC] Standalone φ-scale weighted burden computation. [MATH] B_w = φ⁻¹·M + φ⁻²·Meas + φ⁻³·C + φ⁻⁵·S + φ⁻⁸·T. */
export function computeWeightedBurden(components: BurdenComponents): Float64 {
  const weighted =
    PHI_INV * components.memoryBurden +
    PHI_NEG2 * components.measurementBurden +
    PHI_NEG3 * components.closureBurden +
    PHI_NEG5 * components.crossScaleBurden +
    PHI_NEG8 * components.temporalBurden;
  return (weighted < 0.0 ? 0.0 : weighted) as Float64;
}

/** [SPEC] Standalone burden normalization. [MATH] B_norm = B_w / (1 + B_w) ∈ [0, 1). */
export function normalizeBurden(weightedBurden: Float64): Float64 {
  const w = weightedBurden < 0.0 ? 0.0 : weightedBurden;
  return (w / (1.0 + w)) as Float64;
}
