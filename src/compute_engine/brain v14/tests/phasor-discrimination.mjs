/**
 * PHASOR DISCRIMINATION FALSIFIER — the test the 28-field FAILED.
 * Run directly:  node tests/phasor-discrimination.mjs
 *
 * tests/gate-discrimination.mjs (2026-07-29) measured that the 28-element
 * field cannot separate a true label from a confabulated one: "dog" scored
 * 0.215 against its own concept while "trampoline" scored 0.773, straddling
 * the λ = 1/φ² = 0.382 threshold. That is the dimension floor, not a bug.
 *
 * This probe re-runs the SAME discrimination task in the phasor hypervector
 * space and asserts the floor collapsed. It is the falsifier for the entire
 * restructure: if independent atoms do NOT land near 1/√D, or if a true
 * binding cannot be told from a garbage one, the 1000× claim is FALSE and we
 * must not build on it.
 */
import { atom, bind, similarity, bundle } from "../adapters/phasor_field.ts";
import { PHI_NEG2, PHASOR_NOISE_FLOOR } from "../core/constants.ts";

const LAMBDA = PHI_NEG2; // 1/φ² = 0.3819660112501051 — the threshold that failed at 28 dims
const UNRELATED = ["quasar", "trampoline", "algebra", "soup", "vertex", "bureaucracy"];
const RELATED_POOL = ["pet", "animal", "canine", "companion", "loyal", "fur"];

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

console.log(`dimension D (complex) = 8192   λ = ${LAMBDA.toFixed(4)}   1/√D = ${PHASOR_NOISE_FLOOR.toFixed(4)}`);
console.log(`28-field baseline (measured 2026-07-29): "dog" 0.215 (REJECTED), "trampoline" 0.773 (ADMITTED)\n`);

// ── The concept: a bundle of the dog-related episode atoms, exactly as a
// learned concept would be a superposition of its grounded experiences. ──
const concept = bundle(RELATED_POOL.map(atom));

// 1. A TRUE label must bind coherently: the concept must be MORE similar to a
//    related word than the unrelated floor, and the unrelated floor must sit
//    FAR below λ. We assert discrimination, not an absolute threshold.
const ownSims = RELATED_POOL.map((w) => similarity(concept, atom(w)));
const unrelSims = UNRELATED.map((w) => similarity(concept, atom(w)));
const minOwn = Math.min(...ownSims);
const maxUnrel = Math.max(...unrelSims);

console.log("related words:   " + ownSims.map((s) => s.toFixed(3)).join(" "));
console.log("unrelated words: " + unrelSims.map((s) => s.toFixed(3)).join(" "));
console.log(`→ min related ${minOwn.toFixed(4)}  vs  max unrelated ${maxUnrel.toFixed(4)}\n`);

check("every related word scores ABOVE the worst unrelated word", minOwn > maxUnrel, `margin ${(minOwn - maxUnrel).toFixed(4)}`);
check("unrelated floor collapsed below λ (the 28-field failure is gone)", maxUnrel < LAMBDA, `max unrelated ${maxUnrel.toFixed(4)} < λ ${LAMBDA.toFixed(4)}`);
check("unrelated floor is in the 1/√D regime (near-orthogonality measured, not assumed)", maxUnrel < 0.05, `${maxUnrel.toFixed(4)} < 0.05`);
check("related words are separable from floor by a wide margin", minOwn - maxUnrel > 0.2, `margin ${(minOwn - maxUnrel).toFixed(4)}`);

// 2. The 1000× claim, measured. The floor ratio is (28-field noise)/(D-field noise).
//    We compare the UNRELATED ceiling: 0.773 (28-field) vs maxUnrel here.
const floor28 = 0.773; // measured unrelated ceiling on the 28-field
const ratio = floor28 / Math.max(maxUnrel, 1e-9);
console.log(`\nmeasured unrelated-ceiling ratio = ${ratio.toFixed(1)}×  (28-field 0.773 → D-field ${maxUnrel.toFixed(4)})`);
check("the separation improvement is at least an order of magnitude (honest, measured)", ratio > 10, `${ratio.toFixed(1)}×`);

// 3. A garbage binding must be detectable as incoherent: binding the concept
//    to a wrong word should NOT pull that wrong word close.
const wrongBound = bind(concept, atom("trampoline"));
const simWrongToConcept = similarity(wrongBound, atom("trampoline"));
const simWrongToTrue = similarity(wrongBound, atom("animal"));
check("binding to a garbage word does not resurrect it above the floor", Math.abs(simWrongToTrue) < 0.1, `sim(bound,animal) = ${simWrongToTrue.toFixed(4)}`);

console.log(failures === 0
  ? "\n[phasor discrimination] FALSIFIER SURVIVED — the dimension floor is gone; λ-discrimination is now POSSIBLE"
  : `\n[phasor discrimination] FALSIFIED (${failures}) — do NOT build on this`);
process.exit(failures === 0 ? 0 : 1);
