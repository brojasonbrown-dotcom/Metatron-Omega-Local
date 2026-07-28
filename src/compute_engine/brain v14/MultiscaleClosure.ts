/**
 * @file MultiscaleClosure.ts
 * [SPEC] RHUFT v13 — Multiscale Closure Hierarchy module.
 * [PHIL] Closure is the recursive self-bounding that distinguishes realized existence
 * from the ideal smooth manifold. Perfect closure is unattainable; the residual
 * leak, drift, and persistence constitute the ontological fuel of continuation.
 * [MATH] All operations are IEEE-754 Float64 deterministic, φ-scale proportional,
 * and epistemically labeled.
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
  CLOSURE_COUPLING,
  COHERENCE_THRESHOLD,
  TWO_PI,
  SCALE_INDICES,
} from "./core/constants.ts";

/** [SPEC] Explicit Float64 type alias for IEEE-754 deterministic arithmetic. */
export type Float64 = number;

// ---------------------------------------------------------------------------
// 1. Interfaces
// ---------------------------------------------------------------------------

/**
 * [SPEC] Minimal node state required for closure computation.
 * [PHIL] A node is a locus of distinction; its field, phase, scale, and memory
 * define its closure signature.
 */
export interface NodeState {
  /** [MATH] Field amplitude Ψ_i. */
  field: Float64;
  /** [MATH] Phase angle θ_i. */
  phase: Float64;
  /** [SPEC] Scale index n in the φ-scaled hierarchy. */
  scaleIndex: number;
  /** [MATH] Memory persistence M_i. */
  memory: Float64;
}

/**
 * [SPEC] Closure metrics computed by the multiscale closure hierarchy.
 * [PHIL] Closure is never total; every metric carries a residual leak that sustains
 * the recursive process of approaching the ideal.
 */
export interface ClosureMetrics {
  /** [MATH] Local closure Q_local — single-node self-bounding. */
  local: Float64;
  /** [MATH] Regional closure Q_regional — neighborhood aggregation. */
  regional: Float64;
  /** [MATH] Global closure Q_global — whole-tree closure. */
  global: Float64;
  /** [MATH] Temporal closure Q_temporal — memory persistence over time. */
  temporal: Float64;
  /** [MATH] Mean scale closure Q_scale across all canonical scales. */
  scaleMean: Float64;
  /** [MATH] Mean cross-scale closure Q_cross across all scale pairs. */
  crossScaleMean: Float64;
  /** [MATH] Global aggregate closure Q_total — weighted composition. */
  total: Float64;
  /** [MATH] Leak L = 1 - Q_total. */
  leak: Float64;
  /** [MATH] Drift D = phase drift + perfection deficit. */
  drift: Float64;
  /** [MATH] Persistence P. */
  persistence: Float64;
}

// ---------------------------------------------------------------------------
// 2. Helper Functions
// ---------------------------------------------------------------------------

/** [MATH] Wrap a phase difference into the principal interval [-π, π]. */
function wrapPhase(delta: Float64): Float64 {
  const cycles = Math.round(delta / TWO_PI) as Float64;
  return (delta - cycles * TWO_PI) as Float64;
}

/** [MATH] Circular mean of phase angles using vector averaging. */
function circularMean(sinSum: Float64, cosSum: Float64): Float64 {
  return Math.atan2(sinSum, cosSum) as Float64;
}

/** [MATH] Population mean of a Float64 array. */
function mean(values: Float64[]): Float64 {
  const n = values.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  return (sum / n) as Float64;
}

/** [MATH] Population standard deviation of a Float64 array. */
function stddev(values: Float64[]): Float64 {
  const n = values.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += values[i];
  const mu = sum / n;
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - mu;
    sq += d * d;
  }
  return Math.sqrt(sq / n) as Float64;
}

// ---------------------------------------------------------------------------
// 3. MultiscaleClosure Class
// ---------------------------------------------------------------------------

/**
 * [SPEC] Multiscale Closure Hierarchy — computes local, regional, global,
 * temporal, scale, and cross-scale closures.
 * [PHIL] Closure is a recursive, scale-invariant process: every node, neighborhood,
 * scale, and cross-scale interface contributes to the global aggregate, yet the
 * aggregate never reaches unity because perfect closure would erase the
 * distinction that sustains existence.
 * [MATH] All weights are φ-scale proportional; all exponentials are deterministic.
 */
export class MultiscaleClosure {
  private readonly wLocal: Float64 = PHI_INV;
  private readonly wRegional: Float64 = PHI_NEG2;
  private readonly wGlobal: Float64 = PHI_NEG3;
  private readonly wTemporal: Float64 = PHI_NEG5;
  private readonly wScale: Float64 = PHI_NEG8;
  private readonly wCross: Float64 = (PHI_NEG8 * PHI_INV) as Float64;
  private readonly weightSum: Float64;

  constructor() {
    this.weightSum = (this.wLocal + this.wRegional + this.wGlobal + this.wTemporal + this.wScale + this.wCross) as Float64;
  }

  /**
   * [SPEC] Compute local closure Q_local for a single node.
   * [PHIL] Local closure is the node's self-referential bounding.
   * [MATH] Q_local = exp(-κ · (|Ψ - M| / (φ⁻¹ + |Ψ|) + (1 - cos θ)·φ⁻¹))
   */
  computeLocalClosure(node: NodeState): Float64 {
    const fieldDiff = Math.abs(node.field - node.memory) as Float64;
    const fieldNorm = (PHI_INV + Math.abs(node.field)) as Float64;
    const phasePenalty = ((1 - Math.cos(node.phase)) * PHI_INV) as Float64;
    const arg = CLOSURE_COUPLING * (fieldDiff / fieldNorm + phasePenalty);
    return Math.exp(-arg) as Float64;
  }

  /**
   * [SPEC] Average local closure across all nodes.
   * [MATH] Q_local_avg = (1/N) Σ_i Q_local(i)
   */
  computeAverageLocalClosure(nodes: NodeState[]): Float64 {
    const n = nodes.length;
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.computeLocalClosure(nodes[i]);
    return (sum / n) as Float64;
  }

  /**
   * [SPEC] Compute regional closure for a single node relative to its neighbors.
   * [PHIL] The regional closure measures how tightly a node is embedded in its
   * immediate ontological neighborhood.
   * [MATH] Q_regional(i) = exp(-κ · (|Ψ_i - μ_Ψ| / (φ⁻¹ + |μ_Ψ|) + |θ_i - μ_θ| · φ⁻¹))
   * [FIX] Window radius is φ⁻⁵·N (rounded), minimum 1, wrapping around the array.
   */
  private computeRegionalClosureForNode(nodes: NodeState[], index: number): Float64 {
    const n = nodes.length;
    if (n === 0) return 0;
    const radius = Math.max(1, Math.floor(n * PHI_NEG5));
    let sumField = 0;
    let sumSin = 0;
    let sumCos = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const idx = (index + offset + n) % n;
      const neighbor = nodes[idx];
      sumField += neighbor.field;
      sumSin += Math.sin(neighbor.phase);
      sumCos += Math.cos(neighbor.phase);
      count++;
    }
    const meanField = (sumField / count) as Float64;
    const meanPhase = circularMean(sumSin as Float64, sumCos as Float64);
    const fieldDiff = Math.abs(nodes[index].field - meanField) as Float64;
    const fieldNorm = (PHI_INV + Math.abs(meanField)) as Float64;
    const phaseDiff = Math.abs(wrapPhase(nodes[index].phase - meanPhase)) as Float64;
    const arg = CLOSURE_COUPLING * (fieldDiff / fieldNorm + phaseDiff * PHI_INV);
    return Math.exp(-arg) as Float64;
  }

  /**
   * [SPEC] Compute regional closure Q_regional over all nodes.
   * [MATH] Q_regional = (1/N) Σ_i Q_regional(i)
   */
  computeRegionalClosure(nodes: NodeState[]): Float64 {
    const n = nodes.length;
    if (n === 0) return 0;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.computeRegionalClosureForNode(nodes, i);
    return (sum / n) as Float64;
  }

  /**
   * [SPEC] Compute global closure Q_global over the entire node tree.
   * [PHIL] Global closure measures the coherence of the whole realized structure.
   * [MATH] Q_global = exp(-φ⁻³ · (σ_Ψ / (φ⁻¹ + |μ_Ψ|) + σ_θ · φ⁻¹))
   */
  computeGlobalClosure(nodes: NodeState[]): Float64 {
    const n = nodes.length;
    if (n === 0) return 0;
    let sumField = 0;
    let sumSin = 0;
    let sumCos = 0;
    for (let i = 0; i < n; i++) {
      sumField += nodes[i].field;
      sumSin += Math.sin(nodes[i].phase);
      sumCos += Math.cos(nodes[i].phase);
    }
    const meanField = (sumField / n) as Float64;
    const meanPhase = circularMean(sumSin as Float64, sumCos as Float64);
    let varField = 0;
    let varPhase = 0;
    for (let i = 0; i < n; i++) {
      varField += (nodes[i].field - meanField) ** 2;
      varPhase += wrapPhase(nodes[i].phase - meanPhase) ** 2;
    }
    const stdField = Math.sqrt(varField / n) as Float64;
    const stdPhase = Math.sqrt(varPhase / n) as Float64;
    const arg = PHI_NEG3 * (stdField / (PHI_INV + Math.abs(meanField)) + stdPhase * PHI_INV);
    return Math.exp(-arg) as Float64;
  }

  /**
   * [SPEC] Compute temporal closure Q_temporal from a field-value history.
   * [PHIL] Temporal closure is the persistence of structure across time.
   * [MATH] Q_temporal = (1 + r) / 2, where r = cov(H_t, H_{t-1}) / var(H).
   */
  computeTemporalClosure(history: Float64[]): Float64 {
    const T = history.length;
    if (T < 2) return 1;
    let sum = 0;
    for (let i = 0; i < T; i++) sum += history[i];
    const mean = (sum / T) as Float64;
    let variance = 0;
    for (let i = 0; i < T; i++) {
      const d = history[i] - mean;
      variance += d * d;
    }
    variance /= T;
    if (variance === 0) return 1;
    let cov = 0;
    for (let i = 1; i < T; i++) {
      cov += (history[i] - mean) * (history[i - 1] - mean);
    }
    cov /= (T - 1);
    const autocorr = (cov / variance) as Float64;
    const clamped = Math.max(-1, Math.min(1, autocorr)) as Float64;
    return ((clamped + 1) / 2) as Float64;
  }

  /**
   * [SPEC] Compute scale closure Q_scale for a specific scale index n.
   * [PHIL] Each scale is a distinct ontological stratum.
   * [MATH] Q_scale(n) = exp(-φ⁻⁵ · σ_Ψ_n / (φ⁻¹ + |μ_Ψ_n|))
   */
  computeScaleClosure(nodes: NodeState[], scaleIndex: number): Float64 {
    const fields: Float64[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].scaleIndex === scaleIndex) fields.push(nodes[i].field);
    }
    const m = fields.length;
    if (m === 0) return 0;
    const mu = mean(fields);
    const sigma = stddev(fields);
    const arg = PHI_NEG5 * (sigma / (PHI_INV + Math.abs(mu)));
    return Math.exp(-arg) as Float64;
  }

  /**
   * [SPEC] Compute closure for every scale present in the node set.
   * [MATH] Returns a Map(n → Q_scale(n)).
   */
  computeScaleClosureMap(nodes: NodeState[]): Map<number, Float64> {
    const map = new Map<number, Float64>();
    const scales = new Set<number>();
    for (let i = 0; i < nodes.length; i++) scales.add(nodes[i].scaleIndex);
    for (const s of scales) map.set(s, this.computeScaleClosure(nodes, s));
    return map;
  }

  /**
   * [SPEC] Compute cross-scale closure Q_cross between two scales.
   * [PHIL] Cross-scale closure is the binding force between ontological strata.
   * [MATH] Q_cross(n,m) = exp(-φ⁻⁸ · (|μ_n - μ_m| + |σ_n - σ_m|) / (φ⁻¹ + (|μ_n|+|μ_m|)/2))
   */
  computeCrossScaleClosure(nodes: NodeState[], scaleA: number, scaleB: number): Float64 {
    const fieldsA: Float64[] = [];
    const fieldsB: Float64[] = [];
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].scaleIndex === scaleA) fieldsA.push(nodes[i].field);
      if (nodes[i].scaleIndex === scaleB) fieldsB.push(nodes[i].field);
    }
    const mA = fieldsA.length;
    const mB = fieldsB.length;
    if (mA === 0 || mB === 0) return 0;
    const muA = mean(fieldsA);
    const muB = mean(fieldsB);
    const sigmaA = stddev(fieldsA);
    const sigmaB = stddev(fieldsB);
    const meanDiff = Math.abs(muA - muB) as Float64;
    const stdDiff = Math.abs(sigmaA - sigmaB) as Float64;
    const meanAvg = ((Math.abs(muA) + Math.abs(muB)) / 2) as Float64;
    const arg = PHI_NEG8 * (meanDiff + stdDiff) / (PHI_INV + meanAvg);
    return Math.exp(-arg) as Float64;
  }

  /**
   * [SPEC] Compute cross-scale closure for all unordered scale pairs.
   * [MATH] Returns a Map("n_m" → Q_cross(n,m)).
   */
  computeCrossScaleClosureMap(nodes: NodeState[]): Map<string, Float64> {
    const map = new Map<string, Float64>();
    const scales = Array.from(new Set(nodes.map(n => n.scaleIndex))).sort((a, b) => a - b);
    for (let i = 0; i < scales.length; i++) {
      for (let j = i + 1; j < scales.length; j++) {
        const key = `${scales[i]}_${scales[j]}`;
        map.set(key, this.computeCrossScaleClosure(nodes, scales[i], scales[j]));
      }
    }
    return map;
  }

  /**
   * [SPEC] Compute global aggregate closure Q_total as a weighted average.
   * [PHIL] The total closure is the integration of all partial closures, weighted
   * by φ-scale descent so higher-level closures receive exponentially decreasing
   * influence.
   * [MATH] Q_total = Σ w_i Q_i / Σ w_i, clamped to [0, 1].
   */
  computeAggregateClosure(
    local: Float64,
    regional: Float64,
    global: Float64,
    temporal: Float64,
    scaleMean: Float64,
    crossMean: Float64,
  ): Float64 {
    const weighted =
      this.wLocal * local +
      this.wRegional * regional +
      this.wGlobal * global +
      this.wTemporal * temporal +
      this.wScale * scaleMean +
      this.wCross * crossMean;
    const avg = (weighted / this.weightSum) as Float64;
    return Math.max(0, Math.min(1, avg)) as Float64;
  }

  /**
   * [SPEC] Compute leak L = 1 - Q.
   * [PHIL] Leak is the information that escapes the closure.
   * [MATH] L = 1 - Q.
   */
  computeLeak(q: Float64): Float64 {
    return (1 - q) as Float64;
  }

  /**
   * [SPEC] Compute drift D = phase drift + perfection deficit.
   * [PHIL] Drift is the ontological distance between the realized state and the
   * ideal trajectory.
   * [MATH] D = phaseDrift + perfectionDeficit.
   */
  computeDrift(phaseDrift: Float64, perfectionDeficit: Float64): Float64 {
    return (phaseDrift + perfectionDeficit) as Float64;
  }

  /**
   * [SPEC] Compute persistence using the exponential penalty form.
   * [PHIL] Persistence is the system's capacity to maintain its structure
   * despite leak and drift.
   * [MATH] P = exp(-λ_L·L - λ_D·D - λ_Q·(1 - Q))
   * where λ_L = φ⁻¹, λ_D = φ⁻², λ_Q = φ⁻³.
   */
  computePersistence(q: Float64, drift: Float64, leak: Float64): Float64 {
    const lambdaL = PHI_INV;
    const lambdaD = PHI_NEG2;
    const lambdaQ = PHI_NEG3;
    const arg = lambdaL * leak + lambdaD * drift + lambdaQ * (1 - q);
    return Math.exp(-arg) as Float64;
  }


  /**
   * [INTEGRATED] This method orchestrates all partial closure computations,
   * derives the aggregate, and then computes leak, drift, and persistence.
   */
  computeAllMetrics(nodes: NodeState[], history: Float64[]): ClosureMetrics {
    const local = this.computeAverageLocalClosure(nodes);
    const regional = this.computeRegionalClosure(nodes);
    const global = this.computeGlobalClosure(nodes);
    const temporal = this.computeTemporalClosure(history);

    const scaleMap = this.computeScaleClosureMap(nodes);
    let scaleSum = 0;
    let scaleCount = 0;
    for (const v of scaleMap.values()) {
      scaleSum += v;
      scaleCount++;
    }
    const scaleMean = scaleCount > 0 ? (scaleSum / scaleCount) as Float64 : 0;

    const crossMap = this.computeCrossScaleClosureMap(nodes);
    let crossSum = 0;
    let crossCount = 0;
    for (const v of crossMap.values()) {
      crossSum += v;
      crossCount++;
    }
    const crossMean = crossCount > 0 ? (crossSum / crossCount) as Float64 : 0;

    const total = this.computeAggregateClosure(local, regional, global, temporal, scaleMean, crossMean);
    const leak = this.computeLeak(total);

    const phaseDrift = (1 - temporal) as Float64;
    const perfectionDeficit = (1 - global) as Float64;
    const drift = this.computeDrift(phaseDrift, perfectionDeficit);

    const persistence = this.computePersistence(total, drift, leak);

    return {
      local,
      regional,
      global,
      temporal,
      scaleMean,
      crossScaleMean: crossMean,
      total,
      leak,
      drift,
      persistence,
    };
  }

  /**
   * [SPEC] Update the closure metrics for the current tick.
   * [INTEGRATED] Alias for computeAllMetrics; may be extended to maintain
   * internal rolling history in future iterations.
   */
  update(nodes: NodeState[], history: Float64[]): ClosureMetrics {
    return this.computeAllMetrics(nodes, history);
  }

  /**
   * [SPEC] Compute mean closure over all canonical scales.
   * [MATH] Returns average of Q_scale(n) for each n in SCALE_INDICES.
   */
  computeCanonicalScaleMean(nodes: NodeState[]): Float64 {
    let sum = 0;
    for (const s of SCALE_INDICES) {
      sum += this.computeScaleClosure(nodes, s);
    }
    return (sum / SCALE_INDICES.length) as Float64;
  }
}

// ---------------------------------------------------------------------------
// 4. Standalone Utility Functions
// ---------------------------------------------------------------------------

/**
 * [SPEC] Standalone leak computation.
 * [MATH] L = 1 - Q
 */
export function computeLeak(Q: Float64): Float64 {
  return (1.0 - Q) as Float64;
}

/**
 * [SPEC] Standalone exponential persistence computation.
 * [MATH] P = exp(-λ_L·L - λ_D·D - λ_Q·(1-Q))
 */
export function computeExponentialPersistence(Q: Float64, D: Float64, L: Float64): Float64 {
  const lambdaL = PHI_INV;
  const lambdaD = PHI_NEG2;
  const lambdaQ = PHI_NEG3;
  const arg = lambdaL * L + lambdaD * D + lambdaQ * (1.0 - Q);
  return Math.exp(-arg) as Float64;
}
