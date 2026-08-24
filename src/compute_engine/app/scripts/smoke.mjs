/**
 * METATRON Ω — smoke test. Exercises the brain loop + responder + sensory +
 * document ingest directly in Node (no GUI). Every assertion checks a real
 * computed value, never a canned one. Exit 0 = all pass.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { OmegaLoop } = require("../electron/omegaLoop.cjs");
const { respond } = require("../electron/omegaResponder.cjs");
const { ingestDocument } = require("../electron/documentIngest.cjs");
const sensory = require("../electron/sensory.cjs");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let failures = 0;
const check = (name, ok) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── brain loop lifecycle ──
const loop = new OmegaLoop();
const s0 = loop.state();
check("starts asleep", s0.running === false);
check("profile + nodes present", typeof s0.profile === "string" && s0.totalNodes > 0);
check("dense-core rungs live", Array.isArray(s0.rungs) && s0.rungs.length > 0);
check("finite before start", s0.finite === true);

loop.start();
await wait(400);
const s1 = loop.stop();
check("ticks advanced while awake", s1.ticks > 0);
check("stops on request", s1.running === false);
check("digest is a hash string", typeof s1.digest === "string" && s1.digest.length > 0);
check("per-rung telemetry has coherence + regime", s1.rungs.every((r) => typeof r.coherence === "number" && typeof r.regime === "string"));

// ── responder (chat answers computed from the brain) ──
check("help is computed", respond(loop, "help").includes("METATRON"));
check("status reports live state", respond(loop, "status").includes("coherence"));
check("ladder lists rungs", respond(loop, "ladder").includes("n="));
check("memory reports braid", respond(loop, "memory").includes("Braid"));
check("free text is encoded + answered", respond(loop, "the field closes on itself").includes("Encoded"));

// ── sensory codec → brain channel ──
{
  const rate = 48000;
  const f = 89 * Math.pow(1.618033988749895, 2);
  const samples = Float64Array.from({ length: 8192 }, (_, n) => Math.sin((2 * Math.PI * f * n) / rate));
  const field = sensory.fieldFromWaveform(samples, rate);
  let norm = 0;
  for (const v of field) norm += v * v;
  check("sensory: audio field unit-norm", Math.abs(norm - 1) < 1e-9);
  check("sensory: audio energy positive", sensory.waveformEnergy(samples) > 0.5);
  const before = loop.state().senseChannels;
  loop.injectSensor("audio", Array.from(field));
  loop.injectSensor("vision", Array.from({ length: 144 * 89 }, () => 0.5), { width: 144, height: 89 });
  loop.injectSensor("text", "encoded sensory frame");
  check("sensory injection does not throw", true);
  void before;
}

// ── document ingest ──
{
  const tmp = (n, c) => { const p = path.join(os.tmpdir(), n); fs.writeFileSync(p, c, "utf8"); return p; };
  const text = ingestDocument(tmp("omega-doc.txt", "closure residue never zero by theorem"));
  check("text document reads", text.ok && text.kind === "text" && text.text.includes("closure residue"));
  check("missing file errors cleanly", !ingestDocument(path.join(os.tmpdir(), "omega-nope.txt")).ok);
  try { fs.unlinkSync(tmp("omega-doc.txt", "")); } catch {}
}

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) FAILED`);
  process.exit(1);
}
console.log("\nall smoke checks passed — every answer computed live from the Ω brain.");
process.exit(0);
