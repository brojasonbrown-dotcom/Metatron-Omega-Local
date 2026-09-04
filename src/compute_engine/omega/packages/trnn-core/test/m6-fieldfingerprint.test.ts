/**
 * m6 — Ω-REAL field-fingerprint battery (Layer B hardening).
 *
 * Pins that `fieldFingerprint` is a usable multi-scale invariant, not a bag of
 * numbers. It must be:
 *   • deterministic — identical seed+drive ⇒ distance exactly 0;
 *   • seed-invariant — same drive, different internal seed ⇒ the invariant is a
 *     function of the FIELD (drive), not the init, so distance stays tiny;
 *   • Lipschitz-stable — a small drive perturbation moves it little;
 *   • sensitive — a real change of input (drive) moves it a lot;
 *   • monotone in drive — larger input change ⇒ larger distance;
 *   • separable — sensitivity sits far above stability, leaving a clean
 *     threshold band for "same field" vs "different field".
 *
 * Thresholds are measured values × a safety margin (see m6 calibration in the
 * record), not guesses — the 10× gap is the honest signal that the fingerprint
 * resolves fields.
 */

import { describe, expect, it } from 'vitest';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { DENSE_CORE } from '../src/core/scaleLadder';
import { FINGERPRINT_CHANNELS, fieldFingerprint, fingerprintDistance } from '../src/measure/fieldFingerprint';

const RUNGS = DENSE_CORE.slice(0, 8);
const TICKS = 50;

function run(seed: string, drive: number): Float64Array {
  const eng = new MultiTorusEngine({ rungs: RUNGS, nodes: 21, seed, drive });
  eng.run(TICKS);
  return fieldFingerprint(eng).vector;
}

describe('M6 · field fingerprint (φ-anchored multi-scale invariant)', () => {
  it('is unit-normalised and spans rungs × channels', () => {
    const eng = new MultiTorusEngine({ rungs: RUNGS, nodes: 21, seed: 'm6-shape', drive: 0.5 });
    eng.run(TICKS);
    const fp = fieldFingerprint(eng);
    expect(fp.rungs).toBe(RUNGS.length);
    expect(fp.vector.length).toBe(RUNGS.length * FINGERPRINT_CHANNELS);
    let s2 = 0;
    for (const x of fp.vector) s2 += x * x;
    expect(Math.sqrt(s2)).toBeCloseTo(1, 10);
    expect(Number.isFinite(fp.magnitude)).toBe(true);
  });

  it('is deterministic: identical seed+drive ⇒ distance exactly 0', () => {
    const a = run('m6-det', 0.5);
    const b = run('m6-det', 0.5);
    expect(fingerprintDistance(a, b)).toBe(0);
  });

  it('is seed-invariant: the fingerprint reads the field, not the init', () => {
    // measured ~0.00045 → threshold 0.01 is a 20× margin
    const a = run('m6-seed-a', 0.5);
    const b = run('m6-seed-b', 0.5);
    expect(fingerprintDistance(a, b)).toBeLessThan(0.01);
  });

  it('is Lipschitz-stable under a small drive perturbation', () => {
    // measured ~0.020 at Δdrive 0.01 → threshold 0.05 is a 2.5× margin
    const a = run('m6-stab', 0.5);
    const b = run('m6-stab', 0.51);
    expect(fingerprintDistance(a, b)).toBeLessThan(0.05);
  });

  it('is sensitive to a real input change (drive)', () => {
    // measured ~0.201 at Δdrive 0.1 → threshold 0.1 is a 2× margin
    const a = run('m6-sens', 0.5);
    const b = run('m6-sens', 0.6);
    expect(fingerprintDistance(a, b)).toBeGreaterThan(0.1);
  });

  it('is monotone in drive', () => {
    const base = run('m6-mono', 0.5);
    const d51 = fingerprintDistance(base, run('m6-mono', 0.51));
    const d60 = fingerprintDistance(base, run('m6-mono', 0.6));
    const d80 = fingerprintDistance(base, run('m6-mono', 0.8));
    expect(d51).toBeLessThan(d60);
    expect(d60).toBeLessThan(d80);
  });

  it('separates stability from sensitivity with a clean margin', () => {
    const base = run('m6-sep', 0.5);
    const stab = fingerprintDistance(base, run('m6-sep', 0.51));
    const sens = fingerprintDistance(base, run('m6-sep', 0.6));
    expect(sens).toBeGreaterThan(5 * stab); // measured ≈ 10×; 5× is the floor
  });
});
