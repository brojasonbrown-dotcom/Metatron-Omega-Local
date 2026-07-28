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

  /** Warm both models so first real tool call is fast (keep_alive pinned). */
  async warmModels(): Promise<void> {
    for (const model of [PHI_MODEL, MATHSTRAL_MODEL]) {
      try {
        await fetch(`${this._baseUrl}/api/generate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model, prompt: "", keep_alive: "30m", stream: false }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch {
        // Warm-up is best-effort; the real call path has its own retries.
      }
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
