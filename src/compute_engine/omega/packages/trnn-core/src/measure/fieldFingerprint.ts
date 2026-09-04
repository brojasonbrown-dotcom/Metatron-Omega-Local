/**
 * fieldFingerprint — the φ-anchored multi-scale field invariant (Ω-REAL: Layer B).
 *
 * The web is a φ-octave ladder, so the honest "fingerprint" of a field is the
 * SHAPE of its log-space measures across SCALE — not any single rung. This
 * module folds the `scaleSignature` readout into one canonical, unit-norm
 * vector: the concatenation of the per-rung log-energy, log-peak and
 * log-mean-magnitude spectra, L2-normalised.
 *
 * Properties (the reason this is the invariant, not a bag of numbers):
 *   • φ-anchored   — dimension 0..rungs−1 indexes the φ-octave ladder (n grows
 *                    as φ^k, logRadius ~ k·ln φ), so the vector is a function of
 *                    log-scale, the physical coordinate the ladder exists in.
 *   • log-space    — L5: dlog (deterministic) so the 10⁶¹ magnitude span of the
 *                    ladder cannot overflow or drown fine scales.
 *   • scale-invariant — unit L2 norm, so the vector is the field's SHAPE; total
 *                    "loudness" is split into `magnitude` and does not leak into
 *                    the comparison metric.
 *   • deterministic — dlog only; no host-libm, no wall-clock, no RNG (L2).
 *
 * Observe-only: composes `scaleSignature`, advances no engine state.
 */

import type { MultiTorusEngine } from '../engine/MultiTorusEngine';
import { dlog } from '../core/dmath';
import { scaleSignature } from './scaleSignature';

/** dlog is only defined on (0, ∞); energies below this clamp to it. */
const LOG_FLOOR = 1e-15;

/** Number of per-rung feature channels packed into `vector`. */
export const FINGERPRINT_CHANNELS = 3 as const;

export interface FieldFingerprint {
  /** Number of scale rungs (φ-octaves) the fingerprint spans. */
  readonly rungs: number;
  /** Feature channels packed into `vector` (log-energy, log-peak, log-mean). */
  readonly channels: number;
  /** The canonical invariant: concatenated log-spectra, L2-normalised to unit
   *  norm. Slices [0,rungs) = log-energy, [rungs,2rungs) = log-peak,
   *  [2rungs,3rungs) = log-mean. */
  readonly vector: Float64Array;
  /** L2 norm of the concatenation BEFORE normalisation — the field's loudness. */
  readonly magnitude: number;
}

/** Fold the scale signature of a live engine into the canonical fingerprint. */
export function fieldFingerprint(engine: MultiTorusEngine): FieldFingerprint {
  const sig = scaleSignature(engine);
  const n = sig.rungs.length;
  const CH = FINGERPRINT_CHANNELS;
  const v = new Float64Array(n * CH);
  for (let r = 0; r < n; r++) {
    const f = sig.rungs[r];
    v[r] = dlog(Math.max(f.energy, LOG_FLOOR));
    v[n + r] = dlog(Math.max(f.peak, LOG_FLOOR));
    v[2 * n + r] = dlog(Math.max(f.meanMagnitude, LOG_FLOOR));
  }
  let s2 = 0;
  for (let i = 0; i < v.length; i++) s2 += v[i] * v[i];
  const magnitude = Math.sqrt(s2);
  const unit = new Float64Array(v.length);
  if (magnitude > 0) {
    for (let i = 0; i < v.length; i++) unit[i] = v[i] / magnitude;
  }
  return { rungs: n, channels: CH, vector: unit, magnitude };
}

/** Euclidean distance between two unit fingerprints — in [0, 2]. */
export function fingerprintDistance(a: Float64Array, b: Float64Array): number {
  let s2 = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s2 += d * d;
  }
  return Math.sqrt(s2);
}
