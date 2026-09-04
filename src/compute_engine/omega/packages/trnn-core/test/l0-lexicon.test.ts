/**
 * l0 — Ω-REAL lexicon battery: the salience-weighted word catalogue.
 *
 * The catalogue must do exactly three things, pinned here:
 *   • frequency → weight: the more a word is used, the higher its weight (and
 *     every word gets its OWN number, never a shared bucket);
 *   • idf → uniqueness: a word that appears in fewer contexts is more unique;
 *   • recall → the most salient word wins the bundle, and an empty catalogue
 *     abstains instead of guessing.
 */

import { describe, expect, it } from 'vitest';
import { Lexicon } from '../src/cognition/lexicon';
import { similarity } from '../src/substrate/vsa';

describe('L0 · salience-weighted word catalogue', () => {
  it('assigns a unique, frequency-scaled weight to every word', () => {
    const lex = new Lexicon(256);
    for (let i = 0; i < 4; i++) lex.observe('resonance');
    lex.observe('flux');

    const r = lex.entry('resonance')!;
    const f = lex.entry('flux')!;
    expect(r.frequency).toBe(4);
    expect(f.frequency).toBe(1);
    // more used → higher weight, and the weights are unique, bounded (0,1)
    expect(r.weight).toBeGreaterThan(f.weight);
    expect(r.weight).toBeGreaterThan(0);
    expect(r.weight).toBeLessThan(1);
    expect(r.weight).not.toBe(f.weight);

    // the atom is deterministic and stable
    expect(Array.from(lex.atom('resonance'))).toEqual(Array.from(lex.atom('resonance')));
  });

  it('idf rewards rarity: a word in fewer documents is more unique', () => {
    const lex = new Lexicon(256);
    lex.observe('the', 'd1');
    lex.observe('the', 'd2');
    lex.observe('the', 'd3');
    lex.observe('quasiparticle', 'd1');

    const common = lex.entry('the')!;
    const rare = lex.entry('quasiparticle')!;
    expect(common.documents).toBe(3);
    expect(rare.documents).toBe(1);
    expect(rare.idf).toBeGreaterThan(common.idf);
  });

  it('the catalogue sorts by salience (frequency-weighted importance)', () => {
    const lex = new Lexicon(256);
    lex.observe('low');
    for (let i = 0; i < 5; i++) lex.observe('high');
    const cat = lex.catalogue();
    expect(cat[0].word).toBe('high');
    expect(cat[0].salience).toBeGreaterThan(cat[1].salience);
  });

  it('encode + recall returns the most salient word', () => {
    const lex = new Lexicon(1024);
    for (let i = 0; i < 50; i++) lex.observe('important');
    lex.observe('noise');

    const bundle = lex.encode(['important', 'noise']);
    const hit = lex.recall(bundle.hv);
    expect(hit).not.toBeNull();
    expect(hit!.label).toBe('important');
  });

  it('abstains when the catalogue is empty', () => {
    const lex = new Lexicon(128);
    expect(lex.recall(new Float64Array(128))).toBeNull();
  });

  it('atoms are φ-structured: shared letters sit nearer than unrelated words', () => {
    const lex = new Lexicon(512);
    const car = lex.atom('car');
    const cat = lex.atom('cat');
    const dog = lex.atom('dog');
    // a word is exactly itself
    expect(similarity(car, car)).toBeCloseTo(1, 12);
    // shared letters ("ca") beat no shared letters
    expect(similarity(car, cat)).toBeGreaterThan(similarity(car, dog));
  });
});
