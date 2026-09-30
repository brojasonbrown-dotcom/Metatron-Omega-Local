/**
 * r30 — full sensory wiring guard.
 *
 * Forensic finding this pins: of the five declared encoder modalities
 * (`scalar`, `text`, `grid`, `audio`, `touch`), only three were reachable on the
 * live path. `encodeTouch` had zero consumers (the host's push switch routed
 * 'touch' through the generic scalar default) and `scalar` was only reachable
 * through a default branch no declared channel used. The sensory plane itself
 * always resolved and transported to every rung — the dormancy was the two
 * unwired encoders.
 *
 * This test asserts, permanently: every modality encodes to a bound (‖v‖_inf ≤ φ)
 * non-zero field, all five fuse, and the fused field reaches every rung.
 */

import { describe, expect, it } from 'vitest';
import { EngineHost } from '../src/runtime/host';
import { PHI } from '../src/core/constants';

function freshHost(seed: string): EngineHost {
  const h = new EngineHost({ profile: 'MESO', seed });
  h.declareChannel('audio', 'audio');
  h.declareChannel('vision', 'grid');
  h.declareChannel('text', 'text');
  h.declareChannel('touch', 'touch');
  h.declareChannel('scalar', 'scalar');
  return h;
}

const wave = (n: number, f: number, a = 0.5) =>
  new Float32Array(n).map((_, i) => Math.sin(i * f) * a);

describe('R30 · full sensory wiring', () => {
  it('encodes every one of the five modalities to a bound, non-zero field', () => {
    const h = freshHost('r30-enc');

    const reports = [
      h.pushChannel('audio', wave(1024, 0.05)),
      h.pushChannel('vision', wave(144 * 89, 0.1), { width: 144, height: 89 }),
      h.pushChannel('text', 'the golden brain senses the coherent universe'),
      h.pushChannel('touch', wave(512, 0.02, 0.3)),
      h.pushChannel('scalar', wave(256, 0.07, 0.4)),
    ];

    for (const r of reports) {
      expect(r.energy).toBeGreaterThan(0);
      expect(r.peak).toBeLessThanOrEqual(PHI + 1e-12);
      expect(r.support).toBeGreaterThan(0);
    }

    // Each modality must route to its OWN encoder — 'touch' previously fell
    // through to the generic scalar default (encodeTouch was dead code).
    expect(reports[0].modality).toBe('audio');
    expect(reports[1].modality).toBe('grid');
    expect(reports[2].modality).toBe('text');
    expect(reports[3].modality).toBe('touch');
    expect(reports[4].modality).toBe('scalar');
  });

  it('fuses all five channels and transports the fused field to every rung', () => {
    const h = freshHost('r30-transport');
    h.pushChannel('audio', wave(1024, 0.05));
    h.pushChannel('vision', wave(144 * 89, 0.1), { width: 144, height: 89 });
    h.pushChannel('text', 'coherent universe');
    h.pushChannel('touch', wave(512, 0.02, 0.3));
    h.pushChannel('scalar', wave(256, 0.07, 0.4));

    for (let i = 0; i < 8; i++) h.stepOnce();

    const snap = h.snapshot();
    expect(snap.senseChannels).toBe(5);

    const plane = h.engine.sensoryPlane();
    expect(plane).not.toBeNull();
    const rungs = plane!.report().rungs;
    expect(rungs.length).toBeGreaterThan(0);
    for (const r of rungs) {
      expect(r.energy).toBeGreaterThan(0); // active across ALL rungs/nodes
    }
  });

  it('is deterministic — the same five injections reproduce the same fused peak', () => {
    const make = (seed: string) => {
      const h = freshHost(seed);
      h.pushChannel('audio', wave(512, 0.05));
      h.pushChannel('vision', wave(89 * 55, 0.1), { width: 89, height: 55 });
      h.pushChannel('text', 'coherent');
      h.pushChannel('touch', wave(256, 0.02, 0.3));
      h.pushChannel('scalar', wave(128, 0.07, 0.4));
      for (let i = 0; i < 4; i++) h.stepOnce();
      return h.snapshot().sensePeak;
    };
    expect(make('r30-det')).toBe(make('r30-det'));
  });
});
