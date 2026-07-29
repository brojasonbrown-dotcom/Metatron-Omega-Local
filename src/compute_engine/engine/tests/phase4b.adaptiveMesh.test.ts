/**
 * tests/phase4b.adaptiveMesh.test.ts — the LIVE adaptive mesh (adaptiveMesh.ts).
 *
 * Pins that the mesh is REAL — a curvature-driven observer on the field built
 * from the proven Phase 1–4 operators — and never a mock:
 *
 *   · the mesh is seeded at a uniform BASE grid (a bare root is degenerate:
 *     its periodic face-neighbours coincide with the centre, so λ ≡ 0 and the
 *     tree could never see curvature — real AMR seeds a base grid for this
 *     exact reason);
 *   · a FLAT field holds at the base grid and never refines above it;
 *   · a CURVED field refines ABOVE the base grid, conservatively (prolongation
 *     fill residual ~ machine epsilon);
 *   · the hysteresis band + base level prevent chatter / collapse;
 *   · the snapshot numbers are measured from the field, not canned.
 */

import { describe, it, expect } from "vitest";
import { AdaptiveMesh } from "../src/refinement/adaptiveMesh.ts";
import { REFINE_THRESHOLD, COARSEN_THRESHOLD } from "../src/refinement/constants.ts";

const TWO_PI = 2 * Math.PI;
const BASE = 2; // default baseLevel
const BASE_LEAVES = 4 ** BASE; // 16

/** A flat field — zero curvature everywhere. */
const flat = () => 1.0;

/** A field with a sharp curvature spike at u = π (reads only u, like the ring). */
const spiked = ({ u }: { u: number; v: number }) => {
  const d = Math.abs(((u - Math.PI + Math.PI) % TWO_PI) - Math.PI); // distance to π on the ring
  return Math.exp(-(d * d) / 0.005); // narrow Gaussian bump at u = π
};

describe("adaptiveMesh — the live curvature-driven observer", () => {
  it("is seeded at the uniform base grid (never the degenerate bare root)", () => {
    const mesh = new AdaptiveMesh();
    expect(mesh.tree.leafCount()).toBe(BASE_LEAVES);
    expect(mesh.tree.maxDepth()).toBe(BASE);
  });

  it("a flat field never refines above the base grid", () => {
    const mesh = new AdaptiveMesh();
    let snap = mesh.update(flat);
    for (let i = 0; i < 5; i++) snap = mesh.update(flat);
    expect(snap.leaves).toBe(BASE_LEAVES);
    expect(snap.depth).toBe(BASE);
    expect(snap.refined).toBe(0);
    expect(snap.maxLambda).toBe(0);
  });

  it("a curved field refines ABOVE the base grid (leaves > base, depth > base)", () => {
    const mesh = new AdaptiveMesh();
    let snap = mesh.update(spiked);
    let totalRefined = snap.refined;
    for (let i = 0; i < 5; i++) {
      snap = mesh.update(spiked);
      totalRefined += snap.refined;
    }
    // The tree has genuinely refined above the base grid …
    expect(snap.leaves).toBeGreaterThan(BASE_LEAVES);
    expect(snap.depth).toBeGreaterThan(BASE);
    expect(snap.maxLambda).toBeGreaterThan(0);
    // … and it refined at some point along the way (per-step refined is 0 once
    //    the tree has settled at max depth, so we assert the cumulative count).
    expect(totalRefined).toBeGreaterThan(0);
  });

  it("refinement fill is conservative (prolongation residual ~ machine epsilon)", () => {
    const mesh = new AdaptiveMesh();
    let snap = mesh.update(spiked);
    for (let i = 0; i < 5; i++) snap = mesh.update(spiked);
    expect(snap.conservationResidual).toBeLessThan(1e-12);
    expect(snap.conservationResidual).toBeGreaterThanOrEqual(0);
  });

  it("exposes the exact φ⁻² / φ⁻⁴ hysteresis thresholds", () => {
    const mesh = new AdaptiveMesh();
    const snap = mesh.update(spiked);
    expect(snap.refineThreshold).toBeCloseTo(REFINE_THRESHOLD, 15);
    expect(snap.coarsenThreshold).toBeCloseTo(COARSEN_THRESHOLD, 15);
    expect(snap.refineThreshold).toBeGreaterThan(snap.coarsenThreshold);
  });

  it("never coarsens below the base grid (anti-thrash floor)", () => {
    const mesh = new AdaptiveMesh();
    for (let i = 0; i < 6; i++) mesh.update(spiked); // build up
    // Switch to a flat field: curvature vanishes, every leaf wants to coarsen,
    // but the base grid is the floor — it can never collapse past it.
    let snap = mesh.update(flat);
    for (let i = 0; i < 6; i++) snap = mesh.update(flat);
    expect(snap.leaves).toBeGreaterThanOrEqual(BASE_LEAVES);
    expect(snap.depth).toBeGreaterThanOrEqual(BASE);
  });

  it("hysteresis: a refined tree does not instantly collapse on the same field", () => {
    const mesh = new AdaptiveMesh();
    for (let i = 0; i < 5; i++) mesh.update(spiked);
    const built = mesh.update(spiked);
    const again = mesh.update(spiked);
    // On an unchanged field the tree stays refined (the φ⁻²..φ⁻⁴ band holds it).
    expect(again.leaves).toBeGreaterThan(BASE_LEAVES);
    expect(again.depth).toBeGreaterThanOrEqual(Math.max(BASE + 1, built.depth - 1));
  });

  it("reset returns to the base grid", () => {
    const mesh = new AdaptiveMesh();
    for (let i = 0; i < 5; i++) mesh.update(spiked);
    mesh.reset();
    expect(mesh.tree.leafCount()).toBe(BASE_LEAVES);
    expect(mesh.tree.maxDepth()).toBe(BASE);
  });

  it("snapshot numbers are measured from the field, not canned", () => {
    const a = new AdaptiveMesh();
    for (let i = 0; i < 5; i++) a.update(spiked);
    const sa = a.update(spiked);
    const b = new AdaptiveMesh();
    for (let i = 0; i < 5; i++) b.update(flat);
    const sb = b.update(flat);
    // A curved field produces strictly more measured curvature & refinement
    // than a flat one — the snapshot reflects the field it ran against.
    expect(sa.maxLambda).toBeGreaterThan(sb.maxLambda);
    expect(sa.leaves).toBeGreaterThan(sb.leaves);
  });

  it("constructor validates baseLevel / maxDepth (foolproof by construction)", () => {
    expect(() => new AdaptiveMesh(0)).toThrow();
    expect(() => new AdaptiveMesh(1.5)).toThrow();
    expect(() => new AdaptiveMesh(3, 2)).toThrow(); // maxDepth < baseLevel
  });
});

describe("adaptiveMesh — Phase 4 restriction wired live into the coarsen path", () => {
  /**
   * A traveling bump: refines the blocks it sits on, then coarsens the blocks
   * it leaves behind (their λ falls below φ⁻⁴·λ_ref while the bump's new
   * location keeps maxLambda high). This is the realistic scenario that makes
   * the coarsen direction fire — and with it the Phase-4 restriction transfer.
   */
  const bumpAt = (center: number) => ({ u }: { u: number; v: number }) => {
    let d = Math.abs(u - center) % TWO_PI;
    if (d > Math.PI) d = TWO_PI - d;
    return Math.exp(-(d * d) / 0.004);
  };

  it("coarsen fires on a traveling feature and runs the restriction transfer", () => {
    const mesh = new AdaptiveMesh();
    let coarsened = 0;
    for (let step = 0; step < 40; step++) {
      const center = 0.5 + (step / 40) * 5.0;
      coarsened += mesh.update(bumpAt(center)).coarsened;
    }
    // The coarsen path must actually be exercised — otherwise restrictionResidual
    // would be vacuous. A traveling bump coarsens many sibling blocks.
    expect(coarsened).toBeGreaterThan(0);
  });

  it("restriction conservation is exact (~machine epsilon) on every coarsen", () => {
    const mesh = new AdaptiveMesh();
    let maxRestrictionResidual = 0;
    let coarsened = 0;
    for (let step = 0; step < 40; step++) {
      const center = 0.5 + (step / 40) * 5.0;
      const snap = mesh.update(bumpAt(center));
      coarsened += snap.coarsened;
      maxRestrictionResidual = Math.max(maxRestrictionResidual, snap.restrictionResidual);
    }
    expect(coarsened).toBeGreaterThan(0); // the transfer genuinely ran
    // Double stochasticity of R = P: Σ parent = Σ child to Float64. Coarsening
    // blocks on flat tails give residual exactly 0; a block carrying a real
    // field gradient gives ~1e-16. Either way the measured residual sits at the
    // machine floor — never a fabricated zero, never a real leak.
    expect(maxRestrictionResidual).toBeGreaterThanOrEqual(0);
    expect(maxRestrictionResidual).toBeLessThan(1e-12);
  });

  it("the snapshot carries restrictionResidual (the coarsen-direction telemetry)", () => {
    const mesh = new AdaptiveMesh();
    const snap = mesh.update(bumpAt(1.0));
    // The field exists on the snapshot and is a finite non-negative number —
    // the panel reads this key directly, so it must always be present.
    expect(typeof snap.restrictionResidual).toBe("number");
    expect(Number.isFinite(snap.restrictionResidual)).toBe(true);
    expect(snap.restrictionResidual).toBeGreaterThanOrEqual(0);
  });
});
