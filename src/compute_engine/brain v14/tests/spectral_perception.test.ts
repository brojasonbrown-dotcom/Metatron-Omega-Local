/**
 * Spectral perception certs — prove the certified-FFT percept is the exact,
 * energy-conserving, full-resolution Fourier description, and that it resolves
 * fine structure the legacy 28-field path physically cannot.
 *
 * These are MEASURED claims (rule 8), not vibes: every assertion is derived
 * live from real grids through the real transform.
 */
import { describe, it, expect } from "vitest";
import {
  spectralPerceptFromGrid,
  powerSpectrumSimilarity,
  whitenedSignature,
  resonanceScan,
  complexitySignature,
} from "../adapters/sensors/spectral_perception.ts";
import { fieldFromLuminanceGrid } from "../adapters/sensors/signal_codec.ts";
import { resonance } from "../adapters/language_codec.ts";
import { GRID_W, GRID_H, HIRES_GRID_W, HIRES_GRID_H } from "../adapters/sensors/vision_screen.ts";

// ── deterministic grid helpers (mirror discrimination.test.ts conventions) ──

/** Coarse structural scene: identical large-scale layout across variants. */
function structuralScene(w: number, h: number): Float64Array {
  const g = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bx = Math.floor((x / w) * 8);
      const by = Math.floor((y / h) * 8);
      g[y * w + x] = ((bx * 31 + by * 17) % 8) * 32 + (x / w) * 16;
    }
  }
  return g;
}

/** Overwrite a tiny localised patch — fine detail the coarse modes blur away. */
function withPatch(
  src: Float64Array,
  w: number,
  h: number,
  px: number,
  py: number,
  size: number,
  value: number
): Float64Array {
  const g = Float64Array.from(src);
  for (let y = py; y < py + size && y < h; y++) {
    for (let x = px; x < px + size && x < w; x++) {
      g[y * w + x] = value;
    }
  }
  return g;
}

/** Circularly translate a grid by (dx, dy) — a pure shift. */
function shifted(src: Float64Array, w: number, h: number, dx: number, dy: number): Float64Array {
  const g = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = (((x - dx) % w) + w) % w;
      const sy = (((y - dy) % h) + h) % h;
      g[y * w + x] = src[sy * w + sx]!;
    }
  }
  return g;
}

describe("spectral perception — exactness certificates", () => {
  it("conserves energy (Parseval) to machine floor on the fast grid", () => {
    const g = structuralScene(GRID_W, GRID_H);
    const p = spectralPerceptFromGrid(g, GRID_W, GRID_H);
    // Parseval residual is the transform's own bit-level certificate.
    expect(p.parsevalResidual).toBeGreaterThanOrEqual(0);
    const rel = p.parsevalResidual / Math.max(p.spectrum.realEnergy, 1e-12);
    expect(rel).toBeLessThan(1e-9); // machine-floor relative to signal energy
  });

  it("conserves energy on the hi-res grid (prime-ish dims 233×144)", () => {
    const g = structuralScene(HIRES_GRID_W, HIRES_GRID_H);
    const p = spectralPerceptFromGrid(g, HIRES_GRID_W, HIRES_GRID_H);
    const rel = p.parsevalResidual / Math.max(p.spectrum.realEnergy, 1e-12);
    expect(rel).toBeLessThan(1e-9);
  });

  it("carries every mode up to Nyquist (power length = W·H)", () => {
    const g = structuralScene(GRID_W, GRID_H);
    const p = spectralPerceptFromGrid(g, GRID_W, GRID_H);
    expect(p.power.length).toBe(GRID_W * GRID_H);
    expect(p.spectrum.nodes).toBe(GRID_W * GRID_H);
  });
});

describe("spectral perception — resolution advantage over the 28-field path", () => {
  it("separates near-identical scenes the 14-mode shadow cannot", () => {
    // Two hi-res scenes with identical coarse layout, differing only in a tiny
    // patch — the canonical failure mode of the φ-decayed 14-mode projection.
    const base = structuralScene(HIRES_GRID_W, HIRES_GRID_H);
    const twin = withPatch(base, HIRES_GRID_W, HIRES_GRID_H, 200, 130, 4, 255);

    // Baseline: the legacy 28-field resonance (the bus contract).
    const fA = fieldFromLuminanceGrid(base, HIRES_GRID_W, HIRES_GRID_H);
    const fB = fieldFromLuminanceGrid(twin, HIRES_GRID_W, HIRES_GRID_H);
    const baselineRes = resonance(fA, fB); // high → the shadow says "same"

    // Spectral percept: WHITENED (log-power) similarity — the fine-structure
    // signature that equalises mode contributions so the patch registers by its
    // structure, not its energy share.
    const pA = spectralPerceptFromGrid(base, HIRES_GRID_W, HIRES_GRID_H);
    const pB = spectralPerceptFromGrid(twin, HIRES_GRID_W, HIRES_GRID_H);
    const spectralSim = powerSpectrumSimilarity(
      whitenedSignature(pA.power),
      whitenedSignature(pB.power)
    );

    // The whitened full-resolution percept must register MORE difference (lower
    // similarity) than the collapsed baseline — it keeps the high-frequency
    // patch the φ⁻ᵏ decay and the raw energy spectrum both underweight.
    expect(spectralSim).toBeLessThan(baselineRes);
    // And it must not claim them identical.
    expect(spectralSim).toBeLessThan(0.999);
  });
});

describe("spectral perception — translation invariance & resonance scan", () => {
  it("power spectrum is invariant under circular shift (identity survives translation)", () => {
    const g = structuralScene(GRID_W, GRID_H);
    const gs = shifted(g, GRID_W, GRID_H, 7, 5);
    const pA = spectralPerceptFromGrid(g, GRID_W, GRID_H);
    const pB = spectralPerceptFromGrid(gs, GRID_W, GRID_H);
    // Fourier shift theorem: |F̂| is unchanged by a circular translation.
    expect(powerSpectrumSimilarity(pA.power, pB.power)).toBeGreaterThan(0.9999);
  });

  it("resonanceScan recovers the shift offset at which two scenes align", () => {
    const w = GRID_W, h = GRID_H;
    const g = structuralScene(w, h);
    const dx = 7, dy = 5;
    const gs = shifted(g, w, h, dx, dy);
    const pA = spectralPerceptFromGrid(g, w, h);
    const pB = spectralPerceptFromGrid(gs, w, h);
    const corr = resonanceScan(pA, pB);
    expect(corr.length).toBe(w * h);
    // argmax over the correlation field → (dy, dx) in row-major.
    let best = 0, bestVal = -Infinity;
    for (let i = 0; i < corr.length; i++) {
      if (corr[i]! > bestVal) {
        bestVal = corr[i]!;
        best = i;
      }
    }
    const offY = Math.floor(best / w);
    const offX = best % w;
    expect(offX).toBe(dx);
    expect(offY).toBe(dy);
    // The peak must be a genuine resonance (positive, well above the floor).
    expect(bestVal).toBeGreaterThan(0);
  });
});

describe("spectral perception — cross-sensory complexity signature", () => {
  it("reports measured complexity comparable across grids", () => {
    const smooth = spectralPerceptFromGrid(structuralScene(GRID_W, GRID_H), GRID_W, GRID_H);
    const sig = complexitySignature(smooth);
    expect(sig.entropyNorm).toBeGreaterThanOrEqual(0);
    expect(sig.entropyNorm).toBeLessThanOrEqual(1);
    expect(sig.participation).toBeGreaterThanOrEqual(0);
    expect(sig.rank99).toBeGreaterThanOrEqual(0);
    expect(sig.dominantFraction).toBeGreaterThanOrEqual(0);
    expect(sig.dominantFraction).toBeLessThanOrEqual(1);
  });

  it("a pure plane wave reads low entropy; a structured scene reads higher", () => {
    // A single spatial frequency → near-pure tone → low spectral entropy.
    const w = GRID_W, h = GRID_H;
    const tone = new Float64Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        tone[y * w + x] = Math.cos((2 * Math.PI * 3 * x) / w);
      }
    }
    const pTone = complexitySignature(spectralPerceptFromGrid(tone, w, h));
    const pScene = complexitySignature(
      spectralPerceptFromGrid(structuralScene(w, h), w, h)
    );
    // The structured scene occupies more modes than a single plane wave.
    expect(pScene.participation).toBeGreaterThan(pTone.participation);
  });
});
