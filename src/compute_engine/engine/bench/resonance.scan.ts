/**
 * bench/resonance.scan.ts — the resonance experiment runner.
 *
 * Runs the File-20 ResonanceScanner three ways and prints a comparison:
 *
 *   A. SPECTRAL   — the 13 Lucas lines (the framework's claimed spectrum).
 *   B. ABLATION   — the Lucas lines PLUS matched off-line wavenumbers, so the
 *                   diagnostic `spectralLinesDistinguished` can answer whether
 *                   the Lucas lines specifically are distinguished, or whether
 *                   arbitrary wavenumbers would close/coherence just as well.
 *   C. OFF-LINE   — the off-line wavenumbers alone (the null hypothesis).
 *
 * The off-line set is chosen to BRACKET the Lucas lines (one non-Lucas integer
 * between each adjacent pair of lines, capped at the grid-resolvable range) so
 * the comparison is like-for-like in wavenumber magnitude — a fair ablation,
 * not a strawman of tiny k.
 *
 * Read-only against the engine: imports the scanner, never mutates engine state.
 */
import { performance } from "node:perf_hooks";
import { ResonanceScanner, gridForWavenumber, type ScanResult } from "../src/engine/resonanceScanner.ts";
import { spectralLines } from "../src/core/lucas.js";

/** One non-Lucas integer bracketing each adjacent pair of Lucas lines (≤ 200). */
function offLineWavenumbers(): readonly number[] {
  const lines = spectralLines();
  const out: number[] = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    const mid = Math.floor((lines[i]! + lines[i + 1]!) / 2);
    if (!lines.includes(mid) && mid <= 200) out.push(mid);
  }
  return out;
}

function summarize(label: string, r: ScanResult, ms: number) {
  const d = r.diagnostics;
  console.log(`\n── ${label} ──`);
  console.log(`  cells scanned      : ${d.cellsScanned}  (${ms.toFixed(0)} ms, ${(ms / d.cellsScanned).toFixed(1)} ms/cell)`);
  console.log(`  ignitions (C>φ⁻²)  : ${d.ignitionCount}`);
  console.log(`  most closed        : k=${d.mostClosed.k} δ=${d.mostClosed.delta.toFixed(3)} residual=${d.mostClosed.residual.toExponential(2)}`);
  console.log(`  most coherent      : k=${d.mostCoherent.k} δ=${d.mostCoherent.delta.toFixed(3)} C=${d.mostCoherent.coherence.toFixed(4)}`);
  console.log(`  spectral lines distinguished: ${d.spectralLinesDistinguished === null ? "n/a (no off-line k scanned)" : d.spectralLinesDistinguished}`);
  if (r.resonances.length > 0) {
    console.log(`  resonances (${r.resonances.length}):`);
    for (const res of r.resonances.slice(0, 8)) {
      console.log(`    k=${String(res.k).padEnd(4)} δ=${res.delta.toFixed(3).padEnd(6)} closure=${res.closureScore.toFixed(4)} C=${res.coherence.toFixed(4)}`);
    }
    if (r.resonances.length > 8) console.log(`    … and ${r.resonances.length - 8} more`);
  } else {
    console.log(`  resonances: none detected`);
  }
}

// Show the per-k quadrature grid so the aliasing guard is visible.
console.log("per-k quadrature grid (aliasing guard, ≥4k samples/period):");
for (const k of spectralLines()) {
  console.log(`  k=${String(k).padEnd(4)} grid=${gridForWavenumber(k)}`);
}

const delays = undefined; // default golden bracket {1, φ−1, φ, φ+1, 2φ−1, 2φ}

let t0 = performance.now();
const spectral = new ResonanceScanner({ delays }).scan();
summarize("A — SPECTRAL (13 Lucas lines)", spectral, performance.now() - t0);

const off = offLineWavenumbers();
t0 = performance.now();
const ablation = new ResonanceScanner({ wavenumbers: [...spectralLines(), ...off], delays }).scan();
summarize(`B — ABLATION (lines + ${off.length} off-line: ${off.join(",")})`, ablation, performance.now() - t0);

t0 = performance.now();
const offline = new ResonanceScanner({ wavenumbers: off, delays }).scan();
summarize("C — OFF-LINE (null hypothesis)", offline, performance.now() - t0);

// The headline: the coherence surface as a function of δ, aggregated over k —
// does the golden delay φ stand out against its neighbours?
console.log("\n── coherence by delay δ (mean over scanned k, ablation run) ──");
const byDelta = new Map<number, number[]>();
for (const c of ablation.cells) {
  const arr = byDelta.get(c.delta) ?? [];
  arr.push(c.coherence.value);
  byDelta.set(c.delta, arr);
}
for (const [delta, arr] of [...byDelta.entries()].sort((a, b) => a[0] - b[0])) {
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const bar = "█".repeat(Math.round(mean * 40));
  console.log(`  δ=${delta.toFixed(3).padEnd(6)} ${bar.padEnd(41)} C̄=${mean.toFixed(4)}${delta === (1 + Math.sqrt(5)) / 2 ? "  ← φ" : ""}`);
}
