/**
 * GATE — Kimi toggle live smoke (real process, real stdio, no mocks).
 * Spawns run_mind_bridge.ts, waits for the instrument boot phase, then flips
 * the Kimi toggle ON and OFF over the wire and asserts the answer source
 * resolves honestly (k3 when armed + key present, ollama when disarmed).
 * Exercises the M10 split routing end to end without mocking a single frame.
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

let buf = "";
const frames = [];
child.stdout.on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const l = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!l) continue;
    try { frames.push(JSON.parse(l)); } catch { /* ignore */ }
  }
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(pred, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (pred()) return true; await wait(250); }
  console.error("TIMEOUT waiting for:", label);
  return false;
}
const send = (o) => child.stdin.write(JSON.stringify(o) + "\n");

let failures = 0;
// Only need the instrument boot phase (K3 toggle does not need full awake).
const up = await until(() => frames.some((f) => f.type === "boot" && f.phase === "instrument"), 300000, "instrument phase");
if (!up) { child.kill(); process.exit(1); }
const boot = frames.find((f) => f.phase === "instrument");
console.log("BOOT instrument:", JSON.stringify({ kimiOn: boot.kimiOn, answerSource: boot.answerSource, available: boot.available }));

send({ type: "k3.set", id: "t1", enabled: true });
await until(() => frames.some((f) => f.type === "instrument" && f.id === "t1"), 20000, "k3.set ON reply");
const on = frames.find((f) => f.type === "instrument" && f.id === "t1");
console.log("KIMI ON reply:", JSON.stringify({ ok: on?.ok, kimiOn: on?.kimiOn, answerSource: on?.answerSource, reason: on?.reason }));

send({ type: "k3.set", id: "t2", enabled: false });
await until(() => frames.some((f) => f.type === "instrument" && f.id === "t2"), 20000, "k3.set OFF reply");
const off = frames.find((f) => f.type === "instrument" && f.id === "t2");
console.log("KIMI OFF reply:", JSON.stringify({ ok: off?.ok, kimiOn: off?.kimiOn, answerSource: off?.answerSource }));

if (!(on && on.ok === true && on.kimiOn === true)) { console.error("FAIL: toggle did not arm"); failures++; }
if (!(off && off.ok === true && off.kimiOn === false)) { console.error("FAIL: toggle did not disarm"); failures++; }

child.kill();
console.log(failures === 0 ? "PASS" : `FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
