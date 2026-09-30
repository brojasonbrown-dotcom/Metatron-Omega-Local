/**
 * r15 — information depth battery.
 *
 * Pins that the depth/importance reading composes the existing measures
 * correctly: a rich + multi-scale + closed + novel field reads deep, a
 * single-mode field vetoes to zero, an incoherent field abstains, and the
 * reading is wired into the live host.
 */

import { describe, expect, it } from 'vitest';
import { depthReading } from '../src/measure/depth';
import { EngineHost } from '../src/index';

const flat13 = Float64Array.from({ length: 13 }, () => 1);
const single13 = Float64Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe('R15 · information depth', () => {
  it('rates a rich, multi-scale, closed, novel field as deep', () => {
    const r = depthReading({
      coherence: 0.9,
      signatures: [flat13, flat13, flat13],
      energies: [1, 1, 1],
      gammas: [0.9, 0.9, 0.9],
      novelty: 0.7,
    });
    expect(r.infoDensity).toBeCloseTo(1, 5); // flat 13-mode = log2(13)/log2(13)
    expect(r.scaleEngagement).toBeCloseTo(1, 5); // uniform across 3 rungs
    expect(r.value).toBeGreaterThan(0.5);
  });

  it('vetoes a single-mode (shallow) field to depth 0', () => {
    const r = depthReading({ coherence: 0.9, signatures: [single13], energies: [1], gammas: [0.9], novelty: 0.5 });
    expect(r.dead).toBe(true);
    expect(r.value).toBe(0);
  });

  it('abstains when the field is incoherent', () => {
    const r = depthReading({ coherence: 0.3, signatures: [flat13], energies: [1], gammas: [0.9], novelty: 0.5 });
    expect(r.gated).toBe(true);
    expect(Number.isNaN(r.value)).toBe(true);
  });

  it('is wired into the host and reported on the snapshot', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r15' });
    for (let i = 0; i < 3; i++) h.stepOnce();
    expect(h.depth()).not.toBeNull();
    expect('depth' in h.snapshot()).toBe(true);
  });
});
