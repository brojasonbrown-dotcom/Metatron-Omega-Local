/**
 * RHUFT v14 — Parallel Engine: Orchestrator
 *
 * Drives the shared-memory level wavefront from the main thread. Spawns a pool
 * of persistent node workers, hands them the shared field/control buffers,
 * publishes each level deepest → root, and waits for all workers to ack the
 * level before releasing the next — the determinism barrier (PARALLEL_ENGINE.md
 * §2) that keeps the parallel result bit-for-bit identical to serial.
 *
 * Coordination model:
 *   Workers block on Atomics.wait(CTRL.LEVEL) (allowed in worker threads).
 *   The main thread CANNOT block on Atomics.wait, so workers ack each completed
 *   level with a postMessage; the orchestrator awaits the full set of acks.
 *   SAB carries the field data (zero copy); postMessage carries only signals.
 *
 * Fallback: if workers/SAB are unavailable, or the tree is below the parallel
 * threshold, compute() falls back to the serial bottom-up path — identical
 * output either way.
 *
 * Epistemic Status: [SPEC] — scheduling; all node math lives in node_compute.
 */

import { Worker } from "node:worker_threads";
import { cpus } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { FractalNode } from "../fractal_node.ts";
import {
  CTRL,
  FIELD_SIZE,
  OFF_COHERENCE,
  OFF_ENERGY,
  ROW_SIZE,
  flattenTree,
  nodeFullRow,
  partitionTree,
  type FlatTree,
} from "./layout.ts";
import type { NodeWorkerData } from "./node_worker.ts";

/** Below this many nodes, serial is faster (no dispatch latency). [SPEC] */
const PARALLEL_THRESHOLD = 512;

/** Pool size: min(cores, 12) — leave headroom for the main thread/UI. */
function defaultPoolSize(): number {
  try {
    return Math.max(1, Math.min(cpus().length, 12));
  } catch {
    return 4;
  }
}

export interface ParallelEngineOptions {
  readonly targetScale: number;
  readonly maxDepth: number;
  readonly poolSize?: number;
  /** Force serial even when parallelism is available (testing). */
  readonly forceSerial?: boolean;
}

export class ParallelEngine {
  private readonly _opts: Required<Omit<ParallelEngineOptions, "poolSize">> & { poolSize: number };
  private _flat: FlatTree | null = null;
  private _workers: Worker[] = [];
  private _ready = false;
  private _serial = false;
  private _root: FractalNode | null = null;

  /** Per-level ack accounting: how many nodes each worker owns per level. */
  private _ownCounts: number[][] = []; // [worker][level] → count

  /**
   * Level-barrier waiter: workers postMessage a `levelDone` ack when PENDING
   * hits 0; the main thread resolves the current level's promise. This avoids
   * setImmediate polling (a full event-loop turn × levels × ticks of latency).
   */
  private _levelResolve: (() => void) | null = null;

  constructor(opts: ParallelEngineOptions) {
    this._opts = {
      targetScale: opts.targetScale,
      maxDepth: opts.maxDepth,
      poolSize: opts.poolSize ?? defaultPoolSize(),
      forceSerial: opts.forceSerial ?? false,
    };
  }

  /** True when running the parallel wavefront (vs serial fallback). */
  get isParallel(): boolean {
    return this._ready && !this._serial;
  }

  get nodeCount(): number {
    return this._flat?.nodeCount ?? 0;
  }

  /**
   * Initialise: build the shared layout from the engine's root, spawn workers,
   * and wait for all to report ready. Falls back to serial on any failure.
   *
   * @param root — the live engine root FractalNode (used for serial fallback
   *               and for reading fields back after the wavefront).
   */
  async initialize(root: FractalNode): Promise<void> {
    this._root = root;
    this._flat = flattenTree(root);

    if (this._opts.forceSerial || this._flat.nodeCount < PARALLEL_THRESHOLD) {
      this._serial = true;
      return;
    }

    try {
      await this._spawnWorkers();
      this._ready = true;
    } catch {
      // Any worker failure → serial fallback (identical output).
      this._serial = true;
      this._ready = false;
      await this.shutdown();
    }
  }

  private _spawnWorkers(): Promise<void> {
    const flat = this._flat!;
    const assignments = partitionTree(flat, this._opts.poolSize);
    // ownCounts[w][level] = nodes worker w owns in that level.
    this._ownCounts = assignments.map((owned) => {
      const byLevel: number[] = [];
      for (const fn of owned) byLevel[fn.depth] = (byLevel[fn.depth] ?? 0) + 1;
      return byLevel;
    });

    const workerPath = join(dirname(fileURLToPath(import.meta.url)), "node_worker.ts");

    const readyPromises: Promise<void>[] = [];
    for (let w = 0; w < this._opts.poolSize; w++) {
      const data: NodeWorkerData = {
        workerId: w,
        poolSize: this._opts.poolSize,
        targetScale: this._opts.targetScale,
        maxDepth: this._opts.maxDepth,
        fieldSAB: flat.fieldSAB,
        ctrlSAB: flat.ctrlSAB,
      } as NodeWorkerData;
      const worker = new Worker(workerPath, { workerData: data });
      this._workers.push(worker);
      // Resolve the active level barrier when a worker reports the level done.
      worker.on("message", (m: { type?: string; seq?: number }) => {
        // Only consume the resolver when the ack's seq MATCHES the generation we
        // are awaiting — a stale ack must leave _levelResolve intact so the real
        // ack (or the safety-net poll) can still fire.
        if (m?.type === "levelDone" && this._levelResolve && m.seq === this._awaitSeq) {
          const r = this._levelResolve;
          this._levelResolve = null;
          r();
        }
      });
      readyPromises.push(
        new Promise<void>((resolve, reject) => {
          const onMsg = (m: { type?: string }) => {
            if (m?.type === "ready") {
              worker.off("message", onMsg);
              resolve();
            }
          };
          worker.on("message", onMsg);
          worker.once("error", reject);
        })
      );
    }
    return Promise.all(readyPromises).then(() => undefined);
  }

  /**
   * Compute one tick of the whole tree, in parallel, bottom-up.
   *
   * Publishes each level deepest → root; for each, waits until every node in
   * the level is computed (barrier via CTRL.DONE reaching EXPECTED), then
   * releases the next. After the root completes, the SAB holds every node's
   * new field; read them back into the live nodes via commitToNodes().
   */
  async computeTick(): Promise<void> {
    const flat = this._flat!;
    if (this._serial || !this._ready) {
      this._computeSerialBottomUp(this._root!);
      // Keep the SAB a faithful mirror of the live nodes even in the serial
      // fallback: the workers never run here, so nothing else writes the rows.
      // Preserving the "SAB mirrors live state" invariant in BOTH modes means a
      // later reseed to a larger depth (or any SAB consumer) starts from real
      // data, not the initial seed. [no-regression: rows are write-only here.]
      this._syncSabFromNodes();
      return;
    }

    const ctrl = flat.ctrl;
    for (let level = flat.maxDepth; level >= 0; level--) {
      const nodes = flat.levels[level];
      if (!nodes || nodes.length === 0) continue;

      // PENDING = number of workers owning ≥1 node at this level. Only workers
      // that own the level decrement it, so the barrier trips exactly when all
      // owning workers finish. (ownCounts[w][level] > 0 ⇔ worker w owns it.)
      let pending = 0;
      for (let w = 0; w < this._workers.length; w++) {
        if ((this._ownCounts[w]?.[level] ?? 0) > 0) pending++;
      }

      // Reset the barrier, bump the generation, publish the level, then wake
      // the workers. SEQ is bumped BEFORE workers are notified so any worker
      // that wakes sees the new generation; workers wait on SEQ (not LEVEL),
      // so a lagging worker can never ack a stale/future generation.
      Atomics.store(ctrl, CTRL.PENDING, pending);
      Atomics.store(ctrl, CTRL.LEVEL, level);
      const seq = Atomics.add(ctrl, CTRL.SEQ, 1) + 1;
      Atomics.notify(ctrl, CTRL.SEQ, Number.POSITIVE_INFINITY);

      // Wait for the last owning worker to decrement PENDING → 0 and ack.
      await this._awaitLevel(seq);
    }
  }

  /**
   * Wait for the current level's `levelDone` ack. Workers postMessage it when
   * PENDING reaches 0 — no main-thread polling, so a level hand-off costs one
   * message hop rather than repeated event-loop turns. A conservative
   * Atomics-based poll is kept as a safety net (e.g. a dropped message) but
   * never drives the common path.
   */
  private _awaitLevel(seq: number): Promise<void> {
    const ctrl = this._flat!.ctrl;
    this._awaitSeq = seq;
    // Settle exactly once, whichever path gets there first. PENDING hitting 0 is
    // authoritative (it only reaches 0 when every owning worker of THIS generation
    // decremented), so both the matching ack and the poll are safe resolvers.
    let settled = false;
    const settle = (via: string): void => {
      if (settled) return;
      settled = true;
      this._awaitSeq = null;
      this._levelResolve = null;
      if (this._levelPoll) {
        clearImmediate(this._levelPoll);
        this._levelPoll = null;
      }
      doResolve();
    };
    let doResolve: () => void = () => undefined;

    // Fast path: already done (PENDING hit 0 before we started awaiting).
    if (Atomics.load(ctrl, CTRL.PENDING) <= 0) {
      this._awaitSeq = null;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      doResolve = resolve;
      // The matching ack resolves immediately (one message hop of latency); the
      // handler only calls this when ack.seq === this._awaitSeq.
      this._levelResolve = () => settle("ACK");
      // Safety net: poll PENDING in case the ack message is ever missed.
      const poll = (): void => {
        if (Atomics.load(ctrl, CTRL.PENDING) <= 0) settle("POLL");
        else this._levelPoll = setImmediate(poll);
      };
      this._levelPoll = setImmediate(poll);
    });
  }

  /** The generation the current barrier is awaiting; null when idle. */
  private _awaitSeq: number | null = null;

  /** Handle for the safety-net immediate, so the ack path can cancel it. */
  private _levelPoll: ReturnType<typeof setImmediate> | null = null;

  /**
   * Serial fallback: identical to the engine's bottom-up compute.
   */
  private _computeSerialBottomUp(node: FractalNode): void {
    for (const child of node.children) this._computeSerialBottomUp(child);
    node.compute();
  }

  /**
   * Serial-fallback counterpart to the worker commit: copy each live node's
   * freshly computed state (field + coherence + energy) into its SAB row so
   * the shared buffer mirrors the live tree exactly as it does after a
   * parallel tick. Iterates the flat index map (NOT a tree walk) so every
   * node is written once, in index order. Only ever runs when _serial, so the
   * rows it writes have no concurrent worker readers. [SPEC: same bytes the
   * worker writes — field row, OFF_COHERENCE, OFF_ENERGY.]
   */
  private _syncSabFromNodes(): void {
    const flat = this._flat!;
    for (const level of flat.levels) {
      if (!level) continue;
      for (const fn of level) {
        const node = fn.node as unknown as {
          _state: { field_state: Float64Array; coherence: number; energy_density: number };
        };
        const base = fn.index * (FIELD_SIZE + 2);
        flat.fields.set(node._state.field_state.subarray(0, FIELD_SIZE), base);
        flat.fields[base + OFF_COHERENCE] = node._state.coherence;
        flat.fields[base + OFF_ENERGY] = node._state.energy_density;
      }
    }
  }

  /**
   * After a parallel tick, write each node's committed SAB state back into its
   * live FractalNode so the rest of the engine (stabilize, resonance, global
   * coherence) sees EXACTLY what serial compute() would have produced. This is
   * the full write-back serial does in compute(): field, _previousField,
   * coherence, and energy_density.
   */
  /**
   * Public hook for the engine: re-sync the SAB from the live nodes after any
   * out-of-band mutation of node state (e.g. stabilize() relaxes field_state
   * in place AFTER the parallel tick committed the raw field). Without this,
   * the next tick's workers read the STALE pre-stabilize row for Term 3 while
   * serial reads the relaxed field — a real divergence. No-op in serial mode
   * (already synced inside computeTick).
   */
  syncSabFromNodes(): void {
    if (this._serial || !this._ready || !this._flat) return;
    this._syncSabFromNodes();
  }

  commitToNodes(): void {
    const flat = this._flat!;
    if (this._serial || !this._ready) return; // serial already mutated nodes
    for (const level of flat.levels) {
      if (!level) continue;
      for (const fn of level) {
        const node = fn.node as unknown as {
          _previousField: Float64Array | null;
          _state: {
            scale: unknown;
            field_state: Float64Array;
            coherence: number;
            resonance_frequency: number;
            energy_density: number;
          };
        };
        const row = nodeFullRow(flat.fields, fn.index);
        // Serial compute(): _previousField ← copy of OLD field, then _state
        // gets the NEW field + freshly computed coherence/energy. The worker's
        // SAB row already holds the new field/coherence/energy (bit-identical
        // math), so mirror it here. _previousField is the node's field BEFORE
        // this tick — i.e. the value currently in node._state.field_state.
        node._previousField = new Float64Array(node._state.field_state);
        const newField = new Float64Array(FIELD_SIZE);
        newField.set(row.subarray(0, FIELD_SIZE));
        node._state = {
          ...node._state,
          field_state: newField,
          coherence: row[OFF_COHERENCE],
          energy_density: row[OFF_ENERGY],
        };
      }
    }
  }

  /**
   * Re-seed the parallel layout + workers after the governor rebuilds the tree
   * to a new depth. Mirrors serial semantics (destroy_children + _buildTree
   * discard and recreate node state), so the worker mirror is rebuilt from the
   * FRESH live tree and stays bit-identical. Shuts down the old pool, re-
   * flattens, respawns. Called by FractalNodeEngine.tick() on a depth change.
   */
  async reseed(root: FractalNode, maxDepth: number): Promise<void> {
    await this.shutdown();
    this._flat = null;
    this._root = root;
    (this._opts as { maxDepth: number }).maxDepth = maxDepth;
    this._serial = false;
    await this.initialize(root);
  }

  /** Halt workers and release the pool. */
  async shutdown(): Promise<void> {
    if (this._flat) {
      Atomics.store(this._flat.ctrl, CTRL.RUN, 0);
      // Wake any worker blocked in Atomics.wait on SEQ so it can see RUN=0.
      Atomics.notify(this._flat.ctrl, CTRL.SEQ, Number.POSITIVE_INFINITY);
    }
    if (this._levelPoll) {
      clearImmediate(this._levelPoll);
      this._levelPoll = null;
    }
    this._levelResolve = null;
    // Do NOT await terminate(): a worker blocked in Atomics.wait may not process
    // the exit promptly, and awaiting would stall reseed. Terminate is
    // best-effort; the pool is discarded regardless.
    for (const w of this._workers) w.terminate().catch(() => undefined);
    this._workers = [];
    this._ready = false;
  }
}
