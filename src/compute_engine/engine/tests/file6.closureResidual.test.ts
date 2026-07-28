/**
 * Sprint 1 · File 6 — geometry/closureResidual.ts verification.
 * Exit gate (spec §127): known-field residuals match to 1e-6; the
 * Lucas-obstruction case (never exactly 0) is reproduced; score ∈ [0,1];
 * quadrature Richardson-converges; the Metatron-shell floor is φ⁻²⁶.
 */
import { describe, it, expect } from "vitest";
import {
  closureResidual,
  closureScore,
  isMinimallyOpen,
  minimallyOpenFloor,
} from "../src/geometry/closureResidual.js";
import { torusForScale } from "../src/geometry/torus.js";
import {
  STABLE_SCALES,
  METATRON_SHELL,
  PHI_NEG26,
  PI,
  PHI,
} from "../src/core/constants.js";

const TWO_PI = 2 * PI;
const tori = STABLE_SCALES.map((n) => torusForScale(n));
const t1 = torusForScale(1);

describe("File 6 · smooth periodic field closes to machine-eps", () => {
  it("a single toroidal mode has ~zero residual (frictionless ideal)", () => {
    const mode = ({ u, v }: { u: number; v: number }) =>
      Math.sin(3 * u) * Math.cos(2 * v);
    const r = closureResidual(mode, t1);
    expect(r.value).toBeLessThan(1e-6);
  });

  it("a superposition of harmonics closes on every stable torus", () => {
    const field = ({ u, v }: { u: number; v: number }) =>
      Math.sin(u) + 0.5 * Math.cos(2 * u) * Math.sin(v) + 0.25 * Math.sin(5 * u - 3 * v);
    for (const t of tori) {
      // Residual is shape-only (r² cancels), so it is uniform across scales.
      expect(closureResidual(field, t).value).toBeLessThan(1e-6);
    }
  });

  it("constant field (zero mode) closes exactly", () => {
    expect(closureResidual(() => 7.3, t1).value).toBeLessThan(1e-9);
  });
});

describe("File 6 · broken periodicity is caught", () => {
  it("a non-periodic field has a finite residual", () => {
    const open = ({ u, v }: { u: number; v: number }) => Math.sin(0.5 * u) + v;
    const r = closureResidual(open, t1);
    expect(r.value).toBeGreaterThan(1e-3);
  });

  it("a phase-slip (holonomy analogue) is detected via the seam channel", () => {
    // Field goes out as cos(u) but comes back shifted — Berry-phase-like slip.
    const slip = ({ u }: { u: number; v: number }) => Math.cos(u + (u > PI ? 0.7 : 0));
    expect(closureResidual(slip, t1).value).toBeGreaterThan(1e-3);
  });

  it("closureScore ∈ [0,1]: ~1 for closed, ≪1 for open", () => {
    const closed = ({ u, v }: { u: number; v: number }) => Math.sin(u) * Math.cos(v);
    const open = ({ u, v }: { u: number; v: number }) => Math.sin(0.5 * u) + 2 * v;
    const sClosed = closureScore(closed, t1);
    const sOpen = closureScore(open, t1);
    expect(sClosed).toBeGreaterThan(0.999);
    expect(sClosed).toBeLessThanOrEqual(1);
    expect(sOpen).toBeGreaterThanOrEqual(0);
    expect(sOpen).toBeLessThan(0.5);
    expect(sClosed).toBeGreaterThan(sOpen);
  });
});

describe("File 6 · isMinimallyOpen predicate", () => {
  it("smooth periodic field is minimally open", () => {
    const mode = ({ u, v }: { u: number; v: number }) => Math.cos(4 * u) * Math.sin(v);
    expect(isMinimallyOpen(mode, t1)).toBe(true);
  });
  it("broken field is NOT minimally open", () => {
    const open = ({ u, v }: { u: number; v: number }) => v * v;
    expect(isMinimallyOpen(open, t1)).toBe(false);
  });
});

describe("File 6 · Lucas-obstruction floor", () => {
  it("Metatron-shell (n=13) floor equals φ⁻²⁶ exactly", () => {
    const t13 = torusForScale(METATRON_SHELL);
    const floor = minimallyOpenFloor(t13);
    expect(floor.provenance).toBe("POSTULATE");
    expect(Math.abs(floor.value.toFloat64() - PHI_NEG26) / PHI_NEG26).toBeLessThan(1e-9);
  });

  it("floor is positive and finite on every stable torus (never exactly 0)", () => {
    for (const t of tori) {
      const f = minimallyOpenFloor(t).value.toFloat64();
      expect(f).toBeGreaterThan(0);
      expect(Number.isFinite(f)).toBe(true);
    }
  });

  it("floor decreases monotonically with n (φ⁻²ⁿ scaling)", () => {
    const floors = tori.map((t) => minimallyOpenFloor(t).value.toFloat64());
    for (let i = 1; i < floors.length; i++) {
      expect(floors[i]!).toBeLessThan(floors[i - 1]!);
    }
  });
});

describe("File 6 · Richardson convergence guard", () => {
  it("converged for a well-resolved band-limited field (no throw)", () => {
    const mode = ({ u, v }: { u: number; v: number }) => Math.sin(2 * u) * Math.cos(v);
    expect(() => closureResidual(mode, t1)).not.toThrow();
  });

  it("provenance is POSTULATE (taint propagates, never silent)", () => {
    const mode = ({ u, v }: { u: number; v: number }) => Math.sin(u);
    expect(closureResidual(mode, t1).provenance).toBe("POSTULATE");
  });

  it("rejects a degenerate grid", () => {
    const mode = ({ u }: { u: number; v: number }) => Math.sin(u);
    expect(() => closureResidual(mode, t1, 4)).toThrow(RangeError);
  });
});

describe("File 6 · golden-flux anchor", () => {
  it("PHI_NEG26 equals independently-recomputed φ⁻²⁶ (Decimal ground truth)", () => {
    // φ⁻²⁶ = 3.6840146919005...e-6 (40-digit Decimal, pre-computed).
    const expected = 3.6840146919005873e-6;
    expect(Math.abs(PHI_NEG26 - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(Math.pow(PHI, -26) - expected) / expected).toBeLessThan(1e-12);
  });
});
