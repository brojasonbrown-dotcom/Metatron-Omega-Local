/**
 * File 23 — analysis/complexityProbe.ts verification.
 * Done-when:
 *   - a pure tone reads as MINIMAL complexity (PR ≈ 2, low entropy)
 *   - white noise reads as MAXIMAL complexity (high entropy, PR ~ N/2)
 *   - a flat field reads as ~zero complexity (size ≠ complexity)
 *   - ordering is monotone: H(flat) < H(tone) < H(white)
 *   - a zero field reports zero complexity honestly (no NaN)
 */
import { describe, it, expect } from "vitest";
import { probeCartesian, complexityFromPower } from "../src/analysis/complexityProbe.ts";

const N = 512;
function tone(): Float64Array { const f = new Float64Array(N); for (let i = 0; i < N; i++) f[i] = Math.cos((2 * Math.PI * 7 * i) / N); return f; }
function white(): Float64Array { const f = new Float64Array(N); let s = 999; for (let i = 0; i < N; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; f[i] = (s / 0x40000000) - 1; } return f; }
function flat(): Float64Array { return new Float64Array(N).fill(1); }

describe("complexityProbe — measured complexity of known fields", () => {
  const rt = probeCartesian(tone(), [N]);
  const rw = probeCartesian(white(), [N]);
  const rf = probeCartesian(flat(), [N]);

  it("orders entropy monotone: flat < tone < white", () => {
    expect(rf.entropy).toBeLessThan(rt.entropy);
    expect(rt.entropy).toBeLessThan(rw.entropy);
  });
  it("a pure tone occupies ~2 modes (±k), white noise occupies ~N/2", () => {
    expect(rt.participation).toBeLessThan(3);
    expect(rw.participation).toBeGreaterThan(N / 4);
  });
  it("a flat field is near-zero complexity despite N nodes", () => {
    expect(rf.entropy).toBeLessThan(1e-6);
    expect(rf.participation).toBeLessThanOrEqual(1.5);
  });
  it("spectral flatness separates tonal from white (Wiener entropy)", () => {
    expect(rt.flatness).toBeLessThan(0.05);
    expect(rw.flatness).toBeGreaterThan(0.3);
  });
  it("dominant mode of a tone sits at its spatial frequency", () => {
    expect(rt.dominantMode).toBe(7);
    expect(rt.dominantFraction).toBeGreaterThan(0.4);
  });
  it("a zero field reports zero complexity without NaN", () => {
    const z = complexityFromPower(new Float64Array(16));
    expect(z.entropy).toBe(0);
    expect(z.participation).toBe(0);
    expect(Number.isFinite(z.centroid)).toBe(true);
  });
  it("multidimensional: a 2-D plane wave is low-complexity, 2-D noise is high", () => {
    const low = probeCartesian(tone2(), [16, 32]);
    const hi = probeCartesian(white2(), [16, 32]);
    expect(low.participation).toBeLessThan(hi.participation);
  });
});

function tone2(): Float64Array { const f = new Float64Array(16 * 32); for (let i = 0; i < 16; i++) for (let j = 0; j < 32; j++) f[i * 32 + j] = Math.cos((2 * Math.PI * (3 * i + 5 * j)) / 16); return f; }
function white2(): Float64Array { const f = new Float64Array(16 * 32); let s = 55; for (let i = 0; i < f.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; f[i] = (s / 0x40000000) - 1; } return f; }
