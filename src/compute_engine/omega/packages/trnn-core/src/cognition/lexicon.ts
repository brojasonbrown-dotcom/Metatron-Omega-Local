/**
 * lexicon — Ω-REAL: the salience-weighted word catalogue.
 *
 * A raw FHRR atom is amnesiac: "the" and "resonance" are both just unit phasors
 * until *use* gives them meaning. This catalogue turns every observed word into
 * a measured, UNIQUE salience weight, so the more a word is actually used the
 * more the brain prioritises it, while a word that is rare across contexts is
 * weighted as more distinctive. The law is standard term-frequency ×
 * inverse-document-frequency, expressed in the machine's own base φ:
 *
 *   tf(w)  = log_φ(1 + freq(w))               usage importance (more often → higher)
 *   idf(w) = log_φ((N + 1) / (1 + df(w)))     uniqueness (rarer → higher; 1 when no docs)
 *   salience(w) = tf(w) · idf(w)
 *   weight(w)   = 1 − φ^(−salience)           ∈ [0,1), bounded, per-word
 *
 * `encode(words)` folds words into one hypervector by bundling their atoms
 * weighted by salience (reusing `vsa.bundle`), so the dominant words dominate
 * the superposition; `recall` resolves a probe against the catalogue through
 * `vsa.CleanupMemory`, which abstains rather than guessing.
 *
 * Deterministic throughout: atoms come from the seeded `randomHv`, and every
 * transcendental goes through `dmath` — no RNG, no clock.
 */

import { randomHv, bundle, CleanupMemory, type Hypervector, type BundleResult } from '../substrate/vsa';
import { gematriaAtom } from '../sense/encode';
import { dlog, dexp } from '../core/dmath';
import { PHI } from '../core/constants';

/** ln φ — the deterministic golden-ratio log base. */
const LOG_PHI = dlog(PHI);

export interface LexiconEntry {
  readonly word: string;
  /** Total occurrences. */
  readonly frequency: number;
  /** Distinct documents/contexts the word appeared in. */
  readonly documents: number;
  readonly tf: number;
  readonly idf: number;
  /** tf · idf — the measured importance in φ units. */
  readonly salience: number;
  /** Bounded [0,1) weight: 1 − φ^(−salience). */
  readonly weight: number;
}

/**
 * Cross-session state of a lexicon. Only the MEASURED numbers persist — the
 * atoms are deterministically recomputed from the word and `dim`, so a replay
 * rebuilds byte-identical atoms without storing a single phase.
 */
export interface LexiconState {
  readonly dim: number;
  readonly tokenCount: number;
  readonly capacity?: number;
  /** word → occurrence count (frequency). */
  readonly freq: Readonly<Record<string, number>>;
  /** word → distinct-document count (uniqueness / idf denominator). */
  readonly df: Readonly<Record<string, number>>;
  readonly docIds: readonly string[];
}

export class Lexicon {
  private readonly atoms = new Map<string, Hypervector>();
  private readonly freq = new Map<string, number>();
  private readonly df = new Map<string, number>();
  private readonly inDoc = new Map<string, string>();
  private readonly docIds = new Set<string>();
  private tokenCount = 0;
  private readonly memory: CleanupMemory;

  constructor(readonly dim: number, readonly capacity = 987) {
    this.memory = new CleanupMemory(dim, undefined, undefined, Math.max(1, Math.floor(capacity)));
  }

  private logPhi(x: number): number {
    return x > 0 ? dlog(x) / LOG_PHI : 0;
  }

  get size(): number { return this.freq.size; }
  get tokens(): number { return this.tokenCount; }
  get documents(): number { return this.docIds.size; }

  /** The deterministic, φ-structured atom for a word (lazy). */
  atom(word: string): Hypervector {
    let a = this.atoms.get(word);
    if (!a) {
      a = gematriaAtom(word, this.dim);
      // A single- or all-identical-letter word has zero gematria energy (mean
      // removal cancels it), which would leave a zero vector; fall back to the
      // seeded atom so no word ever becomes unqueryable.
      let degenerate = true;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== 0) { degenerate = false; break; }
      }
      if (degenerate) a = randomHv(this.dim, `lex:${word}`);
      this.atoms.set(word, a);
    }
    return a;
  }

  /** The observed words → their φ-structured atoms (for resonant recall). */
  atomsMap(): ReadonlyMap<string, Hypervector> {
    return this.atoms;
  }

  /** Register one occurrence. `docId` (optional) separates distinct contexts for idf. */
  observe(word: string, docId?: string): void {
    const prev = this.freq.get(word) ?? 0;
    // Retention: on a NEW word at capacity, evict the least-salient word.
    if (prev === 0 && this.freq.size >= this.capacity) {
      this.evictLeastSalient();
    }
    this.freq.set(word, prev + 1);
    this.tokenCount++;
    // First sighting → register the prototype once (recall stays O(N·D) per
    // query, no per-call rebuild). The salience weight is carried by `encode`,
    // not by the prototype, so a unit weight is exact here.
    if (prev === 0) this.memory.add(word, this.atom(word));
    if (docId !== undefined) {
      this.docIds.add(docId);
      if (this.inDoc.get(word) !== docId) {
        this.df.set(word, (this.df.get(word) ?? 0) + 1);
        this.inDoc.set(word, docId);
      }
    }
  }

  /** Evict the least-salient word (deterministic: lowest tf·idf, first-seen tiebreak). */
  private evictLeastSalient(): void {
    let worst: string | null = null;
    let worstSalience = Number.POSITIVE_INFINITY;
    for (const w of this.freq.keys()) {
      const s = this.salience(w);
      if (s < worstSalience) {
        worstSalience = s;
        worst = w;
      }
    }
    if (worst !== null) {
      this.freq.delete(worst);
      this.df.delete(worst);
      this.inDoc.delete(worst);
      this.atoms.delete(worst);
      this.memory.remove(worst);
    }
  }

  tf(word: string): number {
    return this.logPhi(1 + (this.freq.get(word) ?? 0));
  }

  idf(word: string): number {
    const n = this.docIds.size;
    if (n === 0) return 1;
    return this.logPhi((n + 1) / (1 + (this.df.get(word) ?? 0)));
  }

  salience(word: string): number {
    return this.tf(word) * this.idf(word);
  }

  /** Bounded [0,1) per-word weight. */
  weight(word: string): number {
    const s = this.salience(word);
    return 1 - dexp(-s * LOG_PHI);
  }

  entry(word: string): LexiconEntry | null {
    if (!this.freq.has(word)) return null;
    const tf = this.tf(word);
    const idf = this.idf(word);
    const salience = tf * idf;
    return {
      word,
      frequency: this.freq.get(word)!,
      documents: this.df.get(word) ?? 0,
      tf,
      idf,
      salience,
      weight: 1 - dexp(-salience * LOG_PHI),
    };
  }

  /** Salience-weighted bundle of the words' atoms (reuses vsa.bundle). */
  encode(words: readonly string[]): BundleResult {
    return bundle(words.map((w) => this.atom(w)), words.map((w) => this.weight(w)));
  }

  /** Resolve a probe against the catalogue; abstains (null) when below chance. */
  recall(vec: Hypervector) {
    return this.memory.query(vec);
  }

  /** The whole catalogue, most salient first. */
  catalogue(limit?: number): LexiconEntry[] {
    const out: LexiconEntry[] = [];
    for (const w of this.freq.keys()) out.push(this.entry(w)!);
    out.sort((a, b) => b.salience - a.salience || b.frequency - a.frequency);
    return limit === undefined ? out : out.slice(0, limit);
  }

  /** Snapshot the measured state for cross-session persistence (canonical-safe). */
  serialize(): LexiconState {
    return {
      dim: this.dim,
      tokenCount: this.tokenCount,
      capacity: this.capacity,
      freq: Object.fromEntries(this.freq),
      df: Object.fromEntries(this.df),
      docIds: [...this.docIds].sort(),
    };
  }

  /** Rebuild a lexicon from a saved state; atoms are recomputed lazily. */
  static restore(s: LexiconState): Lexicon {
    const lex = new Lexicon(s.dim, s.capacity ?? 987);
    lex.tokenCount = s.tokenCount;
    for (const [w, n] of Object.entries(s.freq)) lex.freq.set(w, n);
    for (const [w, n] of Object.entries(s.df)) lex.df.set(w, n);
    for (const d of s.docIds) lex.docIds.add(d);
    return lex;
  }
}
