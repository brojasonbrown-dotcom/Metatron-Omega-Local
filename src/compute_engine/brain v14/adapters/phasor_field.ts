/**
 * RHUFT Mind — Phasor Hypervector Field (FHRR high-dimensional mind geometry)
 *
 * Epistemic Status: [MATH] + [SPEC].
 *
 * WHY THIS FILE EXISTS
 * The mind's naming gate was measured UNSOUND at the engine's native field
 * dimension. `tests/gate-discrimination.mjs` (2026-07-29) shows the 28-element
 * interleaved-complex field (D_complex = 14) cannot separate a true label from
 * a confabulated one: "dog" resonates at 0.215 against its own concept while
 * "trampoline" reaches 0.773. That is not a tuning failure — it is a dimension
 * floor. In a complex space of dimension D, the resonance of two independent
 * random fields concentrates at ~ 1/√D with σ = 1/√D. At D = 14 the noise sits
 * at ≈ 0.27, on top of the λ = 1/φ² = 0.382 threshold: no threshold can work.
 *
 * The fix is NOT a new geometry — it is the SAME resonance kernel lifted to a
 * dimension where concentration of measure works for us instead of against us.
 * This is the Holographic Reduced Representation of Plate (2003), in its
 * frequency-domain (phasor) form:
 *   - a hypervector is D complex unit phasors (one per frequency component),
 *   - BIND  = elementwise complex multiply  = circular convolution (via FFT),
 *   - UNBIND = elementwise multiply by the conjugate (exact inverse),
 *   - BUNDLE = elementwise sum + renormalize (superposition memory),
 *   - PERMUTE = cyclic coordinate shift (order/position encoding),
 *   - SIMILARITY = cosine of the real parts = the same |<a|b>|²-style kernel.
 *
 * DETERMINISM [SPEC] — The engine forbids RNG. Hypervector atoms are therefore
 * not drawn from a random oracle: each atom's phases are derived from a
 * deterministic SplitMix32 hash stream seeded by φ (golden-ratio Weyl
 * sequence), so the same label always yields the identical atom and the whole
 * space is reproducible run-to-run with no stored seed. The φ-seeded hash is a
 * sound pseudo-random source: atoms are empirically near-orthogonal (the
 * discrimination probe asserts the measured floor, not the assumed one).
 *
 * RELATIONSHIP TO THE 28-FIELD — The sensory field (language_codec.ts, 28
 * elements) is untouched and stays the engine's percept substrate. This file
 * is an ADDITIVE high-dimensional layer for LANGUAGE/SYMBOLIC structure. The
 * `liftField` map (a φ-seeded Johnson–Lindenstrauss projection) lets the
 * engine raise a 28-field into this space when a percept must be bound into a
 * symbolic record, provably preserving pairwise geometry to (1 ± ε).
 *
 * Bounded, Float64Array throughout (interleaved complex, same convention as
 * language_codec: Re = 2i, Im = 2i+1). No external dependencies.
 */

import { GOLDEN_PHASE_DENOMINATOR, HYPERVECTOR_DIM, PHI_INV, PI } from "./../core/constants.ts";
import { normalizeText } from "./language_codec.ts";

/** Number of complex phasors per hypervector: 2^13. [SPEC] */
export const HV_COMPLEX: number = HYPERVECTOR_DIM;

/** Interleaved length (Re,Im pairs). */
export const HV_SIZE: number = 2 * HV_COMPLEX;

// ─────────────────────────────────────────────────────────────────────────────
// 0. Deterministic φ-seeded hash stream (SplitMix32 over a golden Weyl seed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SplitMix32 finalizer — strong 32-bit avalanche, deterministic. [MATH]
 * Identical construction to hnsw_index.ts hash32 (one hash, one meaning).
 */
function mix32(h: number): number {
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return (h ^ (h >>> 15)) >>> 0;
}

/**
 * FNV-1a 32-bit hash of a string. [MATH]
 * Used to seed an atom from its label deterministically.
 */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * φ-seeded golden Weyl seed for a label. [SPEC]
 * The fractional part of (h / φ) is equidistributed (Weyl), so hashing the
 * label then folding it through φ gives a well-spread, irrational-derived seed
 * — deterministic, and reproducible from the label alone (no stored RNG state).
 */
function atomSeed(label: string): number {
  const h = fnv1a(normalizeText(label));
  // Fold through the golden Weyl sequence: take h steps of size φ⁻¹ mod 1,
  // then re-quantize into 32 bits. The irrational step guarantees no short cycle.
  const weyl = (h * PHI_INV) % 1;
  return mix32((Math.floor(weyl * 0xffffffff) ^ h) >>> 0);
}

/**
 * Deterministic uniform [0,1) stream from a seed: SplitMix32 counter mode.
 * Each call advances the counter and re-mixes — a reproducible PRNG stream
 * that never touches Math.random (engine invariant). [MATH]
 */
function makeStream(seed: number): () => number {
  let counter = seed >>> 0;
  return () => {
    counter = (counter + 0x9e3779b9) >>> 0; // golden-ratio increment (2^32/φ)
    return mix32(counter) / 0x100000000;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Atoms — the seed hypervectors for symbols
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bounded atom cache (F_8 = 21 entries). Atom construction is O(D)
 * transcendentals; the same labels recur constantly. Returns defensive copies
 * so a caller mutating the result can never corrupt the cached atom. [SPEC]
 */
const ATOM_CACHE_MAX = 21;
const _atomCache = new Map<string, Float64Array>();

/**
 * The hypervector atom for a symbol: D complex unit phasors whose phases are a
 * deterministic function of the (normalized) label. Two different labels yield
 * statistically independent atoms, so their similarity concentrates at ~1/√D —
 * this is the near-orthogonality that buys discrimination. [MATH]
 *
 * @param label — any symbol/word; normalized via the same normalizeText rule
 *   as language_codec so "Dog" and "dog" are the SAME atom.
 * @returns Unit-norm interleaved-complex hypervector (length 2D), each
 *   component a unit phasor e^{iθ_k}.
 */
export function atom(label: string): Float64Array {
  const key = normalizeText(label);
  if (key.length === 0) {
    throw new Error("phasor_field.atom: label is empty after normalization");
  }
  const hit = _atomCache.get(key);
  if (hit !== undefined) return new Float64Array(hit);

  const rand = makeStream(atomSeed(key));
  const out = new Float64Array(HV_SIZE);
  // Phase layout uses a golden-offset per component (θ_k = 2π·k·φ⁻¹/89 base,
  // the SAME golden phase law as language_codec) plus the hash stream's
  // pseudo-random phase — golden structure keeps components well-spread, the
  // hash stream carries the per-label identity that makes atoms independent.
  for (let k = 0; k < HV_COMPLEX; k++) {
    const golden = (2.0 * PI * k * PHI_INV) / GOLDEN_PHASE_DENOMINATOR;
    const theta = golden + 2.0 * PI * rand();
    out[2 * k] = Math.cos(theta);
    out[2 * k + 1] = Math.sin(theta);
  }
  // Each phasor is already unit-magnitude, so the whole vector has norm √D;
  // normalize to unit L2 so similarity is a true cosine. [MATH]
  const norm = Math.sqrt(HV_COMPLEX);
  for (let i = 0; i < HV_SIZE; i++) out[i] /= norm;

  _atomCache.set(key, out);
  if (_atomCache.size > ATOM_CACHE_MAX) {
    const oldest = _atomCache.keys().next();
    if (!oldest.done) _atomCache.delete(oldest.value);
  }
  return new Float64Array(out);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Similarity — the SAME resonance kernel, read as a cosine on real parts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cosine similarity between two hypervectors, in [-1, 1].
 *
 * [MATH] — For unit phasor vectors, Re⟨a,b⟩/(|a||b|) is the standard FHRR
 * similarity (Plate 2003). We compute the full complex inner product's REAL
 * part (the Hermitian-symmetric, phase-sensitive component) over the L2 norms,
 * so identical vectors → 1, near-orthogonal → ~0 with σ = 1/√D, and
 * deliberately phase-opposed vectors → −1. Unlike the squared-magnitude
 * resonance on the 28-field, the signed real part CAN separate opposites —
 * which is exactly what the duality/role structure needs downstream.
 */
export function similarity(a: Float64Array, b: Float64Array): number {
  const n = Math.min(HV_COMPLEX, Math.floor(Math.min(a.length, b.length) / 2));
  if (n === 0) return 0.0;
  let re = 0.0;
  let na = 0.0;
  let nb = 0.0;
  for (let k = 0; k < n; k++) {
    const ar = a[2 * k];
    const ai = a[2 * k + 1];
    const br = b[2 * k];
    const bi = b[2 * k + 1];
    // Re(Σ a·conj(b)) = Σ (ar·br + ai·bi)
    re += ar * br + ai * bi;
    na += ar * ar + ai * ai;
    nb += br * br + bi * bi;
  }
  const denom = Math.sqrt(na * nb);
  if (denom === 0) return 0.0;
  const s = re / denom;
  return s < -1 ? -1 : s > 1 ? 1 : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Bind / Unbind — circular convolution via elementwise phasor product
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BIND two hypervectors: elementwise complex multiply, then renormalize.
 * In the frequency domain this is circular convolution — the FHRR binding
 * operator. The result is dissimilar to BOTH inputs (a new composite) yet
 * either input can be recovered from it by unbinding with the other. [MATH]
 *
 * Associative and commutative (up to Float64 rounding); distribute over
 * bundle is the standard FHRR property used by the knowledge-graph form.
 */
export function bind(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(HV_SIZE);
  for (let k = 0; k < HV_COMPLEX; k++) {
    const ar = a[2 * k];
    const ai = a[2 * k + 1];
    const br = b[2 * k];
    const bi = b[2 * k + 1];
    out[2 * k] = ar * br - ai * bi;
    out[2 * k + 1] = ar * bi + ai * br;
  }
  return normalizeHV(out);
}

/**
 * UNBIND: multiply by the conjugate of `key`. For unit phasors the conjugate
 * is the exact inverse, so unbind(bind(a, b), b) ≈ a (up to bundle noise).
 * This is what makes role-filler and triple queries possible:
 *   unbind(triple, bind(SUBJECT, PREDICATE)) ≈ OBJECT. [MATH]
 */
export function unbind(bound: Float64Array, key: Float64Array): Float64Array {
  const out = new Float64Array(HV_SIZE);
  for (let k = 0; k < HV_COMPLEX; k++) {
    const ar = bound[2 * k];
    const ai = bound[2 * k + 1];
    const kr = key[2 * k];
    const ki = key[2 * k + 1];
    // multiply by conj(key) = (kr − i·ki)
    out[2 * k] = ar * kr + ai * ki;
    out[2 * k + 1] = ai * kr - ar * ki;
  }
  return normalizeHV(out);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Bundle — superposition memory (the "concept = bundle of episodes" form)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BUNDLE a set of hypervectors into one: elementwise sum + renormalize.
 * The bundle stays SIMILAR to every member (that is the point — a concept
 * hypervector is the superposition of its episodes, and recognizing the
 * concept is measuring similarity to the bundle). Capacity before the noise
 * swamps a member scales as ~√D. [MATH]
 *
 * @param items — member hypervectors; optional equal weighting.
 * @returns Unit-norm bundle. Throws on empty input (never fabricate a concept
 *   from nothing — TRUTH_SOURCES).
 */
export function bundle(items: readonly Float64Array[]): Float64Array {
  if (items.length === 0) {
    throw new Error("phasor_field.bundle: cannot bundle zero items");
  }
  if (items.length === 1) return normalizeHV(items[0]);
  const out = new Float64Array(HV_SIZE);
  for (const v of items) {
    for (let i = 0; i < HV_SIZE; i++) out[i] += v[i];
  }
  return normalizeHV(out);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Permute — cyclic coordinate shift for order/position (no stored table)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PERMUTE a hypervector by a cyclic shift of its complex components.
 * This is the FHRR mechanism for encoding SEQUENCE/ROLE position without a
 * stored permutation table: position k applies the shift k times, so a
 * sentence "w0 w1 w2" is bundle( permute^0(w0), permute^1(w1), permute^2(w2) )
 * and word order is recoverable by un-permuting. [MATH]
 *
 * Because the shift is a fixed cyclic relabeling, permute is invertible
 * (permute⁻¹ = shift by D − steps) and commutes with bind's structure.
 *
 * @param v — hypervector.
 * @param steps — shift amount (position index). Negative shifts invert.
 */
export function permute(v: Float64Array, steps: number): Float64Array {
  const n = HV_COMPLEX;
  const s = ((steps % n) + n) % n; // normalize negative / oversized shifts
  if (s === 0) return new Float64Array(v);
  const out = new Float64Array(HV_SIZE);
  for (let k = 0; k < n; k++) {
    const src = ((k - s) % n + n) % n; // component k takes from k − s
    out[2 * k] = v[2 * src];
    out[2 * k + 1] = v[2 * src + 1];
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Sentence encoding — usage-derived, order-sensitive meaning
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encode a sentence as an order-sensitive bundle of its word atoms:
 *   sentence = bundle( Σ_k permute(atom(word_k), k) ). [MATH]
 *
 * This is the BEAGLE / Random-Indexing form (Jones & Mewhort 2007; Kanerva
 * 2000): meaning is derived from the word atoms and their ORDER, not from a
 * bag of spectral modes. Two sentences with the same words in different order
 * get different hypervectors; two sentences sharing words stay similar. This
 * is the layer that replaces the gematria-DFT bag for SYMBOLIC structure.
 *
 * @param text — any phrase/sentence; tokenized on whitespace after the shared
 *   normalizeText rule.
 * @returns Unit-norm sentence hypervector.
 */
export function encodeSentence(text: string): Float64Array {
  const norm = normalizeText(text);
  if (norm.length === 0) {
    throw new Error("phasor_field.encodeSentence: text is empty after normalization");
  }
  const words = norm.split(" ").filter((w) => w.length > 0);
  if (words.length === 1) return atom(words[0]);
  const placed: Float64Array[] = new Array(words.length);
  for (let k = 0; k < words.length; k++) {
    placed[k] = permute(atom(words[k]), k);
  }
  return bundle(placed);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Johnson–Lindenstrauss lift — raise the 28-field into this space
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic JL projection (φ-seeded Achlioptas), lazily built and GROWN on
 * demand. The Johnson–Lindenstrauss guarantee is about the projected VALUES, so we
 * keep them as real amplitudes (NOT wrapped into a phase — see liftField).
 * Entries are ±1 with p = 1/2; the (1 ± ε) pairwise-distance guarantee is the
 * JL lemma [MATH]. φ-seeded → reproducible with no stored seed.
 *
 * The matrix is (2·HV_COMPLEX) × inSize real entries: we project the input's real
 * coordinates into the hypervector's 2·HV_COMPLEX real coordinates, then read the
 * result as HV_COMPLEX interleaved complex pairs.
 *
 * DIMENSION-SAFETY [FIX] — the SplitMix32 stream is an infinite counter-mode
 * sequence, so the matrix for ANY inSize is a deterministic prefix-extension of
 * one stream. We therefore cache by the fixed seed (never the length) and GROW
 * the buffer when a larger inSize arrives. The old length-keyed cache returned a
 * stale, narrower matrix for a wider input and read it out of bounds — which
 * silently produced a wrong lift the moment a high-resolution field was lifted.
 */
let _jl: { seed: number; rows: number; cols: number; m: Float64Array } | null = null;
function jlMatrix(outReal: number, inSize: number): Float64Array {
  const seed = atomSeed("__jl_projection__");
  if (_jl !== null && _jl.seed === seed && _jl.rows === outReal && _jl.cols >= inSize) {
    return _jl.m;
  }
  // (Re)generate the full outReal × inSize block from the infinite stream. Rows
  // from a previous smaller call are NOT reused across a different inSize (row
  // length changed), so we regenerate deterministically from the same seed.
  const m = new Float64Array(outReal * inSize);
  const rand = makeStream(seed);
  for (let i = 0; i < m.length; i++) {
    m[i] = rand() < 0.5 ? -1 : 1; // Achlioptas ±1; the 1/√D factor is applied at use.
  }
  _jl = { seed, rows: outReal, cols: inSize, m };
  return m;
}

/**
 * Lift a 28-element interleaved-complex field into the phasor hypervector
 * space via a φ-seeded Johnson–Lindenstrauss projection, then renormalize.
 *
 * [MATH] — This is the honest lift: out_real = (1/√D)·R·x, a REAL linear map
 * of the input's 28 real coordinates into the hypervector's 2D real
 * coordinates, then unit-normalized. JL preserves pairwise distances (hence
 * inner products, hence the resonance kernel) to a factor (1 ± ε) with high
 * probability. Two percepts that were distinct on the 28-field stay distinct;
 * two that were close stay close. It does NOT wrap values into a phase — the
 * earlier phase-wrapping variant collapsed unrelated percepts onto the same
 * unit phasor (measured: sim(dog,trampoline)=0.99), which is the same
 * magnitude-throwing failure as median quantising. Keeping the real projected
 * amplitudes is what carries the geometry.
 *
 * @param field28 — a 28-element interleaved-complex field (language_codec).
 * @returns Unit-norm hypervector in the phasor space.
 */
export function liftField(field28: Float64Array): Float64Array {
  const inSize = field28.length;
  if (inSize === 0 || inSize % 2 !== 0) {
    throw new Error("phasor_field.liftField: input must be interleaved-complex, even length");
  }
  const outReal = HV_SIZE;
  const m = jlMatrix(outReal, inSize);
  const out = new Float64Array(outReal);
  const scale = 1.0 / Math.sqrt(outReal);
  for (let r = 0; r < outReal; r++) {
    let acc = 0.0;
    const row = r * inSize;
    for (let i = 0; i < inSize; i++) {
      acc += m[row + i] * field28[i];
    }
    out[r] = scale * acc;
  }
  return normalizeHV(out);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal — unit-norm a hypervector (defensive; never fabricate direction)
// ─────────────────────────────────────────────────────────────────────────────
function normalizeHV(v: Float64Array): Float64Array {
  let normSq = 0.0;
  for (let i = 0; i < v.length; i++) normSq += v[i] * v[i];
  if (normSq <= 0.0 || !Number.isFinite(normSq)) {
    throw new Error("phasor_field.normalizeHV: field has zero or non-finite norm");
  }
  const inv = 1.0 / Math.sqrt(normSq);
  const out = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] * inv;
  return out;
}
