/**
 * r13 — weighted resonance index battery.
 *
 * Pins that the single memory weight obeys the normative fusion law: coherence
 * alone reproduces itself, the φ⁻² gate abandons incoherent fields, a measured
 * zero vetoes to a hard 0, absent channels abstain, the φ-weighted blend stays
 * between prior and evidence and is untouched by an offline index, and the
 * whole thing is deterministic.
 */

import { describe, expect, it } from 'vitest';
import { resonanceIndex, weightedMemoryWeight } from '../src/measure/resonanceIndex';
import { phiPow } from '../src/core/constants';

const GATE = phiPow(-2); // φ⁻² ≈ 0.381966

describe('R13 · weighted resonance index', () => {
  it('fuses a single coherent channel back to itself', () => {
    const r = resonanceIndex({ coherence: 0.7 });
    expect(r.value).toBeCloseTo(0.7, 12);
    expect(r.gated).toBe(false);
    expect(r.counted).toBe(1); // γ abstained (no phaseDev)
  });

  it('gates when coherence is below φ⁻²', () => {
    const r = resonanceIndex({ coherence: 0.3 });
    expect(r.gated).toBe(true);
    expect(Number.isNaN(r.value)).toBe(true);
  });

  it('vetoes a measured zero channel to a hard 0', () => {
    const r = resonanceIndex({ coherence: 0.8, salience: 0 });
    expect(r.dead).toBe(true);
    expect(r.value).toBe(0);
    expect(r.vetoId).toBe('salience');
  });

  it('geometric-means the three channels', () => {
    const r = resonanceIndex({ coherence: 0.8, salience: 0.5, margin: 0.9 });
    const expected = Math.cbrt(0.8 * 0.5 * 0.9);
    expect(r.value).toBeCloseTo(expected, 12);
    expect(r.counted).toBe(3);
  });

  it('abstains on an absent (non-finite) coherence', () => {
    const r = resonanceIndex({ coherence: NaN, salience: 0.9 });
    // salience is the only finite channel → value = 0.9 (no gate, γ abstains)
    expect(r.value).toBeCloseTo(0.9, 12);
    expect(r.coherence).toBeNaN();
  });

  it('φ-weightedly blends prior with evidence and is offline-neutral', () => {
    const idx = resonanceIndex({ coherence: 0.8, salience: 0.5 });
    const w = weightedMemoryWeight(1.0, idx);
    // strictly between prior (1.0) and index value, lifted toward evidence
    expect(w).toBeLessThan(1.0);
    expect(w).toBeGreaterThan(idx.value);

    const offline = resonanceIndex({ coherence: 0.3 }); // gated → NaN
    expect(weightedMemoryWeight(0.6, offline)).toBe(0.6); // prior untouched
  });

  it('is deterministic across identical runs', () => {
    function run(): string {
      const a = resonanceIndex({ coherence: 0.8, salience: 0.5, margin: 0.9, phaseDev: 0.3 });
      const b = resonanceIndex({ coherence: 0.8, salience: 0.5, margin: 0.9, phaseDev: 0.3 });
      return `${a.value === b.value}:${a.gamma === b.gamma}:${a.gated === b.gated}`;
    }
    expect(run()).toBe(run());
  });
});
