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
const { spawn, spawnSync } = require("node:child_process");

const ENTRY = "run_mind_bridge.ts";
const KILL_GRACE_MS = 15_000;
const MAX_RESTARTS = 3;

/**
 * Resolve the SYSTEM Node executable (>=25, native TS type-stripping). A
 * GUI-launched Electron app on Windows frequently does NOT inherit the shell
 * PATH, so a bare spawn("node", ...) can fail even when Node is installed --
 * which reads as "the mind never switches on". Resolve robustly, in order:
 *   1. AVA_NODE env override (explicit)
 *   2. node resolvable on PATH (dev shells, terminals)
 *   3. well-known install locations (%ProgramFiles%
odejs
ode.exe, ...)
 * The resolved path is CACHED so we probe once per process, not per start.
 */
let _resolvedNode = null;
function resolveNode() {
  if (_resolvedNode) return _resolvedNode;
  if (process.env.AVA_NODE && fs.existsSync(process.env.AVA_NODE)) {
    _resolvedNode = process.env.AVA_NODE;
    return _resolvedNode;
  }
  try {
    const r = spawnSync("node", ["--version"], { windowsHide: true, timeout: 5000 });
    if (!r.error && r.status === 0) { _resolvedNode = "node"; return _resolvedNode; }
  } catch { /* not on PATH */ }
  const candidates = [
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, "nodejs", "node.exe"),
    process.env["ProgramFiles(x86)"] && path.join(process.env["ProgramFiles(x86)"], "nodejs", "node.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs", "nodejs", "node.exe"),
    "C:\\Program Files\\nodejs\\node.exe",
  ].filter(Boolean);
  for (const c of candidates) { if (fs.existsSync(c)) { _resolvedNode = c; return _resolvedNode; } }
  return "node"; // unresolved — caller reports the honest spawn error
}

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
    this._info = { ticks: 0, stableThoughts: 0, concepts: 0, ollama: null, models: [], lexicon: null, scaling: null, instrument: null, learningMode: null, curriculum: null };
    this._listener = null; // (frame) => void — wired to webContents.send
    this._buf = "";
    this._pendingQueries = new Map(); // id → resolve(frame)
    this._pendingInstrument = new Map(); // id → resolve(frame)
    this._pendingScaling = new Map(); // id → resolve(frame)
    this._pendingMode = new Map(); // id → resolve(frame)
    this._pendingTeach = new Map(); // id → resolve(frame)
    this._pendingWeb = new Map(); // id → resolve(frame)
    this._webSeq = 0;
    this._pendingSense = new Map(); // id -> resolve(frame)
    this._senseSeq = 0;
    this._querySeq = 0;
    this._instrumentSeq = 0;
    this._scalingSeq = 0;
    this._modeSeq = 0;
    this._teachSeq = 0;
  }

  /** Static capability check — no process needed. */
  capabilities() {
    return {
      brainDir: this._brainDir,
      brainTried: this._brainTried,
      brainPresent: fs.existsSync(path.join(this._brainDir, this._entry)),
      node: process.version, // host node (the child's own is resolved at spawn)
        nodeBin: resolveNode(), // the sidecar runtime — resolved robustly
    };
  }

  onEvent(listener) {
    this._listener = listener;
  }

  /** The resolved brain dir — so main can route OCR drops into its inbox. */
  get brainDir() {
    return this._brainDir;
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
    // synchronous instrument replies resolve their pending request first
    if (frame.type === "instrument" && frame.id) {
      const resolve = this._pendingInstrument.get(frame.id);
      if (resolve) {
        this._pendingInstrument.delete(frame.id);
        resolve(frame);
        // keep the cached status honest after a get/set
        if (frame.ok) this._info.instrument = { active: frame.active, ollamaModel: frame.ollamaModel, ollamaEnabled: frame.ollamaEnabled, instruments: frame.instruments };
        return;
      }
    }
    // scaling.set replies resolve their pending request first (id-keyed)
    if (frame.type === "scaling.set" && frame.id) {
      const resolve = this._pendingScaling.get(frame.id);
      if (resolve) {
        this._pendingScaling.delete(frame.id);
        resolve(frame);
        if (frame.ok && frame.scaling) this._info.scaling = frame.scaling;
        return;
      }
    }
    // mode.set replies resolve their pending request first (id-keyed)
    if (frame.type === "mode.set" && frame.id) {
      const resolve = this._pendingMode.get(frame.id);
      if (resolve) {
        this._pendingMode.delete(frame.id);
        resolve(frame);
        if (frame.ok) this._info.learningMode = { mode: frame.mode, reinjectionEnabled: frame.reinjectionEnabled, replaySweeps: frame.replaySweeps, replayDefers: frame.replayDefers };
        return;
      }
    }
    // teach.corpus replies resolve their pending request first (id-keyed)
    if (frame.type === "web.feed" && frame.id) {
      const resolve = this._pendingWeb.get(frame.id);
      if (resolve) { this._pendingWeb.delete(frame.id); resolve(frame); return; }
    }
    // ADR-001 - sense.set replies resolve their pending request first (id-keyed)
    if (frame.type === "sense.set" && frame.id) {
      const resolve = this._pendingSense.get(frame.id);
      if (resolve) { this._pendingSense.delete(frame.id); resolve(frame); return; }
    }
    if (frame.type === "teach.corpus" && frame.id) {
      const resolve = this._pendingTeach.get(frame.id);
      if (resolve) {
        this._pendingTeach.delete(frame.id);
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
      if (frame.phase === "instrument") {
        this._info.instrument = { active: frame.active, ollamaModel: frame.ollamaModel, instruments: null };
      }
    } else if (frame.type === "state") {
      this._info.ticks = frame.ticks ?? this._info.ticks;
      this._info.stableThoughts = frame.stableThoughts ?? this._info.stableThoughts;
      this._info.concepts = frame.concepts ?? this._info.concepts;
      if (frame.lexicon) this._info.lexicon = frame.lexicon;
      if (frame.scaling) this._info.scaling = frame.scaling;
      if (frame.learningMode) this._info.learningMode = frame.learningMode;
      if (frame.curriculum) this._info.curriculum = frame.curriculum;
      if (frame.instrument) {
        this._info.instrument = { ...(this._info.instrument || {}), active: frame.instrument.active, ollamaModel: frame.instrument.ollamaModel };
      }
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
    // --experimental-transform-types: the v14/engine sources may use TS the
    // default strip-only mode rejects (parameter properties, etc.). Transform
    // mode handles them AND maps the sources' .js-extension ESM specifiers onto
    // the shipped .ts files — without it the sidecar dies at module link.
    const proc = spawn(resolveNode(), ["--experimental-transform-types", this._entry], {
      cwd: this._brainDir,
      env: { ...process.env, MIND_TTS: "0" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this._proc = proc;

    // CRITICAL: a dead/dying child leaves a broken stdin pipe. stream.write()
    // on it does NOT throw synchronously — it emits an async 'error' (EPIPE).
    // With no listener that becomes an UNCAUGHT EXCEPTION and kills the whole
    // main process (the "JavaScript error in the main process" dialog). Swallow
    // it here: the exit handler owns the honest lifecycle (restart/stop).
    proc.stdin.on("error", () => { /* broken pipe — child already gone */ });
    proc.stdout.on("error", () => { /* idem */ });
    proc.stderr.on("error", () => { /* idem */ });

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
        this._lastError = `spawn ${resolveNode()} failed: ${String(err.message ?? err)}`; // name the binary so the cause is honest
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
      this._proc.stdin.write(JSON.stringify({ type: "chat", text: String(text).slice(0, 8000) }) + "\n");
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
        this._proc.stdin.write(JSON.stringify({ type: "query", id, text: String(text).slice(0, 4000), facts }) + "\n");
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

  /**
   * M9 — the switchable language instrument. Ask the mind for the honest
   * availability snapshot: which instruments are reachable (K3 token present /
   * Ollama serving), which Ollama models are installed, and which is active.
   */
  instrumentGet(timeoutMs = 8_000) {
    return this._instrumentRequest({ type: "instrument.get" }, timeoutMs);
  }

  /**
   * M9 — switch the active language instrument. `instrument` is "ollama"|"k3";
   * for ollama, `model` picks which installed model serves. Replies ok:false
   * with the reason when the target is unreachable / the model uninstalled —
   * the active instrument is left untouched.
   */
  instrumentSet(instrument, model, timeoutMs = 15_000) {
    const frame = { type: "instrument.set", instrument: String(instrument) };
    if (model) frame.model = String(model);
    return this._instrumentRequest(frame, timeoutMs);
  }

  /**
   * The Ollama off-switch. `enabled=false` cold-stops the local server (frees
   * the model memory); `enabled=true` cold-starts it (ensureRunning + warm).
   * Persisted by the router, so the choice survives a mind restart.
   */
  ollamaSet(enabled, timeoutMs = 30_000) {
    return this._instrumentRequest({ type: "ollama.set", enabled: !!enabled }, timeoutMs);
  }

  /**
   * Set/replace the K3 bearer token at runtime (no restart). The token is a
   * secret: it travels host→mind once and is never echoed back — the reply's
   * availability snapshot reports only whether a key is now present.
   */
  k3SetKey(apiKey, timeoutMs = 15_000) {
    return this._instrumentRequest({ type: "k3.setKey", apiKey: String(apiKey ?? "") }, timeoutMs);
  }

  /**
   * The operator's force-depth override (Phase 4). `depth` pins the governor's
   * shrink floor (1..9); `null` releases it to measured auto-scale. Replies
   * ok:false with the reason when the mind rejects the depth — the engine's
   * current depth is left untouched. Resolves {ok, depth, scaling}.
   */
  setScaling(depth, timeoutMs = 30_000) {
    return this._scalingRequest({ type: "scaling.set", depth: depth === null || depth === undefined ? null : Number(depth) }, timeoutMs);
  }

  /** Shared id-keyed scaling request/response (mirrors _instrumentRequest). */
  _scalingRequest(payload, timeoutMs) {
    if (!this._proc || this._state !== "awake") {
      return Promise.resolve({ ok: false, error: `mind is ${this._state}` });
    }
    const id = `scale${++this._scalingSeq}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._pendingScaling.delete(id);
        resolve({ ok: false, error: `scaling request timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      this._pendingScaling.set(id, (frame) => {
        clearTimeout(timer);
        if (frame.ok) {
          resolve({ ok: true, depth: frame.depth ?? null, scaling: frame.scaling ?? null });
        } else {
          resolve({ ok: false, error: String(frame.reason ?? "scaling request failed") });
        }
      });
      try {
        this._proc.stdin.write(JSON.stringify({ id, ...payload }) + "\n");
      } catch (err) {
        clearTimeout(timer);
        this._pendingScaling.delete(id);
        resolve({ ok: false, error: String(err && err.message ? err.message : err) });
      }
    });
  }

  /** Shared id-keyed instrument request/response (mirrors query()). */
  _instrumentRequest(payload, timeoutMs) {
    if (!this._proc || this._state !== "awake") {
      return Promise.resolve({ ok: false, error: `mind is ${this._state}` });
    }
    const id = `inst${++this._instrumentSeq}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._pendingInstrument.delete(id);
        resolve({ ok: false, error: `instrument request timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      this._pendingInstrument.set(id, (frame) => {
        clearTimeout(timer);
        if (frame.ok) {
          resolve({
            ok: true,
            active: frame.active,
            ollamaModel: frame.ollamaModel,
            ollamaEnabled: frame.ollamaEnabled,
            instruments: frame.instruments ?? [],
          });
        } else {
          resolve({ ok: false, error: String(frame.reason ?? "instrument request failed") });
        }
      });
      try {
        this._proc.stdin.write(JSON.stringify({ id, ...payload }) + "\n");
      } catch (err) {
        clearTimeout(timer);
        this._pendingInstrument.delete(id);
        resolve({ ok: false, error: String(err && err.message ? err.message : err) });
      }
    });
  }
  /**
   * P6-D — the learning-mode dial. `mode` is EFFICIENT | TRAINING | REPLAY; the
   * loop flips its consolidation governor and journals mode.change. Resolves
   * {ok, mode, reinjectionEnabled, replaySweeps, replayDefers} or {ok:false,
   * error} when the mind rejects the mode (leaving it unchanged).
   */
  setMode(mode, timeoutMs = 30_000) {
    return this._modeRequest({ type: "mode.set", mode: String(mode) }, timeoutMs);
  }

  /** Shared id-keyed mode request/response (mirrors _scalingRequest). */
  /**
  /**
   * F4 — hand the mind a URL to read + learn from (web.feed). Resolves
   * {ok, url, chars, chunks} or {ok:false, error}. Honest: a fetch failure is
   * the real reason, never a fabricated page.
   */
  webFeed(url, timeoutMs = 60_000) {
    if (!this._proc || this._state !== "awake") {
      return Promise.resolve({ ok: false, error: `mind is ${this._state}` });
    }
    const id = `web${++this._webSeq}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._pendingWeb.delete(id);
        resolve({ ok: false, error: `web feed timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      this._pendingWeb.set(id, (frame) => {
        clearTimeout(timer);
        if (frame.ok) resolve({ ok: true, url: frame.url, chars: frame.chars, chunks: frame.chunks });
        else resolve({ ok: false, error: String(frame.reason ?? "web feed failed") });
      });
      try {
        this._proc.stdin.write(JSON.stringify({ id, type: "web.feed", url: String(url).slice(0, 2000) }) + "\n");
      } catch (err) {
        clearTimeout(timer);
        this._pendingWeb.delete(id);
        resolve({ ok: false, error: String(err && err.message ? err.message : err) });
      }
    });
  }

  /**
   * ADR-001 - flip or read a Sigma-panel sense (retention | telemetry) on the
   * live mind. Resolves {ok, sense, enabled} or {ok:false, error}. Honest: a
   * not-wired sense is the bridge's real reason, never an assumed state.
   */
  setSense(sense, enabled, timeoutMs = 15_000) {
    if (!this._proc || this._state !== "awake") {
      return Promise.resolve({ ok: false, error: `mind is ${this._state}` });
    }
    const id = `sense${++this._senseSeq}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._pendingSense.delete(id);
        resolve({ ok: false, error: `sense request timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      this._pendingSense.set(id, (frame) => {
        clearTimeout(timer);
        if (frame.ok) resolve({ ok: true, sense: frame.sense, enabled: frame.enabled });
        else resolve({ ok: false, error: String(frame.reason ?? "sense request failed") });
      });
      const payload = { id, type: "sense.set", sense: String(sense) };
      if (typeof enabled === "boolean") payload.enabled = enabled;
      try {
        this._proc.stdin.write(JSON.stringify(payload) + "\n");
      } catch (err) {
        clearTimeout(timer);
        this._pendingSense.delete(id);
        resolve({ ok: false, error: String(err && err.message ? err.message : err) });
      }
    });
  }

  _modeRequest(payload, timeoutMs) {
    if (!this._proc || this._state !== "awake") {
      return Promise.resolve({ ok: false, error: `mind is ${this._state}` });
    }
    const id = `mode${++this._modeSeq}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._pendingMode.delete(id);
        resolve({ ok: false, error: `mode request timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      this._pendingMode.set(id, (frame) => {
        clearTimeout(timer);
        if (frame.ok) {
          resolve({ ok: true, mode: frame.mode, reinjectionEnabled: frame.reinjectionEnabled, replaySweeps: frame.replaySweeps, replayDefers: frame.replayDefers });
        } else {
          resolve({ ok: false, error: String(frame.reason ?? "mode request failed") });
        }
      });
      try {
        this._proc.stdin.write(JSON.stringify({ id, ...payload }) + "\n");
      } catch (err) {
        clearTimeout(timer);
        this._pendingMode.delete(id);
        resolve({ ok: false, error: String(err && err.message ? err.message : err) });
      }
    });
  }

  /**
   * P6-E — teach one domain corpus (business doc / software UI / instruction)
   * through the curriculum adapter. Resolves {ok, result} where result is the
   * honest per-corpus verdict (frames fed + measured mastery + learned flag),
   * or {ok:false, error} when the mind refuses (no curriculum wired / bad shape).
   */
  teachCorpus(corpus, timeoutMs = 30_000) {
    return this._teachRequest({ type: "teach.corpus", corpus }, timeoutMs);
  }

  /** Shared id-keyed teach request/response (mirrors _scalingRequest). */
  _teachRequest(payload, timeoutMs) {
    if (!this._proc || this._state !== "awake") {
      return Promise.resolve({ ok: false, error: `mind is ${this._state}` });
    }
    const id = `teach${++this._teachSeq}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._pendingTeach.delete(id);
        resolve({ ok: false, error: `teach request timed out after ${timeoutMs}ms` });
      }, timeoutMs);
      this._pendingTeach.set(id, (frame) => {
        clearTimeout(timer);
        if (frame.ok) {
          resolve({ ok: true, result: frame.result ?? null });
        } else {
          resolve({ ok: false, error: String(frame.reason ?? "teach request failed") });
        }
      });
      try {
        this._proc.stdin.write(JSON.stringify({ id, ...payload }) + "\n");
      } catch (err) {
        clearTimeout(timer);
        this._pendingTeach.delete(id);
        resolve({ ok: false, error: String(err && err.message ? err.message : err) });
      }
    });
  }
}

module.exports = { MindService };
