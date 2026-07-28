/**
 * FILE 10 acceptance tests — dynamics/propagation.ts
 *
 * Every assertion targets a DERIVED LAW (golden rule B12):
 *   1. CFL boundary of the modified-equation leapfrog is EXACTLY ν* = 3/2
 *      (von Neumann: |g|≤1 ⇔ s≤12 with stencil max 16/3) — razor-tested on
 *      both sides: 0.999·ν* stable, 1.001·ν* diverges (contract: "CFL
 *      boundary stable/unstable as predicted").
 *   2. ν = 1.0 (the operating limit) is strictly inside the stable region —
 *      bounded over 2·10⁴ Nyquist-seeded steps ("CFL exactly 1.0 stable").
 *   3. Convergence order ≈ 4 (±0.1) at FIXED Courant on a smooth multi-mode
 *      pulse — the contract's headline test vector.
 *   4. Inverse-square law EMERGES from geometry (radial w = r·u experiment):
 *      amplitude exponent ≈ −1, intensity exponent ≈ −2. Nothing inserted.
 *   5. Energy bounded & decaying for the damped case (γ > 0).
 *   6. vWave is injected; defaults to the rung's canonical c·φ⁻ⁿᐟ² (B2).
 *   7. Foolproof guards: CFL-violating steps unrepresentable via step();
 *      malformed fields rejected.
 */

import { describe, expect, it } from "vitest";
import { METATRON_SHELL } from "../src/core/constants.js";
import { getScale } from "../src/core/scaleTable.js";
import {
    CFL_LIMIT,
    CFL_STABILITY_BOUNDARY,
    MIN_NODES,
    Propagator,
} from "../src/dynamics/propagation.js";

const scale13 = getScale(METATRON_SHELL);

/** A scale-free propagator (v = 1) for the pure-numerics experiments. */
const unit = () => new Propagator(scale13, 1);

/** Drive `steps` leapfrog updates through the raw (unguarded) kernel. */
function iterate(
  p: Propagator,
  present: number[],
  past: number[],
  dx: number,
  dt: number,
  steps: number,
  gamma = 0,
): { present: number[]; past: number[]; maxAbs: number; blewUp: boolean } {
  let maxAbs = 0;
  for (let k = 0; k < steps; k++) {
    const next = p.stepRaw(present, past, dx, dt, gamma);
    past = present;
    present = next;
    let m = 0;
    for (const x of present) m = Math.max(m, Math.abs(x));
    maxAbs = Math.max(maxAbs, m);
    if (m > 1e6) return { present, past, maxAbs, blewUp: true };
  }
  return { present, past, maxAbs, blewUp: false };
}

/** Nyquist-seeded standing wave — the worst-case stability probe. */
const nyquistSeed = (N: number, dx: number): number[] =>
  Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i * dx) + 1e-8 * (i % 2 ? 1 : -1));

describe("File 10 · CFL stability boundary (exact ν* = 3/2, razor-tested)", () => {
  it("the boundary constant is derived, and equals 3/2 exactly", () => {
    // ν* = √(12·(3/16)) — the von Neumann bound with the order-4 stencil max.
    expect(CFL_STABILITY_BOUNDARY).toBe(Math.sqrt((12 * 3) / 16));
    expect(CFL_STABILITY_BOUNDARY).toBe(1.5);
    // and the operating limit sits strictly inside it
    expect(CFL_LIMIT).toBeLessThan(CFL_STABILITY_BOUNDARY);
  });

  it("ν = 0.999·ν* is stable over 2·10⁴ Nyquist-seeded steps", () => {
    const N = 64;
    const dx = 1 / N;
    const dt = 0.999 * CFL_STABILITY_BOUNDARY * dx;
    const seed = nyquistSeed(N, dx);
    const r = iterate(unit(), [...seed], [...seed], dx, dt, 20_000);
    expect(r.blewUp).toBe(false);
    expect(r.maxAbs).toBeLessThan(10);
  });

  it("ν = 1.001·ν* diverges (unstable exactly as predicted)", () => {
    const N = 64;
    const dx = 1 / N;
    const dt = 1.001 * CFL_STABILITY_BOUNDARY * dx;
    const seed = nyquistSeed(N, dx);
    const r = iterate(unit(), [...seed], [...seed], dx, dt, 20_000);
    expect(r.blewUp).toBe(true);
  });

  it("CFL exactly 1.0 is stable (contract clause) — 2·10⁴ steps, bounded", () => {
    const N = 64;
    const dx = 1 / N;
    const dt = 1.0 * dx; // ν = 1.0 with v = 1
    const seed = nyquistSeed(N, dx);
    const r = iterate(unit(), [...seed], [...seed], dx, dt, 20_000);
    expect(r.blewUp).toBe(false);
    // undamped: amplitude neither grows (stability) nor collapses (conservation)
    expect(r.maxAbs).toBeLessThan(1.1);
    let finalMax = 0;
    for (const x of r.present) finalMax = Math.max(finalMax, Math.abs(x));
    expect(finalMax).toBeGreaterThan(0.1);
  });
});

describe("File 10 · convergence order ≈ 4 (±0.1) on a smooth pulse", () => {
  it("order measured across N = 32→64→128→256 at fixed Courant ν = 0.5", () => {
    const vf = unit();
    const nu = 0.5;
    const T = 0.4;
    const f = (x: number): number => Math.exp(Math.cos(2 * Math.PI * x)); // smooth, multi-mode
    const errs: number[] = [];
    for (const N of [32, 64, 128, 256]) {
      const dx = 1 / N;
      const steps = Math.round(T / (nu * dx));
      const dt = T / steps;
      // exact traveling solution u(x,t) = f(x − vt), v = 1
      let past = Array.from({ length: N }, (_, i) => f(i * dx + dt));
      let present = Array.from({ length: N }, (_, i) => f(i * dx));
      for (let k = 0; k < steps; k++) {
        const next = vf.step(present, past, dx, dt);
        past = present;
        present = next;
      }
      let err = 0;
      for (let i = 0; i < N; i++) err = Math.max(err, Math.abs((present[i] as number) - f(i * dx - T)));
      errs.push(err);
    }
    // successive refinement halves dx: order = log2(err_coarse/err_fine) ≈ 4
    for (let i = 1; i < errs.length; i++) {
      const order = Math.log2((errs[i - 1] as number) / (errs[i] as number));
      expect(order).toBeGreaterThan(3.9);
      expect(order).toBeLessThan(4.1);
    }
  });

  it("the order-4 Laplacian converges at 4th order on sin(2πx)", () => {
    const p = unit();
    const errAt = (N: number): number => {
      const dx = 1 / N;
      const u = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i * dx));
      const lap = p.laplacian4(u, dx);
      const k2 = (2 * Math.PI) ** 2;
      let err = 0;
      for (let i = 0; i < N; i++) err = Math.max(err, Math.abs((lap[i] as number) + k2 * (u[i] as number)));
      return err;
    };
    const e32 = errAt(32);
    const e64 = errAt(64);
    const order = Math.log2(e32 / e64);
    expect(order).toBeGreaterThan(3.9);
    expect(order).toBeLessThan(4.1);
  });

  it("the Laplacian of a constant field is exactly zero", () => {
    const p = unit();
    const lap = p.laplacian4(new Array(16).fill(2.5), 0.1);
    for (const x of lap) expect(x).toBe(0);
  });
});

describe("File 10 · inverse-square law is EMERGENT (radial experiment)", () => {
  it("wavefront amplitude falls as r⁻¹ ⇒ intensity as r⁻² (nothing inserted)", () => {
    const r = unit().inverseSquareEmergent();
    expect(r.amplitudeExponent).toBeCloseTo(-1, 2); // measured −0.99975 in pre-audit
    expect(r.intensityExponent).toBeCloseTo(-2, 2);
    expect(r.samples.length).toBeGreaterThanOrEqual(4);
    // amplitudes strictly decreasing with radius — the physical sanity check
    for (let i = 1; i < r.samples.length; i++) {
      expect((r.samples[i] as readonly [number, number])[1]).toBeLessThan(
        (r.samples[i - 1] as readonly [number, number])[1],
      );
    }
  });
});

describe("File 10 · damped case: energy bounded and decaying", () => {
  it("γ > 0 ⇒ discrete energy decays monotonically across checkpoints", () => {
    const p = unit();
    const N = 64;
    const dx = 1 / N;
    const dt = 0.4 * dx;
    const gamma = 0.5;
    let past = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * i * dx));
    let present = [...past];
    const energy = (pr: number[], pa: number[]): number => {
      let e = 0;
      for (let i = 0; i < N; i++) {
        const ut = ((pr[i] as number) - (pa[i] as number)) / dt;
        const ux = ((pr[(i + 1) % N] as number) - (pr[i] as number)) / dx;
        e += ut * ut + ux * ux;
      }
      return e * dx;
    };
    const checkpoints: number[] = [];
    for (let k = 0; k < 4000; k++) {
      const next = p.step(present, past, dx, dt, gamma);
      past = present;
      present = next;
      if (k % 1000 === 999) checkpoints.push(energy(present, past));
    }
    const e0 = energy(present, past);
    expect(Number.isFinite(e0)).toBe(true);
    for (let i = 1; i < checkpoints.length; i++) {
      expect(checkpoints[i] as number).toBeLessThan(checkpoints[i - 1] as number);
    }
  });
});

describe("File 10 · vWave injection (B2 discipline)", () => {
  it("defaults to the rung's canonical ladder speed c·φ⁻ⁿᐟ²", () => {
    const p = new Propagator(scale13);
    expect(p.vWave).toBeCloseTo(scale13.vWave.toFloat64(), 9);
    // golden anchor (spec §2): v_wave(13) = 1.31341219×10⁷ m/s
    expect(p.vWave / 1.31341219e7).toBeCloseTo(1, 6);
  });

  it("an injected medium speed replaces the default without touching the kernel", () => {
    const p = new Propagator(scale13, 42);
    expect(p.vWave).toBe(42);
    expect(p.courant(1, 0.01)).toBeCloseTo(0.42, 12);
  });
});

describe("File 10 · foolproof-by-construction guards", () => {
  it("step() rejects CFL-violating dt (the unstable regime is unrepresentable)", () => {
    const p = unit();
    const N = 16;
    const u = new Array(N).fill(0);
    expect(() => p.step(u, u, 1 / N, 1.5 / N)).toThrow(RangeError);
    // and cflSatisfied reports the same boundary
    expect(p.cflSatisfied(1 / N, 1 / N)).toBe(true);
    expect(p.cflSatisfied(1 / N, 1.0001 / N)).toBe(false);
  });

  it("rejects non-positive vWave, mismatched fields, tiny rings, non-finite values", () => {
    expect(() => new Propagator(scale13, 0)).toThrow(RangeError);
    expect(() => new Propagator(scale13, -1)).toThrow(RangeError);
    const p = unit();
    expect(() => p.stepRaw([1, 2, 3, 4, 5], [1, 2, 3, 4], 0.1, 0.01)).toThrow(RangeError);
    expect(() => p.stepRaw([1, 2, 3, 4], [1, 2, 3, 4], 0.1, 0.01)).toThrow(RangeError);
    expect(() => p.stepRaw([1, 2, Number.NaN, 4, 5], [1, 2, 3, 4, 5], 0.1, 0.01)).toThrow(RangeError);
    expect(() => p.stepRaw([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], 0.1, 0.01, -0.1)).toThrow(RangeError);
    expect(MIN_NODES).toBe(5);
  });

  it("step is pure: fresh output, inputs unmutated", () => {
    const p = unit();
    const N = 8;
    const present = Array.from({ length: N }, (_, i) => Math.cos(i));
    const past = Array.from({ length: N }, (_, i) => Math.sin(i));
    const snapP = [...present];
    const snapQ = [...past];
    const out = p.step(present, past, 1 / N, 0.5 / N);
    expect(out).not.toBe(present);
    expect(out).not.toBe(past);
    expect(present).toEqual(snapP);
    expect(past).toEqual(snapQ);
  });
});
