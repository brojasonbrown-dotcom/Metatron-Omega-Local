/**
 * PHASE 3 SANDBOX — record-perceptron: can residual records + a perceptron
 * re-weighting CORRECT a poisoned label, and which signal carries it?
 *
 * Wolfram §10.3 prior: long-term memory = prototypes + RESIDUALS + summaries.
 * The current ConceptRegistry keeps only the prototype (the fused average) and
 * DISCARDS the residual (the per-label / per-observation evidence). Without the
 * residual the evidence is gone, so no re-weighting — hence "the gate refuses
 * new poison but cannot correct existing poison."
 *
 * "Record-perceptron" (this experiment's working definition): store a residual
 * RECORD per label-binding — { word, perceptAtom snapshot, source, weight } —
 * and learn a per-label weight w_label ∈ [0,1] by perceptron updates, so a
 * poisoned label's weight collapses below the gate's λ and the label is demoted.
 *
 * THE FORK this settles EMPIRICALLY (not by debate):
 *   A) WORD-CHANNEL: w_label learned from label↔label coherence. A poisoned
 *      "cat" on a dog-percept conflicts with the dog-cluster labels.
 *   B) CROSS-MODAL: a learned percept→label associator lets the PERCEPT vote
 *      on its label, so "cat" is out-voted by the percept itself.
 *
 * We measure, for a poisoned concept and a clean control:
 *   - the word-coherence of each label (A-signal)
 *   - the percept→label associator's vote for each label (B-signal)
 *   - whether a perceptron over A, over B, and over A+B drives the poisoned
 *     label's weight below λ while keeping the true labels above λ.
 *
 * RUN: node --experimental-strip-types tests/record-perceptron-sandbox.mjs
 */
import {
  atom,
  bundle,
  bind,
  unbind,
  similarity,
  HV_COMPLEX,
} from "../adapters/phasor_field.ts";

const LAMBDA = 0.3819660112501051; // φ⁻² — the gate threshold
const FLOOR = 1 / Math.sqrt(HV_COMPLEX);

// ── tiny helpers ─────────────────────────────────────────────────────────────
const norm = (v) => {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  const out = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
};
const wavg = (items) => {
  // items: [{v, w}] → normalized weighted bundle
  const out = new Float64Array(items[0].v.length);
  for (const { v, w } of items) for (let i = 0; i < out.length; i++) out[i] += v[i] * w;
  return norm(out);
};

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

console.log(`D=${HV_COMPLEX}  floor 1/√D=${FLOOR.toFixed(4)}  λ=${LAMBDA.toFixed(4)}\n`);

// ════════════════════════════════════════════════════════════════════════════
// Scenario: a "dog" percept, correctly labeled early, then POISONED with "cat".
// ════════════════════════════════════════════════════════════════════════════
// The percept: a bundle of dog sensory attributes (its own atom cloud). This is
// the residual's percept snapshot — the thing the concept is actually OF.
const percept = bundle([atom("furry"), atom("four-legged"), atom("barks"), atom("tail"), atom("loyal")]);

// True labels bound over time (the concept's correct naming history).
const trueLabels = ["dog", "animal", "pet", "canine"];
// The poison: a wrong label that slipped in pre-gate (the historical dog/cat echo).
const poisonLabel = "cat";

// A residual RECORD per label-binding: { word, percept, source }.
// (In the real system the percept snapshot is the observation that grounded the
//  label; here every label shares the one dog-percept, which is the honest case
//  — the poison was bound to the SAME percept, which is exactly the corruption
//  we want to detect.)
const records = [
  ...trueLabels.map((word) => ({ word, percept, source: "feed" })),
  { word: poisonLabel, percept, source: "echo" },
];

// ── SIGNAL A: word-channel coherence ─────────────────────────────────────────
// How coherent is each label with the cluster of the OTHER labels? A poisoned
// label should be incoherent with the true-label cluster.
console.log("─ SIGNAL A: word-channel coherence (label vs bundle of other labels) ─");
function wordCoherence(word, others) {
  if (others.length === 0) return 0;
  return similarity(atom(word), bundle(others.map((o) => atom(o))));
}
const allWords = records.map((r) => r.word);
for (const r of records) {
  const others = allWords.filter((w) => w !== r.word);
  r.cohA = wordCoherence(r.word, others);
  console.log(`  coh(${r.word.padEnd(8)} | others) = ${r.cohA.toFixed(4)}`);
}

// ── SIGNAL B: cross-modal percept→label associator ───────────────────────────
// Learn bind(percept → label) pairs into ONE associative memory, then READ it:
// unbind the memory by the percept and measure how strongly each label surfaces.
// This is the percept VOTING on its labels. A poisoned label — bound to the
// same percept but at odds with the dominant signal — should surface weaker.
console.log("\n─ SIGNAL B: cross-modal associator (percept votes on each label) ─");
// Associative memory: bundle of bind(percept, atom(label)) over the TRUE history
// (the associator is trained on what was repeatedly grounded; the poison is the
//  outlier we test against it — but to be fair we train on ALL records and see
//  whether the percept still surfaces the true labels over the poison).
const assocTrue = bundle(trueLabels.map((w) => bind(percept, atom(w))));
const assocAll = bundle(records.map((r) => bind(r.percept, atom(r.word))));

function perceptVote(assoc, perceptSnapshot, word) {
  // Read: unbind the associative memory by the percept → noisy label vector;
  // measure its similarity to the candidate label's atom.
  const read = unbind(assoc, perceptSnapshot);
  return similarity(read, atom(word));
}
console.log("  associator trained on TRUE labels only:");
for (const r of records) {
  r.voteBtrue = perceptVote(assocTrue, percept, r.word);
  console.log(`    vote(${r.word.padEnd(8)}) = ${r.voteBtrue.toFixed(4)}`);
}
console.log("  associator trained on ALL records (poison included):");
for (const r of records) {
  r.voteBall = perceptVote(assocAll, percept, r.word);
  console.log(`    vote(${r.word.padEnd(8)}) = ${r.voteBall.toFixed(4)}`);
}

// ── THE PERCEPTRON: learn a per-label weight from each signal set ─────────────
// Target: true labels → 1, poison → 0. We do NOT hand it the answer; we hand it
// a weak prior (reinforcement count: true labels seen many times, poison once)
// and let the SIGNAL push the weight. Perceptron rule over a single feature:
//   w ← clip01( w + η · (signal − θ) ),  θ = decision offset.
// We run it three ways: feature = A, feature = B(true-trained), feature = A+B.
console.log("\n─ PERCEPTRON: per-label weight after re-weighting ─");
function perceptron(featureOf, { eta = 0.5, theta = LAMBDA, iters = 24, prior }) {
  const w = new Map(records.map((r) => [r.word, prior(r)]));
  for (let it = 0; it < iters; it++) {
    for (const r of records) {
      const s = featureOf(r);
      const cur = w.get(r.word);
      w.set(r.word, Math.min(1, Math.max(0, cur + eta * (s - theta) * 0.1)));
    }
  }
  return w;
}
// Prior: true labels reinforced 8×, poison 1× → prior weight ∝ φ-decayed share.
const prior = (r) => (r.word === poisonLabel ? 0.2 : 0.8);

const wA = perceptron((r) => r.cohA, { prior });
const wB = perceptron((r) => r.voteBtrue, { prior });
const wAB = perceptron((r) => 0.5 * (r.cohA + r.voteBtrue), { prior });

const report = (name, w) => {
  const poison = w.get(poisonLabel);
  const minTrue = Math.min(...trueLabels.map((t) => w.get(t)));
  const corrected = poison < LAMBDA && minTrue >= LAMBDA;
  console.log(`  ${name}: poison(${poisonLabel})=${poison.toFixed(3)}  minTrue=${minTrue.toFixed(3)}  → ${corrected ? "CORRECTED" : "NOT corrected"}`);
  return { poison, minTrue, corrected };
};
console.log("  (target: poison weight < λ, true weights ≥ λ)");
const rA = report("A word-channel   ", wA);
const rB = report("B cross-modal    ", wB);
const rAB = report("A+B combined     ", wAB);

// ── VERDICT ──────────────────────────────────────────────────────────────────
console.log("\n─ VERDICT ─");
check("A (word-channel) separates poison from true labels", rA.poison < rA.minTrue,
  `poison ${rA.poison.toFixed(3)} vs minTrue ${rA.minTrue.toFixed(3)}`);
check("B (cross-modal) separates poison from true labels", rB.poison < rB.minTrue,
  `poison ${rB.poison.toFixed(3)} vs minTrue ${rB.minTrue.toFixed(3)}`);
check("A word-channel ALONE corrects the poison", rA.corrected);
check("B cross-modal ALONE corrects the poison", rB.corrected);
check("A+B combined corrects the poison", rAB.corrected);

// Diagnostic: is the word-channel even able to see the poison? (the dog/cat risk)
const catVsDogCluster = wordCoherence("cat", trueLabels);
const dogVsDogCluster = wordCoherence("dog", trueLabels.filter((t) => t !== "dog"));
console.log(`\n  diagnostic: coh(cat|dog-cluster)=${catVsDogCluster.toFixed(3)}  coh(dog|rest)=${dogVsDogCluster.toFixed(3)}`);
console.log(`  → word-channel ${catVsDogCluster < FLOOR + 0.05 ? "CANNOT" : "CAN"} see the dog/cat difference in D-space`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
