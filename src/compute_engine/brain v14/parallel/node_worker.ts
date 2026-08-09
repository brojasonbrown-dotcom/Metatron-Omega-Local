/**
 * RHUFT v14 — Parallel Engine: Node Worker
 *
 * Runs inside a worker_thread. Rebuilds the fractal tree deterministically
 * (identical to the main thread's build), keeps only its assigned partition of
 * REAL FractalNode instances (full framework + memory state), and computes them
 * against the shared field buffer as the scheduler releases each level.
 *
 * Wavefront protocol (see PARALLEL_ENGINE.md §3):
 *   Main drives levels deepest → root. For each level it sets CTRL.LEVEL and
 *   CTRL.EXPECTED, then notifies. Each worker:
 *     1. Atomics.wait on CTRL.LEVEL until it reaches a level it owns nodes in,
 *     2. computes ONLY its assigned nodes in that level (reading child rows
 *        from the SAB — guaranteed complete by the barrier),
 *     3. writes each node's new field into its SAB row (and its own prev-field),
 *     4. Atomics.add(CTRL.DONE, ownCountInLevel) and notifies the main waiter.
 *   Main releases level L only after CTRL.DONE == EXPECTED, so a parent level
 *   never starts before its children finish — the determinism invariant (§2)
 *   holds across threads.
 *
 * Determinism: the tree is rebuilt via the same constructor + create_children
 * recursion the engine uses, so node identity and BFS order match the main
 * thread exactly (verified in tests/parallel_equivalence.mjs).
 *
 * Epistemic Status: [SPEC] — scheduling + faithful compute; no new math.
 */

import { parentPort, workerData } from "node:worker_threads";
import { CTRL, FIELD_SIZE, OFF_COHERENCE, OFF_ENERGY, nodeRow, type FlatNode } from "./layout.ts";
import { computeNodeShared, type SharedNodeRef } from "./node_compute.ts";
import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { at } from "../core/indexing.ts";

export interface NodeWorkerData {
  readonly workerId: number;
  readonly poolSize: number;
  readonly targetScale: number;
  readonly maxDepth: number;
  readonly fieldSAB: SharedArrayBuffer;
  readonly ctrlSAB: SharedArrayBuffer;
}

/**
 * Rebuild the exact tree the engine builds (deterministic), then keep only
 * this worker's assigned nodes, grouped by level. Mirrors the engine's
 * _buildTree: create_children recursively until get_depth() >= maxDepth.
 *
 * Ownership is level-interleaved round-robin and MUST match
 * layout.partitionTree (the main thread's accounting) exactly: node ownership
 * is decided by the node's ordinal within its level, mod poolSize.
 */
function buildAndOwnTree(data: NodeWorkerData): {
  own: Map<number, FlatNode[]>;
  fields: Float64Array;
  ctrl: Int32Array;
} {
  const mapper = new ScaleMapper();
  const root = FractalNode.createAtScale(data.targetScale as never, null, mapper);

  const build = (node: FractalNode): void => {
    if (node.get_depth() >= data.maxDepth) return;
    node.create_children();
    for (const child of node.children) build(child);
  };
  build(root);

  // Flatten with the same BFS index assignment as layout.flattenTree.
  const order: FractalNode[] = [root];
  for (let head = 0; head < order.length; head++) {
    for (const child of at(order, head).children) order.push(child);
  }
  const indexOf = new Map<FractalNode, number>();
  order.forEach((n, i) => indexOf.set(n, i));

  const fields = new Float64Array(data.fieldSAB);
  const ctrl = new Int32Array(data.ctrlSAB);

  // Precompute each node's ordinal within its level (BFS order is stable).
  const levelOrdinal = new Map<number, number>(); // index → ordinal within level
  const levelCount = new Map<number, number>();
  order.forEach((node, index) => {
    const d = node.get_depth();
    const ord = levelCount.get(d) ?? 0;
    levelOrdinal.set(index, ord);
    levelCount.set(d, ord + 1);
  });

  const own = new Map<number, FlatNode[]>();
  order.forEach((node, index) => {
    const depth = node.get_depth();
    if (levelOrdinal.get(index)! % data.poolSize !== data.workerId) return; // not ours
    const flat: FlatNode = {
      index,
      depth,
      scale: node.scale as number,
      childIndices: node.children.map((c) => indexOf.get(c)!),
      node,
    };
    if (!own.has(depth)) own.set(depth, []);
    own.get(depth)!.push(flat);
  });

  return { own, fields, ctrl };
}

/**
 * Adapt a FractalNode to the SharedNodeRef surface the compute expects.
 * currentField is the node's SAB row so the worker always uses the latest
 * committed field (its own previous write).
 */
function toRef(fn: FlatNode, fields: Float64Array): SharedNodeRef {
  const node = fn.node as unknown as {
    scale: number;
    _membrane: SharedNodeRef["_membrane"];
    _previousField: Float64Array | null;
    _frameworkComputes: SharedNodeRef["_frameworkComputes"];
    _memoryComputes: SharedNodeRef["_memoryComputes"];
  };
  return {
    scale: node.scale,
    _membrane: node._membrane,
    _previousField: node._previousField,
    _frameworkComputes: node._frameworkComputes,
    _memoryComputes: node._memoryComputes,
    currentField: nodeRow(fields, fn.index),
  };
}

function run(): void {
  const data = workerData as NodeWorkerData;
  const { own, fields, ctrl } = buildAndOwnTree(data);

  // Signal readiness with how many nodes we own (sanity for the scheduler).
  let owned = 0;
  for (const arr of own.values()) owned += arr.length;
  parentPort!.postMessage({ type: "ready", workerId: data.workerId, owned });

  // Wavefront loop keyed on CTRL.SEQ (monotonic generation), NOT CTRL.LEVEL.
  // LEVEL values repeat every tick (deepest→root reuses 7..0), so waiting on
  // LEVEL lets a lagging worker wake on a STALE/FUTURE level and ack the wrong
  // generation (the race that let the orchestrator read unwritten rows). SEQ
  // never repeats, so each worker processes each generation exactly once, in
  // order. Workers owning nothing at a level skip it WITHOUT decrementing
  // PENDING (main sets PENDING to the count of OWNING workers only).
  let lastSeq = 0;
  for (;;) {
    if (Atomics.load(ctrl, CTRL.RUN) === 0) break;
    const seq = Atomics.load(ctrl, CTRL.SEQ);
    if (seq === lastSeq) {
      Atomics.wait(ctrl, CTRL.SEQ, seq); // sleep until the next generation
      continue;
    }
    // A new generation. Advance our cursor to it (workers may legitimately
    // skip generations for levels they don't own, but they process the SEQ
    // stream strictly in order — main never has two generations open at once).
    lastSeq = seq;
    const level = Atomics.load(ctrl, CTRL.LEVEL);
    const myNodes = own.get(level);
    if (!myNodes || myNodes.length === 0) {
      continue; // own nothing at this level: no compute, no PENDING decrement
    }

    for (const fn of myNodes) {
      const childFields = fn.childIndices.map((ci) => nodeRow(fields, ci));
      const out = computeNodeShared(toRef(fn, fields), childFields);
      // Commit: prevField ← current row, then write field + coherence + energy
      // into the row so the main thread can write back FULL node state.
      const node = fn.node as unknown as { _previousField: Float64Array | null };
      const row = nodeRow(fields, fn.index);
      node._previousField = new Float64Array(row);
      row.set(out.field);
      const base = fn.index * (FIELD_SIZE + 2);
      fields[base + OFF_COHERENCE] = out.coherence;
      fields[base + OFF_ENERGY] = out.energyDensity;
    }

    // Decrement PENDING; only the worker that zeroes it posts a done-ack,
    // tagged with the seq it completed so the orchestrator ignores stale acks.
    const remaining = Atomics.sub(ctrl, CTRL.PENDING, 1);
    if (remaining === 1) {
      Atomics.notify(ctrl, CTRL.PENDING);
      parentPort!.postMessage({ type: "levelDone", seq, level });
    }
  }

  parentPort!.postMessage({ type: "halted", workerId: data.workerId });
}

if (parentPort && workerData) {
  run();
}
