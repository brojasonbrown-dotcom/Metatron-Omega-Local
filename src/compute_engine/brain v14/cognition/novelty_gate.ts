/**
 * RHUFT Mind — Novelty Gate: measured surprise gates learning pressure
 *
 * Epistemic Status: [SPEC] — Cognition layer. Upgrade 3.
 *
 * THE PROBLEM THIS SOLVES. The mind's concept learning (ConceptRegistry.observe
 * → prototype reinforcement / new-concept formation) currently runs on EVERY
 * stable thought, novel or not. A static, redundant stream therefore drives the
 * same learning pressure as a genuinely new percept — the prototype is nudged
 * again and again by information it has already absorbed, and the entropy
 * baseline creeps ever upward with nothing to show for it.
 *
 * THE GATE. SpectralMemory already measures each percept's complexity and keeps
 * a per-source running mean AND variance (Welford). This gate turns that into a
 * scale-free surprise: the z-score z = (entropyNorm − mean) / sd. A percept is
 * NOVEL when |z| ≥ threshold — its modal occupancy departs from what its own
 * modality has recently produced, in either direction (a sudden simple signal
 * in a rich stream is as salient as a sudden rich one). Self-calibrating: a
 * low-entropy modality and a high-entropy modality are each judged against
 * their own spread, never against each other.
 *
 * WHAT IT GATES — AND WHAT IT NEVER GATES. The gate modulates ONLY the
 * concept-learning pressure (prototype reinforcement / formation) downstream of
 * DETECT. It NEVER gates the engine's sensory door: engine.process(frame.field)
 * runs for every frame regardless, so the field dynamics are untouched. The
 * mind still SEES everything; it simply stops re-learning what it already knows.
 *
 * OPT-IN, ZERO REGRESSION. The gate is constructed DISABLED. Disabled →
 * isNovel() returns a constant true (learn-everything): the behaviour is
 * byte-for-byte today's. Nothing changes unless the caller opts in and supplies
 * a threshold. Deterministic, RNG-free. [SPEC]
 */

import type { SpectralMemory } from "./spectral_memory.ts";

/** Default salience threshold: 2 standard deviations from the source baseline. [SPEC] */
export const DEFAULT_NOVELTY_THRESHOLD = 2.0;

/** The minimum readings before a z-score is meaningful; below this everything is novel. */
const MIN_BASELINE_SAMPLES = 2;

export interface NoveltyVerdict {
  readonly source: string;
  readonly entropyNorm: number;
  /** Scale-free surprise; undefined when the baseline is too thin to judge. */
  readonly zScore?: number;
  readonly threshold: number;
  /** True when this percept should drive learning pressure. */
  readonly novel: boolean;
  /** Why: for the journal — "disabled" | "baseline-thin" | "surprise" | "redundant". */
  readonly reason: string;
}

export class NoveltyGate {
  /**
   * @param enabled  Master switch. Default false → learn-everything (today).
   * @param threshold  Salience threshold in standard deviations. Default 2.0.
   */
  private readonly _enabled: boolean;
  private readonly _threshold: number;

  constructor(
    enabled: boolean = false,
    threshold: number = DEFAULT_NOVELTY_THRESHOLD,
  ) {
    this._enabled = enabled;
    this._threshold = threshold;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get threshold(): number {
    return this._threshold;
  }

  /**
   * Judge one enriched percept. Pure read of the spectral tap — never mutates,
   * never touches the engine. When disabled, returns novel=true ("disabled").
   */
  judge(spectral: SpectralMemory, source: string, entropyNorm: number): NoveltyVerdict {
    if (!this._enabled) {
      return { source, entropyNorm, threshold: this._threshold, novel: true, reason: "disabled" };
    }

    const z = spectral.noveltyScore(source, entropyNorm);

    // Baseline too thin to judge — be permissive (a young mind learns everything).
    if (z === undefined) {
      return { source, entropyNorm, threshold: this._threshold, novel: true, reason: "baseline-thin" };
    }

    // Degenerate (constant) stream: noveltyScore returns 0 for an identical
    // reading and +Infinity for any departure. Honour both.
    if (!Number.isFinite(z)) {
      return { source, entropyNorm, zScore: z, threshold: this._threshold, novel: true, reason: "surprise" };
    }

    const novel = Math.abs(z) >= this._threshold;
    return {
      source,
      entropyNorm,
      zScore: z,
      threshold: this._threshold,
      novel,
      reason: novel ? "surprise" : "redundant",
    };
  }
}
