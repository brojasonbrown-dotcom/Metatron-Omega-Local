/**
 * Ω-P6 — multi-modal fusion.
 *
 * k channels are summed with a 1/√k weight. That factor is not cosmetic: for
 * channels whose phases are mutually incoherent (the generic case for distinct
 * modalities) the expected max-norm of the sum grows like √k, so dividing by
 * √k keeps the fused peak on the order of a single channel's peak. Coherent
 * channels — the same signal arriving twice — still reinforce, they just do so
 * inside the bound rather than through it.
 *
 * After summation the fused field is pushed through `boundField`, so the hard
 * law ‖v‖_inf ≤ φ holds for every fusion regardless of channel count or gain.
 */

import { maxNorm, zeroField, type CField } from '../core/complex';
import { boundField, SENSE_BOUND } from './encode';

export interface FusionInput {
  readonly id: string;
  readonly field: CField;
  /** Per-channel gain, clamped to [0, 1]. */
  readonly gain?: number;
}

export interface ChannelReport {
  readonly id: string;
  readonly gain: number;
  /** Mean pairwise cosine with the other channels, in [-1, 1]. */
  readonly coherence: number;
  /** Applied fusion weight (gain × coherence, L2-normalised so Σw² = 1). */
  readonly weight: number;
  readonly peak: number;
  readonly energy: number;
  /** Cosine alignment with the fused result, in [-1, 1]. */
  readonly alignment: number;
}

export interface FusionReport {
  readonly channels: readonly ChannelReport[];
  readonly count: number;
  /** 1/√k actually applied. */
  readonly weight: number;
  readonly rawPeak: number;
  readonly peak: number;
  readonly scale: number;
  readonly energy: number;
  /** True when the fused field respects ‖v‖_inf ≤ φ (must always be true). */
  readonly withinBound: boolean;
}

function alignmentOf(a: CField, b: CField): number {
  const n = Math.min(a.n, b.n);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a.re[i] * b.re[i] + a.im[i] * b.im[i];
    na += a.re[i] * a.re[i] + a.im[i] * a.im[i];
    nb += b.re[i] * b.re[i] + b.im[i] * b.im[i];
  }
  if (na <= 0 || nb <= 0) return 0;
  return dot / Math.sqrt(na * nb);
}

/**
 * Fuse `inputs` into `out` (must already be sized; channels of a different
 * node count are truncated to the overlap — callers transport first).
 */
export function fuseChannels(inputs: readonly FusionInput[], out: CField, bound = SENSE_BOUND): FusionReport {
  zeroField(out);
  const live = inputs.filter((c) => c.field.n > 0 && (c.gain ?? 1) > 0);
  const k = live.length;
  if (k === 0) {
    return {
      channels: [],
      count: 0,
      weight: 0,
      rawPeak: 0,
      peak: 0,
      scale: 1,
      energy: 0,
      withinBound: true,
    };
  }
  const w = 1 / Math.sqrt(k);
  // Coherence-weighted fusion: each channel's weight is its measured pairwise
  // coherence with the others (cosine, [-1,1] → [eps,1]) times its gain, then
  // L2-normalised so Σ w_i² = 1 — which preserves the √k peak bound exactly
  // while letting a coherent channel reinforce and an incoherent outlier be
  // damped. A lone channel (k=1) carries unit coherence, so the result is the
  // plain (gain-scaled) channel, identical to the old uniform path.
  // Consensus reference = unweighted mean of the live channels. Aligning each
  // channel to this mean (rather than to each other) is what correctly rewards
  // the *majority* and damps the outlier: in a 2-vs-1 split the two agreeing
  // channels read alignment +1 and the outlier −1, whereas mean pairwise cosine
  // would give the two agreeing channels a neutral 0.
  const mRe = new Float64Array(out.n);
  const mIm = new Float64Array(out.n);
  for (const c of live) {
    const n = Math.min(out.n, c.field.n);
    for (let j = 0; j < n; j++) {
      mRe[j] += c.field.re[j];
      mIm[j] += c.field.im[j];
    }
  }
  const meanField = { n: out.n, re: mRe, im: mIm };
  const coherence = live.map((c) => (k === 1 ? 1 : alignmentOf(c.field, meanField)));
  const rawW = live.map((c, i) => Math.min(1, Math.max(0, c.gain ?? 1)) * Math.max(1e-6, (coherence[i] + 1) / 2));
  const wnorm = Math.sqrt(rawW.reduce((s, x) => s + x * x, 0));
  const wgt = rawW.map((x) => (wnorm > 0 ? x / wnorm : 0));

  for (let i = 0; i < k; i++) {
    const g = wgt[i];
    if (g === 0) continue;
    const c = live[i];
    const n = Math.min(out.n, c.field.n);
    for (let j = 0; j < n; j++) {
      out.re[j] += g * c.field.re[j];
      out.im[j] += g * c.field.im[j];
    }
  }
  const b = boundField(out, bound);
  let energy = 0;
  for (let i = 0; i < out.n; i++) energy += out.re[i] * out.re[i] + out.im[i] * out.im[i];

  const channels: ChannelReport[] = live.map((c, i) => {
    let e = 0;
    for (let j = 0; j < c.field.n; j++) e += c.field.re[j] * c.field.re[j] + c.field.im[j] * c.field.im[j];
    return {
      id: c.id,
      gain: Math.min(1, Math.max(0, c.gain ?? 1)),
      coherence: coherence[i],
      weight: wgt[i],
      peak: maxNorm(c.field),
      energy: e,
      alignment: alignmentOf(c.field, out),
    };
  });

  return {
    channels,
    count: k,
    weight: w,
    rawPeak: b.rawPeak,
    peak: b.peak,
    scale: b.scale,
    energy,
    withinBound: maxNorm(out) <= bound + 1e-12,
  };
}
