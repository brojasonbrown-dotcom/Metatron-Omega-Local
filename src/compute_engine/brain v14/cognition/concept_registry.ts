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
import {
  atom,
  bundle,
  similarity,
} from "./../adapters/phasor_field.ts";
import { normalizeText } from "./../adapters/language_codec.ts";
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
  /**
   * M6 — verified-prediction mastery: the φ-decayed mean of (measured − prior)
   * gains across this concept's verified predictions. > 0 ⟺ the mind predicts
   * this concept better than the φ-prior. This — not reinforcement — is the
   * honest "learned" signal. [SPEC]
   */
  mastery: number;
  /** M6 — number of predictions verified for this concept. */
  verifications: number;
  /** M6 — mean surprise (1 − R)^φ across verifications: how hard it still is. */
  meanSurprise: number;
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

  /**
   * Phasor semantic-channel cache: conceptId → [cacheKey, hypervector]. [MATH]
   *
   * WHY THIS CHANNEL EXISTS (measured): the 28-field DFT kernel cannot
   * discriminate meaning — related words avg 0.215 vs unrelated 0.202 (gap
   * 0.013, noise), because at D_complex = 14 independent fields concentrate at
   * ~1/√D ≈ 0.27 ON TOP of the λ threshold. The phasor hypervector space
   * (D = 8192) is where concentration of measure works FOR us: unrelated
   * content collapses to ~1/√D ≈ 0.011 while shared words surface at their
   * bundle weight (measured: encodeSentence bundles sharing a word hit 0.75).
   * The pre-bind GATE already measures here (LinguisticGate); this channel
   * brings the SAME sound discrimination to RECOGNITION, additively — the
   * 28-field channel below is untouched, and a concept's score is the MAX of
   * the two, so nothing that used to be recognised is lost (no regression).
   *
   * Channel content: an ORDER-INSENSITIVE bundle of the concept's bound-label
   * atoms (bundle of atom(label), position-free). Recognition asks "does this
   * query share a grounded WORD with the concept?" — word ORDER is irrelevant
   * to that question, and the order-sensitive encodeSentence (which permutes
   * by position) would make "dog" at position 0 ⊥ to "dog" at position 1,
   * destroying within-phrase matching (measured: "the dog barks" read 0.18
   * against the "dog" channel). A position-free bundle reads ≈ bind weight for
   * ANY shared word wherever it sits, ≈ 1 for an exact label set, and ≈ 1/√D
   * for an unrelated query. (encodeSentence keeps its order-sensitivity for
   * the GATE/grammar paths where sequence carries meaning; recognition does
   * not want it.) Rebuilt only when the label set changes (cacheKey mismatch).
   */
  private readonly _phasorChan = new Map<string, [string, Float64Array]>();
  /** Bound the cache so a long-lived mind cannot grow it without limit. [SPEC] */
  private static readonly _PHASOR_CACHE_MAX = 10946; // F_21 — matches maxConcepts.

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
   * Split free text into normalized content tokens: lowercase, a-z0-9, len ≥ 3,
   * stop-words removed. This is the lexical signal the field encoder cannot
   * supply (it is deliberately non-semantic), so correlation happens on words
   * the mind has actually grounded, not on character-ngram accidents. [FIX]
   */
  private static readonly _STOP = new Set([
    "the", "and", "for", "are", "but", "not", "you", "your", "yours", "with", "this",
    "that", "these", "those", "from", "have", "has", "had", "was", "were", "will",
    "would", "can", "could", "should", "what", "when", "where", "which", "who", "why",
    "how", "about", "into", "over", "under", "then", "than", "there", "here", "they",
    "them", "their", "its", "it's", "does", "did", "done", "some", "any", "all", "each",
    "tell", "know", "think", "mean", "means", "meaning", "like", "just", "really",
  ]);

  private _tokens(text: string): string[] {
    const out = new Set<string>();
    for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
      if (raw.length >= 3 && !ConceptRegistry._STOP.has(raw)) out.add(raw);
    }
    return [...out];
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
   * prototype and (if named) the semantic prototype. [SPEC] (Raw-field path —
   * the phasor semantic channel is text-side and lives in nearestText below.)
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
   * TEXT-SIDE recognition: rank the k nearest concepts to a query STRING.
   *
   * [MATH] — The raw-field nearest() (above) has no access to the query's
   * WORDS, only its 28-field, so it inherits the 28-field's discrimination
   * floor (related 0.215 / unrelated 0.202 — noise). Here we DO have the
   * words, so we can measure in the phasor space where meaning separates:
   *   score = max( 28-field resonance,  phasor shared-word similarity ).
   * The phasor term is similarity(bundle(query words), bundle(label atoms)) —
   * a position-free word-overlap cosine, one consistent encode on both sides.
   * A grounded word fires wherever it sits in the query (measured ≈ bind
   * weight, up to ≈ 1 for an exact match), an unrelated query reads ≈ 0
   * (1/√D floor). MAX is additive: the phasor term can only RAISE a score
   * where meaning genuinely coheres, never lower the 28-field score — so no
   * recognised concept is lost.
   *
   * This is the sound recognition the user asked for: correlation on MEANING
   * (grounded words), not on character-ngram accidents.
   */
  nearestText(text: string, k: number = 5): ConceptMatch[] {
    const base = this.nearest(encodeText(text), Math.max(k, this._concepts.size));
    const byId = new Map<string, number>(base.map((m) => [m.concept.id, m.resonance]));
    // Score every concept on BOTH channels (base only covers the field top-k).
    for (const concept of this._concepts.values()) {
      const field = byId.get(concept.id) ?? 0;
      const ph = this._phasorTextSimilarity(text, concept);
      byId.set(concept.id, Math.max(field, ph));
    }
    const matches: ConceptMatch[] = [];
    for (const [id, res] of byId) {
      const concept = this._concepts.get(id);
      if (concept) matches.push({ concept, resonance: res });
    }
    matches.sort((a, b) => b.resonance - a.resonance);
    return matches.slice(0, Math.max(0, k));
  }

  /**
   * Position-free word bundle of a text: bundle(atom(word) for each content
   * word), order-insensitive. This is the RECOGNITION form — "which grounded
   * words does this text share?" — where sequence is irrelevant. [MATH]
   * Returns null when no word encodes (empty after normalization).
   */
  private static _wordBundle(text: string): Float64Array | null {
    const norm = normalizeText(text);
    if (norm.length === 0) return null;
    const atoms: Float64Array[] = [];
    for (const w of norm.split(" ")) {
      if (w.length === 0) continue;
      try {
        atoms.push(atom(w));
      } catch {
        // skip un-encodable token
      }
    }
    if (atoms.length === 0) return null;
    try {
      return bundle(atoms);
    } catch {
      return null;
    }
  }

  /**
   * Phasor similarity between a query's TEXT and a concept's label channel —
   * both position-free word bundles, so a shared word fires wherever it sits:
   * similarity( bundle(query words), bundle(label atoms) ). [MATH]
   */
  private _phasorTextSimilarity(queryText: string, concept: Concept): number {
    const channel = this._phasorChannel(concept);
    if (channel === null) return 0;
    const q = ConceptRegistry._wordBundle(queryText);
    if (q === null) return 0;
    const s = similarity(q, channel);
    return s > 0 ? s : 0; // negative = phase-opposed → no recognition
  }

  /**
   * The concept's phasor semantic channel, cached and rebuilt only when the
   * label set changes: the position-free bundle of its bound-label atoms.
   * null when un-named. [MATH]
   */
  private _phasorChannel(concept: Concept): Float64Array | null {
    if (concept.labels.length === 0) return null;
    const key = concept.labels.join(" ");
    const hit = this._phasorChan.get(concept.id);
    if (hit !== undefined && hit[0] === key) return hit[1];
    const chan = ConceptRegistry._wordBundle(key);
    if (chan === null) return null;
    this._phasorChan.set(concept.id, [key, chan]);
    if (this._phasorChan.size > ConceptRegistry._PHASOR_CACHE_MAX) {
      const oldest = this._phasorChan.keys().next();
      if (!oldest.done) this._phasorChan.delete(oldest.value);
    }
    return chan;
  }

  /**
   * Observe a field: recognize (top resonance ≥ λ → reinforce prototype) or
   * mint a new concept.
   *
   * @param field — Unit-normalizable Float64Array(28).
   * @param labels — Optional labels to attach (from LLM naming or text feed).
   * @param source — Provenance string for the audit trace.
   * @param options.reinforce — Upgrade 3 (novelty gate): when false, the field is
   *   still RECOGNIZED against existing prototypes (and returns the match) but the
   *   prototype is NOT nudged and NO new concept is minted — the redundant percept
   *   leaves learning untouched. Default true = byte-for-byte the legacy behaviour.
   */
  observe(field: Float64Array, labels: string[] = [], source: string = "unknown", options: { reinforce?: boolean } = {}): ObserveResult {
    if (field.length !== FIELD_SIZE) {
      throw new Error(
        `ConceptRegistry.observe: field length ${field.length} !== ${FIELD_SIZE}`
      );
    }
    const normalized = normalizeField(field);
    const now = Date.now();
    const best = this.nearest(normalized, 1)[0];
    const reinforce = options.reinforce !== false;

    // Upgrade 3 — novelty gate: a redundant percept is recognized but not learned.
    // It never reinforces the prototype and never mints a duplicate concept.
    if (!reinforce) {
      if (best && best.resonance >= this.recognitionThreshold) {
        const c = best.concept;
        c.lastSeen = now;
        return { concept: c, isNew: false, resonance: best.resonance };
      }
      // Unrecognized but not novel: report the nearest concept WITHOUT minting a
      // new one — a static, unsurprising scene must not spawn duplicate concepts.
      if (best) {
        return { concept: best.concept, isNew: false, resonance: best.resonance };
      }
      // No concepts at all yet: mint the first (a mind with zero concepts must
      // still bootstrap) — fall through to the normal path.
    }

    if (best && best.resonance >= this.recognitionThreshold) {
      // Recognized: reinforce prototype with φ-decayed averaging, weighted by
      // how much evidence the attractor already holds. A mature concept HARDENS
      // (η ∝ 1/(reinforcement+1)) so one noisy frame cannot move it. [SPEC]
      const c = best.concept;
      c.prototype = reinforceField(c.prototype, normalized, c.reinforcement);
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
      mastery: 0,
      verifications: 0,
      meanSurprise: 1,
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
   * Observe TEXT — the label-grounded correlation path. [FIX]
   *
   * The field encoder is deliberately non-semantic (character n-grams), so raw
   * resonance cannot tell "dog" from "dogs" (0.08) yet scores "dog~cat" at 0.26.
   * Routing text through observe() therefore minted a fresh anonymous concept
   * for every message — the fragmentation the user saw. Instead, when the text
   * contains a word the mind has ALREADY grounded as a label on a named concept,
   * we reinforce THAT attractor (the correlation), bind its geometry to the new
   * utterance, and return it. Only genuinely ungrounded text falls through to
   * the field path (a new percept). This is how repeated words accumulate into
   * one concept instead of shattering across many.
   */
  observeText(text: string, source: string = "text.feed"): ObserveResult {
    const tokens = this._tokens(text);
    // Strongest grounded hit: the named concept sharing the most content tokens.
    let hit: Concept | null = null;
    let hitScore = 0;
    if (tokens.length > 0) {
      for (const c of this._concepts.values()) {
        if (c.labels.length === 0) continue; // only named concepts can correlate
        let overlap = 0;
        for (const t of tokens) if (c.labels.includes(t)) overlap++;
        // normalize by the smaller vocabulary so a rich concept isn't penalized
        const denom = Math.min(tokens.length, c.labels.length) || 1;
        const score = overlap / denom;
        if (overlap > 0 && score > hitScore) {
          hit = c;
          hitScore = score;
        }
      }
    }

    if (hit) {
      // Correlate: fold this utterance's field into the existing attractor and
      // refresh its geometry/word grounding. η-weighted so it hardens with use.
      const field = encodeText(text);
      hit.prototype = reinforceField(hit.prototype, normalizeField(field), hit.reinforcement);
      if (hit.semantic !== null) hit.semantic = reinforceField(hit.semantic, normalizeField(field));
      hit.reinforcement += 1;
      hit.lastSeen = Date.now();
      this._traceSource(hit, source);
      this._hnsw.add(hit.id, hit.prototype);
      return { concept: hit, isNew: false, resonance: 1 };
    }

    // No grounded label matched: this is new content — mint a percept concept.
    return this.observe(encodeText(text), [], source);
  }

  /**
   * Consolidate near-duplicate concepts — the merge the system never had. [FIX]
   *
   * Two concepts are the SAME attractor only when they agree on BOTH channels:
   * they share a normalized label (the mind calls them the same thing) AND their
   * prototypes resonate ≥ λ (the geometry agrees). The strict AND-rule means
   * dog/cat (no shared label) can NEVER merge, while the duplicate bird/tree
   * concepts the registry accumulated DO. Fused: φ-weighted prototype, union of
   * labels, summed reinforcement, survivor = higher reinforcement. Re-indexes
   * HNSW. Returns the absorbed (loser) ids so the glossary can re-key.
   */
  consolidate(): { merged: number; absorbed: Map<string, string> } {
    const absorbed = new Map<string, string>(); // loserId → survivorId
    const ids = [...this._concepts.keys()];
    let merged = 0;
    for (let i = 0; i < ids.length; i++) {
      const a = this._concepts.get(ids[i]!);
      if (!a) continue;
      for (let j = i + 1; j < ids.length; j++) {
        const b = this._concepts.get(ids[j]!);
        if (!b) continue;
        const shareLabel = a.labels.some((l) => b.labels.includes(l));
        if (!shareLabel) continue; // different names → different concepts, keep both
        const res = resonance(a.prototype, b.prototype);
        if (res < this.recognitionThreshold) continue; // geometry disagrees → keep both
        // Merge b into the stronger of the two.
        const [survivor, loser] = a.reinforcement >= b.reinforcement ? [a, b] : [b, a];
        const total = survivor.reinforcement + loser.reinforcement;
        // φ-weighted prototype fusion weighted by evidence.
        const wS = survivor.reinforcement / total;
        const wL = loser.reinforcement / total;
        const fused = new Float64Array(survivor.prototype.length);
        for (let k = 0; k < fused.length; k++) {
          fused[k] = survivor.prototype[k]! * wS + loser.prototype[k]! * wL;
        }
        survivor.prototype = normalizeField(fused);
        if (survivor.semantic !== null && loser.semantic !== null) {
          const fs = new Float64Array(survivor.semantic.length);
          for (let k = 0; k < fs.length; k++) fs[k] = survivor.semantic[k]! * wS + loser.semantic[k]! * wL;
          survivor.semantic = normalizeField(fs);
        } else if (survivor.semantic === null) {
          survivor.semantic = loser.semantic;
        }
        this._mergeLabels(survivor, loser.labels);
        survivor.reinforcement = total;
        survivor.lastSeen = Math.max(survivor.lastSeen, loser.lastSeen);
        for (const s of loser.sourceTrace) this._traceSource(survivor, s);
        this._concepts.delete(loser.id);
        this._hnsw.remove(loser.id);
        this._phasorChan.delete(loser.id); // the absorbed concept's channel goes with it
        this._phasorChan.delete(survivor.id); // survivor mutated (fused) → force rebuild
        this._hnsw.add(survivor.id, survivor.prototype);
        absorbed.set(loser.id, survivor.id);
        merged++;
      }
    }
    return { merged, absorbed };
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

  // ───────────────────────────────────────────────────────────────────────────
  // M6 — Mastery: learning = verified prediction, not accretion
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Fold one verified prediction outcome into a concept's mastery. The mastery
   * mean is updated by the PredictionLedger's own φ-decay (η = φ⁻²/(1+surprise)),
   * so it RISES when predictions beat the φ-prior and FALLS when they fail —
   * the honest, non-decorating learning signal. [SPEC]
   */
  recordMastery(id: string, next: { mastery: number; verifications: number; meanSurprise: number }): boolean {
    const c = this._concepts.get(id);
    if (!c) return false;
    c.mastery = next.mastery;
    c.verifications = next.verifications;
    c.meanSurprise = next.meanSurprise;
    return true;
  }

  /** M6 — a concept's current mastery proof (zero-state when never verified). */
  masteryOf(id: string): { mastery: number; verifications: number; meanSurprise: number; learned: boolean } {
    const c = this._concepts.get(id);
    if (!c) return { mastery: 0, verifications: 0, meanSurprise: 1, learned: false };
    return {
      mastery: c.mastery,
      verifications: c.verifications,
      meanSurprise: c.meanSurprise,
      learned: c.mastery > 0 && c.verifications >= 5,
    };
  }

  /** M6 — serialize every concept's running mastery statistics. */
  masteryProofs(): Record<string, { mastery: number; verifications: number; meanSurprise: number }> {
    const out: Record<string, { mastery: number; verifications: number; meanSurprise: number }> = {};
    for (const c of this._concepts.values()) {
      if (c.verifications > 0) {
        out[c.id] = { mastery: c.mastery, verifications: c.verifications, meanSurprise: c.meanSurprise };
      }
    }
    return out;
  }

  /** M6 — restore mastery statistics onto already-restored concepts. */
  restoreMastery(proofs: Readonly<Record<string, { mastery: number; verifications: number; meanSurprise: number }>>): void {
    for (const [cid, p] of Object.entries(proofs)) {
      const c = this._concepts.get(cid);
      if (c) {
        c.mastery = p.mastery;
        c.verifications = p.verifications;
        c.meanSurprise = p.meanSurprise;
      }
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
      this._phasorChan.delete(weakest.id); // drop the cached channel with the concept
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Serialization (schema: mind_state.schema.json)
  // ───────────────────────────────────────────────────────────────────────────

  serialize(stableThoughtCount: number, episodes?: readonly string[]): SerializedMindState {
    const concepts: SerializedConcept[] = [];
    for (const c of this._concepts.values()) {
      concepts.push({
        id: c.id,
        labels: [...c.labels],
        prototype: encodeFieldBase64(c.prototype),
        // Optional — omitted when unnamed; older saves simply lack it. [SPEC]
        ...(c.semantic !== null ? { semantic: encodeFieldBase64(c.semantic) } : {}),
        reinforcement: c.reinforcement,
        mastery: c.mastery,
        verifications: c.verifications,
        meanSurprise: c.meanSurprise,
        learned: c.mastery > 0 && c.verifications >= 5, // M6 — F₅ verifications
        firstSeen: c.firstSeen,
        lastSeen: c.lastSeen,
        sourceTrace: [...c.sourceTrace],
      });
    }
    return {
      version: 1,
      savedAt: Date.now(),
      stableThoughtCount,
      concepts,
      ...(episodes !== undefined ? { episodes: [...episodes] } : {}),
      // M6 — always emit mastery proofs (empty map when nothing verified yet).
      masteryProofs: this.masteryProofs(),
    };
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
        mastery: typeof sc.mastery === "number" ? sc.mastery : 0,
        verifications: typeof sc.verifications === "number" ? sc.verifications : 0,
        meanSurprise: typeof sc.meanSurprise === "number" ? sc.meanSurprise : 1,
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
    // M6 — fold the top-level mastery proofs back onto their concepts (the
    // per-concept fields already carried the same numbers; the map is the
    // authoritative running-ledger form, kept for forward compatibility).
    if (state.masteryProofs) this.restoreMastery(state.masteryProofs);
  }
}
