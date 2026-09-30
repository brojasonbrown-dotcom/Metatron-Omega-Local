import { describe, expect, it } from 'vitest';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { EngineHost } from '../src/runtime/host';
import { PHI_INV } from '../src/core/constants';
import { buildWindow } from '../src/core/window';

const TICKS = 64;

describe('R28 — uniform magnetic phase bend (modePhase) through the host', () => {
  it('forwards a uniform modePhase to every rung when no window is supplied', () => {
    const e = new MultiTorusEngine({ nodes: 89, seed: 'r28', modes: 13, modePhase: 0.5 });
    expect(e.engines.every((r) => r.modePhase === 0.5)).toBe(true);
  });

  it('defaults to an exact 2πφ⁻¹ rotation (zero bend) when absent', () => {
    const e = new MultiTorusEngine({ nodes: 89, seed: 'r28-z', modes: 13 });
    expect(e.engines.every((r) => r.modePhase === 0)).toBe(true);
  });

  it('bends the host ladder rotation without breaking determinism', () => {
    const a = new EngineHost({ profile: 'PICO', seed: 'r28-host', modePhase: 0 });
    const b = new EngineHost({ profile: 'PICO', seed: 'r28-host', modePhase: PHI_INV });
    for (let i = 0; i < TICKS; i++) {
      a.stepOnce();
      b.stepOnce();
    }
    const sa = a.snapshot();
    const sb = b.snapshot();
    // Same seed, different bend → different digest (the rotation genuinely bent).
    expect(sa.digest).not.toBe(sb.digest);
    // Both remain finite and coherent (the bend is not a destabilising knob).
    expect(sa.finite).toBe(true);
    expect(sb.finite).toBe(true);
  });

  it('refuses a modePhase when a window owns the per-rung phase', () => {
    const w = buildWindow(0, { count: 6 });
    expect(() => new MultiTorusEngine({ window: w, modePhase: 0.1 })).toThrow(/window owns B/);
  });
});
