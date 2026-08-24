/**
 * FILE 12 — dynamics/selfMeasurement.ts
 *
 * Owns: **golden-delay self-overlap — the engine "looking inside its own brain".**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   The engine's field Ψ(t) evolves conservatively under the MemoryKernel
 *   (File 9). Self-measurement compares the present field against the field a
 *   GOLDEN DELAY in the past, Ψ(t − φ·τ). The overlap
 *
 *       C(t) = | ⟨Ψ(t) | Ψ(t − φτ)⟩ |²
 *
 *   is the normalized squared inner product of the two samples — a real number
 *   in [0,1]. C ≈ 1 means the field has returned to (a phase-lock with) its own
 *   golden-delayed past: the recursion is self-referentially coherent. C ≈ 0
 *   means the present is orthogonal to that past: fully decorrelated.
 *
 *   When C crosses the threshold φ⁻² the engine registers an IGNITION event —
 *   a moment where self-overlap becomes strong enough to feed back. This file
 *   detects those events and reduces them to statistics.
 *
 *   Why φ·τ and not τ: the delay must be IRRATIONAL in units of the recursion
 *   step, so the look-back never falls into a low-order resonance with the
 *   engine's own periodicities — the overlap then measures genuine long-range
 *   self-correlation rather than an aliased harmonic. φ is the most irrational
 *   number (worst approximable by rationals), making it the canonical choice.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. THE INNER PRODUCT MUST BE NORMALIZED BEFORE SQUARING. Raw
 *      ⟨Ψ(t)|Ψ(t−φτ)⟩ scales with field amplitude, so |·|² is not bounded in
 *      [0,1]. The contract requires C ∈ [0,1]. We therefore compute the COSINE
 *      similarity ⟨a|b⟩/(‖a‖‖b‖) and square it: C = cos²θ ∈ [0,1], real,
 *      non-negative, amplitude-invariant. This is the unique reading that
 *      satisfies every stated invariant simultaneously. [EXACT — linear algebra]
 *
 *   2. THE THRESHOLD IS EXACTLY φ⁻². Not ≈0.382, not φ⁻¹/φ — the constant
 *      PHI_NEG2 = (3−√5)/2. exceedsThreshold compares against that exact
 *      Float64 value, and the boundary is EXCLUSIVE (C > φ⁻², not ≥): at
 *      C = φ⁻² exactly the overlap sits ON the threshold and has not exceeded
 *      it. [EXACT — contract clause "threshold exactly φ⁻²"]
 *
 *   3. THE GOLDEN DELAY IS φ·τ, AN IRRATIONAL MULTIPLE OF THE STEP. With
 *      discrete samples at integer multiples of τ, the sample at t−φτ falls
 *      BETWEEN grid points. We locate it by the fractional index and linearly
 *      interpolate the two bracketing samples. The interpolation is a
 *      quadrature choice [POSTULATE — the field between samples is not
 *      observed]; the DELAY VALUE φ·τ itself is EXACT.
 *
 *   4. C IS REAL AND NON-NEGATIVE BY CONSTRUCTION. We square a real cosine;
 *      no complex phase survives. Any NaN/negative would signal a non-finite
 *      input field, which the guards reject before any arithmetic. [EXACT]
 *
 * Provenance: the overlap arithmetic (cos², normalization) is EXACT; the
 * between-sample interpolation is POSTULATE (taint noted per-call). The
 * threshold comparison and ignition detection are EXACT. The two are never
 * blended — `selfOverlap` reports the interpolation's provenance honestly.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   selfMeasurement(12) → { memoryKernel(09), constants(01) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI, PHI_NEG2 } from "../core/constants.ts";
import type { Classified } from "../core/provenance.ts";
import { classify } from "../core/provenance.ts";
import type { Field } from "./memoryKernel.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The ignition threshold: exactly φ⁻² = (3−√5)/2 ≈ 0.381966. An overlap is an
 * ignition candidate only when C EXCEEDS this value (strictly).
 * Re-exported under its domain name so tests assert the relationship to φ,
 * not a hard literal.
 */
export const IGNITION_THRESHOLD = PHI_NEG2;

/** The golden delay multiplier: the look-back is φ·τ, never τ. */
export const GOLDEN_DELAY_FACTOR = PHI;

// ─────────────────────────────────────────────────────────────────────────────
// History sampling at the golden delay
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A sampled history of the field: snapshots ordered oldest → newest, taken at
 * uniform intervals of τ. `history[i]` is Ψ at time `t0 + i·τ`. All snapshots
 * sample the same node set (equal length), matching File 9's `Field`.
 */
export interface FieldHistory {
  /** Snapshots, oldest first. Length ≥ 2. */
  readonly snapshots: readonly Field[];
  /** The uniform sample interval τ (> 0). */
  readonly tau: number;
}

function assertHistory(h: FieldHistory, fn: string): void {
  if (!Number.isFinite(h.tau) || h.tau <= 0) {
    throw new RangeError(`${fn}: tau must be a positive finite number; got ${h.tau}.`);
  }
  if (h.snapshots.length < 2) {
    throw new RangeError(`${fn}: history needs ≥ 2 snapshots to look back a golden delay.`);
  }
  const len = h.snapshots[0]!.length;
  for (let i = 0; i < h.snapshots.length; i++) {
    const s = h.snapshots[i]!;
    if (s.length !== len) {
      throw new RangeError(
        `${fn}: snapshot ${i} length ${s.length} ≠ snapshot 0 length ${len}; all must sample the same node set.`,
      );
    }
    for (let j = 0; j < s.length; j++) {
      if (!Number.isFinite(s[j]!)) {
        throw new RangeError(`${fn}: snapshot ${i} node ${j} is non-finite (${s[j]}).`);
      }
    }
  }
}

/**
 * The field at the golden-delayed time t − φ·τ, interpolated from history.
 *
 * The look-back in sample units is φ·τ/τ = φ samples — an irrational index.
 * We bracket it: floor and ceil snapshot indices, linearly interpolated per
 * node. Returns a fresh array (never mutates history).
 *
 * @param tIndex  the fractional sample index of "now" within the history
 *                (0 = oldest snapshot, snapshots.length−1 = newest)
 */
function goldenDelayedField(h: FieldHistory, tIndex: number): number[] {
  const nSnap = h.snapshots.length;
  const backIndex = tIndex - GOLDEN_DELAY_FACTOR; // t−φτ in sample units
  if (backIndex < 0) {
    throw new RangeError(
      `selfOverlap: golden-delayed time falls before the start of history ` +
        `(tIndex ${tIndex} − φ = ${backIndex.toFixed(4)} < 0); supply an earlier snapshot.`,
    );
  }
  const lo = Math.floor(backIndex);
  const hi = Math.min(lo + 1, nSnap - 1);
  const frac = backIndex - lo;
  const a = h.snapshots[lo]!;
  const b = h.snapshots[hi]!;
  const len = a.length;
  const out = new Array<number>(len);
  for (let j = 0; j < len; j++) {
    out[j] = a[j]! + frac * (b[j]! - a[j]!);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-overlap — the core measurement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The golden-delay self-overlap C(t) = |⟨Ψ(t)|Ψ(t−φτ)⟩|², normalized to [0,1].
 *
 * Computed as cos²θ between the present field and the golden-delayed field
 * (ground-truth fact 1): C = (⟨a|b⟩/(‖a‖‖b‖))². Amplitude-invariant, real,
 * non-negative, in [0,1] exactly. C ≈ 1 ⇒ phase-locked to the golden-delayed
 * past; C ≈ 0 ⇒ decorrelated.
 *
 * @param history  uniform-τ field snapshots (oldest → newest)
 * @param tIndex   which snapshot is "now" (fractional index; default = newest)
 * @returns Classified overlap. Provenance POSTULATE because the golden-delayed
 *          field is interpolated between samples (fact 3); the overlap
 *          arithmetic itself is exact.
 */
export function selfOverlap(history: FieldHistory, tIndex?: number): Classified<number> {
  assertHistory(history, "selfOverlap");
  const now = tIndex ?? history.snapshots.length - 1;
  if (!Number.isFinite(now) || now < 0 || now > history.snapshots.length - 1) {
    throw new RangeError(
      `selfOverlap: tIndex ${now} out of range [0, ${history.snapshots.length - 1}].`,
    );
  }
  const present = history.snapshots[Math.round(now)]!;
  const delayed = goldenDelayedField(history, now);

  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let j = 0; j < present.length; j++) {
    const a = present[j]!;
    const b = delayed[j]!;
    dot += a * b;
    na += a * a;
    nb += b * b;
  }
  // Degenerate zero fields: a zero field has no direction, so its overlap with
  // anything is undefined; the honest value is 0 (orthogonal by convention).
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  const C = denom === 0 ? 0 : (dot / denom) ** 2;
  // Clamp Float64 hair above 1 (cos² can exceed 1 by ~1e-16 from rounding).
  const clamped = Math.min(1, Math.max(0, C));
  return classify(
    clamped,
    "POSTULATE",
    undefined,
    "C = cos²θ between Ψ(t) and Ψ(t−φτ); normalization exact, but the golden-" +
      "delayed field is linearly interpolated between samples (φ·τ is an " +
      "irrational index), so the between-sample field is a POSTULATE",
  );
}

/**
 * The ignition predicate: has the overlap crossed the threshold?
 * EXCLUSIVE boundary — true iff C > φ⁻² exactly. At C = φ⁻² the overlap sits
 * ON the threshold and has not exceeded it. [EXACT comparison]
 */
export function exceedsThreshold(C: number): boolean {
  if (!Number.isFinite(C)) {
    throw new RangeError(`exceedsThreshold: C must be finite; got ${C}.`);
  }
  return C > IGNITION_THRESHOLD;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ignition detection + statistics
// ─────────────────────────────────────────────────────────────────────────────

/** One ignition event: the sample index at which C crossed above φ⁻². */
export interface IgnitionEvent {
  /** Fractional sample index of the crossing. */
  readonly tIndex: number;
  /** The overlap value that exceeded the threshold. */
  readonly overlap: number;
}

/** Aggregate statistics over a detected ignition sequence. */
export interface IgnitionStats {
  /** Number of ignition events detected. */
  readonly count: number;
  /** Mean overlap of the igniting samples (0 if none). */
  readonly meanOverlap: number;
  /** Min / max overlap among igniting samples (0 if none). */
  readonly minOverlap: number;
  readonly maxOverlap: number;
  /**
   * Mean spacing between consecutive ignitions, in sample units (0 if fewer
   * than two events). The shape of this distribution is the §12.7 reference.
   */
  readonly meanSpacing: number;
  /** The ignition rate: count per sample-span examined (0 if span is 0). */
  readonly rate: number;
}

/**
 * Scan a history and return every ignition event — each sample index whose
 * golden-delay self-overlap exceeds φ⁻². Pure detection, no statistics.
 *
 * The scan begins at the first sample whose golden-delayed look-back stays
 * within history (t ≥ φ), since a self-measurement before there is enough past
 * to look back into is undefined — those early samples are skipped, not thrown.
 *
 * @param history  uniform-τ field snapshots
 * @param step     scan stride in sample units (default 1 — every snapshot)
 */
export function ignitionEvents(history: FieldHistory, step = 1): readonly IgnitionEvent[] {
  assertHistory(history, "ignitionEvents");
  if (!Number.isFinite(step) || step <= 0) {
    throw new RangeError(`ignitionEvents: step must be positive; got ${step}.`);
  }
  const last = history.snapshots.length - 1;
  // First scannable index: the smallest integer t with t − φ ≥ 0.
  const firstValid = Math.ceil(GOLDEN_DELAY_FACTOR);
  const events: IgnitionEvent[] = [];
  for (let t = firstValid; t <= last; t += step) {
    const { value: C } = selfOverlap(history, t);
    if (exceedsThreshold(C)) events.push({ tIndex: t, overlap: C });
  }
  return events;
}

/**
 * Reduce a sequence of ignition events to statistics. Accepts either the raw
 * event list (from `ignitionEvents`) or, for convenience, a history to scan
 * first. The `span` is the sample-range examined; when events are passed
 * directly, supply the span you scanned so `rate` is meaningful.
 *
 * Returns honest zeros (not NaN) for an empty event list.
 */
export function detectIgnition(
  events: readonly IgnitionEvent[],
  span?: number,
): IgnitionStats {
  const count = events.length;
  if (count === 0) {
    return {
      count: 0,
      meanOverlap: 0,
      minOverlap: 0,
      maxOverlap: 0,
      meanSpacing: 0,
      rate: 0,
    };
  }
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const e of events) {
    sum += e.overlap;
    if (e.overlap < min) min = e.overlap;
    if (e.overlap > max) max = e.overlap;
  }
  let spacing = 0;
  if (count >= 2) {
    let s = 0;
    for (let i = 1; i < count; i++) s += events[i]!.tIndex - events[i - 1]!.tIndex;
    spacing = s / (count - 1);
  }
  const effectiveSpan =
    span ?? (count >= 2 ? events[count - 1]!.tIndex - events[0]!.tIndex : 0);
  return {
    count,
    meanOverlap: sum / count,
    minOverlap: min,
    maxOverlap: max,
    meanSpacing: spacing,
    rate: effectiveSpan > 0 ? count / effectiveSpan : 0,
  };
}
