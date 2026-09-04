/**
 * q2 — Ω-REAL full-field self-measurement battery (Q2).
 *
 * Pins that `SelfMeasureTracker` measures every rung of the live engine — drift
 * vs the persistence predictor, temporal coherence, information density,
 * inertia, closure γ, energy — and a global Lyapunov descent certificate, by
 * reusing the canonical field-kernel-core operators against the per-rung 13-mode
 * signature. It must be:
 *   • honest — drift/temporal-coherence/inertia are 0 before any history exists;
 *   • bounded — energy, drift, inertia ≥ 0; closure γ ∈ [0,1]; lyapunov ≥ 0;
 *   • deterministic — identical engines ⇒ identical reports;
 *   • correct — information density is 0 for a single mode, log₂(M) for a flat
 *     M-mode spectrum.
 */

import { describe, expect, it } from 'vitest';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { DENSE_CORE } from '../src/core/scaleLadder';
import { SelfMeasureTracker, informationDensity, scaleEntropy, crossScaleDrift } from '../src/measure/selfMeasure';
import { QualiaTracker } from '../src/measure/qualia';

const F = (x: number[]): Float64Array => Float64Array.from(x);

describe('Q2 · full-field self-measurement', () => {
  it('computes information density correctly', () => {
    expect(informationDensity(F([1, 0, 0, 0, 0]))).toBeCloseTo(0, 10); // single mode
    expect(informationDensity(F([1, 1, 1, 1, 1]))).toBeCloseTo(Math.log2(5), 10); // flat
    expect(Number.isNaN(informationDensity(F([0, 0, 0, 0, 0])))).toBe(true); // dark
  });

  it('computes scale entropy and cross-scale drift correctly', () => {
    // scale entropy: uniform energy across 4 rungs → log2(4); one rung → 0
    expect(scaleEntropy([1, 1, 1, 1])).toBeCloseTo(2, 10);
    expect(scaleEntropy([1, 0, 0, 0])).toBeCloseTo(0, 10);
    expect(Number.isNaN(scaleEntropy([]))).toBe(true);
    // cross-scale drift: identical adjacent signatures → 0; shifted → Σ d²
    expect(crossScaleDrift([F([1, 2]), F([1, 2])])).toBe(0);
    expect(crossScaleDrift([F([1, 2]), F([3, 4])])).toBeCloseTo(8, 10);
  });

  it('reports zero history-dependent axes on the first observation', () => {
    const t = new SelfMeasureTracker();
    const rep = t.observe([F([1, 2, 3])], [0.5], [1], [1]);
    expect(rep.rungs[0].drift).toBe(0);
    expect(rep.rungs[0].temporalCoherence).toBe(0);
    expect(rep.rungs[0].inertia).toBe(0);
    expect(Number.isFinite(rep.rungs[0].informationDensity)).toBe(true);
  });

  it('reset clears history', () => {
    const t = new SelfMeasureTracker();
    t.observe([F([1, 2, 3])], [0.5], [1], [1]);
    t.observe([F([2, 3, 4])], [0.6], [2], [1]);
    t.reset();
    const rep = t.observe([F([1, 2, 3])], [0.5], [1], [1]);
    expect(rep.rungs[0].drift).toBe(0);
    expect(rep.rungs[0].inertia).toBe(0);
  });

  it('measures every rung of a live engine, bounded and finite', () => {
    const eng = new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 3), nodes: 21, seed: 'q2-live', drive: 0.5 });
    const t = new SelfMeasureTracker();
    for (let tick = 0; tick < 200; tick++) {
      const rep = eng.step();
      const sigs = eng.engines.map((e) => e.snapshot().signature);
      const gammas = rep.rungs.map((r) => r.closureQuality);
      const energies = rep.rungs.map((r) => r.energy);
      const ns = eng.rungs.map((r) => r.n);
      const report = t.observe(sigs, gammas, energies, ns);

      expect(report.rungs.length).toBe(eng.engines.length);
      expect(Number.isFinite(report.lyapunov)).toBe(true);
      expect(report.lyapunov).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(report.scaleEntropy)).toBe(true);
      expect(report.scaleEntropy).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(report.scaleDrift)).toBe(true);
      expect(report.scaleDrift).toBeGreaterThanOrEqual(0);
      for (const r of report.rungs) {
        expect(Number.isFinite(r.energy)).toBe(true);
        expect(Number.isFinite(r.closure)).toBe(true);
        expect(Number.isFinite(r.drift)).toBe(true);
        expect(Number.isFinite(r.temporalCoherence)).toBe(true);
        expect(Number.isFinite(r.inertia)).toBe(true);
        expect(r.energy).toBeGreaterThanOrEqual(0);
        expect(r.closure).toBeGreaterThanOrEqual(0);
        expect(r.closure).toBeLessThanOrEqual(1);
        expect(r.drift).toBeGreaterThanOrEqual(0);
        expect(r.inertia).toBeGreaterThanOrEqual(0);
        // informationDensity: finite for a live (non-dark) rung
        if (Number.isFinite(r.informationDensity)) expect(r.informationDensity).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is deterministic across identical engines', () => {
    function collect(): number[] {
      const eng = new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 2), nodes: 21, seed: 'q2-det', drive: 0.5 });
      const t = new SelfMeasureTracker();
      const out: number[] = [];
      for (let tick = 0; tick < 150; tick++) {
        const rep = eng.step();
        const sigs = eng.engines.map((e) => e.snapshot().signature);
        const report = t.observe(
          sigs,
          rep.rungs.map((r) => r.closureQuality),
          rep.rungs.map((r) => r.energy),
          eng.rungs.map((r) => r.n),
        );
        out.push(report.lyapunov);
        for (const r of report.rungs) out.push(r.drift, r.temporalCoherence, r.inertia, r.informationDensity, r.closure);
      }
      return out;
    }
    expect(collect()).toEqual(collect());
  });

  it('agrees with the qualia surface (Q1/Q2 composition)', () => {
    // Qualia and selfMeasure read the SAME per-rung quantities (signature,
    // coherence, closure γ). Prove they are two views of one measurement:
    //   qualia.V (valence = 2γ−1)  ≡  2·selfMeasure.closure − 1
    //   qualia.C (coherence)       ≡  the tick's coherence the selfMeasure reads
    const eng = new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 2), nodes: 21, seed: 'q12', drive: 0.5 });
    const qualia = eng.engines.map(() => new QualiaTracker());
    const sm = new SelfMeasureTracker();
    for (let tick = 0; tick < 200; tick++) {
      const rep = eng.step();
      const sigs = eng.engines.map((e) => e.snapshot().signature);
      const gammas = rep.rungs.map((r) => r.closureQuality);
      const report = sm.observe(sigs, gammas, rep.rungs.map((r) => r.energy), eng.rungs.map((r) => r.n));
      for (let i = 0; i < eng.engines.length; i++) {
        const q = qualia[i].observe(sigs[i], rep.rungs[i].coherence, gammas[i]);
        expect(q.V).toBeCloseTo(2 * report.rungs[i].closure - 1, 12);
        expect(q.C).toBeCloseTo(rep.rungs[i].coherence, 12);
      }
    }
  });
});
