/**
 * Ω-REAL · P9 — the live cross-correlation / coherence stack.
 *
 * Pure batch estimator run on the analysis service's LONG heartbeat over the
 * Phase-0 rings. For every pair of named series it reports the three Level-1
 * readings (band-limited Welch MSC, band PLV, GCC-PHAT lag); the dominant pair
 * additionally earns the Level-2 family (dCor / HSIC / MI) via
 * `correlationReport`. Pair coherences are then fused by the P4 fusion law
 * (`fuseResonance`) with the measured circular phase deviation — the first
 * live caller of that law.
 *
 * DESIGN RULES (identical to the rest of the substrate):
 *  • abstain, never fabricate: every estimator keeps its own floor (MSC 3
 *    segments, PLV 34 usable samples, the F9 = 34 Level-2 floor). A pair that
 *    cannot be measured shows `null`; a report with no measured pair shows
 *    NaN scalars. Nothing here ever invents a 0;
 *  • this module is pure: no clocks, no RNG, no state. The one-step surprise
 *    is computed from a caller-supplied previous fused coherence, so the same
 *    inputs always give the same report.
 */

import { correlationReport } from '../substrate/correlation';
import { bandPLV, gccPhat, welchMSC } from '../substrate/signalStats';
import { circularPhaseDev, fuseResonance, type BusChannel } from '../substrate/resonanceBus';
import { directedReport } from '../substrate/causal';

/** Tick-domain sample rate: one sample per tick, so frequencies are cycles/tick. */
export const XCORR_FS = 1;

/**
 * Default analysis band, cycles/tick: from the lowest bin a 64-sample Welch
 * segment resolves (1/64) up to a quarter of the tick rate. Callers after a
 * specific rhythm pass their own band; this one hears everything the rings
 * can honestly resolve.
 */
export const XCORR_BAND: readonly [number, number] = [1 / 64, 1 / 4];

export interface NamedSeries {
  readonly id: string;
  readonly series: ArrayLike<number>;
}

export interface XcorrPairReport {
  readonly a: string;
  readonly b: string;
  /** Band-mean magnitude-squared coherence in [0,1], or null on abstention. */
  readonly msc: number | null;
  /** Band phase-locking value in [0,1], or null on abstention. */
  readonly plv: number | null;
  /** Delay of b relative to a in samples (positive ⇒ b lags a), or null. */
  readonly lag: number | null;
  /** Level-2 family — measured on the dominant pair only, null elsewhere. */
  readonly dcor: number | null;
  readonly hsic: number | null;
  readonly mi: number | null;
  /** Level-3 causality — net directionality on the dominant pair only, else null. */
  readonly directed: number | null;
  readonly verdict: 'x→y' | 'y→x' | 'bidirectional' | 'none' | null;
}

export interface XcorrReport {
  readonly tick: number;
  readonly pairs: readonly XcorrPairReport[];
  /** Pair key `a×b` that earned the Level-2 family, or null when none spoke. */
  readonly dominant: string | null;
  /** P4 fusion of pair coherences with measured phase deviation; NaN = abstained. */
  readonly fusedCoherence: number;
  /** Mean of the measured PLVs; NaN when no pair produced one. */
  readonly meanPlv: number;
  /** Largest measured |lag| in samples; NaN when no pair produced one. */
  readonly maxLag: number;
  /** 1-step |Δ| of fusedCoherence (the xcorrSurprise mind dim); NaN until two measured reports. */
  readonly surprise: number;
  /** True when not a single pair produced a measurement. */
  readonly abstained: boolean;
}

export interface XcorrOptions {
  readonly fs?: number;
  readonly band?: readonly [number, number];
  readonly tick?: number;
  /** Previous report's fusedCoherence; non-finite or absent → surprise abstains. */
  readonly prevFusedCoherence?: number;
}

/**
 * Run the stack over `named` series. Pair order is the input order (i < j), so
 * the report is bit-reproducible for a fixed input list.
 */
export function xcorrStack(named: readonly NamedSeries[], opts: XcorrOptions = {}): XcorrReport {
  const fs = opts.fs ?? XCORR_FS;
  const band: [number, number] = opts.band ? [opts.band[0], opts.band[1]] : [XCORR_BAND[0], XCORR_BAND[1]];
  const tick = opts.tick ?? 0;

  const pairs: XcorrPairReport[] = [];
  const phases: number[] = [];
  let dominantIdx = -1;
  let dominantScore = -Infinity;

  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      const x = named[i].series;
      const y = named[j].series;
      const m = welchMSC(x, y, { fs, band });
      const p = bandPLV(x, y, band, fs);
      const g = gccPhat(x, y);
      const msc = m.bandMean; // null both on abstention and on an empty band
      const plv = p.plv;
      const lag = g.abstained ? null : g.lag;
      if (p.meanPhase !== null && Number.isFinite(p.meanPhase)) phases.push(p.meanPhase);
      const score = msc ?? plv ?? -Infinity;
      if (score > dominantScore) {
        dominantScore = score;
        dominantIdx = pairs.length;
      }
      pairs.push({ a: named[i].id, b: named[j].id, msc, plv, lag, dcor: null, hsic: null, mi: null, directed: null, verdict: null });
    }
  }

  // The Level-2 family is quadratic; only the dominant pair earns it.
  let dominant: string | null = null;
  if (dominantIdx >= 0 && dominantScore > -Infinity) {
    const pair = pairs[dominantIdx];
    const x = named.find((s) => s.id === pair.a)!.series;
    const y = named.find((s) => s.id === pair.b)!.series;
    const r = correlationReport(x, y);
    const dir = directedReport(x, y, { maxLag: 8 });
    pairs[dominantIdx] = {
      ...pair,
      dcor: r.dcor.value,
      hsic: r.hsic.value,
      mi: r.mi.value,
      directed: dir.netDirection,
      verdict: dir.verdict,
    };
    dominant = `${pair.a}×${pair.b}`;
  }

  // P4 fusion over the measured pair coherences, with the measured circular
  // phase deviation as the γ channel. Unmeasured pairs abstain out of the
  // product entirely — they neither help nor hurt the fused value.
  const channels: BusChannel[] = [];
  for (const p of pairs) {
    if (p.msc !== null && Number.isFinite(p.msc)) channels.push({ id: `${p.a}×${p.b}`, value: p.msc });
  }
  const fusion = fuseResonance(channels, { phaseDev: circularPhaseDev(phases) });

  let plvSum = 0;
  let plvN = 0;
  let maxLag = 0;
  let lagN = 0;
  for (const p of pairs) {
    if (p.plv !== null && Number.isFinite(p.plv)) {
      plvSum += p.plv;
      plvN++;
    }
    if (p.lag !== null && Number.isFinite(p.lag)) {
      maxLag = Math.max(maxLag, Math.abs(p.lag));
      lagN++;
    }
  }

  const fused = fusion.value;
  const prev = opts.prevFusedCoherence ?? NaN;
  const surprise = Number.isFinite(fused) && Number.isFinite(prev) ? Math.abs(fused - prev) : NaN;

  return {
    tick,
    pairs,
    dominant,
    fusedCoherence: fused,
    meanPlv: plvN > 0 ? plvSum / plvN : NaN,
    maxLag: lagN > 0 ? maxLag : NaN,
    surprise,
    abstained: fusion.counted === 0 && plvN === 0 && lagN === 0,
  };
}
