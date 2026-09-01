/**
 * METATRON v10 — PINEAL CORE SELF-MEASUREMENT
 * =============================================
 *
 * The pineal is the engine's self-measuring substrate. The 22-mode
 * `pinealField` (interleaved Re/Im, length 44) is already computed every
 * tick by the core engine and consumed by every framework. This module
 * adds a NEW, purely additive read-only channel:
 *
 *   "the core measures the rings, and is measured by them"
 *
 * It does not own any state on the hot path. It does not introduce new
 * constants. It calls the same Wolfram-anchored `toroidalClosure` kernel
 * the macro/meso/micro layers already use.
 *
 * ARCHITECTURE
 * ------------
 * Sefer Yetzirah radial layout — see PINEAL_LABELS in src/constants/metatron.ts:
 *
 *   ring 0 — 1 core    (idx 0,        Aleph)
 *   ring 1 — 3 mothers (idx 1..3,     Mem/Shin/Tav)
 *   ring 2 — 6 doubles (idx 4..9,     Bet…Resh)
 *   ring 3 — 12 simples(idx 10..21,   He…Qof)
 *
 * For each ring k≥1 the kernel computes a closure between the ring's
 * (phase, amplitude) set and the core's (phase, amplitude). The result
 * is a per-ring "core ↔ ring" coupling and an aggregate self-measurement.
 *
 * Iron-rule compliance:
 *   ✓ NO regression — pure read of existing pinealField buffer.
 *   ✓ NO mock data — phases = atan2(Im, Re) on real engine modes.
 *   ✓ Shared kernel — same `toroidalClosure` as macro/meso/micro layers.
 *   ✓ Wolfram-anchored only (PHI tied via `verified('PHI_DEFINING')`).
 */

import { toroidalClosure } from './Toroidal';
import { verified } from './WolframVerified';

// Tie module to Wolfram identity bank — throws if PHI loses verification.
void verified('PHI_DEFINING');

/** Sefer Yetzirah radial layout indices (parallel to PINEAL_LABELS). */
export const PINEAL_RINGS = [
  /* ring 0 (core)    */ [0],
  /* ring 1 (mothers) */ [1, 2, 3],
  /* ring 2 (doubles) */ [4, 5, 6, 7, 8, 9],
  /* ring 3 (simples) */ [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
] as const;

export const PINEAL_NODE_COUNT = 22;

export interface PinealRingCoupling {
  /** Ring index 1..3 (ring 0 is the core itself, not a coupling). */
  ring: number;
  /** Kernel closure between the ring's vertex set and the core (∈ [0,1]). */
  closure: number;
  /** Kuramoto coherence on the ring's phases (∈ [0,1]). */
  coherence: number;
  /** Phase delta (rad) between ring centroid and core. */
  phaseDelta: number;
  /** Number of vertices in this ring. */
  vertexCount: number;
}

export interface PinealCoreReading {
  /** Aggregate self-measurement closure ∈ [0,1] across all 22 modes. */
  selfMeasurement: number;
  /** Aggregate Kuramoto coherence ∈ [0,1] across all 22 modes. */
  selfCoherence: number;
  /** Core node amplitude (|pinealField[0]+i·pinealField[1]|). */
  coreAmplitude: number;
  /** Core node phase (atan2 of pinealField[1], pinealField[0]). */
  corePhase: number;
  /** Per-ring couplings (ring 1, 2, 3 in order). */
  ringCouplings: PinealRingCoupling[];
  /** Cosine of phase alignment between core and each of the 22 modes. */
  coreToModeAlignment: Float64Array;
  /** True iff the field length covers all 22 complex modes (44 floats). */
  fieldComplete: boolean;
}

/**
 * Read the pinealField (interleaved Re/Im, length ≥ 44) and produce a
 * self-measurement reading. Pure function — safe to call every tick.
 */
export function computePinealCore(
  pinealField: Float64Array | null | undefined,
): PinealCoreReading {
  const N = PINEAL_NODE_COUNT;
  const phases = new Float64Array(N);
  const amplitudes = new Float64Array(N);
  const coreToModeAlignment = new Float64Array(N);

  const fieldComplete = !!pinealField && pinealField.length >= N * 2;

  if (!fieldComplete) {
    return {
      selfMeasurement: 0,
      selfCoherence: 0,
      coreAmplitude: 0,
      corePhase: 0,
      ringCouplings: [],
      coreToModeAlignment,
      fieldComplete: false,
    };
  }

  // Derive (phase, amplitude) for every mode from the real engine field.
  for (let k = 0; k < N; k++) {
    const re = pinealField![k * 2] || 0;
    const im = pinealField![k * 2 + 1] || 0;
    phases[k] = Math.atan2(im, re);
    const a = Math.sqrt(re * re + im * im);
    amplitudes[k] = Number.isFinite(a) && a > 0 ? a : 0;
  }

  const corePhase = phases[0];
  const coreAmplitude = amplitudes[0];

  // Cosine alignment of every mode with the core (1 = aligned, −1 = anti).
  for (let k = 0; k < N; k++) {
    coreToModeAlignment[k] = Math.cos(phases[k] - corePhase);
  }

  // Per-ring closure: feed (ring vertices ∪ core) into the shared kernel.
  // Including the core in the vertex set turns "ring vs core" into a true
  // toroidal-closure measurement rather than a one-sided projection.
  const ringCouplings: PinealRingCoupling[] = [];
  for (let r = 1; r < PINEAL_RINGS.length; r++) {
    const idxs = PINEAL_RINGS[r];
    const len = idxs.length + 1; // +1 for core
    const ringPhases = new Float64Array(len);
    const ringAmps = new Float64Array(len);
    ringPhases[0] = corePhase;
    ringAmps[0] = coreAmplitude;
    let sumRe = 0;
    let sumIm = 0;
    for (let i = 0; i < idxs.length; i++) {
      const k = idxs[i];
      ringPhases[i + 1] = phases[k];
      ringAmps[i + 1] = amplitudes[k];
      sumRe += amplitudes[k] * Math.cos(phases[k]);
      sumIm += amplitudes[k] * Math.sin(phases[k]);
    }
    const ringCentroidPhase = Math.atan2(sumIm, sumRe);
    // Resonance from core amplitude (caps ψ-damping at the core's strength).
    const resonance = Math.min(1, coreAmplitude);
    const k = toroidalClosure(ringPhases, ringAmps, { resonance });
    ringCouplings.push({
      ring: r,
      closure: k.closure,
      coherence: k.coherence,
      phaseDelta: ringCentroidPhase - corePhase,
      vertexCount: idxs.length,
    });
  }

  // Aggregate: full 22-mode closure (the engine's overall self-measurement).
  const allReading = toroidalClosure(phases, amplitudes, {
    resonance: Math.min(1, coreAmplitude),
  });

  return {
    selfMeasurement: allReading.closure,
    selfCoherence: allReading.coherence,
    coreAmplitude,
    corePhase,
    ringCouplings,
    coreToModeAlignment,
    fieldComplete: true,
  };
}

/**
 * Compact one-line grounding string for Reality Drift Layer 16 / chat
 * context. Returns '' if the field is incomplete.
 */
export function pinealCoreGrounding(
  pinealField: Float64Array | null | undefined,
): string {
  const r = computePinealCore(pinealField);
  if (!r.fieldComplete) return '';
  const ringStr = r.ringCouplings
    .map(rc => `R${rc.ring}=${(rc.closure * 100).toFixed(0)}%`)
    .join(' ');
  return `selfMeas=${(r.selfMeasurement * 100).toFixed(1)}% selfCoh=${(r.selfCoherence * 100).toFixed(1)}% coreAmp=${r.coreAmplitude.toFixed(3)} ${ringStr}`;
}
