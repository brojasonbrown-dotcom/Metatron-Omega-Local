/**
 * GATE SOUNDNESS MEASUREMENT (D-space) — is a pre-bind λ-gate sound when both
 * sides are lifted into the phasor hypervector space?
 *
 * The 28-field verdict (2026-07-29) was UNSOUND: unrelated words resonated
 * ~0.773 against a concept's semantic channel while a BOUND label ("dog") read
 * only ~0.215 — because encodeText concentrates every word on the same
 * φ-weighted DFT structure (floor) AND φ-decay reinforcement dilutes the bound
 * label below the floor. A λ-threshold straddled both → admit-then-verify.
 *
 * This probe lifts BOTH sides into D-space (liftField for the 28-field semantic
 * channel, encodeSentence for the word) and measures the SAME three classes:
 *   - OWN labels (bound into the semantic channel) — should resonate HIGH.
 *   - RELATED words (semantically near, not bound) — ideally ≥ unrelated.
 *   - UNRELATED words (garbage) — should collapse to the 1/√D floor.
 * A pre-bind gate is SOUND here iff max(unrelated) < λ ≤ min(own-bound-label).
 *
 * Runs against the REAL persisted mind (mind_state) so the semantic channels
 * are the actual fused geometry, then a SYNTHETIC control (a hand-built
 * semantic channel) so the result does not depend on what happens to be saved.
 */
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { MemoryStore } from "../cognition/memory_store.ts";
import { encodeText, resonance as res28 } from "../adapters/language_codec.ts";
import { liftField, encodeSentence, similarity, HV_COMPLEX } from "../adapters/phasor_field.ts";

const LAMBDA = 0.3819660112501051; // φ⁻²
const FLOOR = 1 / Math.sqrt(HV_COMPLEX);
const UNRELATED = ["quasar", "trampoline", "algebra", "soup", "vertex", "bureaucracy"];
const RELATED_POOL = ["pet", "animal", "canine", "companion", "loyal", "fur"];

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

// Lift a 28-field into D-space and compare against a word's D-field.
const simWordToSemantic = (word, semantic28) =>
  similarity(encodeSentence(word), liftField(semantic28));

// ── 1. Synthetic control: a semantic channel that has "dog" bound in ─────────
// semantic28 starts as encodeText("dog"), then φ-reinforced with more labels —
// mirroring bindLabel. We measure the bound label, related, and unrelated words.
console.log("— SYNTHETIC CONTROL (semantic channel built by binding labels) —");
const semDog = (() => {
  // Build a semantic channel the way bindLabel does: start null, reinforce words.
  // First label becomes the channel; subsequent labels φ-blend in.
  let sem = encodeText("dog");
  for (const w of ["animal", "pet"]) {
    // reinforceField: out = old·(1−η) + new·η, η = 1/φ² (re-normalized).
    const eta = LAMBDA;
    const out = new Float64Array(sem.length);
    for (let i = 0; i < sem.length; i++) out[i] = sem[i] * (1 - eta) + encodeText(w)[i] * eta;
    // renormalize
    let n = 0; for (let i = 0; i < out.length; i++) n += out[i] * out[i];
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < out.length; i++) out[i] /= n;
    sem = out;
  }
  return sem;
})();

const synOwn = ["dog", "animal", "pet"].map((w) => simWordToSemantic(w, semDog));
const synRel = ["canine", "companion", "loyal"].map((w) => simWordToSemantic(w, semDog));
const synUnrel = UNRELATED.map((w) => simWordToSemantic(w, semDog));
console.log(`  own (bound):   ${synOwn.map((s) => s.toFixed(3)).join(" ")}`);
console.log(`  related:       ${synRel.map((s) => s.toFixed(3)).join(" ")}`);
console.log(`  unrelated:     ${synUnrel.map((s) => s.toFixed(3)).join(" ")}`);
console.log(`  1/√D floor = ${FLOOR.toFixed(4)}   λ = ${LAMBDA.toFixed(4)}`);
const synMinOwn = Math.min(...synOwn);
const synMaxUnrel = Math.max(...synUnrel);
check("synthetic: unrelated words sit near the floor (< λ)", synMaxUnrel < LAMBDA, `max ${synMaxUnrel.toFixed(3)}`);
check("synthetic: bound labels resonate ABOVE the unrelated ceiling", synMinOwn > synMaxUnrel, `min own ${synMinOwn.toFixed(3)} vs max unrel ${synMaxUnrel.toFixed(3)}`);
check("synthetic: bound labels clear λ (a pre-bind gate admits them)", synMinOwn >= LAMBDA, `min own ${synMinOwn.toFixed(3)} >= λ`);

// ── 2. Real persisted mind: measure against actual fused semantic channels ────
console.log("\n— REAL PERSISTED MIND (mind_state) —");
const store = new MemoryStore("mind_state");
store.open();
const registry = new ConceptRegistry();
store.load(registry);
store.close();
const named = registry.all().filter((c) => c.semantic !== null);
console.log(`  named concepts with a semantic channel: ${named.length}`);
if (named.length > 0) {
  // Aggregate across every named concept: how do own/related/unrelated distribute?
  let allOwn = [], allUnrel = [];
  for (const c of named) {
    const own = c.labels.slice(0, 4).map((w) => simWordToSemantic(w, c.semantic));
    const unrel = UNRELATED.map((w) => simWordToSemantic(w, c.semantic));
    allOwn.push(...own); allUnrel.push(...unrel);
    if (named.indexOf(c) < 4) {
      console.log(`  ${c.id} [${c.labels.slice(0, 3).join(", ")}]: own ${own.map((s) => s.toFixed(3)).join(" ")} | unrel max ${Math.max(...unrel).toFixed(3)}`);
    }
  }
  const ownMin = Math.min(...allOwn), unrelMax = Math.max(...allUnrel);
  console.log(`  AGGREGATE: own min ${ownMin.toFixed(3)}  vs  unrelated max ${unrelMax.toFixed(3)}`);
  check("real mind: unrelated words sit below λ on every named concept", unrelMax < LAMBDA, `max ${unrelMax.toFixed(3)}`);
  check("real mind: bound labels clear the unrelated ceiling (gate can separate)", ownMin > unrelMax, `${ownMin.toFixed(3)} > ${unrelMax.toFixed(3)}`);
  const sound = ownMin >= LAMBDA && unrelMax < LAMBDA;
  console.log(`  → pre-bind λ-gate SOUND on the real mind: ${sound}`);
} else {
  console.log("  (no named concepts persisted — synthetic control is the evidence)");
}

console.log(failures === 0 ? "\n[gate soundness D-space] MEASUREMENT COMPLETE" : `\n[gate soundness D-space] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
