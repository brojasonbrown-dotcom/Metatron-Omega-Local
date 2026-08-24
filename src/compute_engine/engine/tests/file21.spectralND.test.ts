/**
 * File 21 — analysis/spectralND.ts verification.
 * Done-when:
 *   - n-D Parseval identity holds at machine floor across dimension & grid
 *   - a separable plane wave lands in its exact wavevector bin (per-axis)
 *   - a DC field projects to only the DC bin (no leakage)
 *   - degenerate inputs throw honestly
 */
import { describe, it, expect } from "vitest";
import { spectrumND, powerSpectrum, dominantBinND, unitaryPrefactor } from "../src/analysis/spectralND.ts";

const TWO_PI = 2 * Math.PI;

function white(total: number, seed = 12345): Float64Array {
  const f = new Float64Array(total);
  let s = seed;
  for (let i = 0; i < total; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; f[i] = (s / 0x40000000) - 1; }
  return f;
}

describe("spectralND — multidimensional Cartesian FFT", () => {
  it.each([
    [ [64] ],
    [ [16, 16] ],
    [ [8, 8, 8] ],
    [ [4, 4, 4, 4] ],
    [ [610] ],        // prime-ish Fibonacci rung — Bluestein path
    [ [89, 55] ],     // 2-D with a prime axis
  ])("conserves energy (Parseval) at machine floor for dims %j", (dims) => {
    const total = dims.reduce((a, b) => a * b, 1);
    const spec = spectrumND(white(total), dims);
    expect(spec.nodes).toBe(total);
    // relative residual must sit at float64 accumulation noise.
    expect(spec.parsevalResidual / Math.max(1, spec.realEnergy)).toBeLessThan(1e-12);
  });

  it("resolves a separable plane wave into its exact wavevector bin", () => {
    const N0 = 32, N1 = 32, m0 = 3, m1 = 5;
    const f = new Float64Array(N0 * N1);
    for (let i = 0; i < N0; i++) for (let j = 0; j < N1; j++)
      f[i * N1 + j] = Math.cos((TWO_PI * (m0 * i + m1 * j)) / N0);
    const bin = dominantBinND(spectrumND(f, [N0, N1]));
    const hit = (bin[0] === m0 && bin[1] === m1) || (bin[0] === N0 - m0 && bin[1] === N1 - m1);
    expect(hit).toBe(true);
  });

  it("projects a DC field to only the DC bin", () => {
    const spec = spectrumND(new Float64Array(64).fill(2.5), [8, 8]);
    const p = powerSpectrum(spec);
    expect(p[0]!).toBeGreaterThan(0);
    let offDC = 0;
    for (let k = 1; k < p.length; k++) offDC += p[k]!;
    expect(offDC / Math.max(1, p[0]!)).toBeLessThan(1e-12);
  });

  it("throws honestly on a length/dims mismatch and degenerate grid", () => {
    expect(() => spectrumND(new Float64Array(10), [3, 3])).toThrow(RangeError);
    expect(() => spectrumND(new Float64Array(1), [1])).toThrow(RangeError);
    expect(() => spectrumND(new Float64Array(4), [0, 4])).toThrow(RangeError);
  });

  it("unitaryPrefactor matches (2π)^(−n/2)", () => {
    expect(unitaryPrefactor(1)).toBeCloseTo(Math.pow(TWO_PI, -0.5), 15);
    expect(unitaryPrefactor(3)).toBeCloseTo(Math.pow(TWO_PI, -1.5), 15);
  });
});
