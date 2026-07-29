/**
 * RHUFT Mind — Lexicon: Language = grounded dictionary (M7)
 *
 * Epistemic Status: [SPEC] + [PHIL] — Cognition layer. ADDITIVE module.
 *
 * [PHIL] — In RHUFT a word is not a token: it is a pointer to stable geometric
 * structure, and a LANGUAGE is a set of such pointers plus the relations
 * between them. The ConceptRegistry grounds word↔geometry; the ConceptGlossary
 * (M4) holds what a concept MEANS; the lexicon is the LANGUAGE FRONT that sits
 * on top of both and asks the questions language answers:
 *
 *   - "what is <word>?"           → binding: pos, gloss, geometry-resonance,
 *                                   verified mastery of the underlying concept.
 *   - "how are <a> and <b> related?" → the grounded RELATION GRAPH: typed edges
 *                                   (is-a / related-to / opposite-of / part-of)
 *                                   the mind has verified through interaction,
 *                                   each carrying the φ-decayed mean resonance
 *                                   of the pair's actual geometry.
 *   - "does the mind KNOW <word>?" → mastery (M6), not decoration: a word is
 *                                   only "known" when its concept's verified
 *                                   predictions beat the φ-prior ≥ F₅ times.
 *
 * Design laws (TRUTH_SOURCES):
 *   - NOTHING is asserted that was not measured. A relation's strength is the
 *     mean resonance of the pair's observed co-occurrences, never a guess.
 *   - Every binding is derivable from the registry + glossary at load — the
 *     lexicon persists ONLY its relation edges; word bindings are recomputed
 *     (no duplicated truth to drift).
 *   - Bounded everywhere: max words / relations are Fibonacci caps. [SPEC]
 *
 * Persistence: mind_state/relations.json, atomic write (tmp+rename), validated
 * on load, corrupt → quarantined + fresh start — the MemoryStore discipline.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { PHI_INV, PHI_NEG2 } from "./../core/constants.ts";
import { resonance } from "./../adapters/language_codec.ts";
import type { ConceptRegistry, Concept } from "./concept_registry.ts";
import type { ConceptGlossary } from "./glossary.ts";

/** Typed semantic relation between two grounded words. [SPEC] */
export type RelationKind = "is-a" | "related-to" | "opposite-of" | "part-of";

const RELATION_KINDS: readonly RelationKind[] = ["is-a", "related-to", "opposite-of", "part-of"];

/** A grounded word: the union of what the registry, glossary and mastery say. */
export interface LexicalBinding {
  readonly word: string;
  /** The concept this word is grounded on (null when ungrounded). */
  readonly conceptId: string | null;
  /** Part of speech (noun/verb/…) when the lexical instrument supplied it. */
  readonly pos: string | null;
  /** The dictionary gloss (from M4 glossary), null when never defined. */
  readonly gloss: string | null;
  /** Words this word is grounded to by a verified relation. */
  readonly relations: ReadonlyArray<{ kind: RelationKind; to: string; strength: number }>;
  /** M6 — verified-prediction mastery of the underlying concept. */
  readonly mastery: number;
  readonly verifications: number;
  readonly learned: boolean;
}

/** A directed, typed edge in the grounded relation graph. */
export interface RelationEdge {
  readonly from: string; // normalized word
  readonly to: string;   // normalized word
  readonly kind: RelationKind;
  /** φ-decayed mean resonance of the pair's geometry across observations. */
  strength: number;
  /** How many verified observations fed the strength. */
  evidence: number;
}

interface SerializedRelations {
  readonly version: 1;
  readonly savedAt: number;
  readonly edges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
    readonly kind: RelationKind;
    readonly strength: number;
    readonly evidence: number;
  }>;
}

/** Word cap: F₁₄ = 377. [SPEC] */
const MAX_WORDS = 377;
/** Relation-edge cap: F₁₃ = 233. [SPEC] */
const MAX_RELATIONS = 233;
/** Recognition floor for "grounded": λ = φ⁻². [SPEC] */
const GROUNDED_LAMBDA = PHI_NEG2;

export class Lexicon {
  private readonly _file: string;
  private readonly _registry: ConceptRegistry;
  private readonly _glossary: ConceptGlossary | undefined;
  /** Parts of speech learned for words (from the lexical instrument). */
  private readonly _pos = new Map<string, string>();
  /** The relation graph: key = `${from}${to}${kind}`. */
  private readonly _edges = new Map<string, RelationEdge>();

  constructor(stateDir: string, registry: ConceptRegistry, glossary?: ConceptGlossary) {
    this._file = path.join(stateDir, "relations.json");
    this._registry = registry;
    this._glossary = glossary;
  }

  /** Number of grounded words (named concepts). */
  get wordCount(): number {
    let n = 0;
    for (const c of this._registry.all()) if (c.labels.length > 0) n++;
    return n;
  }

  get relationCount(): number {
    return this._edges.size;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Lookup — "what is <word>?"
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Resolve a word to its grounded binding, or null when the mind has no
   * grounded concept for it. A word counts as grounded when it is a LABEL on a
   * named concept (the registry's own ground of meaning) — the resonance floor
   * λ = φ⁻² is what the registry uses to accept a label-percept match. [SPEC]
   */
  resolve(word: string): LexicalBinding | null {
    const w = word.trim().toLowerCase();
    if (w.length === 0) return null;
    const concept = this._registry.findByLabel(w);
    if (!concept) return null;
    return this._binding(w, concept);
  }

  /** All grounded words (the mind's current vocabulary). */
  vocabulary(): string[] {
    const out: string[] = [];
    for (const c of this._registry.all()) {
      if (c.labels.length > 0) out.push(c.labels[0]!);
    }
    return out.sort();
  }

  /** Every relation edge touching a word (both directions). */
  relationsOf(word: string): RelationEdge[] {
    const w = word.trim().toLowerCase();
    const out: RelationEdge[] = [];
    for (const e of this._edges.values()) {
      if (e.from === w || e.to === w) out.push(e);
    }
    return out;
  }

  /** The strongest relation between two words, if one is grounded. */
  relationBetween(a: string, b: string): RelationEdge | null {
    const x = a.trim().toLowerCase();
    const y = b.trim().toLowerCase();
    let best: RelationEdge | null = null;
    for (const e of this._edges.values()) {
      const forward = e.from === x && e.to === y;
      const backward = e.from === y && e.to === x;
      if ((forward || backward) && (best === null || e.strength > best.strength)) {
        best = e;
      }
    }
    return best;
  }

  private _binding(word: string, concept: Concept): LexicalBinding {
    const entry = this._glossary?.get(concept.id);
    const mastery = this._registry.masteryOf(concept.id);
    const rels: Array<{ kind: RelationKind; to: string; strength: number }> = [];
    for (const e of this.relationsOf(word)) {
      rels.push({ kind: e.kind, to: e.from === word ? e.to : e.from, strength: e.strength });
    }
    // Highest-strength relations first — the most verified meaning up front.
    rels.sort((a, b) => b.strength - a.strength);
    return {
      word,
      conceptId: concept.id,
      pos: this._pos.get(word) ?? null,
      gloss: entry?.definition ?? null,
      relations: rels,
      mastery: mastery.mastery,
      verifications: mastery.verifications,
      learned: mastery.learned,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Learning — grow the graph from verified interactions
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Record a part of speech for a grounded word (from the lexical instrument).
   * Only stored when the word is actually grounded — never invent a grammar
   * for a word the mind does not know. [SPEC]
   */
  recordPos(word: string, pos: string): boolean {
    const w = word.trim().toLowerCase();
    const p = pos.trim().toLowerCase();
    if (w.length === 0 || p.length === 0) return false;
    if (this._registry.findByLabel(w) === undefined) return false; // ungrounded
    this._pos.set(w, p.slice(0, 24));
    return true;
  }

  /**
   * Assert a verified typed relation between two grounded words.
   *
   * [MATH] — strength is a φ-decayed running mean of the pair's measured
   * co-occurrence resonance: s ← s·(1−φ⁻²) + measured·φ⁻². The FIRST observation
   * seeds the edge at the measured resonance; subsequent observations harden it
   * toward the pair's true geometric agreement. An edge is NEVER created at a
   * hand-picked weight — it carries only what was measured. [SPEC]
   *
   * @returns the edge (new or updated), or null when either word is ungrounded.
   */
  assertRelation(from: string, to: string, kind: RelationKind, measured: number): RelationEdge | null {
    const a = from.trim().toLowerCase();
    const b = to.trim().toLowerCase();
    if (a.length === 0 || b.length === 0 || a === b) return null;
    if (!RELATION_KINDS.includes(kind)) return null;
    // Both words must be grounded — a relation between unknowns is not language.
    if (this._registry.findByLabel(a) === undefined) return null;
    if (this._registry.findByLabel(b) === undefined) return null;
    const m = Number.isFinite(measured) ? Math.min(1, Math.max(0, measured)) : 0;
    const key = `${a}${b}${kind}`;
    const existing = this._edges.get(key);
    if (existing) {
      existing.strength = existing.strength * (1 - PHI_NEG2) + m * PHI_NEG2;
      existing.evidence += 1;
      this._save();
      return existing;
    }
    const edge: RelationEdge = { from: a, to: b, kind, strength: m, evidence: 1 };
    this._edges.set(key, edge);
    this._evictRelationsIfNeeded();
    this._save();
    return edge;
  }

  /**
   * Compute the measured co-occurrence resonance of two words' geometry —
   * the honest number an edge carries. Uses each word's concept semantic
   * prototype (the fused word-geometry), falling back to the percept
   * prototype. [MATH]
   */
  measurePairResonance(a: string, b: string): number {
    const ca = this._registry.findByLabel(a);
    const cb = this._registry.findByLabel(b);
    if (!ca || !cb) return 0;
    const fa = ca.semantic ?? ca.prototype;
    const fb = cb.semantic ?? cb.prototype;
    return resonance(fa, fb);
  }

  /**
   * Compose a short dictionary FRAGMENT for a word — the language-front's own
   * answer, assembled from grounded truth only. Returns null when the word is
   * ungrounded. This is what the bridge speaks when it answers from the
   * dictionary without calling the LLM. [SPEC]
   */
  fragment(word: string): string | null {
    const b = this.resolve(word);
    if (!b) return null;
    const parts: string[] = [];
    const head = b.pos ? `${b.word} (${b.pos})` : b.word;
    if (b.gloss) {
      parts.push(`${head}: ${b.gloss}`);
    } else {
      parts.push(`${head} — a word I have grounded but not yet defined.`);
    }
    if (b.relations.length > 0) {
      const relStr = b.relations
        .slice(0, 4)
        .map((r) => `${r.kind} ${r.to}`)
        .join("; ");
      parts.push(`Relations: ${relStr}.`);
    }
    if (b.learned) {
      parts.push(`(verified: mastery ${b.mastery.toFixed(3)} across ${b.verifications} predictions)`);
    } else if (b.verifications > 0) {
      parts.push(`(still learning: ${b.verifications} verifications, mastery ${b.mastery.toFixed(3)})`);
    }
    return parts.join(" ");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Persistence — relations.json, the MemoryStore discipline
  // ───────────────────────────────────────────────────────────────────────────

  private _evictRelationsIfNeeded(): void {
    if (this._edges.size <= MAX_RELATIONS) return;
    // Evict the weakest-evidence edge (ties → lowest strength). [SPEC]
    let weakestKey: string | null = null;
    let weakestEvidence = Infinity;
    let weakestStrength = Infinity;
    for (const [k, e] of this._edges) {
      if (e.evidence < weakestEvidence || (e.evidence === weakestEvidence && e.strength < weakestStrength)) {
        weakestKey = k;
        weakestEvidence = e.evidence;
        weakestStrength = e.strength;
      }
    }
    if (weakestKey !== null) this._edges.delete(weakestKey);
  }

  private _save(): void {
    try {
      const payload: SerializedRelations = {
        version: 1,
        savedAt: Date.now(),
        edges: [...this._edges.values()].map((e) => ({
          from: e.from,
          to: e.to,
          kind: e.kind,
          strength: e.strength,
          evidence: e.evidence,
        })),
      };
      const tmp = this._file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(payload));
      fs.renameSync(tmp, this._file);
    } catch {
      /* persistence loss must never kill cognition; next assert retries */
    }
  }

  /** Load + validate relation edges. Corrupt → quarantined, fresh start. */
  load(): { ok: boolean; restored: number; quarantined?: string } {
    if (!fs.existsSync(this._file)) return { ok: true, restored: 0 };
    try {
      const raw = JSON.parse(fs.readFileSync(this._file, "utf8")) as SerializedRelations;
      if (raw.version !== 1 || !Array.isArray(raw.edges)) {
        throw new Error("lexicon: bad relations shape (version/edges)");
      }
      let restored = 0;
      for (const e of raw.edges) {
        if (
          typeof e.from === "string" && e.from.length > 0 &&
          typeof e.to === "string" && e.to.length > 0 &&
          typeof e.kind === "string" && (RELATION_KINDS as readonly string[]).includes(e.kind) &&
          Number.isFinite(e.strength) &&
          Number.isFinite(e.evidence)
        ) {
          const key = `${e.from}${e.to}${e.kind}`;
          this._edges.set(key, {
            from: e.from,
            to: e.to,
            kind: e.kind,
            strength: Math.min(1, Math.max(0, e.strength)),
            evidence: Math.max(1, Math.floor(e.evidence)),
          });
          restored++;
        }
      }
      return { ok: true, restored };
    } catch {
      const aside = `${this._file}.quarantine-${Date.now()}`;
      try {
        fs.renameSync(this._file, aside);
      } catch { /* best effort */ }
      this._edges.clear();
      return { ok: false, restored: 0, quarantined: aside };
    }
  }
}
