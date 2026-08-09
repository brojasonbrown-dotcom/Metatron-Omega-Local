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

import { BIND_WEIGHT, GOLDEN_PHASE_DENOMINATOR, MASTER_EQUATION_N, PHI, PHI_INV, PI } from "./../core/constants.ts";
import { at } from "../core/indexing.ts";

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
function _encodeTextUncached(text: string): Float64Array {
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
  for (let i = 0; i < L; i++) mean += at(values, i) / V_MAX;
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
    const amplitude = Math.pow(PHI_INV, k / 2); // φ^(-k/2) half-power decay. [SPEC] — Wolfram-verified total energy (Certificate 3.1).
    const theta_k = (2.0 * PI * k * PHI_INV) / GOLDEN_PHASE_DENOMINATOR; // golden phase offset θ_k = 2πk·φ⁻¹/89. [SPEC] — all 14 phases distinct mod 2π (Certificate 3.2).
    let re = 0.0;
    let im = 0.0;
    for (let i = 0; i < L; i++) {
      const v = allSame ? at(values, i) / V_MAX : at(values, i) / V_MAX - mean;
      const angle = (2.0 * PI * k * i) / L + theta_k;
      re += v * Math.cos(angle);
      im += v * Math.sin(angle);
    }
    field[2 * k] = amplitude * re;
    field[2 * k + 1] = amplitude * im;
  }

  return normalizeField(field);
}

/**
 * Bounded memoization cache for encodeText. [SPEC]
 *
 * The DFT projection is O(NUM_MODES · L) transcendentals and the mind re-encodes
 * the SAME labels on every bind/name/recognize pass — a textbook pure function
 * (deterministic: same normalized text → identical unit field). Caching removes
 * that repeated cost with zero behavioral change.
 *
 * The cache is bounded (F_8 = 21 entries, FIFO evict) so a long-lived mind cannot
 * grow it without limit, and it returns DEFENSIVE COPIES so a caller mutating the
 * result can never corrupt the cached attractor (TRUTH_SOURCES).
 */
const ENCODE_CACHE_MAX = 21; // F_8. [SPEC]
const _encodeCache = new Map<string, Float64Array>();

/**
 * Encode text into a 28-element interleaved-complex geometric field (memoized).
 *
 * Identical output to the underlying projection; only the repeated computation
 * is elided. See _encodeTextUncached for the math. [SPEC]
 */
export function encodeText(text: string): Float64Array {
  const key = normalizeText(text);
  // Empty text must still throw (never fabricate content) — the uncached path
  // does that; do not let a cached empty key smuggle a field in. [SPEC]
  if (key.length === 0) {
    return _encodeTextUncached(text);
  }
  const hit = _encodeCache.get(key);
  if (hit !== undefined) {
    return new Float64Array(hit); // defensive copy — never hand out the cache line
  }
  const field = _encodeTextUncached(text);
  _encodeCache.set(key, field);
  if (_encodeCache.size > ENCODE_CACHE_MAX) {
    // FIFO evict the oldest inserted key (Map preserves insertion order). [SPEC]
    const oldest = _encodeCache.keys().next();
    if (!oldest.done) _encodeCache.delete(oldest.value);
  }
  return new Float64Array(field);
}

/** True if every element of the field is finite (no NaN/Infinity). [SPEC] */
export function isFieldFinite(field: Float64Array): boolean {
  for (let i = 0; i < field.length; i++) {
    if (!Number.isFinite(field[i])) return false;
  }
  return true;
}

/**
 * Normalize a field to unit L2 norm.
 * Throws on a zero or non-finite field — the codec never fabricates a direction
 * for a field that has none (TRUTH_SOURCES). [SPEC]
 */
export function normalizeField(field: Float64Array): Float64Array {
  if (!isFieldFinite(field)) {
    throw new Error("language_codec.normalizeField: field contains NaN or Infinity");
  }
  let normSq = 0.0;
  for (let i = 0; i < field.length; i++) {
    normSq += at(field, i) * at(field, i);
  }
  if (normSq <= 0.0 || !Number.isFinite(normSq)) {
    throw new Error("language_codec.normalizeField: field has zero or non-finite norm");
  }
  const inv = 1.0 / Math.sqrt(normSq);
  const out = new Float64Array(field.length);
  for (let i = 0; i < field.length; i++) {
    out[i] = at(field, i) * inv;
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
    const aRe = at(a, 2 * i);
    const aIm = at(a, 2 * i + 1);
    const bRe = at(b, 2 * i);
    const bIm = at(b, 2 * i + 1);

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
 * out = old·(1 − η) + incoming·η, then re-normalized. [SPEC]
 *
 * @param oldField — The current prototype (unit-norm).
 * @param incoming — The new observation (unit-norm).
 * @param evidence — OPTIONAL confidence weight: how many prior observations the
 *   prototype already encodes. When provided, the learning rate decays as
 *   η = (1/φ²) / (evidence + 1), so a mature prototype HARDENS — a single noisy
 *   or adversarial observation cannot drag a well-evidenced attractor. Omitted,
 *   η stays the canonical 1/φ² (the L2_Hebbian rate), preserving the closed-form
 *   convergence contract the P3 battery asserts. [SPEC]
 */
export function reinforceField(
  oldField: Float64Array,
  incoming: Float64Array,
  evidence?: number
): Float64Array {
  const base = 1.0 / (PHI * PHI); // canonical learning rate 1/φ² (L2_Hebbian). [SPEC]
  const eta =
    evidence !== undefined && Number.isFinite(evidence) && evidence > 0
      ? base / (evidence + 1)
      : base;
  const len = Math.min(oldField.length, incoming.length);
  const out = new Float64Array(oldField.length);
  for (let i = 0; i < oldField.length; i++) {
    out[i] = oldField[i];
  }
  for (let i = 0; i < len; i++) {
    out[i] = at(oldField, i) * (1.0 - eta) + at(incoming, i) * eta;
  }
  return normalizeField(out);
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. Meaning binding — fuse word-geometry into percept-geometry (symbol grounding)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Blend two unit-norm fields with an explicit weight, then re-normalize.
 *
 * [MATH] out = normalize( a·(1 − w) + b·w ). A generalization of reinforceField
 * (which is the special case w = 1/φ²). Used to bind a word's semantic field
 * onto a percept's field at a chosen strength. [SPEC]
 *
 * Degenerate case: if the blend underflows to a zero field (a ≈ −b), keep the
 * higher-weighted input unchanged rather than throwing — a field must never
 * collapse to nothing while binding meaning (TRUTH_SOURCES).
 */
export function blendFields(a: Float64Array, b: Float64Array, w: number): Float64Array {
  const weight = w < 0 ? 0 : w > 1 ? 1 : w;
  const len = Math.min(a.length, b.length);
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i];
  for (let i = 0; i < len; i++) {
    out[i] = at(a, i) * (1.0 - weight) + at(b, i) * weight;
  }
  let normSq = 0.0;
  for (let i = 0; i < out.length; i++) normSq += at(out, i) * at(out, i);
  if (normSq <= 0.0 || !Number.isFinite(normSq)) {
    // Anti-parallel collapse: keep the dominant side so meaning is never lost.
    return weight >= 0.5 ? new Float64Array(b) : new Float64Array(a);
  }
  return normalizeField(out);
}

/** Binding strength for word→percept fusion: 1/φ² ≈ 0.382. [SPEC] — Wolfram-verified ratio word:percept = 1:φ (Certificate 3.7). */
export const MEANING_BIND_WEIGHT: number = BIND_WEIGHT;

/**
 * Rotate `field` (interleaved complex) by the global phase φ: each mode
 * (Re, Im) → (Re·cosφ − Im·sinφ, Re·sinφ + Im·cosφ). A global phase rotation
 * leaves the field's resonance to itself at 1 (C is phase-invariant), but
 * changes its INNER PRODUCT with other fields — which is what binding needs. [MATH]
 */
export function phaseRotate(field: Float64Array, phi: number): Float64Array {
  const n = Math.floor(field.length / 2);
  const out = new Float64Array(field.length);
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  for (let i = 0; i < n; i++) {
    const re = at(field, 2 * i);
    const im = at(field, 2 * i + 1);
    out[2 * i] = re * c - im * s;
    out[2 * i + 1] = re * s + im * c;
  }
  return out;
}

/**
 * Align `moving` into `reference`'s global phase frame: find φ* = arg(⟨moving,
 * reference⟩) and rotate moving by −φ* so ⟨moving, reference⟩ is real and
 * NON-NEGATIVE (constructive, not destructive). After alignment the two fields
 * add coherently instead of cancelling. [MATH]
 */
export function phaseAlign(moving: Float64Array, reference: Float64Array): Float64Array {
  const n = Math.min(Math.floor(moving.length / 2), Math.floor(reference.length / 2));
  let dotRe = 0.0;
  let dotIm = 0.0;
  for (let i = 0; i < n; i++) {
    const aRe = at(moving, 2 * i);
    const aIm = at(moving, 2 * i + 1);
    const bRe = at(reference, 2 * i);
    const bIm = at(reference, 2 * i + 1);
    dotRe += aRe * bRe + aIm * bIm;
    dotIm += aRe * bIm - aIm * bRe;
  }
  const phase = Math.atan2(dotIm, dotRe);
  return phaseRotate(moving, -phase);
}

/**
 * Fuse a label's language-field into a percept's field prototype.
 *
 * [PHIL] — This is the symbol-grounding step: the word for a thing and the
 * stable geometric structure of the thing become ONE attractor. After fusion,
 * hearing/reading the word and sensing the percept pull toward the same point
 * in field space, so the engine correlates information with its meaning.
 *
 * [MATH] — Naive mixing fails when the two fields are phase-opposed (they
 * cancel and resonance COLLAPSES). So the word is first phase-aligned into the
 * percept's frame (making their inner product constructive), then blended at
 * MEANING_BIND_WEIGHT. The result stays close to the percept AND moves toward
 * the word — resonance to both rises. [FIX for anti-phase collapse]
 *
 * @param perceptField — The concept's current sensory prototype (unit-norm).
 * @param wordField    — encodeText(label) for the label being bound.
 * @returns A unit-norm field carrying both percept and word geometry.
 */
export function bindMeaning(perceptField: Float64Array, wordField: Float64Array): Float64Array {
  const aligned = phaseAlign(wordField, perceptField);
  return blendFields(perceptField, aligned, MEANING_BIND_WEIGHT);
}
