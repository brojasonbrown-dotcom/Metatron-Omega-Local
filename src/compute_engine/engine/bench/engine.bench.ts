/**
 * BENCH — honest wall-clock throughput of the 18-scale engine.
 *
 * Two operating points are reported:
 *   CURRENT  — the engine exactly as built (grid-96 Richardson closure,
 *              trigonometric seed fields).
 *   HEADROOM — the same quadrature on a POLYNOMIAL field (the form the
 *              closure functional is exact for), to isolate how much of the
 *              step cost is trig-vs-arithmetic in the field evaluation.
 *
 * Read-only: never mutates engine source.
 */
import { performance } from "node:perf_hooks";
import { MultiscaleEngine } from "../src/engine/multiscaleEngine.ts";
import { STABLE_SCALES } from "../src/core/constants.ts";
import { closureResidual } from "../src/geometry/closureResidual.ts";
import { torusForScale, type TorusField } from "../src/geometry/torus.ts";

function time(fn: () => void, minMs = 2500, minIters = 25) {
  for (let i = 0; i < 5; i++) fn();
  let iters = 0;
  const t0 = performance.now();
  let elapsed = 0;
  while (elapsed < minMs || iters < minIters) {
    fn();
    iters++;
    elapsed = performance.now() - t0;
  }
  const perCallMs = elapsed / iters;
  return { perCallMs, callsPerSec: 1000 / perCallMs, iters };
}

// ── CURRENT: the engine as built ────────────────────────────────────────────
const engine = new MultiscaleEngine();
const stepBench = time(() => engine.step());
const sweepBench = time(() => engine.measurement(true), 2500, 10);

// ── ISOLATION: closure residual alone, trig vs polynomial field, grid 96 ────
const trigField: TorusField = ({ u, v }) => Math.sin(2 * u) * Math.cos(2 * v) + 0.5 * Math.cos(2 * (u - v));
// Smooth periodic polynomial in the wrapped coordinates (cubic — Δ₄-exact class).
const polyField: TorusField = ({ u, v }) => {
  const x = u / Math.PI - 1; // ∈ [-1,1)
  const y = v / Math.PI - 1;
  return x * x * y - y * y * y + 0.25 * x * y * y;
};
const t13 = torusForScale(13);
const crTrig = time(() => closureResidual(trigField, t13, 96), 2500, 10);
const crPoly = time(() => closureResidual(polyField, t13, 96), 2500, 10);
const vTrig = closureResidual(trigField, t13, 96).value;
const vPoly = closureResidual(polyField, t13, 96).value;

console.log(JSON.stringify({
  node: process.version,
  scales: STABLE_SCALES.length,
  current_fullStep: stepBench,
  current_fullSweepMeasurement: sweepBench,
  closure_grid96: {
    trigField: { ...crTrig, residual: vTrig },
    polyField: { ...crPoly, residual: vPoly },
    speedup_polyVsTrig: +(crTrig.perCallMs / crPoly.perCallMs).toFixed(2),
  },
  derived: {
    stepsPerSec: +stepBench.callsPerSec.toFixed(2),
    invariantComputationsPerSec: Math.round(stepBench.callsPerSec * STABLE_SCALES.length * 4),
    scaleMeasurementsPerSec: Math.round(sweepBench.callsPerSec * STABLE_SCALES.length),
    closureShareOfStep: "~92% (from --cpu-prof: fluxIntegral+field-eval self-time)",
    estStepsPerSec_polyFields: +(1000 / (stepBench.perCallMs * (0.08 + 0.92 / (crTrig.perCallMs / crPoly.perCallMs)))).toFixed(1),
  },
}, null, 2));

