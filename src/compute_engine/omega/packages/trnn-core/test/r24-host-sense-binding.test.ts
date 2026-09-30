/**
 * r24 — host-level sense binding (Layer A) + measured spectral ground truth.
 *
 * Pins two observe-only, digest-neutral wirings the host owns:
 *
 *   1. textFingerprintReading() — pushing a text channel retains the
 *      deterministic, unit-norm φ-spectrum binding of that text, identical
 *      across hosts (the cross-modal fingerprint `harness/recall` resolves).
 *
 *   2. measuredSpectrum(rank) — the *measured* normalised graph-Laplacian
 *      spectrum of a rung (Lanczos + CGS2), bounded in [0,2], with a digest
 *      that is bit-identical across hosts. This is the ground truth against
 *      which the assumed eigenmode ordering (`torus/eigenmodes`) is checked —
 *      measured, never assumed.
 */

import { describe, expect, it } from 'vitest';
import { EngineHost } from '../src/runtime/host';

describe('R24 · host text binding + measured spectrum', () => {
  it('retains a deterministic unit-norm text fingerprint on pushChannel', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r24-text' });
    h.declareChannel('text', 'text', 144);
    h.pushChannel('text', 'the quick brown fox');
    const fp = h.textFingerprintReading();
    expect(fp).not.toBeNull();
    expect(fp!.length).toBe(13);
    let s2 = 0;
    for (const v of fp!) s2 += v * v;
    expect(s2).toBeCloseTo(1, 12);

    const h2 = new EngineHost({ profile: 'PICO', seed: 'r24-text' });
    h2.declareChannel('text', 'text', 144);
    h2.pushChannel('text', 'the quick brown fox');
    expect(Array.from(h2.textFingerprintReading()!)).toEqual(Array.from(fp!));
  });

  it('measures a bounded, deterministic Laplacian spectrum per rung', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r24-spec' });
    const t = h.measuredSpectrum(0);
    expect(t.nodes).toBeGreaterThan(0);
    expect(t.modes).toBeGreaterThan(0);
    expect(t.lambda.length).toBe(t.modes);
    for (const l of t.lambda) {
      expect(l).toBeGreaterThan(-1e-12);
      expect(l).toBeLessThan(2 + 1e-9);
    }
    expect(t.maxResidual).toBeLessThan(1e-8);

    const h2 = new EngineHost({ profile: 'PICO', seed: 'r24-spec' });
    expect(h2.measuredSpectrum(0).digest).toBe(t.digest);
  });

  it('throws for a rank with no rung', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r24-range' });
    expect(() => h.measuredSpectrum(99)).toThrow(RangeError);
  });
});
