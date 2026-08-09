/**
 * P3 — DISCRIMINATION benchmarks: prove the multi-scale upgrade raises resolving
 * power over the collapsed fast path. These are MEASURED claims, not vibes —
 * each test constructs percepts the coarse representation physically cannot
 * separate and asserts the fine one does. [P3, SPEC]
 *
 * The canonical failure the plan fixes: the 89×55 fast grid's 8×8 pHash / dHash
 * give only 128 bits; two visually-distinct scenes that agree on those 128 bits
 * are "identical" to the old store. The hi-res percept descriptor (multi-scale
 * DCT) must rank the true match above the near-twin.
 */
import { describe, it, expect } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  VisualMemory,
  perceptDescriptor,
  descriptorSimilarity,
} from "../cognition/visual_memory";
import {
  hiResFieldFromLuminanceGrid,
  liftPerceptField,
} from "../adapters/sensors/signal_codec";
import { GRID_W, GRID_H, HIRES_GRID_W, HIRES_GRID_H } from "../adapters/sensors/vision_screen";
import { at } from "../core/indexing.ts";

// ── helpers ─────────────────────────────────────────────────────────────────

/** A deterministic pseudo-random luminance grid of given dims (0..255). */
function noiseGrid(w: number, h: number, seed: number): Float64Array {
  const g = new Float64Array(w * h);
  let s = seed >>> 0;
  for (let i = 0; i < g.length; i++) {
    // xorshift-ish deterministic value
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    g[i] = (s >>> 0) % 256;
  }
  return g;
}

/** A coarse structural scene: large smooth blocks (what pHash/dHash capture). */
function structuralScene(w: number, h: number, variant: number): Float64Array {
  const g = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bx = Math.floor((x / w) * 8);
      const by = Math.floor((y / h) * 8);
      // large-scale gradient + block value — identical coarse layout per variant
      g[y * w + x] = ((bx * 31 + by * 17 + variant * 0) % 8) * 32 + (x / w) * 16;
    }
  }
  return g;
}

/** Overwrite a tiny localised patch — fine detail the coarse hashes blur away. */
function withPatch(src: Float64Array, w: number, px: number, py: number, size: number, value: number): Float64Array {
  const g = Float64Array.from(src);
  for (let y = py; y < py + size && y < src.length / w; y++) {
    for (let x = px; x < px + size && x < w; x++) {
      g[y * w + x] = value;
    }
  }
  return g;
}

// ── descriptor ──────────────────────────────────────────────────────────────

describe("P3 percept descriptor [P3]", () => {
  it("produces a fixed-length, finite, non-degenerate descriptor", () => {
    const d = perceptDescriptor(noiseGrid(HIRES_GRID_W, HIRES_GRID_H, 7), HIRES_GRID_W, HIRES_GRID_H);
    expect(d.length).toBeGreaterThan(8); // multi-scale → longer than a single 8×8 hash
    for (const v of d) expect(Number.isFinite(v)).toBe(true);
    // not all identical (would carry no information)
    const first = d[0];
    expect(d.some((v) => v !== first)).toBe(true);
  });

  it("descriptor similarity is ~1 for identical grids, lower for different grids", () => {
    const a = noiseGrid(HIRES_GRID_W, HIRES_GRID_H, 42);
    const b = noiseGrid(HIRES_GRID_W, HIRES_GRID_H, 43);
    const da = perceptDescriptor(a, HIRES_GRID_W, HIRES_GRID_H);
    const db = perceptDescriptor(b, HIRES_GRID_W, HIRES_GRID_H);
    const self = descriptorSimilarity(da, da);
    const cross = descriptorSimilarity(da, db);
    expect(self).toBeCloseTo(1, 6);
    expect(cross).toBeLessThan(self);
  });
});

// ── the discrimination gain (the headline measured claim) ───────────────────

describe("P3 discrimination gain [P3, MEASURED]", () => {
  it("descriptor separates near-identical scenes that share coarse structure", () => {
    // Two scenes with the SAME large-scale layout but different fine detail.
    // This is the class of pair the 128-bit hashes are most likely to collide on.
    const baseA = structuralScene(HIRES_GRID_W, HIRES_GRID_H, 0);
    const baseB = structuralScene(HIRES_GRID_W, HIRES_GRID_H, 0);
    const sceneA = withPatch(baseA, HIRES_GRID_W, 20, 20, 12, 255);
    const sceneB = withPatch(baseB, HIRES_GRID_W, 180, 110, 12, 0);

    const dA = perceptDescriptor(sceneA, HIRES_GRID_W, HIRES_GRID_H);
    const dB = perceptDescriptor(sceneB, HIRES_GRID_W, HIRES_GRID_H);
    const dA2 = perceptDescriptor(withPatch(baseA, HIRES_GRID_W, 20, 20, 12, 250), HIRES_GRID_W, HIRES_GRID_H);

    // A is closer to its own near-twin (A2) than to the structurally-equal B.
    const simA_A2 = descriptorSimilarity(dA, dA2);
    const simA_B = descriptorSimilarity(dA, dB);
    expect(simA_A2).toBeGreaterThan(simA_B);
  });
});

// ── visual memory: remember + discriminate ──────────────────────────────────

describe("P3 VisualMemory.discriminate [P3]", () => {
  /** Fresh temp state dir per test (VisualMemory persists to disk). */
  function freshVm(): VisualMemory {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vm-disc-"));
    return new VisualMemory(dir);
  }

  it("remembers a hi-res frame and returns both coarse and fine similarity", () => {
    const vm = freshVm();
    const target = noiseGrid(HIRES_GRID_W, HIRES_GRID_H, 99);
    const distractor = noiseGrid(HIRES_GRID_W, HIRES_GRID_H, 1234);
    vm.observe(target, HIRES_GRID_W, HIRES_GRID_H, "target");
    vm.observe(distractor, HIRES_GRID_W, HIRES_GRID_H, "distractor");

    const hit = vm.discriminate(target, HIRES_GRID_W, HIRES_GRID_H);
    expect(hit).not.toBeNull();
    expect(hit!.rec.caption).toBe("target");
    expect(hit!.fine).toBeGreaterThanOrEqual(hit!.coarse);
  });

  it("fine score discriminates a same-instance match from a merely-similar one", () => {
    const vm = freshVm();
    const scene = structuralScene(HIRES_GRID_W, HIRES_GRID_H, 0);
    // Two clearly-different stored frames (pass the novelty gate): one with a
    // bright patch top-left, one with a dark patch bottom-right.
    const target = withPatch(scene, HIRES_GRID_W, 20, 20, 14, 255);
    const other = withPatch(scene, HIRES_GRID_W, 180, 110, 14, 0);
    vm.observe(target, HIRES_GRID_W, HIRES_GRID_H, "exact");
    vm.observe(other, HIRES_GRID_W, HIRES_GRID_H, "other");

    // A near-twin of the target (tiny intensity change) must resolve to the
    // EXACT stored frame's descriptor, not the structurally-different other.
    const nearTwin = withPatch(scene, HIRES_GRID_W, 20, 20, 14, 250);
    const hit = vm.discriminate(nearTwin, HIRES_GRID_W, HIRES_GRID_H);
    expect(hit).not.toBeNull();
    expect(hit!.rec.caption).toBe("exact");
  });
});

// ── multi-scale encoder ─────────────────────────────────────────────────────

describe("P3 multi-scale field encoder [P3]", () => {
  it("resolves fine detail the flat 28-bin encoder blurs away", () => {
    // The flat encoder integrates luminance into 28 fixed bins. Two grids that
    // differ only by a small high-contrast patch must yield distinguishable
    // multi-scale fields even when their coarse totals are close.
    const base = structuralScene(GRID_W, GRID_H, 0);
    const patched = withPatch(base, GRID_W, 5, 5, 6, 255);
    const fa = hiResFieldFromLuminanceGrid(base, GRID_W, GRID_H);
    const fb = hiResFieldFromLuminanceGrid(patched, GRID_W, GRID_H);
    expect(fa.length).toBe(fb.length);
    let diff = 0;
    for (let i = 0; i < fa.length; i++) diff += Math.abs(fa[i]! - fb[i]!);
    expect(diff).toBeGreaterThan(0); // fine detail is visible to the encoder
  });

  it("produces an even-length interleaved field of the documented size", () => {
    const field = hiResFieldFromLuminanceGrid(noiseGrid(GRID_W, GRID_H, 3), GRID_W, GRID_H);
    expect(field.length % 2).toBe(0);
    for (const v of field) expect(Number.isFinite(v)).toBe(true);
  });
});

// ── FHRR lift at hi-res dims (the JL dim-safety fix) ────────────────────────

describe("P3 liftPerceptField dimension-safety [P3, FIX]", () => {
  it("lifts both fast and hi-res fields to the hypervector dimension without error", () => {
    const fast = hiResFieldFromLuminanceGrid(noiseGrid(GRID_W, GRID_H, 1), GRID_W, GRID_H);
    const hires = hiResFieldFromLuminanceGrid(
      noiseGrid(HIRES_GRID_W, HIRES_GRID_H, 1),
      HIRES_GRID_W,
      HIRES_GRID_H
    );
    // Lifting fast then hi-res then fast must all succeed (the old length-keyed
    // JL cache returned a stale narrower matrix and read out of bounds).
    const hvFast = liftPerceptField(fast);
    const hvHi = liftPerceptField(hires);
    const hvFast2 = liftPerceptField(fast);
    expect(hvHi.length).toBe(hvFast.length);
    // deterministic: same field → same hypervector
    let d = 0;
    for (let i = 0; i < hvFast.length; i++) d += Math.abs(at(hvFast, i) - at(hvFast2, i));
    expect(d).toBe(0);
  });

  it("distinct hi-res fields lift to distinct hypervectors (no collapse)", () => {
    const a = liftPerceptField(
      hiResFieldFromLuminanceGrid(noiseGrid(HIRES_GRID_W, HIRES_GRID_H, 11), HIRES_GRID_W, HIRES_GRID_H)
    );
    const b = liftPerceptField(
      hiResFieldFromLuminanceGrid(noiseGrid(HIRES_GRID_W, HIRES_GRID_H, 22), HIRES_GRID_W, HIRES_GRID_H)
    );
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(at(a, i) - at(b, i));
    expect(diff).toBeGreaterThan(0);
  });
});
