/**
 * PHASOR-FIELD UNIT BATTERY — algebraic contracts of the FHRR core.
 * Run directly:  node tests/phasor-field.mjs
 * Each property is asserted on the LIVE module (no mocks). This battery guards
 * the algebra the whole high-dimensional layer rests on; a red here means the
 * geometry itself is broken, not a tuning issue.
 */
import {
  HV_COMPLEX,
  atom,
  similarity,
  bind,
  unbind,
  bundle,
  permute,
  encodeSentence,
  liftField,
} from "../adapters/phasor_field.ts";
import { encodeText } from "../adapters/language_codec.ts";
import { PHI_NEG2, PHASOR_NOISE_FLOOR } from "../core/constants.ts";

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};
const TOL = 0.05; // 5σ at D=8192 ≈ 0.055; we use a tight-but-safe 0.05 band for "near"

// 1. Atom self-similarity = 1, determinism.
{
  const a = atom("dog");
  const a2 = atom("Dog "); // normalized → same atom
  check("atom: self-similarity is 1", Math.abs(similarity(a, a) - 1) < 1e-9, similarity(a, a).toFixed(6));
  check("atom: normalization is case/space-invariant", Math.abs(similarity(a, a2) - 1) < 1e-9, similarity(a, a2).toFixed(6));
}

// 2. Near-orthogonality of independent atoms (the whole point).
{
  const pairs = [["dog", "trampoline"], ["dog", "quasar"], ["algebra", "soup"], ["vertex", "bureaucracy"]];
  let worst = 0;
  for (const [x, y] of pairs) {
    const s = Math.abs(similarity(atom(x), atom(y)));
    worst = Math.max(worst, s);
  }
  check("atom: independent atoms are near-orthogonal (< 0.05)", worst < 0.05, `worst |sim| = ${worst.toFixed(4)}`);
  check("atom: floor is in the 1/√D regime (not the 28-field's 0.27)", PHASOR_NOISE_FLOOR < 0.02, `1/√D = ${PHASOR_NOISE_FLOOR.toFixed(4)}`);
}

// 3. Bind is dissimilar to both inputs; unbind recovers the filler.
{
  const subj = atom("dog");
  const pred = atom("is-a");
  const obj = atom("animal");
  const sp = bind(subj, pred);
  const triple = bind(sp, obj);
  check("bind: composite is dissimilar to subject", Math.abs(similarity(triple, subj)) < 0.05, similarity(triple, subj).toFixed(4));
  check("bind: composite is dissimilar to object", Math.abs(similarity(triple, obj)) < 0.05, similarity(triple, obj).toFixed(4));
  // recover object: unbind(triple, bind(subj,pred)) ≈ obj
  const recovered = unbind(triple, sp);
  const simObj = similarity(recovered, obj);
  check("unbind: recovers the filler from the triple", simObj > 1 - 0.05, `sim(recovered, animal) = ${simObj.toFixed(4)}`);
  // recovered should be closer to the true object than to a distractor
  const simDistractor = similarity(recovered, atom("trampoline"));
  check("unbind: recovered filler beats a distractor", simObj > simDistractor + 0.5, `obj ${simObj.toFixed(3)} vs distractor ${simDistractor.toFixed(3)}`);
}

// 4. Bundle stays similar to every member; capacity before noise.
{
  const members = ["dog", "cat", "horse", "bird", "fish"].map(atom);
  const concept = bundle(members);
  let minSim = 1;
  for (const m of members) minSim = Math.min(minSim, similarity(concept, m));
  check("bundle: concept stays similar to every member (> 1/√N regime)", minSim > 0.3, `min member sim = ${minSim.toFixed(4)}`);
  const outsider = similarity(concept, atom("trampoline"));
  check("bundle: outsider stays near the floor", Math.abs(outsider) < 0.05, `outsider sim = ${outsider.toFixed(4)}`);
}

// 5. Permute encodes order: different order → different vector; recoverable.
{
  const s1 = encodeSentence("dog bites man");
  const s2 = encodeSentence("man bites dog");
  const simOrder = similarity(s1, s2);
  check("permute: word order changes the sentence vector", simOrder < 0.9, `sim("dog bites man","man bites dog") = ${simOrder.toFixed(4)}`);
  const s1b = encodeSentence("dog bites man");
  check("encodeSentence: deterministic", Math.abs(similarity(s1, s1b) - 1) < 1e-9, similarity(s1, s1b).toFixed(6));
  // shared-word sentences stay more similar than disjoint ones
  const s3 = encodeSentence("dog chases cat");
  const s4 = encodeSentence("quasar bends vertex");
  const shared = similarity(s1, s3);
  const disjoint = similarity(s1, s4);
  check("encodeSentence: shared words > disjoint words", shared > disjoint + 0.1, `shared ${shared.toFixed(3)} vs disjoint ${disjoint.toFixed(3)}`);
}

// 6. JL lift preserves geometry: two 28-fields keep their relative similarity.
{
  const dog28 = encodeText("dog");
  const cat28 = encodeText("cat");
  const tram28 = encodeText("trampoline");
  const dogH = liftField(dog28);
  const catH = liftField(cat28);
  const tramH = liftField(tram28);
  const simRelated = similarity(dogH, catH);
  const simUnrelated = similarity(dogH, tramH);
  check("lift: outputs are unit-norm hypervectors", Math.abs(similarity(dogH, dogH) - 1) < 1e-9, similarity(dogH, dogH).toFixed(6));
  // The lift must not manufacture false similarity between unrelated percepts:
  check("lift: unrelated percepts do NOT collapse to high similarity", simUnrelated < 0.9, `sim(dog,trampoline) lifted = ${simUnrelated.toFixed(4)}`);
  console.log(`  [info] lifted related=${simRelated.toFixed(4)} unrelated=${simUnrelated.toFixed(4)} (28-field was the source of false positives)`);
}

// 7. Dimension contract.
check("dimension: HV_COMPLEX is 2^13 = 8192", HV_COMPLEX === 8192, `${HV_COMPLEX}`);

console.log(failures === 0 ? "\n[phasor-field] ALL GREEN — FHRR core algebra holds" : `\n[phasor-field] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
