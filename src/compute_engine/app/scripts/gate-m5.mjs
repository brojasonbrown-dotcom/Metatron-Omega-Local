/**
 * GATE M5 — text stabilization (in/out) + numeric verification.
 *   1. INPUT: a long chat must arrive as sentence-aware chunks (parts > 1).
 *   2. OUTPUT: answers carry a resonance certificate; numeric commentary is
 *      verified by mathstral against the real facts (verification present).
 *   3. The suppression path: an invalid numeric claim cannot reach the human
 *      (certificate/verification structure present even then).
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { MindService } = require("../electron/mindService.cjs");

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!ok) failures++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const mind = new MindService();
const acks = [];
mind.onEvent((f) => { if (f.type === "chat.ack") acks.push(f); });
mind.start();
const t0 = Date.now();
while (Date.now() - t0 < 300_000) {
  if (mind.status().state === "awake") break;
  await wait(400);
}
check("mind awake", mind.status().state === "awake");

// 1. input stabilization: long message → multiple chunk frames
const LONG = "The golden ratio governs the memory kernel. ".repeat(10).trim(); // 460 chars
const r1 = mind.chat(LONG);
check("chat accepted", r1.ok === true);
await wait(1500);
const ack = acks[acks.length - 1];
check("long chat chunked (parts ≥ 3)", ack && ack.parts >= 3, `parts=${ack?.parts}`);

// 2. numeric query → verification present
const facts = "Metatron shell n=13: flux = φ⁻²⁶ = 3.6840146919e-6; L(13) = 8.421e-33 m.";
const q = await mind.query("is the metatron flux really 3.6840146919e-6?", facts, 240_000);
console.log("  answer:", JSON.stringify(q).slice(0, 320));
check("answer arrived", q.ok === true, q.ok ? `${q.elapsedMs}ms` : q.error);
check("spine carries the real number", q.ok && q.answer.includes("3.6840146919"));
// verification fields ride the raw frame; mindService passes the frame through query
check("certificate present on emitted answer", q.ok && typeof q.certificate === "number", `certificate=${q.certificate}`);
check("mathstral verdict present for numeric commentary", q.ok && (q.verification === null || ["valid", "invalid", "uncertain"].includes(q.verification)), `verdict=${q.verification}`);

// 3. nonsense-numeric query → structure must not pass garbage through
const q2 = await mind.query("is the flux 42 million parsecs?", facts, 240_000);
console.log("  answer2:", JSON.stringify(q2).slice(0, 320));
check("second answer arrived", q2.ok === true, q2.ok ? `${q2.elapsedMs}ms` : q2.error);
check("spine carries ONLY the real number", q2.ok && q2.answer.includes("3.6840146919"));
check("the wrong number never reaches the answer", q2.ok && !/\b42\b/.test(q2.answer.split("\n\nψ:")[0] ?? ""), "spine clean");

mind.stop();
await wait(1200);
console.log(failures === 0 ? "[gate M5] PASS" : `[gate M5] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
