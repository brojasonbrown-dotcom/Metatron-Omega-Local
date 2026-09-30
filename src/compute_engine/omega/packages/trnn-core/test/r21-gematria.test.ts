/**
 * r21 — gematria certification: binary + meaning alignment.
 *
 * Pins the φ-codec's contract: deterministic (same word → identical atom),
 * order-sensitive (a word and its reversal are anti-correlated), and unique per
 * word (identical → 1.0, distinct words far from 1). This is the "every term
 * has a mathematical function AND a binary" property, measured and locked.
 */

import { describe, expect, it } from 'vitest';
import { gematriaAtom } from '../src/sense/encode';
import { similarity } from '../src/substrate/vsa';

describe('R21 · gematria (binary + meaning alignment)', () => {
  it('is deterministic — the same word produces the identical atom', () => {
    expect(Array.from(gematriaAtom('the golden brain', 512)))
      .toEqual(Array.from(gematriaAtom('the golden brain', 512)));
  });

  it('is order-sensitive — a word and its reversal are anti-correlated', () => {
    expect(similarity(gematriaAtom('ab', 512), gematriaAtom('ba', 512))).toBeLessThan(-0.9);
    expect(similarity(gematriaAtom('golden', 512), gematriaAtom('nedlog', 512))).toBeLessThan(-0.7);
  });

  it('is unique per word — identical maps to 1.0, distinct words stay far apart', () => {
    expect(similarity(gematriaAtom('cat', 512), gematriaAtom('cat', 512))).toBe(1);
    expect(similarity(gematriaAtom('cat', 512), gematriaAtom('dog', 512))).toBeLessThan(0);
  });
});
