/**
 * GATE 2 — Chat roundtrip through the live mind (real process, real cognition).
 * Sends distinct chat lines into the bridge, asserts each is accepted into
 * the SensorBus, then listens for genuine cognitive output (thought/voice).
 * Cognition is field-driven, not scripted: we report exactly what the mind
 * produced, and only the transport-level facts are hard assertions.
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
    try { frames.push(JSON.parse(line)); } catch { /* counted below via acks */ }
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
  console.error(`  TIMEOUT: ${label}`);
  return false;
}

if (!(await waitFor(() => frames.some((f) => f.type === "boot" && f.phase === "awake"), 300_000, "awake"))) {
  console.log("[gate2] FAIL — mind never woke");
  process.exit(1);
}

const CHATS = [
  "hello mind — can you hear the human through the interface?",
  "the golden ratio governs your memory kernel",
  "what stabilizes a thought into existence?",
];
for (const text of CHATS) {
  child.stdin.write(JSON.stringify({ type: "chat", text }) + "\n");
  await wait(1500);
}
const acks = frames.filter((f) => f.type === "chat.ack");
console.log(`  chat.ack frames: ${acks.length}/${CHATS.length}`);
if (acks.length !== CHATS.length) failures++;
if (!acks.every((a) => a.accepted === true)) {
  console.error("  some chat frames were REJECTED by the bus");
  failures++;
}

console.log("[gate2] listening 120s for cognitive output (thought/voice/journal)…");
const t0 = Date.now();
let cognitive = [];
while (Date.now() - t0 < 120_000) {
  cognitive = frames.filter(
    (f) => f.type === "journal" && (f.kind === "thought" || f.kind === "voice"),
  );
  if (cognitive.length > 0) break;
  await wait(1000);
}
if (cognitive.length > 0) {
  console.log(`  COGNITION OBSERVED (${cognitive.length} frames):`);
  for (const f of cognitive.slice(0, 4)) {
    console.log("   ", JSON.stringify(f).slice(0, 220));
  }
} else {
  console.log("  no thought/voice within 120s — the senses registered but nothing stabilized yet (honest report, not a transport failure)");
}

child.stdin.write(JSON.stringify({ type: "shutdown" }) + "\n");
await new Promise((r) => child.on("exit", r));

console.log(failures === 0 ? "[gate2] PASS (transport) + cognition report above" : `[gate2] FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
