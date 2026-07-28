/**
 * FILE 15 — information/actualizer.ts
 *
 * Owns: **state scoring + next-state selection — the decision core.**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   The engine's actualizer answers one question per step: of the candidate
 *   next states, which is most CLOSED? It scores each candidate by its closure
 *   residual (File 6) — lower residual = more closed = better — and selects
 *   the minimum. This is the engine's selection pressure: the structure
 *   advances toward the state that best satisfies toroidal closure, subject to
 *   the Lucas obstruction that keeps every residual nonzero.
 *
 *       score(state)  =  closureResidual(state.field)          [lower = better]
 *       selectNext    =  argmin over candidates of score,       [deterministic]
 *                        ties broken by lowest candidate index
 *
 *   `detectStability` reports whether a state has held its invariants within
 *   threshold for K consecutive steps — the engine's notion of a settled
 *   fixed point.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. THE SCORE IS THE CLOSURE RESIDUAL, FULL STOP. The contract is explicit:
 *      "lower closure residual = better." We do NOT blend in a weighted
 *      coherence, a burden penalty, or any hand-tuned multi-objective — that
 *      would be an unjustified POSTULATE layered on the one derived signal the
 *      engine has. File 6's residual is the measured obstruction to closure;
 *      minimizing it is the selection law. [EXACT — contract clause]
 *
 *   2. SELECTION MUST BE DETERMINISTIC. argmin with a total, deterministic
 *      tie-break (lowest index) is reproducible run-to-run with no RNG at all.
 *      There is no randomness in the core selection; "seeded determinism" is
 *      satisfied trivially by being deterministic unconditionally. Ties are
 *      possible (two candidates with equal residual to Float64); the rule is
 *      fixed and documented. [EXACT]
 *
 *   3. "NEVER INCREASES TOTAL RESIDUAL WITHOUT A LOGGED REASON." When a
 *      current-state score is provided, the selector compares the chosen
 *      candidate's score against it. If every candidate is worse (residual
 *      would rise — the Lucas obstruction can force this on a hard step), the
 *      selection still proceeds (the engine must advance) but the regression
 *      is RECORDED in the decision log with the magnitude and the cause
 *      ("all candidates exceed current residual"). Silent regression is the
 *      one un-catchable sin; logged regression is honest. [EXACT bookkeeping]
 *
 *   4. STABILITY = INVARIANTS WITHIN THRESHOLD FOR K CONSECUTIVE STEPS. A
 *      state's stability is not a single-step property; it is a run-length of
 *      consecutive steps whose closure residual stays within a tolerance band.
 *      `detectStability` measures that run-length from a residual history and
 *      reports whether it reaches K. The threshold and K are injected (they
 *      are a chosen operating point, POSTULATE), the run-length measurement is
 *      EXACT.
 *
 * Provenance: scoring, selection, and the regression log are EXACT (they are
 * arithmetic on File 6 residuals). The stability threshold/K operating point
 * is POSTULATE. The two are never blended — `StabilityReport` carries the
 * threshold's provenance.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   actualizer(15) → { closureResidual(06), selfMeasurement(12), burden(14),
 *                      scaleTable(04) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { closureResidual } from "../geometry/closureResidual.ts";
import type { TorusField, TorusParams } from "../geometry/closureResidual.ts";
import { classify, tainted, type Classified, type Provenance } from "../core/provenance.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Engine state — what the actualizer scores and selects among
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A candidate engine state at one scale: the field on the torus plus the torus
 * parameters it lives on, and an optional label for the audit log. This is the
 * minimal unit the actualizer needs to score closure.
 */
export interface EngineState {
  /** The field on the torus (File 6's TorusField). */
  readonly field: TorusField;
  /** The torus the field lives on. */
  readonly torus: TorusParams;
  /** Optional human-readable label for the decision log. */
  readonly label?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The state's score: its closure residual. Lower = more closed = better.
 * Delegates to File 6 (the residual is POSTULATE-tagged there, since reading
 * the divergence as physical friction is the RHUFT postulate); we return the
 * raw magnitude as the comparable score. This is the ONLY selection signal —
 * no blended multi-objective (ground-truth fact 1).
 */
export function scoreState(state: EngineState): Classified<number> {
  const { value, provenance, note } = closureResidual(state.field, state.torus);
  return classify(
    value,
    provenance,
    undefined,
    `scoreState = closure residual (${note}); lower = better; the sole selection signal`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection
// ─────────────────────────────────────────────────────────────────────────────

/** One entry in the decision log. */
export interface DecisionRecord {
  /** Index of the chosen candidate. */
  readonly chosenIndex: number;
  /** Score (residual) of the chosen candidate. */
  readonly chosenScore: number;
  /** Scores of all candidates, in order. */
  readonly allScores: readonly number[];
  /** The current-state score the candidates were compared against, if given. */
  readonly currentScore: number | null;
  /**
   * Non-null when the selection INCREASED total residual: the logged reason
   * (ground-truth fact 3 — regression is permitted only with a logged cause).
   */
  readonly regression: string | null;
}

/**
 * Select the next engine state: the candidate with the LOWEST closure
 * residual. Deterministic: ties broken by lowest index, no RNG anywhere.
 *
 * If `current` is provided, the chosen candidate's score is compared to the
 * current score; a regression (chosen worse than current) is logged with its
 * magnitude and cause rather than hidden (fact 3).
 *
 * @param candidates  the candidate next states (≥ 1)
 * @param current     the current state, for regression logging (optional)
 * @returns the chosen state plus the decision record (audit trail)
 */
export function selectNextState(
  candidates: readonly EngineState[],
  current?: EngineState,
): { state: EngineState; decision: DecisionRecord } {
  if (candidates.length === 0) {
    throw new RangeError("selectNextState: need at least one candidate state.");
  }
  const scores = candidates.map((c) => scoreState(c).value);
  let chosen = 0;
  for (let i = 1; i < scores.length; i++) {
    // Strict < keeps the FIRST (lowest-index) candidate on a tie — deterministic.
    if (scores[i]! < scores[chosen]!) chosen = i;
  }
  const chosenScore = scores[chosen]!;
  const currentScore = current !== undefined ? scoreState(current).value : null;

  let regression: string | null = null;
  if (currentScore !== null && chosenScore > currentScore) {
    const rise = chosenScore - currentScore;
    regression =
      `selected residual ${chosenScore.toExponential(3)} EXCEEDS current ` +
      `${currentScore.toExponential(3)} by ${rise.toExponential(3)}: all ` +
      `${candidates.length} candidate(s) were worse than the current state ` +
      `(Lucas obstruction forced a residual increase this step); advancing ` +
      `anyway and logging per the no-silent-regression rule`;
  }
  const decision: DecisionRecord = Object.freeze({
    chosenIndex: chosen,
    chosenScore,
    allScores: Object.freeze([...scores]),
    currentScore,
    regression,
  });
  return { state: candidates[chosen]!, decision };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stability detection
// ─────────────────────────────────────────────────────────────────────────────

/** The result of a stability probe. */
export interface StabilityReport {
  /** Whether the state is stable (residual within tol for K consecutive steps). */
  readonly stable: boolean;
  /** The measured run-length of consecutive within-tolerance steps (from the end). */
  readonly consecutiveWithinTol: number;
  /** The required run-length K. */
  readonly requiredK: number;
  /** The tolerance band used. */
  readonly tolerance: number;
  /** The most recent residual. */
  readonly lastResidual: number;
  /** Provenance of the threshold/K operating point (POSTULATE). */
  readonly provenance: Provenance;
}

/**
 * Detect stability: has the residual stayed within `tolerance` of a reference
 * (its own recent mean) for at least `K` consecutive steps?
 *
 * The run-length is measured from the END of the history backward: how many
 * consecutive trailing steps are within `tolerance` of the trailing mean.
 * Stable ⇔ that run-length ≥ K. The measurement is EXACT; `tolerance` and `K`
 * are the injected operating point (POSTULATE).
 *
 * @param residuals  the residual history (chronological, ≥ K entries)
 * @param K          the required consecutive-stable count (≥ 1)
 * @param tolerance  the residual tolerance band (> 0)
 */
export function detectStability(
  residuals: readonly number[],
  K: number,
  tolerance: number,
): Classified<StabilityReport> {
  if (!Number.isInteger(K) || K < 1) {
    throw new RangeError(`detectStability: K must be an integer ≥ 1; got ${K}.`);
  }
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new RangeError(`detectStability: tolerance must be positive; got ${tolerance}.`);
  }
  if (residuals.length < K) {
    throw new RangeError(
      `detectStability: need ≥ K=${K} residual samples, got ${residuals.length}.`,
    );
  }
  for (let i = 0; i < residuals.length; i++) {
    if (!Number.isFinite(residuals[i]!)) {
      throw new RangeError(`detectStability: residual[${i}] non-finite (${residuals[i]}).`);
    }
  }
  // Trailing mean as the reference level.
  const tail = residuals.slice(-K);
  const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
  // Count consecutive trailing steps within tolerance of that mean.
  let run = 0;
  for (let i = residuals.length - 1; i >= 0; i--) {
    if (Math.abs(residuals[i]! - mean) <= tolerance) run++;
    else break;
  }
  const report: StabilityReport = {
    stable: run >= K,
    consecutiveWithinTol: run,
    requiredK: K,
    tolerance,
    lastResidual: residuals[residuals.length - 1]!,
    provenance: tainted("POSTULATE"),
  };
  return classify(
    report,
    tainted("EXACT", "POSTULATE"),
    undefined,
    "stability run-length measured EXACTLY from the residual history; the " +
      "tolerance band and K are an injected operating point (POSTULATE)",
  );
}
