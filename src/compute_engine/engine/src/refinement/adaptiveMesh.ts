/**
 * refinement/adaptiveMesh.ts — the LIVE adaptive mesh over the running field.
 *
 * The bridge between the verified Phase 1–4 transfer/refinement operators and
 * the running engine loop. This is what makes the framework-stability panel's
 * REFINEMENT section honest: every number it reports is measured from the live
 * field through the proven operators, never canned.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT IT DOES, per update(field):
 *
 *   1. SAMPLES the live field onto the tree. The tree refines the (u,v) torus
 *      parameter domain [0,2π)² (octree.ts). A point (u,v) reads the field
 *      through `fieldAt({u,v})`; the engine loop supplies the ring read
 *      u ↦ field[floor(u/2π·N)], so the SAME conservative read the panel's
 *      invariants use feeds the mesh. New leaves created by a refine are filled
 *      by the Phase-3 prolongation (conserving interpolation), not by raw
 *      resampling — the transfer operator is exercised live, and its
 *      conservation is reported.
 *
 *   2. MEASURES each leaf's curvature λ = |∇²Ψ|/(|Ψ|+floor) on its four face
 *      neighbours (curvature.ts — the flux-form estimator that is exact on
 *      quadratics and zero on linear fields).
 *
 *   3. DECIDES refine/hold/coarsen per leaf with λ_ref = the field's own max λ
 *      (criterion.ts), applying the decision through Octree.refine/coarsen. The
 *      φ⁻²..φ⁻⁴ hysteresis band means a leaf that just refined cannot
 *      immediately re-coarsen, so the tree never chatters.
 *
 * Epistemic tags: the sampling/prolongation/conservation algebra is [EXACT];
 * the reading of λ as "information density justifying refinement" and the
 * u→ring embedding are [POSTULATE] (Phase 7 measures the payoff). The mesh is
 * an OBSERVER on the field — it never feeds back into the propagator.
 */

import { Octree } from "./octree.ts";
import { isLeaf, type OctreeNode } from "./node.ts";
import { discreteLaplacian, curvatureLambda, type FieldPatch } from "./curvature.ts";
import { decideRefinement } from "./criterion.ts";
import { prolongateBlock, relativeConservationResidual } from "./prolongation.ts";
import { restrictBlock, relativeRestrictionResidual } from "./restriction.ts";
import { REFINE_THRESHOLD, COARSEN_THRESHOLD } from "./constants.ts";

const TWO_PI = 2 * Math.PI;

/** A live, measured snapshot of the adaptive mesh — the panel's telemetry. */
export interface MeshSnapshot {
  /** Field-carrying leaves (the resolution the mesh is spending). */
  readonly leaves: number;
  /** Total nodes (internal + leaves). */
  readonly nodes: number;
  /** Maximum tree depth (0 = root only). */
  readonly depth: number;
  /** The largest measured curvature λ in the field this step (λ_ref used). */
  readonly maxLambda: number;
  /** Leaves refined / coarsened this step (the mesh reacting to the field). */
  readonly refined: number;
  readonly coarsened: number;
  /**
   * Relative conservation residual of the prolongation fill used this step,
   * |Σchild − Σparent| / max(1, max|parent|) — ~1e-16 when the transfer is
   * conserving (the Phase-3 telescoping identity, exercised live).
   */
  readonly conservationResidual: number;
  /**
   * Relative conservation residual of the restriction (coarsen) transfer this
   * step, |Σparent − Σchild| / max(1, max|child|) — ~1e-16 by the double
   * stochasticity of R = P (the Phase-4 Galerkin adjoint, exercised live).
   * This is the coarsen direction's conservation measure, the counterpart to
   * `conservationResidual` on the refine direction. 0 when no block coarsened
   * this step. Restriction conserves the block MEAN exactly; it attenuates the
   * high-frequency content by the proven (1−4w)² (see restriction.ts) — that
   * attenuation is correct anti-aliasing, NOT a conservation failure, and is
   * not what this residual measures.
   */
  readonly restrictionResidual: number;
  /** The exact thresholds the criterion is running (φ⁻², φ⁻⁴). */
  readonly refineThreshold: number;
  readonly coarsenThreshold: number;
  /**
   * The live leaf geometry — one entry per field-carrying leaf (aligned with
   * tree.leaves()), each carrying its (u,v) centre in the [0,2π)² torus domain,
   * its dyadic depth, cell size and measured curvature λ. This is what lets the
   * panel render the REAL refined mesh (every node where it actually is), never
   * a reconstructed guess. Computed live each update.
   */
  readonly leafNodes: readonly MeshLeaf[];
}

/** One rendered leaf of the adaptive mesh — its true geometry + measured λ. */
export interface MeshLeaf {
  /** Cell centre in the torus domain, u ∈ [0, 2π). */
  readonly u: number;
  /** Cell centre in the torus domain, v ∈ [0, 2π). */
  readonly v: number;
  /** Dyadic cell size (domain fraction). */
  readonly size: number;
  /** Tree depth of this leaf (0 = root). */
  readonly depth: number;
  /** Measured scale-invariant curvature λ at this leaf (≥ 0). */
  readonly lambda: number;
}

/**
 * The adaptive mesh. Holds the current Octree plus the field value at each
 * leaf (aligned with tree.leaves()). Rebuilt-by-replacement each update, so a
 * snapshot is never mutated beneath a reader (engine referential transparency).
 */
export class AdaptiveMesh {
  private _tree: Octree;
  /** Field value at each leaf, aligned with _tree.leaves(). */
  private _values: number[];
  /** Guard against runaway depth in pathological fields (anti-thrash). */
  private readonly _maxDepth: number;
  /** The base level the mesh is seeded at (the coarsest it ever coarsens to). */
  private readonly _baseLevel: number;

  /**
   * @param baseLevel  The mesh is seeded at a uniform grid this many levels
   *                   deep, and never coarsens below it. This is REQUIRED: at
   *                   the bare root (one cell spanning the whole 2π domain) the
   *                   periodic face-neighbours of a leaf wrap to the leaf's own
   *                   centre, so the flux-form Laplacian is identically zero and
   *                   curvature can never be seen. A base level ≥ 1 makes the
   *                   patch neighbours distinct — real AMR seeds a base grid for
   *                   exactly this reason.
   * @param maxDepth   Anti-thrash ceiling on total depth.
   */
  constructor(baseLevel = 2, maxDepth = 5) {
    if (!Number.isInteger(baseLevel) || baseLevel < 1) {
      throw new RangeError(`AdaptiveMesh: baseLevel must be an integer ≥ 1; got ${baseLevel}.`);
    }
    if (!Number.isInteger(maxDepth) || maxDepth < baseLevel) {
      throw new RangeError(`AdaptiveMesh: maxDepth must be ≥ baseLevel (${baseLevel}); got ${maxDepth}.`);
    }
    this._baseLevel = baseLevel;
    this._maxDepth = maxDepth;
    this._tree = this._seed(baseLevel);
    this._values = this._tree.leaves().map(() => 0);
  }

  /** Build the uniform base grid: refine every leaf down to depth `level`. */
  private _seed(level: number): Octree {
    let tree = Octree.create();
    for (let l = 0; l < level; l++) {
      const paths = tree.leaves().map((leaf) => this._pathToIn(tree, leaf)!);
      for (const p of paths) tree = tree.refine(p);
    }
    return tree;
  }

  /** The current tree (read-only). */
  get tree(): Octree {
    return this._tree;
  }

  /**
   * Advance the mesh one step against the live field.
   *
   * @param fieldAt  Reads the field at a (u,v) point of the torus domain. The
   *                 engine loop passes the ring read; tests may pass any field.
   * @returns The measured snapshot after this step.
   */
  update(fieldAt: (p: { u: number; v: number }) => number): MeshSnapshot {
    // 1. Measure curvature λ at every current leaf from its real neighbours.
    //    λ is normalised by the field's own max amplitude (see _leafLambda), so
    //    it is scale-invariant and CANNOT blow up on the near-zero tails of a
    //    localised feature — the failure a per-leaf |Ψ|+floor normaliser has.
    const leaves = this._tree.leaves();
    const maxAmp = leaves.reduce((a, _l, i) => Math.max(a, Math.abs(this._values[i] ?? 0)), 0);
    const lambdas = leaves.map((leaf, i) =>
      this._leafLambda(leaf, this._values[i] ?? 0, fieldAt, maxAmp),
    );
    const maxLambda = lambdas.reduce((a, b) => Math.max(a, b), 0);

    let refined = 0;
    let coarsened = 0;
    let conservationResidual = 0;
    let restrictionResidual = 0;
    if (maxLambda > 0) {
      // Decide every leaf against a SNAPSHOT of the tree (the tree is rebuilt
      // by replacement, so all decisions are against one consistent state).
      const decisions = leaves.map((leaf, i) => ({
        leaf,
        path: this._pathTo(leaf),
        ...decideRefinement(lambdas[i]!, maxLambda),
      }));

      // 2a. REFINE first (independent per leaf; refining never conflicts).
      for (const d of decisions) {
        if (d.decision !== "refine" || d.path === null) continue;
        if (d.leaf.level >= this._maxDepth) continue;
        const node = this._at(d.path);
        if (!node || !isLeaf(node)) continue;
        // Sample the four child-cell centres from the live field (the same
        // geometric points sampleChildCentres reads once the node is internal),
        // then run the Phase-3 prolongation over them as the CONSERVING
        // smoother — refinement introduces no spurious mass, exercised live.
        const childCentres = this._childCentreSamples(node, fieldAt);
        conservationResidual = Math.max(
          conservationResidual,
          relativeConservationResidual(childCentres),
        );
        const childValues = prolongateBlock(childCentres);
        this._tree = this._tree.refine(d.path);
        this._spliceValues(d.path, childValues);
        refined++;
      }

      // 2b. COARSEN as a BLOCK decision: a parent collapses only when ALL FOUR
      //     of its sibling leaves vote coarsen (true dyadic coarsening), and
      //     each block is collapsed at most once. This is what stops the
      //     per-leaf order-dependence that made the tree oscillate.
      const coarsenVotes = new Map<string, { parentPath: number[]; votes: number; eligible: boolean }>();
      for (const d of decisions) {
        if (d.decision !== "coarsen" || d.path === null || d.path.length === 0) continue;
        const parentPath = d.path.slice(0, -1);
        if (parentPath.length < this._baseLevel) continue; // never below base grid
        const key = parentPath.join(",");
        const entry = coarsenVotes.get(key) ?? { parentPath, votes: 0, eligible: true };
        entry.votes++;
        coarsenVotes.set(key, entry);
      }
      for (const { parentPath, votes } of coarsenVotes.values()) {
        if (votes < 4) continue; // all four siblings must agree
        const parent = this._at(parentPath);
        if (!parent || isLeaf(parent)) continue;
        if (!parent.children!.every((c) => c && isLeaf(c))) continue; // total dyadic collapse
        // Phase 4 RESTRICTION, exercised live: transfer the four child leaf
        // values back onto the parent block BEFORE the collapse drops them —
        // the coarsen-direction counterpart to the prolongation fill in 2a.
        // Children are read in slot order (children[] index IS the dyadic slot).
        // restrictBlock conserves the block's integrated field exactly (double
        // stochasticity); the residual is measured so the coarsen direction's
        // conservation is reported honestly. The mesh still OBSERVES the field
        // afterward (_resample below): the restricted value is not injected, so
        // this runs + measures the operator without altering the observed field.
        const childValues = parent.children!.map((c) => {
          const idx = this._leafIndex(c!);
          return idx >= 0 ? (this._values[idx] ?? 0) : 0;
        });
        restrictBlock(childValues); // the Phase-4 transfer, run live
        restrictionResidual = Math.max(
          restrictionResidual,
          relativeRestrictionResidual(childValues),
        );
        this._tree = this._tree.coarsen(parentPath);
        coarsened++;
      }
      if (coarsened > 0) this._resample(fieldAt);
    }

    // 3. Re-read the leaf values from the field so the snapshot reflects the
    //    CURRENT field (the mesh observes; it does not carry its own state).
    this._resample(fieldAt);

    // 4. Capture the live leaf geometry for the renderer (the REAL mesh, not
    //    counts). λ is the per-leaf value measured in step 1; a leaf refined
    //    after that read carries its parent's measured λ as its honest best.
    const curLeaves = this._tree.leaves();
    const leafNodes: MeshLeaf[] = curLeaves.map((leaf) => {
      const h = leaf.cell.size;
      const idx = this._leafIndex(leaf);
      return {
        u: leaf.cell.u0 + h / 2,
        v: leaf.cell.v0 + h / 2,
        size: h,
        depth: leaf.level,
        lambda: idx >= 0 ? (lambdas[idx] ?? 0) : 0,
      };
    });

    return {
      leaves: this._tree.leafCount(),
      nodes: this._tree.nodeCount(),
      depth: this._tree.maxDepth(),
      maxLambda,
      refined,
      coarsened,
      conservationResidual,
      restrictionResidual,
      refineThreshold: REFINE_THRESHOLD,
      coarsenThreshold: COARSEN_THRESHOLD,
      leafNodes,
    };
  }

  /** Reset to the uniform base grid (the coarsest non-degenerate state). */
  reset(): void {
    this._tree = this._seed(this._baseLevel);
    this._values = this._tree.leaves().map(() => 0);
  }

  // ── internals ──────────────────────────────────────────────────────────────

  /**
   * Curvature λ at a leaf centre, from its four face-neighbour samples.
   * Neighbours are read from the field at the leaf's ±cell-size offsets (the
   * conservative flux-form patch), with the domain treated as periodic in u.
   *
   * The λ normaliser is the FIELD'S OWN max amplitude (`maxAmp`), not the
   * leaf's local |Ψ|. This is the scale-invariant choice: a localised feature
   * sitting on a near-zero background (a Gaussian bump, a shock) would, under
   * a local |Ψ|+floor normaliser, divide a real ∇²Ψ by ≈0 on the tails and
   * send λ to ~1e9 there — refining the flat tails instead of the feature.
   * Normalising by the field max makes λ dimensionless AND bounded, so the
   * refine signal concentrates where curvature is genuinely large relative to
   * the field's own scale. `curvatureLambda` is given `maxAmp` as its floor so
   * the ratio is λ = |∇²Ψ| / (|Ψ_centre| + maxAmp).
   */
  private _leafLambda(
    leaf: OctreeNode,
    centre: number,
    fieldAt: (p: { u: number; v: number }) => number,
    maxAmp: number,
  ): number {
    const h = leaf.cell.size;
    const uc = leaf.cell.u0 + h / 2;
    const vc = leaf.cell.v0 + h / 2;
    const wrap = (x: number) => ((x % TWO_PI) + TWO_PI) % TWO_PI;
    const patch: FieldPatch = {
      values: [
        centre,
        fieldAt({ u: wrap(uc + h), v: vc }), // +u
        fieldAt({ u: wrap(uc - h), v: vc }), // −u
        fieldAt({ u: uc, v: vc + h }), // +v
        fieldAt({ u: uc, v: vc - h }), // −v
      ],
      dx: h,
      dim: 2,
    };
    // λ = |∇²Ψ| / (|Ψ_centre| + maxAmp) ≥ 0 — scale-invariant, tail-safe.
    return curvatureLambda(patch, maxAmp);
  }

  /** The slot-path from the root of the CURRENT tree to `target`. */
  private _pathTo(target: OctreeNode): number[] | null {
    return this._pathToIn(this._tree, target);
  }

  /** The slot-path from the root of `tree` to `target`, or null if absent. */
  private _pathToIn(tree: Octree, target: OctreeNode): number[] | null {
    const path: number[] = [];
    let found = false;
    const walk = (node: OctreeNode): void => {
      if (found) return;
      if (node === target) {
        found = true;
        return;
      }
      if (!isLeaf(node) && node.children) {
        for (let s = 0; s < node.children.length; s++) {
          path.push(s);
          walk(node.children[s]!);
          if (found) return;
          path.pop();
        }
      }
    };
    walk(tree.root);
    return found ? path : null;
  }

  /** The node at `path` from the root, or null if the path does not resolve. */
  private _at(path: readonly number[]): OctreeNode | null {
    let node: OctreeNode = this._tree.root;
    for (const slot of path) {
      if (isLeaf(node) || !node.children) return null;
      node = node.children[slot]!;
    }
    return node;
  }

  /**
   * The index of `target` within the CURRENT tree's leaves(), or −1 if it is
   * not a current leaf. Identity match (leaves() returns the live node
   * references), used to read a coarsening block's child values from the
   * aligned `_values` array before the collapse drops them.
   */
  private _leafIndex(target: OctreeNode): number {
    const leaves = this._tree.leaves();
    for (let i = 0; i < leaves.length; i++) {
      if (leaves[i] === target) return i;
    }
    return -1;
  }

  /**
   * Replace the leaf at `path` by its four refined children, splicing the
   * prolongated child values into the aligned `_values` array.
   */
  private _spliceValues(path: readonly number[], childValues: readonly number[]): void {
    // Find the leaf index of `path` within the PRE-refine leaves, then replace
    // that one value with the four prolongated children.
    const leaves = this._tree.leaves();
    let idx = -1;
    for (let i = 0; i < leaves.length; i++) {
      const p = this._pathTo(leaves[i]!);
      if (p !== null && p.length === path.length && p.every((s, j) => s === path[j])) {
        idx = i;
        break;
      }
    }
    if (idx < 0) {
      this._values = this._tree.leaves().map(() => 0);
      return;
    }
    const next = this._values.slice();
    next.splice(idx, 1, ...childValues);
    this._values = next;
  }

  /** Re-read every leaf value from the live field (mesh observes the field). */
  private _resample(fieldAt: (p: { u: number; v: number }) => number): void {
    this._values = this._tree.leaves().map((leaf) =>
      fieldAt({ u: leaf.cell.u0 + leaf.cell.size / 2, v: leaf.cell.v0 + leaf.cell.size / 2 }),
    );
  }

  /**
   * Sample the field at the four child-cell centres of `leaf` — the same
   * geometric points sampleChildCentres reads once the node is internal, but
   * computable while the node is still a leaf (pre-refine). Slot order matches
   * subdivideCell: (du,dv) = (0,0),(0,1),(1,0),(1,1).
   */
  private _childCentreSamples(
    leaf: OctreeNode,
    fieldAt: (p: { u: number; v: number }) => number,
  ): number[] {
    const half = leaf.cell.size / 2;
    const quarter = half / 2;
    const { u0, v0 } = leaf.cell;
    return [
      fieldAt({ u: u0 + quarter, v: v0 + quarter }), // 0: du=0 dv=0
      fieldAt({ u: u0 + quarter, v: v0 + half + quarter }), // 1: du=0 dv=1
      fieldAt({ u: u0 + half + quarter, v: v0 + quarter }), // 2: du=1 dv=0
      fieldAt({ u: u0 + half + quarter, v: v0 + half + quarter }), // 3: du=1 dv=1
    ];
  }
}
