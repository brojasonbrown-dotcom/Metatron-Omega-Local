/**
 * refinement/octree.ts — the φ-graded dyadic adaptive tree over a scale torus.
 *
 * Phase 2 of the AMR program (plan §3; CORE_VISION §5.D-20). This is the data
 * structure the curvature estimator (Phase 1) refines and the prolongation /
 * restriction operators (Phases 3–4) transfer fields across.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE OWNS (one owner, strict DAG, golden rule 2):
 *
 *   • Construction of the tree from a root cell = the full (u,v) domain [0,2π)².
 *   • REFINE / COARSEN — structural only (no field transfer yet; that is Phase 3).
 *     Refine splits a leaf into the strict 2×2 dyadic block; coarsen collapses an
 *     internal node whose four children are all leaves back into a leaf. Both
 *     preserve the dyadic invariant by construction (golden rule 14).
 *   • LEVEL-ORDER LINEARISATION — the cache-friendly memory layout: nodes are
 *     emitted breadth-first, so each refinement level occupies one contiguous
 *     run. Traversal touches memory in address order, which is what makes the
 *     per-tick governor loop cache-friendly (plan §2.1 "linearisation").
 *   • DEPTH TRAVERSAL — iterate leaves, or all nodes at a level, in address order.
 *
 * THE TWO AXES (restated — see node.ts): dyadic addressing (2-bit slot, bit-shift
 * lookup) is separate from φ² resolution grading (resolvedScale = root·φ^(−2ℓ)).
 * This file composes node.ts; it never re-derives the grading or the geometry.
 *
 * Epistemic tags: tree structure & linearisation [EXACT]; that this structure
 * concentrates resolution where information is dense [POSTULATE — Phase 7 measures].
 */

import { TWO_PI } from "../core/constants.ts";
import {
  type OctreeNode,
  type Cell,
  makeNode,
  withChildren,
  isLeaf,
  isInternal,
  CHILDREN_PER_NODE,
} from "./node.ts";

/** The full torus parameter domain, [0, 2π)² — the root cell. EXACT. */
export function rootCell(): Cell {
  return Object.freeze({ u0: 0, v0: 0, size: TWO_PI });
}

/**
 * The adaptive tree. Immutable-by-rebuild: refine/coarsen return a NEW tree
 * (structural sharing where untouched), so a snapshot taken before a step is
 * never silently mutated beneath a reader — the same referential-transparency
 * discipline as the rest of the engine.
 */
export class Octree {
  /** The root node (level 0). */
  readonly root: OctreeNode;
  /** The root cell size, anchoring the φ² grading for every node. */
  readonly rootCellSize: number;

  private constructor(root: OctreeNode, rootCellSize: number) {
    this.root = root;
    this.rootCellSize = rootCellSize;
    Object.freeze(this);
  }

  /** Build a tree that is a single leaf over the full (u,v) domain. */
  static create(): Octree {
    const cell = rootCell();
    return new Octree(makeNode(cell, 0, 0, cell.size), cell.size);
  }

  /**
   * Refine the leaf at `path` into the strict 2×2 dyadic block.
   * `path` is the sequence of child slots from the root to the target leaf
   * (empty path = the root itself). Returns a NEW tree.
   *
   * Throws if the path does not resolve to a leaf — refining an internal node
   * or a non-existent path is a structural error, never silently ignored.
   */
  refine(path: readonly number[]): Octree {
    const newRoot = this.rebuild(this.root, path, 0, "refine");
    return new Octree(newRoot, this.rootCellSize);
  }

  /**
   * Coarsen the internal node at `path` back into a leaf. Only legal when all
   * four of its children are leaves (the dyadic collapse is total). Returns a
   * NEW tree. Throws otherwise — partial coarsening is not a tree operation.
   */
  coarsen(path: readonly number[]): Octree {
    const newRoot = this.rebuild(this.root, path, 0, "coarsen");
    return new Octree(newRoot, this.rootCellSize);
  }

  /**
   * Rebuild the tree, applying `op` at the node addressed by `path[depth..]`.
   * Structural sharing: untouched subtrees are returned by reference, so a
   * refine/coarsen copies only the spine from root to target — O(depth), not
   * O(nodes). This is what keeps per-tick adaptivity within the cadence budget.
   */
  private rebuild(
    node: OctreeNode,
    path: readonly number[],
    depth: number,
    op: "refine" | "coarsen",
  ): OctreeNode {
    if (depth === path.length) {
      // We are AT the target node — apply the structural operation.
      if (op === "refine") {
        if (!isLeaf(node)) {
          throw new RangeError("refine: target is not a leaf (already refined).");
        }
        return withChildren(node, this.rootCellSize);
      }
      // coarsen
      if (!isInternal(node)) {
        throw new RangeError("coarsen: target is not internal (nothing to collapse).");
      }
      const kids = node.children!;
      if (!kids.every((k): k is OctreeNode => k !== null && isLeaf(k))) {
        throw new RangeError(
          "coarsen: not all children are leaves — collapse must be total (dyadic invariant).",
        );
      }
      // Collapse: drop the children, returning the node as a leaf.
      const { children: _drop, ...leaf } = node;
      return Object.freeze({ ...leaf, children: null });
    }

    // Descend one level along the path, rebuilding only that child's subtree.
    if (!isInternal(node)) {
      throw new RangeError(
        `${op}: path descends through a leaf at depth ${depth} (path longer than tree).`,
      );
    }
    const slot = path[depth]!;
    if (!Number.isInteger(slot) || slot < 0 || slot >= CHILDREN_PER_NODE) {
      throw new RangeError(`${op}: path slot ${slot} at depth ${depth} is not in [0,4).`);
    }
    const kids = node.children!;
    const newKids = kids.map((k, i) =>
      i === slot ? this.rebuild(k!, path, depth + 1, op) : k,
    );
    return Object.freeze({ ...node, children: Object.freeze(newKids) });
  }

  // ── traversal & linearisation ──────────────────────────────────────────────

  /**
   * LEVEL-ORDER LINEARISATION — breadth-first, so each level is one contiguous
   * run. This is the cache-friendly memory layout the per-tick governor loop
   * walks: reading nodes in address order touches memory sequentially.
   * Returns the nodes in linearisation order (root first).
   */
  linearise(): readonly OctreeNode[] {
    const out: OctreeNode[] = [];
    const queue: OctreeNode[] = [this.root];
    // Standard BFS with an index cursor (no shift() — O(n), not O(n²)).
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i]!;
      out.push(node);
      if (isInternal(node)) {
        for (const child of node.children!) queue.push(child!);
      }
    }
    return Object.freeze(out);
  }

  /**
   * Iterate the LEAVES (the nodes that carry the field) in linearisation order.
   * The curvature estimator and the field operators run over exactly these.
   */
  leaves(): readonly OctreeNode[] {
    return Object.freeze(this.linearise().filter(isLeaf));
  }

  /** The nodes at exactly `level`, in linearisation order. */
  atLevel(level: number): readonly OctreeNode[] {
    if (!Number.isInteger(level) || level < 0) {
      throw new RangeError(`atLevel: level must be an integer ≥ 0; got ${level}.`);
    }
    return Object.freeze(this.linearise().filter((n) => n.level === level));
  }

  /** The maximum depth of the tree (0 = root only). */
  maxDepth(): number {
    let max = 0;
    for (const n of this.linearise()) if (n.level > max) max = n.level;
    return max;
  }

  /** Total node count (internal + leaves). */
  nodeCount(): number {
    return this.linearise().length;
  }

  /** Leaf count — the number of field-carrying cells. */
  leafCount(): number {
    return this.leaves().length;
  }

  /**
   * Look up the node addressed by `path` (slots from the root), or null if the
   * path does not resolve. Bit-shift descent: each slot IS the child index.
   */
  at(path: readonly number[]): OctreeNode | null {
    let node: OctreeNode = this.root;
    for (const slot of path) {
      if (!isInternal(node)) return null;
      if (!Number.isInteger(slot) || slot < 0 || slot >= CHILDREN_PER_NODE) return null;
      node = node.children![slot]!;
    }
    return node;
  }
}
