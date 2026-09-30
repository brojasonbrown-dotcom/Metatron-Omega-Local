/**
 * r23 — hardening battery.
 *
 * Pins the edge cases fixed in the hardening sweep: non-finite coherence is
 * refused (crossSection), an unmeasured depth tick does not suppress the next
 * crossing (consolidation), project eviction bounds growth, relation edges
 * dedupe, and empty inputs return finite deterministic shapes (never throw).
 */

import { describe, expect, it } from 'vitest';
import { CrossSectionMemory } from '../src/memory/crossSection';
import { createField } from '../src/core/complex';
import { IgnitionConsolidator } from '../src/cognition/consolidation';
import { GenomeLedger } from '../src/genome/record';
import { keyPairFromSeed } from '../src/ledger/sth';
import { ProjectContext } from '../src/cognition/project';
import { RelationGraph } from '../src/cognition/relations';
import { relationDag } from '../src/cognition/relationDag';
import { gematriaAtom } from '../src/sense/encode';
import { randomHv, CleanupMemory } from '../src/substrate/vsa';
import { Lexicon } from '../src/cognition/lexicon';
import { EngineHost } from '../src/index';

function ledger(): GenomeLedger {
  return new GenomeLedger('r23', new Uint8Array(32).fill(5), keyPairFromSeed(new Uint8Array(32).fill(9)));
}

const psi = Float64Array.from({ length: 13 }, () => 1);
function field(): ReturnType<typeof createField> {
  const f = createField(89);
  for (let i = 0; i < 89; i++) {
    f.re[i] = Math.cos(i * 0.3);
    f.im[i] = Math.sin(i * 0.3);
  }
  return f;
}

describe('R23 · hardening', () => {
  it('crossSection refuses non-finite coherence (no inconsistent partial store)', () => {
    const m = new CrossSectionMemory(89);
    expect(m.write('nan', field(), NaN, 0).gated).toBe(true);
    expect(m.write('inf', field(), Infinity, 0).gated).toBe(true);
    expect(m.size).toBe(0);
  });

  it('consolidation: an unmeasured depth tick does not suppress the next crossing', () => {
    const c = new IgnitionConsolidator(ledger(), { depthThreshold: 0.6 });
    c.observe(psi, 0.8, 0.9, 1, 0.3); // below
    c.observe(psi, 0.8, 0.9, 2, NaN); // unmeasured — must not poison prevDepth
    expect(c.observe(psi, 0.8, 0.9, 3, 0.7).depthUpCrossing).toBe(true);
  });

  it('ProjectContext evicts the lowest-depth member at capacity', () => {
    const p = new ProjectContext(32, 0.5, 2);
    p.observe('d1', randomHv(32, 'r23-a'), 0.7);
    p.observe('d2', randomHv(32, 'r23-b'), 0.9);
    p.observe('d3', randomHv(32, 'r23-c'), 0.8); // evicts d1 (0.7)
    expect(p.size).toBe(2);
    expect(p.meanDepth).toBeCloseTo((0.9 + 0.8) / 2, 5);
  });

  it('RelationGraph dedupes identical typed edges', () => {
    const g = new RelationGraph();
    g.relate('the', 'temporal', 'golden');
    g.relate('the', 'temporal', 'golden');
    g.relate('the', 'temporal', 'golden');
    expect(g.outgoing('the').length).toBe(1);
  });

  it('empty inputs return finite deterministic shapes (never throw)', () => {
    expect(Array.from(gematriaAtom('', 64))).toEqual(new Array(64).fill(0));
    expect(relationDag(new RelationGraph()).root).toBe(relationDag(new RelationGraph()).root);
    expect(new ProjectContext(32, 0.5).vector().length).toBe(32);
  });

  it('deepReflectAndConsolidate is a stable no-op on an empty project', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r23-dup' });
    expect(h.deepReflectAndConsolidate()).toBe(0);
    expect(h.deepReflectAndConsolidate()).toBe(0); // no duplicate-id throw
  });

  it('CleanupMemory evicts the oldest label past maxLabels', () => {
    const m = new CleanupMemory(16, undefined, undefined, 2);
    m.add('a', randomHv(16, 'r23-cm-a'), 1);
    m.add('b', randomHv(16, 'r23-cm-b'), 1);
    m.add('c', randomHv(16, 'r23-cm-c'), 1); // evicts 'a'
    expect(m.size).toBe(2);
    expect(m.labels()).toEqual(['b', 'c']);
    expect(m.prototype('a')).toBeNull();
  });

  it('Lexicon evicts the least-salient word at capacity', () => {
    const lex = new Lexicon(64, 2);
    lex.observe('common', 'd1');
    lex.observe('common', 'd2'); // common in every doc → idf 0 → least salient
    lex.observe('rare', 'd1'); // rare in one doc → high idf
    lex.observe('new', 'd1'); // new word → evicts 'common'
    expect(lex.size).toBe(2);
    expect(lex.entry('common')).toBeNull();
    expect(lex.entry('rare')).not.toBeNull();
    expect(lex.entry('new')).not.toBeNull();
  });
});
