/**
 * RHUFT Mind — Ollama Supervisor: local LLM runtime lifecycle
 *
 * Epistemic Status: [SPEC] — Adapter-layer process management.
 *
 * The phi (2.7B language) and mathstral (7B math) model weights already live
 * INSIDE the brain directory as a valid Ollama model store:
 *   <brainDir>/manifests/registry.ollama.ai/library/{phi,mathstral}/latest
 *   <brainDir>/blobs/sha256-...
 *
 * Strategy (zero human interaction):
 *   1. Probe the default Ollama endpoint (127.0.0.1:11434). If it is already
 *      serving AND has both models, use it.
 *   2. Otherwise spawn our own `ollama serve` on a dedicated port (11500) with
 *      OLLAMA_MODELS pointed at the brain directory, health-check until ready,
 *      and auto-restart on crash with a φ-scaled exponential backoff ladder.
 *
 * TRUTH_SOURCES: if no server can be reached/started, the supervisor reports
 * failure honestly — tools become unavailable; nothing is mocked.
 */

import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { PHI } from "./../core/constants.ts";

/** Models the mind requires. [SPEC] */
export const PHI_MODEL = "phi:latest";
export const MATHSTRAL_MODEL = "mathstral:latest";

/** φ-scaled backoff ladder in ms: 1000·φ^k, capped at ~60 s. [SPEC] */
function backoffMs(attempt: number): number {
  const ms = 1000 * Math.pow(PHI, attempt);
  return Math.min(ms, 60_000);
}

export interface SupervisorStatus {
  readonly running: boolean;
  readonly baseUrl: string;
  readonly ownProcess: boolean;
  readonly models: string[];
}

export class OllamaSupervisor {
  /** Directory that contains manifests/ and blobs/ (the brain directory). */
  readonly modelsDir: string;

  private _baseUrl: string = "http://127.0.0.1:11434";
  private _proc: ChildProcess | null = null;
  private _stopping: boolean = false;
  private _restartAttempt: number = 0;

  constructor(modelsDir: string) {
    this.modelsDir = modelsDir;
  }

  get baseUrl(): string {
    return this._baseUrl;
  }

  /**
   * ADR-009 — SPEECH-MODULE SELF-HEAL. The brain's blobs/ + manifests/ ARE the
   * speech module (the phi/mathstral weights the mind thinks + speaks with). The
   * installer deliberately does NOT ship 5.4 GB of weights, so a fresh install can
   * wake MUTE. This verifies the phi + mathstral manifests are present in the brain
   * store and, when any is missing AND a network pull is possible, repairs it.
   * Read-only on the engine; only ever ADDS model files. Never throws — a missing
   * module is reported honestly in the result, never faked. [SPEC]
   *
   * @returns per-model presence after the heal attempt (true = speech module ready).
   */
  async ensureModelsPresent(): Promise<{ phi: boolean; mathstral: boolean; healed: string[]; note: string }> {
    const healed: string[] = [];
    const missing: string[] = [];
    for (const model of [PHI_MODEL, MATHSTRAL_MODEL]) {
      const name = model.split(":")[0]!;
      const manifest = path.join(this.modelsDir, "manifests", "registry.ollama.ai", "library", name, "latest");
      if (fs.existsSync(manifest)) continue; // speech module already present
      // Missing → best-effort repair via the running server (needs network). The
      // spawn in ensureRunning brings the server up; here we only ask it to pull.
      try {
        const base = this._baseUrl;
        const res = await fetch(`${base}/api/pull`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: model, stream: false }),
        });
        if (res.ok) healed.push(model); else missing.push(model);
      } catch {
        missing.push(model);
      }
    }
    const phi = fs.existsSync(path.join(this.modelsDir, "manifests", "registry.ollama.ai", "library", "phi", "latest"));
    const mathstral = fs.existsSync(path.join(this.modelsDir, "manifests", "registry.ollama.ai", "library", "mathstral", "latest"));
    const note = phi && mathstral
      ? (healed.length > 0 ? `speech module repaired: pulled ${healed.join(", ")}` : "speech module present")
      : `speech module INCOMPLETE — missing manifests for ${missing.join(", ") || "unknown"} (offline? weights not shipped)`;
    return { phi, mathstral, healed, note };
  }

  /**
   * Ensure a serving Ollama with both models is available.
   * Returns the status; throws only on unrecoverable misconfiguration.
   */
  async ensureRunning(): Promise<SupervisorStatus> {
    // 1. Try the default endpoint first (an already-running Ollama).
    const defaultUrl = "http://127.0.0.1:11434";
    const defaultModels = await this._listModels(defaultUrl);
    if (defaultModels !== null && this._hasRequiredModels(defaultModels)) {
      this._baseUrl = defaultUrl;
      return { running: true, baseUrl: defaultUrl, ownProcess: false, models: defaultModels };
    }

    // 2. Spawn our own instance on a dedicated port with the brain model store.
    const ownUrl = "http://127.0.0.1:11500";
    const ownModels = await this._listModels(ownUrl);
    if (ownModels !== null && this._hasRequiredModels(ownModels)) {
      this._baseUrl = ownUrl;
      return { running: true, baseUrl: ownUrl, ownProcess: false, models: ownModels };
    }

    this._spawn(ownUrl);
    const ready = await this._waitHealthy(ownUrl, 13); // 13 = F_7 attempts. [SPEC]
    if (!ready) {
      return { running: false, baseUrl: ownUrl, ownProcess: true, models: [] };
    }
    this._baseUrl = ownUrl;
    const models = (await this._listModels(ownUrl)) ?? [];
    return {
      running: this._hasRequiredModels(models),
      baseUrl: ownUrl,
      ownProcess: true,
      models,
    };
  }

  /**
   * Warm both models so first real tool call is fast (keep_alive pinned).
   *
   * VERIFIED warm-up (measured 2026-08-13): the old probe sent an EMPTY prompt
   * and ignored the body, so it confirmed only that the weights LOADED — not
   * that the model could GENERATE. A cold model answers its first real calls
   * with empty responses (the "llama not responding" symptom) while the
   * supervisor already reported ready. Now the warm-up is a REAL bounded
   * generate, retried until the model returns a non-empty completion (or the
   * attempt budget runs out) — "ready" means "responsive", not "loaded". [FIX]
   */
  async warmModels(): Promise<void> {
    for (const model of [PHI_MODEL, MATHSTRAL_MODEL]) {
      await this._warmOne(model, 3); // 3 = F_4 attempts per model. [SPEC]
    }
  }

  /**
   * Drive one model until it produces a non-empty generate (weights loaded AND
   * sampler live), or the attempt budget is spent. Best-effort: a model that
   * never responds is left for the real call path's own retries to surface —
   * warm-up never throws. [SPEC]
   */
  private async _warmOne(model: string, attempts: number): Promise<void> {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(`${this._baseUrl}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            prompt: "Reply with the single word: ready.",
            keep_alive: "30m",
            stream: false,
            options: { num_predict: 8, temperature: 0 },
          }),
          signal: AbortSignal.timeout(120_000),
        });
        if (!res.ok) continue;
        const body = (await res.json()) as { response?: unknown };
        if (typeof body.response === "string" && body.response.trim().length > 0) return;
      } catch {
        // Warm-up is best-effort; the real call path has its own retries.
      }
      await new Promise((r) => setTimeout(r, backoffMs(i)));
    }
  }

  /** Stop the supervised process (if we own one). */
  stop(): void {
    this._stopping = true;
    if (this._proc && !this._proc.killed) {
      this._proc.kill();
    }
    this._proc = null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────────

  private _hasRequiredModels(models: string[]): boolean {
    const names = models.map((m) => m.toLowerCase());
    const hasPhi = names.some((n) => n === PHI_MODEL || n.startsWith("phi:"));
    const hasMathstral = names.some((n) => n === MATHSTRAL_MODEL || n.startsWith("mathstral:"));
    return hasPhi && hasMathstral;
  }

  /** GET /api/tags → model names, or null if unreachable. */
  private async _listModels(baseUrl: string): Promise<string[] | null> {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { models?: Array<{ name?: string }> };
      if (!Array.isArray(body.models)) return [];
      return body.models
        .map((m) => (typeof m.name === "string" ? m.name : ""))
        .filter((n) => n.length > 0);
    } catch {
      return null;
    }
  }

  private _spawn(ownUrl: string): void {
    const host = ownUrl.replace(/^https?:\/\//, "");
    const env = {
      ...process.env,
      OLLAMA_HOST: host,
      OLLAMA_MODELS: this.modelsDir,
      OLLAMA_KEEP_ALIVE: "30m",
    };
    this._proc = spawn("ollama", ["serve"], {
      env,
      stdio: "ignore",
      windowsHide: true,
    });
    this._proc.on("exit", () => {
      if (this._stopping) return;
      // Auto-restart with φ-scaled backoff. [SPEC]
      const delay = backoffMs(this._restartAttempt++);
      setTimeout(() => {
        if (!this._stopping) this._spawn(ownUrl);
      }, delay).unref();
    });
    this._proc.on("error", () => {
      // Binary missing/not startable: ensureRunning() health-check will report
      // failure honestly; nothing is mocked.
    });
  }

  private async _waitHealthy(baseUrl: string, attempts: number): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
      const models = await this._listModels(baseUrl);
      if (models !== null) {
        this._restartAttempt = 0;
        return true;
      }
      await new Promise((r) => setTimeout(r, backoffMs(i)));
    }
    return false;
  }
}
