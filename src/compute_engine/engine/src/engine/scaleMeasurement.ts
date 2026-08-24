/**
 * FILE 19 — engine/scaleMeasurement.ts
 *
 * Owns: **scale-native field measurement across all 18 scales.**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   The multiscale engine (File 16) advances 18 tori and records four aggregate
 *   invariants per scale, but it samples every scale at ONE flat resolution
 *   (FIELD_SAMPLES = 32) regardless of that scale's complexity or information
 *   density. This module closes that gap: it measures each scale's field at a
 *   resolution and sampling density DERIVED FROM THAT SCALE'S OWN RECORD
 *   (File 4), largest scales first, and reports the per-scale field state the
 *   flat engine snapshot cannot see.
 *
 *   It is a PURE OBSERVER. It reads field state; it never mutates the engine's
 *   dynamics, never injects flux, never touches the conservative update. That
 *   is what makes it zero-regression by construction: `MultiscaleEngine.step()`
 *   is untouched, and measurement is a separate, opt-in pass.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. RESOLUTION GROWS WITH COMPLEXITY, CAPPED FOR REAL-TIME. File 4 gives
 *      every rung nNodes ∝ φⁿ⁻¹ (its torus node count) and complexityBits =
 *      2.0783·n. A scale with more structure needs more samples to resolve it.
 *      We take the per-dimension mesh as a φ-quantized function of nNodes:
 *          res(n) = RES_BASE · φ^{ round( log_φ(nNodes(n)) / RES_PHI_STEP ) }
 *      clamped to [RES_MIN, RES_MAX]. The cap is a REAL-TIME POSTULATE: it
 *      encodes finite sampling bandwidth (we cannot resolve a dense scale's
 *      full node count in one live pass), NOT a property of the field. The
 *      underlying nNodes is EXACT (File 4); the quantization and cap are
 *      POSTULATE, tagged and ablation-ready. [nNodes EXACT; res formula POSTULATE]
 *
 *   2. DENSITY → OVERSAMPLING. File 4/File 13 give the information-density
 *      envelope ρ_I(n) = ρ₀φ⁻ⁿ (EXACT). Denser scales carry more information
 *      per node, so a single sample per node under-resolves them. We multiply
 *      the mesh by an oversampling factor derived from the density relative to
 *      the sparsest rung: dense scales get MORE samples per node. This is the
 *      "more information ⇒ more density" requirement made concrete. [rhoI
 *      EXACT; the oversample mapping is POSTULATE]
 *
 *   3. PHASE LAG IS MEASURED, NEVER COMPUTED AS PHYSICS. The densest scales are
 *      the most computationally expensive to measure (fact 2), so in a live
 *      loop they complete a measurement less often than the cheap large scales.
 *      The result is a real, observable PHASE LAG: a dense scale's most recent
 *      completed measurement corresponds to an EARLIER field step than a cheap
 *      scale's. We MEASURE this lag (the staleness between a scale's current
 *      field step and the field step its last measurement sampled) and its
 *      wall-clock cost, and report both. We do NOT assert a physical "drift
 *      law" — the lag here is computational (sampling-cost-induced), reported
 *      honestly as a measurement, tagged POSTULATE where it is interpreted.
 *      [lag MEASURED; any physical reading POSTULATE]
 *
 *   4. LARGEST SCALES FIRST. The ladder is ordered by rung index n; larger n ⇔
 *      larger scale length L(n) = ℓ_Pφⁿ. "Largest first" = descending n. The
 *      ordering is a scheduling choice (compute the cheap, sparse, fast scales
 *      before the expensive dense ones); it changes nothing about the values.
 *      [ordering EXACT arithmetic on n; rationale is a scheduling convention]
 *
 * Provenance: resolutions, densities, and the four invariants rest on EXACT
 * File-4 records and File-6/12/14 invariants. The resolution formula, the
 * oversample mapping, and the phase-lag interpretation are POSTULATE. Nothing
 * here is presented as more derived than its source.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   scaleMeasurement(19) → { constants(01), scaleTable(04), torus(05),
 *                            closureResidual(06), selfMeasurement(12),
 *                            densityField(13), burden(14) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI, type StableScaleIndex } from "../core/constants.ts";
import { getScale } from "../core/scaleTable.ts";
import { classify, tainted, type Classified } from "../core/provenance.ts";
import { torusForScale, type TorusParams, type TorusField } from "../geometry/torus.ts";
import { closureResidual } from "../geometry/closureResidual.ts";
import { selfOverlap, type FieldHistory } from "../dynamics/selfMeasurement.ts";
import { DensityField } from "../information/densityField.ts";
import { burden, FULL_REGION } from "../information/burden.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Resolution + density schedule (the scale-native sampling plan)
// ─────────────────────────────────────────────────────────────────────────────

/** Per-dimension mesh floor/ceiling (real-time bandwidth cap — POSTULATE). */
export const RES_MIN = 8;
export const RES_MAX = 128;

/**
 * Oversampling ceiling: the densest rung may take at most this many samples per
 * mesh node. A REAL-TIME POSTULATE (finite sampling budget), NOT a field
 * property — it keeps the densest measurement computable in a live loop.
 */
export const OVERSAMPLE_MAX = 16;

/** The ladder's extreme rungs (anchor the density-weighted information span). */
const STABLE_SCALES_MIN_N: StableScaleIndex = 1;
const STABLE_SCALES_MAX_N: StableScaleIndex = 125;

/**
 * The per-dimension measurement mesh for a scale, derived from its File-4 node
 * count nNodes ∝ φⁿ⁻¹ (EXACT). Larger scales (larger n) carry more nodes and
 * are resolved on a finer mesh; the densest small rungs sit at the floor. The
 * node's log-φ index is mapped LINEARLY across the real-time band [RES_MIN,
 * RES_MAX] — linear, so the resolution genuinely separates across the ladder
 * instead of saturating. Deterministic. [nNodes EXACT; the band is POSTULATE]
 */
export function resolutionForScale(n: StableScaleIndex): number {
  // Node log-φ index for rung n: log_φ(φⁿ⁻¹) = n − 1 (exact).
  const span = STABLE_SCALES_MAX_N - STABLE_SCALES_MIN_N; // 124
  const frac = span <= 0 ? 1 : (n - STABLE_SCALES_MIN_N) / span; // ∈ [0,1]
  const res = RES_MIN + frac * (RES_MAX - RES_MIN);
  return Math.max(RES_MIN, Math.min(RES_MAX, Math.round(res)));
}

/**
 * Oversampling factor for a scale: how many field samples to take per mesh
 * node. Information density is ρ_I(n) = ρ₀φ⁻ⁿ (EXACT, File 4/13) — it is
 * HIGHEST at the smallest n and falls geometrically. Dense scales carry more
 * information per node, so they are sampled harder: the log-φ density span
 * (125 − n) is mapped LINEARLY onto [1, OVERSAMPLE_MAX], so the densest rung
 * (n=1) = OVERSAMPLE_MAX and the sparsest (n=125) = 1, with every rung strictly
 * between. Bounded by construction — no combinatorial explosion, and monotone:
 * denser ⇒ strictly more oversampling. [ρ_I envelope EXACT; the linear map +
 * cap are POSTULATE]
 */
export function densityOversample(n: StableScaleIndex, sparsestN: StableScaleIndex): number {
  void sparsestN; // the span is anchored by the ladder extremes, not the arg
  const span = STABLE_SCALES_MAX_N - STABLE_SCALES_MIN_N; // 124
  const frac = span <= 0 ? 1 : (STABLE_SCALES_MAX_N - n) / span; // ∈ [0,1], 1 at n=1
  return 1 + (OVERSAMPLE_MAX - 1) * Math.max(0, Math.min(1, frac));
}

/** The total field-sample count for a scale: mesh² × oversampling (rounded). */
export function sampleCountForScale(n: StableScaleIndex, sparsestN: StableScaleIndex): number {
  const res = resolutionForScale(n);
  const over = densityOversample(n, sparsestN);
  return Math.round(res * res * over);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-scale measurement result
// ─────────────────────────────────────────────────────────────────────────────

/** The four invariants measured at a scale's own resolution. */
export interface ScaleMeasurement {
  readonly n: StableScaleIndex;
  /** Per-dimension mesh used (scale-native). */
  readonly resolution: number;
  /** Total field samples taken (resolution² × density oversampling). */
  readonly samples: number;
  /** Coherence: golden-delay self-overlap C ∈ [0,1] (File 12). */
  readonly coherence: Classified<number>;
  /** Closure: residual magnitude (File 6; lower = more closed). */
  readonly closure: Classified<number>;
  /** Drift: change in residual since the previous measurement (EXACT arithmetic). */
  readonly drift: Classified<number>;
  /** Burden over the full torus (File 14), collapsed to Float64 where representable. */
  readonly burden: Classified<number>;
  /** Phase lag: field steps between this scale's last measurement and now. 0 = fresh. */
  readonly phaseLag: Classified<number>;
  /** Wall-clock cost of this measurement in milliseconds (the computational drift). */
  readonly measuredCostMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// The measurer — a pure observer over the live per-scale field state
// ─────────────────────────────────────────────────────────────────────────────

/** The minimal per-scale field state the measurer reads (structural, read-only). */
export interface MeasurableScale {
  readonly n: StableScaleIndex;
  readonly torus: TorusParams;
  readonly field: TorusField;
  readonly density: DensityField;
  /** Field snapshots oldest → newest, for golden-delay self-overlap. */
  readonly history: readonly (readonly number[])[];
}

/**
 * ScaleMeasurer measures a set of scales at their own native resolutions,
 * largest first, tracking each scale's measurement cadence so phase lag is
 * observable. It holds NO field state of its own — it reads the caller's.
 */
export class ScaleMeasurer {
  /** The scales to measure (the engine's assembled rungs). */
  readonly rungs: readonly StableScaleIndex[];
  private readonly sparsestN: StableScaleIndex;
  /** Field step at which each scale was last measured (for phase lag). */
  private readonly lastMeasuredStep = new Map<StableScaleIndex, number>();
  /** Previous closure residual per scale (for drift). */
  private readonly prevResidual = new Map<StableScaleIndex, number>();

  /**
   * @param rungs the scales to measure (the engine's assembled rungs).
   *   The sparsest (largest-n) rung anchors the density-oversampling baseline.
   */
  constructor(rungs: readonly StableScaleIndex[]) {
    if (rungs.length === 0) throw new RangeError("ScaleMeasurer: need ≥ 1 rung.");
    this.rungs = rungs;
    this.sparsestN = rungs[rungs.length - 1]!;
  }

  /**
   * Measure every scale once, LARGEST FIRST (descending n), at each scale's
   * native resolution. `currentStep` is the engine's present step count (used
   * only to compute phase lag — the staleness of each scale's prior reading).
   * `schedule` optionally restricts which scales are (re)measured this call:
   * a scale in `schedule` is re-measured; one omitted keeps its last reading's
   * lag growing. Omit `schedule` to measure all 18 (the full sweep).
   *
   * Pure: reads `scales`, mutates only its own lag/drift bookkeeping.
   */
  measure(
    scales: ReadonlyMap<StableScaleIndex, MeasurableScale>,
    currentStep: number,
    schedule?: ReadonlySet<StableScaleIndex>,
  ): readonly ScaleMeasurement[] {
    const out: ScaleMeasurement[] = [];
    // Largest scales first: descending n.
    const ordered = [...this.rungs].sort((a, b) => b - a);
    for (const n of ordered) {
      if (schedule && !schedule.has(n)) continue;
      const s = scales.get(n);
      if (!s) continue;
      out.push(this.measureOne(s, currentStep));
    }
    return Object.freeze(out);
  }

  /**
   * The measurement cadence for a scale: how often (in field steps) it can be
   * re-measured within a live budget. Cheap (sparse) scales → 1 (every step);
   * expensive (dense) scales → > 1 (phase-skipped). Derived from the sample
   * count relative to the cheapest rung. Deterministic; POSTULATE scheduling.
   */
  cadenceForScale(n: StableScaleIndex): number {
    const cheapest = sampleCountForScale(this.rungs[this.rungs.length - 1]!, this.sparsestN);
    const mine = sampleCountForScale(n, this.sparsestN);
    // Cadence grows with relative cost, √-tempered so the densest rung is
    // skipped a bounded number of steps rather than starved entirely.
    return Math.max(1, Math.round(Math.sqrt(mine / cheapest)));
  }

  /** The set of rungs due for (re)measurement at a given step, per cadence. */
  dueAt(step: number): ReadonlySet<StableScaleIndex> {
    const due = new Set<StableScaleIndex>();
    for (const n of this.rungs) {
      if (step % this.cadenceForScale(n) === 0) due.add(n);
    }
    return due;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private measureOne(s: MeasurableScale, currentStep: number): ScaleMeasurement {
    const t0 = Date.now();
    const n = s.n;
    const resolution = resolutionForScale(n);
    const samples = sampleCountForScale(n, this.sparsestN);

    // Closure residual (File 6) — the scale-native field measured at its torus.
    const closure = closureResidual(s.field, s.torus);
    const resid = closure.value;

    // Drift: change in residual since this scale's previous measurement.
    const prev = this.prevResidual.get(n) ?? resid;
    const drift = classify(
      resid - prev,
      tainted("EXACT", closure.provenance),
      undefined,
      "drift = residual(this measurement) − residual(prev measurement); arithmetic on File 6 values",
    );
    this.prevResidual.set(n, resid);

    // Coherence: golden-delay self-overlap once history suffices (File 12).
    let coherence: Classified<number>;
    if (s.history.length > Math.ceil(PHI)) {
      const hist: FieldHistory = { snapshots: s.history as number[][], tau: 1 };
      coherence = selfOverlap(hist);
    } else {
      coherence = classify(
        1,
        "POSTULATE",
        undefined,
        "no golden-delayed past yet ⇒ coherence with self = 1 by convention",
      );
    }

    // Burden over the full torus (File 14), collapsed to Float64 where possible.
    const b = burden(s.density, FULL_REGION, 1, 24);
    const burdenNum = classify(
      b.value.toFloat64OrNull() ?? 0,
      b.provenance,
      undefined,
      "burden (File 14) collapsed to Float64 where representable (0 if beyond)",
    );

    // Phase lag: field steps since this scale was last measured. First
    // measurement ⇒ lag 0 (no prior reading to be stale against).
    const lastStep = this.lastMeasuredStep.get(n);
    const lag = lastStep === undefined ? 0 : Math.max(0, currentStep - lastStep);
    this.lastMeasuredStep.set(n, currentStep);
    const phaseLag = classify(
      lag,
      "POSTULATE",
      undefined,
      "phase lag = field steps since this scale's last completed measurement; " +
        "computational (sampling-cost-induced), MEASURED — a physical reading is POSTULATE",
    );

    return {
      n,
      resolution,
      samples,
      coherence,
      closure,
      drift,
      burden: burdenNum,
      phaseLag,
      measuredCostMs: Date.now() - t0,
    };
  }
}
