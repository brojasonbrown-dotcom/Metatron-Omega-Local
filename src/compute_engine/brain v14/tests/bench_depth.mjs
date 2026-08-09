/**
 * RHUFT Engine — Depth / Usage / Parallelism Benchmark Harness
 *
 * Measures the REAL wall-clock cost of the fractal-node engine across the
 * knobs that define "resolution": tree depth, target resource usage, and
 * (Phase 2) worker-pool dispatch mode. No mocks — drives the actual
 * FractalNodeEngine and reports ground-truth numbers so every later phase is
 * a measured decision, not a guess.
 *
 * Why this exists:
 *   The governor's old model claimed 0.057% CPU while a depth-7 tree really
 *   cost ~256 ms/tick. Only measured wall-clock is honest. This harness is
 *   the ruler.
 *
 * Run:  node tests/bench_depth.mjs                 (Node ≥ 25, type-stripping)
 *       node tests/bench_depth.mjs --warm 30 --measure 60
 *
 * Output: one row per config — nodes, depth, warm + steady ms/tick (min/p50/
 * max), peak RSS, and the implied CPU utilisation vs the cadence budget.
 */

import { FractalNodeEngine } from "../fractal_node_engine.ts";

// ── CLI knobs ────────────────────────────────────────────────────────────────
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};
// Warm-up must be long enough for the governor's own EMA (rate φ⁻²) to wash
// out the init spike and settle the tree — ~20 ticks to <1% residual, so 30
// guarantees no rebuild fires inside the measurement window. We then measure
// the STEADY-STATE tree the governor has settled on (read via _treeDepth).
const WARM = arg("warm", 30);       // ticks to warm JIT + let governor settle
const MEASURE = arg("measure", 50); // ticks measured for steady-state stats

const CADENCE_MS = 146; // HardwareGovernor.CADENCE_MS — the cognitive tick budget

// Two measurement modes:
//   raw      — build to exactly `max_depth`, tick with NO warm-up, read _treeDepth.
//              Isolates the engine's pure capability (the governor may shrink
//              mid-run; if actDepth < reqDepth the raw tree was over budget).
//   governed — hardware_adaptive on, warm 30 ticks so the governor settles,
//              then measure the STEADY-STATE tree it chose. This is what the
//              live app actually sustains at a given usage.
const MODE = process.argv.includes("--governed") ? "governed" : "raw";

const DEPTHS = [5, 6, 7];
const USAGES = [0.35, 0.618, 0.9];

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function benchConfig(depth, usage) {
  const governed = MODE === "governed";
  // raw: pin the tree, no adaptive growth. governed: let the governor choose.
  const eng = new FractalNodeEngine({
    target_scale: 292,
    hardware_adaptive: governed,
    max_depth: depth,
    target_resource_usage: usage,
  });

  const rssBefore = process.memoryUsage().rss;
  const tInit0 = performance.now();
  eng.initialize();
  const initMs = performance.now() - tInit0;

  // raw: measure from tick 1 (pure capability). governed: warm so the EMA
  // (rate φ⁻²) and the governor's settle complete BEFORE measuring.
  if (governed) for (let i = 0; i < WARM; i++) eng.tick();

  const times = [];
  for (let i = 0; i < MEASURE; i++) {
    const t0 = performance.now();
    eng.tick();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);

  const rssAfter = process.memoryUsage().rss;
  const st = eng.get_state();
  const nodes = st.total_nodes;
  const actDepth = eng._treeDepth; // honest depth (raw: may have shrunk; governed: settled)

  const p50 = percentile(times, 50);
  const budgetMs = CADENCE_MS * usage;
  // Implied single-thread CPU utilisation vs the budget the governor would
  // enforce at this usage. >100% means the governor would shrink this tree.
  const utilVsBudget = (p50 / budgetMs) * 100;

  return {
    depth,
    actDepth,
    usage,
    nodes,
    initMs,
    p50,
    min: times[0],
    max: times[times.length - 1],
    p95: percentile(times, 95),
    rssMB: (rssAfter - rssBefore) / 1048576,
    budgetMs,
    utilVsBudget,
  };
}

// ── Run ──────────────────────────────────────────────────────────────────────
console.log("RHUFT engine bench — real wall-clock, no mocks");
console.log(`mode=${MODE}  warm=${governedNote()}  measure=${MEASURE}  cadence=${CADENCE_MS}ms\n`);
function governedNote() {
  return MODE === "governed" ? WARM : 0;
}
console.log(
  "req  act  usage  nodes  init(ms)  p50(ms)  p95(ms)  max(ms)  rss(MB)  budget(ms)  util%"
);
console.log("─".repeat(92));

const rows = [];
for (const depth of DEPTHS) {
  for (const usage of USAGES) {
    const r = benchConfig(depth, usage);
    rows.push(r);
    console.log(
      `${String(r.depth).padStart(3)} ${String(r.actDepth).padStart(4)} ${r.usage.toFixed(3)}  ` +
        `${String(r.nodes).padStart(6)} ${r.initMs.toFixed(0).padStart(9)} ` +
        `${r.p50.toFixed(1).padStart(8)} ${r.p95.toFixed(1).padStart(8)} ` +
        `${r.max.toFixed(1).padStart(8)} ${r.rssMB.toFixed(1).padStart(8)} ` +
        `${r.budgetMs.toFixed(0).padStart(10)} ${r.utilVsBudget.toFixed(0).padStart(6)}`
    );
  }
}

// Summary: per usage, the requested depth that produced the largest in-budget tree.
console.log("\n─ stable ceiling per usage (largest settled tree with util% < 100) ─");
for (const usage of USAGES) {
  const ok = rows.filter((r) => r.usage === usage && r.utilVsBudget < 100);
  if (ok.length) {
    const best = ok.reduce((a, b) => (b.nodes > a.nodes ? b : a));
    console.log(
      `  usage ${usage.toFixed(3)}: ${best.nodes} nodes (act depth ${best.actDepth}) at p50 ${best.p50.toFixed(1)}ms`
    );
  } else {
    console.log(`  usage ${usage.toFixed(3)}: none in budget`);
  }
}
