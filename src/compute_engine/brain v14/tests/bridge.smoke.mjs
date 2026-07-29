/**
 * GATE 1 — Bridge boot smoke (real process, real stdio, no mocks).
 * Spawns run_mind_bridge.ts on system Node, asserts the NDJSON boot phases
 * arrive in order, state roundtrips, and shutdown is graceful (exit 0).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BRAIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PHASES = ["start", "ollama", "memory", "engine", "sensors", "awake"];

const child = spawn(process.execPath, ["run_mind_bridge.ts"], {
  cwd: BRAIN_DIR,
  env: { ...process.env, MIND_TTS: "0" },
  stdio: ["pipe", "pipe", "inherit"],
});

const phases = [];
const frames = [];
let buf = "";
child.stdout.on("data", (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try {
      const f = JSON.parse(line);
      frames.push(f);
      if (f.type === "boot") phases.push(f.phase);
      if (f.type !== "journal") console.log("  frame:", line.slice(0, 160));
    } catch {
      console.error("  CORRUPT LINE:", line.slice(0, 120));
      failures++;
    }
  }
});

let failures = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (pred()) return true;
    await wait(250);
  }
  console.error(`  TIMEOUT waiting for: ${label}`);
  return false;
}

console.log("[gate1] mind spawning (ollama + phi warm-up can take minutes)…");

const awake = await waitFor(() => phases.includes("awake"), 300_000, "awake phase");
if (!awake) failures++;

for (const p of EXPECTED_PHASES) {
  if (!phases.includes(p)) {
    console.error(`  MISSING boot phase: ${p}`);
    failures++;
  }
}
const ordered = EXPECTED_PHASES.every((p, i) => phases.indexOf(p) === i || (p === "ollama" && phases.indexOf(p) <= 1));
if (!ordered) {
  console.error(`  PHASE ORDER WRONG: ${phases.join(",")}`);
  failures++;
}

console.log("[gate1] state roundtrip…");
child.stdin.write(JSON.stringify({ type: "state" }) + "\n");
const gotState = await waitFor(() => frames.some((f) => f.type === "state"), 10_000, "state frame");
if (!gotState) failures++;
else {
  const s = frames.find((f) => f.type === "state");
  console.log(`  state: ticks=${s.ticks} thoughts=${s.stableThoughts} concepts=${s.concepts}`);
  if (typeof s.ticks !== "number") failures++;
}

console.log("[gate1] shutdown…");
child.stdin.write(JSON.stringify({ type: "shutdown" }) + "\n");
const exited = await new Promise((resolve) => {
  const to = setTimeout(() => resolve(null), 30_000);
  child.on("exit", (code) => { clearTimeout(to); resolve(code); });
});
console.log(`  exit code: ${exited}`);
if (exited !== 0) failures++;
if (!frames.some((f) => f.type === "boot" && f.phase === "sleep")) {
  console.error("  MISSING sleep frame");
  failures++;
}

console.log(failures === 0 ? "[gate1] PASS" : `[gate1] FAIL (${failures} failures)`);
process.exit(failures === 0 ? 0 : 1);
