/**
 * m3 — Ω-REAL M2 · B002 battery: Floquet theory.
 *
 * A constant diagonal map gives exactly-checkable multipliers and exponents; a
 * rotation is exactly neutrally stable with a pure frequency. No approximation
 * anywhere — these are closed forms.
 */

import { describe, expect, it } from 'vitest';
import { monodromy, floquet } from '../src/substrate/floquet';

describe('M2 · B002 Floquet', () => {
  it('a constant diagonal map has exact multipliers and exponents', () => {
    const A = Float64Array.from([0.5, 0, 0, 2]); // diag(0.5, 2)
    const maps = [A, A, A, A]; // period 4
    const M = monodromy(maps, 2);
    // M = diag(0.5^4, 2^4) = diag(0.0625, 16)
    expect(M[0]).toBeCloseTo(0.0625, 12);
    expect(M[3]).toBeCloseTo(16, 12);
    expect(M[1]).toBeCloseTo(0, 12);
    expect(M[2]).toBeCloseTo(0, 12);

    const rep = floquet(M, 2, 4);
    const mags = rep.multipliers.map((m) => m.magnitude).sort((a, b) => a - b);
    expect(mags[0]).toBeCloseTo(0.0625, 6);
    expect(mags[1]).toBeCloseTo(16, 6);
    // growth rates: ln(0.5) and ln(2)
    const growths = rep.multipliers.map((m) => m.growth).sort((a, b) => a - b);
    expect(growths[0]).toBeCloseTo(Math.log(0.5), 6);
    expect(growths[1]).toBeCloseTo(Math.log(2), 6);
  });

  it('a rotation is neutrally stable with a pure frequency', () => {
    const th = 0.3;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const A = Float64Array.from([c, -s, s, c]); // rotation by θ
    const P = 5;
    const maps = Array.from({ length: P }, () => Float64Array.from(A));
    const rep = floquet(monodromy(maps, 2), 2, P);
    for (const m of rep.multipliers) {
      expect(m.magnitude).toBeCloseTo(1, 6); // neutral
      expect(m.growth).toBeCloseTo(0, 6);    // no growth
    }
    const freqs = rep.multipliers.map((m) => Math.abs(m.frequency)).sort((a, b) => a - b);
    expect(freqs[1]).toBeCloseTo(th / (2 * Math.PI), 4);
  });
});
