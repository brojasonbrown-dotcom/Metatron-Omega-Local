/**
 * METATRON v10 — RESONANCE BANDS (the learning sweet spot)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * A single similarity cut-off is the wrong shape for a learning gate.
 * Expected information gain is NOT monotonic in similarity r:
 *
 *   • r → 1  the observation is already held  → gain → 0 (redundant)
 *   • r → 0  the observation shares no basis  → gain → 0 (noise)
 *   • in between, gain peaks.
 *
 * The band edges are the φ constants the engine already runs on, so this
 * introduces no new magic numbers:
 *
 *   φ⁻² = 0.3819660112501051   noise floor / consciousness threshold
 *   φ⁻¹ = 0.6180339887498949   bind threshold
 *   1−φ⁻³ = 0.7639320225002102 consolidation threshold
 *   1−φ⁻⁴ = 0.8541019662496845 redundancy ceiling
 *
 * Peak gain sits at the midpoint of the BIND window, (φ⁻¹ + 1−φ⁻³)/2.
 *
 * HONESTY: these are decision thresholds for compute budgeting, not physics.
 * They are never compared against CODATA and never enter framework drift.
 */

const PHI = 1.618033988749895;

export const PHI_INV = 1 / PHI;                    // 0.6180339887498949
export const PHI_INV_2 = PHI_INV * PHI_INV;        // 0.3819660112501051
export const PHI_INV_3 = PHI_INV_2 * PHI_INV;      // 0.2360679774997897
export const PHI_INV_4 = PHI_INV_3 * PHI_INV;      // 0.1458980337503155

/** Canonical band edges, ascending. */
export const BAND_EDGES = Object.freeze({
  noise: PHI_INV_2,        // 0.381966…
  bind: PHI_INV,           // 0.618034…
  consolidate: 1 - PHI_INV_3, // 0.763932…
  redundant: 1 - PHI_INV_4,   // 0.854102…
});

/** Similarity of peak expected information gain. */
export const PEAK_GAIN_R = (BAND_EDGES.bind + BAND_EDGES.consolidate) / 2; // ≈0.690983

export type ResonanceBand = 'NOISE' | 'EXPLORE' | 'BIND' | 'CONSOLIDATE' | 'REDUNDANT';

export const BAND_ORDER: readonly ResonanceBand[] = [
  'NOISE', 'EXPLORE', 'BIND', 'CONSOLIDATE', 'REDUNDANT',
];

export interface BandEdges {
  noise: number;
  bind: number;
  consolidate: number;
  redundant: number;
}

/**
 * Aggression (1..13, neutral 6) shifts every edge DOWN as aggression rises,
 * widening EXPLORE and admitting noisier material. The shift is φ-derived:
 *
 *   δ(a) = (6 − a)/13 · φ⁻³      → a=13 ⇒ −0.127, a=1 ⇒ +0.091
 *
 * Edges stay strictly ordered and inside (0,1) after the shift.
 */
export function edgesForAggression(aggression = 6): BandEdges {
  const a = Math.max(1, Math.min(13, Math.round(aggression)));
  const delta = ((6 - a) / 13) * PHI_INV_3;
  const clamp = (x: number) => Math.max(0.01, Math.min(0.99, x));
  const e: BandEdges = {
    noise: clamp(BAND_EDGES.noise + delta),
    bind: clamp(BAND_EDGES.bind + delta),
    consolidate: clamp(BAND_EDGES.consolidate + delta),
    redundant: clamp(BAND_EDGES.redundant + delta),
  };
  // Enforce strict ordering after clamping.
  if (e.bind <= e.noise) e.bind = e.noise + 1e-3;
  if (e.consolidate <= e.bind) e.consolidate = e.bind + 1e-3;
  if (e.redundant <= e.consolidate) e.redundant = e.consolidate + 1e-3;
  return e;
}

export function classifyResonance(r: number, aggression = 6): ResonanceBand {
  const e = edgesForAggression(aggression);
  if (!Number.isFinite(r)) return 'NOISE';
  if (r < e.noise) return 'NOISE';
  if (r < e.bind) return 'EXPLORE';
  if (r < e.consolidate) return 'BIND';
  if (r < e.redundant) return 'CONSOLIDATE';
  return 'REDUNDANT';
}

/**
 * Learning-rate kernel: triangular, zero at the NOISE and REDUNDANT edges,
 * 1 at the peak-gain similarity. Multiplying η by this routes the budget to
 * the informative middle instead of spending it on noise or repetition.
 */
export function learningGain(r: number, aggression = 6): number {
  const e = edgesForAggression(aggression);
  const peak = (e.bind + e.consolidate) / 2;
  if (!Number.isFinite(r) || r <= e.noise || r >= e.redundant) return 0;
  return r <= peak
    ? (r - e.noise) / Math.max(1e-9, peak - e.noise)
    : (e.redundant - r) / Math.max(1e-9, e.redundant - peak);
}

/** Should this observation be written to the substrate at all? */
export function shouldIngest(r: number, aggression = 6): boolean {
  const b = classifyResonance(r, aggression);
  return b === 'EXPLORE' || b === 'BIND' || b === 'CONSOLIDATE';
}

/** Should a NEW trace be allocated (vs merging into an existing one)? */
export function shouldAllocate(r: number, aggression = 6): boolean {
  const b = classifyResonance(r, aggression);
  return b === 'EXPLORE' || b === 'BIND';
}

// ═══════════════════════════════════════════════════════════════════════
// LIVE OCCUPANCY — measured, never assumed
// ═══════════════════════════════════════════════════════════════════════

const counts: Record<ResonanceBand, number> = {
  NOISE: 0, EXPLORE: 0, BIND: 0, CONSOLIDATE: 0, REDUNDANT: 0,
};
let totalObs = 0;
let gainSum = 0;

export function recordResonance(r: number, aggression = 6): ResonanceBand {
  const band = classifyResonance(r, aggression);
  counts[band] += 1;
  totalObs += 1;
  gainSum += learningGain(r, aggression);
  return band;
}

export interface BandOccupancy {
  total: number;
  counts: Record<ResonanceBand, number>;
  fractions: Record<ResonanceBand, number>;
  /** Fraction dropped before any expensive computation. */
  skipFraction: number;
  /** Mean learning gain per observation — throughput efficiency. */
  meanGain: number;
}

export function bandOccupancy(): BandOccupancy {
  const t = Math.max(1, totalObs);
  const fractions = {} as Record<ResonanceBand, number>;
  for (const b of BAND_ORDER) fractions[b] = counts[b] / t;
  return {
    total: totalObs,
    counts: { ...counts },
    fractions,
    skipFraction: (counts.NOISE + counts.REDUNDANT) / t,
    meanGain: gainSum / t,
  };
}

export function resetBandOccupancy(): void {
  for (const b of BAND_ORDER) counts[b] = 0;
  totalObs = 0;
  gainSum = 0;
}

export const RESONANCE_BANDS_PROVENANCE =
  'Resonance bands are compute-budget decision thresholds derived from φ: ' +
  `NOISE < ${BAND_EDGES.noise.toFixed(6)} (φ⁻²), BIND ≥ ${BAND_EDGES.bind.toFixed(6)} (φ⁻¹), ` +
  `CONSOLIDATE ≥ ${BAND_EDGES.consolidate.toFixed(6)} (1−φ⁻³), REDUNDANT ≥ ${BAND_EDGES.redundant.toFixed(6)} (1−φ⁻⁴). ` +
  `Peak expected information gain at r ≈ ${PEAK_GAIN_R.toFixed(6)}. These gate ` +
  'learning cost only — they are never physics and never CODATA-compared.';

export { PHI };