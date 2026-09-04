/**
 * Ω-REAL · P9 battery — the live analysis service and the xcorr stack.
 *
 * The battery is written so that it FAILS IF A NUMBER IS FABRICATED:
 *  • the service's heartbeat must match `heartbeatSchedule` tick-for-tick;
 *  • rings must wrap correctly — linearised output is the last 233 samples,
 *    oldest to newest, and a partial ring reports only what it honestly has;
 *  • `analysis: null` must be digest-identical to the default observe-only
 *    service over 4181 ticks — and so must the injectToMind opt-in, because
 *    nothing the service does may reach back into the field;
 *  • GCC-PHAT through the stack must recover a known lag on synthetic signals;
 *  • independent noise must read as low coherence and starved windows must
 *    abstain (null/NaN) — never a manufactured 0.
 */

import { describe, expect, it } from 'vitest';
import { AnalysisService, RING_DEPTH, type AnalysisReport } from '../src/analysis/service';
import { xcorrStack } from '../src/analysis/xcorrStack';
import { EvidenceLedger, summarize } from '../src/analysis/evidenceLedger';
import { heartbeatSchedule, isStableRung } from '../src/substrate/phiSubstrate';
import { EngineHost } from '../src/runtime/host';
import type { WebTickReport } from '../src/engine/MultiTorusEngine';
import type { SensePlaneReport } from '../src/sense/plane';
import { SeedStream } from '../src/core/determinism';

const rng = (seed: string) => new SeedStream(seed);

/** Box–Muller from the deterministic seed stream. */
function gauss(s: SeedStream): number {
  const u = Math.max(1e-12, s.next());
  const v = s.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function series(n: number, f: (i: number) => number): Float64Array {
  const a = new Float64Array(n);
  for (let i = 0; i < n; i++) a[i] = f(i);
  return a;
}

/** Minimal tick report carrying one rung's coherence/energy. */
function fakeTick(tick: number, coherence: number, energy: number): WebTickReport {
  return { tick, rungs: [{ coherence, energy }] } as unknown as WebTickReport;
}

/** Minimal sense plane report carrying one channel's fused energy. */
function fakeSense(energy: number): SensePlaneReport {
  return { fusion: { channels: [{ id: 'a', energy }] } } as unknown as SensePlaneReport;
}

describe('P9 · heartbeat scheduler', () => {
  it('onTick matches heartbeatSchedule tick-for-tick over three cycles', () => {
    const svc = new AnalysisService({ rungs: 1, xcorr: false });
    const expected = heartbeatSchedule(3);
    const got: { tick: number; kind: string }[] = [];
    for (let t = 0; t < 3 * 28; t++) {
      const kind = svc.onTick(t);
      if (kind) got.push({ tick: t, kind });
    }
    expect(got).toEqual(expected);
    // and every firing tick is provably a stable rung
    for (const ev of got) expect(isStableRung(ev.tick)).toBe(true);
  });

  it('fires on the {12,2} gap pattern: long = batch, short = incremental', () => {
    const svc = new AnalysisService({ rungs: 1, xcorr: false });
    const kinds = [];
    for (let t = 0; t < 28; t++) {
      const kind = svc.onTick(t);
      if (kind) kinds.push(kind);
    }
    expect(kinds).toEqual(['long', 'long', 'short', 'long']);
  });
});

describe('P9 · rings', () => {
  it('rings wrap: linearised output is the last 233 values, oldest to newest', () => {
    const svc = new AnalysisService({ rungs: 1, xcorr: false });
    for (let t = 0; t < 400; t++) svc.observe(fakeTick(t, t * 1.5, t), fakeSense(t % 7));
    const coh = svc.rungCoherence(0);
    const en = svc.rungEnergy(0);
    const ch = svc.channelEnergy('a')!;
    expect(coh.length).toBe(RING_DEPTH);
    expect(en.length).toBe(RING_DEPTH);
    expect(ch.length).toBe(RING_DEPTH);
    for (let i = 0; i < RING_DEPTH; i++) {
      const t = 400 - RING_DEPTH + i;
      expect(coh[i]).toBe(t * 1.5);
      expect(en[i]).toBe(t);
      expect(ch[i]).toBe(t % 7);
    }
  });

  it('a partial ring reports only what it honestly holds', () => {
    const svc = new AnalysisService({ rungs: 1, xcorr: false });
    for (let t = 0; t < 50; t++) svc.observe(fakeTick(t, t, t), null);
    const coh = svc.rungCoherence(0);
    expect(coh.length).toBe(50);
    for (let i = 0; i < 50; i++) expect(coh[i]).toBe(i);
    expect(svc.channelEnergy('a')).toBeNull();
  });

  it('a non-finite sample is excluded from the stack rather than averaged away', () => {
    const svc = new AnalysisService({ rungs: 2, xcorr: true });
    const dirty = { tick: 0, rungs: [{ coherence: 1, energy: 1 }, { coherence: NaN, energy: 1 }] };
    for (let t = 0; t < RING_DEPTH + 28; t++) {
      dirty.tick = t;
      svc.observe(dirty as unknown as WebTickReport, null);
    }
    // long heartbeats ran with full rings, but the NaN-carrying rung's series
    // must never reach the estimator — so no pair exists at all.
    const rep = svc.report();
    expect(rep).not.toBeNull();
    expect(rep!.xcorr).not.toBeNull();
    expect(rep!.xcorr!.pairs.length).toBe(0);
    expect(rep!.xcorr!.abstained).toBe(true);
    expect(rep!.xcorr!.fusedCoherence).toBeNaN();
  });
});

describe('P9 · host integration (certification gates)', () => {
  it('analysis: null and injectToMind: true are both digest-identical to the default host over 4181 ticks', () => {
    const off = new EngineHost({ profile: 'PICO', seed: 'r9-digest', analysis: null });
    const on = new EngineHost({ profile: 'PICO', seed: 'r9-digest' });
    const inj = new EngineHost({ profile: 'PICO', seed: 'r9-digest', analysis: { xcorr: true, injectToMind: true } });
    let mismatches = 0;
    for (let t = 0; t < 4181; t++) {
      const d = off.stepOnce().digest;
      if (on.stepOnce().digest !== d) mismatches++;
      if (inj.stepOnce().digest !== d) mismatches++;
    }
    expect(mismatches).toBe(0);

    // the default service really ran: rings are full and the long-heartbeat
    // stack produced a report with all three rung pairs measured.
    const view = on.analysis();
    expect(view).not.toBeNull();
    expect(isStableRung(view!.tick)).toBe(true);
    expect(view!.xcorr).not.toBeNull();
    expect(view!.xcorr!.pairs.length).toBe(3); // PICO: 3 rungs → 3 pairs, no channels declared
    for (const p of view!.xcorr!.pairs) {
      expect(p.msc).not.toBeNull();
      expect(p.plv).not.toBeNull();
      expect(p.lag).not.toBeNull();
    }
    expect(Number.isFinite(view!.xcorr!.fusedCoherence)).toBe(true);
    expect(Number.isFinite(view!.xcorr!.meanPlv)).toBe(true);
    // the dominant pair earned the Level-2 family; the others abstain from it
    expect(view!.xcorr!.dominant).not.toBeNull();
    const dominant = view!.xcorr!.pairs.find((p) => `${p.a}×${p.b}` === view!.xcorr!.dominant)!;
    expect(dominant.dcor).not.toBeNull();
    for (const p of view!.xcorr!.pairs) {
      if (p === dominant) continue;
      expect(p.dcor).toBeNull();
      expect(p.hsic).toBeNull();
      expect(p.mi).toBeNull();
    }

    // Level-3 causality rides the dominant pair only; a verdict is always quoted
    // (a net direction may abstain to null, but the pair is never silent).
    expect(['x→y', 'y→x', 'bidirectional', 'none']).toContain(dominant.verdict);
    if (dominant.directed !== null) {
      expect(Number.isFinite(dominant.directed)).toBe(true);
      expect(dominant.directed).toBeGreaterThanOrEqual(-1);
      expect(dominant.directed).toBeLessThanOrEqual(1);
    }
    for (const p of view!.xcorr!.pairs) {
      if (p === dominant) continue;
      expect(p.directed).toBeNull();
      expect(p.verdict).toBeNull();
    }

    // a ladder-wide DMD fit ran on the long heartbeat (PICO: rank ≤ 3 rungs)
    expect(view!.dmd).not.toBeNull();
    expect(view!.dmd!.rank).toBeGreaterThanOrEqual(0);
    expect(view!.dmd!.rank).toBeLessThanOrEqual(3);
    if (!view!.dmd!.abstained) {
      expect(Number.isFinite(view!.dmd!.spectralRadius)).toBe(true);
      expect(view!.dmd!.modes.length).toBeGreaterThanOrEqual(1);
    }

    // ACI calibrated a conformal interval on the fused-coherence forecast
    expect(view!.conformalHalfWidth).not.toBeNull();
    expect(Number.isFinite(view!.conformalHalfWidth)).toBe(true);

    // the append-only evidence ledger sealed long-heartbeat findings live
    const ev = on.evidence();
    expect(ev).not.toBeNull();
    expect(ev!.sealCount).toBeGreaterThan(0);
    expect(ev!.size).toBeGreaterThan(0);
    expect(ev!.lastSeal).not.toBeNull();
    // a disabled host has no analysis view and no evidence ledger
    expect(off.analysis()).toBeNull();
    expect(off.evidence()).toBeNull();
    // 60 s: three PICO hosts × 4181 ticks, sharing the box with the oracle.
  }, 60_000);
});

describe('P9 · xcorr stack', () => {
  it('recovers a known lag through the whole stack', () => {
    const n = RING_DEPTH;
    const s = rng('r9/gcc');
    const base = series(n + 32, () => gauss(s));
    const D = 7;
    const x = series(n, (i) => base[i + 16]);
    const y = series(n, (i) => base[i + 16 - D]); // y lags x by D samples
    const rep = xcorrStack(
      [
        { id: 'x', series: x },
        { id: 'y', series: y },
      ],
      { tick: 13 },
    );
    expect(rep.pairs.length).toBe(1);
    const p = rep.pairs[0];
    expect(p.lag).not.toBeNull();
    expect(Math.round(p.lag!)).toBe(D);
    // a noiseless delayed copy is fully coherent in-band; Welch window edges
    // around the 7-sample shift shave the mean slightly below the identity 1
    expect(p.msc!).toBeGreaterThan(0.85);
    expect(rep.dominant).toBe('x×y');
    // dCor on a DELAYED white-noise pair is honestly low: y[i] = x[i−7] is
    // sample-wise independent for white noise — the dependence is temporal,
    // which is exactly what the lag/MSC readings above carry instead.
    expect(p.dcor).not.toBeNull();
    expect(p.dcor!).toBeLessThan(0.3);
    expect(Number.isFinite(rep.fusedCoherence)).toBe(true);
    expect(rep.abstained).toBe(false);
    // no previous report → surprise abstains
    expect(rep.surprise).toBeNaN();
  });

  it('independent noise reads as low coherence — never a fabricated edge', () => {
    const n = RING_DEPTH;
    const s = rng('r9/indep');
    const x = series(n, () => gauss(s));
    const y = series(n, () => gauss(s));
    const rep = xcorrStack([
      { id: 'x', series: x },
      { id: 'y', series: y },
    ]);
    const p = rep.pairs[0];
    expect(p.msc!).toBeLessThan(0.5);
    expect(p.plv!).toBeLessThan(0.5);
    expect(p.dcor!).toBeLessThan(0.3);
    expect(rep.fusedCoherence).toBeLessThan(0.5);
  });

  it('starved windows abstain across the board — null/NaN, never 0', () => {
    const x = series(5, (i) => i);
    const y = series(5, (i) => i * 2);
    const rep = xcorrStack([
      { id: 'x', series: x },
      { id: 'y', series: y },
    ]);
    const p = rep.pairs[0];
    expect(p.msc).toBeNull();
    expect(p.plv).toBeNull();
    expect(p.lag).toBeNull();
    expect(p.dcor).toBeNull();
    expect(p.hsic).toBeNull();
    expect(p.mi).toBeNull();
    expect(rep.dominant).toBeNull();
    expect(rep.fusedCoherence).toBeNaN();
    expect(rep.meanPlv).toBeNaN();
    expect(rep.maxLag).toBeNaN();
    expect(rep.surprise).toBeNaN();
    expect(rep.abstained).toBe(true);
  });

  it('surprise is the honest 1-step Δ of fusedCoherence', () => {
    const n = RING_DEPTH;
    const s = rng('r9/surprise');
    const tone = (i: number) => Math.sin((2 * Math.PI * 4 * i) / 64);
    const locked = [
      { id: 'x', series: series(n, (i) => tone(i) + 0.01 * gauss(s)) },
      { id: 'y', series: series(n, (i) => tone(i) + 0.01 * gauss(s)) },
    ];
    const free = [
      { id: 'x', series: series(n, () => gauss(s)) },
      { id: 'y', series: series(n, () => gauss(s)) },
    ];
    const r1 = xcorrStack(locked, { tick: 1 });
    expect(r1.surprise).toBeNaN(); // no previous measurement to differ against
    const r2 = xcorrStack(free, { tick: 2, prevFusedCoherence: r1.fusedCoherence });
    expect(r2.surprise).toBeCloseTo(Math.abs(r2.fusedCoherence - r1.fusedCoherence), 12);
    expect(r2.surprise).toBeGreaterThan(0.1); // coherence genuinely collapsed
    // an unmeasured previous value must not fabricate a surprise
    const r3 = xcorrStack(locked, { tick: 3, prevFusedCoherence: NaN });
    expect(r3.surprise).toBeNaN();
  });
});

describe('P9 · evidence ledger (append-only transparency)', () => {
  function makeReport(tick: number): AnalysisReport {
    const n = 64;
    const s = rng('r9/evidence');
    const x = series(n, (i) => Math.sin((2 * Math.PI * 3 * i) / n) + 0.05 * gauss(s));
    const y = series(n, (i) => Math.sin((2 * Math.PI * 3 * i) / n + 0.5) + 0.05 * gauss(s));
    const xcorr = xcorrStack(
      [
        { id: 'x', series: x },
        { id: 'y', series: y },
      ],
      { tick },
    );
    return { tick, kind: 'long', xcorr, dmd: null, conformalHalfWidth: null };
  }

  it('seals a finding, audits clean, and is deterministic across seeds', () => {
    const a = new EvidenceLedger('r9/evidence');
    const b = new EvidenceLedger('r9/evidence');
    expect(a.seal(makeReport(13))).not.toBeNull();
    expect(b.seal(makeReport(13))).not.toBeNull();
    expect(a.size).toBe(1);
    expect(a.sealCount).toBe(1);
    expect(a.audit(13).ok).toBe(true);
    // same seed → byte-identical root
    expect(a.rootHex()).toBe(b.rootHex());
  });

  it('abstains when there is no measurement to seal', () => {
    const led = new EvidenceLedger('r9/evidence-abstain');
    const empty: AnalysisReport = { tick: 1, kind: 'long', xcorr: null, dmd: null, conformalHalfWidth: null };
    expect(led.seal(empty)).toBeNull();
    expect(led.size).toBe(0);
    expect(led.sealCount).toBe(0);
  });

  it('seals the full-resolution report — every pair, mode, and the conformal width', () => {
    const n = 64;
    const s = rng('r9/summary');
    const x = series(n, (i) => Math.sin((2 * Math.PI * 3 * i) / n) + 0.05 * gauss(s));
    const y = series(n, (i) => Math.sin((2 * Math.PI * 3 * i) / n + 0.5) + 0.05 * gauss(s));
    const xcorr = xcorrStack([{ id: 'x', series: x }, { id: 'y', series: y }], { tick: 13 });
    const report: AnalysisReport = {
      tick: 13,
      kind: 'long',
      xcorr,
      conformalHalfWidth: 0.123,
      dmd: {
        tick: 13,
        rank: 1,
        modes: [{ lambdaRe: 0.9, lambdaIm: 0.1, magnitude: 0.9055, growth: -0.05, frequency: 0.02, energy: 1 }],
        spectralRadius: 0.9055,
        relError: 0.01,
        abstained: false,
      },
    };
    const body = summarize(report) as {
      conformalHalfWidth: number | null;
      xcorr: { pairs: unknown[] } | null;
      dmd: { modes: unknown[] } | null;
    };
    expect(body.conformalHalfWidth).toBeCloseTo(0.123, 12);
    expect(body.xcorr!.pairs.length).toBe(1);
    expect(body.dmd!.modes.length).toBe(1);
  });
});
