/**
 * refinement/node.ts — one node of the φ-graded dyadic tree over the (u,v) cell.
 *
 * Phase 2 of the AMR program (plan §3; CORE_VISION §5.D-20). The tree adaptively
 * refines the (u,v) parameter domain of a scale torus so nodes concentrate where
 * the local field curvature λ is large (plan §1).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE TWO AXES — kept strictly separate (plan §2.1, golden rule 12):
 *
 *   1. ADDRESSING is dyadic. Each node subdivides its (u,v) cell into a 2×2
 *      block of children, so a child is identified by a 2-bit slot (du, dv) ∈
 *      {0,1}². Dyadic wins for tree addressing: the slot IS the bit index, so
 *      child lookup is a mask/shift, and a level's nodes linearise into a
 *      contiguous, cache-friendly run (see octree.ts). [EXACT — bit arithmetic]
 *
 *   2. RESOLUTION is φ²-graded. A node at level ℓ resolves features of linear
 *      size rootCell · φ^(−2ℓ) — the SAME grading as the engine's scale-
 *      invariance law R(s·φⁿ) = R(s)·(φ^(1/D))ⁿ, so the adaptive tree harmonises
 *      with the existing engine instead of bolting on a new paradigm. The dyadic
 *      slot says WHERE the node sits; the φ² grading says WHAT it resolves.
 *      [grading EXACT; resolvedScale interpretation POSTULATE — ablation-ready]
 *
 * These two axes are NEVER conflated: the child slot is always 2 bits (dyadic),
 * independent of φ; the resolved scale is always φ^(−2ℓ), independent of the
 * slot. Conflating them (e.g. subdividing into φ children) would break the
 * bit-shift addressing and the cache-friendly linearisation — and is exactly
 * the mistake the plan's §2.1 warns against.
 *
 * Epistemic tags: dyadic addressing [EXACT]; φ² grading [EXACT]; the claim that
 * this structure raises effective resolution where λ is large [POSTULATE — the
 * falsification battery of Phase 7 measures it].
 */

import { PHI } from "../core/constants.ts";
import { classify, type Classified } from "../core/provenance.ts";
import { REFINE_GRADING } from "./constants.ts";

/** φ² = φ + 1 — re-exported so node grading reads from one local anchor. */
const GRADING = REFINE_GRADING; // ≡ φ² (EXACT), single source in constants.ts

/**
 * The (u,v) cell a node covers, in radians on the torus parameter domain.
 * `u0,v0` is the cell's lower corner; `size` its (square) side length. The root
 * cell is the full [0, 2π)² domain.
 */
export interface Cell {
  readonly u0: number;
  readonly v0: number;
  readonly size: number;
}

/**
 * A node of the adaptive tree. Immutable (the tree is rebuilt on refine/coarsen,
 * never mutated in place — this keeps the structure auditable and the phase-3
 * prolongation referentially transparent).
 *
 * A node is EITHER a leaf (no children — it carries the field) OR internal
 * (exactly 4 children — it carries only structure). This is the strict dyadic
 * invariant: never a partial child set, so traversal and linearisation are total.
 */
export interface OctreeNode {
  /** Depth below the root (root = 0). */
  readonly level: number;
  /** The (u,v) cell this node covers. */
  readonly cell: Cell;
  /**
   * The 2-bit dyadic slot this node occupies within its parent, (du,dv) packed
   * as (du << 1) | dv ∈ {0,1,2,3}. The root's slot is 0 by convention.
   */
  readonly slot: number;
  /**
   * The feature size this node resolves: rootCellSize · φ^(−2·level). This is
   * the φ²-graded resolution axis — EXACT as a φ-power, POSTULATE as a claim
   * about resolved physics (measured in Phase 7).
   */
  readonly resolvedScale: Classified<number>;
  /** The four children, indexed by slot (internal node), or null (leaf). */
  readonly children: readonly (OctreeNode | null)[] | null;
}

/** The number of children of an internal node — always exactly 2² (dyadic, d=2). */
export const CHILDREN_PER_NODE = 4 as const; // 2^d, d = effective dimension 2

/**
 * Decode a 2-bit child slot into its (du, dv) offset within the parent cell.
 * slot = (du << 1) | dv, so du = slot >> 1, dv = slot & 1. EXACT bit arithmetic.
 */
export function slotOffset(slot: number): { du: number; dv: number } {
  if (!Number.isInteger(slot) || slot < 0 || slot >= CHILDREN_PER_NODE) {
    throw new RangeError(`slotOffset: slot must be an integer in [0,4); got ${slot}.`);
  }
  return { du: slot >> 1, dv: slot & 1 };
}

/**
 * The φ²-graded resolved scale at a given level, from the root cell size.
 *   resolvedScale(level) = rootCellSize · φ^(−2·level).
 * Returned provenance-tagged: the φ-power is EXACT; reading it as a resolved
 * physical feature size is POSTULATE (measured in Phase 7).
 */
export function resolvedScaleAt(rootCellSize: number, level: number): Classified<number> {
  if (!(rootCellSize > 0) || !Number.isFinite(rootCellSize)) {
    throw new RangeError(`resolvedScaleAt: rootCellSize must be > 0 finite; got ${rootCellSize}.`);
  }
  if (!Number.isInteger(level) || level < 0) {
    throw new RangeError(`resolvedScaleAt: level must be an integer ≥ 0; got ${level}.`);
  }
  // φ^(−2·level) = GRADING^(−level). EXACT as a φ-power.
  const scale = rootCellSize * Math.pow(GRADING, -level);
  return classify(
    scale,
    "POSTULATE",
    undefined,
    `rootCell·φ^(−2·${level}); the φ-power is EXACT, its reading as resolved feature size is POSTULATE (Phase 7 measures)`,
  );
}

/**
 * Subdivide a cell dyadically into its four child cells (the 2×2 block).
 * Child `slot` covers the (du,dv) quarter of the parent. EXACT geometry.
 */
export function subdivideCell(cell: Cell): readonly [Cell, Cell, Cell, Cell] {
  if (!(cell.size > 0) || !Number.isFinite(cell.size)) {
    throw new RangeError(`subdivideCell: cell.size must be > 0 finite; got ${cell.size}.`);
  }
  const half = cell.size / 2;
  // slot = (du<<1)|dv: slot0=(0,0) slot1=(0,1) slot2=(1,0) slot3=(1,1).
  return [
    Object.freeze({ u0: cell.u0, v0: cell.v0, size: half }), // 0: du=0 dv=0
    Object.freeze({ u0: cell.u0, v0: cell.v0 + half, size: half }), // 1: du=0 dv=1
    Object.freeze({ u0: cell.u0 + half, v0: cell.v0, size: half }), // 2: du=1 dv=0
    Object.freeze({ u0: cell.u0 + half, v0: cell.v0 + half, size: half }), // 3: du=1 dv=1
  ] as const;
}

/**
 * Create a node covering `cell` at `level`, with the φ²-graded resolved scale.
 * `rootCellSize` anchors the grading (the root's cell size). A fresh node is a
 * leaf (children = null); children are attached only by `withChildren`.
 */
export function makeNode(
  cell: Cell,
  level: number,
  slot: number,
  rootCellSize: number,
): OctreeNode {
  if (!Number.isInteger(level) || level < 0) {
    throw new RangeError(`makeNode: level must be an integer ≥ 0; got ${level}.`);
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= CHILDREN_PER_NODE) {
    throw new RangeError(`makeNode: slot must be an integer in [0,4); got ${slot}.`);
  }
  return Object.freeze({
    level,
    cell: Object.freeze({ ...cell }),
    slot,
    resolvedScale: resolvedScaleAt(rootCellSize, level),
    children: null,
  });
}

/**
 * Return a copy of `node` with its four children attached (making it internal).
 * The children must be exactly the dyadic subdivision of the node's cell, in
 * slot order — enforced by construction here so the invariant can never be
 * violated by a caller (foolproof by construction, golden rule 14).
 */
export function withChildren(node: OctreeNode, rootCellSize: number): OctreeNode {
  if (node.children !== null) {
    throw new RangeError("withChildren: node is already internal (children attached).");
  }
  const childCells = subdivideCell(node.cell);
  const children = childCells.map((cell, slot) =>
    makeNode(cell, node.level + 1, slot, rootCellSize),
  );
  return Object.freeze({ ...node, children: Object.freeze(children) });
}

/** True iff the node is a leaf (carries the field; no children). */
export function isLeaf(node: OctreeNode): boolean {
  return node.children === null;
}

/** True iff the node is internal (carries structure; exactly four children). */
export function isInternal(node: OctreeNode): boolean {
  return node.children !== null;
}

/** The φ² grading constant, exposed for tests that assert the grading identity. */
export function grading(): number {
  return GRADING;
}
