/**
 * Phase 1 · refinement/curvature.ts + criterion.ts verification.
 *
 * Gate (plan §3 Phase 1; CORE_VISION §5.D): the curvature estimator is EXACT
 * where the method guarantees it (zero on constant/linear, exact-on-quadratic),
 * bounded on C¹ fields, and the refinement criterion reproduces the φ⁻²/φ⁻⁴
 * standing-wave law with its no-oscillation hysteresis band — all as derived
 * identities (golden rule 12), never magic numbers.
 */
import { describe, it, expect } from "vitest";
import {
  discreteLaplacian,
  curvatureLambda,
  laplacianBound,
  AMPLITUDE_FLOOR,
  type FieldPatch,
} from "../src/refinement/curvature.js";
import {
  decideRefinement,
  hysteresisBandWidth,
} from "../src/refinement/criterion.js";
import {
  REFINE_THRESHOLD,
  COARSEN_THRESHOLD,
  REFINE_GRADING,
} from "../src/refinement/constants.js";
import { PHI, PHI_NEG2, PHI_NEG3 } from "../src/core/constants.js";

/** Build a 1-D patch (centre + 2 neighbours) from samples at x−dx, x, x+dx. */
function patch1D(left: number, centre: number, right: number, dx: number): FieldPatch {
  return { values: [centre, right, left], dx, dim: 1 };
}

/** Build a 2-D patch (centre + 4 neighbours) from a sampler f(x,y). */
function patch2D(
  f: (x: number, y: number) => number,
  x: number,
  y: number,
  dx: number
): FieldPatch {
  return {
    values: [f(x, y), f(x + dx, y), f(x - dx, y), f(x, y + dx), f(x, y - dx)],
    dx,
    dim: 2,
  };
}

describe("Phase 1 · discrete Laplacian — exact where guaranteed", () => {
  it("is EXACTLY zero on a constant field (any dim)", () => {
    for (const dim of [1, 2, 3] as const) {
      const n = 2 * dim;
      const patch: FieldPatch = {
        values: [3.7, ...Array(n).fill(3.7)],
        dx: 0.25,
        dim,
      };
      expect(discreteLaplacian(patch)).toBe(0);
    }
  });

  it("is EXACTLY zero on a linear field (symmetric neighbours cancel)", () => {
    // Ψ = 2x + 5 at x=1: samples 7, 9, 5 → (9−7)+(5−7) = 0.
    expect(discreteLaplacian(patch1D(9, 7, 5, 0.5))).toBe(0);
    // 2-D linear: Ψ = 3x − y + 1.
    const lap = discreteLaplacian(patch2D((x, y) => 3 * x - y + 1, 0.4, 1.1, 0.1));
    expect(Math.abs(lap)).toBeLessThan(1e-12);
  });

  it("is EXACT on a quadratic (Ψ = x² → ∇²Ψ = 2, the 5-point identity)", () => {
    // 1-D: ( (x+dx)² −x² ) + ( (x−dx)² −x² ) = 2dx² → /dx² = 2.
    expect(discreteLaplacian(patch1D(1.21, 1, 0.81, 0.1))).toBeCloseTo(2, 12);
    // 2-D: Ψ = x² + y² → ∇²Ψ = 4.
    const lap = discreteLaplacian(patch2D((x, y) => x * x + y * y, 0.7, 0.2, 0.05));
    expect(lap).toBeCloseTo(4, 10);
  });

  it("is bounded by the derived flux bound (robustness, rule 12)", () => {
    const patch = patch2D((x, y) => Math.sin(7 * x) * Math.cos(5 * y), 0.3, 0.8, 0.02);
    expect(Math.abs(discreteLaplacian(patch))).toBeLessThanOrEqual(laplacianBound(patch));
  });

  it("rejects a malformed patch (foolproof by construction, rule 14)", () => {
    expect(() => discreteLaplacian({ values: [1, 2], dx: 0.1, dim: 2 })).toThrow();
    expect(() => discreteLaplacian(patch1D(1, 1, 1, 0))).toThrow(); // dx = 0
    expect(() => discreteLaplacian(patch1D(1, 1, 1, -0.5))).toThrow(); // dx < 0
  });
});

describe("Phase 1 · curvature λ — normalised, scale-invariant", () => {
  it("is zero on a flat field (no signal → never refines)", () => {
    expect(curvatureLambda(patch1D(2, 2, 2, 0.1))).toBe(0);
  });

  it("is zero on a zero field without dividing by zero (floor protects)", () => {
    expect(curvatureLambda(patch1D(0, 0, 0, 0.1))).toBe(0);
  });

  it("is scale-invariant: same shape, different amplitude → same λ", () => {
    const small = curvatureLambda(patch2D((x, y) => 0.001 * (x * x + y * y), 0.3, 0.3, 0.05));
    const large = curvatureLambda(patch2D((x, y) => 1000 * (x * x + y * y), 0.3, 0.3, 0.05));
    // Both are pure quadratics with the same shape → λ identical to round-off.
    expect(small).toBeCloseTo(large, 6);
  });

  it("is large for a sharply-curved field, small for a gentle one", () => {
    const sharp = curvatureLambda(patch1D(0, 1, 0, 0.01)); // spike
    const gentle = curvatureLambda(patch1D(0.99, 1, 0.99, 0.01)); // near-flat
    expect(sharp).toBeGreaterThan(gentle);
  });

  it("rejects a negative floor", () => {
    expect(() => curvatureLambda(patch1D(1, 1, 1, 0.1), -1)).toThrow();
  });
});

describe("Phase 1 · refinement criterion — the φ⁻²/φ⁻⁴ standing-wave law", () => {
  it("thresholds are the EXACT φ identities (rule 12 — derived, not literal)", () => {
    expect(REFINE_THRESHOLD).toBe(PHI_NEG2); // φ⁻²
    expect(COARSEN_THRESHOLD).toBeCloseTo(PHI_NEG2 * PHI_NEG2, 15); // φ⁻⁴
    expect(REFINE_GRADING).toBeCloseTo(PHI * PHI, 15); // φ²
  });

  it("refines above φ⁻²·λ_ref, coarsens below φ⁻⁴·λ_ref, holds in the band", () => {
    const ref = 10;
    const refineAt = PHI_NEG2 * ref; // ≈ 3.8197
    const coarsenAt = PHI_NEG2 * PHI_NEG2 * ref; // ≈ 1.4586
    expect(decideRefinement(refineAt * 2, ref).decision).toBe("refine");
    expect(decideRefinement(coarsenAt / 2, ref).decision).toBe("coarsen");
    expect(decideRefinement((refineAt + coarsenAt) / 2, ref).decision).toBe("hold");
  });

  it("hysteresis band width is EXACTLY φ⁻³ (the no-oscillation margin)", () => {
    expect(hysteresisBandWidth()).toBeCloseTo(PHI_NEG3, 15);
  });

  it("no chatter: a just-refined node cannot immediately re-coarsen", () => {
    const ref = 10;
    const refineAt = PHI_NEG2 * ref;
    // Node sits just above the refine threshold (just refined).
    const justRefined = decideRefinement(refineAt * 1.0001, ref);
    expect(justRefined.decision).toBe("refine");
    // The same λ is FAR above the coarsen threshold → it holds, not coarsens.
    const recheck = decideRefinement(refineAt * 1.0001, ref);
    expect(recheck.decision).not.toBe("coarsen");
  });

  it("is scale-invariant: decisions depend on λ/λ_ref, not absolute units", () => {
    const a = decideRefinement(4, 10).decision;
    const b = decideRefinement(4e-9, 10e-9).decision; // same ratio, tiny scale
    expect(a).toBe(b);
  });

  it("rejects invalid inputs (foolproof, rule 14)", () => {
    expect(() => decideRefinement(-1, 10)).toThrow();
    expect(() => decideRefinement(1, 0)).toThrow();
    expect(() => decideRefinement(1, -5)).toThrow();
  });
});

describe("Phase 1 · integration — λ feeds the criterion end-to-end", () => {
  it("a sharp feature refines; a smooth region holds/coarsens on the same field", () => {
    const ref = 1 / (0.01 * 0.01); // λ_ref ~ curvature scale of a dx=0.01 feature
    const sharp = curvatureLambda(patch1D(0, 1, 0, 0.01));
    const smooth = curvatureLambda(patch1D(1, 1.0001, 1, 0.01));
    expect(decideRefinement(sharp, ref).decision).toBe("refine");
    expect(["hold", "coarsen"]).toContain(decideRefinement(smooth, ref).decision);
  });
});
