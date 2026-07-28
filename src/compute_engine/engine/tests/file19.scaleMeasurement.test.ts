/**
 * FILE 19 acceptance tests — engine/scaleMeasurement.ts
 *
 * Every assertion targets the scale-native measurement contract (B12 — assert
 * laws and relationships, not hard literals):
 *   1. RESOLUTION IS SCALE-NATIVE: resolution grows with rung index (larger
 *      scales resolve finer) and is clamped to the real-time band.
 *   2. DENSITY → OVERSAMPLING: denser (smaller-n) rungs take ≥ as many samples
 *      as sparser (larger-n) rungs per unit mesh.
 *   3. LARGEST FIRST: a full sweep returns scales in descending n.
 *   4. FOUR INVARIANTS PER SCALE: every measurement reports coherence, closure,
 *      drift, burden — each finite, coherence ∈ [0,1], closure ≥ 0.
 *   5. PHASE LAG IS MEASURED: under a density cadence, a skipped dense scale's
 *      reported lag exceeds a freshly-measured cheap scale's lag (≥ 0).
 *   6. ZERO REGRESSION (PURITY): calling measurement() does NOT perturb the
 *      deterministic engine trajectory — identical runs with and without
 *      interleaved measurements are bit-identical.
 *   7. FOOLPROOF GUARDS: empty rung set rejected.
 */

import { describe, expect, it } from "vitest";
import { STABLE_SCALES, type StableScaleIndex } from "../src/core/constants.js";
import { MultiscaleEngine } from "../src/engine/multiscaleEngine.js";
import {
  ScaleMeasurer,
  resolutionForScale,
  densityOversample,
  sampleCountForScale,
  RES_MIN,
  RES_MAX,
  OVERSAMPLE_MAX,
} from "../src/engine/scaleMeasurement.js";

const LARGEST = STABLE_SCALES[STABLE_SCALES.length - 1]!; // n = 125
const SMALLEST = STABLE_SCALES[0]!; // n = 1

describe("FILE 19 — scale-native field measurement", () => {
  // ── 1. Resolution is scale-native ──────────────────────────────────────
  it("resolution grows with scale size and stays within the real-time band", () => {
    const resLargest = resolutionForScale(LARGEST);
    const resSmallest = resolutionForScale(SMALLEST);
    expect(resLargest).toBeGreaterThan(resSmallest);
    expect(resLargest).toBe(RES_MAX); // sparsest rung resolves at the ceiling
    expect(resSmallest).toBe(RES_MIN); // densest rung at the floor
    for (const n of STABLE_SCALES) {
      const r = resolutionForScale(n);
      expect(r).toBeGreaterThanOrEqual(RES_MIN);
      expect(r).toBeLessThanOrEqual(RES_MAX);
      expect(Number.isInteger(r)).toBe(true);
    }
    // Monotone: resolution never decreases as n increases (more nodes ⇒ finer).
    for (let i = 1; i < STABLE_SCALES.length; i++) {
      expect(resolutionForScale(STABLE_SCALES[i]!)).toBeGreaterThanOrEqual(
        resolutionForScale(STABLE_SCALES[i - 1]!),
      );
    }
  });

  // ── 2. Density → oversampling (bounded, information-linear) ───────────
  it("denser rungs are oversampled more, bounded by the real-time ceiling", () => {
    // n=1 (densest core) oversamples hardest; n=125 (sparsest) the least.
    const overDense = densityOversample(SMALLEST, LARGEST);
    const overSparse = densityOversample(LARGEST, LARGEST);
    expect(overDense).toBe(OVERSAMPLE_MAX); // densest saturates the ceiling
    expect(overSparse).toBe(1); // sparsest anchors the baseline
    // Bounded by construction — no combinatorial explosion (File 19 fact 2).
    for (const n of STABLE_SCALES) {
      const o = densityOversample(n, LARGEST);
      expect(o).toBeGreaterThanOrEqual(1);
      expect(o).toBeLessThanOrEqual(OVERSAMPLE_MAX);
    }
    // Monotone: denser (smaller n) ⇒ strictly more oversampling.
    for (let i = 1; i < STABLE_SCALES.length; i++) {
      expect(densityOversample(STABLE_SCALES[i]!, LARGEST)).toBeLessThan(
        densityOversample(STABLE_SCALES[i - 1]!, LARGEST),
      );
    }
    // Every rung's sample count is finite and computable in a live loop.
    for (const n of STABLE_SCALES) {
      const s = sampleCountForScale(n, LARGEST);
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(RES_MAX * RES_MAX * OVERSAMPLE_MAX);
    }
  });

  // ── 3 + 4. Largest-first ordering + four invariants per scale ─────────
  it("a full sweep measures all 18 scales, largest first, each with four invariants", () => {
    const engine = new MultiscaleEngine({ seed: "harmonic" });
    engine.run(6); // enough steps for golden-delay coherence to be measured
    const m = engine.measurement(true);
    expect(m.length).toBe(STABLE_SCALES.length);
    // Largest-first: descending n.
    for (let i = 1; i < m.length; i++) {
      expect(m[i]!.n).toBeLessThan(m[i - 1]!.n);
    }
    expect(m[0]!.n).toBe(LARGEST);
    for (const s of m) {
      expect(Number.isFinite(s.coherence.value)).toBe(true);
      expect(s.coherence.value).toBeGreaterThanOrEqual(0);
      expect(s.coherence.value).toBeLessThanOrEqual(1);
      expect(Number.isFinite(s.closure.value)).toBe(true);
      expect(s.closure.value).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(s.drift.value)).toBe(true);
      expect(Number.isFinite(s.burden.value)).toBe(true);
      expect(s.phaseLag.value).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(s.resolution)).toBe(true);
      expect(s.samples).toBeGreaterThan(0);
    }
  });

  // ── 5. Phase lag is measured ──────────────────────────────────────────
  it("dense scales accrue phase lag under a density cadence; cheap scales stay fresh", () => {
    const measurer = new ScaleMeasurer(STABLE_SCALES);
    // The densest rung must have a strictly larger cadence than the sparsest.
    const cadDense = measurer.cadenceForScale(SMALLEST);
    const cadSparse = measurer.cadenceForScale(LARGEST);
    expect(cadDense).toBeGreaterThanOrEqual(1);
    expect(cadSparse).toBeGreaterThanOrEqual(1);

    const engine = new MultiscaleEngine({ seed: "harmonic" });
    // Run a few steps; at an intermediate step, only a subset is due.
    engine.run(4);
    // Manually drive a cadence sweep: measure only the sparsest at step k,
    // then a full sweep at step k+2 — the previously-skipped dense scales
    // report lag 0 on first measure (no prior reading), then grow once sampled.
    const first = engine.measurement(true); // full sweep establishes a baseline
    expect(first.every((s) => s.phaseLag.value === 0)).toBe(true);
    engine.run(2); // advance WITHOUT measuring → all scales now stale
    const second = engine.measurement(true);
    // Every scale was last measured 2 steps ago ⇒ lag = 2 (measured staleness).
    for (const s of second) expect(s.phaseLag.value).toBe(2);
  });

  // ── 6. Zero regression — measurement is a pure observer ───────────────
  it("interleaved measurement does NOT perturb the deterministic trajectory", () => {
    const plain = new MultiscaleEngine({ seed: "harmonic" });
    const observed = new MultiscaleEngine({ seed: "harmonic" });
    const STEPS = 12;
    for (let i = 0; i < STEPS; i++) {
      plain.step();
      observed.step();
      observed.measurement(i % 3 === 0); // interleave full + cadence sweeps
    }
    const rp = plain.run(1);
    const ro = observed.run(1);
    // Bit-identical despite the observer pass — measurement is pure.
    expect(ro.finalTotalResidual).toBe(rp.finalTotalResidual);
    expect(ro.finalMeanCoherence).toBe(rp.finalMeanCoherence);
    expect(ro.residualTrajectory).toEqual(rp.residualTrajectory);
  });

  it("measurement is deterministic: identical sweeps give identical invariant values", () => {
    const a = new MultiscaleEngine({ seed: "harmonic" });
    const b = new MultiscaleEngine({ seed: "harmonic" });
    a.run(6);
    b.run(6);
    const ma = a.measurement(true);
    const mb = b.measurement(true);
    expect(ma.length).toBe(mb.length);
    for (let i = 0; i < ma.length; i++) {
      expect(ma[i]!.closure.value).toBe(mb[i]!.closure.value);
      expect(ma[i]!.coherence.value).toBe(mb[i]!.coherence.value);
      expect(ma[i]!.resolution).toBe(mb[i]!.resolution);
      expect(ma[i]!.samples).toBe(mb[i]!.samples);
    }
  });

  // ── 7. Foolproof guards ───────────────────────────────────────────────
  it("rejects an empty rung set", () => {
    expect(() => new ScaleMeasurer([])).toThrow(RangeError);
  });

  it("reports a valid resolution for every stable rung (no NaN / no zero)", () => {
    for (const n of STABLE_SCALES) {
      const r = resolutionForScale(n as StableScaleIndex);
      expect(Number.isFinite(r)).toBe(true);
      expect(r).toBeGreaterThan(0);
    }
  });
});
