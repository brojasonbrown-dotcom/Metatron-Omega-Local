/**
 * r20 — sentence-structure battery.
 *
 * Pins that the text path now structures sentences, not just bags of words:
 * each term is observed into the salience-weighted lexicon AND adjacent terms
 * are related as typed `temporal` edges in the relation graph, so word order
 * is recoverable as structure.
 */

import { describe, expect, it } from 'vitest';
import { EngineHost } from '../src/index';

describe('R20 · sentence structure', () => {
  it('relates adjacent terms as temporal edges and exposes the lexicon', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r20' });
    h.declareChannel('text', 'text');
    h.pushChannel('text', 'the golden brain remembers');

    const lx = h.lexiconView();
    expect(lx.size).toBe(4); // the, golden, brain, remembers
    expect(lx.tokens).toBe(4);

    const rv = h.relationsView();
    expect(rv.edges.length).toBe(3); // three adjacent pairs
    expect(rv.edges[0]).toMatchObject({ source: 'the', target: 'golden', type: 'temporal' });
    expect(rv.edges[1]).toMatchObject({ source: 'golden', target: 'brain' });
    expect(rv.edges[2]).toMatchObject({ source: 'brain', target: 'remembers' });
    expect(rv.nodes).toBe(3); // the, golden, brain (source nodes; last word is target-only)
  });

  it('is deterministic across identical hosts', () => {
    function run(): string {
      const h = new EngineHost({ profile: 'PICO', seed: 'r20-det' });
      h.declareChannel('text', 'text');
      h.pushChannel('text', 'the golden brain closes on itself');
      return JSON.stringify(h.relationsView());
    }
    expect(run()).toBe(run());
  });
});
