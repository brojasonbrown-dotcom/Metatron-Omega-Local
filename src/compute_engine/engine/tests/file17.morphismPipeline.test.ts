/**
 * FILE 17 acceptance tests — engine/morphismPipeline.ts
 *
 * Every assertion targets a DERIVED LAW or an EXACT contract clause (B12):
 *   1. PURITY: same config ⇒ identical observables (bit-for-bit) across calls.
 *   2. GOLDEN REPRODUCES REFERENCE: the φ lattice field is band-limited and
 *      periodic, so its closure residual sits at the machine floor (≈ 0).
 *   3. PAIR IDENTITY EXACT: φ⁻¹+φ⁻² = 1 (defect 0); every other ratio has a
 *      nonzero defect — the exact distance-from-golden predictor.
 *   4. ABLATION SENSITIVITY (headline): φ→(3/2) yields MEASURABLY worse
 *      closure (positive delta) — the ablation-ready principle made real.
 *   5. ABLATION GENERALITY: several non-golden ratios all close worse than φ.
 *   6. AMPLITUDE LAW: a_k = ratio⁻ᵏ, monotone decreasing, pair-sum exact.
 *   7. FOOLPROOF GUARDS: non-positive / non-finite ratios rejected.
 */

import { describe, expect, it } from "vitest";
import { PHI, HARMONIC_COUNT } from "../src/core/constants.js";
import {
    ablate,
    constantsToLattice,
    GOLDEN_RATIO,
    latticeToMeasured,
    runMorphism,
} from "../src/engine/morphismPipeline.js";

describe("FILE 17 — the L0→L1→L2 morphism + ablation harness", () => {
  // ── 1. Purity ──────────────────────────────────────────────────────────
  it("is pure: identical config gives identical observables", () => {
    const a = runMorphism();
    const b = runMorphism();
    expect(a.closureResidual.value).toBe(b.closureResidual.value);
    expect(a.pairDefect).toBe(b.pairDefect);
    expect(a.ratio).toBe(b.ratio);
  });

  // ── 2. Golden reproduces the reference (machine-floor closure) ─────────
  it("golden lattice closes at the machine floor (periodic band-limited field)", () => {
    const obs = runMorphism(); // golden by default
    expect(obs.ratio).toBe(PHI);
    expect(obs.closureResidual.value).toBeLessThan(1e-6);
  });

  // ── 3. Pair identity exact ─────────────────────────────────────────────
  it("φ⁻¹ + φ⁻² = 1 exactly (defect 0); unique to φ", () => {
    const golden = constantsToLattice();
    expect(golden.pairDefect).toBeLessThan(1e-15);
    expect(golden.pairSum).toBeCloseTo(1, 15);
    // Any other ratio has a nonzero defect.
    for (const r of [1.5, 2, 1.4, 2.5]) {
      const lat = constantsToLattice({ ratioChoice: { ratio: r, label: String(r) } });
      expect(lat.pairDefect).toBeGreaterThan(1e-3);
    }
  });

  // ── 4. Ablation sensitivity (the headline) ─────────────────────────────
  it("φ→(3/2) ablation yields measurably worse closure", () => {
    const report = ablate({ ratio: 1.5, label: "3/2" });
    // Golden closes at the floor; the ablated field does not.
    expect(report.golden.closureResidual.value).toBeLessThan(1e-6);
    expect(report.alternative.closureResidual.value).toBeGreaterThan(
      report.golden.closureResidual.value,
    );
    expect(report.closureDelta).toBeGreaterThan(1e-6);
    expect(report.goldenIsBetter).toBe(true);
    // The exact pair defect corroborates: 3/2 is far from golden.
    expect(report.pairDefect).toBeGreaterThan(1e-3);
  });

  // ── 5. Ablation generality ─────────────────────────────────────────────
  it("every non-golden ratio tested closes worse than φ", () => {
    for (const r of [1.5, 2.0, 1.4, 2.5, 1.7]) {
      const report = ablate({ ratio: r, label: String(r) });
      expect(report.goldenIsBetter).toBe(true);
      expect(report.closureDelta).toBeGreaterThan(0);
    }
  });

  // ── 6. Amplitude law ───────────────────────────────────────────────────
  it("amplitudes follow a_k = ratio⁻ᵏ, monotone decreasing", () => {
    const lat = constantsToLattice({ ratioChoice: GOLDEN_RATIO });
    expect(lat.amplitudes.length).toBe(HARMONIC_COUNT);
    expect(lat.amplitudes[0]).toBeCloseTo(1, 12); // φ⁰
    expect(lat.amplitudes[1]).toBeCloseTo(1 / PHI, 12); // φ⁻¹
    for (let k = 1; k < lat.amplitudes.length; k++) {
      expect(lat.amplitudes[k]!).toBeLessThan(lat.amplitudes[k - 1]!);
      expect(lat.amplitudes[k]!).toBeCloseTo(Math.pow(PHI, -k), 12);
    }
  });

  // ── 7. Guards ──────────────────────────────────────────────────────────
  it("rejects non-positive / non-finite ratios", () => {
    expect(() => constantsToLattice({ ratioChoice: { ratio: 0, label: "0" } })).toThrow(RangeError);
    expect(() => constantsToLattice({ ratioChoice: { ratio: -1, label: "-1" } })).toThrow(RangeError);
    expect(() => constantsToLattice({ ratioChoice: { ratio: NaN, label: "NaN" } })).toThrow(RangeError);
    expect(() => ablate({ ratio: 0, label: "0" })).toThrow(RangeError);
  });

  it("keeps golden wavenumbers integer (periodic) and ablates them non-integer", () => {
    const golden = constantsToLattice();
    for (const w of golden.wavenumbers) expect(Number.isInteger(w)).toBe(true);
    const ablated = constantsToLattice({ ratioChoice: { ratio: 1.5, label: "3/2" } });
    // At least one ablated wavenumber is non-integer ⇒ aperiodic ⇒ closure cost.
    expect(ablated.wavenumbers.some((w) => !Number.isInteger(w))).toBe(true);
  });
});
