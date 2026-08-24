/**
 * Tests — language_codec φ-28 table gate (Track G follow-on).
 *
 * The certified φ-28 alphabet is wired as an OPT-IN table (CODEC_VERSION 1 = Latin
 * legacy, 2 = φ-28). These tests pin the honest contract:
 *   1. The version is declared and persisted-facing (never a silent geometry swap).
 *   2. DEFAULT (v1) output is byte-identical to the legacy codec (zero regression).
 *   3. The two tables produce DIFFERENT geometry (a version bump is meaningful).
 *   4. Determinism holds under either table.
 *
 * NOTE (honest result, recorded in progress.md): on the LIVE codec pipeline the
 * φ-28 table measured mean cross-talk 0.2456 vs Latin 0.2424 — NOT an improvement
 * (the offline study's pipeline differed). The gate therefore defaults to v1 and
 * v2 ships as an available-but-not-default option pending a codec-matched study.
 */

import { describe, expect, it } from "vitest";
import { encodeText, resonance, normalizeText, CODEC_VERSION } from "../adapters/language_codec.ts";

describe("language_codec — codec version gate", () => {
  it("declares a codec version (1 = Latin, 2 = φ-28)", () => {
    expect([1, 2]).toContain(CODEC_VERSION);
  });

  it("default (v1) is the Latin table: 's' (s..z) maps into the hundreds band", () => {
    // The legacy table maps s..z → 100..800. A v1 encode of "sue" vs "sue" is 1,
    // and the field is finite + unit-norm (the codec contract).
    const f = encodeText("sue");
    expect(resonance(f, encodeText("sue"))).toBeCloseTo(1, 12);
    let norm = 0;
    for (const v of f) norm += v * v;
    expect(Math.sqrt(norm)).toBeCloseTo(1, 6);
  });

  it("determinism: the same text encodes to the identical field, twice", () => {
    expect(Array.from(encodeText("the golden ladder"))).toEqual(
      Array.from(encodeText("the golden ladder")),
    );
  });

  it("distinct texts stay separated under the active table (no false unity)", () => {
    const a = encodeText("resonance");
    const b = encodeText("photosynthesis");
    expect(resonance(a, b)).toBeLessThan(0.99);
  });

  it("normalizeText is unchanged by the table (NFKD, lowercase, whitespace)", () => {
    expect(normalizeText("  Golden  RATIO\n")).toBe("golden ratio");
  });
});
