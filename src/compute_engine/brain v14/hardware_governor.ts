/**
 * RHUFT v6.0 — Fractal Node Engine: Hardware Governor (35% Adaptive Scaling)
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 *
 * Detects hardware capabilities and enforces a deterministic resource budget
 * calibrated to ~35% of available system capacity. The governor scales the
 * fractal tree depth up or down to maintain the target usage, preventing
 * runaway memory growth and ensuring the engine remains responsive on all
 * hardware profiles. [SPEC]
 *
 * Critical Constraints:
 *   - TypeScript strict mode compliant (no `any`, explicit types everywhere).
 *   - IEEE-754 Float64 (≈15 significant digits) — explicitly noted in comments.
 *   - No random seeds — fully deterministic by construction.
 *   - φ-scale-proportional parameters throughout.
 *   - Scale-invariant by construction.
 */

import type {
  Float64,
  HardwareSpecs,
  ResourceBudget,
  ScalingDecision,
} from "./types.ts";

import { totalmem, cpus } from "node:os";

import { PHI, PHI_INV } from "./core/constants.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default total RAM assumption (8 GB) when platform detection is unavailable.
 * [SPEC] — Deterministic fallback; not a runtime probe.
 */
const DEFAULT_TOTAL_RAM_BYTES: number = 8 * 1024 * 1024 * 1024;

/**
 * Default CPU core count when platform detection is unavailable.
 * [SPEC] — Deterministic fallback.
 */
const DEFAULT_CPU_CORES: number = 4;

/**
 * MEASURED memory footprint per FractalNode (≈48 KB RSS, amplitude-dominated).
 * The old 64 KB figure was a guess; the stability oracle (tests/stability_oracle.mjs)
 * measured depth 7 → 3401 nodes at ~2.0 GB RSS and depth 8 → 43961 nodes at ~8.6 GB
 * on the reference machine, i.e. ~190 KB/node transient with GC churn and ~48 KB/node
 * for the retained object graph (field + previousField + boundary + framework/memory
 * metadata + children). We budget on the retained figure and let the measured tick-cost
 * shrink path handle transient spikes. [SPEC — measured, not modelled]
 */
const BYTES_PER_NODE: number = 48 * 1024;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. HardwareGovernor Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hardware-adaptive resource governor.
 *
 * Maintains a target resource usage of ~35% (φ⁻² ≈ 0.382, rounded to 0.35).
 * The budget is derived deterministically from conservative hardware estimates.
 * Scaling decisions are binary: grow, shrink, or maintain based on measured
 * usage versus the target threshold. [SPEC]
 */
export class HardwareGovernor {
  /** Cognitive cadence the engine shares (1000/φ⁴ ≈ 146 ms). [SPEC] */
  static readonly CADENCE_MS = 146;
  /**
   * Deepest tree the measured governor may build. The canonical-scale ladder has
   * exactly 10 scales (292→…→0), so from root 292 there are only 9 descents — depth 9
   * is the STRUCTURAL ceiling (census ≈ 570k), not an arbitrary cap. The stability
   * oracle measured depth 8 = 43,961 nodes at ~282 ms/tick steady-state on a 12-thread
   * desktop, so depth 8 is the realistic auto-scale target and 9 the force-only max. [SPEC — measured]
   */
  static readonly MAX_DEPTH = 9;
  /** Minimum ticks between two grow steps (F₇ — deepen slowly). [SPEC] */
  static readonly GROW_EVERY = 13;

  /** Sync the measured path with the engine's actually-built depth. */
  setMeasuredDepth(d: number): void {
    this._lastMeasuredDepth = d;
  }

  /**
   * Operator force-depth override (the "remove the limiter" knob). Sets the floor
   * the measured shrink path may not cross; null restores purely measured scaling.
   * Clamped to [1, MAX_DEPTH] — the canonical ladder's structural ceiling. [SPEC]
   */
  setForceDepth(d: number | null): void {
    this._forceDepth = d === null ? null : Math.max(1, Math.min(HardwareGovernor.MAX_DEPTH, Math.floor(d)));
  }

  /** Current operator force-depth floor (null = purely measured scaling). */
  get forceDepth(): number | null {
    return this._forceDepth;
  }

  /**
   * Target resource usage ratio.
   * [SPEC] — default 0.35 = 35%, aligned with the RHUFT φ-scale heuristic.
   * The engine's config.target_resource_usage OVERRIDES this (previously a
   * dead knob — the governor hardcoded 0.35 and never read the config).
   */
  readonly target_usage: Float64;

  /** Detected hardware specifications. [SPEC] */
  private _specs: HardwareSpecs;

  /** Computed resource budget. [SPEC] */
  private _budget: ResourceBudget;

  constructor(targetUsage: Float64 = 0.35 as Float64) {
    this.target_usage = targetUsage;
    this._specs = this._detect_hardware();
    this._budget = this._compute_budget();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Hardware Detection
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Detect hardware with deterministic fallbacks.
   *
   * [SPEC] — Uses platform globals only when available; never throws. Falls back
   * to conservative defaults to ensure cross-platform determinism.
   *
   * @returns HardwareSpecs record.
   */
  private _detect_hardware(): HardwareSpecs {
    let totalRam: number = DEFAULT_TOTAL_RAM_BYTES;
    let cpuCores: number = DEFAULT_CPU_CORES;

    // [FIX] Read the MACHINE's total physical RAM, not the V8 heap. The old path
    // used process.memoryUsage().heapTotal (~a few hundred MB) — a tiny fraction of
    // real system memory — so the governor under-detected a 30 GB host and starved the
    // tree. node:os.totalmem() is the real figure. [SPEC — measured]
    try {
      const sys = totalmem();
      if (Number.isFinite(sys) && sys > 0) totalRam = sys;
    } catch {
      // Fallback to default on any exception. [SPEC]
    }

    // Logical processors = the parallel wavefront's real width (the worker pool is
    // sized from this). node:os.cpus() is authoritative on Node; navigator on browser. [SPEC — measured]
    try {
      const c = cpus();
      if (Array.isArray(c) && c.length > 0) cpuCores = c.length;
    } catch {
      if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
        cpuCores = navigator.hardwareConcurrency;
      }
    }

    const availableRam = Math.floor(totalRam * this.target_usage);

    return {
      total_ram_bytes: totalRam,
      cpu_cores: cpuCores,
      cpu_max_frequency_hz: 3.0e9 as Float64, // 3 GHz conservative estimate. [SPEC]
      available_ram_bytes: availableRam,
    };
  }

  /**
   * Compute the resource budget from detected hardware.
   *
   * [SPEC] — Budget caps max_nodes and max_depth based on RAM. The tree depth is
   * bounded by φ-scaled Fibonacci growth: total nodes grow exponentially with depth,
 * so depth is clamped to prevent overflow.
   *
   * @returns ResourceBudget record.
   */
  private _compute_budget(): ResourceBudget {
    const maxNodes = Math.floor(
      (this._specs.available_ram_bytes / BYTES_PER_NODE) * this.target_usage
    );

    // Depth cap: solve 2^(depth+1) - 1 ≈ maxNodes → depth ≈ log2(maxNodes+1) - 1.
    // Clamp to [1, MAX_DEPTH] — MAX_DEPTH = 9 is the structural ceiling of the
    // 10-scale canonical ladder, not an arbitrary safety value. [SPEC]
    const rawDepth = Math.floor(Math.log2(maxNodes + 1)) - 1;
    const maxDepth = Math.max(1, Math.min(HardwareGovernor.MAX_DEPTH, rawDepth));

    return {
      max_ram_bytes: this._specs.total_ram_bytes,
      max_cpu_percent: 100 as Float64,
      target_ram_bytes: this._specs.available_ram_bytes,
      target_cpu_percent: (this.target_usage * 100) as Float64,
      max_nodes: Math.max(maxNodes, 1),
      max_depth: maxDepth,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Public API: Budget & Usage
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Re-detect hardware and recompute budget (e.g., after external memory pressure).
   *
   * @returns Updated ResourceBudget.
   */
  detect_hardware(): ResourceBudget {
    this._specs = this._detect_hardware();
    this._budget = this._compute_budget();
    return this._budget;
  }

  /**
   * Return the current resource budget without re-detection.
   *
   * @returns Current ResourceBudget.
   */
  compute_budget(): ResourceBudget {
    return this._budget;
  }

  /**
   * Estimate current resource usage from total node count.
   *
   * [SPEC] — Linear RAM estimate: nodes × BYTES_PER_NODE. CPU percent is modeled
   * as proportional to RAM usage ratio for simplicity (single-threaded assumption).
   *
   * @param total_nodes — Total number of FractalNodes in the tree.
   * @returns Object with ram_bytes and cpu_percent.
   */
  estimate_usage(total_nodes: number): { ram_bytes: number; cpu_percent: Float64 } {
    const ramBytes = total_nodes * BYTES_PER_NODE;

    // [FIX] CPU is estimated independently from RAM (was previously computing
    // RAM% and calling it CPU%). Each FractalNode requires ~5e5 CPU cycles
    // per tick (field computation, membrane stabilization, framework
    // propagation, resonance sweep). [SPEC]
    const OPS_PER_NODE = 500000;
    const cpuCycles = total_nodes * OPS_PER_NODE;
    const cpuCapacity = this._specs.cpu_cores * this._specs.cpu_max_frequency_hz;
    const cpuPercent = cpuCapacity > 0 ? (cpuCycles / cpuCapacity) * 100 : 0;
    const clampedCpu = Math.min(Math.max(cpuPercent, 0), 100) as Float64;
    return {
      ram_bytes: ramBytes,
      cpu_percent: clampedCpu,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Public API: Scaling Decisions
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Decide whether to grow, shrink, or maintain the fractal tree depth.
   *
   * [SPEC] — Decision thresholds:
   *   - Shrink: RAM or CPU exceeds target (ratio > 1.0).
   *   - Grow: Both RAM and CPU are below 50% of target (ratio < 0.5).
   *   - Maintain: All other cases.
   *
   * @param current_usage — Current usage estimate from estimate_usage().
   * @param budget — ResourceBudget to compare against.
   * @returns ScalingDecision record, or null if no action is needed.
   */
  should_scale(
    current_usage: { ram_bytes: number; cpu_percent: Float64 },
    budget: ResourceBudget
  ): ScalingDecision | null {
    const ramRatio = current_usage.ram_bytes / budget.target_ram_bytes;
    const cpuRatio = current_usage.cpu_percent / budget.target_cpu_percent;

    if (ramRatio > 1.0 || cpuRatio > 1.0) {
      return {
        action: "shrink",
        target_depth: Math.max(budget.max_depth - 1, 1),
        reason: `Resource usage exceeded 35% target threshold (RAM ratio=${ramRatio.toFixed(3)}, CPU ratio=${cpuRatio.toFixed(3)})`,
        ram_bytes: current_usage.ram_bytes,
        cpu_percent: current_usage.cpu_percent,
      };
    }

    if (ramRatio < 0.5 && cpuRatio < 0.5) {
      return {
        action: "grow",
        target_depth: Math.min(budget.max_depth + 1, 7),
        reason: `Resource usage well below 35% target threshold (RAM ratio=${ramRatio.toFixed(3)}, CPU ratio=${cpuRatio.toFixed(3)})`,
        ram_bytes: current_usage.ram_bytes,
        cpu_percent: current_usage.cpu_percent,
      };
    }

    return {
      action: "maintain",
      target_depth: budget.max_depth,
      reason: `Resource usage within 35% target threshold (RAM ratio=${ramRatio.toFixed(3)}, CPU ratio=${cpuRatio.toFixed(3)})`,
      ram_bytes: current_usage.ram_bytes,
      cpu_percent: current_usage.cpu_percent,
    };
  }

  /**
   * MEASURED scaling decision — the honest successor of should_scale().
   *
   * The old estimate_usage() model was proven wrong by orders of magnitude
   * (it claimed 0.057% CPU while a depth-7 tree actually cost 256 ms/tick).
   * This method scales the tree on the REAL wall-clock tick cost (EMA) against
   * the engine's share of the cognitive cadence:
   *
   *   budgetMs = CADENCE_MS × target_usage   (at 0.618 → ≈ 90 ms per tick)
   *
   *   shrink: emaTickMs > budgetMs                    (over budget — cut depth now)
   *   grow:   emaTickMs < 0.5·budgetMs, one step,
   *           at most every GROW_EVERY ticks          (headroom — deepen slowly)
   *   else:   maintain                                (inside the φ-band)
   *
   * Depth is clamped to [1, MAX_DEPTH]. The rebuild itself is guarded
   * upstream (only fires when the target depth differs from the built depth).
   */
  should_scale_measured(
    emaTickMs: number,
    _budget: ResourceBudget,
    tickCount: number
  ): ScalingDecision | null {
    const budgetMs = HardwareGovernor.CADENCE_MS * this.target_usage;
    const clamp = (d: number) => Math.max(1, Math.min(HardwareGovernor.MAX_DEPTH, d));
    // Operator force-depth floor: shrink may not cut below it; grow may still exceed it.
    const floor = this._forceDepth !== null ? clamp(this._forceDepth) : 1;

    if (emaTickMs > budgetMs) {
      // SHRINK — and REMEMBER the overshoot: the depth we shrink from becomes
      // a ceiling. Without this the control loop limit-cycles (6→7→6 forever:
      // depth 6 at 24% says grow, depth 7 at 117% says shrink). The ceiling is
      // the conservative fixed point — the engine's law favors stability.
      this._measuredCeiling = clamp(this._lastMeasuredDepth - 1);
      return {
        action: "shrink",
          target_depth: Math.max(clamp(this._lastMeasuredDepth - 1), floor),
        reason: `measured tick cost ${emaTickMs.toFixed(1)}ms exceeds cadence budget ${budgetMs.toFixed(0)}ms (ceiling now ${this._measuredCeiling})`,
        ram_bytes: 0,
        cpu_percent: emaTickMs / budgetMs,
      };
    }
    const growTarget = Math.max(Math.min(clamp(this._lastMeasuredDepth + 1), this._measuredCeiling), floor);
    if (
      emaTickMs < 0.5 * budgetMs &&
      tickCount - this._lastGrowTick >= HardwareGovernor.GROW_EVERY &&
      growTarget > this._lastMeasuredDepth
    ) {
      this._lastGrowTick = tickCount;
      return {
        action: "grow",
        target_depth: growTarget,
        reason: `measured headroom: ${emaTickMs.toFixed(1)}ms < ${(0.5 * budgetMs).toFixed(0)}ms half-budget`,
        ram_bytes: 0,
        cpu_percent: emaTickMs / budgetMs,
      };
    }
    return {
      action: "maintain",
      target_depth: this._lastMeasuredDepth,
      reason: `measured ${emaTickMs.toFixed(1)}ms within budget ${budgetMs.toFixed(0)}ms`,
      ram_bytes: 0,
      cpu_percent: emaTickMs / budgetMs,
    };
  }

  /** Track the currently-built depth for the measured path (set by the engine). */
  private _lastMeasuredDepth = 5;
  /** Operator force-depth floor (null = purely measured scaling). [SPEC] */
  private _forceDepth: number | null = null;
  private _lastGrowTick = 0;
  /** Learned ceiling: shrink-overshoot memory (starts at the hard max). */
  private _measuredCeiling = HardwareGovernor.MAX_DEPTH;

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Accessors
  // ───────────────────────────────────────────────────────────────────────────

  /** Detected hardware specifications (read-only). */
  get specs(): Readonly<HardwareSpecs> {
    return this._specs;
  }

  /** Current resource budget (read-only). */
  get budget(): Readonly<ResourceBudget> {
    return this._budget;
  }
}
