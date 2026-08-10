/**
 * A REAL minimal NDJSON agent for the MindService lifecycle smoke.
 * Not a mock: a genuine child process implementing the bridge protocol
 * contract (boot phases, chat.ack, state, graceful shutdown) so MindService's
 * spawn/parse/supervise/shutdown paths are exercised against a real peer.
 */
"use strict";

const { spawn } = require("node:child_process");

const emit = (frame) => process.stdout.write(JSON.stringify({ t: Date.now(), ...frame }) + "\n");

emit({ type: "boot", phase: "start" });
emit({ type: "boot", phase: "awake", tickMs: 146 });

// Simulated ollama child (mirrors OllamaSupervisor's spawn shape): the real
// mind spawns `ollama serve`; the fixture spawns a do-nothing child so the
// host's tree-kill has a genuine grandchild PID to reap — the proof is the
// "shutdown.grandchild" frame reporting the child's real exit signal.
let grandchild = null;
let stopping = false;

function startGrandchild() {
  if (grandchild) return;
  grandchild = spawn(process.execPath, ["-e", "setInterval(()=>{},60000)"], {
    stdio: "ignore",
    windowsHide: true,
  });
  // Auto-restart on crash — the supervisor's own policy in miniature.
  grandchild.on("exit", () => {
    grandchild = null;
    if (!stopping) startGrandchild();
  });
}
startGrandchild();

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
      if (msg.type === "web.feed") { emit({ type: "web.feed", id: msg.id, ok: true, url: msg.url, chars: 127, chunks: 3 }); }
      // ADR-001 — the Sigma-panel sense verb. Read when `enabled` is omitted,
      // flip when it is a boolean. Echoes the real sense name + new state,
      // exactly the bridge's honest contract (never an assumed state).
      if (msg.type === "sense.set") {
        if (msg.sense === "retention" || msg.sense === "telemetry") {
          emit({ type: "sense.set", id: msg.id, ok: true, sense: msg.sense, enabled: typeof msg.enabled === "boolean" ? msg.enabled : true });
        } else {
          emit({ type: "sense.set", id: msg.id, ok: false, reason: `unknown sense: ${String(msg.sense)}` });
        }
      }
    if (msg.type === "shutdown") {
      emit({ type: "boot", phase: "sleep" });
      stopping = true;
      const gc = grandchild;
      if (gc) {
        // Stop OUR child before exiting — the supervisor's stop() contract.
        gc.once("exit", (code, signal) => {
          emit({ type: "shutdown.grandchild", code, signal: signal ?? null });
          process.exit(0);
        });
        gc.kill();
        // if the child won't die, exit anyway after a short fuse
        setTimeout(() => process.exit(1), 2_000).unref();
      } else {
        process.exit(0);
      }
    }
  }
});

setInterval(() => { /* stay alive */ }, 60_000).unref();
