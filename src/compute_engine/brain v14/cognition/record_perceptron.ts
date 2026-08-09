/**
 * RHUFT Mind — Record Perceptron (M9): the gate can now CORRECT, not just refuse
 *
 * Epistemic Status: [SPEC] + [MATH] — Cognition layer. ADDITIVE module.
 *
 * [PHIL] — Phase 2 made the gate sound (it refuses NEW poison) but it could not
 * correct EXISTING poison: a wrong label bound pre-gate (the dog/cat echo) sat
 * inside the concept's label set, and the gate — which measures a proposal
 * against that very label set — kept trusting it. Correction needs a channel
 * that GROUNDS meaning, and the sandbox (tests/record-perceptron-sandbox.mjs)
 * measured that the word-channel cannot be that channel: atom() is deliberately
 * non-semantic (independent phasors per label), so in D-space "dog" and "cat"
 * are as orthogonal as "dog" and "trampoline". Only the PERCEPT can vote a
 * wrong label down — via a SHARED cross-modal associator over residual records.
 *
 * ARCHITECTURE (Wolfram §10.2/10.3 — prototypes + RESIDUALS + key-value
 * associative memory; benchmarked tests/record-perceptron-bench.mjs):
 *
 *   1. RESIDUAL RECORDS — one per label-binding { word, conceptId, source,
 *      reinforcement, weight }. Lightweight metadata, NO D-vector (a D-vector
 *      per record would cost 7.3 GB at a 10k census — measured). The registry
 *      keeps the fused PROTOTYPE; this keeps the residual EVIDENCE it averages.
 *
 *   2. PER-CONCEPT PERCEPT SNAPSHOT — liftField(concept.prototype), cached and
 *      invalidated on mutation. ONE per concept (128 KB), not per record.
 *
 *   3. SHARED CROSS-MODAL ASSOCIATOR — one D-space memory over ALL trusted
 *      records: a φ-decayed running sum of bind(perceptSnapshot, atom(word)).
 *      SHARED is 6× cheaper than per-concept (1.23 GB vs 7.32 GB) AND more
 *      correct: a per-concept associator self-votes its own poison, whereas a
 *      shared one learns "percepts shaped like this are called 'dog'" across
 *      concepts, so a poisoned concept's percept votes for the true cluster.
 *
 *   4. PERCEPTRON — each label's weight is re-weighted by the percept's vote:
 *      w ← clip01(w + η·(vote − λ)). A label the percept does not vote for is
 *      driven below λ and demoted (the gate then rejects it): CORRECTED.
 *
 * TWO MEASURED CAVEATS that shape the read path (tests/_probe_assoc.mjs):
 *   - Correlated percepts make a foreign-but-similar concept's label bleed into
 *     the read (a bird label surfaced 0.35 on a dog read when the percepts were
 *     0.87 correlated). So voting is CLOSED-SET: a label's vote is its similarity
 *     NORMALIZED over the concept's own trusted labels, never an open-set scan.
 *     The true label wins its own cluster; the poison (never trained) loses.
 *   - A poison-trained associator self-votes, so only TRUSTED records train it
 *     (reinforcement ≥ F₅). A one-off "echo" never reaches the associator.
 *
 * TRUTH_SOURCES: every vote is a real similarity against a real hypervector; an
 * un-liftable percept yields vote 0 (no fabricated direction).
 */

import { PHI_INV, PHI_NEG2 } from "./../core/constants.ts";
import {
  atom,
  bind,
  liftField,
  similarity,
  unbind,
  HV_SIZE,
} from "./../adapters/phasor_field.ts";
import type { Concept } from "./concept_registry.ts";

/** A label's weight is demoted below this → corrected. The shared λ = φ⁻². [MATH] */
export const CORRECT_LAMBDA: number = PHI_NEG2;

/** Perceptron learning rate (φ-scaled, so hardening mirrors reinforceField). [MATH] */
export const PERCEPTRON_ETA: number = PHI_INV; // ≈ 0.618

/** Reinforcement count at which a record is trusted to train the associator. F₅. [MATH] */
export const TRUST_REINFORCEMENT: number = 5;

/** A residual record: the evidence for ONE label-binding. [SPEC] */
export interface LabelRecord {
  /** The normalized bound label. */
  readonly word: string;
  /** The concept this binding names. */
  readonly conceptId: string;
  /** Provenance: where this binding came from ("feed", "echo", instrument, …). */
  source: string;
  /** How many times this binding has been independently reinforced. */
  reinforcement: number;
  /** Perceptron-learned weight ∈ [0,1]; < λ ⟹ demoted (corrected). */
  weight: number;
}

/** The percept's vote on a label, with the evidence behind it. */
export interface VoteResult {
  readonly word: string;
  /** Closed-set normalized vote ∈ [0,1]: share of the trusted-label similarities. */
  readonly vote: number;
  /** The label's current perceptron weight. */
  readonly weight: number;
  /** True iff weight ≥ λ (the label is still believed). */
  readonly believed: boolean;
}

export class RecordPerceptron {
  /** Residual records: conceptId → (word → record). The evidence store. */
  private readonly _records = new Map<string, Map<string, LabelRecord>>();

  /**
   * Per-concept percept snapshot cache: conceptId → [protoKey, liftField(proto)].
   * protoKey is a cheap mutation fingerprint; on mismatch the snapshot is
   * recomputed. [MATH]
   */
  private readonly _snapshots = new Map<string, [number, Float64Array]>();

  /**
   * The shared cross-modal associator: a φ-decayed running SUM of
   * bind(percept, atom(word)) over trusted records, kept un-normalized so an
   * update is O(1); normalized on read. `_assocCount` is the φ-decayed mass that
   * sets η = 1/(count+1) — the reinforceField hardening law. [MATH]
   */
  private _assoc: Float64Array | null = null;
  private _assocCount = 0;

  // ── Records ────────────────────────────────────────────────────────────────

  /**
   * Record a label-binding (or reinforce an existing one). The entry point the
   * registry's binding path calls. Returns the record. A binding that has reached
   * the trust threshold trains the shared associator (φ-weighted). [SPEC]
   */
  record(concept: Concept, word: string, source: string = "feed"): LabelRecord {
    const w = word.trim().toLowerCase();
    if (w.length === 0) {
      throw new Error("record_perceptron.record: word is empty after normalization");
    }
    let byWord = this._records.get(concept.id);
    if (byWord === undefined) {
      byWord = new Map();
      this._records.set(concept.id, byWord);
    }
    let rec = byWord.get(w);
    if (rec === undefined) {
      rec = { word: w, conceptId: concept.id, source, reinforcement: 0, weight: 1 };
      byWord.set(w, rec);
    } else {
      rec.reinforcement += 1;
      if (source.length > 0 && rec.source !== source) rec.source = source;
    }
    if (rec.reinforcement + 1 >= TRUST_REINFORCEMENT) {
      const snap = this._snapshot(concept);
      if (snap !== null) this._train(snap, atom(w));
    }
    return rec;
  }

  /** All records for a concept (the residual evidence for its labels). */
  recordsOf(conceptId: string): readonly LabelRecord[] {
    const byWord = this._records.get(conceptId);
    return byWord === undefined ? [] : [...byWord.values()];
  }

  /** The words the shared associator has been trained on (the closed set). */
  get vocabulary(): string[] {
    const out = new Set<string>();
    for (const byWord of this._records.values()) {
      for (const r of byWord.values()) {
        if (r.reinforcement + 1 >= TRUST_REINFORCEMENT) out.add(r.word);
      }
    }
    return [...out];
  }

  // ── Cross-modal vote (closed-set) ─────────────────────────────────────────────

  /**
   * The percept's RAW vote on a label: how strongly it surfaces from the shared
   * associator. ∈ [-1, 1]; 0 when there is no trained associator, no liftable
   * percept, or an un-encodable word (TRUTH_SOURCES — never fabricate). [MATH]
   */
  rawVote(concept: Concept, word: string): number {
    if (this._assoc === null) return 0;
    const snap = this._snapshot(concept);
    if (snap === null) return 0;
    let w: Float64Array;
    try {
      w = atom(word);
    } catch {
      return 0;
    }
    return similarity(unbind(this._normalizedAssoc(), snap), w);
  }

  /**
   * The percept's CLOSED-SET vote on a label: its raw similarity normalized over
   * the concept's TRUSTED labels. The true label wins its own cluster; a poison
   * (never trained, so never in the closed set) scores ~0. This is robust to
   * correlated percepts, which make an open-set read bleed foreign labels. [MATH]
   *
   * Returns 0 when the concept has no trusted labels yet (nothing to normalize
   * against — the honest "no basis for a vote").
   */
  vote(concept: Concept, word: string): number {
    const trusted = this.recordsOf(concept.id)
      .filter((r) => r.reinforcement + 1 >= TRUST_REINFORCEMENT)
      .map((r) => r.word);
    if (trusted.length === 0) return 0;
    const w = word.trim().toLowerCase();
    // Raw similarities for the candidate and the trusted reference set.
    const target = Math.max(0, this.rawVote(concept, w));
    let denom = 0;
    for (const t of trusted) denom += Math.max(0, this.rawVote(concept, t));
    if (denom <= 0) return 0;
    return target / denom;
  }

  /**
   * Re-weight every label of a concept by the percept's closed-set vote, run to
   * CONVERGENCE (φ⁴ iterations). A single step can never demote — a poisoned
   * label starts at weight 1 and one φ-scaled step moves it only ~0.145 — so
   * the perceptron must iterate. After convergence a label the percept votes
   * for stays believed (high vote pins it at 1) while a poisoned label (vote ≈
   * 0) decays geometrically below λ: CORRECTED. Iterating a fixed point that
   * has already been reached is a no-op, so this is idempotent. [MATH]
   */
  reweight(concept: Concept): readonly VoteResult[] {
    const recs = this.recordsOf(concept.id);
    // Precompute each label's vote once (the vote is a pure read of the
    // associator; it does not change as weights update). [MATH]
    const votes = recs.map((rec) => this.vote(concept, rec.word));
    const ITERATIONS = 7; // φ⁴ ≈ 6.85 → 7 passes to convergence
    for (let it = 0; it < ITERATIONS; it++) {
      for (let k = 0; k < recs.length; k++) {
        const rec = recs[k]!;
        rec.weight = Math.min(1, Math.max(0, rec.weight + PERCEPTRON_ETA * (votes[k]! - CORRECT_LAMBDA) * PHI_INV));
      }
    }
    return recs.map((rec, k) => ({
      word: rec.word,
      vote: votes[k]!,
      weight: rec.weight,
      believed: rec.weight >= CORRECT_LAMBDA,
    }));
  }

  /**
   * The labels a concept should still BELIEVE after correction: weight ≥ λ.
   * A label below λ is the corrected poison. Pure read — call reweight first.
   */
  believedLabels(concept: Concept): { believed: string[]; corrected: string[] } {
    const believed: string[] = [];
    const corrected: string[] = [];
    for (const rec of this.recordsOf(concept.id)) {
      (rec.weight >= CORRECT_LAMBDA ? believed : corrected).push(rec.word);
    }
    return { believed, corrected };
  }

  // ── Internal ─────────────────────────────────────────────────────────────────

  /**
   * The concept's percept snapshot in D-space, cached by a mutation fingerprint.
   * liftField throws on a zero/non-finite field; we catch → null (no snapshot,
   * vote 0) rather than fabricate a direction. [MATH]
   */
  private _snapshot(concept: Concept): Float64Array | null {
    const key = this._protoKey(concept.prototype);
    const hit = this._snapshots.get(concept.id);
    if (hit !== undefined && hit[0] === key) return hit[1];
    let snap: Float64Array;
    try {
      snap = liftField(concept.prototype);
    } catch {
      return null;
    }
    this._snapshots.set(concept.id, [key, snap]);
    return snap;
  }

  /**
   * A cheap O(n) mutation fingerprint over the 28-field prototype (sum of squares
   * + length) — enough to detect a reinforcement or bind that changed the
   * geometry, so the snapshot is recomputed. Not cryptographic. [MATH]
   */
  private _protoKey(proto: Float64Array): number {
    let s = proto.length;
    for (let i = 0; i < proto.length; i++) s += proto[i]! * proto[i]!;
    return s;
  }

  /**
   * Train the shared associator with one trusted bind pair, φ-weighted running
   * sum: assoc ← assoc·(1−η) + pair·η with η = 1/(count+1), so early bindings
   * dominate and later ones refine — the reinforceField hardening law. [MATH]
   */
  private _train(percept: Float64Array, word: Float64Array): void {
    const pair = bind(percept, word);
    if (this._assoc === null) {
      this._assoc = new Float64Array(pair);
      this._assocCount = 1;
      return;
    }
    const eta = 1 / (this._assocCount + 1);
    const a = this._assoc;
    for (let i = 0; i < HV_SIZE; i++) {
      a[i] = a[i]! * (1 - eta) + pair[i]! * eta;
    }
    this._assocCount += 1;
  }

  /**
   * The associator normalized to unit norm for reading; the running sum keeps its
   * magnitude information, so we normalize a COPY. [MATH]
   */
  private _normalizedAssoc(): Float64Array {
    const a = this._assoc!;
    let ns = 0;
    for (let i = 0; i < a.length; i++) ns += a[i]! * a[i]!;
    const inv = 1 / (Math.sqrt(ns) || 1);
    const out = new Float64Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = a[i]! * inv;
    return out;
  }
}
