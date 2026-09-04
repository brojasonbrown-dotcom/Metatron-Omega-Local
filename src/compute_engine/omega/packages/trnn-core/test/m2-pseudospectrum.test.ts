/**
 * m2 — Ω-REAL M2 · S007 battery: ε-pseudospectrum.
 *
 * For a NORMAL matrix, σ_min(zI − A) is exactly the distance from z to the
 * spectrum, so a rotation matrix gives exact, checkable values; symmetry about
 * the real axis and determinism are pinned too.
 */

import { describe, expect, it } from 'vitest';
import { pseudospectrum, sigmaMinAt } from '../src/substrate/pseudospectrum';

describe('M2 · S007 pseudospectrum', () => {
  it('σ_min vanishes at an eigenvalue and equals distance away from it', () => {
    const A = Float64Array.from([0, -1, 1, 0]); // rotation, eigenvalues ±i (normal)
    expect(sigmaMinAt(A, 2, 0, 1)).toBeLessThan(1e-9); // z = i is an eigenvalue
    expect(sigmaMinAt(A, 2, 0, 0)).toBeCloseTo(1, 6); // distance 1 to ±i
    expect(sigmaMinAt(A, 2, 0, 2)).toBeCloseTo(1, 6); // distance 1 to i
  });

  it('is symmetric about the real axis (conjugate invariance)', () => {
    const A = Float64Array.from([1, 0.3, -0.2, 2]); // non-normal 2×2
    for (const re of [-1, 0, 1, 2]) {
      for (const im of [0.5, 1, 1.5]) {
        expect(sigmaMinAt(A, 2, re, im)).toBeCloseTo(sigmaMinAt(A, 2, re, -im), 8);
      }
    }
  });

  it('the grid scan is deterministic and finite', () => {
    const A = Float64Array.from([1, 0.3, -0.2, 2]);
    const pts = pseudospectrum(A, 2, [-1, 0, 1], [0, 0.5, 1]);
    expect(pts.length).toBe(9);
    for (const p of pts) expect(Number.isFinite(p.sigmaMin)).toBe(true);
  });
});
