/**
 * GATE SOUNDNESS MEASUREMENT (D-space) — is a pre-bind λ-gate sound when the
 * word and the concept's bound labels live in the phasor hypervector space?
 *
 * The 28-field verdict (2026-07-29) was UNSOUND: unrelated words resonated
 * ~0.773 against a concept's semantic channel while a BOUND label ("dog") read
 * only ~0.215 — because encodeText concentrates every word on the same
 * φ-weighted DFT structure (floor) AND φ-decay reinforcement dilutes the bound
 * label below the floor. A λ-threshold straddled both → admit-then-verify.
 *
 * This probe measures the PRODUCTION gate path (LinguisticGate._dAnchorsOf /
 * measureWord): a word is scored by its MAX similarity over the concept's
 * individual bound-label atoms (its nearest anchor), not against a normalized
 * bundle. That is the geometry that decides what the live mind believes.
 *
 *   - OWN labels (bound) — must read ≈1.0 (their own atom), at ANY label count.
 *     A normalized bundle dilutes this to 1/√n and rejects the concept's own
 *     names past ~4 labels (measured 2026-08-13); anchors do not.
 *   - UNRELATED words (garbage) — must collapse to the 1/√D floor ≈ 0.011
 *     against every anchor, so the gate never admits them.
 * A pre-bind gate is SOUND here iff max(unrelated) < λ ≤ min(own-bound-label).
 *
 * Runs against the REAL persisted mind (mind_state) so the anchors are the
 * actual bound labels, then a SYNTHETIC control (concepts with growing label
 * counts) so the result does not depend on what happens to be saved.
 */
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { MemoryStore } from "../cognition/memory_store.ts";
import { LinguisticGate, GATE_LAMBDA } from "../cognition/linguistic_gate.ts";

const UNRELATED = ["quasar", "trampoline", "algebra", "soup", "vertex", "bureaucracy"];

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

// Build a minimal concept-shaped object the gate can measure: it only needs
// { id, labels } for the anchor path (the 28-field fallback is not exercised).
const mkConcept = (id, labels) => ({ id, labels, semantic: null, prototype: new Float64Array(0) });

// ── 1. Synthetic control: concepts with GROWING label counts ────────────────
// The regression the anchor fix kills: a normalized bundle lets a bound label
// decay below λ as labels accrue. Anchors must hold it at ≈1.0 for every n.
console.log("— SYNTHETIC CONTROL (production anchor path, growing label counts) —");
const gate0 = new LinguisticGate(new ConceptRegistry());
const POOL = ["dog", "cat", "canine", "pet", "animal", "fur", "puppy", "hound"];
let synthOk = true;
for (const n of [1, 2, 3, 4, 6, 8]) {
  const labels = POOL.slice(0, n);
  const c = mkConcept(`syn${n}`, labels);
  const own = labels.map((w) => gate0.measureWord(c, w).resonance);
  const unrel = UNRELATED.map((w) => gate0.measureWord(c, w).resonance);
  const ownMin = Math.min(...own), unrelMax = Math.max(...unrel);
  const admitted = labels.filter((w) => gate0.measureWord(c, w).admitted).length;
  const ok = ownMin >= GATE_LAMBDA && unrelMax < GATE_LAMBDA;
  if (!ok) synthOk = false;
  console.log(
    `  n=${n}: ownMin=${ownMin.toFixed(3)} unrelMax=${unrelMax.toFixed(3)} own admitted=${admitted}/${n}  ${ok ? "ok" : "FAIL"}`
  );
}
check("synthetic: bound labels stay ≥ λ at every label count (no dilution)", synthOk);

// ── 2. Real persisted mind: measure the actual bound labels ─────────────────
console.log("\n— REAL PERSISTED MIND (mind_state) —");
const store = new MemoryStore("mind_state");
store.open();
const registry = new ConceptRegistry();
store.load(registry);
store.close();
const gate = new LinguisticGate(registry);
const named = registry.all().filter((c) => c.labels.length > 0);
console.log(`  named concepts: ${named.length}   λ = ${GATE_LAMBDA.toFixed(4)}`);
if (named.length > 0) {
  let ownMin = Infinity, unrelMax = -Infinity, sepAll = true, ownClearAll = true, unrelCleanAll = true;
  for (const c of named) {
    const own = c.labels.map((w) => gate.measureWord(c, w));
    const unrel = UNRELATED.map((w) => gate.measureWord(c, w));
    const cOwnMin = Math.min(...own.map((v) => v.resonance));
    const cUnrelMax = Math.max(...unrel.map((v) => v.resonance));
    ownMin = Math.min(ownMin, cOwnMin);
    unrelMax = Math.max(unrelMax, cUnrelMax);
    if (!(cOwnMin > cUnrelMax)) sepAll = false;
    if (!(cOwnMin >= GATE_LAMBDA)) ownClearAll = false;
    if (unrel.some((v) => v.admitted)) unrelCleanAll = false;
    console.log(
      `  ${c.id} [${c.labels.slice(0, 3).join(", ")}]: ownMin=${cOwnMin.toFixed(3)} unrelMax=${cUnrelMax.toFixed(3)} ` +
      `ownAdmitted=${own.filter((v) => v.admitted).length}/${own.length} unrelAdmitted=${unrel.filter((v) => v.admitted).length}/${unrel.length}`
    );
  }
  console.log(`  AGGREGATE: worst own ${ownMin.toFixed(3)}  vs  worst unrelated ${unrelMax.toFixed(3)}`);
  check("real mind: bound labels clear the unrelated ceiling on every concept", sepAll, `own ${ownMin.toFixed(3)} > unrel ${unrelMax.toFixed(3)}`);
  check("real mind: bound labels clear λ on every concept (gate admits its own names)", ownClearAll, `own min ${ownMin.toFixed(3)} >= λ`);
  check("real mind: the gate never admits an unrelated word", unrelCleanAll, `unrel max ${unrelMax.toFixed(3)} < λ`);
  const sound = sepAll && ownClearAll && unrelCleanAll;
  console.log(`  → pre-bind λ-gate SOUND on the real mind: ${sound}`);
} else {
  console.log("  (no named concepts persisted — synthetic control is the evidence)");
}

console.log(
  failures === 0
    ? "\n[gate soundness D-space] SOUND — production anchor path verified"
    : `\n[gate soundness D-space] FAIL (${failures})`
);
process.exit(failures === 0 ? 0 : 1);
