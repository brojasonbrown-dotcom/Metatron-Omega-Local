// RHUFT Mind — Phase 5 sandbox: MEASURE FHRR triple bind/unbind recovery.
//
// Question that decides the whole design: for a relational fact
//   T = bind(bind(atom(subj), atom(role)), atom(obj))
// does unbind(T, bind(atom(subj), atom(role))) recover `obj` cleanly enough that
// a closed-set read picks the TRUE filler — and how does that degrade as a
// concept bundles MORE triples? We measure, never assert.
//
// Run: node --experimental-strip-types tests/lexicon-triples-sandbox.mjs

import { atom, bind, unbind, bundle, similarity } from "../adapters/phasor_field.ts";

// ── tiny deterministic vocab ────────────────────────────────────────────────
const SUBJECTS = ["dog", "cat", "bird", "fish", "horse", "tree", "car", "sun"];
const ROLES = ["is_a", "has", "eats", "lives_in", "color", "part_of"];
const FILLERS = ["animal", "mammal", "fur", "seeds", "pond", "red", "leg", "wing", "fin", "leaf", "wheel", "light", "bone", "feather", "root", "engine"];

function triple(s, r, o) { return bind(bind(atom(s), atom(r)), atom(o)); }
function roleKey(s, r) { return bind(atom(s), atom(r)); }

// Closed-set read: unbind the bundle by the role key, score against a candidate set.
function readFiller(bundleVec, s, r, candidates) {
  const rec = unbind(bundleVec, roleKey(s, r));
  const scored = candidates.map((c) => ({ c, sim: similarity(rec, atom(c)) }));
  scored.sort((a, b) => b.sim - a.sim);
  return scored;
}

console.log("=== 1. SINGLE-TRIPLE RECOVERY FIDELITY ===");
{
  // One triple in isolation. Recover the filler; rank against all fillers.
  let top1 = 0, marginSum = 0, n = 0;
  for (const s of SUBJECTS) for (const r of ROLES) for (const o of FILLERS.slice(0, 6)) {
    const T = triple(s, r, o);
    const ranked = readFiller(T, s, r, FILLERS);
    n++;
    if (ranked[0].c === o) top1++;
    const trueSim = ranked.find((x) => x.c === o).sim;
    const bestOther = Math.max(...ranked.filter((x) => x.c !== o).map((x) => x.sim));
    marginSum += trueSim - bestOther;
  }
  console.log(`  top-1 accuracy: ${(100 * top1 / n).toFixed(1)}%  (n=${n})`);
  console.log(`  mean margin (true − best-foreign): ${(marginSum / n).toFixed(4)}`);
}

console.log("\n=== 2. ORTHOGONALITY FLOOR (noise baseline) ===");
{
  // sim of independent atoms should concentrate near 0 with σ≈1/√D.
  let sum = 0, sumSq = 0, n = 0;
  for (let i = 0; i < FILLERS.length; i++) for (let j = i + 1; j < FILLERS.length; j++) {
    const s = similarity(atom(FILLERS[i]), atom(FILLERS[j]));
    sum += s; sumSq += s * s; n++;
  }
  const mean = sum / n, sd = Math.sqrt(sumSq / n - mean * mean);
  console.log(`  atom-atom sim: mean=${mean.toFixed(4)}  σ=${sd.toFixed(4)}  (D=8192 ⇒ 1/√D=${(1 / Math.sqrt(8192)).toFixed(4)})`);
}

console.log("\n=== 3. BUNDLE CAPACITY: recovery vs #triples per concept ===");
{
  // A subject accumulates N triples (distinct roles). Bundle them; recover each.
  for (const N of [1, 2, 3, 5, 8, 13, 21]) {
    const s = "dog";
    const triples = [];
    for (let i = 0; i < N; i++) {
      const r = ROLES[i % ROLES.length] + "_" + i; // distinct role per triple
      const o = FILLERS[i % FILLERS.length];
      triples.push({ r, o, vec: triple(s, r, o) });
    }
    const B = bundle(triples.map((t) => t.vec));
    let top1 = 0, marginSum = 0;
    for (const t of triples) {
      const ranked = readFiller(B, s, t.r, FILLERS);
      if (ranked[0].c === t.o) top1++;
      const trueSim = ranked.find((x) => x.c === t.o).sim;
      const bestOther = Math.max(...ranked.filter((x) => x.c !== t.o).map((x) => x.sim));
      marginSum += trueSim - bestOther;
    }
    console.log(`  N=${String(N).padStart(2)}  top-1=${(100 * top1 / N).toFixed(0)}%  mean margin=${(marginSum / N).toFixed(4)}`);
  }
}

console.log("\n=== 4. ROLE-QUERY CLEANLINESS (right role vs wrong role) ===");
{
  // unbind with the TRUE role key vs a DIFFERENT role key: recovery should collapse.
  const s = "cat", r = "eats", o = "seeds";
  const T = triple(s, r, o);
  const right = similarity(unbind(T, roleKey(s, r)), atom(o));
  const wrongRole = similarity(unbind(T, roleKey(s, "lives_in")), atom(o));
  const wrongSubj = similarity(unbind(T, roleKey("bird", r)), atom(o));
  console.log(`  right (s,r): ${right.toFixed(4)}`);
  console.log(`  wrong role:  ${wrongRole.toFixed(4)}   wrong subject: ${wrongSubj.toFixed(4)}`);
}

console.log("\n=== 5. REVERSE LOOKUP (what role does s have to o?) ===");
{
  // Given subject+object, can we detect WHICH role links them? Probe each role.
  const s = "bird", o = "wing";
  const rs = ["has", "eats", "is_a"];
  const B = bundle(rs.map((r) => triple(s, r, r === "has" ? "wing" : FILLERS[rs.indexOf(r)])));
  for (const r of rs) {
    const rec = unbind(B, roleKey(s, r));
    // score against a small candidate filler set
    const cands = ["wing", FILLERS[rs.indexOf(r)]];
    const best = cands.map((c) => ({ c, sim: similarity(rec, atom(c)) })).sort((a, b) => b.sim - a.sim)[0];
    console.log(`  role=${r.padEnd(6)} best filler=${best.c} (sim=${best.sim.toFixed(4)})`);
  }
}
