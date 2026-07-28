/**
 * FILE 15 acceptance tests — information/actualizer.ts
 *
 * Every assertion targets a DERIVED LAW or an EXACT contract clause (B12):
 *   1. SCORE = CLOSURE RESIDUAL: a smooth periodic field scores far lower than
 *      a non-periodic one (the selection signal is real, not noise).
 *   2. SELECTION ≤ ALL CANDIDATES: the chosen state's residual is ≤ every
 *      candidate's (the contract's headline invariant).
 *   3. DETERMINISM: the same candidate set always selects the same index;
 *      ties break to the lowest index, reproducibly, no RNG.
 *   4. NO SILENT REGRESSION: when all candidates are worse than current, the
 *      selection still advances but LOGS the regression with its magnitude.
 *   5. MONOTONE RESIDUAL TO FIXED POINT (toy 2-scale problem): iterating
 *      select-best-of-{current, improved} drives the residual down
 *      monotonically toward the floor.
 *   6. STABILITY: K consecutive within-tolerance steps ⇒ stable; a broken run
 *      ⇒ not stable; run-length measured exactly.
 *   7. FOOLPROOF GUARDS: empty candidates, bad K/tolerance/history rejected.
 */

import { describe, expect, it } from "vitest";
import { STABLE_SCALES, type StableScaleIndex } from "../src/core/constants.js";
import { closureResidual } from "../src/geometry/closureResidual.js";
import { torusForScale } from "../src/geometry/torus.js";
import {
    detectStability,
    scoreState,
    selectNextState,
    type EngineState,
} from "../src/information/actualizer.js";

const N: StableScaleIndex = 13;
const TORUS = torusForScale(N);

/** A smooth periodic (closed) field — low residual. */
const closedField = ({ u, v }: { u: number; v: number }) =>
  Math.sin(3 * u) * Math.cos(2 * v) + 0.5 * Math.sin(u - v);

/** A non-periodic (open) field — high residual. */
const openField = ({ u, v }: { u: number; v: number }) => Math.sin(0.5 * u) + v;

/** A phase-slip field — high residual via the seam channel. */
const slipField = ({ u }: { u: number; v: number }) => Math.cos(u + (u > Math.PI ? 0.7 : 0));

function state(field: (p: { u: number; v: number }) => number, label?: string): EngineState {
  // exactOptionalPropertyTypes: only set `label` when it's actually present.
  return label === undefined ? { field, torus: TORUS } : { field, torus: TORUS, label };
}

describe("FILE 15 — the actualizer (decision core)", () => {
  // ── 1. Score = closure residual ────────────────────────────────────────
  it("scores a closed field far below an open field", () => {
    const closed = scoreState(state(closedField)).value;
    const open = scoreState(state(openField)).value;
    const slip = scoreState(state(slipField)).value;
    expect(closed).toBeLessThan(1e-6);
    expect(open).toBeGreaterThan(1e-3);
    expect(slip).toBeGreaterThan(1e-3);
    // The score IS File 6's residual (identity, not a transformed objective).
    expect(closed).toBe(closureResidual(closedField, TORUS).value);
  });

  // ── 2. Selection ≤ all candidates ──────────────────────────────────────
  it("selects the candidate with the minimum residual", () => {
    const candidates = [
      state(openField, "open"),
      state(slipField, "slip"),
      state(closedField, "closed"),
    ];
    const { state: chosen, decision } = selectNextState(candidates);
    expect(decision.chosenIndex).toBe(2); // the closed field
    expect(chosen.label).toBe("closed");
    // Chosen residual ≤ every candidate's residual.
    for (const c of candidates) {
      expect(decision.chosenScore).toBeLessThanOrEqual(scoreState(c).value);
    }
  });

  // ── 3. Determinism + tie-break ─────────────────────────────────────────
  it("is deterministic and breaks ties to the lowest index", () => {
    const a = state(closedField, "a");
    const b = state(closedField, "b"); // identical residual to a (same field)
    const candidates = [state(openField, "open"), a, b];
    const r1 = selectNextState(candidates).decision.chosenIndex;
    const r2 = selectNextState(candidates).decision.chosenIndex;
    expect(r1).toBe(r2); // reproducible
    expect(r1).toBe(1); // first of the two identical closed fields (lowest index)
  });

  // ── 4. No silent regression ────────────────────────────────────────────
  it("logs a regression (with magnitude) when all candidates are worse", () => {
    const current = state(closedField, "current-closed");
    const candidates = [state(openField, "open"), state(slipField, "slip")];
    const { decision } = selectNextState(candidates, current);
    // Forced to pick a worse state ⇒ regression must be logged, not silent.
    expect(decision.regression).not.toBeNull();
    expect(decision.regression).toMatch(/EXCEEDS current/);
    expect(decision.chosenScore).toBeGreaterThan(decision.currentScore!);
  });

  it("reports no regression when an improving candidate exists", () => {
    const current = state(openField, "current-open");
    const candidates = [state(closedField, "closed"), state(slipField, "slip")];
    const { decision } = selectNextState(candidates, current);
    expect(decision.regression).toBeNull();
    expect(decision.chosenScore).toBeLessThan(decision.currentScore!);
  });

  // ── 5. Monotone residual to fixed point (toy 2-scale problem) ──────────
  it("drives the residual monotonically down toward the floor on a toy descent", () => {
    // Toy model: a family of fields parameterized by a "openness" amplitude A
    // multiplying the non-periodic part. As A → 0 the field → closed. Each
    // step offers the actualizer {current, current-with-halved-A}; selecting
    // the best drives A (and hence the residual) monotonically down.
    const makeField = (A: number) => ({ u, v }: { u: number; v: number }) =>
      Math.sin(3 * u) * Math.cos(2 * v) + A * (Math.sin(0.5 * u) + v);
    let A = 1.0;
    let current = state(makeField(A));
    const residuals: number[] = [scoreState(current).value];
    for (let step = 0; step < 12; step++) {
      const improved = state(makeField(A / 2));
      const { state: next } = selectNextState([current, improved]);
      // The halved-A candidate is never worse ⇒ residual never increases.
      next === improved && (A = A / 2);
      current = next;
      residuals.push(scoreState(current).value);
    }
    // Monotone non-increasing.
    for (let i = 1; i < residuals.length; i++) {
      expect(residuals[i]!).toBeLessThanOrEqual(residuals[i - 1]! + 1e-12);
    }
    // Approaches the closure floor (small).
    expect(residuals[residuals.length - 1]!).toBeLessThan(residuals[0]!);
  });

  // ── 6. Stability detection ─────────────────────────────────────────────
  it("detects stability after K consecutive within-tolerance steps", () => {
    const settled = [0.05, 0.051, 0.049, 0.05, 0.0501, 0.0499];
    const { value: report } = detectStability(settled, 4, 0.01);
    expect(report.stable).toBe(true);
    expect(report.consecutiveWithinTol).toBeGreaterThanOrEqual(4);
    expect(report.requiredK).toBe(4);
  });

  it("reports not-stable when the run is broken", () => {
    const broken = [0.05, 0.05, 0.5, 0.05, 0.05, 0.05]; // spike in the middle
    // K=6 over the whole window: the spike breaks the run.
    const { value: report } = detectStability(broken, 6, 0.001);
    expect(report.stable).toBe(false);
    expect(report.consecutiveWithinTol).toBeLessThan(6);
  });

  it("measures the trailing run-length exactly", () => {
    // Last 3 within tol of the trailing mean, the 4th-from-last far off.
    const hist = [0.9, 0.05, 0.05, 0.05];
    const { value: report } = detectStability(hist, 3, 0.01);
    expect(report.consecutiveWithinTol).toBe(3);
    expect(report.stable).toBe(true);
  });

  // ── 7. Guards ──────────────────────────────────────────────────────────
  it("rejects empty candidates and malformed stability inputs", () => {
    expect(() => selectNextState([])).toThrow(RangeError);
    expect(() => detectStability([0.1, 0.1], 5, 0.01)).toThrow(RangeError); // too few
    expect(() => detectStability([0.1, 0.1], 0, 0.01)).toThrow(RangeError); // K<1
    expect(() => detectStability([0.1, 0.1], 2, 0)).toThrow(RangeError); // tol=0
    expect(() => detectStability([0.1, NaN], 2, 0.01)).toThrow(RangeError); // NaN
  });
});
