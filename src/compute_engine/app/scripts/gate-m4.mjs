/**
 * GATE M4 — dictionary-quality learning.
 * Phase A (unit): ConceptGlossary learn → persist → restore, validation,
 *   corrupt-file quarantine.
 * Phase B (integration): pre-seed one meaning through the REAL glossary API,
 *   boot the mind, query — the answer must come from the DICTIONARY
 *   (source "glossary", zero LLM latency), not from phi.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const require = createRequire(import.meta.url);
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

// ── Phase A: unit ──
const { ConceptGlossary } = await import("../../brain v14/cognition/glossary.ts");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "glossary-"));
const g1 = new ConceptGlossary(tmp);
g1.learn({ conceptId: "c1", definition: "A dog is a domesticated canid companion animal.", related: ["dog", "canid"], source: "define", confidence: 0.8 });
g1.learn({ conceptId: "c2", definition: "Cats relate to dogs as fellow household companions.", related: ["cat", "dog"], source: "relate", confidence: 0.7 });
check("learn + size", g1.size === 2);
const g2 = new ConceptGlossary(tmp);
const lr = g2.load();
check("persist + restore across instances", lr.ok && lr.restored === 2 && g2.get("c1")?.definition.includes("domesticated canid"));
let threw = 0;
try { g2.learn({ conceptId: "c3", definition: "", related: [], source: "define", confidence: 0.5 }); } catch { threw++; }
try { g2.learn({ conceptId: "c3", definition: "x", related: [], source: "define", confidence: 1.5 }); } catch { threw++; }
check("validation: empty definition + bad confidence rejected", threw === 2);
fs.writeFileSync(path.join(tmp, "glossary.json"), "{not json");
const g3 = new ConceptGlossary(tmp);
const lq = g3.load();
check("corrupt file quarantined honestly", lq.ok === false && typeof lq.quarantined === "string" && g3.size === 0);
fs.rmSync(tmp, { recursive: true, force: true });

// ── Phase B: integration (real mind, dictionary-first) ──
// Seed the meaning on the concept that ACTUALLY answers "dog" today
// (concept ids are per-machine — look up the top match, never assume it).
const BRAIN_DIR = path.resolve(import.meta.dirname, "../../brain v14");
const BRAIN_STATE = path.join(BRAIN_DIR, "mind_state");
const { ConceptRegistry } = await import("../../brain v14/cognition/concept_registry.ts");
const { MemoryStore } = await import("../../brain v14/cognition/memory_store.ts");
const { encodeText } = await import("../../brain v14/adapters/language_codec.ts");
const store = new MemoryStore(BRAIN_STATE);
store.open();
const registryProbe = new ConceptRegistry();
store.load(registryProbe);
store.close();
const top = registryProbe.nearest(encodeText("dog"), 1)[0];
check("a 'dog' concept exists to seed on", !!top, top ? `${top.concept.id} @ ${top.resonance.toFixed(3)}` : "none");
const seed = new ConceptGlossary(BRAIN_STATE);
seed.learn({
  conceptId: top.concept.id,
  definition: "A dog is a domesticated canid companion animal, loyal and trainable.",
  related: ["dog", "canid", "companion"],
  source: "define",
  confidence: 0.8,
});
console.log(`  seeded meaning on ${top.concept.id} (via the glossary API)`);

const { MindService } = require("../electron/mindService.cjs");
const mind = new MindService();
mind.start();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (Date.now() - t0 < 300_000) {
  if (mind.status().state === "awake") break;
  await wait(400);
}
check("mind awake", mind.status().state === "awake");

const q = await mind.query("dog", "", 120_000);
console.log("  answer:", JSON.stringify(q).slice(0, 300));
check("dictionary-first answer", q.ok === true && q.answer.includes("domesticated canid"), q.ok ? `source path hit` : q.error);
check("zero LLM latency on learned words (elapsedMs 0 or tiny)", q.ok && (q.elapsedMs === 0 || q.elapsedMs === undefined || q.elapsedMs < 1000), `elapsedMs=${q.elapsedMs}`);

mind.stop();
await wait(1200);
console.log(failures === 0 ? "[gate M4] PASS" : `[gate M4] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
