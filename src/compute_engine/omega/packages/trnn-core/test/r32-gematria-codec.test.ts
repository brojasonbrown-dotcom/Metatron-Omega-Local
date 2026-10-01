/**
 * r32 — the lossless φ-gematria codec (transcribe meaning into gematria and back).
 */

import { describe, expect, it } from 'vitest';
import { encodeGematria, decodeGematria } from '../src/sense/gematriaCodec';

const roundtrip = (t: string) => decodeGematria(encodeGematria(t));

describe('R32 · lossless gematria codec', () => {
  it('round-trips a single character', () => {
    expect(roundtrip('a')).toBe('a');
    expect(roundtrip('z')).toBe('z');
  });

  it('round-trips a word', () => {
    expect(roundtrip('golden')).toBe('golden');
    expect(roundtrip('brain')).toBe('brain');
  });

  it('round-trips a phrase with spaces', () => {
    expect(roundtrip('the golden brain')).toBe('the golden brain');
  });

  it('is order-sensitive (ab != ba)', () => {
    const ab = encodeGematria('ab');
    const ba = encodeGematria('ba');
    expect(ab.re[1]).not.toBe(ba.re[1]);
  });

  it('is deterministic', () => {
    const a = encodeGematria('determinism');
    const b = encodeGematria('determinism');
    expect(a.re).toEqual(b.re);
    expect(a.im).toEqual(b.im);
  });
});
