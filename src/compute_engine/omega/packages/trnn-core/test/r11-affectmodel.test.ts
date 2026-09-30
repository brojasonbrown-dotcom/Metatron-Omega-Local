/**
 * r11 — affect-model battery.
 *
 * Pins that the affect self-model (friction + qualia folded into a fixed
 * observation, predicted by a DiagonalSSM/RLS self-model) is real, bounded,
 * deterministic, and honestly reflects friction (an open/incoherent field reads
 * higher friction than a closed/coherent one).
 */

import { describe, expect, it } from 'vitest';
import { SingleTorusEngine } from '../src/engine/SingleTorusEngine';
import { AffectModel, AFFECT_DIM } from '../src/cognition/affectModel';

const SIG = Float64Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('R11 · affect self-model', () => {
  it('reads higher friction for an open/incoherent field than a closed/coherent one', () => {
    const am = new AffectModel();
    const open = am.observe(SIG, 0.1, 0.1, 1.8, 'CRITICAL', 0); // incoherent + open
    const closed = am.observe(SIG, 0.9, 0.9, 0.1, 'STABLE', 1); // coherent + closed
    expect(open.friction).toBeGreaterThan(closed.friction);
    expect(closed.friction).toBeLessThan(0.5);
    expect(open.friction).toBeGreaterThan(0.5);
  });

  it('trains and reports a finite, honest self-model over the affect stream', () => {
    const am = new AffectModel();
    for (let t = 0; t < 400; t++) {
      const rep = Math.sin(t / 13); // a smoothly-varying drive of the inputs
      const c = 0.5 + 0.4 * rep;
      const g = 0.5 + 0.4 * rep;
      const d = 2 * (1 - g);
      am.observe(SIG, c, g, d, c > 0.6 ? 'STABLE' : 'STRESS', t);
    }
    const r = am.report();
    expect(AFFECT_DIM).toBe(9);
    expect(Number.isFinite(r.ssmMse)).toBe(true);
    expect(Number.isFinite(r.rlsMse)).toBe(true);
    expect(Number.isFinite(r.persistenceMse)).toBe(true);
    expect(r.dim).toBe(AFFECT_DIM);
  });

  it('reads a live engine, bounded and deterministic', () => {
    function run(): number[] {
      const eng = new SingleTorusEngine({ nodes: 89, seed: 'r11', drive: 0.5, coherenceDelay: 8 });
      const am = new AffectModel();
      const out: number[] = [];
      for (let t = 0; t < 500; t++) {
        const rep = eng.step();
        const obs = am.observe(eng.snapshot().signature, rep.coherence, rep.closureQuality, rep.closureDefect, rep.regime, t);
        expect(Number.isFinite(obs.friction)).toBe(true);
        expect(obs.friction).toBeGreaterThanOrEqual(0);
        expect(obs.friction).toBeLessThanOrEqual(1);
        out.push(obs.friction, obs.situation, obs.flow);
      }
      return out;
    }
    expect(run()).toEqual(run());
  });

  it('reset clears the qualia tracker and the self-model', () => {
    const am = new AffectModel();
    am.observe(SIG, 0.5, 0.5, 1, 'STRESS', 0);
    am.observe(SIG, 0.5, 0.5, 1, 'STRESS', 1);
    am.reset();
    expect(am.report().samples).toBe(0);
  });
});
