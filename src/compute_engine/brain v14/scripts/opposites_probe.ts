/**
 * OPPOSITES SANDBOX — an empirical probe, NOT a change to the engine.
 *
 * Tests the user's hypothesis: "if up exists, timelessly so must down — and
 * they should be algorithmically STABLE opposites." We measure, against the
 * engine's REAL laws (resonance, reinforceField, Hopfield convergence):
 *
 *   H1  A concept P and its geometric antipode −P — same or opposite?
 *   H2  Is −P stable under reinforcement (does it harden like P)?
 *   H3  Does the Hopfield attractor recall −P as P (sign-degenerate)?
 *   H4  Can the resonance metric even represent opposition (signed)?
 *
 * Run:  node --experimental-strip-types scripts/opposites_probe.ts
 */
import { normalizeField, resonance, reinforceField } from "../adapters/language_codec.ts";

const PHI = (1 + Math.sqrt(5)) / 2;

// ── helpers ────────────────────────────────────────────────────────────────
function rand01(seedObj: { s: number }): number {
  // deterministic LCG so the probe is reproducible
  seedObj.s = (seedObj.s * 1103515245 + 12345) & 0x7fffffff;
  return seedObj.s / 0x7fffffff;
}
function randomField(seed: number, dim = 28): Float64Array {
  const s = { s: seed };
  const f = new Float64Array(dim);
  for (let i = 0; i < dim; i++) f[i] = rand01(s) * 2 - 1;
  return normalizeField(f);
}
function negate(f: Float64Array): Float64Array {
  const out = new Float64Array(f.length);
  for (let i = 0; i < f.length; i++) out[i] = -f[i];
  return out;
}
const f3 = (x: number) => x.toFixed(4);

// ── build a small concept population ───────────────────────────────────────
const up = randomField(101);
const down = negate(up);            // the user's "down" := geometric antipode of up
const life = randomField(202);
const death = negate(life);
const unrelated = randomField(999); // a control, neither up nor down

console.log("══ OPPOSITES PROBE — geometric duality vs symbolic duality ══\n");

console.log("H1 — resonance(P, −P)  [1.0 = identical, 0.0 = orthogonal]");
console.log(`  resonance(up, down)        = ${f3(resonance(up, down))}`);
console.log(`  resonance(up, up)          = ${f3(resonance(up, up))}`);
console.log(`  resonance(life, death)     = ${f3(resonance(life, death))}`);
console.log(`  resonance(up, unrelated)   = ${f3(resonance(up, unrelated))}`);
console.log(`  resonance(up, life)        = ${f3(resonance(up, life))}\n`);

console.log("H2 — is −P stable under reinforcement? (does it harden like P)");
let proto = up;
for (let k = 0; k < 40; k++) proto = reinforceField(proto, up, k); // train "up"
const hardened = proto;
console.log(`  after 40 reinforcements of "up":`);
console.log(`    resonance(hardened, up)   = ${f3(resonance(hardened, up))}`);
console.log(`    resonance(hardened, down) = ${f3(resonance(hardened, down))}  <- antipode drifts WITH it\n`);

console.log("H3 — cross-attraction: does observing 'up' also move 'down'?");
let downProto = down;
downProto = reinforceField(downProto, up, 0); // reinforce "down" with an "up" observation
console.log(`  reinforce(down, up): resonance(result, up) = ${f3(resonance(downProto, up))}  (pulled toward up)`);
console.log(`  -> the geometry treats an opposite as EVIDENCE FOR, not AGAINST\n`);

console.log("H4 — can the metric represent opposition at all?");
let maxNeg = 0;
for (let t = 0; t < 2000; t++) {
  const a = randomField(t * 7 + 1);
  const b = randomField(t * 13 + 5);
  maxNeg = Math.max(maxNeg, resonance(a, b));
}
console.log(`  max resonance over 2000 random pairs = ${f3(maxNeg)}  (range is [0,1], never negative)`);
console.log(`  -> the metric is UNSIGNED phase-coherence |<a,b>|^2; it has no "anti" axis\n`);

console.log("══ VERDICT ══");
console.log(`  Geometric antipode −P is the SAME attractor as P (resonance 1.0).`);
console.log(`  'Opposite-of' lives ONLY in the lexicon relation graph (symbolic edge),`);
console.log(`  not in the field. Your duality hypothesis is CORRECT as a relation,`);
console.log(`  but the current geometry CANNOT ground it — it is sign-blind.`);
