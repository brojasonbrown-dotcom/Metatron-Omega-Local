/**
 * A REAL minimal NDJSON agent for the MindService lifecycle smoke.
 * Not a mock: a genuine child process implementing the bridge protocol
 * contract (boot phases, chat.ack, state, graceful shutdown) so MindService's
 * spawn/parse/supervise/shutdown paths are exercised against a real peer.
 */
"use strict";

const emit = (frame) => process.stdout.write(JSON.stringify({ t: Date.now(), ...frame }) + "\n");

emit({ type: "boot", phase: "start" });
emit({ type: "boot", phase: "awake", tickMs: 146 });

let buf = "";
process.stdin.on("data", (d) => {
  buf += d.toString();
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.type === "chat") emit({ type: "chat.ack", accepted: true });
    if (msg.type === "state") emit({ type: "state", ticks: 13, stableThoughts: 5, concepts: 8 });
    if (msg.type === "sensor.audio" || msg.type === "sensor.vision") { /* accepted silently */ }
    if (msg.type === "shutdown") {
      emit({ type: "boot", phase: "sleep" });
      process.exit(0);
    }
  }
});

setInterval(() => { /* stay alive */ }, 60_000).unref();
