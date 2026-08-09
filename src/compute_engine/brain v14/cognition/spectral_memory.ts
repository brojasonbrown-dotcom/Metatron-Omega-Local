/**
 * RHUFT Mind — Spectral Memory Tap: the loop's window into measured percepts
 *
 * Epistemic Status: [SPEC] — Cognition-layer measured-percept record.
 *
 * The bus `field` (28 elements) is what the engine thinks in — that contract is
 * locked and untouched. But the certified spectral enrichment the sensors now
 * attach carries the percept's FULL measured structure: the whitened identity
 * signature and a five-number modal-occupancy complexity that is commensurable
 * ACROSS modalities (a face and a voice occupy the same measured basis).
 *
 * This tap is where "used to fullest potential" becomes real: each tick the loop
 * hands every enriched frame here, and the tap keeps a bounded, queryable record
 * of measured complexity + identity keyed by tick and source. That enables what
 * the low-pass ghost never could:
 *   - cross-sensory comparison (is this sound as complex as this sight?),
 *   - novelty-by-complexity (a percept whose modal occupancy departs from the
 *     running baseline is salient — the substrate for the Upgrade-3 novelty gate),
 *   - a measured certificate (Parseval residual) that the percept is exact.
 *
 * The tap NEVER perturbs engine dynamics: it reads the enrichment, records it,
 * and returns a summary for journaling. Deterministic, RNG-free. [SPEC]
 */

import type { SpectralEnrichment, SpectralComplexity } from "./../schemas/validate.ts";

/** One recorded enriched percept. */
export interface SpectralRecord {
  readonly tick: number;
  readonly source: string;
  readonly complexity: SpectralComplexity;
  readonly parsevalResidual: number;
  /** Pitch anchor (Hz) when the modality has one (audio); undefined for vision. */
  readonly dominantHz?: number;
  /** Length of the whitened identity signature (percept resolution). */
  readonly signatureLength: number;
}

/** Bounded capacity: F_11 = 89 records, matching the bus capacity. [SPEC] */
const SPECTRAL_CAPACITY = 89;

export class SpectralMemory {
  private readonly _records: SpectralRecord[] = [];
  /** The most recent whitened signature per source, for identity comparison. */
  private readonly _latestSignature = new Map<string, Float64Array>();
  /** Running mean of entropyNorm per source — the complexity baseline for novelty. */
  private readonly _entropyBaseline = new Map<string, number>();
  private readonly _entropyCount = new Map<string, number>();
  /** Welford M2 accumulator per source — for a running variance (scale-free novelty). */
  private readonly _entropyM2 = new Map<string, number>();

  /**
   * Record one enriched frame. Returns a compact, JSON-safe summary for the
   * journal. Never throws on a well-formed enrichment (the bus already validated
   * it); a non-finite complexity is recorded as-is and surfaced, not repaired.
   */
  record(tick: number, source: string, spectral: SpectralEnrichment): Record<string, unknown> {
    const rec: SpectralRecord = {
      tick,
      source,
      complexity: spectral.complexity,
      parsevalResidual: spectral.parsevalResidual,
      ...(spectral.dominantHz !== undefined ? { dominantHz: spectral.dominantHz } : {}),
      signatureLength: spectral.whitened.length,
    };
    this._records.push(rec);
    if (this._records.length > SPECTRAL_CAPACITY) this._records.shift();

    // Keep the live identity signature + update the running complexity baseline.
    this._latestSignature.set(source, spectral.whitened);
    const x = spectral.complexity.entropyNorm;
    const prevMean = this._entropyBaseline.get(source) ?? 0;
    const prevCount = this._entropyCount.get(source) ?? 0;
    const prevM2 = this._entropyM2.get(source) ?? 0;
    const nextCount = prevCount + 1;
    // Welford's online algorithm: running mean AND variance in one pass. [MATH]
    // mean_n = mean_{n-1} + (x − mean_{n-1})/n ;  M2_n = M2_{n-1} + (x−mean_{n-1})(x−mean_n)
    // variance (sample) = M2/(n−1). This is numerically stable and exact, so the
    // novelty z-score self-calibrates to each modality's own entropy spread.
    const nextMean = prevMean + (x - prevMean) / nextCount;
    const nextM2 = prevM2 + (x - prevMean) * (x - nextMean);
    this._entropyBaseline.set(source, nextMean);
    this._entropyCount.set(source, nextCount);
    this._entropyM2.set(source, nextM2);

    return {
      source,
      entropyNorm: spectral.complexity.entropyNorm,
      flatness: spectral.complexity.flatness,
      participation: spectral.complexity.participation,
      rank99: spectral.complexity.rank99,
      parsevalResidual: spectral.parsevalResidual,
      ...(spectral.dominantHz !== undefined ? { dominantHz: spectral.dominantHz } : {}),
      // Novelty signal: how far this percept's entropy sits from its source's
      // running baseline. Positive = more complex than usual for this modality.
      entropyDelta: spectral.complexity.entropyNorm - nextMean,
    };
  }

  /** The recorded percepts, oldest first (read-only view). */
  get records(): readonly SpectralRecord[] {
    return this._records;
  }

  /** The latest whitened identity signature for a source, if any. */
  latestSignature(source: string): Float64Array | undefined {
    return this._latestSignature.get(source);
  }

  /** The running complexity (entropyNorm) baseline for a source. */
  entropyBaseline(source: string): number | undefined {
    return this._entropyBaseline.get(source);
  }


  /**
   * The running sample standard deviation of entropyNorm for a source —
   * the modality's own complexity spread. Undefined until ≥ 2 samples. [MATH]
   */
  entropyStdDev(source: string): number | undefined {
    const n = this._entropyCount.get(source) ?? 0;
    if (n < 2) return undefined;
    const m2 = this._entropyM2.get(source) ?? 0;
    return Math.sqrt(m2 / (n - 1));
  }

  /**
   * Scale-free novelty (surprise) of an entropyNorm reading against the
   * source's running distribution: z = (x − mean) / sd. Self-calibrating per
   * modality — a reading 2 sd above its own baseline is salient whether the
   * modality is intrinsically low- or high-entropy. Returns undefined when the
   * baseline is not yet meaningful (< 2 samples) or degenerate (sd = 0, in
   * which case any deviation from a constant stream is maximal surprise). [MATH]
   */
  noveltyScore(source: string, entropyNorm: number): number | undefined {
    const mean = this._entropyBaseline.get(source);
    const n = this._entropyCount.get(source) ?? 0;
    if (mean === undefined || n < 2) return undefined;
    const m2 = this._entropyM2.get(source) ?? 0;
    const variance = m2 / (n - 1);
    if (variance <= 0) {
      // Constant stream so far: an identical reading is unsurprising (z = 0),
      // any departure is maximal novelty.
      return entropyNorm === mean ? 0 : Number.POSITIVE_INFINITY;
    }
    return (entropyNorm - mean) / Math.sqrt(variance);
  }

  /**
   * Cosine similarity between the latest whitened signatures of two sources —
   * the cross-sensory identity comparison. Returns undefined if either source
   * has no recorded signature or their resolutions differ. [MATH]
   */
  crossModalSimilarity(a: string, b: string): number | undefined {
    const sa = this._latestSignature.get(a);
    const sb = this._latestSignature.get(b);
    if (!sa || !sb || sa.length !== sb.length) return undefined;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < sa.length; i++) {
      const x = sa[i]!;
      const y = sb[i]!;
      dot += x * y;
      na += x * x;
      nb += y * y;
    }
    if (na <= 0 || nb <= 0) return undefined;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}
