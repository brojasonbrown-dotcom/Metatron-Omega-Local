/**
 * Tests — Upgrade 5: the Genome's Spectral Signature ("the DNA scan").
 *
 * Plan guarantees under test:
 *   1. CERTIFIED TRANSFORM — every component's 2-D spectrumND(node, time) conserves
 *      energy to machine floor; the scan's maxParsevalResidual sits below the gate.
 *   2. STANDING-WAVE DETECTION — a lattice history built as a known spatio-temporal
 *      sinusoid cos(2π m_s n/N) · cos(2π m_t t/T) on ONE component is read back as
 *      exactly that mode (component, spatial bin, temporal bin).
 *   3. STATIC FIELD — a lattice that never changes reads as "no thought": all power
 *      in DC, zero tempo, zero diversity, no live standing waves.
 *   4. TEMPO ORDERING — fast oscillation scores a higher spectral centroid than slow
 *      drift on otherwise-identical structure.
 *   5. DRIFT / IDENTITY — identical histories give fingerprint similarity ≈ 1;
 *      different dynamics give a strictly smaller similarity.
 *   6. WINDOW DISCIPLINE — the scan is null until enough history has accumulated
 *      (a 2-tick "spectrum" is numerology), and observe never aliases the caller's
 *      lattice buffer.
 */

import { describe, expect, it } from "vitest";
import {
  GenomeSpectralSignature,
  signatureSimilarity,
  MIN_WINDOW_TICKS,
  SPECTRAL_WINDOW_TICKS,
} from "../cognition/genome_spectral_signature.ts";
import { FIELD_COMPONENTS } from "../cognition/field_genome.ts";

/**
 * Build one tick's flattened [nodeCount][28] lattice where `component` carries
 * cos(2π spatialBin·n/N) · cos(2π temporalBin·t/T) and every other component is 0.
 */
function waveLattice(
  nodeCount: number,
  tick: number,
  windowTicks: number,
  component: number,
  spatialBin: number,
  temporalBin: number
): Float64Array {
  const lattice = new Float64Array(nodeCount * FIELD_COMPONENTS);
  for (let n = 0; n < nodeCount; n++) {
    const s = Math.cos((2 * Math.PI * spatialBin * n) / nodeCount);
    const tt = Math.cos((2 * Math.PI * temporalBin * tick) / windowTicks);
    lattice[n * FIELD_COMPONENTS + component] = s * tt;
  }
  return lattice;
}

/** A lattice that is identical every tick (a static, unchanging field). */
function staticLattice(nodeCount: number, seed = 1): Float64Array {
  const lattice = new Float64Array(nodeCount * FIELD_COMPONENTS);
  for (let i = 0; i < lattice.length; i++) {
    lattice[i] = Math.sin(seed * 1.3 + i * 0.7);
  }
  return lattice;
}

function feedHistory(
  scan: GenomeSpectralSignature,
  makeTick: (t: number) => Float64Array,
  nodeCount: number,
  ticks: number
): void {
  for (let t = 0; t < ticks; t++) scan.observe(makeTick(t), nodeCount);
}

describe("GenomeSpectralSignature — window discipline", () => {
  it("is null until MIN_WINDOW_TICKS of history accumulate", () => {
    const scan = new GenomeSpectralSignature();
    const N = 8;
    const lat = staticLattice(N);
    for (let t = 0; t < MIN_WINDOW_TICKS - 1; t++) scan.observe(lat, N);
    expect(scan.signature()).toBeNull();
    scan.observe(lat, N);
    expect(scan.signature()).not.toBeNull();
  });

  it("rejects a degenerate window and a malformed lattice", () => {
    expect(() => new GenomeSpectralSignature(2)).toThrow(RangeError);
    const scan = new GenomeSpectralSignature();
    expect(() => scan.observe(new Float64Array(5), 4)).toThrow(RangeError);
  });

  it("ignores a single-node lattice (no spatial spectrum to read)", () => {
    const scan = new GenomeSpectralSignature();
    for (let t = 0; t < MIN_WINDOW_TICKS; t++) {
      scan.observe(new Float64Array(FIELD_COMPONENTS), 1);
    }
    expect(scan.signature()).toBeNull();
  });

  it("never aliases the caller's lattice buffer", () => {
    const scan = new GenomeSpectralSignature();
    const N = 8;
    const lat = staticLattice(N);
    for (let t = 0; t < MIN_WINDOW_TICKS; t++) scan.observe(lat, N);
    const before = scan.signature()!;
    // Mutate the source buffer; the recorded window must be unaffected.
    lat.fill(999);
    const after = scan.signature()!;
    expect(after.maxParsevalResidual).toBe(before.maxParsevalResidual);
  });
});

describe("GenomeSpectralSignature — certified transform", () => {
  it("conserves energy to machine floor across all 28 components", () => {
    const scan = new GenomeSpectralSignature();
    const N = 12;
    const T = 32;
    feedHistory(scan, (t) => waveLattice(N, t, T, 3, 2, 5), N, T);
    const sig = scan.signature()!;
    expect(sig.certified).toBe(true);
    expect(sig.maxParsevalResidual).toBeLessThan(1e-6);
    expect(sig.components).toBe(FIELD_COMPONENTS);
    expect(sig.nodeCount).toBe(N);
  });
});

describe("GenomeSpectralSignature — standing-wave detection", () => {
  it("reads back a known spatio-temporal mode exactly", () => {
    const scan = new GenomeSpectralSignature();
    const N = 16;
    const T = 48;
    const COMPONENT = 7;
    const S_BIN = 3;
    const T_BIN = 6;
    feedHistory(scan, (t) => waveLattice(N, t, T, COMPONENT, S_BIN, T_BIN), N, T);
    const sig = scan.signature()!;
    expect(sig.standingWaves.length).toBeGreaterThan(0);
    // The dominant live mode must be the injected wave (or its conjugate mirror
    // bin T - t, which carries identical power for a real cosine).
    const top = sig.standingWaves[0]!;
    expect(top.component).toBe(COMPONENT);
    expect(top.spatialBin === S_BIN || top.spatialBin === N - S_BIN).toBe(true);
    expect(top.temporalBin === T_BIN || top.temporalBin === T - T_BIN).toBe(true);
    // A real cosine splits power equally between bin m and its conjugate mirror
    // T-m; whichever the sort surfaces first, its frequency is m/T or (T-m)/T.
    const f = top.frequency;
    expect(
      Math.abs(f - T_BIN / T) < 1e-9 || Math.abs(f - (T - T_BIN) / T) < 1e-9
    ).toBe(true);
    expect(top.fraction).toBeGreaterThan(0.2); // one clean mode dominates
  });

  it("a static field reads as no thought: zero tempo, zero diversity, no live waves", () => {
    const scan = new GenomeSpectralSignature();
    const N = 8;
    const T = 24;
    const lat = staticLattice(N);
    feedHistory(scan, () => lat, N, T);
    const sig = scan.signature()!;
    expect(sig.certified).toBe(true);
    expect(sig.spectralCentroid).toBe(0);
    expect(sig.spectralEntropy).toBe(0);
    expect(sig.standingWaves.length).toBe(0);
  });

  it("tempo orders correctly: fast oscillation beats slow drift", () => {
    const N = 8;
    const T = 48;
    const slow = new GenomeSpectralSignature();
    const fast = new GenomeSpectralSignature();
    feedHistory(slow, (t) => waveLattice(N, t, T, 0, 1, 2), N, T); // temporal bin 2
    feedHistory(fast, (t) => waveLattice(N, t, T, 0, 1, 20), N, T); // temporal bin 20
    const sSlow = slow.signature()!;
    const sFast = fast.signature()!;
    expect(sFast.spectralCentroid).toBeGreaterThan(sSlow.spectralCentroid);
    expect(sSlow.spectralCentroid).toBeGreaterThan(0);
  });
});

describe("GenomeSpectralSignature — drift & identity", () => {
  it("identical histories give fingerprint similarity ≈ 1", () => {
    const N = 8;
    const T = 32;
    const a = new GenomeSpectralSignature();
    const b = new GenomeSpectralSignature();
    feedHistory(a, (t) => waveLattice(N, t, T, 2, 2, 4), N, T);
    feedHistory(b, (t) => waveLattice(N, t, T, 2, 2, 4), N, T);
    const sim = signatureSimilarity(a.signature()!.fingerprint, b.signature()!.fingerprint);
    expect(sim).toBeGreaterThan(0.999);
  });

  it("different dynamics give strictly smaller similarity than self-similarity", () => {
    const N = 8;
    const T = 32;
    const a = new GenomeSpectralSignature();
    const b = new GenomeSpectralSignature();
    const c = new GenomeSpectralSignature();
    feedHistory(a, (t) => waveLattice(N, t, T, 2, 2, 4), N, T);
    feedHistory(b, (t) => waveLattice(N, t, T, 2, 2, 4), N, T); // same as a
    feedHistory(c, (t) => waveLattice(N, t, T, 5, 6, 18), N, T); // different mode
    const fa = a.signature()!.fingerprint;
    const fb = b.signature()!.fingerprint;
    const fc = c.signature()!.fingerprint;
    const same = signatureSimilarity(fa, fb);
    const diff = signatureSimilarity(fa, fc);
    expect(diff).toBeLessThan(same);
  });

  it("driftFrom measures epoch-over-epoch change", () => {
    const scan = new GenomeSpectralSignature();
    const N = 8;
    const T = 32;
    feedHistory(scan, (t) => waveLattice(N, t, T, 1, 1, 3), N, T);
    const first = scan.signature()!.fingerprint;
    const same = scan.driftFrom(first, scan.signature()!.fingerprint);
    expect(same).toBeCloseTo(1, 6);
    // A different history's fingerprint drifts from the first.
    const other = new Float64Array(first.length);
    for (let i = 0; i < other.length; i++) other[i] = Math.log1p(i * 7.3);
    const diff = scan.driftFrom(first, other);
    expect(diff).toBeLessThan(same);
  });
});
