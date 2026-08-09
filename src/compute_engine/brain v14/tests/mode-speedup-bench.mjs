/**
 * P6-F BENCHMARK — the measured consolidation gain of the learning modes.
 *
 * Epistemic Status: [MEASURED] — every number below is produced by driving the
 * REAL FractalNodeEngine through its REAL deterministic sensory door
 * (engine.process) and the REAL FieldGenome, under each learning mode's policy.
 * NOTHING is asserted: the "speedup" the operator asked about is reported as an
 * honest measured quantity, never a claimed multiplier. If a mode does not beat
 * EFFICIENT, the report says so.
 *
 * WHAT IS MEASURED
 * The mind's only offline-learning levers (P6-D, honest) are:
 *   EFFICIENT — live perception only; no reinjection, no replay.
 *   TRAINING  — + recall→reinjection after stable thoughts.
 *   REPLAY    — + idle genome replay sweeps back through the sensory door.
 * Each lever does extra field-evolution work through the SAME door. So the
 * honest throughput question is: per unit wall-clock, how much STRONGER does
 * the mode bake the target experience into the field's attractor?
 *
 * CONSOLIDATION METRIC (no fabrication, and mode-discriminating)
 * The genome records the live state each tick REGARDLESS of mode, so a metric
 * that reads only the stored genome cannot tell the modes apart. The quantity
 * the MODE genuinely controls is the number of offline consolidation operations
 * — extra engine.process evolutions of remembered experience — applied per
 * unit wall-clock, on top of live perception. That IS the offline-learning
 * throughput the operator asked us to measure. We report, per mode:
 *   - consolidation ops applied (live steps + reinjections + replay sweeps),
 *   - wall-clock ms,
 *   - consolidation ops per second (the honest throughput),
 *   - the measured ratios TRAINING/EFFICIENT and REPLAY/EFFICIENT.
 * A ratio > 1 means the mode consolidates more experience per second than
 * live-only EFFICIENT; ≤ 1 means the offline lever cost more than it bought.
 *
 * RUN: node --experimental-strip-types tests/mode-speedup-bench.mjs
 */
import { performance } from "node:perf_hooks";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FractalNodeEngine } from "../fractal_node_engine.ts";
import { FieldGenome } from "../cognition/field_genome.ts";
import { LearningModeGovernor } from "../cognition/learning_mode.ts";

const PHI_INV = 0.6180339887498949;
const FIELD = 28;

/** Deterministic corpus field: energy concentrated in mode k, no RNG. [SPEC] */
function corpusField(k) {
  const f = new Float64Array(FIELD);
  f[(2 * k) % FIELD] = 1;
  f[(2 * k + 1) % FIELD] = 0.5;
  f[(7 * k + 3) % FIELD] = 0.25;
  return f;
}



/** A DISTINCT interference field, so the target is never trivially freshest. [SPEC] */
function interferenceField(k) {
  const f = new Float64Array(FIELD);
  f[(5 * k + 11) % FIELD] = 0.7;
  f[(3 * k + 17) % FIELD] = 0.4;
  return f;
}

/**
 * Run one mode for `steps` live perceptions against a fresh engine + genome,
 * applying the mode's offline policy each step. Returns measured throughput.
 */
async function runMode(mode, steps, corpusSize) {
  const dir = mkdtempSync(path.join(tmpdir(), "p6f-bench-"));
  try {
    const engine = new FractalNodeEngine({ hardware_adaptive: false, max_depth: 3 });
    engine.initialize();
    const genome = new FieldGenome(dir);
    const governor = new LearningModeGovernor();
    governor.setMode(mode);

    // The target experience: a fixed deterministic corpus.
    const corpus = [];
    for (let k = 0; k < corpusSize; k++) corpus.push(corpusField(k));

    let replaySweeps = 0;
    let reinjections = 0;
    let lastReplayTick = -Infinity;

    const t0 = performance.now();

    for (let tick = 0; tick < steps; tick++) {
      // Interference first: the target is never simply the freshest input.
      await engine.process(interferenceField(tick));
      // LIVE perception: the target experience through the sanctioned door.
      const live = corpus[tick % corpusSize];
      await engine.process(live);
      // Record the tick's consolidated lattice (the mind's genome habit).
      genome.record(tick, engine.snapshot_field_lattice(), engine.get_state().total_nodes);

      // TRAINING lever: recall→reinjection against the live field's memory.
      if (governor.reinjectionEnabled) {
        const recalled = genome.recall(live);
        if (recalled && recalled.similarity >= PHI_INV) {
          await engine.process(recalled.snapshot.lattice);
          reinjections++;
        }
      }

      // REPLAY lever: idle genome sweep through the same door.
      if (governor.mode === "REPLAY") {
        const tele = engine.get_scaling_telemetry();
        const decision = governor.mayReplay({
          tick,
          queuedSensors: 0, // the bench is idle between live perceptions
          depth: tele.depth,
          maxDepth: tele.maxDepth,
          emaTickMs: tele.emaTickMs,
          genomeSize: genome.hotSize + genome.warmSize,
          lastReplayTick,
        });
        if (decision.allow) {
          const latest = genome.latest();
          if (latest) {
            lastReplayTick = tick;
            replaySweeps++;
            await engine.process(latest.lattice);
          }
        }
      }
    }

    const ms = performance.now() - t0;

    // Consolidation ops = every engine.process evolution of experience applied
    // this run: the live perceptions PLUS the mode's offline reinjections and
    // replay sweeps. (The 2 interference+live process calls per tick are the
    // live baseline, identical across modes; the offline lever is the delta.)
    const liveOps = steps * 2;
    const consolidationOps = liveOps + reinjections + replaySweeps;
    const opsPerSec = (consolidationOps / ms) * 1000;

    return {
      mode,
      steps,
      ms,
      liveOps,
      consolidationOps,
      opsPerSec,
      reinjections,
      replaySweeps,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const STEPS = 34; // F₉ — enough ticks for the attractor to consolidate
const CORPUS = 13; // F₇ — a small deterministic experience

const efficient = await runMode("EFFICIENT", STEPS, CORPUS);
const training = await runMode("TRAINING", STEPS, CORPUS);
const replay = await runMode("REPLAY", STEPS, CORPUS);

const ratio = (a, b) => (b.opsPerSec > 0 ? a.opsPerSec / b.opsPerSec : NaN);

console.log("── P6-F measured learning-mode consolidation ─────────────────────────");
for (const r of [efficient, training, replay]) {
  console.log(
    `${r.mode.padEnd(10)} consolidation ops=${String(r.consolidationOps).padStart(3)}  ` +
      `ms=${r.ms.toFixed(1)}  ops/sec=${r.opsPerSec.toFixed(1)}  ` +
      `reinjections=${r.reinjections}  replaySweeps=${r.replaySweeps}`
  );
}
console.log("──────────────────────────────────────────────────────────────────────");
console.log(`measured offline ops  TRAINING   reinjections=${training.reinjections}  replaySweeps=${training.replaySweeps}`);
console.log(`measured offline ops  REPLAY     reinjections=${replay.reinjections}  replaySweeps=${replay.replaySweeps}`);
console.log(`measured speedup  TRAINING/EFFICIENT = ${ratio(training, efficient).toFixed(3)}×  (ops/sec)`);
console.log(`measured speedup  REPLAY/EFFICIENT   = ${ratio(replay, efficient).toFixed(3)}×  (ops/sec)`);
console.log(
  "NOTE: ops/sec is the measured consolidation throughput (engine.process " +
    "evolutions of experience per second). The offline levers ADD work, so a " +
    "raw ops/sec ratio can dip below 1 even as the mode applies MORE total " +
    "consolidation — the honest read is BOTH the op count AND the throughput."
);
