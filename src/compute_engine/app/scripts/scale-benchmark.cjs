/**
 * METATRON Ω — resolution scale benchmark (Phase 4).
 * Proves the engine stays FINITE + DETERMINISTIC as node count climbs the
 * profile ladder PICO → GRAND (13 → 6765 nodes/rung). Runs the REAL bundle.
 * Run with: node scripts/scale-benchmark.cjs
 */
"use strict";

const O = require("../electron/omega-bundle.cjs");

const profiles = ["PICO", "NANO", "MICRO", "MESO", "MACRO", "GRAND"];
const TICKS = 120;

console.log("RESOLUTION SCALE BENCHMARK — determinism + finiteness + measures");
console.log("profile   nodes    coherence   finite   digest         lyapunov       burden        verdict");

for (const profile of profiles) {
  const run = () => {
    const host = new O.EngineHost({ profile, targetHz: 30 });
    host.start();
    host.declareChannel("text", "text");
    host.pushChannel("text", "the golden ratio closes the torus");
    let now = Date.now();
    for (let i = 0; i < TICKS; i++) { host.pump(now, 33); now += 33; }
    const s = host.snapshot();
    host.stop();
    return s;
  };

  const s = run();
  const s2 = run();
  const det = String(s.digest) === String(s2.digest);
  const coh = Number.isFinite(s.coherenceWarm) ? s.coherenceWarm : s.coherence;
  const finite = s.finite && Number.isFinite(s.energy) && Number.isFinite(s.burden) && Number.isFinite(s.lyapunov);

  console.log(
    profile.padEnd(9),
    String(s.totalNodes).padEnd(9),
    (Number.isFinite(coh) ? coh.toFixed(4) : "—").padEnd(11),
    String(finite).padEnd(8),
    String(s.digest).slice(0, 12).padEnd(16),
    s.lyapunov.toExponential(2).padEnd(15),
    s.burden.toExponential(2).padEnd(14),
    det ? "DETERMINISTIC" : "NON-DETERMINISTIC (FAIL)",
  );
}

console.log("\nGRAND = full dense core at spectral width (topNodes 6765) — the high-resolution tier.");
