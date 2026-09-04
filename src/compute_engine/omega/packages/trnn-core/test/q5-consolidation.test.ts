/**
 * q5 — Ω-REAL ignition-triggered consolidation battery (Q5).
 *
 * Pins the last seam of the self-measurement loop: the qualia ignition train
 * (transient "conscious moments" — up-crossings of Cphi over φ⁻²) is what gets
 * CONSOLIDATED into sealed knowledge, not the steady state. Each up-crossing
 * records a moment into the corpus; a Fibonacci batch triggers a full ten-sweep
 * cycle that seals records into the append-only GenomeLedger, which then audits
 * clean. Deterministic throughout (seeded atoms, no wall clock).
 */

import { describe, expect, it } from 'vitest';
import { IgnitionConsolidator } from '../src/cognition/consolidation';
import { GenomeLedger } from '../src/genome/record';
import { keyPairFromSeed } from '../src/ledger/sth';

function makeLedger(): GenomeLedger {
  return new GenomeLedger('q5-log', new Uint8Array(32).fill(5), keyPairFromSeed(new Uint8Array(32).fill(9)));
}

// A coherent (constant) signature self-overlaps to 1, so it ignites once the
// golden-delay ring fills; one up-crossing = one "conscious moment".
const coherent = Float64Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('Q5 · ignition-triggered consolidation', () => {
  it('seals consolidated knowledge on the first conscious moment (batch 1)', () => {
    const ledger = makeLedger();
    const c = new IgnitionConsolidator(ledger, { batch: 1, dim: 64 });
    let cycled = false;
    for (let t = 0; t < 20; t++) {
      const r = c.observe(coherent, 1, 1, t);
      if (r.cycled) cycled = true;
    }
    expect(c.corpusSize).toBe(1); // one up-crossing → one moment
    expect(c.cycleCount).toBe(1);
    expect(cycled).toBe(true);
    expect(ledger.size).toBeGreaterThanOrEqual(10); // ten sweep seals
    expect(ledger.audit(0).ok).toBe(true); // sealed knowledge is auditable
  });

  it('does not cycle below the batch', () => {
    const ledger = makeLedger();
    const c = new IgnitionConsolidator(ledger, { batch: 13, dim: 64 });
    for (let t = 0; t < 20; t++) c.observe(coherent, 1, 1, t); // 1 ignition
    expect(c.corpusSize).toBe(1);
    expect(c.cycleCount).toBe(0);
    expect(ledger.size).toBe(0); // nothing sealed before the batch
  });

  it('is deterministic', () => {
    function run(): number {
      const ledger = makeLedger();
      const c = new IgnitionConsolidator(ledger, { batch: 2, dim: 64 });
      // two coherent episodes separated by a random (low-coherence) phase
      for (let t = 0; t < 20; t++) c.observe(coherent, 1, 1, t);
      for (let t = 20; t < 60; t++) {
        const r = Float64Array.from({ length: 13 }, (_, i) => Math.sin(i * 3 + t));
        c.observe(r, 0, 0, t);
      }
      for (let t = 60; t < 80; t++) c.observe(coherent, 1, 1, t);
      return ledger.size;
    }
    expect(run()).toBe(run());
  });
});

