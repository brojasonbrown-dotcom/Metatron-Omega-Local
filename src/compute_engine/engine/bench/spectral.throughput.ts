/**
 * BENCH — spectral scan throughput: how many times per second THIS hardware
 * can read the field through the certified multidimensional Fourier sense.
 *
 * Operating points, from raw scan to the full tape frame the mind consumes:
 *   RAW       — spectrumND + powerSpectrum + complexityFromPower on a synthetic
 *               structured lattice, at a ladder of resolutions
 *               (nodes × 28, the brain's native grid shape, ascending).
 *   TAPE      — the brain's own spectralEnrichmentFromLattice (telemetry_tape),
 *               the exact function a live `engine.fourier` frame uses.
 *   SUSTAINED — 144-node (the live brain size) tape reads back-to-back, to
 *               expose throttling/GC under continuous scanning.
 *
 * Read-only: never mutates engine or brain source. Deterministic field
 * construction (fixed-prime sinusoid superposition — no RNG, no clock input).
 */
import { performance } from "node:perf_hooks";
import { spectrumND, powerSpectrum } from "../src/analysis/spectralND.ts";
import { complexityFromPower } from "../src/analysis/complexityProbe.ts";
import { spectralEnrichmentFromLattice } from "../../brain v14/cognition/telemetry_tape.ts";

const FIELD = 28; // the locked field contract width (brain v14)

/** A structured, deterministic lattice: three incommensurate modes per axis. */
function makeLattice(nodes: number): Float64Array {
  const out = new Float64Array(nodes * FIELD);
  for (let n = 0; n < nodes; n++) {
    for (let c = 0; c < FIELD; c++) {
      out[n * FIELD + c] =
        Math.sin((2 * Math.PI * 3 * n) / nodes) * Math.cos((2 * Math.PI * 2 * c) / FIELD) +
        0.5 * Math.sin((2 * Math.PI * 7 * n) / nodes + (2 * Math.PI * 5 * c) / FIELD) +
        0.25 * Math.cos((2 * Math.PI * 11 * n) / nodes - (2 * Math.PI * c) / FIELD);
    }
  }
  return out;
}

function time(fn: () => void, minMs = 700, minIters = 7) {
  for (let i = 0; i < 3; i++) fn(); // warm the JIT
  let iters = 0;
  const t0 = performance.now();
  let elapsed = 0;
  while (elapsed < minMs || iters < minIters) {
    fn();
    iters++;
    elapsed = performance.now() - t0;
  }
  const perCallMs = elapsed / iters;
  return { perCallMs: +perCallMs.toFixed(4), scansPerSec: +(1000 / perCallMs).toFixed(1), iters };
}

// ── RAW: certified n-D FFT scan, ascending resolutions ──────────────────────
const rawLadder: Record<string, unknown> = {};
for (const nodes of [16, 32, 64, 144, 256, 512, 1024]) {
  const lattice = makeLattice(nodes);
  const r = time(() => {
    const spec = spectrumND(lattice, [nodes, FIELD]);
    complexityFromPower(powerSpectrum(spec));
  });
  rawLadder[`${nodes}x${FIELD}`] = { ...r, elements: nodes * FIELD };
}

// ── TAPE: the brain's own whole-tree enrichment (what a frame carries) ──────
const tapeLadder: Record<string, unknown> = {};
for (const nodes of [16, 64, 144, 256]) {
  const lattice = makeLattice(nodes);
  const r = time(() => spectralEnrichmentFromLattice(lattice));
  tapeLadder[`${nodes}x${FIELD}`] = { ...r, elements: nodes * FIELD };
}

// ── SUSTAINED: the live brain's grid, hammered ───────────────────────────────
const live = makeLattice(144);
const sustain = time(() => spectralEnrichmentFromLattice(live), 3000, 50);

console.log(JSON.stringify({
  node: process.version,
  raw_spectrumND_scan: rawLadder,
  tape_spectralEnrichment: tapeLadder,
  sustained_144x28: sustain,
}, null, 2));
