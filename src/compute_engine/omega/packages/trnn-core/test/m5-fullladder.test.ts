/**
 * m5 — Ω-REAL full-ladder battery: the 42-rung φ-scale ladder, end to end.
 *
 * The dense core (18 rungs, n ≤ 125) is the hot path; the full ladder extends to
 * n = 293 (φ²⁹³ ≈ 10⁶¹). This pins that the engine instantiates and reads the
 * WHOLE ladder — every scale, up to the cosmic rung — with a cost-bounded node
 * allocation, a strictly monotone φ-octave radius, and determinism.
 */

import { describe, expect, it } from 'vitest';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { LADDER } from '../src/core/scaleLadder';
import { scaleSignature } from '../src/measure/scaleSignature';

describe('M5 · full 42-rung ladder (deep scale readout)', () => {
  it('instantiates the full ladder and reads every scale up to n = 293', () => {
    const full = new MultiTorusEngine({ rungs: LADDER, nodes: 21, seed: 'm5-full', drive: 0.5 });
    expect(full.engines.length).toBe(LADDER.length); // 42 stable rungs
    expect(full.rungs[0].n).toBe(1);
    expect(full.rungs[full.rungs.length - 1].n).toBe(293);

    full.run(10);
    const sig = scaleSignature(full);
    expect(sig.rungs.length).toBe(LADDER.length);

    // full φ-octave span: logRadius from ln φ to 293·ln φ ≈ 141
    expect(sig.rungs[0].logRadius).toBeGreaterThan(0);
    expect(sig.rungs[sig.rungs.length - 1].logRadius).toBeGreaterThan(140);
    for (let r = 1; r < sig.rungs.length; r++) {
      expect(sig.rungs[r].logRadius).toBeGreaterThan(sig.rungs[r - 1].logRadius);
    }

    // octave links span the whole ladder
    expect(sig.octaves.length).toBe(sig.rungs.length - 1);
  });

  it('is deterministic and cost-bounded across the full ladder', () => {
    const a = new MultiTorusEngine({ rungs: LADDER, nodes: 21, seed: 'm5-det', drive: 0.5 });
    const b = new MultiTorusEngine({ rungs: LADDER, nodes: 21, seed: 'm5-det', drive: 0.5 });
    a.run(10);
    b.run(10);
    const sa = scaleSignature(a);
    const sb = scaleSignature(b);
    expect(sa.rungs.map((f) => f.energy)).toEqual(sb.rungs.map((f) => f.energy));
    expect(sa.rungs.map((f) => Array.from(f.signature))).toEqual(sb.rungs.map((f) => Array.from(f.signature)));
    // cost: 42 rungs × 21 nodes = 882 nodes
    const totalNodes = sa.rungs.reduce((s, f) => s + f.nodes, 0);
    expect(totalNodes).toBe(LADDER.length * 21);
  });
});
