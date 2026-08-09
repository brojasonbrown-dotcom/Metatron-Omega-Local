/**
 * RHUFT v14 — Parallel Engine: Equivalence & Speedup Proof
 *
 * The no-regression gate. Runs the SAME depth-7 tree two ways and asserts the
 * parallel wavefront is bit-for-bit identical to the serial engine, then
 * measures the real speedup.
 *
 *   Serial:   FractalNodeEngine's own _computeBottomUp (node.compute()).
 *   Parallel: ParallelEngine wavefront (workers + SAB).
 *
 * Pass criteria:
 *   1. After N ticks, every node's field is identical (max abs diff == 0).
 *   2. Parallel tick is faster than serial at depth 7 (3401 nodes).
 *
 * Run: node tests/parallel_equivalence.mjs
 */

import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { ROW_SIZE } from "../parallel/layout.ts";

const DEPTH = 7;
const TICKS = 6;
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

function makeEngine() {
  const e = new FractalNodeEngine({
    target_scale: 292,
    hardware_adaptive: false,
    max_depth: DEPTH,
    target_resource_usage: 0.9,
    governor_warmup_ticks: 999, // pin depth-7 (isolate raw compute, not governor)
  });
  e.initialize();
  return e;
}

// Serial bottom-up over the live tree — PURE compute() only, NO stabilize/flow.
// This is the exact apples-to-apples baseline for the parallel wavefront, which
// also runs only compute() (the wavefront does not stabilize; that stays in the
// engine's tick()). Comparing compute-vs-compute isolates the parallel math.
function serialBottomUp(node) {
  for (const child of node.children) serialBottomUp(child);
  node.compute();
}

function indexTree(root) {
  const order = [root];
  for (let h = 0; h < order.length; h++) for (const c of order[h].children) order.push(c);
  return order;
}

// ── Serial run ───────────────────────────────────────────────────────────────
const engSerial = makeEngine();
const rootSerial = engSerial.get_state().root_node;
const nodesSerial = indexTree(rootSerial);
// warm serial JIT, then measure. NOTE: snapshot fields AFTER the measured run
// at the SAME tick count as the parallel run, so both are compared at an
// identical tick boundary (the bug in the first version: mismatched tick counts).
for (let i = 0; i < 3; i++) serialBottomUp(rootSerial);
let t0 = performance.now();
for (let i = 0; i < TICKS; i++) serialBottomUp(rootSerial);
const serialMs = (performance.now() - t0) / TICKS;
const TOTAL_SERIAL_TICKS = 3 + TICKS;
const serialFields = nodesSerial.map((n) => new Float64Array(n.state.field_state));

// ── Parallel run ─────────────────────────────────────────────────────────────
const engPar = makeEngine();
const rootPar = engPar.get_state().root_node;
const nodesPar = indexTree(rootPar);
const pe = new ParallelEngine({ targetScale: 292, maxDepth: DEPTH, poolSize: 12 });
await pe.initialize(rootPar);
check("parallel engine is running the wavefront (not serial fallback)", pe.isParallel);
check("parallel nodeCount = 3401", pe.nodeCount === 3401, `got ${pe.nodeCount}`);

// warm parallel (worker spawn + JIT), then measure. Total ticks must equal the
// serial total so both are compared at the same tick boundary.
await pe.computeTick(); // 1 warm tick
const parWarm = 1;
t0 = performance.now();
for (let i = 0; i < TOTAL_SERIAL_TICKS - parWarm; i++) await pe.computeTick();
const parMs = (performance.now() - t0) / (TOTAL_SERIAL_TICKS - parWarm);

// ── Equivalence: compare SAB fields vs serial node fields (same BFS order) ──
let maxDiff = 0;
let worst = -1;
for (let i = 0; i < nodesSerial.length; i++) {
  const sf = serialFields[i];
  const base = i * ROW_SIZE; // SAB row stride is ROW_SIZE (=30: 28 field + coherence + energy), NOT 28
  for (let k = 0; k < 28; k++) {
    const d = Math.abs(sf[k] - pe._flat.fields[base + k]);
    if (d > maxDiff) {
      maxDiff = d;
      worst = i;
    }
  }
}
check(
  "parallel fields BIT-FOR-BIT identical to serial (3401 nodes × 28)",
  maxDiff === 0,
  maxDiff === 0 ? "maxDiff = 0" : `maxDiff=${maxDiff.toExponential(3)} at node ${worst}`
);

// ── Speedup (steady-state per-tick) ─────────────────────────────────────────
console.log(`\nserial   tick: ${serialMs.toFixed(1)}ms  (${TOTAL_SERIAL_TICKS} ticks)`);
console.log(`parallel tick: ${parMs.toFixed(1)}ms  (${TOTAL_SERIAL_TICKS} ticks, same boundary)`);
console.log(`speedup:       ${(serialMs / parMs).toFixed(2)}x`);
check("parallel is faster at depth 7", parMs < serialMs, `${(serialMs / parMs).toFixed(2)}x`);

await pe.shutdown();

console.log(failures === 0 ? "\nALL CHECKS PASSED ✓" : `\n${failures} CHECK(S) FAILED ✗`);
process.exit(failures === 0 ? 0 : 1);
