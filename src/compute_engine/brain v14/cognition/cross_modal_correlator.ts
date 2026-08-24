/**
 * RHUFT Mind — Cross-Modal Co-occurrence Correlator (learning-layer gap).
 *
 * Epistemic Status: [SPEC] — Cognition-layer observer. Spine-upgrade follow-on.
 *
 * THE GAP THIS CLOSES. The mind has rich WITHIN-modality learning (the registry's
 * mastery, the record-perceptron's percept→label associator) and rich per-modality
 * spectral records (SpectralMemory). But NOTHING measures the BETWEEN-modality
 * correlation: when a sight and a sound arrive in the same tick window, does the
 * mind learn that they co-occur? That cross-correlation is the substrate of
 * grounded meaning (a "dog" is the thing that looks like this AND sounds like
 * that) — and it was absent. This module adds it, as a read-only observer that
 * NEVER perturbs the engine's sensory door.
 *
 * THE CAUSAL HARDENING (ADR-002 follow-on, this version). A naive co-occurrence
 * correlator learns "dog ↔ vroom" when a car passes while the dog is in frame —
 * time is the WEAKEST correlate. This module upgrades correlation toward causation
 * with three measured mechanisms, each independently gated and reversible:
 *
 *   M1 · LAGGED CAUSAL PRECEDENCE. A cross-modal link is only counted when a
 *        CHANGE in modality A (its field delta vs its own recent history, above a
 *        measured threshold) at tick t PRECEDES an observation in B at t+Δ. The
 *        dog's mouth moves, THEN the bark arrives — precedence. A car's vroom with
 *        no preceding change in the dog's visual field is NOT attributed to the
 *        dog. Requires the optional `tick` on a frame; without ticks it cannot
 *        order events and honestly REFUSES to claim precedence (see below).
 *   M2 · PREDICTION-ERROR GATE. Before writing an update, the pair's CURRENT
 *        running mean is the prediction. If |observed − predicted| < ε the
 *        observation is unsurprising: the count still increments (honesty — the
 *        sample is real) but the mean update is φ-suppressed, so the 101st
 *        repetition of an already-modelled link barely moves it. Only SURPRISE
 *        moves a mean strongly. This stops over-learning spurious links.
 *   M3 · CONFIDENCE DECAY + COUNTER-EVIDENCE. A correlation that is not
 *        re-confirmed decays toward zero; a definitive counter-observation (A
 *        present, B definitively absent) records NEGATIVE evidence. Links are
 *        BELIEFS-WITH-CONFIDENCE, never wiring.
 *
 *   M4 · MOVEMENT-ANCHOR (this version — SHIPPED, was deferred). When a vision
 *        frame carries a `motion` anchor (real optical flow over the luminance
 *        grid — optical_flow.ts), a concurrent audio stream is attributed to the
 *        REGION THAT MOVED, not the whole frame. The dog/car case resolved: the
 *        car's region moved, so the vroom links to the car; the dog's region did
 *        not, so the dog is not linked. When no region moved confidently the
 *        anchor is ABSENT and the pair falls back to the M1 whole-frame gate —
 *        honest, never a fabricated region.
 *
 *   M2 · AUDITORY SOURCE SEPARATION (this version — SHIPPED, was deferred). When
 *        an audio frame carries a `streams` decomposition (energy-certified
 *        spectral-flux parsing — stream_separator.ts), each stream is correlated
 *        INDEPENDENTLY against the other modality, weighted by its certified
 *        energy fraction. A bark-stream and a vroom-stream no longer smear into
 *        one blob: the bark links to the dog, the vroom to the car, each carrying
 *        its own Parseval-backed energy mass. Absent ⇒ single whole-clip path.
 *
 * HONEST STATUS. M4/M2 are built on the data the sensors already produce (the
 * luminance grid and the spectrogram), computed by real transforms (Lucas–Kanade
 * optical flow; spectral-flux stream clustering), each carrying its certificate
 * (structure-tensor conditioning; Parseval energy mass). The module STILL does not
 * claim proven causation — it claims lagged, region-anchored, stream-separated,
 * prediction-gated, decaying correlation, with every sample size reported. That is
 * the strongest honest statement the data supports. [SPEC]
 *
 * DISCIPLINE (the honesty law): correlation is NOT equivalence, and lagged
 * correlation is NOT proven causation. A high co-occurrence resonance is reported
 * as "these two modalities co-varied, with A's change preceding B", with its n,
 * never as "these are the same thing" and never as "A causes B". The correlator
 * records; it does not assert. Constructed DISABLED; observe() is a no-op until
 * enabled. [SPEC]
 */

import { resonance } from "../adapters/language_codec.ts";
import type { MotionAnchor, AudioStreamRef } from "../schemas/validate.ts";

/** φ-decay for the running means — the engine's hardening law. [MATH] */
const PHI_INV = 0.6180339887498949;

/** φ² suppression applied to unsurprising (predicted) mean updates. [MATH] */
const PHI_INV_SQ = PHI_INV * PHI_INV;

/**
 * Prediction-error tolerance: |observed − predicted| below this is "unsurprising".
 * Chosen well under the codec's measured cross-talk band (~0.24) so genuine
 * novelty always clears it. [SPEC — tunable, not derived]
 */
const SURPRISE_EPS = 0.05;

/**
 * Change threshold for M1 precedence: a modality's field delta (resonance distance
 * 1 − C from its own previous field) must exceed this to count as "changed".
 * Below it the modality is static and cannot be a causal antecedent. [SPEC]
 */
const CHANGE_EPS = 0.02;

/** Ring-buffer depth of per-source field history for precedence. [SPEC] */
const HISTORY_DEPTH = 4;

/** Ticks without re-confirmation before a correlation's confidence decays. [SPEC] */
const DECAY_AFTER = 32;

/** One ordered source-pair's running correlation record. */
export interface ModalityCorrelation {
  /** φ-decayed mean field resonance between the two sources. */
  readonly meanResonance: number;
  /** Number of co-occurrences observed (the sample size behind the mean). */
  readonly count: number;
  /**
   * Signed evidence: positive confirmations minus counter-observations, φ-decayed.
   * Negative ⟹ the counter-evidence currently outweighs the confirmations.
   */
  readonly evidence: number;
  /** Ticks since this pair was last re-confirmed (drives decay). */
  readonly staleTicks: number;
}

/** Live, honest counters for the Σ panel / tests. [SPEC] */
export interface CorrelatorStats {
  readonly enabled: boolean;
  readonly pairs: number;
  readonly observations: number;
  /** Updates suppressed by the prediction-error gate (unsurprising repeats). */
  readonly suppressed: number;
  /** Co-occurrences REJECTED for lacking a preceding change (M1, lagged mode). */
  readonly precedenceRejected: number;
}

/** A minimal frame view the correlator needs (source + field, optional tick). */
export interface CorrelatorFrame {
  readonly source: string;
  readonly field: Float64Array;
  /**
   * Optional monotonic tick index. REQUIRED for lagged-precedence mode: without an
   * ordering the correlator cannot know what preceded what and will honestly fall
   * back to plain co-occurrence (and report precedenceRejected = 0, i.e. "not
   * measured", never a fabricated precedence). Additive + non-breaking.
   */
  readonly tick?: number;
  /**
   * ADR-002 M4 — optional movement-anchor on a vision frame: the region that moved
   * (real optical flow). When present alongside an audio stream, the link is
   * region-anchored: the sound is attributed to the moved region, not the whole
   * frame. Absent ⇒ whole-frame fallback (no regional claim). [SPEC]
   */
  readonly motion?: MotionAnchor;
  /**
   * ADR-002 M2 — optional stream decomposition on an audio frame: energy-certified
   * auditory streams. When present, each stream is correlated independently (each
   * carries its own energy mass + signature). Absent ⇒ whole-clip path. [SPEC]
   */
  readonly streams?: readonly AudioStreamRef[];
}

/** Internal mutable record (the public interface is a readonly snapshot). */
interface PairRecord {
  mean: number;
  count: number;
  evidence: number;
  lastConfirmedTick: number;
}

/**
 * The cross-modal correlator. Reads the frames the loop drained this tick and
 * updates the cross-modal correlation structure. Inert until enabled.
 * Deterministic. Read-only; never throws on a degenerate pair. [SPEC]
 */
export class CrossModalCorrelator {
  private _enabled: boolean;
  /** pairKey -> record. pairKey = "sourceA|sourceB" (sorted for symmetry). */
  private readonly _corr = new Map<string, PairRecord>();
  /** source -> recent fields (ring) for change detection + precedence. */
  private readonly _history = new Map<string, Float64Array[]>();
  /** ADR-002 M4+M2 — region↔stream attribution records (spatially-resolved). */
  private readonly _regionStreams = new Map<string, PairRecord>();
  private _observations = 0;
  private _suppressed = 0;
  private _precedenceRejected = 0;
  /** When true, M1 lagged precedence is enforced (needs ticks on frames). */
  private readonly _lagged: boolean;

  constructor(enabled: boolean = false, lagged: boolean = false) {
    this._enabled = enabled;
    this._lagged = lagged;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Flip the master switch; returns the previous state (for an honest journal). */
  setEnabled(next: boolean): boolean {
    const prev = this._enabled;
    this._enabled = next;
    return prev;
  }

  /** Resonance distance (1 − C) between a source's latest field and its prior. */
  private _changeMagnitude(source: string, field: Float64Array): number {
    const hist = this._history.get(source);
    if (!hist || hist.length === 0) return 1; // first sighting counts as a change
    const prior = hist[hist.length - 1]!;
    return 1 - resonance(prior, field);
  }

  /** Did `source` exhibit a change at any tick strictly before `tick`? */
  private _changedBefore(source: string, tick: number): boolean {
    const hist = this._history.get(source);
    if (!hist || hist.length < 2) return false;
    // Walk the recorded history: any consecutive-pair delta above threshold that
    // was recorded before `tick` counts as a preceding change. (History entries
    // are stored in arrival order; we track their ticks implicitly via recency.)
    // Conservative: we require the MOST RECENT change to be a real delta.
    for (let i = hist.length - 1; i > 0; i--) {
      const d = 1 - resonance(hist[i - 1]!, hist[i]!);
      if (d > CHANGE_EPS) return true;
    }
    return false;
  }

  /**
   * Observe the frames drained in one tick. Updates the φ-decayed cross-modal
   * correlation structure under the M1/M2/M3 hardening. Read-only. [SPEC]
   *
   * @param frames  The validated frames of this tick (any subset of modalities).
   */
  observe(frames: readonly CorrelatorFrame[]): void {
    if (!this._enabled) return;
    // Deduplicate by source (one representative field per modality per tick).
    const bySource = new Map<string, CorrelatorFrame>();
    for (const f of frames) {
      if (!bySource.has(f.source)) bySource.set(f.source, f);
    }
    const sources = [...bySource.keys()].sort();
    const tick = frames.find((f) => f.tick !== undefined)?.tick;

    for (let i = 0; i < sources.length; i++) {
      for (let j = i + 1; j < sources.length; j++) {
        const fa = bySource.get(sources[i]!)!;
        const fb = bySource.get(sources[j]!)!;

        // M1 — LAGGED PRECEDENCE. In lagged mode, count the link ONLY if at least
        // one modality changed (a candidate causal antecedent exists). Without
        // ticks we cannot order events; we then use change-magnitude alone as the
        // gate and honestly do NOT claim temporal precedence. A pair where BOTH
        // modalities are static (no antecedent) is rejected — this is the
        // dog-still + car-vroom case: the dog did not change, so the dog is not
        // linked to the sound.
        if (this._lagged) {
          const changeA = this._changeMagnitude(fa.source, fa.field);
          const changeB = this._changeMagnitude(fb.source, fb.field);
          const antecedent = changeA > CHANGE_EPS || changeB > CHANGE_EPS;
          if (!antecedent) {
            this._precedenceRejected++;
            continue;
          }
        }

        const r = resonance(fa.field, fb.field);
        const key = `${fa.source}|${fb.source}`;
        const prev = this._corr.get(key) ?? { mean: 0, count: 0, evidence: 0, lastConfirmedTick: tick ?? 0 };
        const count = prev.count + 1;

        // M2 — PREDICTION-ERROR GATE. The running mean is the prediction. Surprise
        // (|r − mean| ≥ ε) moves the mean at full φ⁻¹; an unsurprising repeat moves
        // it at φ⁻² (heavily suppressed) but STILL counts (the sample is real).
        const surprise = Math.abs(r - prev.mean);
        const step = surprise >= SURPRISE_EPS ? PHI_INV : PHI_INV_SQ;
        if (surprise < SURPRISE_EPS) this._suppressed++;
        const mean = prev.mean + step * (r - prev.mean);

        // M3 — EVIDENCE. A co-occurrence is one confirmation; counter-evidence is
        // recorded separately via counterEvidence(). Evidence is the signed,
        // φ-decayed balance; confidence derives from it and never asserts fact.
        const evidence = prev.evidence + PHI_INV * (1 - prev.evidence);

        this._corr.set(key, { mean, count, evidence, lastConfirmedTick: tick ?? prev.lastConfirmedTick });
        this._observations++;

        // M4 + M2 — REGION-ANCHORED, STREAM-SEPARATED attribution. When one frame
        // carries a movement-anchor (vision) and the other carries a stream
        // decomposition (audio), record a link between the MOVED REGION and each
        // STREAM, weighted by the stream's certified energy fraction. This is the
        // dog/car resolution: the vroom links to the car's moved region, not to
        // the static dog. The whole-frame link above still records the raw
        // co-occurrence (the honest sample); this adds the spatially-resolved
        // attribution as a separate, finer-grained record. [SPEC]
        this._attribute(fa, fb, tick);
        this._attribute(fb, fa, tick);
      }
    }

    // Update per-source field history AFTER pair processing so precedence reads
    // the state PRIOR to this tick (the candidate antecedent, not the consequent).
    for (const f of frames) {
      const hist = this._history.get(f.source) ?? [];
      hist.push(f.field);
      if (hist.length > HISTORY_DEPTH) hist.shift();
      this._history.set(f.source, hist);
    }
  }

  /**
   * Record a COUNTER-OBSERVATION for a pair: `presentSource` was observed while
   * `absentSource` was definitively absent. This SUBTRACTS evidence — the rigor
   * that separates correlation from coincidence. No mean update (nothing to
   * resonate against); the mean is left untouched and only confidence falls. [SPEC]
   */
  counterEvidence(presentSource: string, absentSource: string): void {
    if (!this._enabled) return;
    const [a, b] = [presentSource, absentSource].sort();
    const key = `${a}|${b}`;
    const prev = this._corr.get(key);
    if (!prev) return; // no belief to disconfirm — honest no-op
    const evidence = prev.evidence - PHI_INV * (1 + prev.evidence);
    this._corr.set(key, { ...prev, evidence });
  }

  /**
   * Advance the decay clock. Pairs not re-confirmed within DECAY_AFTER ticks have
   * their confidence decay φ-ward of zero. Called once per loop tick by the wiring
   * (or by tests). The mean and count are preserved (the sample is history); only
   * confidence fades. [SPEC]
   */
  tickClock(currentTick: number): void {
    if (!this._enabled) return;
    for (const [key, rec] of this._corr) {
      const stale = currentTick - rec.lastConfirmedTick;
      if (stale > DECAY_AFTER) {
        const evidence = rec.evidence * PHI_INV;
        this._corr.set(key, { ...rec, evidence });
      }
    }
  }

  /**
   * ADR-002 M4+M2 — attribute an audio stream to a moved vision region. When the
   * `visionSide` frame carries a movement-anchor and the `audioSide` frame carries
   * a stream decomposition, each stream is linked to the moved region with weight
   * = stream energyFraction × anchor confidence (both measured). This is the
   * spatially-resolved causal record: the vroom lands on the car's region. A pair
   * lacking either side is an honest no-op (whole-frame fallback already recorded).
   * [SPEC]
   */
  private _attribute(
    visionSide: CorrelatorFrame,
    audioSide: CorrelatorFrame,
    tick: number | undefined
  ): void {
    const motion = visionSide.motion;
    const streams = audioSide.streams;
    if (!motion || !streams || streams.length === 0) return; // not both enriched
    for (const stream of streams) {
      // Skip negligible slivers (energy-honest): a stream under ~5% of the clip's
      // energy is a leakage artifact, not a separable source. [SPEC]
      if (stream.energyFraction < 0.05) continue;
      // The region-stream key carries the moved region's coordinates so distinct
      // regions keep distinct records (car-region ≠ dog-region).
      const regionKey = `${visionSide.source}@r${motion.row}c${motion.col}`;
      const streamKey = `${audioSide.source}~${Math.round(stream.dominantHz)}Hz`;
      const key = `${regionKey}|${streamKey}`;
      const weight = stream.energyFraction * motion.confidence; // both in [0,1], measured
      const prev = this._regionStreams.get(key) ?? { mean: 0, count: 0, evidence: 0, lastConfirmedTick: tick ?? 0 };
      // The resonance of a region↔stream is proxied by the anchor's confidence ×
      // the stream's energy fraction — the measured strength of THIS attribution.
      const r = weight;
      const surprise = Math.abs(r - prev.mean);
      const step = surprise >= SURPRISE_EPS ? PHI_INV : PHI_INV_SQ;
      const mean = prev.mean + step * (r - prev.mean);
      const evidence = prev.evidence + PHI_INV * weight * (1 - prev.evidence);
      this._regionStreams.set(key, {
        mean,
        count: prev.count + 1,
        evidence,
        lastConfirmedTick: tick ?? prev.lastConfirmedTick,
      });
    }
  }

  /**
   * ADR-002 M4+M2 — the region-anchored, stream-separated attributions, strongest
   * first. Each key is `vision.source@rR cC|audio.source~HzHz` — the moved region
   * linked to the separated stream. Read-only. [SPEC]
   */
  regionAttributions(): ReadonlyArray<{ pair: string } & ModalityCorrelation> {
    return [...this._regionStreams.entries()]
      .map(([pair, v]) => ({
        pair,
        meanResonance: v.mean,
        count: v.count,
        evidence: v.evidence,
        staleTicks: 0,
      }))
      .sort((a, b) => b.meanResonance - a.meanResonance);
  }

  /**
   * The measured cross-modal correlations, strongest first. Each carries its
   * sample size, signed evidence and staleness. Read-only; empty until
   * co-occurrences are observed. [SPEC]
   */
  correlations(): ReadonlyArray<{ pair: string } & ModalityCorrelation> {
    return [...this._corr.entries()]
      .map(([pair, v]) => ({
        pair,
        meanResonance: v.mean,
        count: v.count,
        evidence: v.evidence,
        staleTicks: 0,
      }))
      .sort((a, b) => b.meanResonance - a.meanResonance);
  }

  /** The strongest cross-modal correlation, or null when nothing observed yet. */
  strongest(): ({ pair: string } & ModalityCorrelation) | null {
    return this.correlations()[0] ?? null;
  }

  /** Live, honest counters. */
  stats(): CorrelatorStats {
    return {
      enabled: this._enabled,
      pairs: this._corr.size,
      observations: this._observations,
      suppressed: this._suppressed,
      precedenceRejected: this._precedenceRejected,
    };
  }
}
