/**
 * scaleSignature — the scale-axis readout (Ω-REAL: multi-scale field signature).
 *
 * The web is a φ-octave ladder of coupled wave fields, so the honest "deepest"
 * readout treats the field as a function of SCALE (the rung index n), not a
 * per-rung bag. For every rung it emits the scale metadata (logRadius/logTau),
 * the full field measures (energy/peak/mean), and the 13-mode Lucas signature
 * already materialised by the engine; for every adjacent pair it emits the
 * octave-transport morphism defect (phase-commutation + mean preservation).
 *
 * Observe-only and deterministic: composes `snapshot`, `readState`, and
 * `checkMorphism` — nothing new is computed, no engine state is advanced.
 */

import type { MultiTorusEngine } from '../engine/MultiTorusEngine';
import { readState } from './state';
import { checkMorphism } from '../web/morphism';

export interface ScaleSignatureFrame {
  readonly rank: number;
  /** Ladder index n (the scale). */
  readonly n: number;
  readonly logRadius: number;
  readonly logTau: number;
  readonly nodes: number;
  readonly energy: number;
  readonly peak: number;
  readonly meanMagnitude: number;
  /** 13 golden-mode Lucas signature (the engine's own basis). */
  readonly signature: Float64Array;
}

export interface ScaleOctaveLink {
  readonly from: number;
  readonly to: number;
  readonly phaseCommutationDefect: number;
  readonly meanDefect: number;
}

export interface ScaleSignatureReport {
  readonly rungs: readonly ScaleSignatureFrame[];
  readonly octaves: readonly ScaleOctaveLink[];
}

/** Read the whole multi-rung field as a scale-graded structure, per tick. */
export function scaleSignature(engine: MultiTorusEngine): ScaleSignatureReport {
  const snaps = engine.engines.map((e) => e.snapshot());

  const rungs: ScaleSignatureFrame[] = snaps.map((snap, r) => {
    const e = engine.engines[r];
    const rung = engine.rungs[r];
    const st = readState(snap.z);
    return {
      rank: r,
      n: rung.n,
      logRadius: rung.logRadius,
      logTau: rung.logTau,
      nodes: e.nodes,
      energy: st.energy,
      peak: st.peak,
      meanMagnitude: st.meanMagnitude,
      signature: Float64Array.from(snap.signature),
    };
  });

  const octaves: ScaleOctaveLink[] = [];
  for (let r = 0; r + 1 < snaps.length; r++) {
    const m = checkMorphism(snaps[r].z, engine.engines[r + 1].nodes);
    octaves.push({
      from: r,
      to: r + 1,
      phaseCommutationDefect: m.phaseCommutationDefect,
      meanDefect: m.meanDefect,
    });
  }

  return { rungs, octaves };
}
