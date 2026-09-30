/**
 * d1 — exact φ-precision layer + deep-memory tier (Ω-REAL deep-precision).
 *
 * Pins that φ-powers are represented EXACTLY in Z[φ] (BigInt Fibonacci), that
 * deep modes survive beyond the float64 ULP (where f64 collapses), and that the
 * deep-memory tier stores only deep modes weighted by resonance × depth — the
 * same law as the cross-section write path. No mock: every assertion is an
 * exact integer identity or a real store/recall round-trip.
 */
import { describe, expect, it } from 'vitest';
import { fibBig } from '../src/core/fibonacci';
import {
  PHI_F64_MODE_CEILING,
  phiExactToF64,
  phiModeSurvivesF64,
  phiMulExact,
  phiPowExact,
  precisionCeiling,
  requiredDigits,
  validateModeCount,
} from '../src/memory/phiExact';
import { DeepMemory } from '../src/memory/deepMemory';
import { resonanceIndex } from '../src/measure/resonanceIndex';
import { randomHv } from '../src/substrate/vsa';

const PHI = 1.6180339887498949;

describe('D1 · exact φ-precision layer (phiExact)', () => {
  it('represents φ^k exactly in Z[φ] for small k', () => {
    expect(phiPowExact(0)).toEqual({ a: 0n, b: 1n });
    expect(phiPowExact(1)).toEqual({ a: 1n, b: 0n });
    expect(phiPowExact(2)).toEqual({ a: 1n, b: 1n });
    expect(phiPowExact(3)).toEqual({ a: 2n, b: 1n });
    expect(phiPowExact(4)).toEqual({ a: 3n, b: 2n });
    expect(phiPowExact(5)).toEqual({ a: 5n, b: 3n });
    expect(phiPowExact(-1)).toEqual({ a: 1n, b: -1n });
    expect(phiPowExact(-2)).toEqual({ a: -1n, b: 2n });
    expect(phiPowExact(-3)).toEqual({ a: 2n, b: -3n });
    expect(phiPowExact(-4)).toEqual({ a: -3n, b: 5n });
    expect(phiPowExact(-5)).toEqual({ a: 5n, b: -8n });
  });

  it('represents deep φ-modes exactly via BigInt (f64 collapses, Z[φ] does not)', () => {
    expect(phiPowExact(100)).toEqual({ a: fibBig(100), b: fibBig(99) });
    expect(phiPowExact(-100)).toEqual({ a: -fibBig(100), b: fibBig(101) });
    expect(phiPowExact(233)).toEqual({ a: fibBig(233), b: fibBig(232) });
    // φ^-100 ≈ 1.2e-21 is below the f64 ULP, yet the Z[φ] form is lossless.
  });

  it('φ^k × φ^-k = 1 exactly in Z[φ]', () => {
    for (const k of [1, 2, 3, 7, 13, 55, 100, 233, 610]) {
      expect(phiMulExact(phiPowExact(k), phiPowExact(-k))).toEqual({ a: 0n, b: 1n });
    }
  });

  it('f64 conversion is exact for shallow modes and the ceiling is honest', () => {
    for (let k = -20; k <= 20; k++) {
      const rel = Math.abs(phiExactToF64(phiPowExact(k)) - Math.pow(PHI, k)) / Math.max(1, Math.abs(Math.pow(PHI, k)));
      expect(rel).toBeLessThan(1e-12);
    }
    expect(PHI_F64_MODE_CEILING).toBe(76);
    expect(phiModeSurvivesF64(76)).toBe(true);
    expect(phiModeSurvivesF64(77)).toBe(false);
  });

  it('requiredDigits matches the V11 formula exactly', () => {
    expect(requiredDigits(78)).toBe(Math.ceil(0.2089876402499087 * 78) + 16);
    expect(requiredDigits(233)).toBe(Math.ceil(0.2089876402499087 * 233) + 16);
    expect(requiredDigits(610)).toBe(144); // ⌈127.48⌉ + 16 = 128 + 16
    expect(requiredDigits(0)).toBe(16);
  });

  it('precisionCeiling inverts requiredDigits, and validateModeCount refuses honestly', () => {
    expect(precisionCeiling(16)).toBe(1); // the +16 margin eats the whole budget
    expect(precisionCeiling(50)).toBe(162); // ⌊(50−16)/0.20899⌋ = 162
    expect(precisionCeiling(500)).toBe(2315); // ⌊(500−16)/0.20899⌋ = 2315
    // validateModeCount uses the conservative requiredDigits (fixed-point 'bd'):
    expect(validateModeCount(100, 50).ok).toBe(true); // requiredDigits(100)=37 ≤ 50
    expect(validateModeCount(100, 50).requiredDigits).toBe(37);
    expect(validateModeCount(100, 16).ok).toBe(false); // 37 > 16 → refused
    expect(validateModeCount(200, 50).ok).toBe(false); // requiredDigits(200)=58 > 50
  });
});

describe('D1 · deep-memory tier (cross-wired with resonance × depth)', () => {
  const res = () => resonanceIndex({ coherence: 0.9, salience: 0.8, margin: 0.7 });
  const depth = { value: 0.6, infoDensity: 0, scaleEngagement: 0, closure: 0, novelty: 0, gated: false, dead: false } as const;

  it('stores only deep modes, weighted by resonance × depth', () => {
    const dm = new DeepMemory({ dim: 256, capacity: 3 });
    const ok = dm.store('deep:1', randomHv(256, 'd1'), res(), depth, [5, 100, 150]);
    expect(ok).toBe(true);
    expect(dm.size).toBe(1);
    const modes = dm.strongestDeepModes();
    expect(modes.map((m) => m.k)).toEqual([100, 150]); // shallow 5 is dropped
    expect(modes[0].amp).toEqual({ a: -fibBig(100), b: fibBig(101) });
  });

  it('refuses a shallow-only pattern (nothing deep to store)', () => {
    const dm = new DeepMemory({ dim: 256 });
    expect(dm.store('shallow', randomHv(256, 's'), res(), depth, [1, 2, 3])).toBe(false);
    expect(dm.size).toBe(0);
  });

  it('refuses a gated (non-resonant) pattern', () => {
    const dm = new DeepMemory({ dim: 256 });
    const gated = resonanceIndex({ coherence: 0.2, salience: 0.8, margin: 0.7 }); // C < φ⁻² ⇒ gated
    expect(dm.store('gated', randomHv(256, 'g'), gated, depth, [100])).toBe(false);
    expect(dm.size).toBe(0);
  });

  it('recalls the nearest deep pattern', () => {
    const dm = new DeepMemory({ dim: 256, capacity: 10 });
    const hv1 = randomHv(256, 'a');
    const hv2 = randomHv(256, 'b');
    dm.store('a', hv1, res(), depth, [100]);
    dm.store('b', hv2, res(), depth, [101]);
    expect(dm.recall(hv1)?.label).toBe('a');
  });
});
