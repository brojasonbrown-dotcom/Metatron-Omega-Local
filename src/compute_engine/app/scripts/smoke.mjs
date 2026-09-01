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
const sc_ok = (sc) => sc.census && sc.spectral && sc.energy && sc.flux && sc.verdict;

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
// The enriched live views (additive surfacing).
check("describe view present with rung structure", s1.describe && Array.isArray(s1.describe.rungs) && typeof s1.describe.rungs[0].logRadius === "number");
check("web view present with flux ledger", s1.web && typeof s1.web.turnover === "number" && Array.isArray(s1.web.net));
check("spectral view present with 13-mode signature", s1.spectral && Array.isArray(s1.spectral.signature) && s1.spectral.signature.length === 13);
check("organ snapshot present", s1.organ && typeof s1.organ.organNodes === "number");
check("sensory scan view present (six-section)", s1.scan && sc_ok(s1.scan));
check("sense report present", s1.sense && s1.sense.report && typeof s1.sense.report.loopGain === "number");
check("cognition view present", s1.cognition && Array.isArray(s1.cognition.top) && Array.isArray(s1.cognition.recent));

// ── responder (chat answers computed from the brain) ──
check("help is computed", respond(loop, "help").includes("METATRON"));
check("status reports live state", respond(loop, "status").includes("coherence"));
check("ladder lists rungs", respond(loop, "ladder").includes("n="));
check("web reports flux", respond(loop, "web").includes("Flux web"));
check("spectral reports signature", respond(loop, "spectral").includes("signature"));
check("memory reports braid", respond(loop, "memory").includes("Braid"));
check("mind reports cognition", respond(loop, "mind").includes("Cognition"));
check("learn reports tiers", respond(loop, "learn").includes("Learning tiers"));
check("free text is encoded + answered", respond(loop, "the field closes on itself").includes("Encoded"));

// ── sensory codec → brain channel ──
{
  const rate = 48000;
  const f = 89 * Math.pow(1.618033988749895, 2);
  const samples = Float64Array.from({ length: 8192 }, (_, n) => Math.sin((2 * Math.PI * f * n) / rate));
  const field = sensory.fieldFromWaveform(samples, rate);
  let norm = 0;
  for (const v of field) norm += v * v;
  check("sensory: telemetry codec field unit-norm", Math.abs(norm - 1) < 1e-9);
  check("sensory: audio energy positive", sensory.waveformEnergy(samples) > 0.5);
  // The real path: raw PCM straight into the brain encoder (single transform).
  const ra = loop.injectSensor("audio", samples);
  const rv = loop.injectSensor("vision", Array.from({ length: 144 * 89 }, () => 0.5), { width: 144, height: 89 });
  loop.injectSensor("text", "encoded sensory frame");
  check("raw audio injected + encoded by the brain", ra && ra.energy > 0 && ra.support > 0);
  check("raw vision injected + encoded by the brain", rv && rv.support > 0);
  const sense = loop.state().sense;
  check("sensory plane reports live channels", sense && sense.channels.length >= 3);
  // Ω-P8 — the perceptual grounding surface: present and coherent whether or not
  // a fold has landed yet (the sensory Mind builds on the first active stride).
  const ps = loop.state();
  check("perception surface present", "perception" in ps && typeof ps.perceptConcepts === "number" && typeof ps.perceptNovelty === "number");
}

// ── document ingest ──
{
  const tmp = (n, c) => { const p = path.join(os.tmpdir(), n); fs.writeFileSync(p, c, "utf8"); return p; };
  const text = ingestDocument(tmp("omega-doc.txt", "closure residue never zero by theorem"));
  check("text document reads", text.ok && text.kind === "text" && text.text.includes("closure residue"));
  check("missing file errors cleanly", !ingestDocument(path.join(os.tmpdir(), "omega-nope.txt")).ok);
  try { fs.unlinkSync(tmp("omega-doc.txt", "")); } catch {}
}

// ── llm instrument (OpenRouter / DeepSeek) — OFFLINE checks only: module
// shape and honest refusal paths. No network call is ever made from smoke.
{
  const llm = require("../electron/llmClient.cjs");
  const st = llm.status();
  check("llm: status shape", typeof st.hasKey === "boolean" && typeof st.active === "boolean" && typeof st.provider === "string" && typeof st.model === "string");
  check("llm: starts inactive", st.active === false);
  check("llm: empty key refused", llm.setKey("").ok === false);
  check("llm: bad provider refused", llm.setProvider("nope").ok === false);
  check("llm: empty model refused", llm.setModel("").ok === false);
  if (!st.hasKey) {
    check("llm: activation without key refused", llm.setActive(true).ok === false);
    const r = await llm.ask("ping");
    check("llm: ask without key refused honestly", r.ok === false && /API_KEY/.test(r.error));
  } else {
    check("llm: key present (env) — activation allowed", llm.setActive(true).ok === true && llm.setActive(false).active === false);
  }
}

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) FAILED`);
  process.exit(1);
}
console.log("\nall smoke checks passed — every answer computed live from the Ω brain.");
process.exit(0);
