import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { encodeText } from "../adapters/language_codec.ts";

const reg = new ConceptRegistry();
// Distinct multi-word percepts so the 4 concepts stay separate at mint.
const mk = (anchor, label) => { const o = reg.observe(encodeText(anchor), [], "seed"); reg.bindLabel(o.concept.id, label); };
mk("volcano eruption lava ash magma", "dog");
mk("telescope lens starlight orbit comet", "king");
mk("glacier ice frozen river arctic", "music");
mk("anchor chain harbor rope tide", "physics");
console.log("size =", reg.size);

console.log("\n=== nearestText: RELATED (query has the grounded word) → want correct + HIGH ===");
for (const [q, want] of [
  ["dog", "dog"], ["the dog barks loudly", "dog"],
  ["king", "king"], ["music melody song", "music"], ["physics quantum", "physics"],
]) {
  const t = reg.nearestText(q, 1)[0];
  const got = t?.concept.labels[0] ?? "∅";
  console.log(`  ${got===want?"OK  ":"MISS"} "${q}" → ${got} r=${t?.resonance.toFixed(3)}`);
}
console.log("\n=== nearestText: UNRELATED (no grounded word) → want LOW ===");
for (const q of ["refrigerator","sandwich","bureaucracy","photosynthesis"]) {
  const t = reg.nearestText(q, 1)[0];
  console.log(`      "${q}" → ${t?.concept.labels[0]??"∅"} r=${t?.resonance.toFixed(3)}`);
}
console.log("\n=== nearestText ranking: full order for a related query ===");
console.log("  \"dog puppy bark\" →", reg.nearestText("dog puppy bark",4).map(m=>`${m.concept.labels[0]}:${m.resonance.toFixed(2)}`).join("  "));
