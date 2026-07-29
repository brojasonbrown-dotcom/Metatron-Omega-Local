/**
 * GATE M3 — the grounded-answer path, end to end (real mind, real phi).
 * Starts the actual v14 mind via MindService, asks a question the engine can
 * ground, and asserts the answer (a) ARRIVES synchronously, (b) is
 * non-generic (references the grounded context — not "something unnamed").
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { MindService } = require("../electron/mindService.cjs");

const mind = new MindService();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};

mind.onEvent((f) => {
  if (f.type === "boot" || f.type === "mind.log") console.log("  ·", JSON.stringify(f).slice(0, 130));
});

console.log("[gate M3] starting mind (phi may need a warm-up)…");
mind.start();
const t0 = Date.now();
while (Date.now() - t0 < 300_000) {
  if (mind.status().state === "awake") break;
  await wait(500);
}
check("mind awake", mind.status().state === "awake");

const facts = [
  "Metatron shell n=13: flux = φ⁻²⁶ = 3.6840146919e-6; L(13) = 8.421e-33 m.",
  "Stable ladder: 18 dense rungs; stability ⇔ Lₙ ≡ ±1 (mod 13).",
].join("\n");

console.log("[gate M3] querying…");
const q = await mind.query("what is the metatron shell and why does it matter?", facts, 180_000);
console.log("  answer:", JSON.stringify(q).slice(0, 400));
check("answer arrived", q.ok === true, q.ok ? `${q.elapsedMs}ms` : q.error);
if (q.ok) {
  check("answer is non-trivial", q.answer.length > 40, `${q.answer.length} chars`);
  // FACT-SPINE: the verbatim computed numbers MUST be present (deterministic core)
  check("spine carries φ⁻²⁶ verbatim", q.answer.includes("3.6840146919"));
  check("spine carries L(13) verbatim", q.answer.includes("8.421e-33"));
  const grounded = q.grounded ?? [];
  check("grounded labels deduped", new Set(grounded).size === grounded.length, grounded.join(","));
}

mind.stop();
await wait(1500);
console.log(failures === 0 ? "[gate M3] PASS" : `[gate M3] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
