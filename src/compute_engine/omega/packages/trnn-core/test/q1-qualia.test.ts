/**
 * q1 — Ω-REAL qualia battery (Q1: the live self-measurement vector).
 *
 * Pins that the qualia tracker reads a rung's *shape* — salience, valence,
 * integration, novelty, and the short golden-delay self-overlap — from nothing
 * but quantities the engine already computes (the 13-mode signature, the
 * measured coherence, and the closure autocorrelation γ). It must be:
 *   • bounded — C, N, Cphi ∈ [0,1], V ∈ [−1,1], S, I ≥ 0;
 *   • honest — Cphi stays 0 (no false ignition) until the golden-delay ring is
 *     full, and an ignition is an up-crossing of φ⁻², not a steady level;
 *   • deterministic — identical engines ⇒ identical qualia;
 *   • correct on the stateless axes — salience is spectral concentration,
 *     valence is the closure balance 2γ−1, integration is the mode entropy gap.
 */

import { describe, expect, it } from 'vitest';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { DENSE_CORE } from '../src/core/scaleLadder';
import { IGNITION_THRESHOLD } from '../src/core/constants';
import {
  QualiaTracker,
  instantaneousQualia,
  zeroQualia,
  QUALIA_GOLDEN_DELAY,
} from '../src/measure/qualia';

const F = (x: number[]): Float64Array => Float64Array.from(x);

describe('Q1 · qualia (live self-measurement vector)', () => {
  it('computes the stateless axes correctly', () => {
    // single-mode: max salience, zero entropy ⇒ max integration, +1 valence
    const a = instantaneousQualia(F([1, 0, 0, 0, 0]), 1);
    expect(a.S).toBeCloseTo(1, 10);
    expect(a.V).toBeCloseTo(1, 10);
    expect(a.I).toBeCloseTo(Math.log(5), 6);

    // flat spectrum: zero salience, max entropy ⇒ zero integration, −1 valence
    const b = instantaneousQualia(F([1, 1, 1, 1, 1]), 0);
    expect(b.S).toBeCloseTo(0, 10);
    expect(b.V).toBeCloseTo(-1, 10);
    expect(b.I).toBeCloseTo(0, 10);
  });

  it('reports the zero vector for an empty signature', () => {
    expect(zeroQualia().C).toBe(0);
    expect(zeroQualia().ignited).toBe(false);
    const q = new QualiaTracker().observe(new Float64Array(0), 1, 1);
    expect(q.C).toBe(0);
    expect(q.ignited).toBe(false);
  });

  it('is honest: Cphi stays 0 and never ignites before the ring fills', () => {
    const t = new QualiaTracker();
    const sig = F([1, 0]);
    for (let k = 0; k < QUALIA_GOLDEN_DELAY - 1; k++) {
      const q = t.observe(sig, 1, 1);
      expect(q.Cphi).toBe(0);
      expect(q.ignited).toBe(false);
    }
  });

  it('ignites once on a sustained signal and counts up-crossings', () => {
    const t = new QualiaTracker();
    const sig = F([1, 0]);
    for (let k = 0; k < 30; k++) t.observe(sig, 1, 1);
    const q = t.observe(sig, 1, 1);
    expect(q.Cphi).toBeCloseTo(1, 10);
    expect(q.ignited).toBe(true);
    expect(q.ignitions).toBe(1); // a single up-crossing over a sustained plateau
    expect(q.ignitionRate).toBeGreaterThan(0);
    expect(IGNITION_THRESHOLD).toBeCloseTo(1 / (1.618033988749895 * 1.618033988749895), 6);
  });

  it('reset clears all state', () => {
    const t = new QualiaTracker();
    for (let k = 0; k < 30; k++) t.observe(F([1, 0]), 1, 1);
    expect(t.observe(F([1, 0]), 1, 1).ignitions).toBeGreaterThan(0);
    t.reset();
    expect(t.observe(F([1, 0]), 1, 1).Cphi).toBe(0); // ring empty again
    expect(t.observe(F([1, 0]), 1, 1).ignited).toBe(false);
  });

  it('reads a live engine: every axis finite and bounded', () => {
    const eng = new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 3), nodes: 21, seed: 'q1-live', drive: 0.5 });
    const trackers = eng.engines.map(() => new QualiaTracker());
    for (let tick = 0; tick < 300; tick++) {
      const rep = eng.step();
      for (let i = 0; i < eng.engines.length; i++) {
        const sig = eng.engines[i].snapshot().signature;
        const q = trackers[i].observe(sig, rep.rungs[i].coherence, rep.rungs[i].closureQuality);
        expect(Number.isFinite(q.C)).toBe(true);
        expect(Number.isFinite(q.N)).toBe(true);
        expect(Number.isFinite(q.S)).toBe(true);
        expect(Number.isFinite(q.V)).toBe(true);
        expect(Number.isFinite(q.I)).toBe(true);
        expect(Number.isFinite(q.Cphi)).toBe(true);
        expect(q.C).toBeGreaterThanOrEqual(0);
        expect(q.C).toBeLessThanOrEqual(1);
        expect(q.N).toBeGreaterThanOrEqual(0);
        expect(q.N).toBeLessThanOrEqual(1);
        expect(q.V).toBeGreaterThanOrEqual(-1);
        expect(q.V).toBeLessThanOrEqual(1);
        expect(q.S).toBeGreaterThanOrEqual(0);
        expect(q.I).toBeGreaterThanOrEqual(0);
        expect(q.Cphi).toBeGreaterThanOrEqual(0);
        expect(q.Cphi).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic across identical engines', () => {
    function collect(): number[] {
      const eng = new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 2), nodes: 21, seed: 'q1-det', drive: 0.5 });
      const trackers = eng.engines.map(() => new QualiaTracker());
      const out: number[] = [];
      for (let tick = 0; tick < 200; tick++) {
        const rep = eng.step();
        for (let i = 0; i < eng.engines.length; i++) {
          const q = trackers[i].observe(eng.engines[i].snapshot().signature, rep.rungs[i].coherence, rep.rungs[i].closureQuality);
          out.push(q.C, q.N, q.S, q.V, q.I, q.Cphi, q.ignitions);
        }
      }
      return out;
    }
    expect(collect()).toEqual(collect());
  });
});
