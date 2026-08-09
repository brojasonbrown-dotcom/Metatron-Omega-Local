/**
 * v10/MesoTori.ts — per-framework toroidal closure (Phase 3b).
 *
 * [GEOM] Each active framework carries a 55-node Flower-of-Life Fibonacci field.
 * The meso reading projects that field onto the shared toroidal kernel: the 55
 * node coherences become amplitude weights, and their phases are derived from a
 * deterministic Fibonacci-φ phase law seeded by the framework's anchor frequency
 * and the current time. ψ-damping is driven by that framework's own master
 * resonance — no mock data, every value derives from already-computed outputs.
 *
 * Epistemic note: the per-framework "torus health" (closure) is a geometric
 * diagnostic of internal phase balance, not a physical measurement. [SPEC]
 */

import { PHI, wrapPhase, toroidalClosure } from './Toroidal';

/** One framework's projection input. */
export interface MesoFrameworkInput {
  /** Framework key (e.g. 'subPlanckian', 'septenary', …). */
  readonly key: string;
  /** The 55 node coherences of the framework's Flower-of-Life field (∈[0,1]). */
  readonly field55: ArrayLike<number>;
  /** Solfeggio anchor frequency in Hz (174 … 963) — seeds the phase law. */
  readonly anchorHz: number;
  /** The framework's master resonance ∈ [0,1] — drives its ψ-damping. */
  readonly resonance: number;
}

/** One framework's meso-torus reading. */
export interface MesoTorusReading {
  readonly anchorHz: number;
  /** Toroidal closure ∈ [0,1] (1 = zero net momentum around the loop). */
  readonly closure: number;
  /** Phase coherence (mean resultant length) ∈ [0,1]. */
  readonly coherence: number;
  /** Net phase-momentum residual ≥ 0. */
  readonly residual: number;
  /** The ψ-damping coefficient applied (the framework's resonance). */
  readonly damping: number;
}

/** Map from framework key to its meso-torus reading. */
export type MesoTorusMap = Record<string, MesoTorusReading | undefined>;

/**
 * Deterministic Fibonacci-φ phase law for node k of a framework anchored at
 * `anchorHz`. The phase advances by the golden angle per node and rotates slowly
 * with time, so the loop is stationary in the co-rotating frame. [GEOM]
 */
function mesoPhase(anchorHz: number, k: number, time: number): number {
  const goldenAngle = (2 * Math.PI) / (PHI * PHI); // 2π/φ² ≈ 3.883 rad (137.5°)
  const drive = (anchorHz / 963) * 2 * Math.PI * 0.01 * time; // slow normalised drive
  return wrapPhase(k * goldenAngle + drive);
}

/** Compute one framework's meso-torus reading. */
export function computeMesoTorus(
  input: MesoFrameworkInput,
  time: number,
): MesoTorusReading {
  const n = input.field55.length;
  const phases = new Array<number>(n);
  const amps = new Array<number>(n);
  for (let k = 0; k < n; k++) {
    phases[k] = mesoPhase(input.anchorHz, k, time);
    const a = input.field55[k];
    amps[k] = Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 0;
  }
  const res = toroidalClosure(phases, amps, { resonance: input.resonance });
  return {
    anchorHz: input.anchorHz,
    closure: res.closure,
    coherence: res.coherence,
    residual: res.residual,
    damping: res.dampingApplied,
  };
}

/** Compute the meso-torus reading for every active framework. */
export function computeAllMesoTori(
  inputs: ReadonlyArray<MesoFrameworkInput>,
  time: number,
): MesoTorusMap {
  const map: MesoTorusMap = {};
  for (const input of inputs) {
    map[input.key] = computeMesoTorus(input, time);
  }
  return map;
}

/** Aggregate the per-framework readings into a whole-engine summary. */
export function aggregateMesoTori(map: MesoTorusMap): {
  meanClosure: number;
  meanCoherence: number;
  count: number;
  weakest: { framework: string; closure: number } | null;
} {
  let sumClosure = 0;
  let sumCoherence = 0;
  let count = 0;
  let weakest: { framework: string; closure: number } | null = null;

  for (const key of Object.keys(map)) {
    const r = map[key];
    if (!r) continue;
    sumClosure += r.closure;
    sumCoherence += r.coherence;
    count++;
    if (weakest === null || r.closure < weakest.closure) {
      weakest = { framework: key, closure: r.closure };
    }
  }

  return {
    meanClosure: count > 0 ? sumClosure / count : 0,
    meanCoherence: count > 0 ? sumCoherence / count : 0,
    count,
    weakest,
  };
}
