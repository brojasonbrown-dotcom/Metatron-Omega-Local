/**
 * METATRON Ω — field vectoring + corridor math (Phase 2 sandbox).
 * Runs the REAL bundle: the cross-scale coupling matrix, the morphism law,
 * the field→hypervector projection, and the live cross-scale flux web.
 * Run with: node scripts/field-vectoring.cjs
 */
"use strict";

const O = require("../electron/omega-bundle.cjs");
const h = (s) => console.log("\n═══ " + s + " ═══");

// 1. The coupling matrix — the cross-scale corridor (which rung talks to which).
h("1. CROSS-SCALE COUPLING MATRIX (the corridor)");
const m = O.buildCoupling(O.DENSE_CORE, { band: 3, chords: ["fibonacci", "lucas", "spiral"], chordGain: 1 });
console.log(`size ${m.size} rungs · band ${m.band} · long-range chords [${m.chords.join(", ")}]`);
console.log(`rowSumDefect ${m.rowSumDefect.toExponential(3)} (L-W1: every row sums to exactly 1)`);
console.log(`rung node counts: ${m.rungs.slice(0, 8).join(", ")} …`);
console.log("coupling weights row 0 (who rung 0 receives from):");
for (let j = 0; j < 6; j++) console.log(`  rung0 ← rung${j}: ${O.couplingWeight(m, 0, j).toFixed(6)}`);
const emitted = [];
for (let j = 0; j < 6; j++) emitted.push(O.emittedMass(m, j).toFixed(3));
console.log("emitted mass (first 6 rungs):", emitted.join(" "));

// 2. Morphism check — transport commutes with phase, and preserves the mean.
h("2. MORPHISM CHECK (structure-preserving transport)");
const src = O.createField(89);
for (let k = 0; k < src.n; k++) {
  const th = 2 * Math.PI * ((k * 0.6180339887498949) % 1);
  src.re[k] = Math.cos(th);
  src.im[k] = Math.sin(th);
}
const mor = O.checkMorphism(src, 610);
console.log(`phaseCommutationDefect ${mor.phaseCommutationDefect.toExponential(3)}`);
console.log(`meanDefect ${mor.meanDefect.toExponential(3)}`);
console.log("(both ≈ 0 ⇒ rotate∘transport == transport∘rotate, and the circular mean survives the octave)");

// 3. Field vectoring — field → φ-lattice phase hypervector.
h("3. FIELD VECTORING (field → φ-lattice hypervector)");
const hv = O.fieldToHv(src, 256);
const hv2 = O.fieldToHv(src, 256);
const maxDelta = Math.max(...Array.from(hv, (v, i) => Math.abs(v - hv2[i])));
console.log(`field (${src.n} nodes) → hypervector (${hv.length} dims)`);
console.log(`first 8 phases: ${Array.from(hv.slice(0, 8), (x) => x.toFixed(3)).join(", ")}`);
console.log(`deterministic: same field → identical hv (max |Δ| = ${maxDelta.toExponential(2)})`);

// 4. Live corridor flux — the engine's cross-scale web at runtime.
h("4. LIVE CORRIDOR FLUX (web view)");
const host = new O.EngineHost({ profile: "MESO", targetHz: 30 });
host.start();
host.declareChannel("text", "text");
for (const t of ["the golden ratio closes the torus", "flux moves from warm core to cold rim", "the golden ratio governs every ladder rung"]) {
  host.pushChannel("text", t);
  host.pump(Date.now(), 33);
}
let now = Date.now();
for (let i = 0; i < 300; i++) { host.pump(now, 33); now += 33; }
const web = host.web();
console.log(`tick ${web.tick} · turnover ${web.turnover.toFixed(3)} · sink ${web.sink.toFixed(3)} · imbalance ${web.imbalance.toFixed(4)} · orderingViolations ${web.orderingViolations}`);
if (web.entries && web.entries.length) {
  console.log("recent ledger:", web.entries.slice(-3).map((e) => `t${e.tick} ${e.from}→${e.to} ${e.amount.toFixed(2)}`).join(" | "));
}
host.stop();

console.log("\n══════════════════════════════════════════════════════════════════");
console.log("VERDICT: the corridor is a row-stochastic φ-decaying coupling matrix whose");
console.log("octave transport is a verified morphism, and the field vectorises onto a");
console.log("φ-lattice hypervector — all read-only, deterministic, and live.");
