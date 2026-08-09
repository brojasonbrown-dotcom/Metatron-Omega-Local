/**
 * v10/MicroTori.ts — per-node hexagonal toroidal closure (Phase 3c).
 *
 * [GEOM] The smallest fractal layer: each of the 55 Flower-of-Life nodes sits at
 * the centre of a 6-vertex hexagonal neighbour ring (hexagonal packing). The
 * micro reading closes each node against its 6 surrounding vertices via the
 * shared toroidal kernel. Amplitudes come from the real `flowerCoherences` array
 * (no mock data); phases are derived from the live `pinealField` (atan2 on the
 * Re/Im pairs) with a deterministic Fibonacci-φ fallback when the field is
 * unavailable. Runs once per tick: 55 nodes × 6 vertices ≈ 330 kernel reads.
 *
 * Epistemic note: per-node closure is a geometric measure of local phase balance
 * in the lattice, not a physical observable. [SPEC] The hexagonal ring geometry
 * (6-fold packing) is [MATH FACT]; its mapping to "field closure" is RHUFT.
 */

import { PHI, wrapPhase, toroidalClosure } from './Toroidal';

/** Aggregate result over all 55 node closures. */
export interface MicroToriResult {
  /** Mean hexagonal closure across all nodes ∈ [0,1]. */
  readonly meanClosure: number;
  /** Mean phase coherence across all nodes ∈ [0,1]. */
  readonly meanCoherence: number;
  /** Index of the weakest (lowest-closure) node. */
  readonly weakestNode: number;
  /** Index of the strongest (highest-closure) node. */
  readonly strongestNode: number;
  /** 1 − (max − min closure): spatial uniformity of the closure field ∈ [0,1]. */
  readonly closureSpread: number;
  /** Per-node closures (length = number of nodes evaluated). */
  readonly nodeClosures: number[];
}

/** Golden angle in radians: 2π/φ² ≈ 3.883 rad (137.5077°). [MATH FACT] */
const GOLDEN_ANGLE = (2 * Math.PI) / (PHI * PHI);

/**
 * Derive the phase of node k from the live pineal field. The field packs Re/Im
 * pairs; we take atan2(Im, Re) for node k's pair. Falls back to the Fibonacci-φ
 * law when the pair is absent or degenerate.
 */
function nodePhase(pinealField: Float64Array, k: number, time: number): number {
  const i = (2 * k) % pinealField.length;
  const re = pinealField[i];
  const im = pinealField[(i + 1) % pinealField.length];
  if (Number.isFinite(re) && Number.isFinite(im) && (re !== 0 || im !== 0)) {
    return Math.atan2(im, re);
  }
  // Deterministic fallback: golden-angle spiral seeded by node index + time.
  return wrapPhase(k * GOLDEN_ANGLE + 0.01 * time);
}

/**
 * Compute the micro toroidal closure across the Flower-of-Life lattice.
 *
 * @param flowerCoherences  Per-node coherence amplitudes (∈[0,1]); 55 expected.
 * @param pinealField       Live complex field (Re/Im interleaved) for phases.
 * @param time              Current engine time (drives the fallback phase law).
 */
export function computeMicroTori(
  flowerCoherences: ArrayLike<number>,
  pinealField: Float64Array,
  time: number,
): MicroToriResult {
  const nodes = flowerCoherences.length;
  const nodeClosures = new Array<number>(nodes);

  let sumClosure = 0;
  let sumCoherence = 0;
  let weakestNode = 0;
  let strongestNode = 0;
  let minClosure = Number.POSITIVE_INFINITY;
  let maxClosure = Number.NEGATIVE_INFINITY;

  for (let k = 0; k < nodes; k++) {
    // Build the 6-vertex hexagonal ring around node k. Each vertex takes the
    // node's amplitude (attenuated by ψ per step out) and a phase offset by the
    // ring angle (vertex v at angle v·π/3 from the node's own phase).
    const base = nodePhase(pinealField, k, time);
    const a0Raw = flowerCoherences[k];
    const a0 = Number.isFinite(a0Raw) ? Math.min(1, Math.max(0, a0Raw)) : 0;

    const phases = new Array<number>(6);
    const amps = new Array<number>(6);
    for (let v = 0; v < 6; v++) {
      phases[v] = wrapPhase(base + (v * Math.PI) / 3);
      // ψ-attenuation per ring step keeps the centre dominant (φ-scaled decay).
      amps[v] = a0 * Math.pow(PHI, -0.5 * (v % 3));
    }

    const res = toroidalClosure(phases, amps, { damping: 0 });
    const closure = res.closure;
    nodeClosures[k] = closure;

    sumClosure += closure;
    sumCoherence += res.coherence;
    if (closure < minClosure) {
      minClosure = closure;
      weakestNode = k;
    }
    if (closure > maxClosure) {
      maxClosure = closure;
      strongestNode = k;
    }
  }

  if (nodes === 0) {
    return {
      meanClosure: 0,
      meanCoherence: 0,
      weakestNode: 0,
      strongestNode: 0,
      closureSpread: 0,
      nodeClosures: [],
    };
  }

  // Uniformity: 1 when all nodes close identically, → 0 as the spread widens.
  const spread = maxClosure - minClosure;
  const closureSpread = Math.min(1, Math.max(0, 1 - spread));

  return {
    meanClosure: sumClosure / nodes,
    meanCoherence: sumCoherence / nodes,
    weakestNode,
    strongestNode,
    closureSpread,
    nodeClosures,
  };
}
