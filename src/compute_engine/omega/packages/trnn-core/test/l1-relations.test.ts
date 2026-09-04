/**
 * l1 — Ω-REAL relation battery: the φ-octave relation graph + refined-similarity
 * recall. Pins that (a) the 12 relation weights form a strict φ-octave ladder,
 * (b) the graph stores typed "processes" per node, and (c) resonantRecall
 * returns graded similar information *and* its processes, sorted by refined %.
 */

import { describe, expect, it } from 'vitest';
import { RelationGraph, resonantRecall, RELATION_WEIGHTS } from '../src/cognition/relations';
import { gematriaAtom } from '../src/sense/encode';
import { similarityPct } from '../src/substrate/vsa';

describe('L1 · relation graph + refined-similarity recall', () => {
  it('relation weights are a strict φ-octave ladder', () => {
    expect(RELATION_WEIGHTS.identity).toBeCloseTo(1, 12);
    const PHI_INV = 1 / 1.618033988749895;
    expect(RELATION_WEIGHTS.causation).toBeCloseTo(PHI_INV, 12);
    expect(RELATION_WEIGHTS.inheritance).toBeLessThan(RELATION_WEIGHTS.causation);
    expect(RELATION_WEIGHTS.composition).toBeLessThan(RELATION_WEIGHTS.inheritance);
    expect(RELATION_WEIGHTS.correlation).toBeLessThan(RELATION_WEIGHTS.gradation);
  });

  it('the graph stores typed processes and returns them by node', () => {
    const g = new RelationGraph();
    g.relate('engine', 'composition', 'piston');
    g.relate('engine', 'function', 'propulsion');
    const procs = g.outgoing('engine');
    expect(procs.map((p) => p.type)).toEqual(['composition', 'function']);
    expect(procs.map((p) => p.target)).toEqual(['piston', 'propulsion']);
  });

  it('similarityPct is a refined φ-anchored percentage', () => {
    const a = gematriaAtom('car', 512);
    expect(similarityPct(a, a)).toBeCloseTo(1, 10); // identical → 100%
    const dog = gematriaAtom('dog', 512);
    const pct = similarityPct(a, dog);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThan(1);
  });

  it('resonantRecall returns similar info + processes, sorted by refined %', () => {
    const atoms = new Map<string, Float64Array>();
    atoms.set('car', gematriaAtom('car', 512));
    atoms.set('cat', gematriaAtom('cat', 512));
    atoms.set('dog', gematriaAtom('dog', 512));
    atoms.set('engine', gematriaAtom('engine', 512));

    const g = new RelationGraph();
    g.relate('car', 'inheritance', 'vehicle');
    g.relate('engine', 'composition', 'piston');

    const hits = resonantRecall(gematriaAtom('car', 512), atoms, g, { k: 3 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].key).toBe('car'); // exact self-match wins
    expect(hits[0].similarityPct).toBeCloseTo(1, 10);
    // the recalled information carries its processes
    expect(hits[0].processes.map((p) => p.target)).toContain('vehicle');
    // sorted descending by refined %
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].similarityPct).toBeGreaterThanOrEqual(hits[i].similarityPct);
    }
  });

  it('resonantRecall abstains (empty) when the store is empty', () => {
    expect(resonantRecall(gematriaAtom('car', 256), new Map(), new RelationGraph())).toEqual([]);
  });
});
