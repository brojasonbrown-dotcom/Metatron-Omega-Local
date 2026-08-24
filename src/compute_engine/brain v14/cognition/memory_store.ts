/**
 * RHUFT Mind — Memory Store: persistence of learned state + thought journal
 *
 * Epistemic Status: [SPEC] — Adapter-layer persistence, not RHUFT math.
 *
 * TRUTH_SOURCES policy:
 *   - Load path is schema-validated (schemas/validate.ts#validateMindState).
 *   - A corrupt/invalid state file is QUARANTINED (renamed with a timestamp
 *     suffix) and the mind starts fresh — we never silently repair or mock.
 *   - The journal is append-only JSONL: every sensory frame summary, stable
 *     thought, tool call, LLM response, and resonance score is recorded, so
 *     the entire learning history is auditable.
 *
 * Writes are atomic: write to a temp file, then rename over the target.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { validateMindState } from "./../schemas/validate.ts";
import { ConceptRegistry } from "./concept_registry.ts";

/** A single journal record (JSONL line). [SPEC] */
export interface JournalEntry {
  readonly t: number;
  readonly kind:
    | "boot"
    | "sense"
    | "thought"
    | "tool.call"
    | "tool.ok"
    | "tool.fail"
    | "name.suppressed"
    | "gate.reject"
    | "gate.invariant"
    | "gate.corrected"
    | "gate.echo"
    | "voice"
    | "learn"
    | "prediction"
    | "verification"
    | "instrument.switch"
    | "instrument.failover"
    | "snapshot"
    | "error"
    | "recall.belowmargin"
    | "recall.reinjection"
    | "manifold.relation"
    | "mode.change"
    | "replay.step"
    | "replay.deferred"
    | "spectral.percept"
    | "novelty.gate"
      | "retention.admit"
      | "retention.defer"
      | "sense.toggle"
      | "shutdown";
  readonly data: Record<string, unknown>;
}

export interface LoadResult {
  readonly loaded: boolean;
  readonly stableThoughtCount: number;
  readonly quarantined: string | null;
  /** Restored episodic Hopfield attractors (empty for older saves). [FIX] */
  readonly episodes?: readonly string[];
}

/**
 * Persists the mind's learned state under `<stateDir>/`:
 *   - mind_state.json   — concept lexicon + counters (schema-validated)
 *   - journal.jsonl     — append-only audit trail
 */
export class MemoryStore {
  readonly stateDir: string;
  readonly statePath: string;
  readonly journalPath: string;

  private _journalStream: fs.WriteStream | null = null;

  constructor(stateDir: string) {
    this.stateDir = stateDir;
    this.statePath = path.join(stateDir, "mind_state.json");
    this.journalPath = path.join(stateDir, "journal.jsonl");
  }

  /** Ensure the state directory exists and open the journal stream. */
  open(): void {
    fs.mkdirSync(this.stateDir, { recursive: true });
    this._journalStream = fs.createWriteStream(this.journalPath, { flags: "a" });
    // A journal I/O failure must never become an uncaught exception that
    // kills the mind — losing the journal loses history, not cognition. [SPEC]
    this._journalStream.on("error", () => {
      this._journalStream = null;
    });
  }

  close(): void {
    if (this._journalStream) {
      this._journalStream.end();
      this._journalStream = null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Snapshot save/load (atomic, validated, quarantine-on-corruption)
  // ───────────────────────────────────────────────────────────────────────────

  /** Atomically persist the registry snapshot (+ episodic attractors when given). */
  save(registry: ConceptRegistry, stableThoughtCount: number, episodes?: readonly string[]): void {
    const state = registry.serialize(stableThoughtCount, episodes);
    const tmpPath = `${this.statePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state), "utf8");
    fs.renameSync(tmpPath, this.statePath);
  }

  /**
   * Load and validate the persisted state into the registry.
   * Corrupt file → quarantine + fresh start (returns quarantined path).
   */
  load(registry: ConceptRegistry): LoadResult {
    if (!fs.existsSync(this.statePath)) {
      return { loaded: false, stableThoughtCount: 0, quarantined: null, episodes: [] };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(this.statePath, "utf8"));
    } catch (err) {
      const q = this._quarantine(`json parse failed: ${String(err)}`);
      return { loaded: false, stableThoughtCount: 0, quarantined: q };
    }

    const check = validateMindState(parsed);
    if (!check.ok) {
      const q = this._quarantine(check.reason);
      return { loaded: false, stableThoughtCount: 0, quarantined: q };
    }

    registry.restore(check.value);
    return {
      loaded: true,
      stableThoughtCount: check.value.stableThoughtCount,
      quarantined: null,
      episodes: check.value.episodes ?? [],
    };
  }

  /** Rename the corrupt state file aside; never delete, never repair. */
  private _quarantine(reason: string): string {
    const quarantinePath = `${this.statePath}.quarantine-${Date.now()}`;
    try {
      fs.renameSync(this.statePath, quarantinePath);
    } catch {
      // If even the rename fails, leave the file in place; load() already
      // refused to use it, which is the safety property that matters.
    }
    this.journal({
      t: Date.now(),
      kind: "error",
      data: { where: "memory_store.load", reason, quarantined: quarantinePath },
    });
    return quarantinePath;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Append-only journal
  // ───────────────────────────────────────────────────────────────────────────

  /** Append one entry to the JSONL journal (best-effort, never throws). */
  journal(entry: JournalEntry): void {
    const line = `${JSON.stringify(entry)}\n`;
    try {
      if (this._journalStream) {
        this._journalStream.write(line);
      } else {
        fs.appendFileSync(this.journalPath, line, "utf8");
      }
    } catch {
      // Journaling must never crash the mind; stdout still carries the voice.
    }
  }
}
