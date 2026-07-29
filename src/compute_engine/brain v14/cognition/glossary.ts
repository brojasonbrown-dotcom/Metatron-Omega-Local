/**
 * RHUFT Mind — Concept Glossary: dictionary-quality memory (M4)
 *
 * Epistemic Status: [SPEC] — Cognition layer. ADDITIVE module.
 *
 * The registry knows a concept's LABELS and GEOMETRY; the glossary knows what
 * the concept MEANS. define/relate results were previously journaled and lost
 * to time — the glossary persists them ON the concept, so a learned word is
 * answered from the dictionary, never re-asked of the LLM (measured gate:
 * the second answer carries no LLM latency).
 *
 * Persistence: mind_state/glossary.json, atomic write (tmp+rename), validated
 * on load, corrupt → quarantined + fresh start — the MemoryStore discipline.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface GlossaryEntry {
  /** The concept this meaning belongs to. */
  readonly conceptId: string;
  /** The learned definition (define tool) or relation text (relate tool). */
  readonly definition: string;
  /** Related words (define) or the related pair (relate). */
  readonly related: readonly string[];
  /** Which instrument produced it. */
  readonly source: "define" | "relate";
  /** Tool confidence/strength when known (else 0.5). */
  readonly confidence: number;
  readonly learnedAt: number;
}

interface SerializedGlossary {
  readonly version: 1;
  readonly savedAt: number;
  readonly entries: readonly GlossaryEntry[];
}

const MAX_DEFINITION = 2000;
const MAX_RELATED = 8;

export class ConceptGlossary {
  private readonly _file: string;
  private readonly _entries = new Map<string, GlossaryEntry>();

  constructor(stateDir: string) {
    this._file = path.join(stateDir, "glossary.json");
  }

  get size(): number {
    return this._entries.size;
  }

  get(conceptId: string): GlossaryEntry | undefined {
    return this._entries.get(conceptId);
  }

  /** Look a meaning up by any of its words (label or related). */
  findByWord(word: string): GlossaryEntry | undefined {
    const w = word.trim().toLowerCase();
    for (const e of this._entries.values()) {
      if (e.related.some((r) => r.toLowerCase() === w)) return e;
    }
    // primary pass: match the concept's word recorded in the entry's own label
    for (const e of this._entries.values()) {
      if (e.definition.toLowerCase().includes(w)) return e;
    }
    return undefined;
  }

  /** Record a learned meaning (idempotent per concept; newest wins). */
  learn(entry: Omit<GlossaryEntry, "learnedAt">): void {
    if (!Number.isFinite(entry.confidence) || entry.confidence < 0 || entry.confidence > 1) {
      throw new RangeError(`glossary: confidence must be in [0,1], got ${entry.confidence}`);
    }
    const definition = entry.definition.trim().slice(0, MAX_DEFINITION);
    if (definition.length === 0) {
      throw new RangeError("glossary: empty definition — nothing is learned from nothing");
    }
    this._entries.set(entry.conceptId, {
      ...entry,
      definition,
      related: entry.related.slice(0, MAX_RELATED),
      learnedAt: Date.now(),
    });
    this._save();
  }

  /**
   * Re-key entries after a registry consolidation: each absorbed (loser) id's
   * meaning moves onto its survivor. Order-independent: the highest-confidence
   * meaning among {survivor's own entry, all absorbed entries} always wins, no
   * matter which way the map iterates. [FIX — keeps the dictionary consistent
   * across a merge]
   */
  rekey(absorbed: ReadonlyMap<string, string>): number {
    // Group all candidate entries by their final (survivor) id first.
    const bySurvivor = new Map<string, GlossaryEntry[]>();
    const losers: string[] = [];
    for (const [loserId, survivorId] of absorbed) {
      const loserEntry = this._entries.get(loserId);
      losers.push(loserId);
      if (!loserEntry) continue;
      const list = bySurvivor.get(survivorId) ?? [];
      list.push(loserEntry);
      bySurvivor.set(survivorId, list);
    }
    let moved = 0;
    for (const [survivorId, candidates] of bySurvivor) {
      const existing = this._entries.get(survivorId);
      const all = existing ? [existing, ...candidates] : candidates;
      // Highest confidence wins; ties broken by most recently learned.
      let best = all[0]!;
      for (const e of all) {
        if (e.confidence > best.confidence ||
            (e.confidence === best.confidence && e.learnedAt > best.learnedAt)) {
          best = e;
        }
      }
      this._entries.set(survivorId, { ...best, conceptId: survivorId });
      moved += candidates.length;
    }
    for (const loserId of losers) this._entries.delete(loserId);
    if (moved > 0) this._save();
    return moved;
  }

  all(): readonly GlossaryEntry[] {
    return [...this._entries.values()];
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Persistence — the MemoryStore discipline: atomic, validated, quarantined
  // ───────────────────────────────────────────────────────────────────────────

  private _save(): void {
    try {
      const payload: SerializedGlossary = {
        version: 1,
        savedAt: Date.now(),
        entries: this.all(),
      };
      const tmp = this._file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(payload));
      fs.renameSync(tmp, this._file);
    } catch {
      /* journal-loss must never kill cognition; next learn() retries */
    }
  }

  /** Load + validate. Corrupt file → renamed aside, fresh start, honest reason. */
  load(): { ok: boolean; restored: number; quarantined?: string } {
    if (!fs.existsSync(this._file)) return { ok: true, restored: 0 };
    try {
      const raw = JSON.parse(fs.readFileSync(this._file, "utf8")) as SerializedGlossary;
      if (raw.version !== 1 || !Array.isArray(raw.entries)) {
        throw new Error("glossary: bad shape (version/entries)");
      }
      let restored = 0;
      for (const e of raw.entries) {
        if (
          typeof e.conceptId === "string" && e.conceptId.length > 0 &&
          typeof e.definition === "string" && e.definition.trim().length > 0 &&
          Array.isArray(e.related) && e.related.every((r: unknown) => typeof r === "string") &&
          (e.source === "define" || e.source === "relate") &&
          Number.isFinite(e.confidence) &&
          Number.isFinite(e.learnedAt)
        ) {
          this._entries.set(e.conceptId, e);
          restored++;
        }
      }
      return { ok: true, restored };
    } catch (err) {
      const aside = `${this._file}.quarantine-${Date.now()}`;
      try {
        fs.renameSync(this._file, aside);
      } catch { /* best effort */ }
      this._entries.clear();
      return { ok: false, restored: 0, quarantined: aside };
    }
  }
}
