/**
 * RHUFT Mind — Cross-Scale Flow (L1): the toroidal octave lane made literal.
 *
 * Epistemic Status: [SPEC] — Cognition-layer observer. Master-plan L1.
 *
 * WHAT THIS IS. The engine's File 11 (`dynamics/crossScaleFlow.ts`) owns the
 * toroidal connection law: a scale's unclosable closure residual (never zero, by
 * the Lucas obstruction) becomes the boundary condition of its ladder neighbours
 * AND its ±13 octave partners, routed through a double-entry FluxLedger that
 * conserves flux to 0 ulp per transfer. The v14 tree already flows *structurally*
 * (parent/child/sibling via interdimensional_flow). This module adds the missing
 * SCALE-SEMANTIC lane: it reads the live tree's per-scale closure residual and
 * routes it through the engine's certified ledger across the ladder + octave
 * channels — the "interwoven octaves flowing through every scale", made literal.
 *
 * THE HONEST SEAM (no speculation, no perturbation):
 *   - Each tree node's SCALE is reconciled to its nearest Lucas-stable engine rung
 *     via L0 (`nearest_stable_rung`). Canonical scales are NOT engine rungs; the
 *     reconciliation is the bridge, never a conflation.
 *   - A scale's residual is the MEASURED boundary mismatch of its membrane:
 *     Σ |surface-closure field| over its nodes = κ·cc·Σ|boundary − field|. It is
 *     ≥ 0; a perfectly-closed scale (residual 0) routes NOTHING, honouring the
 *     contract that a zero residual means "nothing to push back".
 *   - The ledger is the engine's own (File 11) — octave targets land on OPEN
 *     rungs (the Lucas obstruction in the octave channel) and are tracked honestly.
 *
 * NON-GOALS (the discipline): this lane OBSERVES and RECORDS. It never writes to
 * the tree, never perturbs dynamics, never blocks a tick. Constructed DISABLED;
 * `observe()` is a no-op until enabled. Deterministic. [SPEC]
 */

import {
  FluxLedger,
  residualToBoundary,
  ladderNeighbors,
  octavePartners,
} from "../../engine/src/dynamics/crossScaleFlow.ts";
import { at } from "../core/indexing.ts";

/** The closure-coupling κ·curvature_coupling contract the residual is read against. */
export interface CrossScaleFlowStats {
  readonly enabled: boolean;
  readonly ticks: number;
  readonly routed: number;      // total transfers injected across all ticks
  readonly skippedZero: number; // scales whose residual was exactly 0 (nothing to push)
  readonly skippedNoLink: number; // scales with no legal link (ladder end)
  readonly fluxConserved: boolean; // the ledger's own conservation certificate
  readonly totalFlux: number;   // running Σ of routed flux (the ledger magnitude)
}

/** A minimal, read-only view of one tree node the observer needs. */
export interface FlowNode {
  readonly scale: number;
  readonly membrane: { readonly boundary_field: ArrayLike<number> };
  readonly state: { readonly field_state: ArrayLike<number> };
  readonly children: readonly FlowNode[];
}

/** The mapper seam (L0) the observer reconciles scales through. */
export interface ScaleReconciler {
  nearest_stable_rung(n: number): number | null;
}

/**
 * Measured per-scale closure residual: κ·cc·Σ|boundary − field| over the scale's
 * nodes — the magnitude of the membrane's boundary-correction work, i.e. how far
 * that scale is from frictionless closure. Read off the LIVE field, never invented.
 */
export function measureScaleResidual(nodes: readonly FlowNode[], kappaCc: number): number {
  let sum = 0;
  for (const node of nodes) {
    const field = node.state.field_state;
    const boundary = node.membrane.boundary_field;
    for (let i = 0; i < field.length; i++) {
      const b = boundary[i % boundary.length] as number;
      sum += Math.abs(b - (field[i] as number));
    }
  }
  return kappaCc * sum;
}

/**
 * The cross-scale flow observer. Reads the committed tree, routes each scale's
 * measured residual through the engine's FluxLedger (ladder + ±13 octave), and
 * reports conservation. Inert until enabled. [SPEC]
 */
export class CrossScaleFlow {
  private _enabled: boolean;
  private readonly _mapper: ScaleReconciler;
  private readonly _ledger = new FluxLedger();
  private _ticks = 0;
  private _routed = 0;
  private _skippedZero = 0;
  private _skippedNoLink = 0;

  /**
   * @param mapper  The L0 reconciliation seam (ScaleMapper).
   * @param enabled Master switch. Default false → observe() is a no-op (today).
   */
  constructor(mapper: ScaleReconciler, enabled: boolean = false) {
    this._mapper = mapper;
    this._enabled = enabled;
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
   * Observe one tick: walk the tree, group nodes by scale, route each scale's
   * measured residual through the ledger. Read-only; never throws on a degenerate
   * scale (it is skipped, honestly counted).
   *
   * @param root     The engine root node (read-only).
   * @param kappaCc  The closure-coupling factor (κ·curvature_coupling) the residual
   *                 is scaled by — the same constant the node's surface term uses.
   */
  observe(root: FlowNode, kappaCc: number): void {
    if (!this._enabled) return;
    this._ticks++;

    // Group nodes by scale (one residual per scale, summed over its nodes).
    const byScale = new Map<number, FlowNode[]>();
    const walk = (node: FlowNode): void => {
      const list = byScale.get(node.scale) ?? [];
      list.push(node);
      byScale.set(node.scale, list);
      for (const child of node.children) walk(child);
    };
    walk(root);

    for (const [scale, nodes] of byScale) {
      const rung = this._mapper.nearest_stable_rung(scale);
      if (rung === null) continue; // no engine rung in range: nothing to reconcile to
      const residual = measureScaleResidual(nodes, kappaCc);
      if (!(residual > 0)) {
        this._skippedZero++; // perfectly closed (or empty): nothing to push back
        continue;
      }
      // Route through the ladder neighbours AND the ±13 octave partners — the full
      // toroidal channel set (File 11). residualToBoundary validates every link.
      const [prev, next] = ladderNeighbors(rung);
      const [octDown, octUp] = octavePartners(rung);
      const targets = ([prev, next, octDown, octUp].filter((t): t is number => t !== null));
      try {
        const bc = residualToBoundary(rung, residual, targets);
        this._ledger.applyBoundary(bc);
        this._routed += bc.targets.length;
      } catch {
        this._skippedNoLink++; // a rung with no legal link routes nothing this tick
      }
    }
  }

  /** Net flux through a rung (received − emitted) — the recursive pushback read. */
  netFlux(rung: number): number {
    return this._ledger.netFlux(rung);
  }

  /** Total flux received by a rung from all channels (ladder + octave). */
  influx(rung: number): number {
    return this._ledger.influx(rung);
  }

  /** Live, honest counters + the ledger's conservation certificate. */
  stats(): CrossScaleFlowStats {
    return {
      enabled: this._enabled,
      ticks: this._ticks,
      routed: this._routed,
      skippedZero: this._skippedZero,
      skippedNoLink: this._skippedNoLink,
      fluxConserved: this._ledger.totalFluxConserved(),
      totalFlux: this._ledger.touchedRungs().reduce((s, n) => s + this._ledger.influx(n), 0),
    };
  }
}
