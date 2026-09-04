/**
 * n3 — Ω-REAL sense→scale relevance battery (the φ^(−r/2) falloff law).
 *
 * The one scale-relevance mechanism the sensory path actually implements is the
 * per-rung falloff: a sensory event is a LOCAL event, so its authority on rung r
 * decays as φ^(−r/2). g6 asserted this only as monotone; this battery pins the
 * LAW itself — the value φ^(−r/2), not the shape — and that every modality rides
 * the same law under the L-S1 injection bound and the L-S2 loop-gain ceiling.
 */

import { describe, expect, it } from 'vitest';
import { SensoryPlane } from '../src/sense/plane';
import { PHI, PHI_INV, phiPow } from '../src/core/constants';
import { dpow } from '../src/core/dmath';
import { encodeScalars, encodeText, senseField, SENSE_BOUND } from '../src/sense/encode';

const NODES = [144, 89, 55]; // Fibonacci node counts (rank 0,1,2)

describe('N3 · sense→scale relevance (φ^(−r/2) falloff law)', () => {
  it('pins falloff(r) = φ^(−r/2) by its own functional law, not by re-derivation', () => {
    const p = new SensoryPlane(NODES);
    // rank 0 = full authority
    expect(p.falloff(0)).toBe(1);
    // falloff(1) is the square root of φ⁻¹: falloff(1)² = φ⁻¹
    expect(p.falloff(1) * p.falloff(1)).toBeCloseTo(PHI_INV, 15);
    // falloff(2) = φ⁻¹ exactly
    expect(p.falloff(2)).toBeCloseTo(PHI_INV, 15);
    // functional laws: falloff(2r) = falloff(r)², and a constant geometric ratio φ^(−1/2)
    for (let r = 0; r <= 12; r++) {
      expect(p.falloff(2 * r)).toBeCloseTo(p.falloff(r) * p.falloff(r), 15);
      expect(p.falloff(r + 1) / p.falloff(r)).toBeCloseTo(p.falloff(1), 15);
    }
    // spot-check against the canonical deterministic power for a fractional exponent
    expect(p.falloff(3)).toBeCloseTo(dpow(PHI, -3 / 2), 15);
  });

  it('injects onto every rung scaled by loopGain·φ^(−r/2), within the L-S1 bound', () => {
    const p = new SensoryPlane(NODES);
    p.declare({ id: 's', modality: 'scalar', nodes: 144 });
    const f = senseField(144);
    encodeScalars(Array.from({ length: 144 }, (_, i) => Math.sin(i / 7)), f);
    p.push('s', f, 0);
    const { report } = p.resolve();

    expect(report.rungs.length).toBe(3);
    expect(report.withinBound).toBe(true);
    // the report carries the exact law, and every rung respects the bound
    for (let r = 0; r < report.rungs.length; r++) {
      expect(report.rungs[r].falloff).toBe(p.falloff(r));
      expect(report.rungs[r].peak).toBeLessThanOrEqual(SENSE_BOUND + 1e-12);
    }
    // geometric decay in rank order
    expect(report.rungs[0].falloff).toBeGreaterThan(report.rungs[1].falloff);
    expect(report.rungs[1].falloff).toBeGreaterThan(report.rungs[2].falloff);
    // the loop gain is the certified φ⁻² (Law L-S2)
    expect(p.currentLoopGain()).toBeCloseTo(phiPow(-2), 15);
  });

  it('holds every modality to the same φ^(−r/2) scale law', () => {
    const p = new SensoryPlane(NODES);
    p.declare({ id: 'text', modality: 'text', nodes: 144 });
    p.declare({ id: 'grid', modality: 'grid', nodes: 144 });
    const t = senseField(144);
    encodeText('scale', t);
    p.push('text', t, 0);
    const g = senseField(144);
    encodeScalars(Array.from({ length: 144 }, () => 1), g);
    p.push('grid', g, 0);

    const { report } = p.resolve();
    expect(report.withinBound).toBe(true);
    for (const r of report.rungs) {
      expect(r.falloff).toBe(p.falloff(r.rank)); // no modality escapes the law
    }
  });
});
