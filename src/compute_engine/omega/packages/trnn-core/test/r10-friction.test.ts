/**
 * r10 — friction reading battery.
 *
 * Pins that the per-tick friction reading (coherence + closure folded into one
 * dimensionless "how smoothly is the field flowing" scalar) is bounded, honest
 * (abstention lifts the floor), deterministic, and digest-neutral (a run with
 * friction readings digests identically to one without).
 */

import { describe, expect, it } from 'vitest';
import { SingleTorusEngine } from '../src/engine/SingleTorusEngine';
import { frictionReading } from '../src/measure/friction';

describe('R10 · friction reading', () => {
  it('is bounded and hits the extremes correctly', () => {
    // perfectly coherent + closed → zero friction
    const perfect = frictionReading(1, 0, 1, 'STABLE');
    expect(perfect.flow).toBeCloseTo(1, 12);
    expect(perfect.friction).toBeCloseTo(0, 12);
    expect(perfect.situation).toBeCloseTo(1, 12);

    // fully incoherent + reversed → maximal friction
    const worst = frictionReading(0, 2, 0, 'CRITICAL');
    expect(worst.flow).toBeCloseTo(0, 12);
    expect(worst.friction).toBeCloseTo(1, 12);
    expect(worst.situation).toBeCloseTo(-1, 12);

    // mid: coherence 0.5, defect √2 → flow = 0.5·(1−√2/2)
    const mid = frictionReading(0.5, Math.SQRT2, 0.5, 'STRESS');
    expect(mid.flow).toBeCloseTo(0.5 * (1 - Math.SQRT2 / 2), 12);
    expect(mid.friction).toBeCloseTo(1 - mid.flow, 12);
  });

  it('clamps out-of-range inputs and lifts the floor when abstaining', () => {
    const a = frictionReading(2, -1, 1, 'STABLE', true); // coherence>1, defect<0 → clamped; abstain floor
    expect(a.friction).toBe(0.5); // abstaining lifts the floor to ½
    const b = frictionReading(-1, 5, 0, 'CRITICAL'); // out-of-range → clamped
    expect(b.coherence).toBe(0);
    expect(b.friction).toBe(1);
  });

  it('reads a live engine, finite and bounded every tick', () => {
    const eng = new SingleTorusEngine({ nodes: 89, seed: 'r10', drive: 0.5, coherenceDelay: 8 });
    for (let t = 0; t < 500; t++) {
      const rep = eng.step();
      const fr = frictionReading(rep.coherence, rep.closureDefect, rep.closureQuality, rep.regime);
      expect(Number.isFinite(fr.friction)).toBe(true);
      expect(fr.friction).toBeGreaterThanOrEqual(0);
      expect(fr.friction).toBeLessThanOrEqual(1);
      expect(fr.flow).toBeGreaterThanOrEqual(0);
      expect(fr.flow).toBeLessThanOrEqual(1);
      expect(fr.situation).toBeGreaterThanOrEqual(-1);
      expect(fr.situation).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic across identical engines', () => {
    function collect(): number[] {
      const eng = new SingleTorusEngine({ nodes: 89, seed: 'r10d', drive: 0.5, coherenceDelay: 8 });
      const out: number[] = [];
      for (let t = 0; t < 300; t++) {
        const rep = eng.step();
        const fr = frictionReading(rep.coherence, rep.closureDefect, rep.closureQuality, rep.regime);
        out.push(fr.friction, fr.situation, fr.flow);
      }
      return out;
    }
    expect(collect()).toEqual(collect());
  });

  it('is digest-neutral: readings never perturb the engine', () => {
    const a = new SingleTorusEngine({ nodes: 89, seed: 'r10n', drive: 0.5, coherenceDelay: 8 });
    const b = new SingleTorusEngine({ nodes: 89, seed: 'r10n', drive: 0.5, coherenceDelay: 8 });
    for (let t = 0; t < 300; t++) {
      const repA = a.step();
      const repB = b.step();
      frictionReading(repA.coherence, repA.closureDefect, repA.closureQuality, repA.regime); // observed only
      // b does NOT read — digests must still match
    }
    expect(a.digest()).toBe(b.digest());
  });
});
