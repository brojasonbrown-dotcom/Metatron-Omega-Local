/**
 * RHUFT Mind — Lexicon Triples (M10): relational facts over bind/unbind
 *
 * Epistemic Status: [SPEC] + [MATH] — Cognition layer. ADDITIVE module.
 *
 * [PHIL] — Phases 1–3 gave the mind GROUNDED, CORRECTED labels: it can name a
 * percept and strike a wrong name. But a label is a unary fact — "this is a
 * dog". Cognition needs RELATIONS: "dog is-a animal", "dog has fur", "bird
 * eats seeds". This module stores such role-filler triples in the SAME phasor
 * hypervector space as the record-perceptron, using the FHRR binding algebra
 * that already exists (phasor_field.ts). It is the mind's first knowledge
 * GRAPH: nodes are label atoms, edges are role atoms, and a fact is a bound
 * composite that can be queried in BOTH directions by unbinding.
 *
 * ENCODING (measured, tests/lexicon-triples-sandbox{,2}.mjs):
 *   triple(s, r, o) = bind(bind(atom(s), atom(r)), atom(o))
 *   per-subject store = bundle of that subject's triples (superposition).
 *
 * MEASURED CAPABILITIES (all 100% top-1 on the sandbox vocab, D = 8192):
 *   - single-triple recovery margin 0.988; role-query collapses to ~0.005 for a
 *     wrong role/subject (unbind is surgically specific).
 *   - FORWARD lookup  — unbind(bundle, key(s,r)) ≈ atom(o): "dog is-a ?" → animal.
 *   - REVERSE lookup  — score each role by sim(unbind(bundle, key(s,r)), atom(o)):
 *     "(bird, wing) → which role?" → has. Margin ~0.57 over the next role.
 *   - ROLE SHARING   — one role atom reused across subjects stays clean (the
 *     graph property: is-a is one edge type, not one per subject).
 *
 * CAPACITY — recovery margin decays ≈ 1/√N as a subject bundles N triples
 * (measured 0.98 → 0.20 over N = 1..21, still 100% top-1). We therefore cap a
 * subject at TRIPLE_CAPACITY = F₆ = 13 facts: the count where the margin is
 * still comfortably above the λ = φ⁻² = 0.382 gate. Beyond it, asserting a new
 * triple EVICTS the weakest (lowest-reinforcement) one — the same φ-forgetting
 * law as the concept registry. [MATH]
 *
 * GROUNDING (TRUTH_SOURCES) — a triple is only asserted between labels the mind
 * actually carries (non-empty after the shared normalizeText rule). We never
 * fabricate an atom for an empty label, and a read on an un-encodable word
 * yields no answer rather than a confabulated direction.
 */

import { PHI_INV, PHI_NEG2 } from "./../core/constants.ts";
import {
  atom,
  bind,
  unbind,
  bundle,
  similarity,
} from "./../adapters/phasor_field.ts";
import { normalizeText } from "./../adapters/language_codec.ts";

/** Per-subject triple capacity before φ-forgetting evicts the weakest. F₆. [MATH] */
export const TRIPLE_CAPACITY: number = 13;

/** Recovery confidence at/above which a lookup is believed. The shared λ = φ⁻². [MATH] */
export const TRIPLE_LAMBDA: number = PHI_NEG2;

/** A single relational fact and its evidence. [SPEC] */
export interface Triple {
  readonly subject: string;
  readonly role: string;
  readonly object: string;
  /** How many times this exact fact has been independently asserted. */
  reinforcement: number;
}

/** The result of a forward lookup ("s r ?"). */
export interface ForwardAnswer {
  readonly object: string;
  /** sim of the recovered direction to the winning object atom, ∈ [-1,1]. */
  readonly confidence: number;
  /** True iff confidence ≥ TRIPLE_LAMBDA. */
  readonly believed: boolean;
}

/** The result of a reverse lookup ("which role links s to o?"). */
export interface ReverseAnswer {
  readonly role: string;
  readonly confidence: number;
  /** Margin over the next-best candidate role. */
  readonly margin: number;
  readonly believed: boolean;
}

export class LexiconTriples {
  /** subject → its triples, keyed "role\x00object" for O(1) re-assert. */
  private readonly _bySubject = new Map<string, Map<string, Triple>>();
  /** subject → its cached bundle (recomputed on mutation). */
  private readonly _bundles = new Map<string, Float64Array>();
  /** The global role vocabulary actually asserted (for reverse lookup). */
  private readonly _roles = new Set<string>();

  // ── Assertion ─────────────────────────────────────────────────────────────

  /**
   * Assert a relational fact. Re-asserting an identical triple reinforces it.
   * At capacity, the weakest (least-reinforced) triple is evicted to make room —
   * the φ-forgetting law. Returns the stored triple, or null if any label is
   * un-encodable (TRUTH_SOURCES — never assert a fact over an empty atom).
   */
  assert(subject: string, role: string, object: string): Triple | null {
    const s = normalizeText(subject);
    const r = normalizeText(role);
    const o = normalizeText(object);
    if (s.length === 0 || r.length === 0 || o.length === 0) return null;

    let store = this._bySubject.get(s);
    if (store === undefined) {
      store = new Map();
      this._bySubject.set(s, store);
    }
    const key = r + "\x00" + o;
    let t = store.get(key);
    if (t !== undefined) {
      t.reinforcement += 1;
      return t; // idempotent re-assert: no bundle change needed
    }
    // Capacity: evict the weakest before inserting (φ-forgetting). [MATH]
    if (store.size >= TRIPLE_CAPACITY) {
      let weakestKey: string | null = null;
      let weakestReinf = Infinity;
      for (const [k, existing] of store) {
        if (existing.reinforcement < weakestReinf) {
          weakestReinf = existing.reinforcement;
          weakestKey = k;
        }
      }
      if (weakestKey !== null) store.delete(weakestKey);
    }
    t = { subject: s, role: r, object: o, reinforcement: 1 };
    store.set(key, t);
    this._roles.add(r);
    this._bundles.delete(s); // invalidate the cached bundle
    return t;
  }

  /** All triples asserted about a subject. */
  triplesOf(subject: string): readonly Triple[] {
    const store = this._bySubject.get(normalizeText(subject));
    return store === undefined ? [] : [...store.values()];
  }

  /** The role vocabulary asserted so far (closed set for reverse lookup). */
  get roles(): readonly string[] {
    return [...this._roles];
  }

  // ── Forward lookup: "s r ?" → o ───────────────────────────────────────────

  /**
   * Forward lookup: unbind the subject's bundle by the (s,r) key and read the
   * best-matching object from the subject's OWN asserted objects for that role
   * (closed-set — the honest candidate set, robust to foreign-label bleed).
   * Returns null when the subject/role is unknown (no basis for an answer).
   */
  lookup(subject: string, role: string): ForwardAnswer | null {
    const s = normalizeText(subject);
    const r = normalizeText(role);
    const store = this._bySubject.get(s);
    if (store === undefined) return null;
    const B = this._bundleOf(s, store);
    if (B === null) return null;
    // Candidates: the objects this subject actually carries for role r.
    const candidates = [...store.values()].filter((t) => t.role === r).map((t) => t.object);
    if (candidates.length === 0) return null;
    const recovered = unbind(B, bind(atom(s), atom(r)));
    let best: string | null = null;
    let bestSim = -Infinity;
    for (const o of candidates) {
      const sim = similarity(recovered, atom(o));
      if (sim > bestSim) { bestSim = sim; best = o; }
    }
    if (best === null) return null;
    return { object: best, confidence: bestSim, believed: bestSim >= TRIPLE_LAMBDA };
  }

  // ── Reverse lookup: "(s, o) → which role?" ────────────────────────────────

  /**
   * Reverse lookup: given a subject and a known object, find WHICH asserted
   * role links them — score every role in the vocabulary by how strongly the
   * recovered direction matches the object. Returns null when the subject is
   * unknown or no role clears the noise.
   */
  reverseLookup(subject: string, object: string): ReverseAnswer | null {
    const s = normalizeText(subject);
    const o = normalizeText(object);
    const store = this._bySubject.get(s);
    if (store === undefined || o.length === 0) return null;
    const B = this._bundleOf(s, store);
    if (B === null) return null;
    const target = atom(o);
    let best: string | null = null;
    let bestSim = -Infinity;
    let second = -Infinity;
    for (const r of this._roles) {
      const sim = similarity(unbind(B, bind(atom(s), atom(r))), target);
      if (sim > bestSim) { second = bestSim; bestSim = sim; best = r; }
      else if (sim > second) { second = sim; }
    }
    if (best === null) return null;
    const margin = bestSim - (second === -Infinity ? 0 : second);
    return { role: best, confidence: bestSim, margin, believed: bestSim >= TRIPLE_LAMBDA };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  /**
   * The subject's bundle of triples, cached and rebuilt on mutation. bundle()
   * throws on an empty set; we guard by returning null (no facts → no answer).
   * [MATH]
   */
  private _bundleOf(s: string, store: Map<string, Triple>): Float64Array | null {
    const hit = this._bundles.get(s);
    if (hit !== undefined) return hit;
    if (store.size === 0) return null;
    const vecs = [...store.values()].map((t) =>
      bind(bind(atom(t.subject), atom(t.role)), atom(t.object))
    );
    const B = bundle(vecs);
    this._bundles.set(s, B);
    return B;
  }
}
