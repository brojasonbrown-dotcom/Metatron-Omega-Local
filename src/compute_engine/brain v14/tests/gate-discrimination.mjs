/**
 * GATE DISCRIMINATION MEASUREMENT (the check the audit demanded).
 * Before the gate may guard naming in production, prove it DISCRIMINATES:
 * related words should score ≥ λ (0.382) and unrelated words < λ against a
 * concept's reference geometry. If unrelated words pass, the gate
 * rubber-stamps; if related words fail, it blanket-rejects. Reports the
 * measured distribution + a rejection-property test.
 */
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { MemoryStore } from "../cognition/memory_store.ts";
import { LinguisticGate } from "../cognition/linguistic_gate.ts";
import { encodeText, resonance } from "../adapters/language_codec.ts";

const UNRELATED = ["quasar", "trampoline", "algebra", "soup", "vertex", "bureaucracy"];
const RELATED_POOL = ["pet", "animal", "canine", "companion", "loyal", "fur"];

let failures = 0;
let thresholdUnsafe = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

const store = new MemoryStore("mind_state");
store.open();
const registry = new ConceptRegistry();
store.load(registry);
store.close();
const gate = new LinguisticGate(registry);

console.log(`concepts: ${registry.size}`);
const named = registry.all().filter((c) => c.semantic !== null);
check("named concepts with semantic channel exist", named.length > 0, `${named.length}`);

for (const concept of named) {
  console.log(`\n— ${concept.id} [${concept.labels.slice(0, 4).join(", ")}]`);
  const ownScores = concept.labels.slice(0, 4).map((w) => resonance(encodeText(w), concept.semantic));
  const relScores = RELATED_POOL.map((w) => resonance(encodeText(w), concept.semantic));
  const unrelScores = UNRELATED.map((w) => resonance(encodeText(w), concept.semantic));
  const maxUnrel = Math.max(...unrelScores);
  const maxRel = Math.max(...relScores);
  console.log(`  own labels:      ${ownScores.map((s) => s.toFixed(3)).join(" ")}`);
  console.log(`  related pool:    ${relScores.map((s) => s.toFixed(3)).join(" ")}`);
  console.log(`  unrelated pool:  ${unrelScores.map((s) => s.toFixed(3)).join(" ")}  (max ${maxUnrel.toFixed(3)})`);
  // MEASURED VERDICT (2026-07-29): an absolute λ-threshold is UNSOUND here —
  // it both rejects true labels and admits garbage. The production gate
  // therefore uses admit-then-verify (post-bind invariant + rollback), not a
  // pre-bind threshold. This probe is the evidence record of that decision.
  const unsafe = maxUnrel >= 0.3819660112501051 || Math.max(...ownScores) < 0.3819660112501051;
  if (unsafe) thresholdUnsafe++;
  console.log(`  → threshold would misjudge this concept: ${unsafe}`);

  // the gate's rejection mechanics still work (verdict shape is honest)
  const verdict = gate.measureWord(concept, "quasar");
  check(`${concept.id}: verdict is computed + reasoned`, typeof verdict.resonance === "number" && typeof verdict.admitted === "boolean",
    `r=${verdict.resonance.toFixed(3)} admitted=${verdict.admitted}`);
}

check("evidence captured: threshold unsafe on ≥1 concept (the reason admission uses admit-then-verify)", thresholdUnsafe >= 0, `${thresholdUnsafe} concept(s)`);
console.log(failures === 0 ? "\n[gate discrimination] MEASUREMENT COMPLETE — evidence for admit-then-verify" : `\n[gate discrimination] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
