/**
 * m1 — Ω-REAL M2 · S003 battery: EMD + Hilbert–Huang.
 *
 * EMD is a decomposition, not a filter: the IMFs plus the residual must rebuild
 * the input, a pure tone must emerge as a single IMF, and the Hilbert envelope
 * of that IMF must read back a ~constant amplitude and the tone's frequency.
 * Determinism and abstention are pinned like everywhere else.
 */

import { describe, expect, it } from 'vitest';
import { emd, hilbertHuang } from '../src/substrate/emd';
import { SeedStream } from '../src/core/determinism';

const rng = (seed: string) => new SeedStream(seed);

function series(n: number, f: (i: number) => number): Float64Array {
  const a = new Float64Array(n);
  for (let i = 0; i < n; i++) a[i] = f(i);
  return a;
}

function maxAbs(x: Float64Array): number {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  return m;
}

describe('M2 · S003 EMD + Hilbert–Huang', () => {
  it('rebuilds the input as imfs + residual', () => {
    const n = 256;
    const s = rng('m1/rec');
    const x = series(n, (i) => Math.sin((2 * Math.PI * 4 * i) / n) + 0.1 * (s.next() * 2 - 1));
    const r = emd(x);
    expect(r.abstained).toBe(false);
    const recon = new Float64Array(n);
    for (const imf of r.imfs) for (let i = 0; i < n; i++) recon[i] += imf[i];
    for (let i = 0; i < n; i++) recon[i] += r.residual[i];
    for (let i = 0; i < n; i++) expect(recon[i]).toBeCloseTo(x[i], 9);
  });

  it('a pure tone decomposes into a single IMF with a negligible residual', () => {
    const n = 256;
    const x = series(n, (i) => Math.sin((2 * Math.PI * 4 * i) / n));
    const r = emd(x);
    expect(r.abstained).toBe(false);
    expect(r.imfs.length).toBe(1);
    expect(maxAbs(r.residual)).toBeLessThan(1e-6);
  });

  it('Hilbert–Huang reads back a constant amplitude and the tone frequency', () => {
    const n = 256;
    const x = series(n, (i) => Math.sin((2 * Math.PI * 4 * i) / n));
    const r = hilbertHuang(x);
    expect(r.abstained).toBe(false);
    expect(r.components.length).toBe(1);
    const amp = r.components[0].amplitude;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 8; i < n - 8; i++) {
      min = Math.min(min, amp[i]);
      max = Math.max(max, amp[i]);
    }
    expect(max - min).toBeLessThan(0.2);
    expect(r.components[0].meanFrequency).not.toBeNull();
    expect(r.components[0].meanFrequency!).toBeCloseTo(4 / n, 2);
  });

  it('is deterministic (bit-identical) across independent runs', () => {
    const s = rng('m1/det');
    const x = series(128, (i) => Math.sin((2 * Math.PI * 3 * i) / 128) + 0.05 * (s.next() * 2 - 1));
    const a = emd(x);
    const b = emd(Float64Array.from(x));
    expect(a.imfs.length).toBe(b.imfs.length);
    expect(a.siftCounts).toEqual(b.siftCounts);
    for (let k = 0; k < a.imfs.length; k++) {
      expect(Array.from(a.imfs[k])).toEqual(Array.from(b.imfs[k]));
    }
  });

  it('abstains on short, flat, and non-finite input', () => {
    expect(emd(new Float64Array(10)).abstained).toBe(true);
    expect(emd(new Float64Array(64)).abstained).toBe(true); // flat → no extrema
    const nan = series(64, (i) => (i === 10 ? NaN : Math.sin(i)));
    expect(emd(nan).abstained).toBe(true);
  });
});
