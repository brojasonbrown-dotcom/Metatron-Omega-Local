/**
 * r17 — project context battery.
 *
 * Pins that the persistent project folds deep fields and rejects shallow ones,
 * produces a finite bundled vector, and round-trips through serialize/restore
 * deterministically.
 */

import { describe, expect, it } from 'vitest';
import { ProjectContext } from '../src/cognition/project';
import { randomHv } from '../src/substrate/vsa';

describe('R17 · project context', () => {
  it('folds deep fields and rejects shallow ones (depth gate)', () => {
    const p = new ProjectContext(64, 0.5);
    expect(p.observe('d1', randomHv(64, 'r17-deep'), 0.7)).toBe(true);
    expect(p.observe('s1', randomHv(64, 'r17-shallow'), 0.2)).toBe(false);
    expect(p.size).toBe(1);
    expect(p.meanDepth).toBeCloseTo(0.7, 5);
  });

  it('produces a finite bundled vector across members', () => {
    const p = new ProjectContext(64, 0.5);
    p.observe('d1', randomHv(64, 'r17-a'), 0.7);
    p.observe('d2', randomHv(64, 'r17-b'), 0.8);
    const v = p.vector();
    expect(v.length).toBe(64);
    for (const x of v) expect(Number.isFinite(x)).toBe(true);
  });

  it('round-trips through serialize/restore byte-identically', () => {
    const a = new ProjectContext(64, 0.5);
    a.observe('d1', randomHv(64, 'r17-a'), 0.7);
    a.observe('d2', randomHv(64, 'r17-b'), 0.8);
    const b = ProjectContext.restore(a.serialize());
    expect(b.size).toBe(a.size);
    expect(b.meanDepth).toBeCloseTo(a.meanDepth, 12);
    expect(Array.from(b.vector())).toEqual(Array.from(a.vector()));
  });
});
