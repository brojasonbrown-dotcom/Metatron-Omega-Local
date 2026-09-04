/**
 * m0 — Ω-REAL M2 · S002 battery: orthonormal Discrete Wavelet Transform.
 *
 * A DWT is only a DWT if it (a) is orthonormal — hence Parseval (energy is
 * preserved across levels), (b) is deterministic, and (c) abstains rather than
 * inventing coefficients when the window cannot be split. The battery pins all
 * three, plus the known Haar two-sample value and transient localisation.
 */

import { describe, expect, it } from 'vitest';
import { waveletDwt, type WaveletReport } from '../src/spectral/wavelet';
import { SeedStream } from '../src/core/determinism';

const rng = (seed: string) => new SeedStream(seed);

function series(n: number, f: (i: number) => number): Float64Array {
  const a = new Float64Array(n);
  for (let i = 0; i < n; i++) a[i] = f(i);
  return a;
}

function energy(x: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return s;
}

/** Energy of the full decomposition: final approximation + every detail level. */
function totalEnergy(rep: WaveletReport): number {
  let s = 0;
  if (rep.levels.length > 0) {
    const last = rep.levels[rep.levels.length - 1].approx;
    for (let i = 0; i < last.length; i++) s += last[i] * last[i];
  }
  for (const lv of rep.levels) {
    for (let i = 0; i < lv.detail.length; i++) s += lv.detail[i] * lv.detail[i];
  }
  return s;
}

describe('M2 · S002 wavelet (orthonormal DWT)', () => {
  it('Haar level-1 is exact on a two-sample window', () => {
    const rep = waveletDwt([1, 3], { kind: 'haar', levels: 1 });
    expect(rep.abstained).toBe(false);
    expect(rep.levels[0].approx[0]).toBeCloseTo((1 + 3) / Math.sqrt(2), 12);
    expect(rep.levels[0].detail[0]).toBeCloseTo((1 - 3) / Math.sqrt(2), 12);
  });

  it('preserves energy (Parseval) for Haar over a multi-level run', () => {
    const n = 256;
    const x = series(n, (i) => Math.sin((2 * Math.PI * 5 * i) / n) + 0.25 * Math.cos((2 * Math.PI * 23 * i) / n));
    const rep = waveletDwt(x, { kind: 'haar' });
    expect(rep.abstained).toBe(false);
    expect(totalEnergy(rep)).toBeCloseTo(energy(x), 9);
  });

  it('preserves energy (Parseval) for Daubechies-4', () => {
    const n = 256;
    const s = rng('m0/db4');
    const x = series(n, () => s.next() * 2 - 1);
    const rep = waveletDwt(x, { kind: 'db4' });
    expect(rep.abstained).toBe(false);
    expect(totalEnergy(rep)).toBeCloseTo(energy(x), 8);
  });

  it('Haar localises a single spike to one detail coefficient', () => {
    const n = 64;
    const x = new Float64Array(n);
    x[32] = 1;
    const rep = waveletDwt(x, { kind: 'haar', levels: 1 });
    const d = rep.levels[0].detail;
    let nonZero = 0;
    for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 1e-12) nonZero++;
    expect(nonZero).toBe(1);
  });

  it('is deterministic (bit-identical) across independent runs', () => {
    const s = rng('m0/det');
    const x = series(64, () => s.next());
    const a = waveletDwt(x, { kind: 'db4' });
    const b = waveletDwt(Float64Array.from(x), { kind: 'db4' });
    expect(a.levels.map((l) => Array.from(l.approx))).toEqual(b.levels.map((l) => Array.from(l.approx)));
    expect(a.levels.map((l) => Array.from(l.detail))).toEqual(b.levels.map((l) => Array.from(l.detail)));
  });

  it('abstains on too-short, odd, and non-finite input', () => {
    expect(waveletDwt([1], { kind: 'haar' }).abstained).toBe(true);
    expect(waveletDwt([1, 2, 3], { kind: 'haar' }).abstained).toBe(true); // odd
    expect(waveletDwt([1, 2, 3], { kind: 'db4' }).abstained).toBe(true); // odd + short
    expect(waveletDwt([1, 2, NaN, 4], { kind: 'haar' }).abstained).toBe(true);
  });
});
