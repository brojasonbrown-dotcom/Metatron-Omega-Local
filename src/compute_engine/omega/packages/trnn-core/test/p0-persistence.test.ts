/**
 * p0 — cross-session persistence: save/restore round-trips.
 *
 * The brain's memory was in-memory only; this pins that the measured state
 * (word frequency/uniqueness, relation edges, sealed genome records) survives a
 * canonical-JSON round-trip with byte-identical reconstruction — atoms and
 * Merkle leaves are deterministically recomputed, never stored.
 */

import { describe, expect, it } from 'vitest';
import { sha256 } from '@noble/hashes/sha2.js';
import { canonicalJson, utf8 } from '../src/ledger/canonical';
import { keyPairFromSeed } from '../src/ledger/sth';
import { Lexicon } from '../src/cognition/lexicon';
import { RelationGraph } from '../src/cognition/relations';
import { GenomeLedger } from '../src/genome/record';
import { serializeBrain, restoreBrain } from '../src/memory/persistence';

describe('P0 · cross-session persistence', () => {
  it('lexicon + relation graph survive a canonical round-trip', () => {
    const lex = new Lexicon(512);
    lex.observe('resonance');
    lex.observe('resonance');
    lex.observe('flux', 'd1');
    lex.observe('field');
    const g = new RelationGraph();
    g.relate('resonance', 'inheritance', 'physics');
    g.relate('field', 'causation', 'resonance');

    const state = JSON.parse(canonicalJson({ lexicon: lex.serialize(), relations: g.serialize() }));
    const lex2 = Lexicon.restore(state.lexicon);
    const g2 = RelationGraph.restore(state.relations);

    // measured state preserved (frequency, uniqueness, weight)
    expect(lex2.entry('resonance')!.frequency).toBe(2);
    expect(lex2.entry('flux')!.documents).toBe(1);
    expect(lex2.weight('resonance')).toBe(lex.weight('resonance'));
    expect(lex2.weight('field')).toBe(lex.weight('field'));
    // atoms byte-identical (deterministically recomputed from word + dim)
    expect(Array.from(lex2.atom('resonance'))).toEqual(Array.from(lex.atom('resonance')));
    // edges preserved
    expect(g2.outgoing('resonance')[0].target).toBe('physics');
    expect(g2.outgoing('field')[0].type).toBe('causation');
  });

  it('genome ledger survives a round-trip with an identical root and audit', () => {
    const seed = 'p0-genome';
    const master = sha256(utf8(`${seed}:master`));
    const signer = keyPairFromSeed(sha256(utf8(`${seed}:signer`)));
    const a = new GenomeLedger('p0-log', master, signer);
    a.append({
      id: 'r1', kind: 'Finding', body: { value: 0.5, n: 3 }, recordedAt: 13,
      provenance: { attributedTo: 'test', generatedBy: 'p0', evidence: 'measured' },
    });
    a.append({
      id: 'r2', kind: 'Finding', body: { value: 0.7, n: 4 }, recordedAt: 14,
      provenance: { attributedTo: 'test', generatedBy: 'p0', evidence: 'measured' },
    });

    const b = GenomeLedger.restore(JSON.parse(canonicalJson(a.serialize())), master, signer);
    expect(b.rootHex()).toBe(a.rootHex()); // byte-identical Merkle root
    expect(b.size).toBe(a.size);
    expect(b.audit(14).ok).toBe(true); // full self-audit passes
    expect(b.open('r1')).toEqual(a.open('r1')); // sealed body decrypts identically

    // correction / supersession survives too
    a.correct('r1', { value: 0.6 }, {
      id: 'r3', recordedAt: 15, reason: 'fix',
      provenance: { attributedTo: 'test', generatedBy: 'p0', evidence: 'measured' },
    });
    const c = GenomeLedger.restore(JSON.parse(canonicalJson(a.serialize())), master, signer);
    expect(c.current('r1')!.header.id).toBe('r3');
    expect(c.rootHex()).toBe(a.rootHex());
  });

  it('the whole durable memory serialises to one document and restores', () => {
    const seed = 'p0-brain';
    const master = sha256(utf8(`${seed}:master`));
    const signer = keyPairFromSeed(sha256(utf8(`${seed}:signer`)));
    const lex = new Lexicon(256);
    lex.observe('resonance');
    lex.observe('flux');
    const g = new RelationGraph();
    g.relate('resonance', 'inheritance', 'physics');
    const gen = new GenomeLedger('p0-brain-log', master, signer);
    gen.append({ id: 'x1', kind: 'Finding', body: { v: 1 }, recordedAt: 1, provenance: { attributedTo: 't', generatedBy: 'p0', evidence: 'measured' } });

    const r = restoreBrain(serializeBrain(lex, g, gen), { master, signer });
    expect(r.lexicon.weight('resonance')).toBe(lex.weight('resonance'));
    expect(r.relations.outgoing('resonance')[0].target).toBe('physics');
    expect(r.genome.rootHex()).toBe(gen.rootHex());
    expect(r.genome.audit(1).ok).toBe(true);
  });
});
