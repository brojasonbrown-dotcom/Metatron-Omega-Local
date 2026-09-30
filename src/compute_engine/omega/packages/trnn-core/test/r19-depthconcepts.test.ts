/**
 * r19 — depth-weighted concept store battery.
 *
 * Pins that deep observations weigh more in semantic recall: `ConceptStore.add`
 * takes an optional weight (default 1) and records it; `Mind.observe` threads a
 * depth weight into the store; and deep concepts rank above shallow ones at
 * equal hit count.
 */

import { describe, expect, it } from 'vitest';
import { ConceptStore } from '../src/cognition/concepts';
import { Mind } from '../src/cognition/mind';

const F = (x: number[]): Float64Array => Float64Array.from(x);

describe('R19 · depth-weighted concepts', () => {
  it('ConceptStore.add defaults weight to 1 and records an explicit weight', () => {
    const s = new ConceptStore({ dim: 4, capacity: 8, seed: 'r19' });
    s.add('a', F([1, 0, 0, 0]), 0);
    s.add('b', F([0, 1, 0, 0]), 1, undefined, 4);
    const recs = s.records();
    expect(recs.find((r) => r.key === 'a')!.weight).toBe(1);
    expect(recs.find((r) => r.key === 'b')!.weight).toBe(4);
  });

  it('Mind.observe threads a depth weight into the concept store', () => {
    const m = new Mind({ dim: 4, capacity: 8, seed: 'r19-mind', noveltyThreshold: 0 });
    m.observe(F([1, 0, 0, 0]), 0, 'deep', 3);
    const rec = m.store.records().find((r) => r.key === 'deep');
    expect(rec).toBeDefined();
    expect(rec!.weight).toBe(3);
  });

  it('deep concepts rank above shallow ones at equal hit count', () => {
    const m = new Mind({ dim: 4, capacity: 8, seed: 'r19-rank', noveltyThreshold: 0 });
    m.observe(F([1, 0, 0, 0]), 0, 'shallow', 1);
    m.observe(F([0, 1, 0, 0]), 1, 'deep', 9);
    m.recall(F([1, 0, 0, 0]), 1); // hits shallow
    m.recall(F([0, 1, 0, 0]), 1); // hits deep
    const top = m.report().top;
    expect(top[0].key).toBe('deep'); // 9 × 1 > 1 × 1
  });
});
