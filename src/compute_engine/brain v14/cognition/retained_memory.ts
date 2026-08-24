/**
 * RHUFT Mind — Retained Memory: the measured-coherence retention gate
 *
 * Epistemic Status: [SPEC] — Cognition layer. ADR-001 (Unified Training Loop).
 *
 * THE PROBLEM THIS SOLVES. Today the mind's concept learning is gated only by
 * NOVELTY (the z-score NoveltyGate) — a percept that is *surprising* drives
 * learning pressure regardless of whether it is *coherent*. A noisy,
 * self-contradictory, or decohering stream can therefore imprint as readily as
 * a stable one. The operator's ask: "all coherent information above 0.66 is
 * stored and remembered." This module is that rule, made honest.
 *
 * WHY 0.66 IS A MEASURED GATE, NOT A MAGIC CONSTANT. The codebase's law is
 * φ-scaled thresholds (λ = φ⁻² = 0.382; the high-margin floor φ⁻¹ = 0.618).
 * Nothing in the verified mathematics derives 0.66, so we do NOT assert it as
 * exact. It is a *retention threshold* — a policy dial — whose effect on recall
 * precision is observable (see Decisions/ideas.md). The default is the
 * operator's 0.66; the φ⁻¹ = 0.618 high-margin floor is exported alongside it
 * so the two can be A/B-measured, never blurred.
 *
 * WHAT "COHERENT" MEANS HERE. The coherence of a candidate is a number the
 * caller has ALREADY measured — the ExistenceDetector's coherenceScore (field
 * internal structure under recurrence), the engine loop's cos² self-overlap, or
 * the temporal engine's |<Ψ_t|Ψ_{t-1}>|² / (|Ψ_t|²|Ψ_{t-1}|²). This gate never
 * recomputes coherence; it judges a measured value against the threshold.
 *
 * THREE GATES, EACH NECESSARY — a candidate is RETAINED only when ALL hold:
 *   1. COHERENCE — coherence ≥ threshold (the operator's rule).
 *   2. NOVELTY   — the caller supplies a novelty verdict; a redundant percept
 *                  is not re-stored (the registry prototype already holds it).
 *   3. HEADROOM  — the HardwareGovernor's budget is READ (never written): if
 *                  the tree sits at the measured depth/RAM ceiling, retention
 *                  DEFERS rather than competing with live dynamics for RAM.
 *                  The mode yields to the resource law — it never overrides it.
 *
 * OPT-IN, ZERO REGRESSION. Constructed DISABLED: disabled → admit() returns
 * retain=true ("disabled"), the learn-everything behaviour of today, so the
 * existing suites are byte-for-byte unaffected. Deterministic, RNG-free. The
 * governor is READ, never mutated. [SPEC]
 */

import type { HardwareGovernor } from "../hardware_governor.ts";
import type { MemoryStore } from "./memory_store.ts";

/**
 * The operator's retention threshold: coherence ≥ 0.66 is stored. [SPEC —
 * a measured policy dial, NOT a derived constant; see the module header.]
 */
export const DEFAULT_RETENTION_THRESHOLD = 0.66;

/** The φ⁻¹ = 0.618 high-margin floor — the verified-math alternative, exported
 *  so the two thresholds can be A/B-measured on recall precision. [MATH] */
export const PHI_HIGH_MARGIN_FLOOR = 0.6180339887498949;

/** The minimum headroom ratio (used/target RAM) above which retention DEFERS.
 *  φ⁻¹ of the budget stays free for live dynamics. [SPEC] */
export const HEADROOM_FLOOR_RATIO = 0.6180339887498949;

/** A candidate for retention: a measured percept or thought. [SPEC] */
export interface RetentionCandidate {
  /** Provenance: the sensory source or "engine.fourier" / "llm.answer". */
  readonly source: string;
  /** The caller's measured coherence for this candidate, in [0,1]. */
  readonly coherence: number;
  /** True when the novelty gate judged this candidate surprising (or gate off). */
  readonly novel: boolean;
  /** Free-form provenance echoed into the journal (never the field itself). */
  readonly meta?: Record<string, string>;
}

/** The verdict: retain or defer, with the honest reason. [SPEC] */
export interface RetentionVerdict {
  /** True when the candidate should be stored/remembered. */
  readonly retain: boolean;
  readonly source: string;
  readonly coherence: number;
  readonly threshold: number;
  /** Why: for the journal — "disabled" | "retained" | "below-coherence" |
   *  "redundant" | "governor-defer" | "bad-coherence". */
  readonly reason: string;
}

/** Live counters for the Σ panel / tests. All honest, never derived. [SPEC] */
export interface RetentionStats {
  readonly enabled: boolean;
  readonly threshold: number;
  readonly admitted: number;
  readonly deferredCoherence: number;
  readonly deferredRedundant: number;
  readonly deferredHeadroom: number;
}

export class RetainedMemory {
  private _enabled: boolean;
  private readonly _threshold: number;
  private readonly _governor: HardwareGovernor | null;
  private readonly _store: MemoryStore | null;

  private _admitted = 0;
  private _deferredCoherence = 0;
  private _deferredRedundant = 0;
  private _deferredHeadroom = 0;

  /**
   * @param governor  READ-ONLY resource law; when present, retention defers at
   *                  the RAM/depth ceiling. May be null (no headroom gating).
   * @param store     When present, every deferral + admission is journaled.
   * @param enabled   Master switch. Default false → admit-everything (today).
   * @param threshold Coherence floor. Default the operator's 0.66.
   */
  constructor(
    governor: HardwareGovernor | null = null,
    store: MemoryStore | null = null,
    enabled: boolean = false,
    threshold: number = DEFAULT_RETENTION_THRESHOLD,
  ) {
    this._governor = governor;
    this._store = store;
    this._enabled = enabled;
    // Clamp into [0,1]; a non-finite threshold falls back to the default.
    this._threshold =
      Number.isFinite(threshold) && threshold >= 0 && threshold <= 1
        ? threshold
        : DEFAULT_RETENTION_THRESHOLD;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  get threshold(): number {
    return this._threshold;
  }

  /** Flip the master switch. Returns the previous state (for an honest journal). */
  setEnabled(next: boolean): boolean {
    const prev = this._enabled;
    this._enabled = next;
    return prev;
  }

  /**
   * Judge one candidate. Pure decision + honest counters; never mutates the
   * governor, never touches the engine. When disabled, retain=true ("disabled")
   * — the learn-everything behaviour of today.
   */
  admit(candidate: RetentionCandidate, totalNodes: number = 0): RetentionVerdict {
    const { source, coherence, novel } = candidate;

    if (!this._enabled) {
      return this._verdict(true, source, coherence, "disabled");
    }

    // 0. A coherence the caller did not validly measure is never retained —
    //    non-finite or out-of-range is a measurement defect, reported honestly.
    if (!Number.isFinite(coherence) || coherence < 0 || coherence > 1) {
      return this._verdict(false, source, coherence, "bad-coherence");
    }

    // 1. COHERENCE — the operator's rule: ≥ threshold is stored.
    if (coherence < this._threshold) {
      this._deferredCoherence++;
      this._journal("retention.defer", {
        source, coherence, threshold: this._threshold, reason: "below-coherence",
      });
      return this._verdict(false, source, coherence, "below-coherence");
    }

    // 2. NOVELTY — a redundant coherent percept is already held; do not re-store.
    if (!novel) {
      this._deferredRedundant++;
      return this._verdict(false, source, coherence, "redundant");
    }

    // 3. HEADROOM — read the resource law; defer when the budget is saturated.
    if (this._governor && totalNodes > 0) {
      const budget = this._governor.compute_budget();
      const usage = this._governor.estimate_usage(totalNodes);
      const target = Math.max(1, budget.target_ram_bytes);
      const usedRatio = usage.ram_bytes / target;
      if (usedRatio >= HEADROOM_FLOOR_RATIO) {
        this._deferredHeadroom++;
        this._journal("retention.defer", {
          source, coherence, usedRatio: Number(usedRatio.toFixed(4)),
          reason: "governor-defer",
        });
        return this._verdict(false, source, coherence, "governor-defer");
      }
    }

    this._admitted++;
    this._journal("retention.admit", {
      source, coherence, threshold: this._threshold, ...(candidate.meta ? { meta: candidate.meta } : {}),
    });
    return this._verdict(true, source, coherence, "retained");
  }

  /** Live, honest counters for the Σ panel and the tests. */
  stats(): RetentionStats {
    return {
      enabled: this._enabled,
      threshold: this._threshold,
      admitted: this._admitted,
      deferredCoherence: this._deferredCoherence,
      deferredRedundant: this._deferredRedundant,
      deferredHeadroom: this._deferredHeadroom,
    };
  }

  private _verdict(retain: boolean, source: string, coherence: number, reason: string): RetentionVerdict {
    return { retain, source, coherence, threshold: this._threshold, reason };
  }

  /** Journal best-effort; a null store (tests, headless) is honoured. */
  private _journal(kind: string, data: Record<string, unknown>): void {
    this._store?.journal({ t: Date.now(), kind: kind as never, data });
  }
}
