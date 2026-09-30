/**
 * r12 — cross-section memory battery.
 *
 * Pins that the unified memory (braid + tape + hypervector store, joined into
 * one coherence-gated, coherence-weighted write path) is real: below-threshold
 * writes are refused, stored patterns recall exactly, unseen probes abstain,
 * and the whole thing is deterministic.
 */

import { describe, expect, it } from 'vitest';
import { CrossSectionMemory } from '../src/memory/crossSection';
import { createField, type CField } from '../src/core/complex';
import { phiPow } from '../src/core/constants';
import { randomHv } from '../src/substrate/vsa';

const N = 89;

/** A random golden-phase field (unit magnitude, uniform phases) — the pattern
 *  class the braid and cleanup memory are rated for. Deterministic per seed. */
function field(seed: number): CField {
  const f = createField(N);
  const phases = randomHv(N, `r12:${seed}`);
  for (let i = 0; i < N; i++) {
    f.re[i] = Math.cos(phases[i]);
    f.im[i] = Math.sin(phases[i]);
  }
  return f;
}

describe('R12 · cross-section memory', () => {
  it('gates writes by coherence (below φ⁻² is refused)', () => {
    const m = new CrossSectionMemory(N);
    const below = m.write('a', field(1), phiPow(-3), 0);
    expect(below.gated).toBe(true);
    expect(m.size).toBe(0);

    const above = m.write('a', field(1), 0.9, 1);
    expect(above.stored).toBe(true);
    expect(m.size).toBe(1);
    expect(m.gatedCount).toBe(1);
  });

  it('recalls a stored pattern exactly and abstains on an unseen probe', () => {
    const m = new CrossSectionMemory(N);
    m.write('x', field(7), 0.9, 0);

    const hit = m.recall(field(7));
    expect(hit.associative?.label).toBe('x');

    const miss = m.recall(field(999)); // never stored
    expect(miss.associative).toBeNull();
  });

  it('joins the braid, tape and hypervector store on one write', () => {
    const m = new CrossSectionMemory(N);
    m.write('k', field(3), 0.8, 0);
    expect(m.braid.load).toBe(1); // braid has the pattern
    expect(m.tape.steps()).toBe(1); // tape advanced once
    expect(m.size).toBe(1); // hypervector store has one entry
  });

  it('is deterministic across identical runs', () => {
    function run(): number {
      const m = new CrossSectionMemory(N);
      for (let t = 0; t < 10; t++) m.write(`k${t}`, field(t), 0.5 + t / 50, t);
      return m.size * 1000 + m.gatedCount;
    }
    expect(run()).toBe(run());
  });
});
