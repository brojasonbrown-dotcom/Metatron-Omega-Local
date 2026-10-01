/**
 * r31 — RHUFT transport represents pure rotation (unitary |lambda| = 1).
 *
 * Guards the unitary cap: the transport is an observe-only predictor of the
 * holomorphic field, so a conserved rotation (constant amplitude, evolving phase)
 * must be representable. The old phi^-1 cap forced every rotation to damp, which
 * is a symmetry violation — a pure rotation has |lambda| = 1, and the predictor
 * must be able to reach it.
 */

import { describe, expect, it } from 'vitest';
import { RhufTransport, LAMBDA_MAX } from '../src/cognition/rhufTransport';

function rot(t: number, w: number, A: number): { re: Float64Array; im: Float64Array; n: number } {
  return { re: new Float64Array([A * Math.cos(w * t)]), im: new Float64Array([A * Math.sin(w * t)]), n: 1 };
}

describe('R31 · RHUFT transport unitary rotation', () => {
  it('exposes a unitary cap (|lambda| <= 1, not phi^-1)', () => {
    expect(LAMBDA_MAX).toBe(1);
  });

  it('learns a pure rotation up to unitary magnitude (not the old phi^-1 cap)', () => {
    const rt = new RhufTransport(1, 0.05);
    const w = 0.05, A = 1.0;
    let prev = rot(0, w, A);
    for (let t = 1; t < 1200; t++) { const c = rot(t, w, A); rt.observe(prev, c); prev = c; }
    const r = rt.report();
    // A pure rotation needs |lambda| = 1; the old cap stopped at phi^-1 = 0.618.
    expect(r.spectralRadius).toBeGreaterThan(0.9);
  });

  it('converges: final one-step prediction beats persistence on a rotation', () => {
    const rt = new RhufTransport(1, 0.05);
    const w = 0.05, A = 1.0;
    let prev = rot(0, w, A);
    for (let t = 1; t < 1200; t++) { const c = rot(t, w, A); rt.observe(prev, c); prev = c; }
    const next = rot(1200, w, A);
    const pred = rt.observe(prev, next);
    const transportErr = Math.hypot(pred.re[0] - next.re[0], pred.im[0] - next.im[0]);
    const persistenceErr = Math.hypot(next.re[0] - prev.re[0], next.im[0] - prev.im[0]);
    expect(transportErr).toBeLessThan(persistenceErr);
  });

  it('stays deterministic — same seed, same report', () => {
    const run = () => {
      const rt = new RhufTransport(1, 0.05);
      const w = 0.05, A = 1.0;
      let prev = rot(0, w, A);
      for (let t = 1; t < 200; t++) { const c = rot(t, w, A); rt.observe(prev, c); prev = c; }
      return rt.report().spectralRadius;
    };
    expect(run()).toBe(run());
  });
});
