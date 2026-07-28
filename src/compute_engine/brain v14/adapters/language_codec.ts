/**
 * RHUFT Mind — Language ↔ Geometric Field Codec
 *
 * Epistemic Status: [SPEC] + [PHIL] — Adapter-layer encoding built on the
 * F6_Hebrew gematria pattern and the F5_ColorMusic DFT projection pattern.
 *
 * [PHIL] — In RHUFT, meaning is not token identity: it is stable geometric
 * structure. This codec maps text into the same 28-element interleaved-complex
 * field space the engine thinks in, so that "words" and "percepts" can be
 * correlated by RESONANCE (normalized complex inner product) rather than by
 * symbol matching.
 *
 * Encode pipeline (fully deterministic, no randomness — engine invariant):
 *   1. Normalize text (NFKD, lowercase, collapse whitespace).
 *   2. Map each character to a gematria-style numeric value (F6_Hebrew pattern
 *      generalized to the Latin alphabet: units 1..9, tens 10..90, hundreds).
 *   3. Remove the mean, then project the value sequence onto 14 φ-weighted DFT
 *      modes (F5 pattern, amplitude φ^(-k/2) — the same half-power golden decay
 *      as signal_codec) → Float64Array(28), interleaved.
 *   4. Normalize to unit L2 norm so resonance is scale-free.
 *
 * Resonance kernel is the exact same math as worker_script.ts
 * computeGeometricOverlap and ExistenceDetector persistence:
 *   C(a,b) = |⟨Ψ_a|Ψ_b⟩|² / (|Ψ_a|²·|Ψ_b|²) ∈ [0, 1]. [MATH]
 */

import { MASTER_EQUATION_N, PHI, PHI_INV, PI } from "./../core/constants.ts";

/** Field size contract: 2 * (N + 1) = 28 for N = 13. [SPEC] */
export const FIELD_SIZE: number = 2 * (MASTER_EQUATION_N + 1);

/** Number of complex modes: N + 1 = 14. [SPEC] */
const NUM_MODES: number = MASTER_EQUATION_N + 1;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Gematria-style character values (F6_Hebrew pattern, Latin generalization)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Latin gematria values, mirroring the Hebrew progression
 * 1..9 (units), 10..90 (tens), 100..400 (hundreds). [SPEC]
 * a..i → 1..9, j..r → 10..90, s..z → 100..800.
 */
function charValue(codePoint: number): number {
  // a..z
  if (codePoint >= 0x61 && codePoint <= 0x7a) {
    const idx = codePoint - 0x61; // 0..25
    if (idx < 9) return idx + 1; // a..i → 1..9
    if (idx < 18) return (idx - 8) * 10; // j..r → 10..90
    return (idx - 17) * 100; // s..z → 100..800 (linear hundreds, [FIX] was 2^n·100)
  }
  // 0..9 → digit value + 1 (so '0' is distinguishable from absence)
  if (codePoint >= 0x30 && codePoint <= 0x39) {
    return codePoint - 0x30 + 1;
  }
  // space → 0 (silence between words carries positional information only)
  if (codePoint === 0x20) return 0;
  // Any other symbol: fold deterministically into 1..22 (22-letter cycle). [SPEC]
  return (codePoint % 22) + 1;
}

/** Normalize text deterministically: NFKD, lowercase, collapse whitespace. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Encode: text → Float64Array(28)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encode text into a 28-element interleaved-complex geometric field.
 *
 * [MATH] — For mode k ∈ [0, 13]:
 *   A_k    = φ^(-k/2)                                 (half-power golden decay —
 *            same law as signal_codec's spiral; steeper φ^(-k) starves the high
 *            modes and collapses distinct words onto mode 1. [SPEC])
 *   Re_k   = A_k · Σ_i (v_i − v̄) · cos(2π · k · i / L + θ_k)
 *   Im_k   = A_k · Σ_i (v_i − v̄) · sin(2π · k · i / L + θ_k)
 *   θ_k    = 2π · k · φ^(-1) / 89                     (golden phase offset, [SPEC])
 * followed by L2 normalization. Empty text after normalization throws —
 * the codec never fabricates content (TRUTH_SOURCES).
 *
 * @param text — Any UTF-8 text (word, phrase, sentence, chunk).
 * @returns Unit-norm Float64Array(28), interleaved complex.
 */
export function encodeText(text: string): Float64Array {
  const norm = normalizeText(text);
  if (norm.length === 0) {
    throw new Error("language_codec.encodeText: text is empty after normalization");
  }

  const L = norm.length;
  const values = new Float64Array(L);
  for (let i = 0; i < L; i++) {
    values[i] = charValue(norm.codePointAt(i) ?? 0);
  }

  // Scale values to [0, 1] by the max gematria value (800) for Float64 stability,
  // then REMOVE THE MEAN (same rule as signal_codec [SPEC]): without it, the
  // all-positive value sequence makes mode k=0 dominate every field and all
  // texts resonate near 1 — mean removal is what gives words distinct geometry.
  // Degenerate case (all characters identical → zero variance): keep the raw
  // values, so the field is a pure DC mode — still deterministic and nonzero.
  const V_MAX = 800.0;
  let mean = 0.0;
  for (let i = 0; i < L; i++) mean += values[i] / V_MAX;
  mean /= L;
  let allSame = true;
  for (let i = 1; i < L; i++) {
    if (values[i] !== values[0]) {
      allSame = false;
      break;
    }
  }

  const field = new Float64Array(FIELD_SIZE);

  for (let k = 0; k < NUM_MODES; k++) {
    const amplitude = Math.pow(PHI_INV, k / 2); // φ^(-k/2) half-power decay. [SPEC]
    const theta_k = (2.0 * PI * k * PHI_INV) / 89.0; // golden phase offset. [SPEC]
    let re = 0.0;
    let im = 0.0;
    for (let i = 0; i < L; i++) {
      const v = allSame ? values[i] / V_MAX : values[i] / V_MAX - mean;
      const angle = (2.0 * PI * k * i) / L + theta_k;
      re += v * Math.cos(angle);
      im += v * Math.sin(angle);
    }
    field[2 * k] = amplitude * re;
    field[2 * k + 1] = amplitude * im;
  }

  return normalizeField(field);
}

/** Normalize a field to unit L2 norm (no-op for zero fields is an error). */
export function normalizeField(field: Float64Array): Float64Array {
  let normSq = 0.0;
  for (let i = 0; i < field.length; i++) {
    normSq += field[i] * field[i];
  }
  if (normSq <= 0.0 || !Number.isFinite(normSq)) {
    throw new Error("language_codec.normalizeField: field has zero or non-finite norm");
  }
  const inv = 1.0 / Math.sqrt(normSq);
  const out = new Float64Array(field.length);
  for (let i = 0; i < field.length; i++) {
    out[i] = field[i] * inv;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Resonance: the meaning-correlation kernel
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Geometric resonance between two interleaved-complex fields.
 *
 * [MATH] — C(a,b) = |⟨Ψ_a|Ψ_b⟩|² / (|Ψ_a|² · |Ψ_b|²) ∈ [0, 1].
 * Identical math to worker_script.ts computeGeometricOverlap and to
 * ExistenceDetector's persistence/relation scores — one kernel, one meaning
 * of "similarity" across the whole mind. [SPEC]
 */
export function resonance(a: Float64Array, b: Float64Array): number {
  const len = Math.min(a.length, b.length);
  const n = Math.floor(len / 2);
  if (n === 0) return 0.0;

  let dotRe = 0.0;
  let dotIm = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < n; i++) {
    const aRe = a[2 * i] ?? 0;
    const aIm = a[2 * i + 1] ?? 0;
    const bRe = b[2 * i] ?? 0;
    const bIm = b[2 * i + 1] ?? 0;

    dotRe += aRe * bRe + aIm * bIm;
    dotIm += aRe * bIm - aIm * bRe;
    normA += aRe * aRe + aIm * aIm;
    normB += bRe * bRe + bIm * bIm;
  }

  const product = normA * normB;
  if (product === 0) return 0.0;

  const magnitudeSq = dotRe * dotRe + dotIm * dotIm;
  const raw = magnitudeSq / product;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}

/**
 * Blend two fields with a φ-decayed moving average (L1_Pattern prototype rule):
 * out = old·(1 − 1/φ²) + incoming·(1/φ²), then re-normalized. [SPEC]
 */
export function reinforceField(oldField: Float64Array, incoming: Float64Array): Float64Array {
  const eta = 1.0 / (PHI * PHI); // learning rate 1/φ², same as L2_Hebbian. [SPEC]
  const len = Math.min(oldField.length, incoming.length);
  const out = new Float64Array(oldField.length);
  for (let i = 0; i < oldField.length; i++) {
    out[i] = oldField[i];
  }
  for (let i = 0; i < len; i++) {
    out[i] = oldField[i] * (1.0 - eta) + incoming[i] * eta;
  }
  return normalizeField(out);
}
