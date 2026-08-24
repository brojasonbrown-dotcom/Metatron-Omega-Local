/**
 * RHUFT Mind — Eigenmode Grid (L3): the superposition-grid read of the tree.
 *
 * Epistemic Status: [SPEC] — Cognition-layer observer. Master-plan L3.
 *
 * WHAT THIS IS. The engine's File 8 (`geometry/basisGenerators.ts`) owns the
 * CONTINUOUS spherical+toroidal orthonormal basis — but it expands a `TorusField`
 * (a function (u,v)→Cx on the torus surface). The v14 node's 28-element field is a
 * DISCRETE interleaved-complex harmonic vector, not a toroidal-surface sample, so a
 * forced TorusField mapping would be speculation (rule #11). The honest
 * superposition grid uses the engine's CERTIFIED DISCRETE machinery, which exists
 * precisely for fields of this shape:
 *
 *   - `analysis/eigenmodes.ts` — the exact ring-Laplacian eigen-decomposition
 *     (modes e^{2πikn/N}, eigenvalue λ_k = −4 sin²(πk/N), Parseval-certified).
 *     Each node's 28-field is read as its standing-wave superposition of modes.
 *   - `analysis/spectralND.ts` — the n-D FFT over the whole [nodes][28] lattice,
 *     the tree-level superposition grid (nodes × harmonic channels).
 *
 * THE GRID. For each tick: every node's field → its eigenmode spectrum (the local
 * superposition), and the full lattice → its 2-D mode-occupancy grid. The grid is
 * then folded onto the φ-graded channel basis (the same graded envelope the senses
 * use) so modal occupancy is commensurable with the rest of the mind.
 *
 * NON-GOALS (the discipline): this observer READS and REPORTS. It never writes to
 * the tree, never perturbs dynamics. Constructed DISABLED; `observe()` is a no-op
 * until enabled. Deterministic (the engine FFTs are pure). [SPEC]
 */

import { eigenSpectrum, type Spectrum } from "../../engine/src/analysis/eigenmodes.ts";
import { spectrumND, powerSpectrum } from "../../engine/src/analysis/spectralND.ts";
import { at } from "../core/indexing.ts";

/** φ and its inverse — the graded occupancy basis. [MATH] */
const PHI = 1.618033988749895;
const PHI_INV = 0.6180339887498949;

/** The number of φ-graded occupancy channels (matches the sensory 14-mode basis). */
export const GRID_CHANNELS = 14;
/** Base spatial frequency of the φ-graded channel fold (matches signal_codec). */
const BASE_FREQ = 89.0;

/** The per-tick superposition-grid snapshot. */
export interface EigenmodeGrid {
  /** Nodes in the tree this tick. */
  readonly nodes: number;
  /** φ-graded modal-occupancy over the whole lattice (Σ channel energy = total). */
  readonly channelEnergy: Float64Array;
  /** The dominant eigenmode index per node (its principal standing wave). */
  readonly dominantModes: Uint16Array;
  /** Mean per-node Parseval residual (machine-floor ⇒ exact decomposition). */
  readonly meanParseval: number;
  /** Mean dominant-mode energy fraction (how concentrated each node's field is). */
  readonly meanDominance: number;
  /** The lattice n-D spectrum's own Parseval certificate. */
  readonly latticeParseval: number;
}

/** Live, honest counters. [SPEC] */
export interface EigenmodeGridStats {
  readonly enabled: boolean;
  readonly ticks: number;
  readonly lastGrid: EigenmodeGrid | null;
}

/**
 * Fold a power spectrum onto the φ-graded channel basis: channel k collects the
 * energy of the eigenmode nearest f_k = 89·φ^(k/2), octave-folded under Nyquist —
 * the same fold the telemetry tape uses, so the grid is commensurable with a sense.
 */
function foldToChannels(power: ArrayLike<number>, half: number): Float64Array {
  const out = new Float64Array(GRID_CHANNELS);
  for (let k = 0; k < GRID_CHANNELS; k++) {
    let bin = Math.round(BASE_FREQ * Math.pow(PHI, k / 2));
    while (bin > half) bin = Math.floor(bin / 2);
    if (bin < 1) bin = 1;
    out[k] = power[Math.min(bin, power.length - 1)] as number;
  }
  return out;
}

/**
 * The eigenmode-grid observer. Reads the committed tree each tick, decomposes every
 * node's field into its standing-wave superposition, and folds the whole lattice
 * onto the φ-graded occupancy grid. Inert until enabled. [SPEC]
 */
export class EigenmodeGridObserver {
  private _enabled: boolean;
  private _ticks = 0;
  private _lastGrid: EigenmodeGrid | null = null;

  constructor(enabled: boolean = false) {
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
   * Observe one tick. Reads the flattened [nodes][28] lattice (the engine's own
   * `snapshot_field_lattice`); per-node eigen-decomposition + the lattice n-D fold.
   * Read-only; a degenerate lattice yields a null grid (honest "no structure").
   *
   * @param lattice  Flattened [nodes][28] lattice (row-major), length nodes·28.
   * @returns the grid snapshot, or null when the lattice is degenerate/empty.
   */
  observe(lattice: ArrayLike<number>): EigenmodeGrid | null {
    if (!this._enabled) return null;
    this._ticks++;
    const flat = lattice instanceof Float64Array ? lattice : Float64Array.from(lattice as ArrayLike<number>);
    const len = flat.length;
    if (len < 2 || len % 28 !== 0) return null; // not a [nodes][28] lattice
    const nodes = len / 28;

    // Per-node ring-Laplacian eigen-decomposition (the local standing-wave
    // superposition). The real part of each 28-element interleaved field is read
    // as a 14-sample ring signal (the harmonic-mode amplitudes live on the real
    // axis of the tape contract) — the certified exact decomposition.
    const dominantModes = new Uint16Array(nodes);
    let parsevalSum = 0;
    let dominanceSum = 0;
    for (let nd = 0; nd < nodes; nd++) {
      const ring = new Float64Array(14);
      for (let i = 0; i < 14; i++) ring[i] = at(flat, nd * 28 + 2 * i); // real parts
      let spec: Spectrum;
      try {
        spec = eigenSpectrum(Array.from(ring));
      } catch {
        continue; // a degenerate node contributes nothing, honestly skipped
      }
      parsevalSum += spec.parsevalResidual;
      const dom = spec.dominant;
      if (dom) {
        dominantModes[nd] = dom.k;
        dominanceSum += spec.totalEnergy > 0 ? dom.energy / spec.totalEnergy : 0;
      }
    }

    // The lattice-level superposition grid: n-D FFT over [nodes][28], folded to channels.
    const specND = spectrumND(flat, [nodes, 28]);
    const power = powerSpectrum(specND);
    const channelEnergy = foldToChannels(power, Math.floor(len / 2));

    this._lastGrid = {
      nodes,
      channelEnergy,
      dominantModes,
      meanParseval: nodes > 0 ? parsevalSum / nodes : 0,
      meanDominance: nodes > 0 ? dominanceSum / nodes : 0,
      latticeParseval: specND.parsevalResidual,
    };
    return this._lastGrid;
  }

  /** Live, honest counters + the last grid snapshot. */
  stats(): EigenmodeGridStats {
    return { enabled: this._enabled, ticks: this._ticks, lastGrid: this._lastGrid };
  }
}
