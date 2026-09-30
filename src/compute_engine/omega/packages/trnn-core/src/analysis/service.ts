/**
 * Ω-REAL · P9 — the live analysis service (Phase 0 scaffolding).
 *
 * Until now the heartbeat schedule (P0) and the correlation stack (P2) were
 * certified but dormant: nothing in the tick loop ever called them. This
 * service is the observer that changes that. It rides the ladder's {12,2}
 * heartbeat — long gap = batch work, short = incremental — and keeps
 * fixed-depth rings of per-rung scalars (coherence, energy from the tick
 * report) and per-channel fused energy (from the sense plane report). On each
 * LONG heartbeat the xcorr stack runs over the full rings.
 *
 * DESIGN RULES (the certification culture, restated for this module):
 *  • observe-only: the service reads `WebTickReport` / `SensePlaneReport`
 *    snapshots and never writes the engine, so the digest chain is identical
 *    whether the service is on, gated, or absent (`analysis: null`);
 *  • abstain, never fabricate: a ring that is not yet full, or a series
 *    carrying a non-finite sample, is not evidence — it is excluded from the
 *    stack and the report shows null/NaN, never a manufactured 0;
 *  • the per-tick path does not allocate: rings are preallocated Float64Array
 *    buffers; the only copies happen inside the long-heartbeat batch slot.
 */

import { heartbeatSchedule, LUCAS_MOD13_PERIOD, type HeartbeatKind } from '../substrate/phiSubstrate';
import type { WebTickReport } from '../engine/MultiTorusEngine';
import type { SensePlaneReport } from '../sense/plane';
import { xcorrStack, type NamedSeries, type XcorrReport } from './xcorrStack';
import { ladderDmd, type DmdLadderReport } from './dmdModes';
import { AdaptiveConformal } from '../harness/conformal';
import { waveletDwt } from '../spectral/wavelet';
import { emd } from '../substrate/emd';

/** Ring depth — F13 = 233 ticks of history per series (Fibonacci). */
export const RING_DEPTH = 233;

/**
 * Host gate for the analysis service. `xcorr` is observation and defaults on;
 * every flag that would let analysis WRITE back into cognition
 * (`injectToMind`, and the later-phase `plasticity` / `binding` /
 * `worldModel` / `replay`) defaults off. `null` on the host disables the
 * service entirely — digest-identical, since the service only ever reads.
 */
export interface AnalysisOptions {
  readonly xcorr?: boolean;
  readonly injectToMind?: boolean;
  readonly plasticity?: boolean;
  readonly binding?: boolean;
  readonly worldModel?: boolean;
  readonly replay?: boolean;
}

export interface AnalysisReport {
  readonly tick: number;
  readonly kind: HeartbeatKind;
  /** Latest long-heartbeat stack report; null until the first one runs. */
  readonly xcorr: XcorrReport | null;
  /** Latest ladder-wide DMD mode fit; null until the first long heartbeat. */
  readonly dmd: DmdLadderReport | null;
  /** ACI half-width for the fused-coherence forecast, or null when abstained. */
  readonly conformalHalfWidth: number | null;
  /** M2 wave analysis (DWT + EMD) of the base rung's coherence series. */
  readonly wave: WaveAnalysis | null;
}

/** Ω-REAL M2 — time-frequency decomposition of the base rung's coherence. */
export interface WaveAnalysis {
  /** DWT (db4) levels produced, or 0 when the series abstained. */
  readonly waveletLevels: number;
  readonly waveletAbstained: boolean;
  /** Intrinsic mode functions found by EMD, or 0 when the series abstained. */
  readonly emdImfs: number;
  readonly emdAbstained: boolean;
}

/**
 * Fixed-depth Float64 ring. `push` never allocates; `linearize` copies only
 * when a heartbeat's batch slot asks for a chronological window.
 */
class Ring {
  private readonly buf: Float64Array;
  private head = 0;
  private n = 0;
  /** False once a non-finite sample passes through — the ring stays honest. */
  private clean = true;

  constructor(readonly depth: number) {
    this.buf = new Float64Array(depth);
  }

  push(v: number): void {
    if (!Number.isFinite(v)) this.clean = false;
    this.buf[this.head] = v;
    this.head = (this.head + 1) % this.depth;
    if (this.n < this.depth) this.n++;
  }

  get filled(): boolean {
    return this.n >= this.depth;
  }

  get count(): number {
    return this.n;
  }

  get finite(): boolean {
    return this.clean;
  }

  /** Chronological copy, oldest → newest, of whatever the ring holds. */
  linearize(): Float64Array {
    const out = new Float64Array(this.n);
    const start = this.n < this.depth ? 0 : this.head;
    for (let i = 0; i < this.n; i++) out[i] = this.buf[(start + i) % this.depth];
    return out;
  }
}

export interface AnalysisServiceOptions {
  /** Ladder rung count — one coherence ring and one energy ring per rung. */
  readonly rungs: number;
  /** Run the xcorr stack on long heartbeats. Default on (observe-only). */
  readonly xcorr?: boolean;
  readonly depth?: number;
}

export class AnalysisService {
  readonly depth: number;
  private readonly xcorrEnabled: boolean;
  private readonly rungCoherenceRings: Ring[];
  private readonly rungEnergyRings: Ring[];
  private readonly channelRings = new Map<string, Ring>();
  /** Stable-rung mask over the 28-cycle, derived once from heartbeatSchedule. */
  private readonly stable: readonly boolean[];
  private prevStable: number | null = null;
  private lastReport: AnalysisReport | null = null;
  private lastXcorr: XcorrReport | null = null;
  private lastDmd: DmdLadderReport | null = null;
  private lastWave: WaveAnalysis | null = null;
  private readonly conformal: AdaptiveConformal | null;
  private conformalHalfWidth: number | null = null;

  constructor(opts: AnalysisServiceOptions) {
    this.depth = opts.depth ?? RING_DEPTH;
    this.xcorrEnabled = opts.xcorr ?? true;
    this.conformal = this.xcorrEnabled ? new AdaptiveConformal() : null;
    this.rungCoherenceRings = Array.from({ length: opts.rungs }, () => new Ring(this.depth));
    this.rungEnergyRings = Array.from({ length: opts.rungs }, () => new Ring(this.depth));
    const mask = new Array<boolean>(LUCAS_MOD13_PERIOD).fill(false);
    for (const ev of heartbeatSchedule(1)) mask[ev.tick % LUCAS_MOD13_PERIOD] = true;
    this.stable = mask;
  }

  /**
   * Heartbeat at this tick, or null. Same rule as `heartbeatSchedule`: a tick
   * fires when it lands on a stable rung, and the kind is 'short' exactly when
   * the previous stable rung was 2 ticks ago (the {12,2} gap pattern).
   */
  onTick(tick: number): HeartbeatKind | null {
    const r = ((tick % LUCAS_MOD13_PERIOD) + LUCAS_MOD13_PERIOD) % LUCAS_MOD13_PERIOD;
    if (!this.stable[r]) return null;
    const kind: HeartbeatKind = this.prevStable !== null && tick - this.prevStable === 2 ? 'short' : 'long';
    this.prevStable = tick;
    return kind;
  }

  /**
   * Feed one tick. Called from `stepOnce` after `foldPerception`; pure
   * observation of the two reports, plus the long-heartbeat batch slot.
   */
  observe(rep: WebTickReport, sense: SensePlaneReport | null): void {
    const kind = this.onTick(rep.tick);
    for (let i = 0; i < this.rungCoherenceRings.length; i++) {
      const t = rep.rungs[i];
      this.rungCoherenceRings[i].push(t?.coherence ?? NaN);
      this.rungEnergyRings[i].push(t?.energy ?? NaN);
    }
    if (sense) {
      for (const ch of sense.fusion.channels) {
        let ring = this.channelRings.get(ch.id);
        if (!ring) {
          ring = new Ring(this.depth);
          this.channelRings.set(ch.id, ring);
        }
        ring.push(ch.energy);
      }
    }
    if (kind === null) return;
    if (kind === 'long' && this.xcorrEnabled) this.runXcorr(rep.tick);
    this.lastReport = { tick: rep.tick, kind, xcorr: this.lastXcorr, dmd: this.lastDmd, conformalHalfWidth: this.conformalHalfWidth, wave: this.lastWave };
  }

  /**
   * The batch slot. Only rings that are full AND finite enter the stack — a
   * partial or dirty window is not evidence, and the estimators' own floors
   * would only see a shorter honest series anyway.
   */
  private runXcorr(tick: number): void {
    const named: NamedSeries[] = [];
    for (let i = 0; i < this.rungCoherenceRings.length; i++) {
      const ring = this.rungCoherenceRings[i];
      if (ring.filled && ring.finite) named.push({ id: `r${i}`, series: ring.linearize() });
    }
    for (const id of [...this.channelRings.keys()].sort()) {
      const ring = this.channelRings.get(id)!;
      if (ring.filled && ring.finite) named.push({ id: `c:${id}`, series: ring.linearize() });
    }
    const prevFused = this.lastXcorr?.fusedCoherence ?? NaN;
    this.lastXcorr = xcorrStack(named, {
      tick,
      prevFusedCoherence: prevFused,
    });

    // DMD over the ladder's coherence trajectory: snapshots are per-tick vectors
    // of the full, finite rung-coherence rings. Observe-only; abstains below MIN_SNAPSHOTS.
    const rungSeries: Float64Array[] = [];
    for (let i = 0; i < this.rungCoherenceRings.length; i++) {
      const ring = this.rungCoherenceRings[i];
      if (ring.filled && ring.finite) rungSeries.push(ring.linearize());
    }
    this.lastDmd = ladderDmd(rungSeries, tick);

    // M2 wave — DWT + EMD over the base rung's coherence series (observe-only).
    // Both abstain below their own floors; a partial/dirty ring yields null.
    const baseCoh = this.rungCoherenceRings[0];
    if (baseCoh && baseCoh.filled && baseCoh.finite) {
      const series = baseCoh.linearize();
      // The DWT halves length per level, so an odd-length window abstains (233
      // is Fibonacci-odd). Feed it an even window (drop the last sample — a
      // view, no copy) so the transform actually runs; EMD takes the full ring.
      const even = series.length % 2 === 0 ? series : series.subarray(0, series.length - 1);
      const w = waveletDwt(even, { kind: 'db4' });
      const e = emd(series);
      this.lastWave = {
        waveletLevels: w.levels.length,
        waveletAbstained: w.abstained,
        emdImfs: e.imfs.length,
        emdAbstained: e.abstained,
      };
    } else {
      this.lastWave = null;
    }

    // ACI: the previous fused coherence is the forecast, the current one the
    // truth. The half-width returned is the calibrated interval for THIS event.
    const curr = this.lastXcorr.fusedCoherence;
    if (this.conformal && Number.isFinite(prevFused) && Number.isFinite(curr)) {
      this.conformalHalfWidth = this.conformal.observe(prevFused, curr).halfWidth;
    } else {
      this.conformalHalfWidth = null;
    }
  }

  /** Latest retained report, or null before the first heartbeat. */
  report(): AnalysisReport | null {
    return this.lastReport;
  }

  /** Chronological coherence window of one rung (copy; batch-path only). */
  rungCoherence(rank: number): Float64Array {
    return this.rungCoherenceRings[rank]?.linearize() ?? new Float64Array(0);
  }

  /** Chronological energy window of one rung (copy; batch-path only). */
  rungEnergy(rank: number): Float64Array {
    return this.rungEnergyRings[rank]?.linearize() ?? new Float64Array(0);
  }

  /** Chronological fused-energy window of one channel, or null if unknown. */
  channelEnergy(id: string): Float64Array | null {
    return this.channelRings.get(id)?.linearize() ?? null;
  }

  /** Channel ids currently ringed, sorted. */
  channelIds(): string[] {
    return [...this.channelRings.keys()].sort();
  }
}
