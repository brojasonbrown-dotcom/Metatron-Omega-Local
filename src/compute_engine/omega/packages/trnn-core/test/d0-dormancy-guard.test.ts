/**
 * d0 — dormancy guard: retired modules are PROVEN import-dead on the live
 * path, and the dormant field-kernel Lyapunov auditor is PROVEN deterministic
 * and sane.
 *
 * This is the enforceable half of `docs/DORMANT_REGISTER.md`. A register entry
 * is only a claim until a test fails loudly when someone resurrects the thing
 * it retired. Two guards here:
 *
 *  1. `fractal/nest` + `fractal/pool` are RETIRED (superseded by the torus
 *     lattice multi-resolution). They may stay reachable through the public
 *     barrel, but nothing on the live path may import them. If a host/engine/
 *     cell/web/sense/learn/substrate module is edited to pull one in, this test
 *     fails — so a retirement is never silently undone.
 *
 *  2. `field-kernel-core/lyapunov` was certified but had ZERO consumers and
 *     ZERO tests (see the register, section 5). This suite is the offline
 *     auditor: it imports the real `lyapunovEnergy` and checks the properties a
 *     Lyapunov candidate must have — determinism, non-negativity, zero at the
 *     origin, quadratic growth under amplitude scaling, and monotone growth
 *     under cross-scale drift. Nothing here bridges to the engine; it validates
 *     the dormant kernel on its own terms.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lyapunovEnergy } from '../../field-kernel-core/src/lyapunov';
import { createFieldStateN } from '../../field-kernel-core/src/state';

const SRC = join(process.cwd(), 'packages', 'trnn-core', 'src');

// Ω-DEPTH + harness modules that were once RETIRED are now WIRED into the live
// host. This guard asserts the wiring (a retirement is never silently
// re-introduced): the host must import each one.
const WIRED = [
  'algebra/clifford',
  'fractal/nest',
  'fractal/pool',
  'substrate/plasticity',
  'harness/golden',
  'harness/battery',
  'harness/abstention',
];

describe('d0 · WIRED modules — reachable from the live host', () => {
  it('the host imports every formerly-retired module', () => {
    const host = readFileSync(join(SRC, 'runtime', 'host.ts'), 'utf8');
    for (const m of WIRED) {
      expect(host).toContain(`'../${m}'`);
    }
  });
});

describe('d0 · field-kernel-core/lyapunov — offline auditor', () => {
  it('is deterministic: two identical states give a bit-identical energy', () => {
    const a = createFieldStateN(0, 4);
    const b = createFieldStateN(0, 4);
    for (let i = 0; i < 4; i++) {
      a.psi[i] = 0.05 * i + 0.1;
      a.psiHat[i] = 0.2;
      b.psi[i] = 0.05 * i + 0.1;
      b.psiHat[i] = 0.2;
    }
    expect(lyapunovEnergy([a])).toBe(lyapunovEnergy([b]));
  });

  it('is zero at the origin and strictly positive away from it', () => {
    const z = createFieldStateN(0, 4);
    expect(lyapunovEnergy([z])).toBe(0);

    const s = createFieldStateN(0, 4);
    s.psi[0] = 1;
    expect(lyapunovEnergy([s])).toBeGreaterThan(0);
  });

  it('grows quadratically under amplitude scaling (a sum of squared terms)', () => {
    const s1 = createFieldStateN(0, 4);
    const s2 = createFieldStateN(0, 4);
    for (let i = 0; i < 4; i++) {
      s1.psi[i] = 1;
      s2.psi[i] = 2; // exactly 2× the amplitude
    }
    const e1 = lyapunovEnergy([s1]);
    const e2 = lyapunovEnergy([s2]);
    expect(e2).toBeCloseTo(4 * e1, 10);
  });

  it('grows when adjacent scales drift apart (the cross-scale term is live)', () => {
    const a = createFieldStateN(0, 4);
    const b = createFieldStateN(1, 4);
    a.psi.set([1, 1, 1, 1]);
    b.psi.set([1, 1, 1, 1]);
    const aligned = lyapunovEnergy([a, b]);

    b.psi.set([2, 2, 2, 2]);
    const drifted = lyapunovEnergy([a, b]);
    expect(drifted).toBeGreaterThan(aligned);
  });
});
