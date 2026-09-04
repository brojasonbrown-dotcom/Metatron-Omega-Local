/**
 * q3 — Ω-REAL Ψ-of-Ψ reflection battery (Q3).
 *
 * The self-reflection term κ_r·⟨C_prev⟩·z closes the self-measurement loop: a
 * coherent rung self-reinforces and a noisy one self-damps. It is dynamics-
 * affecting, so the contract is the SAME one every opt-in term in the engine
 * obeys — oracle-exact when absent, contraction-preserving when armed:
 *   • κ_r = 1/(φ²π) exactly, and |κ_r| < φ⁻³  (contraction kept);
 *   • reflect 0/undefined ⇒ digest bit-identical to the S0 oracle;
 *   • reflect > 0 ⇒ deterministic, finite, never clamps, and its realized gain
 *     stays below the contraction bound (JURY_GAIN + κ_r < 1);
 *   • reflect > 0 ⇒ the digest genuinely differs from reflect 0 (it is live).
 */

import { describe, expect, it } from 'vitest';
import { SingleTorusEngine } from '../src/engine/SingleTorusEngine';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { DENSE_CORE } from '../src/core/scaleLadder';
import { REFLECT_GAIN, JURY_GAIN, KAPPA, PHI, phiPow, CLAMP_MAX } from '../src/core/constants';
import { cellStep } from '../src/cell/update';
import { createField } from '../src/core/complex';

const N = 55;

describe('Q3 · Ψ-of-Ψ self-reflection (contraction-bounded)', () => {
  it('pins κ_r = 1/(φ²π) < φ⁻³', () => {
    expect(REFLECT_GAIN).toBeCloseTo(KAPPA / PHI, 15);
    expect(REFLECT_GAIN * PHI * PHI * Math.PI).toBeCloseTo(1, 15); // = 1/(φ²π)
    expect(REFLECT_GAIN).toBeLessThan(phiPow(-3));
    // the contraction still holds: g + κ_r < 1
    expect(JURY_GAIN + REFLECT_GAIN).toBeLessThan(1);
  });

  it('is oracle-exact when off (0 and undefined both bit-identical)', () => {
    const base = new SingleTorusEngine({ nodes: N, seed: 'q3-off', coherenceDelay: 8 });
    const zero = new SingleTorusEngine({ nodes: N, seed: 'q3-off', coherenceDelay: 8, reflect: 0 });
    for (let i = 0; i < 500; i++) {
      base.step();
      zero.step();
    }
    expect(zero.digest()).toBe(base.digest());
  });

  it('is deterministic when armed', () => {
    const a = new SingleTorusEngine({ nodes: N, seed: 'q3-det', coherenceDelay: 8, reflect: REFLECT_GAIN });
    const b = new SingleTorusEngine({ nodes: N, seed: 'q3-det', coherenceDelay: 8, reflect: REFLECT_GAIN });
    for (let i = 0; i < 500; i++) {
      a.step();
      b.step();
    }
    expect(a.digest()).toBe(b.digest());
  });

  it('keeps the ISS certificate satisfied with the reflection term (driven map)', () => {
    // Worst-case reflection: full coherence c=1 → Rf = z. The ISS bound must
    // still hold — this is the honest contraction check for a driven map.
    const z = createField(N);
    const out = createField(N);
    const Rf = createField(N);
    for (let i = 0; i < N; i++) {
      z.re[i] = Math.sin(i);
      z.im[i] = Math.cos(i * 0.7);
      Rf.re[i] = z.re[i];
      Rf.im[i] = z.im[i];
    }
    const rep = cellStep(z, out, { Rf });
    expect(rep.issSatisfied).toBe(true);
    expect(rep.peak).toBeLessThanOrEqual(rep.issBound * (1 + 1e-9) + 1e-9);
    expect(rep.clamped).toBe(0);
  });

  it('stays bounded, finite and unclamped when armed, with a live (≠ off) digest', () => {
    const off = new SingleTorusEngine({ nodes: N, seed: 'q3-live', coherenceDelay: 8 });
    const on = new SingleTorusEngine({ nodes: N, seed: 'q3-live', coherenceDelay: 8, reflect: REFLECT_GAIN });
    let maxPeak = 0;
    let clamped = 0;
    for (let i = 0; i < 1000; i++) {
      off.step();
      const r = on.step();
      maxPeak = Math.max(maxPeak, r.peak);
      clamped += r.clamped;
      expect(r.finite).toBe(true);
    }
    expect(on.digest()).not.toBe(off.digest()); // the reflection is genuinely live
    expect(maxPeak).toBeLessThanOrEqual(CLAMP_MAX + 1e-9);
    expect(clamped).toBe(0);
  });

  it('arms per rung through the web and keeps the web finite', () => {
    const on = new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 3), nodes: 21, seed: 'q3-web', reflect: REFLECT_GAIN });
    for (let t = 0; t < 300; t++) {
      const rep = on.step();
      expect(rep.finite).toBe(true);
    }
    // every rung carries the gain
    for (const e of on.engines) expect(e.reflectGain).toBe(REFLECT_GAIN);
  });
});
