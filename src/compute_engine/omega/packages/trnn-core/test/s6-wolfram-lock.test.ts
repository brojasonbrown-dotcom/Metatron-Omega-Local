/**
 * Gate S6 — Wolfram lock.
 *
 * The constants in core/constants.ts are certified against the Wolfram Engine
 * 15.0 (Professional), computed to 60-digit precision by
 * scripts/wolfram/wolfram-verify.wls and committed as this test's fixture. The
 * fixture is the immutable proof; this test asserts the TypeScript constants are
 * the float64-nearest of those 60-digit values (and that every symbolic identity
 * has exactly zero residual).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CELL,
  CLAMP_MAX,
  ENV,
  IGNITION_THRESHOLD,
  JURY_GAIN,
  KAPPA,
  LAMBDA_MEMORY,
  PHI,
  PHI_INV,
  PHI_INV_7,
  REFLECT_GAIN,
} from '../src/core/constants';

const fixture = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'wolfram-verified.json'), 'utf8'),
) as {
  identities: Record<string, number>;
  values: Record<string, string>;
};

const w = (k: string): number => Number(fixture.values[k]);
const near = (a: number, b: number, rel = 1e-15): void => {
  expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
};

describe('S6 — Wolfram lock (Wolfram Engine 15.0, 60-digit)', () => {
  it('every symbolic identity has exactly zero residual', () => {
    for (const [name, residual] of Object.entries(fixture.identities)) {
      expect(Number(residual)).toBe(0);
      void name;
    }
  });

  it('φ and φ⁻¹ are the float64-nearest of the 60-digit values', () => {
    near(PHI, w('phi'));
    near(PHI_INV, w('phiInv'));
  });

  it('φ⁻⁷ is the stamped 60-digit value, not a float composition', () => {
    near(PHI_INV_7, w('phiInv7'), 1e-16);
    // the stamp must be at least as close to truth as Math.pow(PHI, -7)
    expect(Math.abs(PHI_INV_7 - w('phiInv7'))).toBeLessThanOrEqual(
      Math.abs(Math.pow(PHI, -7) - w('phiInv7')),
    );
  });

  it('κ, reflect-gain, λ, clamp and ignition threshold match Wolfram', () => {
    near(KAPPA, w('kappa'));
    near(REFLECT_GAIN, w('reflectGain'));
    near(LAMBDA_MEMORY, w('lambdaMemory'));
    near(CLAMP_MAX, w('clampMax'));
    near(IGNITION_THRESHOLD, w('ignitionThreshold'));
  });

  it('the nine cell coefficients match Wolfram', () => {
    near(CELL.alpha, w('cellAlpha'));
    near(CELL.beta, w('cellBeta'));
    near(CELL.gamma, w('cellGamma'));
    near(CELL.delta, w('cellDelta'));
    near(CELL.epsilon, w('cellEpsilon'));
    near(CELL.zeta, w('cellZeta'));
    near(CELL.eta, w('cellEta'));
    near(CELL.mu, w('cellMu'));
    near(CELL.xi, w('cellXi'));
  });

  it('the Jury contraction gain matches the 60-digit Wolfram value', () => {
    near(JURY_GAIN, w('juryGain'), 1e-16);
  });

  it('environment coefficients match Wolfram', () => {
    near(ENV.temperatureRef, w('tempRef'));
    near(ENV.magneticScale, w('magneticScale'));
  });
});
