/**
 * RHUFT v14 — Parallel Engine: Shared Field Layout & Node Indexing
 *
 * Maps the fractal tree onto a single SharedArrayBuffer so that persistent
 * workers and the main thread read/write the SAME node fields with zero copy.
 *
 * Layout (all Float64, interleaved complex Re/Im like GeometricField):
 *
 *   fieldSAB : [nodeCount][FIELD_SIZE]   — one row per node, the live field
 *   ctrlSAB  : Int32 control block       — level barriers + lifecycle flags
 *
 * Determinism (no-regression invariant, see PARALLEL_ENGINE.md §2):
 *   Node indices are assigned ONCE at build in breadth-first order and never
 *   change for the life of the tree. Because compute() is node-local and child
 *   feedback is a fixed-order accumulation over `node.children`, identical
 *   per-node inputs → identical per-node outputs no matter which thread runs a
 *   node. The level barrier (scheduler) guarantees children complete first.
 *
 * Epistemic Status: [SPEC] — pure data layout; no engine math lives here.
 */

import type { FractalNode } from "../fractal_node.ts";
import { at } from "../core/indexing.ts";

/** Field width per node: interleaved complex for N=13 → 2·(13+1) = 28. */
export const FIELD_SIZE = 28;

/**
 * Float64 slots per node row in the shared buffer.
 *   [0..FIELD_SIZE)        — the interleaved complex field (28)
 *   [FIELD_SIZE + 0]       — coherence C(n) written by the worker
 *   [FIELD_SIZE + 1]       — energy_density written by the worker
 * The worker computes coherence/energy in node_compute; committing them through
 * the SAB lets the main thread write back FULL node state (bit-identical to
 * serial compute()) without recomputing.
 */
export const ROW_SIZE = FIELD_SIZE + 2;

/** Row offset of the coherence slot within a node row. */
export const OFF_COHERENCE = FIELD_SIZE;
/** Row offset of the energy-density slot within a node row. */
export const OFF_ENERGY = FIELD_SIZE + 1;

/** Int32 control-block slots (ctrlSAB). */
export const CTRL = {
  /** Current level being computed (deepest first). */
  LEVEL: 0,
  /** Nodes completed in the current level. */
  DONE: 1,
  /** Nodes expected in the current level. */
  EXPECTED: 2,
  /** Run flag: 1 = run, 0 = halt workers. */
  RUN: 3,
  /** Tick counter (workers wait for it to advance). */
  TICK: 4,
  /** Workers still computing in the current level (main waits for == 0). */
  PENDING: 5,
  /**
   * Barrier generation counter, bumped once per published level. Workers wait
   * on THIS (not LEVEL) so a worker always knows exactly which barrier
   * generation it is acking — LEVEL integers repeat every tick (7→0), so
   * waiting on LEVEL alone lets a lagging worker ack a stale/future level.
   */
  SEQ: 6,
  /** Total Int32 slots in the control block. */
  SLOTS: 8,
} as const;

/**
 * A node flattened for shared-memory compute: its SAB row plus the SAB rows
 * of its children (read during child feedback), in fixed child order.
 */
export interface FlatNode {
  /** Deterministic SAB row index. */
  readonly index: number;
  /** Tree depth (root = 0). */
  readonly depth: number;
  /** Canonical scale index. */
  readonly scale: number;
  /** Child SAB indices in the node's fixed child order (may be empty). */
  readonly childIndices: readonly number[];
  /** The live node (framework/memory/state owner). */
  readonly node: FractalNode;
}

/** The full flattened tree: per-level node lists plus the shared buffers. */
export interface FlatTree {
  readonly nodeCount: number;
  readonly maxDepth: number;
  /** nodes[level] = FlatNodes at that depth, in deterministic (BFS) order. */
  readonly levels: readonly FlatNode[][];
  /** Shared field buffer, Float64, nodeCount × FIELD_SIZE. */
  readonly fieldSAB: SharedArrayBuffer;
  /** Shared control buffer, Int32, CTRL.SLOTS. */
  readonly ctrlSAB: SharedArrayBuffer;
  /** Float64 view over fieldSAB. */
  readonly fields: Float64Array;
  /** Int32 view over ctrlSAB. */
  readonly ctrl: Int32Array;
}

/**
 * Flatten a FractalNode tree into shared memory.
 *
 * Classic BFS: read from the `order` array as the queue so each node is
 * appended exactly once in breadth-first order. Children are pushed in the
 * node's fixed child order, so `childIndices` line up exactly with the
 * `node.children` array that compute() accumulates feedback over.
 * Each node's SAB row is seeded from its CURRENT field state so workers and
 * main start from identical data.
 *
 * @param root — the engine's root FractalNode.
 * @returns FlatTree with shared buffers ready to hand to workers.
 */
export function flattenTree(root: FractalNode): FlatTree {
  // ── BFS: order[] doubles as the queue; head walks it. ────────────────────
  const order: FractalNode[] = [root];
  for (let head = 0; head < order.length; head++) {
    const node = at(order, head);
    for (const child of node.children) order.push(child);
  }
  const indexOf = new Map<FractalNode, number>();
  order.forEach((n, i) => indexOf.set(n, i));

  const nodeCount = order.length;

  // ── Build per-level FlatNode records ────────────────────────────────────
  const levels: FlatNode[][] = [];
  let maxDepth = 0;
  order.forEach((node, index) => {
    const depth = node.get_depth();
    maxDepth = Math.max(maxDepth, depth);
    (levels[depth] ??= []).push({
      index,
      depth,
      scale: node.scale as number,
      childIndices: node.children.map((c) => indexOf.get(c)!),
      node,
    });
  });

  // ── Shared buffers ──────────────────────────────────────────────────────
  const fieldSAB = new SharedArrayBuffer(nodeCount * ROW_SIZE * 8);
  const ctrlSAB = new SharedArrayBuffer(CTRL.SLOTS * 4);
  const fields = new Float64Array(fieldSAB);
  const ctrl = new Int32Array(ctrlSAB);

  // Seed each node's row from its current field state, plus its current
  // coherence/energy so a read-back before any compute is still valid.
  for (let index = 0; index < nodeCount; index++) {
    const node = order[index];
    const src = node.state.field_state;
    const base = index * ROW_SIZE;
    const n = Math.min(src.length, FIELD_SIZE);
    for (let i = 0; i < n; i++) fields[base + i] = src[i];
    fields[base + OFF_COHERENCE] = node.state.coherence;
    fields[base + OFF_ENERGY] = node.state.energy_density;
  }

  Atomics.store(ctrl, CTRL.RUN, 1);
  Atomics.store(ctrl, CTRL.TICK, 0);
  Atomics.store(ctrl, CTRL.LEVEL, -1);
  Atomics.store(ctrl, CTRL.SEQ, 0);

  return { nodeCount, maxDepth, levels, fieldSAB, ctrlSAB, fields, ctrl };
}

/**
 * Read a node's field row as a Float64Array view (no copy).
 * Workers use this to write; parents use child rows to read feedback.
 */
export function nodeRow(fields: Float64Array, index: number): Float64Array {
  // Field-only view (first FIELD_SIZE slots of the row) — children read feedback
  // and workers write the new field through this.
  return fields.subarray(index * ROW_SIZE, index * ROW_SIZE + FIELD_SIZE);
}

/**
 * Read a node's full row (field + coherence + energy). Used by commitToNodes to
 * write back complete state, bit-identical to serial compute().
 */
export function nodeFullRow(fields: Float64Array, index: number): Float64Array {
  return fields.subarray(index * ROW_SIZE, (index + 1) * ROW_SIZE);
}

/**
 * Partition the tree's nodes across `poolSize` workers, by level.
 *
 * Assignment is level-interleaved (round-robin within each level) so every
 * worker gets a contiguous-in-cost slice of the WIDE levels (where 92% of the
 * work is) and the barrier accounting stays exact: for each level, each worker
 * knows precisely how many of that level's nodes it owns.
 *
 * @returns assignments[w] = FlatNodes owned by worker w (all levels merged,
 *          but each FlatNode carries its `depth` for wavefront scheduling).
 */
export function partitionTree(flat: FlatTree, poolSize: number): FlatNode[][] {
  const assignments: FlatNode[][] = Array.from({ length: poolSize }, () => []);
  for (const level of flat.levels) {
    if (!level) continue;
    level.forEach((fn, i) => {
      at(assignments, i % poolSize).push(fn);
    });
  }
  return assignments;
}
