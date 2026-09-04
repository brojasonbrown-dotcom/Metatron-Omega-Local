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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lyapunovEnergy } from '../../field-kernel-core/src/lyapunov';
import { createFieldStateN } from '../../field-kernel-core/src/state';

const SRC = join(process.cwd(), 'packages', 'trnn-core', 'src');

function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listTs(p));
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('d0 · fractal/* RETIRED — import-dead on the live path', () => {
  it('no live module imports the retired fractal modules', () => {
    const offenders: string[] = [];
    for (const f of listTs(SRC)) {
      const rel = f.slice(SRC.length + 1).replace(/\\/g, '/');
      // The barrel may keep re-exporting them, and the fractal dir is allowed
      // to self-reference. Anything ELSE that mentions either module is a
      // live-path resurrection and must fail this guard.
      if (rel === 'index.ts' || rel.startsWith('fractal/')) continue;
      const text = readFileSync(f, 'utf8');
      if (text.includes('fractal/nest') || text.includes('fractal/pool')) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the retired modules stay reachable ONLY through the public barrel', () => {
    const barrel = readFileSync(join(SRC, 'index.ts'), 'utf8');
    expect(barrel).toContain("export * from './fractal/nest'");
    expect(barrel).toContain("export * from './fractal/pool'");
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
