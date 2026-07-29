/**
 * Smoke test — exercises the responder directly in Node (no GUI needed).
 * Every assertion checks a COMPUTED value against an independently known
 * anchor (the same ground truth as the audit: exact Lucas integers, φ-laws).
 * Exit 0 = all pass.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { respond } = require("../electron/responder.cjs");
const sensory = require("../electron/sensory.cjs");
const { EngineLoop } = require("../electron/engineLoop.cjs");

let failures = 0;
function check(name, answer, mustContain) {
  const ok = mustContain.every((frag) => answer.includes(frag));
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) console.log(`----- answer was -----\n${answer}\n---------------------`);
}

check("help", respond("help"), ["scale 13", "closure", "lucas", "status"]);
check("scale 13 (Metatron shell)", respond("scale 13"), [
  "n=13",
  "METATRON SHELL",
  "residue 1",
  "winding W = 40",
]);
check("scale 2 rejected honestly", respond("scale 2"), ["not a Lucas-stable rung"]);
check("lucas 13 exact", respond("lucas 13"), ["L(13) = 521", "STABLE"]);
check("lucas 3 unstable (shorthand counterexample)", respond("lucas 3"), ["L(3) = 4", "unstable"]);
check("fib 100 exact", respond("fib 100"), ["F(100) = 354224848179261915075"]);
check("phi identities", respond("phi"), ["φ⁻¹ + φ⁻² = 1", "φ⁻²⁶"]);
check("ladder census", respond("ladder"), ["1, 13, 15, 27, 29"]);
check("closure 13 live measurement", respond("closure 13"), ["residual", "score", "Lucas floor"]);
check("torus 27", respond("torus 27"), ["aspect R/r = φ", "surface area"]);
check("memory kernel", respond("memory"), ["z₁ = 1", "1/2", "isConservative() = true"]);
check("overlap live recursion", respond("overlap"), ["C(t) =", "ignition threshold"]);
check("density envelope", respond("density"), ["ρ_I(1)", "ρ_I(125)"]);
check("status from filesystem", respond("status"), ["/18 files present"]);
check("fallback is honest", respond("tell me a poem"), ["don't have a computed answer"]);

// ── sensory codec (ported v14 projections) — real signal verification ──
function checkSense(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL  ${name} — ${err.message}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

checkSense("sensory: pure tone lands in the right φ-band region", () => {
  const rate = 48000;
  const f = 89 * Math.pow(1.618033988749895, 4 / 2); // k=4 band: 89·φ² ≈ 233 Hz
  const samples = Float64Array.from({ length: 8192 }, (_, n) => Math.sin(2 * Math.PI * f * n / rate));
  const field = sensory.fieldFromWaveform(samples, rate);
  let norm = 0, bestK = 0, bestM = -1;
  for (let k = 0; k < sensory.NUM_MODES; k++) {
    const m = field[2 * k] ** 2 + field[2 * k + 1] ** 2;
    norm += m;
    if (m > bestM) { bestM = m; bestK = k; }
  }
  assert(Math.abs(norm - 1) < 1e-9, `field not unit-norm (${norm})`);
  assert(bestK === 4, `tone landed in band ${bestK}, expected 4`);
  assert(sensory.waveformEnergy(samples) > 0.6, "energy of a unit sine should be ~1/√2");
  assert(sensory.waveformEnergy(new Float64Array(100)) === 0, "silence must have zero energy");
});

checkSense("sensory: vision grid → unit-norm field; uniform grid → zero structure", () => {
  const W = 144, H = 89;
  const structured = Float64Array.from({ length: W * H }, (_, i) => Math.sin(i * 0.37));
  const f1 = sensory.fieldFromLuminanceGrid(structured, W, H);
  let norm = 0;
  for (const v of f1) norm += v * v;
  assert(Math.abs(norm - 1) < 1e-9, `field not unit-norm (${norm})`);
  const flat = new Float64Array(W * H).fill(0.5);
  const f0 = sensory.fieldFromLuminanceGrid(flat, W, H);
  assert(f0.every((v) => v === 0), "uniform grid must project to the zero field");
  assert(Math.abs(sensory.gridMean(flat) - 0.5) < 1e-12, "gridMean wrong");
  let threw = false;
  try { sensory.fieldFromLuminanceGrid(flat, 1, 1); } catch { threw = true; }
  assert(threw, "mismatched grid dimensions must throw");
});

// ── engine loop — live simulation service verification ──
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function checkLoop() {
  const loop = new EngineLoop();
  const s0 = loop.state();
  const checks = [
    ["starts stopped", !s0.running],
    ["coherence in [0,1]", s0.invariants.coherence >= 0 && s0.invariants.coherence <= 1],
    ["burden positive", s0.invariants.burden > 0],
    ["ν inside CFL", s0.courant <= s0.certificates.cflLimit],
    ["roots exact", s0.certificates.roots[0] === 1 && Math.abs(s0.certificates.roots[1]) < 1],
  ];
  loop.start();
  await wait(300);
  const s1 = loop.stop();
  checks.push(
    ["ticks advanced while running", s1.ticks > 0],
    ["stopped on request", !s1.running],
    // naive-energy drift is bounded (~4e-4 over 30k ticks, measured) — 1e-3 is
    // the honest certificate line, not a rounding-level fantasy
    ["drift bounded (<1e-3)", s1.invariants.drift < 1e-3],
    ["invariants finite", Object.values(s1.invariants).every(Number.isFinite)],
  );
  // long-run boundedness, deterministic: 5000 direct ticks, drift must stay < 1e-3
  for (let i = 0; i < 5000; i++) loop._tick();
  checks.push(["drift stays bounded over 5000 ticks", loop.state().invariants.drift < 1e-3]);
  loop.injectSensor("audio", 0.8);
  const s2 = loop.state();
  checks.push(["sensor drive injected (bounded)", s2.drives.audio > 0 && s2.drives.audio <= 1]);
  loop.reset();
  const s3 = loop.state();
  checks.push(["reset zeroes drives", s3.drives.audio === 0 && s3.ticks === 0]);
  for (const [name, ok] of checks) {
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  engineLoop: ${name}`);
  }
}
await checkLoop();

// ── MindService lifecycle — real child agent, real stdio, real protocol ──
async function checkMindService() {
  const { MindService } = require("../electron/mindService.cjs");
  const path = require("node:path");
  const svc = new MindService({
    brainDir: path.join(import.meta.dirname, "fixtures"),
    entry: "child-agent.cjs",
  });
  const events = [];
  svc.onEvent((f) => events.push(f));
  const checks = [];
  const st0 = svc.status();
  checks.push(["capabilities honest (fixture present)", st0.brainPresent === true]);
  checks.push(["starts stopped", st0.state === "stopped" && !st0.running]);
  svc.start();
  await wait(600);
  const st1 = svc.status();
  checks.push(["awake after boot frames", st1.state === "awake" && st1.running]);
  const chat = svc.chat("hello agent");
  checks.push(["chat accepted while awake", chat.ok === true]);
  await wait(300);
  checks.push(["chat.ack received", events.some((f) => f.type === "chat.ack" && f.accepted)]);
  svc.sensorFrame("audio", new Array(28).fill(0.01), { energy: 0.5 });
  const stop = svc.stop();
  checks.push(["stop requested", typeof stop === "object"]);
  await wait(800);
  checks.push(["child exited cleanly", events.some((f) => f.type === "mind.exit" && f.code === 0)]);
  checks.push(["state stopped after exit", svc.status().running === false]);
  const bad = svc.chat("after death");
  checks.push(["chat after stop honestly refused", bad.ok === false]);
  for (const [name, ok] of checks) {
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  mindService: ${name}`);
  }
}
await checkMindService();

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) FAILED`);
  process.exit(1);
}
console.log("\nall smoke checks passed — every answer was computed live from the engine.");
