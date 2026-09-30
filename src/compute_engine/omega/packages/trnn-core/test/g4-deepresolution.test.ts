/**
 * g4-deepresolution — Ω-REAL G4 continuous deep-resolution tap.
 *
 * Pins that the host retains the scale-graded field (per-rung energy/peak) and
 * the base-rung node-frequency spectrum in a bounded Fibonacci ring at the
 * MIND_STRIDE cadence — not just summarised, and only the latest frame rides the
 * snapshot bus. It must be:
 *   • bounded — the ring never exceeds DEEP_TAP_CAPACITY;
 *   • deterministic — identical hosts ⇒ identical rings;
 *   • honest — empty until the first MIND_STRIDE boundary;
 *   • observable — the snapshot carries the same view as deepResolutionView().
 */

import { describe, expect, it } from 'vitest';
import { EngineHost, MIND_STRIDE } from '../src/runtime/host';
import { DeepResolutionTap, DEEP_TAP_CAPACITY, type DeepFrame } from '../src/measure/deepResolution';

const F = (x: number[]): Float64Array => Float64Array.from(x);

function frame(tick: number): DeepFrame {
  return {
    tick,
    energy: F([1, 2, 3]),
    peak: F([0.5, 0.5, 0.5]),
    meanFrequency: 0.123,
    peakFrequency: 0.456,
    occupancy: F([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]),
    closureDefect: 1e-6,
    persistence: 0.9,
  };
}

describe('G4 · continuous deep-resolution tap', () => {
  it('is a bounded LRU ring (evicts oldest past capacity)', () => {
    const tap = new DeepResolutionTap(3);
    for (let t = 0; t < 5; t++) tap.push(frame(t));
    expect(tap.size).toBe(3);
    expect(tap.latest()?.tick).toBe(4);
    expect(tap.tail(2).map((f) => f.tick)).toEqual([3, 4]);
    expect(tap.view().capacity).toBe(3);
    expect(tap.view().latest?.tick).toBe(4);
  });

  it('starts empty and reports the default Fibonacci capacity', () => {
    const tap = new DeepResolutionTap();
    expect(tap.size).toBe(0);
    expect(tap.view()).toEqual({ size: 0, capacity: DEEP_TAP_CAPACITY, latest: null });
  });

  it('host retains deep resolution at the MIND_STRIDE cadence', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'g4-deep' });
    expect(h.deepResolutionView().size).toBe(0);
    for (let i = 0; i < MIND_STRIDE * 5; i++) h.stepOnce();
    const v = h.deepResolutionView();
    expect(v.size).toBeGreaterThanOrEqual(1);
    const latest = v.latest!;
    expect(latest.tick % MIND_STRIDE).toBe(0);
    const rungs = h.snapshot().rungs.length;
    expect(latest.energy.length).toBe(rungs);
    expect(latest.peak.length).toBe(rungs);
    expect(latest.occupancy.length).toBeGreaterThan(0);
    for (const x of [latest.meanFrequency, latest.peakFrequency, latest.closureDefect, latest.persistence]) {
      expect(Number.isFinite(x)).toBe(true);
    }
    expect(latest.persistence).toBeGreaterThanOrEqual(0);
    for (const x of latest.energy) expect(Number.isFinite(x)).toBe(true);
    for (const x of latest.peak) expect(Number.isFinite(x)).toBe(true);
    for (const x of latest.occupancy) expect(Number.isFinite(x)).toBe(true);
  });

  it('is deterministic across identical hosts', () => {
    function collect(): number[] {
      const h = new EngineHost({ profile: 'PICO', seed: 'g4-deep-det' });
      for (let i = 0; i < MIND_STRIDE * 4; i++) h.stepOnce();
      const latest = h.deepResolutionView().latest!;
      return [
        latest.tick,
        latest.meanFrequency,
        latest.peakFrequency,
        latest.closureDefect,
        latest.persistence,
        ...latest.energy,
        ...latest.peak,
        ...latest.occupancy,
      ];
    }
    expect(collect()).toEqual(collect());
  });

  it('rides the snapshot bus (latest frame only)', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'g4-deep-snap' });
    for (let i = 0; i < MIND_STRIDE * 3; i++) h.stepOnce();
    const s = h.snapshot();
    expect(s.deepResolution.size).toBe(h.deepResolutionView().size);
    expect(s.deepResolution.capacity).toBe(DEEP_TAP_CAPACITY);
    expect(s.deepResolution.latest?.tick).toBe(h.deepResolutionView().latest?.tick);
  });
});
