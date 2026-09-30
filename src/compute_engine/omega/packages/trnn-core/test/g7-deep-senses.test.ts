/**
 * G7 — the deepened senses: touch (slow envelope), Gabor orientation (vision),
 * and topological persistence (insight).
 */

import { describe, expect, it } from 'vitest';
import { encodeGrid, encodeTouch, senseField, SENSE_BOUND } from '../src/sense/encode';
import { persistenceReport } from '../src/substrate/persistence';

const N = 144;

function dist(a: { re: Float64Array; im: Float64Array }, b: { re: Float64Array; im: Float64Array }): number {
  let d = 0;
  for (let i = 0; i < a.re.length; i++) d += (a.re[i] - b.re[i]) ** 2 + (a.im[i] - b.im[i]) ** 2;
  return Math.sqrt(d);
}

describe('G7 — deepened senses', () => {
  it('touch: the slow envelope survives, the fast content is smoothed away', () => {
    const n = 2048;
    const slow = new Float64Array(n);
    const fast = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      slow[i] = Math.sin((2 * Math.PI * 2 * i) / n); // 2 cycles — slow
      fast[i] = Math.sin((2 * Math.PI * 128 * i) / n); // 128 cycles — fast
    }
    const a = senseField(N);
    const b = senseField(N);
    const ra = encodeTouch(slow, a);
    const rb = encodeTouch(fast, b);
    expect(ra.peak).toBeLessThanOrEqual(SENSE_BOUND + 1e-12);
    expect(rb.peak).toBeLessThanOrEqual(SENSE_BOUND + 1e-12);
    expect(dist(a, b)).toBeGreaterThan(0.05);
    // the low-pass keeps far more energy on the slow signal than the fast one
    expect(ra.energy).toBeGreaterThan(rb.energy);
  });

  it('vision Gabor: resolves two diagonal orientations 30° apart', () => {
    const W = 32;
    const H = 32;
    const edge = (angleDeg: number) => {
      const g = new Float64Array(W * H);
      const cx = W / 2;
      const cy = H / 2;
      const th = (angleDeg * Math.PI) / 180;
      const nx = -Math.sin(th);
      const ny = Math.cos(th);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) g[y * W + x] = (x - cx) * nx + (y - cy) * ny > 0 ? 255 : 0;
      }
      return g;
    };
    const a = senseField(N);
    const b = senseField(N);
    encodeGrid(edge(30), W, H, a);
    encodeGrid(edge(60), W, H, b);
    // both are "diagonal" (neither 0°/90°/45°), so the old 3-band Haar would
    // collapse them; the 8-orientation gradient histogram must separate them
    expect(dist(a, b)).toBeGreaterThan(0.05);
  });

  it('persistence: a multi-peak field has more topological depth than a flat field', () => {
    const flat = new Float64Array(N).fill(1);
    const peaks = new Float64Array(N);
    for (let i = 0; i < N; i++) peaks[i] = Math.abs(Math.sin((2 * Math.PI * 5 * i) / N));
    const rf = persistenceReport(flat);
    const rp = persistenceReport(peaks);
    expect(rp.total).toBeGreaterThan(rf.total);
    expect(rp.max).toBeGreaterThan(rf.max);
    // barcode is sorted descending and non-negative
    for (let i = 0; i < rp.bars.length - 1; i++) expect(rp.bars[i]).toBeGreaterThanOrEqual(rp.bars[i + 1]);
    for (const b of rp.bars) expect(b).toBeGreaterThanOrEqual(-1e-12);
  });
});
