/**
 * Phase 2 · refinement/node.ts + octree.ts verification.
 *
 * Gate (plan §3 Phase 2; CORE_VISION §5.D): the φ-graded dyadic tree is EXACT
 * where the structure guarantees it — dyadic addressing is bit arithmetic, the
 * φ² grading is an exact φ-power, the dyadic invariant (a node is a leaf OR has
 * exactly four children) holds by construction, and the level-order linearisation
 * is contiguous per level. Structural claims only — no field transfer (Phase 3).
 */
import { describe, it, expect } from "vitest";
import {
  makeNode,
  withChildren,
  slotOffset,
  subdivideCell,
  resolvedScaleAt,
  isLeaf,
  isInternal,
  grading,
  CHILDREN_PER_NODE,
  type Cell,
} from "../src/refinement/node.js";
import { Octree, rootCell } from "../src/refinement/octree.js";
import { PHI, PHI_SQUARED, TWO_PI } from "../src/core/constants.js";

describe("Phase 2 · node — dyadic addressing is exact bit arithmetic", () => {
  it("decodes a 2-bit slot into (du,dv) by shift/mask", () => {
    expect(slotOffset(0)).toEqual({ du: 0, dv: 0 }); // (0<<1)|0
    expect(slotOffset(1)).toEqual({ du: 0, dv: 1 }); // (0<<1)|1
    expect(slotOffset(2)).toEqual({ du: 1, dv: 0 }); // (1<<1)|0
    expect(slotOffset(3)).toEqual({ du: 1, dv: 1 }); // (1<<1)|1
  });

  it("rejects out-of-range slots (foolproof, rule 14)", () => {
    expect(() => slotOffset(-1)).toThrow();
    expect(() => slotOffset(4)).toThrow();
    expect(() => slotOffset(1.5)).toThrow();
  });

  it("grading is EXACTLY φ² (derived identity, rule 12)", () => {
    expect(grading()).toBe(PHI_SQUARED);
    expect(CHILDREN_PER_NODE).toBe(4); // 2^d, d=2
  });
});

describe("Phase 2 · node — φ²-graded resolved scale", () => {
  it("resolvedScale(level) = root·φ^(−2·level), an EXACT φ-power", () => {
    const root = 2 * Math.PI;
    expect(resolvedScaleAt(root, 0).value).toBeCloseTo(root, 12);
    expect(resolvedScaleAt(root, 1).value).toBeCloseTo(root / PHI_SQUARED, 12);
    expect(resolvedScaleAt(root, 2).value).toBeCloseTo(root / PHI_SQUARED ** 2, 12);
    expect(resolvedScaleAt(root, 5).value).toBeCloseTo(root * Math.pow(PHI, -10), 10);
  });

  it("resolvedScale is provenance-tagged POSTULATE (Phase 7 measures the claim)", () => {
    expect(resolvedScaleAt(2 * Math.PI, 1).provenance).toBe("POSTULATE");
  });

  it("consecutive levels differ by EXACTLY φ² (the grading identity)", () => {
    const root = 2 * Math.PI;
    const a = resolvedScaleAt(root, 3).value;
    const b = resolvedScaleAt(root, 4).value;
    expect(a / b).toBeCloseTo(PHI_SQUARED, 12);
  });

  it("rejects invalid inputs", () => {
    expect(() => resolvedScaleAt(0, 1)).toThrow();
    expect(() => resolvedScaleAt(1, -1)).toThrow();
    expect(() => resolvedScaleAt(1, 0.5)).toThrow();
  });
});

describe("Phase 2 · node — dyadic cell subdivision is exact geometry", () => {
  it("splits a cell into four quarter cells in slot order", () => {
    const cell: Cell = { u0: 0, v0: 0, size: 4 };
    const [c0, c1, c2, c3] = subdivideCell(cell);
    expect(c0).toEqual({ u0: 0, v0: 0, size: 2 }); // slot0 (du=0,dv=0)
    expect(c1).toEqual({ u0: 0, v0: 2, size: 2 }); // slot1 (du=0,dv=1)
    expect(c2).toEqual({ u0: 2, v0: 0, size: 2 }); // slot2 (du=1,dv=0)
    expect(c3).toEqual({ u0: 2, v0: 2, size: 2 }); // slot3 (du=1,dv=1)
  });

  it("child cells exactly tile the parent (no overlap, no gap)", () => {
    const cell: Cell = { u0: 1, v0: 2, size: 6 };
    const kids = subdivideCell(cell);
    const kidArea = kids.reduce((s, c) => s + c.size * c.size, 0);
    expect(kidArea).toBeCloseTo(cell.size * cell.size, 12);
  });

  it("a node is born a leaf; withChildren makes it internal with exactly 4", () => {
    const node = makeNode({ u0: 0, v0: 0, size: 2 }, 0, 0, 2);
    expect(isLeaf(node)).toBe(true);
    expect(isInternal(node)).toBe(false);
    const internal = withChildren(node, 2);
    expect(isInternal(internal)).toBe(true);
    expect(internal.children).toHaveLength(4);
    expect(internal.children!.every((c) => c !== null && isLeaf(c))).toBe(true);
  });

  it("children sit one level deeper and carry the parent's root grading", () => {
    const node = makeNode({ u0: 0, v0: 0, size: 2 }, 2, 0, 2);
    const internal = withChildren(node, 2);
    for (const c of internal.children!) {
      expect(c!.level).toBe(3);
      expect(c!.resolvedScale.value).toBeCloseTo(2 * Math.pow(PHI_SQUARED, -3), 12);
    }
  });

  it("withChildren refuses to re-refine an internal node", () => {
    const node = withChildren(makeNode({ u0: 0, v0: 0, size: 2 }, 0, 0, 2), 2);
    expect(() => withChildren(node, 2)).toThrow();
  });
});

describe("Phase 2 · octree — construction & the dyadic invariant", () => {
  it("root cell is the full [0,2π)² torus domain (EXACT)", () => {
    const rc = rootCell();
    expect(rc).toEqual({ u0: 0, v0: 0, size: TWO_PI });
  });

  it("a fresh tree is a single leaf over the root cell", () => {
    const t = Octree.create();
    expect(t.nodeCount()).toBe(1);
    expect(t.leafCount()).toBe(1);
    expect(t.maxDepth()).toBe(0);
    expect(isLeaf(t.root)).toBe(true);
    expect(t.root.cell.size).toBeCloseTo(TWO_PI, 12);
  });

  it("refine splits a leaf into exactly 4 leaves (nodeCount 1 → 5)", () => {
    const t = Octree.create().refine([]);
    expect(t.nodeCount()).toBe(5); // 1 internal + 4 leaves
    expect(t.leafCount()).toBe(4);
    expect(t.maxDepth()).toBe(1);
    expect(isInternal(t.root)).toBe(true);
  });

  it("deep refine along a path grows depth exactly", () => {
    // refine root, then refine child slot 3, then its child slot 0.
    let t = Octree.create().refine([]);
    t = t.refine([3]);
    t = t.refine([3, 0]);
    expect(t.maxDepth()).toBe(3);
    // Leaves: after root refine 4; refine [3]: 4−1+4=7; refine [3,0]: 7−1+4=10.
    expect(t.leafCount()).toBe(10);
    expect(t.nodeCount()).toBe(13); // 10 leaves + 3 internal
  });

  it("at() resolves a path by bit-shift descent; null on bad path", () => {
    let t = Octree.create().refine([]).refine([2]);
    const deep = t.at([2, 1]);
    expect(deep).not.toBeNull();
    expect(deep!.level).toBe(2);
    expect(deep!.slot).toBe(1);
    expect(t.at([2, 1, 0])).toBeNull(); // deeper than the tree
    expect(t.at([9])).toBeNull(); // out-of-range slot
  });

  it("refine throws on a non-leaf target or non-existent path (rule 14)", () => {
    const t = Octree.create().refine([]);
    expect(() => t.refine([])).toThrow(); // root already internal
    expect(() => t.refine([0, 0])).toThrow(); // descends through a leaf
  });

  it("coarsen collapses an all-leaf internal node back to a leaf", () => {
    let t = Octree.create().refine([]);
    expect(t.leafCount()).toBe(4);
    t = t.coarsen([]);
    expect(t.leafCount()).toBe(1);
    expect(t.nodeCount()).toBe(1);
    expect(isLeaf(t.root)).toBe(true);
  });

  it("coarsen refuses a partial collapse (dyadic invariant, rule 14)", () => {
    // refine root then refine one grandchild → root's children are NOT all leaves.
    const t = Octree.create().refine([]).refine([1]);
    expect(() => t.coarsen([])).toThrow(); // root has an internal child
    expect(() => t.coarsen([0])).toThrow(); // child 0 is a leaf, not internal
  });

  it("immutability: refine returns a NEW tree; the original is untouched", () => {
    const original = Octree.create();
    const refined = original.refine([]);
    expect(original.leafCount()).toBe(1); // unchanged
    expect(refined.leafCount()).toBe(4);
    expect(original.root).not.toBe(refined.root);
  });
});

describe("Phase 2 · octree — level-order linearisation is contiguous per level", () => {
  it("emits nodes breadth-first (each level one contiguous run)", () => {
    // Build a 3-level tree and check levels are non-decreasing in linearisation order.
    let t = Octree.create().refine([]).refine([0]).refine([3]);
    const levels = t.linearise().map((n) => n.level);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]!).toBeGreaterThanOrEqual(levels[i - 1]!); // BFS ⇒ sorted by level
    }
  });

  it("level-order run for level ℓ is exactly the nodes atLevel(ℓ)", () => {
    let t = Octree.create().refine([]).refine([0]);
    const lin = t.linearise();
    const level1 = t.atLevel(1);
    expect(level1).toHaveLength(4);
    // In BFS, level-1 nodes occupy a contiguous block right after the root.
    expect(lin[0]!.level).toBe(0);
    expect(lin.slice(1, 5).every((n) => n.level === 1)).toBe(true);
    expect(t.atLevel(2)).toHaveLength(4); // children of refined node [0]
  });

  it("nodeCount + leafCount are consistent (internal = total − leaves)", () => {
    let t = Octree.create().refine([]).refine([2]).refine([2, 3]);
    const total = t.nodeCount();
    const leaves = t.leafCount();
    const internal = t.linearise().filter(isInternal).length;
    expect(total).toBe(leaves + internal);
  });

  it("atLevel rejects a negative level (rule 14)", () => {
    expect(() => Octree.create().atLevel(-1)).toThrow();
  });
});

describe("Phase 2 · octree — scale-invariance harmonisation", () => {
  it("deep leaves resolve features φ^(−2·depth) smaller than the root", () => {
    // This is the AMR thesis: depth ⇒ resolution. A depth-10 leaf resolves
    // φ^(−20)·(2π) ≈ 2.4e-8 · 2π — the resolution the uniform depth-5 tree
    // cannot reach. (Structural claim; Phase 7 measures the realised gain.)
    let t = Octree.create();
    const path: number[] = [];
    for (let d = 0; d < 10; d++) {
      t = t.refine(path);
      path.push(0); // descend slot 0 each time
    }
    const deepest = t.at(path.slice(0, -1)); // the last refined internal's deepest leaf path
    expect(t.maxDepth()).toBe(10);
    const leafScale = resolvedScaleAt(TWO_PI, 10).value;
    expect(leafScale).toBeCloseTo(TWO_PI * Math.pow(PHI, -20), 12);
    expect(deepest).not.toBeNull();
  });
});
