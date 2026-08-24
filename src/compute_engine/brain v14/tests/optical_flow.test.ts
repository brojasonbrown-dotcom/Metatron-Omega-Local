/**
 * Tests — Optical-Flow Region Tracker (M4, the movement-anchor).
 *
 * Guarantees under test:
 *   1. A static scene yields NO dominant motion (honest "no antecedent").
 *   2. A moving object is localised to ITS region, not the static background.
 *   3. The dog/car case: a moving car registers motion in the car's region while
 *      the dog's static region reports ~zero confident motion.
 *   4. Aperture honesty: a textureless region reports low confidence even when
 *      its pixels changed (no fabricated vector).
 *   5. Determinism + shape validation.
 */

import { describe, expect, it } from "vitest";
import { opticalFlowRegions, motionAnchor } from "../adapters/sensors/optical_flow.ts";

const W = 89;
const H = 55;

/** A blank grid. */
function blank(): Float64Array {
  return new Float64Array(W * H).fill(120);
}

/** Paint a filled rect of `value` into a grid (mutates + returns it). */
function rect(g: Float64Array, x0: number, y0: number, x1: number, y1: number, value: number): Float64Array {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      g[y * W + x] = value;
    }
  }
  return g;
}

describe("optical_flow — movement anchor", () => {
  it("STATIC: an unchanged scene has no dominant motion (honest null anchor)", () => {
    const a = rect(blank(), 10, 10, 20, 20, 200);
    const b = new Float64Array(a); // identical
    const flow = opticalFlowRegions(a, b, W, H, 5, 8);
    expect(motionAnchor(flow)).toBeNull();
    // Every region's raw change energy is ~zero.
    for (const r of flow.regions) expect(r.energy).toBeLessThan(1e-9);
  });

  it("LOCALISE: a moving block registers in ITS region, not elsewhere", () => {
    const a = blank();
    const b = blank();
    rect(a, 10, 10, 20, 20, 230); // block at left
    rect(b, 40, 10, 50, 20, 230); // same block, moved right
    const flow = opticalFlowRegions(a, b, W, H, 5, 8);
    const anchor = motionAnchor(flow);
    expect(anchor).not.toBeNull();
    // The dominant motion must be in a region that overlaps the moved block's
    // columns (block spanned x∈[10,50) → region cols ~0..4 of 8 across width 89).
    expect(anchor!.col).toBeGreaterThanOrEqual(0);
    expect(anchor!.col).toBeLessThan(6);
    expect(anchor!.magnitude).toBeGreaterThan(0);
    // A region far from the block (far right) has ~zero raw change.
    const farRight = flow.regions.filter((r) => r.col >= 7);
    for (const r of farRight) expect(r.energy).toBeLessThan(1e-9);
  });

  it("DOG/CAR: moving car registers; the static dog's region reports ~zero motion", () => {
    // Dog sits still (identical in both frames); a car enters and moves.
    const dog = (g: Float64Array) => rect(g, 5, 5, 15, 18, 90); // static dog
    const car = (g: Float64Array, dx: number) => rect(g, 60 + dx, 30, 72 + dx, 40, 240);
    const a = car(dog(blank()), 0);
    const b = car(dog(blank()), 9); // car moved 9 cells; dog identical
    const flow = opticalFlowRegions(a, b, W, H, 5, 8);
    const anchor = motionAnchor(flow);
    expect(anchor).not.toBeNull();
    // Anchor must be in the CAR's columns (x∈[60,81) of 89 → region cols ~5..7).
    expect(anchor!.col).toBeGreaterThanOrEqual(4);
    // The dog's region (x∈[5,15) → region col 0..1) reports ~zero confident motion.
    const dogRegion = flow.regions.find((r) => r.row <= 1 && r.col === 0);
    expect(dogRegion).toBeDefined();
    expect(dogRegion!.energy).toBeLessThan(1e-9); // dog's pixels never changed
  });

  it("APERTURE: a textureless shifting slab reports low confidence (no fabrication)", () => {
    // A large uniform slab that brightens uniformly — high |I_t| but a degenerate
    // structure tensor (no gradient) → no trustworthy vector.
    const a = blank();
    const b = blank();
    rect(a, 0, 0, W, H, 100);
    rect(b, 0, 0, W, H, 160); // uniform global brighten, no edge motion
    const flow = opticalFlowRegions(a, b, W, H, 5, 8);
    // Interior regions have ~zero gradient → confidence collapses toward 0.
    const interior = flow.regions.filter((r) => r.row >= 2 && r.row <= 2 && r.col >= 3 && r.col <= 4);
    for (const r of interior) expect(r.confidence).toBeLessThan(0.5);
  });

  it("DETERMINISM + shape validation", () => {
    const a = rect(blank(), 10, 10, 20, 20, 230);
    const b = rect(blank(), 30, 10, 40, 20, 230);
    const run = () => {
      const f = opticalFlowRegions(a, b, W, H, 5, 8);
      return f.regions.map((r) => [r.u, r.v, r.confidence]);
    };
    expect(run()).toEqual(run());
    expect(() => opticalFlowRegions(a, new Float64Array(3), W, H, 5, 8)).toThrow(RangeError);
    expect(() => opticalFlowRegions(a, b, W, H, 0, 8)).toThrow(RangeError);
  });
});
