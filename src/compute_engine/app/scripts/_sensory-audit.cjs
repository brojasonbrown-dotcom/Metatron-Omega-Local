"use strict";
// Forensic verification: all 5 sensory modalities encode -> fuse -> transport to all rungs.
const E = require("../electron/omega-bundle.cjs");
const host = new E.EngineHost({ profile: "MESO", seed: "sensory-audit" });

host.declareChannel("audio", "audio");
host.declareChannel("vision", "grid");
host.declareChannel("text", "text");
host.declareChannel("touch", "touch");
host.declareChannel("scalar", "scalar");

const vision = new Float32Array(144 * 89).map((_, i) => Math.sin(i * 0.1) * 0.5);
const audio = new Float32Array(4096).map((_, i) => Math.sin(i * 0.05) * 0.5);
const touch = new Float32Array(512).map((_, i) => Math.sin(i * 0.02) * 0.3);
const scalar = new Float32Array(256).map((_, i) => Math.sin(i * 0.07) * 0.4);

const reports = {
  audio: host.pushChannel("audio", audio),
  vision: host.pushChannel("vision", vision, { width: 144, height: 89 }),
  text: host.pushChannel("text", "the golden brain senses the coherent universe"),
  touch: host.pushChannel("touch", touch),
  scalar: host.pushChannel("scalar", scalar),
};

let allBound = true;
for (const [name, r] of Object.entries(reports)) {
  const bound = r.peak <= E.PHI + 1e-12;
  const live = r.energy > 0;
  if (!bound || !live) allBound = false;
  console.log(
    `${name.padEnd(7)} modality=${r.modality.padEnd(6)} peak=${r.peak.toFixed(4)} energy=${r.energy.toFixed(4)} support=${String(r.support).padEnd(4)} bound=${bound} live=${live}`
  );
}

host.start();
for (let i = 0; i < 12; i++) host.pump(Date.now(), 33);

const snap = host.snapshot();
console.log("snapshot senseChannels =", snap.senseChannels, "(expect 5)");
console.log("snapshot sensePeak     =", snap.sensePeak.toFixed(4), "(> 0)");
console.log("snapshot perceptConcepts =", snap.perceptConcepts, " perceptNovelty =", snap.perceptNovelty);

// Transport to ALL rungs: the plane's per-rung injections.
const plane = host.engine.sensoryPlane();
const rep = plane.report();
const liveRungs = rep.rungs.filter((r) => r.energy > 0).length;
console.log(`plane rungs: ${liveRungs}/${rep.rungs.length} receiving sensory energy (expect all)`);
for (const r of rep.rungs.slice(0, 6)) {
  console.log(`  rung ${r.rank}: nodes=${r.nodes} peak=${r.peak.toExponential(2)} energy=${r.energy.toExponential(2)} falloff=${r.falloff.toFixed(4)}`);
}

// Deep resolution: the six-section scan of the base rung.
const scan = host.scan(0);
console.log("scan(0):", scan ? `sections=${Object.keys(scan).length} status=${scan.status ?? scan.spectral?.status ?? "ok"}` : "null");

console.log(allBound && liveRungs === rep.rungs.length && snap.senseChannels === 5 ? "SENSORY-AUDIT: ALL PASS" : "SENSORY-AUDIT: FAIL");
