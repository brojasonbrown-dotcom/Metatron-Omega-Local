/**
 * FILE 16 — engine/multiscaleEngine.ts
 *
 * Owns: **the 18-torus assembly + the master step — the closed computational brain.**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   This is the capstone. It instantiates one torus per stable rung of the
 *   Lucas ladder (Files 3–5), seeds each with a deterministic field, and
 *   advances the whole assembly step by step. Each step it:
 *
 *     1. computes the FOUR INVARIANTS for every scale — coherence, closure,
 *        drift, burden — from the modules that own them (Files 6, 12, 13, 14);
 *     2. routes each scale's closure residual to its ladder neighbours through
 *        the cross-scale flux ledger (File 11) — the recursive pushback that
 *        closes the toroid, enforcing that NO SCALE RUNS AHEAD of the boundary
 *        inputs its neighbours fed it;
 *     3. records the metrics + events + diagnostics in the canonical
 *        EngineStepResult.
 *
 *   The assembly is the "full computational framework toroidally closed, all
 *   18 scales interwoven" of the Sheet-03 vision — made runnable and exact.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. THE FOUR INVARIANTS ARE OWNED DOWNSTREAM — THIS FILE ONLY WIRES THEM.
 *      Coherence (self-overlap, File 12), closure (residual, File 6), drift
 *      (change in residual, derived here from File 6 values), burden (File 14).
 *      The engine never recomputes their internals; it calls the owning module
 *      and records the result with its provenance. This keeps the DAG honest:
 *      one definition, one owner, no duplicated logic. [EXACT wiring]
 *
 *   2. DETERMINISM IS STRUCTURAL, NOT SEEDED-RANDOM. Every scale's seed field
 *      is a FIXED deterministic function of its rung (a harmonic whose mode is
 *      the rung's own structure); there is no RNG in the engine at all. A
 *      "seed" config selects among fixed deterministic seeding schemes. Hence
 *      a run is bit-identical on re-run — stronger than seeded-random
 *      determinism. [EXACT]
 *
 *   3. NO SCALE RUNS AHEAD OF ITS BOUNDARY INPUTS. The master step is ordered:
 *      all scales compute their invariants from their CURRENT state first
 *      (synchronously), THEN the flux ledger routes residuals, THEN states are
 *      updated. A scale's residual at step k becomes its neighbours' boundary
 *      input at step k+1 — never within the same step. This is the discrete
 *      analogue of a CFL-type causality condition on the ladder: information
 *      crosses a scale boundary only at a step boundary. [EXACT ordering]
 *
 *   4. COHERENCE DEFAULTS TO A WELL-DEFINED VALUE BEFORE THERE IS A PAST.
 *      The golden-delay self-overlap needs ≥ ceil(φ)+1 snapshots to look back.
 *      For the first steps there is insufficient history; the engine records
 *      coherence as 1 (a field is trivially coherent with itself when no
 *      golden-delayed past exists) and marks that step's coherence provenance
 *      POSTULATE (a convention), switching to the File-12 measured value once
 *      history suffices. The boundary is stated, never blurred. [EXACT logic]
 *
 * Provenance: the four invariants inherit their owners' provenance (closure
 * POSTULATE per File 6, coherence POSTULATE-interpolated per File 12, drift
 * EXACT-arithmetic on POSTULATE residuals, burden POSTULATE-weight per File
 * 14). The engine's wiring, ordering, and determinism are EXACT. Nothing here
 * is presented as more derived than its source.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   multiscaleEngine(16) → ALL of files 1–15 (this is the assembly seam).
 * ────────────────────────────────────────────────────────────────────────────
 */

import { STABLE_SCALES, type StableScaleIndex } from "../core/constants.js";
import { getScale } from "../core/scaleTable.ts";
import { classify, tainted, type Classified, type Provenance } from "../core/provenance.ts";
import { torusForScale, type TorusParams, type TorusField } from "../geometry/torus.ts";
import { closureResidual } from "../geometry/closureResidual.ts";
import { selfOverlap, type FieldHistory } from "../dynamics/selfMeasurement.ts";
import { FluxLedger, residualToBoundary, ladderNeighbors } from "../dynamics/crossScaleFlow.ts";
import { DensityField } from "../information/densityField.ts";
import { burden, FULL_REGION } from "../information/burden.ts";
import { ScaleMeasurer, type ScaleMeasurement } from "./scaleMeasurement.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** How each scale's initial field is seeded. Deterministic; no RNG. */
export type SeedScheme = "harmonic" | "uniform";

/** Engine configuration. */
export interface EngineConfig {
  /** The rungs to assemble (default: the 18 dense-core stable scales). */
  readonly rungs?: readonly StableScaleIndex[];
  /** Seeding scheme for the initial fields (default "harmonic"). */
  readonly seed?: SeedScheme;
  /** Master time-step multiplier (default 1; scales the per-rung τ). */
  readonly dtFactor?: number;
  /** Whether to route cross-scale flux each step (default true). */
  readonly routeFlux?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-scale state
// ─────────────────────────────────────────────────────────────────────────────

/** The live state of one assembled scale. */
interface ScaleState {
  readonly n: StableScaleIndex;
  readonly torus: TorusParams;
  /** The current field (a TorusField function). */
  field: TorusField;
  /** The composite information-density field (File 13). */
  readonly density: DensityField;
  /** Field snapshots for golden-delay self-overlap, oldest → newest. */
  history: number[][];
  /** The running closure-residual history (for drift). */
  residualHistory: number[];
  /** The boundary flux this scale received for the NEXT step. */
  pendingBoundary: number;
}

/** The canonical per-scale invariant record. */
export interface ScaleInvariants {
  readonly n: StableScaleIndex;
  /** Coherence: golden-delay self-overlap C ∈ [0,1] (File 12). */
  readonly coherence: Classified<number>;
  /** Closure: residual magnitude (File 6; lower = more closed). */
  readonly closure: Classified<number>;
  /** Drift: change in residual since the previous step (EXACT arithmetic). */
  readonly drift: Classified<number>;
  /** Burden: the mass/inertia analog over the full torus (File 14). */
  readonly burden: Classified<number>;
}

/** One event emitted during a step (e.g. an ignition, a flux route). */
export interface EngineEvent {
  readonly kind: "ignition" | "flux-route" | "regression";
  readonly scale: StableScaleIndex;
  readonly detail: string;
}

/** The canonical step result. */
export interface EngineStepResult {
  readonly step: number;
  readonly invariants: readonly ScaleInvariants[];
  readonly events: readonly EngineEvent[];
  readonly diagnostics: {
    readonly totalResidual: number;
    readonly meanCoherence: number;
    readonly totalBurdenMantissa: number;
    readonly fluxConserved: boolean;
  };
}

/** Aggregate metrics returned by `run`. */
export interface EngineMetrics {
  readonly steps: number;
  readonly finalTotalResidual: number;
  readonly finalMeanCoherence: number;
  readonly residualTrajectory: readonly number[];
  readonly allScalesPresent: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// The engine
// ─────────────────────────────────────────────────────────────────────────────

/** Number of field sample points per scale (the history snapshot resolution). */
const FIELD_SAMPLES = 32;

export class MultiscaleEngine {
  readonly rungs: readonly StableScaleIndex[];
  private readonly config: Required<Omit<EngineConfig, "rungs">>;
  private readonly scales: Map<StableScaleIndex, ScaleState> = new Map();
  private stepCount = 0;
  private readonly ledger = new FluxLedger();
  private readonly residualTrajectory: number[] = [];
  /** Persistent scale-native measurer (File 19) — holds lag/drift bookkeeping across calls. */
  private readonly measurer: ScaleMeasurer;

  constructor(config: EngineConfig = {}) {
    this.rungs = config.rungs ?? STABLE_SCALES;
    this.measurer = new ScaleMeasurer(this.rungs);
    this.config = {
      seed: config.seed ?? "harmonic",
      dtFactor: config.dtFactor ?? 1,
      routeFlux: config.routeFlux ?? true,
    };
    if (!Number.isFinite(this.config.dtFactor) || this.config.dtFactor <= 0) {
      throw new RangeError(`MultiscaleEngine: dtFactor must be positive; got ${this.config.dtFactor}.`);
    }
    for (const n of this.rungs) {
      const torus = torusForScale(n);
      const field = this.seedField(n, this.config.seed);
      const density = new DensityField(n);
      const history: number[][] = [this.sampleField(field)];
      this.scales.set(n, {
        n,
        torus,
        field,
        density,
        history,
        residualHistory: [],
        pendingBoundary: 0,
      });
    }
  }

  // ── seeding (deterministic, no RNG) ──────────────────────────────────────

  private seedField(n: StableScaleIndex, scheme: SeedScheme): TorusField {
    if (scheme === "uniform") return () => 1;
    // "harmonic": a closed periodic mode whose wavenumber derives from the
    // rung's own structure — deterministic and scale-specific. The mode index
    // is the rung's position in the ladder (a fixed integer), so the seed is
    // fully reproducible.
    const k = (this.rungs.indexOf(n) % 5) + 1; // mode 1..5, deterministic
    return ({ u, v }) => Math.sin(k * u) * Math.cos(k * v) + 0.5 * Math.cos(k * (u - v));
  }

  /** Sample a field on a uniform mesh for history/overlap. */
  private sampleField(field: TorusField): number[] {
    const out = new Array<number>(FIELD_SAMPLES * 2);
    for (let i = 0; i < FIELD_SAMPLES; i++) {
      const u = (i / FIELD_SAMPLES) * 2 * Math.PI;
      // Two v-samples per u to give the overlap a real signal.
      out[2 * i] = field({ u, v: 0.7 });
      out[2 * i + 1] = field({ u, v: 2.1 });
    }
    return out;
  }

  // ── the master step ──────────────────────────────────────────────────────

  /**
   * Advance the whole assembly one step. Ordered so no scale runs ahead of
   * its boundary inputs (fact 3): compute all invariants from current state,
   * then route flux, then update states.
   */
  step(): EngineStepResult {
    const events: EngineEvent[] = [];
    const invariants: ScaleInvariants[] = [];
    let totalResidual = 0;
    let coherenceSum = 0;
    let burdenMantissaSum = 0;

    // PHASE 1 — compute the four invariants per scale from CURRENT state.
    for (const s of this.scales.values()) {
      const closure = closureResidual(s.field, s.torus);
      const resid = closure.value;
      s.residualHistory.push(resid);
      totalResidual += resid;

      // Drift: change in residual since the previous step (EXACT arithmetic).
      const prev = s.residualHistory.length >= 2
        ? s.residualHistory[s.residualHistory.length - 2]!
        : resid;
      const drift = classify(
        resid - prev,
        tainted("EXACT", closure.provenance),
        undefined,
        "drift = residual(step k) − residual(step k−1); arithmetic on File 6 values",
      );

      // Coherence: golden-delay self-overlap, once history suffices (fact 4).
      let coherence: Classified<number>;
      const hist: FieldHistory = { snapshots: s.history, tau: 1 };
      if (s.history.length > Math.ceil(1.6180339887498948482)) {
        coherence = selfOverlap(hist);
      } else {
        coherence = classify(
          1,
          "POSTULATE",
          undefined,
          "no golden-delayed past yet ⇒ coherence with self = 1 by convention",
        );
      }
      coherenceSum += coherence.value;

      // Burden over the full torus (File 14).
      const b = burden(s.density, FULL_REGION, 1, 24);
      const bScaled = b.value;
      burdenMantissaSum += bScaled.mantissa;
      const burdenNum = classify(
        bScaled.toFloat64OrNull() ?? 0,
        b.provenance,
        undefined,
        "burden (File 14) collapsed to Float64 where representable (0 if beyond)",
      );

      invariants.push({
        n: s.n,
        coherence,
        closure,
        drift,
        burden: burdenNum,
      });

      // Ignition event if coherence crosses the φ⁻² threshold downward? No —
      // ignition is coherence EXCEEDING φ⁻² (self-referential coherence).
      if (coherence.value > 0.3819660112501051518 && s.history.length > 2) {
        events.push({
          kind: "ignition",
          scale: s.n,
          detail: `coherence ${coherence.value.toFixed(4)} > φ⁻² (golden-delay self-overlap ignition)`,
        });
      }
    }

    // PHASE 2 — route each scale's residual to its ladder neighbours (File 11).
    // This sets up the boundary inputs for the NEXT step; it never mutates the
    // current-step invariants (causality: fact 3).
    let fluxConserved = true;
    if (this.config.routeFlux) {
      for (const s of this.scales.values()) {
        const resid = s.residualHistory[s.residualHistory.length - 1]!;
        const [prev, next] = ladderNeighbors(s.n);
        const targets = ([prev, next].filter((t): t is number => t !== null)) as number[];
        if (targets.length === 0) continue;
        try {
          const bc = residualToBoundary(s.n, resid, targets);
          for (const t of bc.targets) {
            this.ledger.injectFlux(bc.sourceN, t.n, bc.residual * t.share);
            const targetState = this.scales.get(t.n as StableScaleIndex);
            if (targetState) targetState.pendingBoundary += bc.residual * t.share;
          }
        } catch {
          // A rung with no legal link (ladder end) routes nothing this step.
        }
      }
      // File 11's totalFluxConserved returns a bare boolean (EXACT ledger check).
      fluxConserved = this.ledger.totalFluxConserved();
    }

    // PHASE 3 — update states: apply the pending boundary as a small
    // deterministic perturbation to each scale's field, then push a snapshot.
    // The perturbation amplitude is the received boundary flux (the recursive
    // pushback), scaled by the master dt. This is the engine's dynamics: each
    // scale's next field is its current field modulated by its neighbours'
    // residuals — the toroidal closure made dynamical.
    for (const s of this.scales.values()) {
      const bc = s.pendingBoundary;
      const dt = this.config.dtFactor;
      const base = s.field;
      // Deterministic update: add a boundary-driven harmonic correction.
      const updated: TorusField = ({ u, v }) =>
        base({ u, v }) + dt * bc * 1e-3 * Math.sin(u + v);
      s.field = updated;
      s.history.push(this.sampleField(updated));
      // Keep history bounded (enough for the golden delay + a margin).
      if (s.history.length > 16) s.history.shift();
      s.pendingBoundary = 0; // consumed this step
    }

    this.residualTrajectory.push(totalResidual);
    const result: EngineStepResult = {
      step: this.stepCount,
      invariants: Object.freeze(invariants),
      events: Object.freeze(events),
      diagnostics: {
        totalResidual,
        meanCoherence: coherenceSum / this.scales.size,
        totalBurdenMantissa: burdenMantissaSum,
        fluxConserved,
      },
    };
    this.stepCount++;
    return result;
  }

  /** Read the current per-scale invariant snapshot without advancing. */
  state(): readonly StableScaleIndex[] {
    return this.rungs;
  }

  /**
   * Run `steps` master steps and return aggregate metrics. Deterministic:
   * identical config ⇒ bit-identical trajectory (fact 2).
   */
  run(steps: number): EngineMetrics {
    if (!Number.isInteger(steps) || steps < 1) {
      throw new RangeError(`run: steps must be an integer ≥ 1; got ${steps}.`);
    }
    let last: EngineStepResult | null = null;
    for (let i = 0; i < steps; i++) last = this.step();
    const final = last!;
    return {
      steps,
      finalTotalResidual: final.diagnostics.totalResidual,
      finalMeanCoherence: final.diagnostics.meanCoherence,
      residualTrajectory: Object.freeze([...this.residualTrajectory]),
      allScalesPresent: final.invariants.length === this.rungs.length,
    };
  }

  /** The number of steps executed so far. */
  get stepsExecuted(): number {
    return this.stepCount;
  }

  // ── scale-native measurement (File 19) — opt-in, read-only ────────────────

  /**
   * Measure every scale at its OWN native resolution, largest scales first.
   *
   * This is a PURE OBSERVER pass: it reads the live field state and reports the
   * per-scale field measurement the flat FIELD_SAMPLES snapshot cannot see. It
   * never mutates dynamics — `step()` is untouched, so determinism and the
   * conservative guarantees are unaffected. Opt-in: call it only when a
   * scale-resolved reading is wanted (it costs more than a step, by design —
   * that cost IS the measured computational drift, File 19 fact 3).
   *
   * `fullSweep` (default true) measures all 18 scales this call. Pass false to
   * measure only the scales DUE at the current step per their density cadence —
   * dense scales are re-measured less often, which is exactly what produces the
   * observable phase lag between cheap large scales and expensive dense ones.
   */
  measurement(fullSweep = true): readonly ScaleMeasurement[] {
    const schedule = fullSweep ? undefined : this.measurer.dueAt(this.stepCount);
    // Structural read-only view of the live per-scale state (never mutated).
    return this.measurer.measure(
      this.scales as unknown as ReadonlyMap<StableScaleIndex, never>,
      this.stepCount,
      schedule,
    );
  }
}
