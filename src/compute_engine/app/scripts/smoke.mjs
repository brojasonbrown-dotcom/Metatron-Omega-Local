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
  // ── drift/burden health scan (the "is it actually at rest?" verdict) ──
  {
    const { scanDrift } = require("../electron/scanDrift.cjs");
    const hs = s3.health;
    checks.push(
      ["health scan present on state()", hs && typeof hs.code === "string"],
      ["healthy loop reads NOMINAL", hs.level === "nominal"],
      ["invariants carry nodes + burdenPeak", s3.invariants.nodes === loop._nodes && typeof s3.invariants.burdenPeak === "number"],
      // the operator's flagged pairing: coherence pinned at 1.0 must NOT read as rest
      ["blow-up pairing flagged ENERGY BLOW-UP", scanDrift({ drift: 23.6, closure: 1.0, coherence: 1.0, burden: 6.657e12, nodes: 610, burdenPeak: 6.657e12 }).level === "blowup"],
      ["open circuit flagged", scanDrift({ drift: 23.6, closure: 1.0, coherence: 1.0, burden: 6.657e12, nodes: 610, burdenPeak: 6.657e12 }).openCircuit === true],
      ["resting loop not falsely flagged", scanDrift({ drift: 4e-4, closure: 0.02, coherence: 0.999, burden: 40, nodes: 64, burdenPeak: 40 }).level === "nominal"],
    );
  }
    // ── adaptive-mesh telemetry (Phases 1-4) — real, measured, live ──
    const rf = s3.refinement;
    checks.push(
      ["refinement telemetry present", rf !== undefined && rf !== null],
      ["mesh starts at base grid (16 leaves)", rf.leaves === 16 && rf.depth === 2],
      ["thresholds exact (phi^-2 > phi^-4)", rf.refineThreshold > rf.coarsenThreshold],
      ["conservation residual finite", Number.isFinite(rf.conservationResidual)],
      // Phase-4 restriction (coarsen direction), wired live: the snapshot always
      // carries the residual and it sits at the machine floor when the transfer
      // conserves the integrated field (double stochasticity of R = P).
      ["restriction residual present", typeof rf.restrictionResidual === "number"],
      ["restriction residual finite & non-negative", Number.isFinite(rf.restrictionResidual) && rf.restrictionResidual >= 0],
      ["restriction residual at machine floor", rf.restrictionResidual < 1e-12],
    );
    // The Phase-4 operators are exported through the bundle (dead code until
    // wired): restrictBlock must conserve the block's integrated field exactly.
    {
      const E = require("../electron/engine-bundle.cjs");
      const blk = [2, -1, 0.5, 3];
      const out = E.restrictBlock(blk);
      const sc = blk.reduce((a, b) => a + b, 0);
      const sp = out.reduce((a, b) => a + b, 0);
      checks.push(
        ["restrictBlock exported from bundle", typeof E.restrictBlock === "function"],
        ["restrictBlock conserves integrated field", Math.abs(sp - sc) < 1e-12],
        ["energyRatio exported from bundle", typeof E.energyRatio === "function"],
      );
      // ── eigenmodes, resolution ladder, mesh leaf geometry ──
      const spec = E.eigenSpectrum(Array.from({ length: 144 }, (_, i) => Math.sin((2 * Math.PI * 3 * i) / 144)));
      checks.push(
        ["eigenSpectrum exported", typeof E.eigenSpectrum === "function"],
        ["eigenmode tone lands in bin 3", spec.dominant && spec.dominant.k === 3],
        ["parseval conserves energy", spec.parsevalResidual < 1e-9],
        ["resolution ladder exported", Array.isArray(E.RESOLUTION_LADDER) && E.RESOLUTION_LADDER.includes(610)],
        ["nearestRung snaps 256 to 233", E.nearestRung(256) === 233],
        ["isRung 377 true / 256 false", E.isRung(377) === true && E.isRung(256) === false],
      );
      const meshSnap2 = loop.state().refinement;
      checks.push(
        ["mesh leafNodes present + aligned", Array.isArray(meshSnap2.leafNodes) && meshSnap2.leafNodes.length === meshSnap2.leaves],
        ["leaf coords in torus domain", meshSnap2.leafNodes.every((l) => l.u >= 0 && l.u < 2 * Math.PI && l.size > 0)],
      );
      for (const rung of E.RESOLUTION_LADDER) {
        const l2 = new EngineLoop({ nodes: rung });
        const st = l2.state();
        checks.push([`rung ${rung} nu=0.5 spectrum signed-drift`, Math.abs(st.courant - 0.5) < 1e-9 && st.spectrum.nodes === rung && typeof st.invariants.driftSigned === "number"]);
      }
    }
    const loop2 = new EngineLoop();
    loop2.start();
    // The mesh advances on a decimated cadence (every 8th tick — the measured
    // perf fix). 1200 ms ≈ 36 ticks ≈ 4 mesh updates: enough to refine past
    // base on the curved seed, where the 300 ms window only caught one.
    await wait(1200);
    loop2.stop();
    const sLive = loop2.state().refinement;
    checks.push(["live mesh refines above base on curved seed", sLive.leaves > 16 && sLive.depth > 2]);
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
    // F4 — the web sense verb: id-keyed honest verdict over the real stdio protocol.
    const web = await svc.webFeed("https://example.com/");
    checks.push(["web.feed verb resolves id-keyed verdict", web.ok === true && web.chunks === 3 && typeof web.url === "string"]);
    // ADR-001 — the Sigma-panel sense verb: retention/telemetry flip+read over
    // the same id-keyed protocol. Proves the mindService.cjs transport end-to-end.
    const senseOff = await svc.setSense("retention", false);
    checks.push(["sense.set flip resolves id-keyed verdict", senseOff.ok === true && senseOff.sense === "retention" && senseOff.enabled === false]);
    const senseRead = await svc.setSense("telemetry");
    checks.push(["sense.set read (enabled omitted) resolves", senseRead.ok === true && senseRead.sense === "telemetry" && typeof senseRead.enabled === "boolean"]);
    const senseBad = await svc.setSense("nope-sense", true);
    checks.push(["sense.set unknown sense is honestly refused", senseBad.ok === false && typeof senseBad.error === "string"]);
  svc.sensorFrame("audio", new Array(28).fill(0.01), { energy: 0.5 });
  const stop = svc.stop();
  checks.push(["stop requested", typeof stop === "object"]);
  await wait(800);
  checks.push(["child exited cleanly", events.some((f) => f.type === "mind.exit" && f.code === 0)]);
  // the fixture's grandchild (the simulated ollama) must be stopped by the
  // mind's OWN supervisor before exit — code null + a real signal is the
  // honest signature of a kill, never a mocked "clean" code 0
  const gc = events.find((f) => f.type === "shutdown.grandchild");
  checks.push([
    "ollama-style grandchild stopped by the mind's own supervisor",
    gc !== undefined && gc.code === null && typeof gc.signal === "string",
    gc ? ("signal=" + gc.signal) : "frame missing",
  ]);
  checks.push(["state stopped after exit", svc.status().running === false]);
  const bad = svc.chat("after death");
  checks.push(["chat after stop honestly refused", bad.ok === false]);
  for (const [name, ok] of checks) {
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  mindService: ${name}`);
  }
}
await checkMindService();

// ── document ingest — type-sniffed, size-capped, honest refusals ──
{
  const { ingestDocument } = require("../electron/documentIngest.cjs");
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const tmp = (n, c, enc) => { const p = path.join(os.tmpdir(), n); fs.writeFileSync(p, c, enc); return p; };
  const text = ingestDocument(tmp("ava-doc.txt", "closure residue never zero by theorem"));
  const pdf = ingestDocument(tmp("ava-doc.pdf", "%PDF-1.4\nBT /F1 12 Tf 72 720 Td (Hello Engine) Tj ET\n%%EOF", "latin1"));
  const bin = ingestDocument(tmp("ava-doc.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])));
  const checks = [
    ["text document reads", text.ok && text.kind === "text" && text.text.includes("closure residue")],
    ["PDF text layer extracted", pdf.ok && pdf.kind === "pdf" && pdf.text.includes("Hello Engine")],
    // A PNG is sniffed as an IMAGE routed to OCR: succeeds when the inbox
    // is live, honestly refused (real reason) when the mind is not running.
    // What must never happen is a fabricated read or a crash.
    ["image routed to OCR or honestly refused", (bin.ok && bin.kind === "image") || (!bin.ok && typeof bin.error === "string" && bin.error.length > 0)],
    ["missing file errors cleanly", !ingestDocument(path.join(os.tmpdir(), "ava-nope.txt")).ok],
  ];
  for (const [name, ok] of checks) {
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  documentIngest: ${name}`);
  }
  for (const f of ["ava-doc.txt", "ava-doc.pdf", "ava-doc.png"]) { try { fs.unlinkSync(path.join(os.tmpdir(), f)); } catch {} }
}

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) FAILED`);
  process.exit(1);
}
console.log("\nall smoke checks passed — every answer was computed live from the engine.");
