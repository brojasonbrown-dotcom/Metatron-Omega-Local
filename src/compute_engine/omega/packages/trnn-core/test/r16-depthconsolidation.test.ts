/**
 * r16 — depth-triggered consolidation battery.
 *
 * Pins that the consolidator now seals a `DeepMoment` when depth rises across
 * its threshold (alongside, not replacing, the ignition up-crossing), ignores
 * sub-threshold/unmeasured depth, and stays deterministic.
 */

import { describe, expect, it } from 'vitest';
import { GenomeLedger } from '../src/genome/record';
import { keyPairFromSeed } from '../src/ledger/sth';
import { IgnitionConsolidator } from '../src/cognition/consolidation';

function ledger(): GenomeLedger {
  return new GenomeLedger('r16-log', new Uint8Array(32).fill(5), keyPairFromSeed(new Uint8Array(32).fill(9)));
}

const psi = Float64Array.from({ length: 13 }, (_, i) => (i === 0 ? 1 : 0.1));

describe('R16 · depth-triggered consolidation', () => {
  it('records a DeepMoment on a depth up-crossing and ignores sub-threshold depth', () => {
    const c = new IgnitionConsolidator(ledger(), { batch: 13, depthThreshold: 0.6 });

    const below = c.observe(psi, 0.8, 0.9, 1, 0.3);
    expect(below.depthUpCrossing).toBe(false);
    expect(c.corpusSize).toBe(0);

    const cross = c.observe(psi, 0.8, 0.9, 2, 0.7);
    expect(cross.depthUpCrossing).toBe(true);
    expect(c.corpusSize).toBe(1);

    const above = c.observe(psi, 0.8, 0.9, 3, 0.9);
    expect(above.depthUpCrossing).toBe(false); // staying above is not a re-crossing
    expect(c.corpusSize).toBe(1);
  });

  it('treats unmeasured depth as no crossing', () => {
    const c = new IgnitionConsolidator(ledger(), { depthThreshold: 0.6 });
    const r = c.observe(psi, 0.8, 0.9, 1, NaN);
    expect(r.depthUpCrossing).toBe(false);
    expect(r.depth).toBeNaN();
    expect(c.corpusSize).toBe(0);
  });

  it('is deterministic across identical runs', () => {
    function run(): number {
      const c = new IgnitionConsolidator(ledger(), { batch: 2, depthThreshold: 0.6 });
      c.observe(psi, 0.8, 0.9, 1, 0.3);
      c.observe(psi, 0.8, 0.9, 2, 0.7);
      c.observe(psi, 0.8, 0.9, 3, 0.5);
      c.observe(psi, 0.8, 0.9, 4, 0.8); // second crossing → batch cycles
      return c.cycleCount * 1000 + c.corpusSize;
    }
    expect(run()).toBe(run());
  });
});
