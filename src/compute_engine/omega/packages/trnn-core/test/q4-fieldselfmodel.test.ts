/**
 * q4 — Ω-REAL field-level self-model battery (Q4).
 *
 * Pins that `FieldSelfModel` (one DiagonalSSM/RLS self-model per rung, over the
 * 13-mode signature) predicts the field honestly:
 *   • settled field — the signature is constant, so persistence is optimal and
 *     the G7 gate correctly DISABLES the model (it refuses to fake a win);
 *   • dynamic field — under time-varying input the SSM genuinely BEATS the
 *     persistence baseline and the gate ENABLES it (the model earns its keep);
 *   • deterministic, finite, and reset-clean.
 */

import { describe, expect, it } from 'vitest';
import { SingleTorusEngine } from '../src/engine/SingleTorusEngine';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { DENSE_CORE } from '../src/core/scaleLadder';
import { FieldSelfModel } from '../src/cognition/fieldSelfModel';
import { senseField, encodeScalars } from '../src/sense/encode';

describe('Q4 · field-level self-model (per-rung signature prediction)', () => {
  it('correctly disables on a settled field (persistence is optimal)', () => {
    const eng = new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 2), nodes: 21, seed: 'q4-settled', drive: 0.5 });
    const fsm = new FieldSelfModel(2, 13);
    for (let t = 0; t < 600; t++) {
      eng.step();
      fsm.predict(eng.engines.map((e) => e.snapshot().signature), t);
    }
    const r = fsm.report();
    // a settled field has a constant signature → persistence wins → gate off
    expect(r.enabled).toBe(false);
    expect(r.persistenceMse).toBeLessThanOrEqual(r.ssmMse);
    expect(Number.isFinite(r.ssmMse)).toBe(true);
    expect(Number.isFinite(r.rlsMse)).toBe(true);
  });

  it('enables and beats persistence on a dynamic field', () => {
    const eng = new SingleTorusEngine({ nodes: 89, seed: 'q4-dyn', drive: 0.5, coherenceDelay: 8 });
    const fsm = new FieldSelfModel(1, 13);
    const s = senseField(89);
    for (let t = 0; t < 800; t++) {
      encodeScalars(Array.from({ length: 89 }, (_, i) => Math.sin(i / 5 + t / 40)), s);
      eng.setSensory(s);
      eng.step();
      fsm.predict([eng.snapshot().signature], t);
    }
    const r = fsm.report();
    // measured: ssm 4.7e-9 < persistence 6.1e-9, margin ≈ 0.24
    expect(r.enabled).toBe(true);
    expect(r.ssmMse).toBeLessThan(r.persistenceMse);
    expect(r.per[0].margin).toBeGreaterThan(0);
  });

  it('is deterministic across identical streams', () => {
    function run(): number {
      const eng = new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 2), nodes: 21, seed: 'q4-det', drive: 0.5 });
      const fsm = new FieldSelfModel(2, 13);
      for (let t = 0; t < 400; t++) {
        eng.step();
        fsm.predict(eng.engines.map((e) => e.snapshot().signature), t);
      }
      const r = fsm.report();
      return r.ssmMse + r.rlsMse + r.persistenceMse;
    }
    expect(run()).toBe(run());
  });

  it('reset clears every rung model', () => {
    const fsm = new FieldSelfModel(2, 13);
    fsm.predict([Float64Array.from({ length: 13 }, () => 1), Float64Array.from({ length: 13 }, () => 2)], 0);
    fsm.predict([Float64Array.from({ length: 13 }, () => 1.5), Float64Array.from({ length: 13 }, () => 2.5)], 1);
    fsm.reset();
    const r = fsm.report();
    expect(r.per.every((p) => p.samples === 0)).toBe(true);
  });
});
