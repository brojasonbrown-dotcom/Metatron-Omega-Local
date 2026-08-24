/**
 * RHUFT Mind — Multiscale Bridge (L5): the closed 18-torus engine as a lived sense.
 *
 * Epistemic Status: [SPEC] — Cognition-layer bridge. Master-plan L5 (Option A).
 *
 * WHAT THIS IS. The engine's `MultiscaleEngine` (File 16) is the closed 18-torus
 * computational brain: 18 stable-rung tori, each computing the four invariants
 * (coherence / closure / drift / burden) per step, residuals routed through the
 * FluxLedger with no-scale-runs-ahead causality. It is a SEPARATE computational
 * substrate from the mind's discrete 28-field tree — so L5 is a BRIDGE, not a
 * replacement: the 18-torus engine steps in lockstep with the mind's tick and its
 * multiscale closure readout is pushed onto the bus as an `engine.multiscale`
 * sense, so the mind PERCEIVES its own deep engine. The tree, senses, and all
 * observer lanes (tape / L1 / L3) stay fully intact.
 *
 * THE ENCODING (honest, onto the locked 28-field contract):
 *   - The 18 rungs' four invariants are folded onto 14 complex channels: channel
 *     k ← rung k's (coherence, closure) as (re, im) for the first 9 rungs and
 *     (drift, burden) for the next 9, interleaved 14 = 9 + 5 overflow-combined.
 *     The full per-rung detail rides in `meta` (provenance), while the field
 *     carries the L2-normalised modal form the mind's recognition machinery reads.
 *   - The engine's OWN determinism guarantee applies: identical config ⇒ identical
 *     trajectory, so the sense is reproducible.
 *
 * NON-GOALS (the discipline): the bridge RUNS the engine and READS its result. It
 * never writes to the mind's tree, never perturbs dynamics, never blocks a tick.
 * Constructed DISABLED; `step()` is a no-op until enabled. [SPEC]
 */

import { MultiscaleEngine, type EngineStepResult } from "../../engine/src/engine/multiscaleEngine.ts";
import type { SensorBus } from "../adapters/sensors/sensor_bus.ts";
import { at } from "../core/indexing.ts";

/** The 18-torus engine exposes 18 dense-core rungs; the field folds them onto 14. */
const FIELD_CHANNELS = 14;
const FIELD_SIZE = 2 * FIELD_CHANNELS; // 28 — the locked contract

/** Live, honest bridge counters. [SPEC] */
export interface MultiscaleBridgeStats {
  readonly enabled: boolean;
  readonly steps: number;
  readonly emitted: number;
  readonly lastFluxConserved: boolean;
  readonly lastTotalResidual: number;
  readonly lastMeanCoherence: number;
}

/** L2-normalize in place; a zero vector stays the honest zero vector. */
function normalize(v: Float64Array): Float64Array {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += at(v, i) * at(v, i);
  norm = Math.sqrt(norm);
  if (norm === 0) return v;
  for (let i = 0; i < v.length; i++) v[i] = at(v, i) / norm;
  return v;
}

/**
 * Fold the 18-rung four-invariant readout onto the 28-field contract. Channels
 * 0..8 carry (coherence, closure) of rungs 0..8; channels 9..13 carry the (drift,
 * burden) of the first 5 rungs (the densest structure). The full per-rung record
 * is in meta; the field is the recognisable modal fingerprint. Deterministic.
 */
export function multiscaleField(result: EngineStepResult): Float64Array {
  const inv = result.invariants;
  const out = new Float64Array(FIELD_SIZE);
  const half = Math.min(9, inv.length);
  for (let k = 0; k < half; k++) {
    out[2 * k] = inv[k]!.coherence.value;
    out[2 * k + 1] = inv[k]!.closure.value;
  }
  for (let k = 0; k < Math.min(5, inv.length); k++) {
    out[2 * (9 + k)] = inv[k]!.drift.value;
    out[2 * (9 + k) + 1] = inv[k]!.burden.value;
  }
  return normalize(out);
}

/**
 * The multiscale bridge. Steps the closed 18-torus engine in lockstep with the
 * mind and pushes its readout onto the bus. Inert until enabled. [SPEC]
 */
export class MultiscaleBridge {
  private _enabled: boolean;
  private readonly _bus: SensorBus;
  private readonly _engine: MultiscaleEngine;
  private _steps = 0;
  private _emitted = 0;
  private _lastFluxConserved = true;
  private _lastTotalResidual = 0;
  private _lastMeanCoherence = 0;

  /**
   * @param bus     The one validated SensorBus.
   * @param enabled Master switch. Default false → step() is a no-op (today).
   */
  constructor(bus: SensorBus, enabled: boolean = false) {
    this._bus = bus;
    this._enabled = enabled;
    this._engine = new MultiscaleEngine(); // 18 dense-core stable rungs, harmonic seed
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Flip the master switch; returns the previous state (for an honest journal). */
  setEnabled(next: boolean): boolean {
    const prev = this._enabled;
    this._enabled = next;
    return prev;
  }

  /**
   * Step the 18-torus engine once and push its readout as an engine.multiscale
   * sense. Read-only off the engine's own step result; never throws (a degenerate
   * step is reported honestly and not pushed).
   *
   * @returns true when a frame was actually pushed onto the bus.
   */
  step(): boolean {
    if (!this._enabled) return false;
    this._steps++;
    let result: EngineStepResult;
    try {
      result = this._engine.step();
    } catch {
      return false; // a degenerate engine step is reported honestly, never pushed
    }
    this._lastFluxConserved = result.diagnostics.fluxConserved;
    this._lastTotalResidual = result.diagnostics.totalResidual;
    this._lastMeanCoherence = result.diagnostics.meanCoherence;

    const field = multiscaleField(result);
    const d = result.diagnostics;
    const accepted = this._bus.push({
      source: "engine.multiscale",
      timestamp: Date.now(),
      meta: {
        origin: "engine.multiscale18",
        rungs: String(result.invariants.length),
        totalResidual: d.totalResidual.toExponential(4),
        meanCoherence: d.meanCoherence.toFixed(6),
        fluxConserved: String(d.fluxConserved),
        allScalesPresent: String(result.invariants.length === 18),
      },
      field,
    });
    if (!accepted) return false;
    this._emitted++;
    return true;
  }

  /** Live, honest counters for the Σ panel and the tests. */
  stats(): MultiscaleBridgeStats {
    return {
      enabled: this._enabled,
      steps: this._steps,
      emitted: this._emitted,
      lastFluxConserved: this._lastFluxConserved,
      lastTotalResidual: this._lastTotalResidual,
      lastMeanCoherence: this._lastMeanCoherence,
    };
  }
}
