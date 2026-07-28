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
  normalizeField,
  reinforceField,
  resonance,
} from "./../adapters/language_codec.ts";
import type {
  SerializedConcept,
  SerializedMindState,
} from "./../schemas/validate.ts";
import { decodeFieldBase64, encodeFieldBase64 } from "./../schemas/validate.ts";

/** A learned concept: field prototype ↔ word labels. [SPEC] */
export interface Concept {
  readonly id: string;
  labels: string[];
  prototype: Float64Array;
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
   * [MATH] — Uses the single shared coherence kernel C(a,b).
   */
  nearest(field: Float64Array, k: number = 5): ConceptMatch[] {
    const matches: ConceptMatch[] = [];
    for (const concept of this._concepts.values()) {
      matches.push({ concept, resonance: resonance(field, concept.prototype) });
    }
    matches.sort((a, b) => b.resonance - a.resonance);
    return matches.slice(0, Math.max(0, k));
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
      return { concept: c, isNew: false, resonance: best.resonance };
    }

    // Unknown: mint a new concept.
    const id = `c${this._nextId++}`;
    const concept: Concept = {
      id,
      labels: [],
      prototype: normalized,
      reinforcement: 1,
      firstSeen: now,
      lastSeen: now,
      sourceTrace: [],
    };
    this._mergeLabels(concept, labels);
    this._traceSource(concept, source);
    this._concepts.set(id, concept);
    this._evictIfNeeded();
    return { concept, isNew: true, resonance: best?.resonance ?? 0 };
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
    if (weakest) this._concepts.delete(weakest.id);
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
   */
  restore(state: SerializedMindState): void {
    this._concepts.clear();
    let maxNum = 0;
    for (const sc of state.concepts) {
      const proto = decodeFieldBase64(sc.prototype);
      if (!proto.ok) {
        // Defense in depth: skip (validator should have caught this).
        continue;
      }
      this._concepts.set(sc.id, {
        id: sc.id,
        labels: [...sc.labels],
        prototype: proto.value,
        reinforcement: sc.reinforcement,
        firstSeen: sc.firstSeen,
        lastSeen: sc.lastSeen,
        sourceTrace: [...sc.sourceTrace],
      });
      const num = Number(sc.id.replace(/^c/, ""));
      if (Number.isFinite(num) && num > maxNum) maxNum = num;
    }
    this._nextId = maxNum + 1;
  }
}
