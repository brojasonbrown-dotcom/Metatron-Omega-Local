/**
 * Stability Oracle — measures, for each candidate tree depth, the REAL numbers
 * the governor should use on THIS machine. No modelling, no estimates: every
 * figure below is observed from a live FractalNodeEngine.
 *
 * For each depth it reports:
 *   census        total nodes in the tree (Fibonacci-branching law)
 *   buildMs       wall-clock to construct + initialize the tree
 *   tickMs        steady-state per-tick cost (median of post-warmup ticks)
 *   µs/node       tickMs / census — the true per-node compute cost
 *   rssMB         process resident memory after the run
 *   coherence     mean global coherence over the measured ticks
 *
 * The eigenvalue spectrum of the 7×7 dimensional-stability tensor is computed
 * once per depth from the root node's live field — this is the dimensional-
 * stability signature for that census (positive-definite ⇒ stable structure).
 *
 * Determinism check: at the deepest parallel-eligible depth we also run the
 * serial path and the parallel wavefront side-by-side and report the max
 * per-element field divergence (must be exactly 0 for bit-identity).
 *
 * Run:  node tests/stability_oracle.mjs [maxDepth]
 */

import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { FractalNode } from "../fractal_node.ts";
import { ScaleMapper } from "../scale_mapper.ts";
import { ParallelEngine } from "../parallel/parallel_engine.ts";
import { FIELD_SIZE } from "../parallel/layout.ts";
import { DimensionalStability } from "../DimensionalStability.ts";

const MAX_DEPTH = Number(process.argv[2] ?? 9);
const WARMUP = 4;      // ticks to absorb JIT/first-touch before measuring
const MEASURE = 8;     // ticks timed for the steady-state median

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Aggregate the live tree's per-node observables into the 7-channel FieldState
// the stability tensor expects. Each channel is the per-node series of one real
// observable across the whole census — so the tensor reads the actual field
// population, not a synthetic fill.
function treeFieldState(root) {
  const order = [root];
  for (let h = 0; h < order.length; h++) for (const c of order[h].children) order.push(c);
  const spatial = [], temporal = [], scale = [], phase = [], coherence = [], closure = [], memory = [];
  for (const n of order) {
    const f = n.state.field_state;
    let re2 = 0;
    for (let i = 0; i < f.length; i += 2) re2 += f[i] * f[i] + f[i + 1] * f[i + 1];
    spatial.push(n.state.energy_density);
    temporal.push(n.state.resonance_frequency);
    scale.push(n.scale);
    phase.push(Math.atan2(f[1] ?? 0, f[0] ?? 0));
    coherence.push(n.state.coherence);
    closure.push(Math.sqrt(re2));
    memory.push(n._previousField ? n._previousField[0] : 0);
  }
  return { spatial, temporal, scale, phase, coherence, closure, memory };
}

function eigenSignature(root) {
  try {
    const ds = new DimensionalStability(treeFieldState(root));
    return { ev: ds.eigenvalues, pos: ds.checkPositiveDefinite() };
  } catch (e) {
    return { ev: [], pos: null, err: String(e) };
  }
}

async function measureDepth(depth) {
  const engine = new FractalNodeEngine({
    target_scale: 292,
    max_depth: depth,
    hardware_adaptive: false,   // measure the requested depth, not the capped one
    parallel: true,
  });
  const t0 = performance.now();
  engine.initialize();
  const buildMs = performance.now() - t0;

  const census = engine.get_state().total_nodes;

  // Warmup (JIT + first-touch), then measured ticks.
  for (let i = 0; i < WARMUP; i++) await engine.tick();
  const times = [];
  let cohSum = 0;
  for (let i = 0; i < MEASURE; i++) {
    const t = performance.now();
    const r = await engine.tick();
    times.push(performance.now() - t);
    cohSum += r.coherence;
  }
  const tickMs = median(times);
  const rssMB = process.memoryUsage().rss / 1e6;
  const sig = eigenSignature(engine.get_state().root_node);
  engine.shutdown();

  return {
    depth, census, buildMs, tickMs,
    usPerNode: (tickMs * 1000) / census,
    rssMB, coherence: cohSum / MEASURE, eig: sig,
  };
}

async function determinismCheck(depth) {
  const build = () => {
    const m = new ScaleMapper();
    const r = FractalNode.createAtScale(292, null, m);
    const b = (n) => { if (n.get_depth() >= depth) return; n.create_children(); for (const c of n.children) b(c); };
    b(r); return r;
  };
  const sb = (n) => { for (const c of n.children) sb(c); n.compute(); };
  const idx = (root) => { const o = [root]; for (let h = 0; h < o.length; h++) for (const c of o[h].children) o.push(c); return o; };

  const rootS = build(), rootP = build();
  const nodesS = idx(rootS), nodesP = idx(rootP);
  const pe = new ParallelEngine({ targetScale: 292, maxDepth: depth });
  await pe.initialize(rootP);
  if (!pe.isParallel) { await pe.shutdown(); return { parallel: false, maxDiff: null }; }
  let maxDiff = 0;
  for (let t = 0; t < 4; t++) {
    sb(rootS); await pe.computeTick(); pe.commitToNodes();
    for (let i = 0; i < nodesS.length; i++) {
      const sf = nodesS[i].state.field_state, pf = nodesP[i].state.field_state;
      for (let k = 0; k < FIELD_SIZE; k++) { const d = Math.abs(sf[k] - pf[k]); if (d > maxDiff) maxDiff = d; }
    }
  }
  await pe.shutdown();
  return { parallel: true, maxDiff };
}

console.log(`Stability Oracle — depth sweep 1..${MAX_DEPTH}`);
console.log(`machine: ${(await import("node:os")).cpus().length} threads, ` +
  `${((await import("node:os")).totalmem() / 1e9).toFixed(1)} GB RAM\n`);
console.log(
  "depth  census    buildMs  tickMs    µs/node  rssMB    coherence  eigenPos"
);

const rows = [];
for (let d = 1; d <= MAX_DEPTH; d++) {
  const r = await measureDepth(d);
  rows.push(r);
  console.log(
    `${String(r.depth).padEnd(6)}${String(r.census).padEnd(10)}` +
    `${r.buildMs.toFixed(0).padStart(7)}  ${r.tickMs.toFixed(2).padStart(7)}  ` +
    `${r.usPerNode.toFixed(3).padStart(7)}  ${r.rssMB.toFixed(0).padStart(6)}  ` +
    `${r.coherence.toFixed(5).padStart(9)}  ${r.eig.pos === null ? "  —" : r.eig.pos}`
  );
  // Stop early if a single tick already blows past ~2s steady-state.
  if (r.tickMs > 2000) { console.log(`  … halting sweep: tick cost ${r.tickMs.toFixed(0)}ms exceeds budget`); break; }
}

const deepest = rows[rows.length - 1];
console.log(`\nEigenvalue spectrum @ depth ${deepest.depth} (census ${deepest.census}):`);
console.log("  " + (deepest.eig.ev.length ? deepest.eig.ev.map((e) => e.toExponential(3)).join("  ") : "n/a"));

const det = await determinismCheck(Math.min(deepest.depth, 8));
console.log(`\nDeterminism (serial vs parallel) @ depth ${Math.min(deepest.depth, 8)}: ` +
  (det.parallel ? `maxFieldDiff = ${det.maxDiff}  ${det.maxDiff === 0 ? "✓ BIT-IDENTICAL" : "✗ DIVERGENT"}` : "parallel not engaged"));
