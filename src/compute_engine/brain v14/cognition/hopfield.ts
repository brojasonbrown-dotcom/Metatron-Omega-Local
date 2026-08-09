/**
 * RHUFT Mind — Modern Continuous Hopfield Associative Memory
 *
 * Epistemic Status: [MATH] — Ramsauer et al. 2020, "Hopfield Networks is All
 * You Need" (arXiv:2008.02217). Cognition-layer content-addressable memory.
 *
 * [PHIL] — This is the engine's high-capacity ASSOCIATIVE store. Where the
 * ConceptRegistry holds one averaged prototype per concept, the Hopfield memory
 * retains many distinct field patterns and retrieves the stored attractor most
 * resonant with a noisy or partial cue — in ONE step, with storage capacity
 * exponential in the field dimension. The update rule (softmax over raw inner
 * products) is mathematically the attention mechanism, so it composes cleanly
 * with the resonance kernel used everywhere else in the mind.
 *
 * [MATH] — Stored patterns X = {ξ_μ} (rows, unit-norm). Retrieval of query ξ:
 *   ξ_new = X · softmax(β · X · ξ)
 * β (inverse temperature) sharpens the softmax: higher β → winner-take-all
 * (nearest single memory), lower β → soft mixture. We use β = 1/√d scaled by φ,
 * the standard attention scaling, so retrieval is neither frozen nor washed out.
 *
 * Deterministic (no RNG), Float64Array throughout, bounded (Fibonacci caps),
 * and never fabricated: an empty memory returns the zero field and reports
 * itself empty rather than inventing an attractor (TRUTH_SOURCES).
 */

import { HOPFIELD_BETA, HOPFIELD_MERGE_THRESHOLD, PHI } from "./../core/constants.ts";
import { FIELD_SIZE, normalizeField, resonance } from "./../adapters/language_codec.ts";
import { decodeFieldBase64, encodeFieldBase64 } from "./../schemas/validate.ts";
import { at } from "../core/indexing.ts";

/** Maximum stored patterns: F_11 = 89 per memory bank. [SPEC] */
const MAX_PATTERNS = 89;

export class HopfieldMemory {
  /** Field dimensionality (28 for the mind's interleaved-complex fields). */
  readonly dim: number;

  /** Inverse temperature β = φ / √dim. [SPEC] — Wolfram-verified: Certificate 2.3. */
  readonly beta: number;

  /** Stored attractor patterns (each unit-norm, length = dim). */
  private _patterns: Float64Array[] = [];

  /**
   * Reusable scratch buffer for the merge blend, allocated once on first merge.
   * Avoids a fresh Float64Array(dim) on EVERY reinforcement (the hot learning
   * path) — pure GC-pressure reduction, no behavioral change. [SPEC]
   */
  private _mergeScratch: Float64Array | null = null;

  constructor(dim: number = FIELD_SIZE) {
    if (!Number.isInteger(dim) || dim <= 0) {
      throw new Error(`HopfieldMemory: dim must be a positive integer, got ${dim}`);
    }
    this.dim = dim;
    this.beta = HOPFIELD_BETA; // φ/√28, Wolfram-verified (Certificate 2.3).
  }

  /** Number of stored patterns. */
  get size(): number {
    return this._patterns.length;
  }

  /** Read-only view of the stored attractors (defensive copies). */
  patterns(): Float64Array[] {
    return this._patterns.map((p) => new Float64Array(p));
  }

  /**
   * Store a pattern as a new attractor (unit-normalized). If an attractor with
   * near-identical geometry (resonance ≥ 1 − 1/φ³) already exists, reinforce
   * that one instead of duplicating it. Bounded: oldest evicted past the cap.
   *
   * @returns true if a NEW attractor was added, false if merged into existing.
   */
  store(pattern: Float64Array): boolean {
    if (pattern.length !== this.dim) {
      throw new Error(`HopfieldMemory.store: pattern length ${pattern.length} !== dim ${this.dim}`);
    }
    const p = normalizeField(pattern);

    // Merge near-duplicates instead of accumulating copies. [SPEC]
    // Threshold 1 − 1/φ³ = 3 − √5, Wolfram-verified (Certificate 2.5).
    const mergeThreshold = HOPFIELD_MERGE_THRESHOLD;
    let bestIdx = -1;
    let bestRes = 0;
    for (let i = 0; i < this._patterns.length; i++) {
      const r = resonance(p, this._patterns[i]);
      if (r > bestRes) {
        bestRes = r;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestRes >= mergeThreshold) {
      // φ-decayed reinforcement of the existing attractor.
      const eta = 1.0 / (PHI * PHI);
      const cur = this._patterns[bestIdx];
      if (this._mergeScratch === null) this._mergeScratch = new Float64Array(this.dim);
      const merged = this._mergeScratch;
      for (let i = 0; i < this.dim; i++) merged[i] = at(cur, i) * (1.0 - eta) + at(p, i) * eta;
      // normalizeField allocates a fresh output, so the stored pattern never
      // aliases the scratch buffer (which the next merge will overwrite). [SPEC]
      this._patterns[bestIdx] = normalizeField(merged);
      return false;
    }

    this._patterns.push(p);
    if (this._patterns.length > MAX_PATTERNS) {
      this._patterns.shift(); // FIFO: the present outranks the stale past. [SPEC]
    }
    return true;
  }

  /**
   * Retrieve the attractor most resonant with a (possibly noisy/partial) cue.
   *
   * [MATH] — Single modern-Hopfield update: ξ_new = X · softmax(β·X·ξ).
   * The result is unit-normalized. On an empty memory this returns the ZERO
   * field (never a fabricated attractor) and `ok` is false. [SPEC]
   */
  retrieve(query: Float64Array): { ok: boolean; field: Float64Array; resonance: number } {
    if (query.length !== this.dim) {
      throw new Error(`HopfieldMemory.retrieve: query length ${query.length} !== dim ${this.dim}`);
    }
    if (this._patterns.length === 0) {
      return { ok: false, field: new Float64Array(this.dim), resonance: 0 };
    }
    const q = normalizeField(query);

    // scores s_μ = β · <ξ_μ, q> (raw inner product of unit vectors).
    const scores = new Float64Array(this._patterns.length);
    let maxScore = -Infinity;
    for (let mu = 0; mu < this._patterns.length; mu++) {
      let dot = 0.0;
      const xi = this._patterns[mu];
      for (let i = 0; i < this.dim; i++) dot += at(xi, i) * at(q, i);
      const s = this.beta * dot;
      scores[mu] = s;
      if (s > maxScore) maxScore = s;
    }

    // softmax (numerically stable: subtract max).
    let denom = 0.0;
    for (let mu = 0; mu < scores.length; mu++) {
      scores[mu] = Math.exp(at(scores, mu) - maxScore);
      denom += at(scores, mu);
    }
    if (denom <= 0 || !Number.isFinite(denom)) {
      return { ok: false, field: new Float64Array(this.dim), resonance: 0 };
    }

    // ξ_new = Σ_μ softmax_μ · ξ_μ, then unit-normalize.
    const out = new Float64Array(this.dim);
    for (let mu = 0; mu < this._patterns.length; mu++) {
      const w = at(scores, mu) / denom;
      const xi = this._patterns[mu];
      for (let i = 0; i < this.dim; i++) out[i] += w * at(xi, i);
    }
    let normSq = 0.0;
    for (let i = 0; i < this.dim; i++) normSq += at(out, i) * at(out, i);
    if (normSq <= 0 || !Number.isFinite(normSq)) {
      return { ok: false, field: new Float64Array(this.dim), resonance: 0 };
    }
    const result = normalizeField(out);
    return { ok: true, field: result, resonance: resonance(result, q) };
  }

  /** Clear all stored attractors. */
  clear(): void {
    this._patterns = [];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence — the registry discipline: the episodes survive a restart. [FIX]
  //
  // Previously the bank lived only in RAM: stableThoughtCount kept climbing but
  // every restart wiped the episodic attractors, so correlation-across-time
  // reset each session. Now the patterns serialize to base64 fields beside the
  // concept geometry and are restored on boot.
  // ─────────────────────────────────────────────────────────────────────────

  /** Serialize the stored attractors as base64 Float64 fields. [SPEC] */
  serialize(): string[] {
    return this._patterns.map((p) => encodeFieldBase64(p));
  }

  /**
   * Restore attractors from base64 fields (validation happens in the schema
   * layer before this is called — corrupt entries are skipped, never repaired).
   * Replaces any current patterns; caps at MAX_PATTERNS keeping the newest.
   */
  restore(fields: readonly string[]): void {
    this._patterns = [];
    for (const b64 of fields) {
      const dec = decodeFieldBase64(b64);
      if (dec.ok) this._patterns.push(normalizeField(dec.value));
    }
    if (this._patterns.length > MAX_PATTERNS) {
      this._patterns = this._patterns.slice(this._patterns.length - MAX_PATTERNS);
    }
  }
}
