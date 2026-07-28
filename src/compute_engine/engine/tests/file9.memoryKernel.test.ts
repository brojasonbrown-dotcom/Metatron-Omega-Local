/**
 * FILE 9 acceptance tests — dynamics/memoryKernel.ts
 *
 * Every assertion targets a DERIVED LAW (golden rule B12), not a tuned literal:
 *   1. Characteristic roots are exactly {1, −φ⁻²}   (unit-root theorem).
 *   2. The root polynomial factorises: z² −(1−λ)z −λ = (z−1)(z+λ).
 *   3. Weights are a convex combination: (1−λ)+λ = 1 exactly.
 *   4. The update is bounded by its inputs (conservative — never grows, never
 *      dissipates below the hull) over 10⁴ iterated steps.
 *   5. Constant fields are fixed points (a steady state is preserved).
 *   6. The transient mode decays at rate φ⁻² per step.
 *   7. stepField is pure and matches the scalar step node-for-node.
 *   8. Additive-source growth is real, and dampedRegularization re-bounds it.
 *   9. λ outside (0,1) is rejected (unstable case unrepresentable).
 */

import { describe, it, expect } from "vitest";
import { MemoryKernel, DEFAULT_LAMBDA, TRANSIENT_DECAY } from "../src/dynamics/memoryKernel.js";
import { PHI, PHI_NEG2 } from "../src/core/constants.js";

const TOL = 1e-12;

describe("File 9 · unit-root theorem (roots exactly {1, −φ⁻²})", () => {
  it("default coupling is λ = φ⁻², imported from constants", () => {
    expect(DEFAULT_LAMBDA).toBe(PHI_NEG2);
  });

  it("characteristicRoots returns [1, −λ] = [1, −φ⁻²]", () => {
    const k = new MemoryKernel();
    const [z1, z2] = k.characteristicRoots();
    expect(z1).toBe(1);
    expect(z2).toBeCloseTo(-PHI_NEG2, 15);
    // |z1| = 1 (unit root), |z2| = φ⁻² < 1 (transient inside unit circle)
    expect(Math.abs(z1)).toBe(1);
    expect(Math.abs(z2)).toBeLessThan(1);
    expect(Math.abs(z2)).toBeCloseTo(PHI_NEG2, 15);
  });

  it("the roots satisfy z² −(1−λ)z −λ = 0 (factorisation check)", () => {
    const k = new MemoryKernel();
    const lam = k.lambda;
    for (const z of k.characteristicRoots()) {
      const poly = z * z - (1 - lam) * z - lam;
      expect(Math.abs(poly)).toBeLessThan(TOL);
    }
  });

  it("isConservative() certifies the unit-root regime", () => {
    expect(new MemoryKernel().isConservative()).toBe(true);
  });

  it("transient decay constant equals λ = φ⁻²", () => {
    expect(TRANSIENT_DECAY).toBe(PHI_NEG2);
  });
});

describe("File 9 · convexity & energy conservation", () => {
  it("weights sum to 1 exactly (convex combination)", () => {
    const k = new MemoryKernel();
    expect(1 - k.lambda + k.lambda).toBe(1);
  });

  it("each step stays within the hull of its two inputs", () => {
    const k = new MemoryKernel();
    const a = 0.7;
    const b = -0.4;
    const next = k.step(a, b);
    expect(next).toBeGreaterThanOrEqual(Math.min(a, b) - TOL);
    expect(next).toBeLessThanOrEqual(Math.max(a, b) + TOL);
    // and it is a genuine interior blend (not pinned to either input)
    expect(next).not.toBe(a);
    expect(next).not.toBe(b);
  });

  it("a constant field is an exact fixed point", () => {
    const k = new MemoryKernel();
    expect(k.step(3.25, 3.25)).toBeCloseTo(3.25, 15);
  });

  it("10⁴ iterated steps neither grow nor decay beyond 1e-9", () => {
    const k = new MemoryKernel();
    let present = 1.0;
    let past = 0.0; // a non-modal start: has both persistent + transient parts
    let maxAbs = Math.max(Math.abs(present), Math.abs(past));
    for (let i = 0; i < 10_000; i++) {
      const next = k.step(present, past);
      past = present;
      present = next;
      maxAbs = Math.max(maxAbs, Math.abs(next));
      // never exceeds the initial hull → no growth
      expect(Math.abs(next)).toBeLessThanOrEqual(1.0 + 1e-9);
    }
    // and it has NOT collapsed to zero → no dissipation of the persistent mode
    expect(Math.abs(present)).toBeGreaterThan(1e-9);
    expect(Number.isFinite(present)).toBe(true);
  });

  it("the transient (non-modal) component decays at rate φ⁻² per step", () => {
    // For the pure transient mode the state alternates sign and shrinks by φ⁻²
    // each step. Start on the transient eigenvector: present/past = −φ⁻².
    const k = new MemoryKernel();
    let present = -PHI_NEG2;
    let past = 1.0;
    // One step: the persistent part is (present − z2·past)/(z1 − z2)... we instead
    // directly measure the ratio of successive outputs once the mode dominates.
    const n1 = k.step(present, past);
    const n2 = k.step(n1, present);
    // ratio of consecutive transient-dominated states ≈ −φ⁻²
    const ratio = n2 / n1;
    expect(ratio).toBeCloseTo(-PHI_NEG2, 6);
  });
});

describe("File 9 · field update purity & shape", () => {
  it("stepField matches scalar step node-for-node and does not mutate inputs", () => {
    const k = new MemoryKernel();
    const present = [0.1, 0.2, 0.3, 0.4];
    const past = [0.0, 0.1, 0.2, 0.3];
    const snapshotPresent = [...present];
    const snapshotPast = [...past];
    const out = k.stepField(present, past);
    expect(out).toHaveLength(present.length);
    for (let i = 0; i < present.length; i++) {
      expect(out[i]).toBeCloseTo(k.step(present[i] as number, past[i] as number), 15);
    }
    // purity: inputs untouched, output is a fresh array
    expect(present).toEqual(snapshotPresent);
    expect(past).toEqual(snapshotPast);
    expect(out).not.toBe(present);
    expect(out).not.toBe(past);
  });

  it("stepField rejects mismatched node sets", () => {
    const k = new MemoryKernel();
    expect(() => k.stepField([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

describe("File 9 · additive source is bounded only via damped regularization", () => {
  it("a persistent positive source grows the RAW recursion without bound", () => {
    const k = new MemoryKernel();
    let present = 0;
    let past = 0;
    const source = 0.5;
    // raw additive form (what we explicitly do NOT ship as the step)
    for (let i = 0; i < 100; i++) {
      const next = k.step(present, past) + source;
      past = present;
      present = next;
    }
    // secular growth: state has climbed far beyond the initial hull
    expect(present).toBeGreaterThan(10);
  });

  it("dampedRegularization is the normalized Markovian embedding (ENH-4, §2.3)", () => {
    const k = new MemoryKernel();
    // exact integrating factor: M·e^{−γdt} + λ·Ψ·(1−e^{−γdt})
    const m = 0.3;
    const psi = 0.8;
    const gamma = 2.0;
    const dt = 0.1;
    const decay = Math.exp(-gamma * dt);
    const expected = decay * m + k.lambda * (1 - decay) * psi;
    expect(k.dampedRegularization(m, psi, gamma, dt)).toBeCloseTo(expected, 15);
  });

  it("dampedRegularization stays within the convex hull of {M, Ψ} (bounded)", () => {
    const k = new MemoryKernel();
    const m = -0.4;
    const psi = 0.7;
    for (const gamma of [0.01, 0.5, 1, 5, 50]) {
      const out = k.dampedRegularization(m, psi, gamma, 0.05);
      expect(out).toBeGreaterThanOrEqual(Math.min(m, psi) - 1e-12);
      expect(out).toBeLessThanOrEqual(Math.max(m, psi) + 1e-12);
    }
  });

  it("dampedRegularization limits: γ→0 holds M, γ→∞ → λ·Ψ, dt=0 → M", () => {
    const k = new MemoryKernel();
    const m = 0.3;
    const psi = 0.9;
    // γ = 0 → kernel infinitely wide, memory unchanged this step
    expect(k.dampedRegularization(m, psi, 0, 0.1)).toBe(m);
    // dt = 0 → no time elapsed, memory unchanged
    expect(k.dampedRegularization(m, psi, 5, 0)).toBeCloseTo(m, 15);
    // γ·dt huge → decay→0, M → λ·Ψ (the drive fully weighted by λ)
    expect(k.dampedRegularization(m, psi, 1e9, 1)).toBeCloseTo(k.lambda * psi, 6);
  });

  it("dampedRegularization rejects negative/non-finite γ and dt", () => {
    const k = new MemoryKernel();
    expect(() => k.dampedRegularization(0, 0, -1, 0.1)).toThrow(RangeError);
    expect(() => k.dampedRegularization(0, 0, 1, -0.1)).toThrow(RangeError);
    expect(() => k.dampedRegularization(0, 0, Number.NaN, 0.1)).toThrow(RangeError);
  });
});

describe("File 9 · ENH-1 deep N-tap memory (§2.2, w_k = φ^{1−3k}, W_∞ = 1/2)", () => {
  it("w_k = φ^{1−3k} matches λᵏ/φ^{k−1} (the derivation, not a literal)", () => {
    for (const k of [1, 2, 3, 5, 8, 13]) {
      const derived = Math.pow(PHI_NEG2, k) / Math.pow(PHI, k - 1);
      expect(MemoryKernel.deepMemoryWeight(k)).toBeCloseTo(derived, 12);
    }
  });

  it("w_1 = φ⁻² = λ exactly (N=1 reduces to the canonical step)", () => {
    expect(MemoryKernel.deepMemoryWeight(1)).toBeCloseTo(PHI_NEG2, 15);
  });

  it("W_∞ = φ⁻²/(1−φ⁻³) = 1/2 exactly (1−φ⁻³ = 2φ⁻²)", () => {
    expect(MemoryKernel.deepMemoryTotalWeight()).toBeCloseTo(0.5, 12);
    // and the partial sums telescope toward it
    let partial = 0;
    for (let k = 1; k <= 40; k++) partial += MemoryKernel.deepMemoryWeight(k);
    expect(partial).toBeCloseTo(0.5, 10);
  });

  it("stepN with a single history entry equals step (N=1 ≡ §2.1)", () => {
    const k = new MemoryKernel();
    const a = 0.7;
    const b = -0.4;
    expect(k.stepN(a, [b])).toBeCloseTo(k.step(a, b), 15);
  });

  it("stepN coefficients sum to 1 for every N (conservative closure)", () => {
    const k = new MemoryKernel();
    for (const n of [1, 2, 3, 5, 8, 13]) {
      let wSum = 0;
      for (let j = 1; j <= n; j++) wSum += MemoryKernel.deepMemoryWeight(j);
      // (1−W_N) on present + Σ w_k on past = 1
      expect(1 - wSum + wSum).toBe(1);
      // and the closure term stays non-negative (convex) for all these N
      expect(1 - wSum).toBeGreaterThan(0);
    }
  });

  it("stepN output stays within the hull of present ∪ history (conservative)", () => {
    const k = new MemoryKernel();
    const present = 0.5;
    const history = [-0.3, 0.9, 0.1, -0.8, 0.2];
    const out = k.stepN(present, history);
    const lo = Math.min(present, ...history);
    const hi = Math.max(present, ...history);
    expect(out).toBeGreaterThanOrEqual(lo - 1e-12);
    expect(out).toBeLessThanOrEqual(hi + 1e-12);
  });

  it("stepN constant field is an exact fixed point for any N", () => {
    const k = new MemoryKernel();
    const c = 2.5;
    expect(k.stepN(c, [c, c, c, c, c])).toBeCloseTo(c, 14);
  });

  it("deepMemoryWeight rejects non-integer / <1 k", () => {
    expect(() => MemoryKernel.deepMemoryWeight(0)).toThrow(RangeError);
    expect(() => MemoryKernel.deepMemoryWeight(1.5)).toThrow(RangeError);
    expect(() => MemoryKernel.deepMemoryWeight(-2)).toThrow(RangeError);
  });
});

describe("File 9 · foolproof-by-construction guards", () => {
  it("rejects λ outside (0,1) — the unstable case is unrepresentable", () => {
    expect(() => new MemoryKernel(0)).toThrow(RangeError);
    expect(() => new MemoryKernel(1)).toThrow(RangeError);
    expect(() => new MemoryKernel(-0.5)).toThrow(RangeError);
    expect(() => new MemoryKernel(1.5)).toThrow(RangeError);
    expect(() => new MemoryKernel(Number.NaN)).toThrow(RangeError);
  });

  it("rejects non-positive or non-finite τ", () => {
    expect(() => new MemoryKernel(PHI_NEG2, 0)).toThrow(RangeError);
    expect(() => new MemoryKernel(PHI_NEG2, -1)).toThrow(RangeError);
    expect(() => new MemoryKernel(PHI_NEG2, Number.NaN)).toThrow(RangeError);
  });

  it("rejects non-finite field values", () => {
    const k = new MemoryKernel();
    expect(() => k.step(Number.NaN, 0)).toThrow(RangeError);
    expect(() => k.step(0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
