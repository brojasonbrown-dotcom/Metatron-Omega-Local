/**
 * m4 — Ω-REAL scale-axis signature battery.
 *
 * Pins that the multi-rung field reads as a scale-graded structure: every rung
 * carries its scale metadata + full field measures + the 13-mode Lucas
 * signature, the logRadius grows monotonically along the φ-octave ladder, the
 * adjacent-rung octave links report finite non-negative morphism defects, and
 * the whole readout is deterministic.
 */

import { describe, expect, it } from 'vitest';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { DENSE_CORE } from '../src/core/scaleLadder';
import { SIGNATURE_MODES } from '../src/core/constants';
import { scaleSignature } from '../src/measure/scaleSignature';

function engine(seed: string): MultiTorusEngine {
  return new MultiTorusEngine({ rungs: DENSE_CORE.slice(0, 5), nodes: 21, seed, drive: 0.5 });
}

describe('M4 · scale-axis signature (multi-scale readout)', () => {
  it('reads every rung with scale metadata + full measures + 13-mode signature', () => {
    const eng = engine('m4-scale');
    eng.run(50);
    const sig = scaleSignature(eng);

    expect(sig.rungs.length).toBe(eng.engines.length);
    for (const f of sig.rungs) {
      expect(Number.isFinite(f.n)).toBe(true);
      expect(Number.isFinite(f.logRadius)).toBe(true);
      expect(Number.isFinite(f.logTau)).toBe(true);
      expect(f.nodes).toBeGreaterThan(0);
      expect(Number.isFinite(f.energy)).toBe(true);
      expect(Number.isFinite(f.peak)).toBe(true);
      expect(f.signature.length).toBe(SIGNATURE_MODES);
      for (const s of f.signature) expect(Number.isFinite(s)).toBe(true);
    }

    // φ-octave ladder: logRadius strictly increases with rank
    for (let r = 1; r < sig.rungs.length; r++) {
      expect(sig.rungs[r].logRadius).toBeGreaterThan(sig.rungs[r - 1].logRadius);
    }

    // one octave link per adjacent rung pair, all defects finite and non-negative
    expect(sig.octaves.length).toBe(sig.rungs.length - 1);
    for (const o of sig.octaves) {
      expect(Number.isFinite(o.phaseCommutationDefect)).toBe(true);
      expect(Number.isFinite(o.meanDefect)).toBe(true);
      expect(o.phaseCommutationDefect).toBeGreaterThanOrEqual(0);
      expect(o.meanDefect).toBeGreaterThanOrEqual(0);
    }
  });

  it('is deterministic across identical engines', () => {
    const a = engine('m4-det');
    const b = engine('m4-det');
    a.run(50);
    b.run(50);
    const sa = scaleSignature(a);
    const sb = scaleSignature(b);
    expect(sa.rungs.map((f) => f.energy)).toEqual(sb.rungs.map((f) => f.energy));
    expect(sa.rungs.map((f) => Array.from(f.signature))).toEqual(sb.rungs.map((f) => Array.from(f.signature)));
    expect(sa.octaves.map((o) => o.phaseCommutationDefect)).toEqual(sb.octaves.map((o) => o.phaseCommutationDefect));
  });
});
