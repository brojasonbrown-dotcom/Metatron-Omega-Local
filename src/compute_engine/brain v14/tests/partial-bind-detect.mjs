/**
 * PARTIAL-BIND DETECTABILITY — can the phasor cosine kernel find a label that
 * was bound into a concept's semantic channel at a realistic weight?
 *
 * The gate soundness probe (gate-soundness-dspace.mjs) showed the NAIVE bridge
 * fails: a fresh atom(word) vs a lifted encodeText-semantic channel sit at the
 * floor for BOTH bound and unbound words (two orthogonal word encodings). The
 * repair is to bind the SAME canonical D-space word representation into the
 * concept that the gate later measures. But a semantic channel is mostly
 * percept with only a FRACTION w of label — so the gate only works if the
 * cosine kernel surfaces a w-weighted signal above the 1/√D floor.
 *
 * This probe measures exactly that, in pure D-space:
 *   concept = normalize( perceptAtom·(1−w) + wordAtom·w )   for w ∈ {0.05…0.5}
 *   sim(word, concept) should ≈ w·(percept-orthogonality) + w → detectable if > floor + margin
 * and confirms an UNRELATED word stays at the floor at every weight.
 */
import { atom, bundle, similarity, HV_COMPLEX } from "../adapters/phasor_field.ts";

const LAMBDA = 0.3819660112501051;
const FLOOR = 1 / Math.sqrt(HV_COMPLEX);
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

const normalize = (v) => {
  let n = 0; for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1; const out = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
};

// A "dog" percept: a bundle of its sensory attributes (its own atom cloud).
const percept = bundle([atom("furry"), atom("four-legged"), atom("barks"), atom("tail")]);
const word = atom("dog");
const unrelated = ["trampoline", "quasar", "algebra", "soup", "vertex", "bureaucracy"].map(atom);

console.log(`floor 1/√D = ${FLOOR.toFixed(4)}   λ = ${LAMBDA.toFixed(4)}\n`);
console.log("bind-weight w   sim(dog,concept)   maxUnrelated   separable(>λ)?  margin-over-floor");

const weights = [0.05, 0.1, 0.15, 0.2, 0.3, 0.382, 0.5];
let firstSoundW = null;
for (const w of weights) {
  // concept = (1−w)·percept + w·word, renormalized — mirrors a bound semantic channel.
  const concept = normalize((() => {
    const out = new Float64Array(percept.length);
    for (let i = 0; i < out.length; i++) out[i] = percept[i] * (1 - w) + word[i] * w;
    return out;
  })());
  const sWord = similarity(word, concept);
  const sUnrel = unrelated.map((u) => similarity(u, concept));
  const maxUnrel = Math.max(...sUnrel);
  const separable = sWord >= LAMBDA && maxUnrel < LAMBDA;
  if (separable && firstSoundW === null) firstSoundW = w;
  console.log(
    `  w=${w.toFixed(3)}      ${sWord.toFixed(4)}          ${maxUnrel.toFixed(4)}        ${separable ? "YES" : "no"}         +${(sWord - FLOOR).toFixed(3)}`
  );
}

console.log("");
// The operative questions for the gate:
const wBind = 0.382; // MEANING_BIND_WEIGHT — the actual binding strength used.
const conceptBind = normalize((() => {
  const out = new Float64Array(percept.length);
  for (let i = 0; i < out.length; i++) out[i] = percept[i] * (1 - wBind) + word[i] * wBind;
  return out;
})());
const sDog = similarity(word, conceptBind);
const maxUnrelBind = Math.max(...unrelated.map((u) => similarity(u, conceptBind)));
check(`at the real bind weight (w=${wBind}), the bound label clears the unrelated ceiling`, sDog > maxUnrelBind, `${sDog.toFixed(3)} > ${maxUnrelBind.toFixed(3)}`);
check(`at the real bind weight (w=${wBind}), the bound label clears λ`, sDog >= LAMBDA, `${sDog.toFixed(3)} >= λ`);
check(`at the real bind weight, unrelated words stay below λ`, maxUnrelBind < LAMBDA, `max ${maxUnrelBind.toFixed(3)}`);
check("a pre-bind gate is sound at SOME bind weight (separation exists)", firstSoundW !== null, `first sound w = ${firstSoundW}`);

console.log(failures === 0 ? "\n[partial-bind detectability] SOUND — a D-space gate can work" : `\n[partial-bind detectability] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
