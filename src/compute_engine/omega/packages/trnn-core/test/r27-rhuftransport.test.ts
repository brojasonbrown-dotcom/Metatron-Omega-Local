/**
 * r27 — the RHUFT transport self-model. Pins that a complex diagonal transport
 * (c_k ← λ_k·c_k, |λ_k| ≤ φ⁻¹) beats the persistence baseline on a rotating
 * field — the proof that the self-model CAN adapt once it sees the full
 * holomorphic coefficients, not the phase-blind power spectrum. Deterministic,
 * stability by parametrisation.
 */

import { describe, expect, it } from 'vitest';
import { RhufTransport, LAMBDA_MAX } from '../src/cognition/rhufTransport';
import { phiPow } from '../src/core/constants';

function rotating(dim: number, omega: number, t: number) {
  const re = new Float64Array(dim);
  const im = new Float64Array(dim);
  for (let k = 0; k < dim; k++) {
    const amp = Math.exp(-k / 5);
    re[k] = amp * Math.cos(omega * t + k);
    im[k] = amp * Math.sin(omega * t + k);
  }
  return { re, im, n: dim };
}

describe('R27 · RHUFT transport self-model', () => {
  it('beats persistence on a rotating field (learns the phase)', () => {
    const dim = 13;
    const omega = 2 * Math.PI * phiPow(-2);
    const m = new RhufTransport(dim);
    for (let t = 200; t < 2000; t++) {
      m.observe(rotating(dim, omega, t - 1), rotating(dim, omega, t));
    }
    const r = m.report();
    expect(r.skill).toBeGreaterThan(0.2); // learns the rotation, >20% better than persistence
    expect(r.spectralRadius).toBeLessThanOrEqual(LAMBDA_MAX + 1e-12); // stable by parametrisation
    expect(Number.isFinite(r.mse)).toBe(true);
    expect(Number.isFinite(r.persistenceMse)).toBe(true);
  });

  it('is stable (spectral radius ≤ φ⁻¹) for arbitrary training', () => {
    const m = new RhufTransport(8, 0.5); // large LR — still cannot blow up
    for (let t = 0; t < 500; t++) {
      const x = { re: Float64Array.from({ length: 8 }, (_, i) => Math.sin(t + i)), im: Float64Array.from({ length: 8 }, (_, i) => Math.cos(t * 2 + i)), n: 8 };
      const y = { re: Float64Array.from({ length: 8 }, (_, i) => Math.sin(t + 1 + i)), im: Float64Array.from({ length: 8 }, (_, i) => Math.cos((t + 1) * 2 + i)), n: 8 };
      m.observe(x, y);
    }
    expect(m.report().spectralRadius).toBeLessThanOrEqual(LAMBDA_MAX + 1e-12);
  });

  it('is deterministic across identical streams', () => {
    function run() {
      const m = new RhufTransport(6);
      for (let t = 0; t < 300; t++) m.observe(rotating(6, 0.7, t - 1), rotating(6, 0.7, t));
      return m.report().mse;
    }
    expect(run()).toBe(run());
  });
});
