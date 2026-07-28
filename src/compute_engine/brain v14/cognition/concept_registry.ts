/**
 * RHUFT Mind — Concept Registry: the lexicon of learned meanings
 *
 * Epistemic Status: [SPEC] — Cognition-layer structure, not RHUFT field math.
 *
 * [PHIL] — A "concept" is a stable attractor in field space: a prototype
 * 28-element geometric field plus the word labels the mind has learned for it.
 * Recognition is resonance ranking against prototypes; learning is φ-decayed
 * prototype reinforcement (mirrors L1_Pattern) plus label accretion from the
 * LLM tools. The registry is the bridge between engine memories (fields) and
 * language (labels).
 */

import { COHERENCE_THRESHOLD } from "./../core/constants.ts";
import {
  FIELD_SIZE,
  bindMeaning,
  encodeText,
  normalizeField,
  reinforceField,
  resonance,
} from "./../adapters/language_codec.ts";
import type {
  SerializedConcept,
  SerializedMindState,
} from "./../schemas/validate.ts";
import { decodeFieldBase64, encodeFieldBase64 } from "./../schemas/validate.ts";
import { HnswIndex } from "./hnsw_index.ts";

/** A learned concept: field prototype ↔ word labels. [SPEC] */
export interface Concept {
  readonly id: string;
  labels: string[];
  prototype: Float64Array;
  /**
   * Semantic prototype: the φ-weighted fusion of this concept's label
   * language-fields. `null` until the concept is named. Recognition matches a
   * query against BOTH the percept prototype and this semantic prototype, so a
   * concept fires whether the mind senses the thing or hears/reads its word —
   * that dual-channel match is the geometric grounding of meaning. [PHIL]
   */
  semantic: Float64Array | null;
  reinforcement: number;
  readonly firstSeen: number;
  lastSeen: number;
  sourceTrace: string[];
}

/** A resonance-ranked recognition match. */
export interface ConceptMatch {
  readonly concept: Concept;
  readonly resonance: number;
}

/** Result of observing a field: matched existing concept or minted a new one. */
export interface ObserveResult {
  readonly concept: Concept;
  readonly isNew: boolean;
  readonly resonance: number;
}

/**
 * Registry of all learned concepts with resonance-based recognition.
 *
 * Recognition threshold: λ = 1/φ² ≈ 0.382 (COHERENCE_THRESHOLD) — the same
 * threshold the engine uses everywhere for "coherent enough to be the same
 * structure". [SPEC]
 */
export class ConceptRegistry {
  private readonly _concepts: Map<string, Concept> = new Map();
  private _nextId: number = 1;
  /** ANN index over percept prototypes for polylog recognition. [MATH] */
  private readonly _hnsw = new HnswIndex();
  /**
   * Concepts above which ANN is preferred over brute force. Below this the exact
   * scan is cheaper than graph maintenance; above it the graph wins. Mutable so
   * tests can cross the strategy boundary without minting 144 concepts. [SPEC]
   */
  annThreshold: number = 144; // F_12

  /** Recognition threshold λ = 1/φ². [SPEC] */
  readonly recognitionThreshold: number = COHERENCE_THRESHOLD;

  /** Maximum concepts retained (Fibonacci F_16 = 987 · 12 ≈ 11844; use 10946 = F_21). [SPEC] */
  readonly maxConcepts: number = 10946;

  get size(): number {
    return this._concepts.size;
  }

  all(): readonly Concept[] {
    return Array.from(this._concepts.values());
  }

  get(id: string): Concept | undefined {
    return this._concepts.get(id);
  }

  /** Find a concept whose labels include the given word (normalized). */
  findByLabel(label: string): Concept | undefined {
    const norm = label.trim().toLowerCase();
    for (const c of this._concepts.values()) {
      if (c.labels.includes(norm)) return c;
    }
    return undefined;
  }

  /**
   * Rank the k nearest concepts to a field by resonance (descending).
   *
   * [MATH] — Uses the single shared coherence kernel C(a,b). A concept's score
   * is the MAX of its percept-prototype resonance and its semantic-prototype
   * resonance, so recognition fires whether the query is the thing itself or
   * its word. [PHIL] This is the dual-channel ground of meaning.
   *
   * At scale (≥ annThreshold concepts) the percept channel is served by the HNSW
   * approximate index (polylog) instead of a brute-force scan; the semantic
   * channel is exact over named concepts and merged in. [MATH]
   */
  nearest(field: Float64Array, k: number = 5): ConceptMatch[] {
    const scored = new Map<string, number>();

    if (this._concepts.size >= this.annThreshold) {
      // ANN over percept prototypes (approximate, fast).
      for (const m of this._hnsw.search(field, Math.max(k * 2, 8))) {
        const prev = scored.get(m.id) ?? 0;
        if (m.resonance > prev) scored.set(m.id, m.resonance);
      }
      // Exact over named concepts' semantic channel (small subset).
      for (const c of this._concepts.values()) {
        if (c.semantic !== null) {
          const sem = resonance(field, c.semantic);
          const prev = scored.get(c.id) ?? 0;
          if (sem > prev) scored.set(c.id, sem);
        }
      }
    } else {
      // Exact brute force over both channels (small lexicon).
      for (const concept of this._concepts.values()) {
        scored.set(concept.id, this._conceptResonance(field, concept));
      }
    }

    const matches: ConceptMatch[] = [];
    for (const [id, res] of scored) {
      const concept = this._concepts.get(id);
      if (concept) matches.push({ concept, resonance: res });
    }
    matches.sort((a, b) => b.resonance - a.resonance);
    return matches.slice(0, Math.max(0, k));
  }

  /**
   * recall@k of the ANN index vs exact brute force on the percept channel.
   * Used by tests and self-monitoring to keep approximate recognition honest. [MATH]
   */
  annRecallAtK(query: Float64Array, k: number = 10): number {
    const exact = this._exactPerceptNearest(query, k);
    if (exact.length === 0) return 1;
    const approxIds = new Set(this._hnsw.search(query, k).map((m) => m.id));
    let hit = 0;
    for (const e of exact) if (approxIds.has(e)) hit++;
    return hit / exact.length;
  }

  /** Exact brute-force nearest on the PERCEPT channel only (ground truth). */
  private _exactPerceptNearest(field: Float64Array, k: number): string[] {
    const all: Array<{ id: string; r: number }> = [];
    for (const c of this._concepts.values()) {
      all.push({ id: c.id, r: resonance(field, c.prototype) });
    }
    all.sort((a, b) => b.r - a.r);
    return all.slice(0, Math.max(0, k)).map((x) => x.id);
  }

  /**
   * Resonance of a query field against a concept: the strongest of the percept
   * prototype and (if named) the semantic prototype. [SPEC]
   */
  private _conceptResonance(field: Float64Array, concept: Concept): number {
    let best = resonance(field, concept.prototype);
    if (concept.semantic !== null) {
      const sem = resonance(field, concept.semantic);
      if (sem > best) best = sem;
    }
    return best;
  }

  /**
   * Observe a field: recognize (top resonance ≥ λ → reinforce prototype) or
   * mint a new concept.
   *
   * @param field — Unit-normalizable Float64Array(28).
   * @param labels — Optional labels to attach (from LLM naming or text feed).
   * @param source — Provenance string for the audit trace.
   */
  observe(field: Float64Array, labels: string[] = [], source: string = "unknown"): ObserveResult {
    if (field.length !== FIELD_SIZE) {
      throw new Error(
        `ConceptRegistry.observe: field length ${field.length} !== ${FIELD_SIZE}`
      );
    }
    const normalized = normalizeField(field);
    const now = Date.now();
    const best = this.nearest(normalized, 1)[0];

    if (best && best.resonance >= this.recognitionThreshold) {
      // Recognized: reinforce prototype with φ-decayed averaging. [SPEC]
      const c = best.concept;
      c.prototype = reinforceField(c.prototype, normalized);
      c.reinforcement += 1;
      c.lastSeen = now;
      this._mergeLabels(c, labels);
      this._traceSource(c, source);
      this._hnsw.add(c.id, c.prototype); // keep the ANN index current. [SPEC]
      return { concept: c, isNew: false, resonance: best.resonance };
    }

    // Unknown: mint a new concept.
    const id = `c${this._nextId++}`;
    const concept: Concept = {
      id,
      labels: [],
      prototype: normalized,
      semantic: null,
      reinforcement: 1,
      firstSeen: now,
      lastSeen: now,
      sourceTrace: [],
    };
    this._mergeLabels(concept, labels);
    this._traceSource(concept, source);
    this._concepts.set(id, concept);
    this._hnsw.add(id, concept.prototype); // index the new attractor. [SPEC]
    this._evictIfNeeded();
    return { concept, isNew: true, resonance: best?.resonance ?? 0 };
  }

  /**
   * Bind a label's word-geometry into a concept — the symbol-grounding step.
   *
   * Fuses encodeText(label) into the concept's SEMANTIC prototype (created on
   * first bind), and gently nudges the percept prototype toward the word too,
   * so the two share geometry. After binding, the concept is retrievable by
   * either the percept or the word. [PHIL]
   *
   * @param id     — Concept to bind.
   * @param label  — The word whose language-field is fused in.
   * @returns true if the concept exists and the label encoded cleanly.
   */
  bindLabel(id: string, label: string): boolean {
    const c = this._concepts.get(id);
    if (!c) return false;
    const norm = label.trim().toLowerCase();
    if (norm.length === 0) return false;
    let wordField: Float64Array;
    try {
      wordField = encodeText(norm);
    } catch {
      return false; // never bind a label that cannot be encoded (TRUTH_SOURCES)
    }
    // Semantic prototype: create or φ-reinforce with the word field. [SPEC]
    c.semantic = c.semantic === null ? wordField : reinforceField(c.semantic, wordField);
    // Nudge the percept prototype toward the word so they share geometry. [SPEC]
    c.prototype = bindMeaning(c.prototype, wordField);
    this._hnsw.add(c.id, c.prototype); // re-index after the nudge. [SPEC]
    return true;
  }

  /** Attach labels to an existing concept (post-hoc naming by the LLM tool). */
  addLabels(id: string, labels: string[], source: string): boolean {
    const c = this._concepts.get(id);
    if (!c) return false;
    this._mergeLabels(c, labels);
    this._traceSource(c, source);
    return true;
  }

  private _mergeLabels(c: Concept, labels: string[]): void {
    for (const raw of labels) {
      const norm = raw.trim().toLowerCase();
      if (norm.length > 0 && norm.length <= 64 && !c.labels.includes(norm)) {
        c.labels.push(norm);
      }
    }
    // Cap labels at 13 (F_7) per concept. [SPEC]
    if (c.labels.length > 13) c.labels = c.labels.slice(0, 13);
  }

  private _traceSource(c: Concept, source: string): void {
    if (c.sourceTrace[c.sourceTrace.length - 1] !== source) {
      c.sourceTrace.push(source);
      if (c.sourceTrace.length > 8) c.sourceTrace.shift();
    }
  }

  /** Evict the weakest (lowest reinforcement, oldest lastSeen) when over cap. */
  private _evictIfNeeded(): void {
    if (this._concepts.size <= this.maxConcepts) return;
    let weakest: Concept | null = null;
    for (const c of this._concepts.values()) {
      if (
        weakest === null ||
        c.reinforcement < weakest.reinforcement ||
        (c.reinforcement === weakest.reinforcement && c.lastSeen < weakest.lastSeen)
      ) {
        weakest = c;
      }
    }
    if (weakest) {
      this._concepts.delete(weakest.id);
      this._hnsw.remove(weakest.id); // lazy-delete from the ANN index. [SPEC]
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Serialization (schema: mind_state.schema.json)
  // ───────────────────────────────────────────────────────────────────────────

  serialize(stableThoughtCount: number): SerializedMindState {
    const concepts: SerializedConcept[] = [];
    for (const c of this._concepts.values()) {
      concepts.push({
        id: c.id,
        labels: [...c.labels],
        prototype: encodeFieldBase64(c.prototype),
        // Optional — omitted when unnamed; older saves simply lack it. [SPEC]
        ...(c.semantic !== null ? { semantic: encodeFieldBase64(c.semantic) } : {}),
        reinforcement: c.reinforcement,
        firstSeen: c.firstSeen,
        lastSeen: c.lastSeen,
        sourceTrace: [...c.sourceTrace],
      });
    }
    return { version: 1, savedAt: Date.now(), stableThoughtCount, concepts };
  }

  /**
   * Restore from a VALIDATED SerializedMindState (validation happens in
   * memory_store before this is called — corrupt data never reaches here).
   *
   * If a concept lacks a persisted semantic prototype (older saves) but has
   * labels, the semantic prototype is REBUILT deterministically from those
   * labels — restoring the word↔percept grounding without a schema bump. [SPEC]
   */
  restore(state: SerializedMindState): void {
    this._concepts.clear();
    this._hnsw.clear(); // the index is rebuilt from the restored concepts below. [FIX]
    let maxNum = 0;
    for (const sc of state.concepts) {
      const proto = decodeFieldBase64(sc.prototype);
      if (!proto.ok) {
        // Defense in depth: skip (validator should have caught this).
        continue;
      }
      // Semantic prototype: prefer the persisted one; otherwise rebuild from labels.
      let semantic: Float64Array | null = null;
      if (typeof sc.semantic === "string") {
        const sem = decodeFieldBase64(sc.semantic);
        if (sem.ok) semantic = sem.value;
      }
      if (semantic === null) {
        for (const label of sc.labels) {
          try {
            const wf = encodeText(label);
            semantic = semantic === null ? wf : reinforceField(semantic, wf);
          } catch {
            // Skip un-encodable labels; grounding is best-effort, never fatal.
          }
        }
      }
      this._concepts.set(sc.id, {
        id: sc.id,
        labels: [...sc.labels],
        prototype: proto.value,
        semantic,
        reinforcement: sc.reinforcement,
        firstSeen: sc.firstSeen,
        lastSeen: sc.lastSeen,
        sourceTrace: [...sc.sourceTrace],
      });
      const num = Number(sc.id.replace(/^c/, ""));
      if (Number.isFinite(num) && num > maxNum) maxNum = num;
    }
    this._nextId = maxNum + 1;
    // Rebuild the ANN index from the restored prototypes so recognition keeps
    // working above annThreshold after a restart. Without this the graph is
    // empty and nearest() returns nothing at scale. [FIX]
    for (const c of this._concepts.values()) {
      this._hnsw.add(c.id, c.prototype);
    }
  }
}
