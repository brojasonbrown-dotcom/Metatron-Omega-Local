/**
 * AVA — Mind Service: supervised sidecar for the v14 cognitive mind.
 *
 * Spawns `run_mind_bridge.ts` on the SYSTEM Node (≥25, native type-stripping —
 * Electron's embedded Node cannot run v14's TS modules), parses its NDJSON
 * protocol, supervises with a φ-scaled restart ladder (mirroring the v14
 * OllamaSupervisor's own policy), and exposes a typed surface to main.cjs.
 *
 * Honesty rules (inherited):
 *  - If the brain dir or a suitable Node is absent, status says so — the ψ
 *    button reports it; nothing is simulated.
 *  - Mind events reach the renderer ONLY as they truly arrive (push).
 *  - The mind NEVER auto-starts: start() is called only from the ψ toggle.
 */
"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const ENTRY = "run_mind_bridge.ts";
const KILL_GRACE_MS = 15_000;
const MAX_RESTARTS = 3;

/**
 * Brain resolution chain (first hit wins):
 *   1. AVA_BRAIN_DIR env var (explicit override)
 *   2. resources/brain v14 — the packaged extraResources location
 *      (installed app: <install>/resources/brain v14)
 *   3. app/../../brain v14 — the dev tree
 *   4. workspace-absolute fallback (this machine's source checkout)
 * Returns { brainDir, tried[] } — brainDir may not exist; callers report
 * honestly via capabilities().brainPresent, and every candidate tried is
 * exposed for the error message.
 */
function resolveBrainDir() {
  const tried = [];
  const candidates = [];
  if (process.env.AVA_BRAIN_DIR) candidates.push(process.env.AVA_BRAIN_DIR);
  // 2. packaged: <install>/resources is two levels up from electron/
  candidates.push(path.join(__dirname, "..", "..", "brain v14"));
  // (dev tree resolves to the same shape — kept as one candidate)
  // 4. workspace-absolute fallback
  candidates.push(
    "C:\\Users\\user-pc\\Desktop\\Workflow\\.devcontainer\\src\\compute_engine\\brain v14",
  );
  for (const dir of candidates) {
    tried.push(dir);
    if (fs.existsSync(path.join(dir, ENTRY))) return { brainDir: dir, tried };
  }
  return { brainDir: tried[0] ?? candidates[0], tried };
}

/** φ-scaled backoff ladder in ms (same law as the supervisor's). */
function backoffMs(attempt) {
  return Math.min(1000 * Math.pow(1.618033988749895, attempt), 60_000);
}

class MindService {
  /**
   * @param {{brainDir?: string, entry?: string}} [opts] — override the brain
   * location/entry point (used by the lifecycle smoke with a real minimal
   * child agent; production resolves the chain above).
   */
  constructor(opts = {}) {
    const resolved = opts.brainDir ? { brainDir: opts.brainDir, tried: [opts.brainDir] } : resolveBrainDir();
    this._brainDir = resolved.brainDir;
    this._brainTried = resolved.tried;
    this._entry = opts.entry ?? ENTRY;
    this._proc = null;
    this._state = "stopped"; // stopped | starting | awake | degraded
    this._restarts = 0;
    this._stopping = false;
    this._lastError = null;
    this._info = { ticks: 0, stableThoughts: 0, concepts: 0, ollama: null, models: [], lexicon: null, scaling: null };
    this._listener = null; // (frame) => void — wired to webContents.send
    this._buf = "";
    this._pendingQueries = new Map(); // id → resolve(frame)
    this._querySeq = 0;
  }

  /** Static capability check — no process needed. */
  capabilities() {
    return {
      brainDir: this._brainDir,
      brainTried: this._brainTried,
      brainPresent: fs.existsSync(path.join(this._brainDir, this._entry)),
      node: process.version, // host node (the child's own is resolved at spawn)
    };
  }

  onEvent(listener) {
    this._listener = listener;
  }

  _emit(frame) {
    // synchronous answers resolve their pending query first
    if (frame.type === "answer" && frame.id) {
      const resolve = this._pendingQueries.get(frame.id);
      if (resolve) {
        this._pendingQueries.delete(frame.id);
        resolve(frame);
        return;
      }
    }
    // state tracking from the frame stream itself
    if (frame.type === "boot") {
      if (frame.phase === "awake") this._state = "awake";
      if (frame.phase === "ollama") {
        this._info.ollama = frame.running ? frame.baseUrl : null;
        this._info.models = frame.models ?? [];
        if (!frame.running) this._state = "degraded";
      }
    } else if (frame.type === "state") {
      this._info.ticks = frame.ticks ?? this._info.ticks;
      this._info.stableThoughts = frame.stableThoughts ?? this._info.stableThoughts;
      this._info.concepts = frame.concepts ?? this._info.concepts;
      if (frame.lexicon) this._info.lexicon = frame.lexicon;
      if (frame.scaling) this._info.scaling = frame.scaling;
    } else if (frame.type === "fatal") {
      this._lastError = String(frame.message ?? "fatal boot error");
      this._state = "degraded";
    }
    if (this._listener) {
      try { this._listener(frame); } catch { /* renderer must never kill the service */ }
    }
  }

  get running() {
    return this._proc !== null;
  }

  status() {
    return {
      state: this._state,
      running: this.running,
      restarts: this._restarts,
      lastError: this._lastError,
      ...this.capabilities(),
      info: this._info,
    };
  }

  /** Start the mind (idempotent). Throws honestly when impossible. */
  start() {
    if (this._proc) return this.status();
    const caps = this.capabilities();
    if (!caps.brainPresent) {
      this._lastError = `brain not found (tried: ${this._brainTried.join(" | ")})`;
      this._state = "degraded";
      return this.status();
    }
    this._stopping = false;
    this._state = "starting";
    this._buf = "";
    const proc = spawn("node", [this._entry], {
      cwd: this._brainDir,
      env: { ...process.env, MIND_TTS: "0" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this._proc = proc;

    proc.stdout.on("data", (d) => {
      this._buf += d.toString();
      let idx;
      while ((idx = this._buf.indexOf("\n")) >= 0) {
        const line = this._buf.slice(0, idx).trim();
        this._buf = this._buf.slice(idx + 1);
        if (!line) continue;
        let frame;
        try {
          frame = JSON.parse(line);
        } catch {
          this._emit({ type: "error", where: "mindService.parse", message: `corrupt frame: ${line.slice(0, 120)}` });
          continue;
        }
        this._emit(frame);
      }
    });
    proc.stderr.on("data", (d) => {
      // the mind's console voice — forward as dim log lines
      for (const line of d.toString().split(/\r?\n/)) {
        if (line.trim()) this._emit({ type: "mind.log", text: line.trim() });
      }
    });
    proc.on("error", (err) => {
      this._lastError = String(err.message ?? err);
      this._emit({ type: "error", where: "mindService.spawn", message: this._lastError });
    });
    proc.on("exit", (code) => {
      this._proc = null;
      const wasStopping = this._stopping;
      this._state = "stopped";
      this._emit({ type: "mind.exit", code });
      if (!wasStopping && code !== 0 && this._restarts < MAX_RESTARTS) {
        const wait = backoffMs(this._restarts++);
        this._emit({ type: "mind.restart", inMs: wait, attempt: this._restarts });
        setTimeout(() => {
          if (!this._stopping && !this._proc) this.start();
        }, wait).unref();
      }
    });
    return this.status();
  }

  /** Ask the mind to sleep; escalate to a tree-kill after the grace period. */
  stop() {
    this._stopping = true;
    this._restarts = 0;
    if (!this._proc) {
      this._state = "stopped";
      return this.status();
    }
    const proc = this._proc;
    try {
      proc.stdin.write(JSON.stringify({ type: "shutdown" }) + "\n");
    } catch { /* pipe already closing */ }
    const killer = setTimeout(() => {
      if (this._proc === proc) {
        spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], { windowsHide: true });
      }
    }, KILL_GRACE_MS);
    killer.unref();
    return this.status();
  }

  /** Forward a chat line into the mind's sensory stream. */
  chat(text) {
    if (!this._proc || this._state !== "awake") {
      return { ok: false, error: `mind is ${this._state}` };
    }
    try {
      this._proc.stdin.write(JSON.stringify({ type: "chat", text: String(text).slice(0, 500) }) + "\n");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  /**
   * The grounded-answer path (M3): ask the mind a question and await the
   * synchronous answer frame. phi phrases the REAL context (engine facts +
   * learned concepts); nothing is invented. Times out honestly.
   */
  query(text, facts = "", timeoutMs = 120_000) {
    if (!this._proc || this._state !== "awake") {
      return Promise.resolve({ ok: false, error: `mind is ${this._state}` });
    }
    const id = `q${++this._querySeq}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._pendingQueries.delete(id);
        resolve({ ok: false, error: `mind query timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      this._pendingQueries.set(id, (frame) => {
        clearTimeout(timer);
        if (frame.text) {
          resolve({
            ok: true,
            answer: frame.text,
            grounded: frame.grounded ?? [],
            source: frame.source,
            certificate: frame.certificate,
            verification: frame.verification,
            prediction: frame.prediction,
            elapsedMs: frame.elapsedMs,
          });
        } else resolve({ ok: false, error: String(frame.reason ?? "query failed") });
      });
      try {
        this._proc.stdin.write(JSON.stringify({ type: "query", id, text: String(text).slice(0, 500), facts }) + "\n");
      } catch (err) {
        clearTimeout(timer);
        this._pendingQueries.delete(id);
        resolve({ ok: false, error: String(err && err.message ? err.message : err) });
      }
    });
  }

  /** Forward a UI sensory field (28 numbers) into the mind's bus. */
  sensorFrame(kind, field, extra) {
    if (!this._proc || this._state !== "awake") return;
    try {
      this._proc.stdin.write(
        JSON.stringify({ type: kind === "audio" ? "sensor.audio" : "sensor.vision", field, ...extra }) + "\n",
      );
    } catch { /* transient — next frame retries */ }
  }
}

module.exports = { MindService };
