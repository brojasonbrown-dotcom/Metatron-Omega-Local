/**
 * GATE 2b — Sustained-stimulation cognition probe.
 * Existence = stabilized distinction: all four scores (signal, persistence,
 * coherence, relation) must hold for 3 consecutive ticks. Single frames don't
 * persist — so we feed a REPEATED reinforcing theme (persistence) with small
 * variations (signal + re-arm), the way a real sense behaves.
 * Reports exactly what the mind produces. Hard assertions stay transport-level.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BRAIN_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(process.execPath, ["run_mind_bridge.ts"], {
  cwd: BRAIN_DIR,
  env: { ...process.env, MIND_TTS: "0" },
  stdio: ["pipe", "pipe", "inherit"],
});

const frames = [];
let buf = "";
child.stdout.on("data", (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    try { frames.push(JSON.parse(line)); } catch { /* ignore */ }
  }
});

let failures = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (pred()) return true;
    await wait(300);
  }
  console.error(`  TIMEOUT: ${label}`);
  return false;
}

if (!(await waitFor(() => frames.some((f) => f.type === "boot" && f.phase === "awake"), 300_000, "awake"))) {
  process.exit(1);
}

// Reinforcing theme with variations — persistent yet distinct field content.
const THEME = [
  "golden torus resonance",
  "golden torus resonance stabilizes",
  "golden torus resonance persists",
  "golden torus resonance golden",
  "golden torus resonance torus",
  "golden torus resonance field",
  "golden torus resonance closure",
  "golden torus resonance coherence",
  "golden torus resonance stable",
  "golden torus resonance exists",
];
console.log("[gate2b] feeding reinforcing theme…");
for (const text of THEME) {
  child.stdin.write(JSON.stringify({ type: "chat", text }) + "\n");
  await wait(3000); // ≈ 20 ticks between frames — the field can settle
}
const acks = frames.filter((f) => f.type === "chat.ack" && f.accepted);
console.log(`  accepted chat frames: ${acks.length}/${THEME.length}`);
if (acks.length !== THEME.length) failures++;

console.log("[gate2b] listening up to 180s for a stabilized thought…");
const t0 = Date.now();
let cog = [];
while (Date.now() - t0 < 180_000) {
  cog = frames.filter((f) => f.type === "journal" && (f.kind === "thought" || f.kind === "voice"));
  if (cog.length > 0) break;
  await wait(1000);
}
if (cog.length > 0) {
  console.log(`  ✦ COGNITION OBSERVED — ${cog.length} frame(s):`);
  for (const f of cog.slice(0, 6)) console.log("   ", JSON.stringify(f).slice(0, 260));
} else {
  console.log("  no stabilized thought in 180s (honest report — senses registered)");
}

child.stdin.write(JSON.stringify({ type: "shutdown" }) + "\n");
await new Promise((r) => child.on("exit", r));
console.log(failures === 0 ? "[gate2b] PASS (transport)" : `[gate2b] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
