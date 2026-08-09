// RHUFT Mind — Phase 5 sandbox v2: correct reverse-lookup measurement.
//
// v1 §5 was confounded: it bundled triples whose fillers overlapped the probe
// candidate set, so each role read surfaced a foreign filler. That is a
// methodology bug, not an algebra bug. Reverse lookup done RIGHT: given
// subject + object, unbind the bundle by each candidate role key and ask WHICH
// role's recovered direction actually matches the known object. Clean roles.
//
// Run: node --experimental-strip-types tests/lexicon-triples-sandbox2.mjs

import { atom, bind, unbind, bundle, similarity } from "../adapters/phasor_field.ts";

function triple(s, r, o) { return bind(bind(atom(s), atom(r)), atom(o)); }
function roleKey(s, r) { return bind(atom(s), atom(r)); }

console.log("=== A. REVERSE LOOKUP: which role links (s, o)? ===");
{
  // bird --has--> wing ; bird --eats--> seeds ; bird --is_a--> animal (DISJOINT fillers)
  const s = "bird";
  const facts = [ ["has", "wing"], ["eats", "seeds"], ["is_a", "animal"] ];
  const B = bundle(facts.map(([r, o]) => triple(s, r, o)));
  const ROLES = ["has", "eats", "is_a", "lives_in", "color"]; // 2 distractors never asserted
  for (const [, o] of [facts[0], facts[1], facts[2]]) {
    // Given (bird, o): score each role by sim(unbind(B, key(s,role)), atom(o)).
    const scored = ROLES.map((r) => ({ r, sim: similarity(unbind(B, roleKey(s, r)), atom(o)) }))
      .sort((a, b) => b.sim - a.sim);
    const trueRole = facts.find(([, fo]) => fo === o)[0];
    console.log(`  (bird, ${o.padEnd(6)}) → top role = ${scored[0].r.padEnd(9)} (sim=${scored[0].sim.toFixed(3)})  correct=${scored[0].r === trueRole}  margin over next=${(scored[0].sim - scored[1].sim).toFixed(3)}`);
  }
}

console.log("\n=== B. FORWARD LOOKUP stays clean with disjoint fillers ===");
{
  const s = "dog";
  const facts = [ ["is_a", "animal"], ["has", "fur"], ["eats", "bone"] ];
  const B = bundle(facts.map(([r, o]) => triple(s, r, o)));
  const FILLERS = ["animal", "fur", "bone", "wing", "seeds", "pond"];
  for (const [r, o] of facts) {
    const rec = unbind(B, roleKey(s, r));
    const best = FILLERS.map((c) => ({ c, sim: similarity(rec, atom(c)) })).sort((a, b) => b.sim - a.sim)[0];
    console.log(`  dog ${r.padEnd(6)} ? → ${best.c.padEnd(7)} (sim=${best.sim.toFixed(3)})  correct=${best.c === o}`);
  }
}

console.log("\n=== C. ROLE SHARING ACROSS SUBJECTS (the graph property) ===");
{
  // The SAME role atom reused across subjects: does a per-subject read stay clean?
  const B = bundle([
    triple("dog", "is_a", "animal"),
    triple("cat", "is_a", "animal"),
    triple("salmon", "is_a", "fish"),
  ]);
  for (const [s, o] of [["dog", "animal"], ["cat", "animal"], ["salmon", "fish"]]) {
    const rec = unbind(B, roleKey(s, "is_a"));
    const best = ["animal", "fish", "wing"].map((c) => ({ c, sim: similarity(rec, atom(c)) })).sort((a, b) => b.sim - a.sim)[0];
    console.log(`  ${s.padEnd(7)} is_a ? → ${best.c.padEnd(7)} (sim=${best.sim.toFixed(3)})  correct=${best.c === o}`);
  }
}
