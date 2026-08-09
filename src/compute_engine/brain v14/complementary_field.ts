import { at } from "./core/indexing.ts";
/**
 * RHUFT v13 — Complementary Field: Chapter 4 — Oppositional Complementarity
 *
 * Implements dual-polarity field representation where each element is a
 * complementary pair (a⁺, a⁻) with involution operator ι(a⁺, a⁻) = (a⁻, a⁺).
 *
 * [PHIL] — A dimension is not merely a line. It is a bidirectional relational
 * structure that permits measurable contrast and ordered displacement. Without
 * oppositional complementarity, a direction is only an incomplete tendency.
 * Measurement requires a return path, a reflective counterpart, or an
 * oppositional closure.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 */

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ComplementaryField Class — Dual-Polarity Field Storage
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A field where each element is a complementary pair (a⁺, a⁻).
 *
 * [PHIL] — Oppositional complementarity: a dimension requires at least one
 * nontrivial involution ι(a⁺, a⁻) = (a⁻, a⁺) with ι(ι(x)) = x. This involution
 * expresses the reversibility or complementarity needed for a dimension to be
 * closed as a measurable structure.
 *
 * The internal storage is a flat Float64Array: [+0, -0, +1, -1, ...].
 */
export class ComplementaryField {
  /** Internal flat storage: [+0, -0, +1, -1, ...]. Length = 2 × N. */
  private readonly _data: Float64Array;

  /** Number of complementary pairs (N = _data.length / 2). */
  readonly size: number;

  /**
   * Construct from a flat array of even length [+0, -0, +1, -1, ...].
   *
   * @param data — Flat Float64Array of pairs. Must have even length.
   */
  constructor(data: Float64Array) {
    if (data.length % 2 !== 0) {
      throw new Error(
        `ComplementaryField: data.length must be even (pairs), got ${data.length}.`
      );
    }
    this._data = new Float64Array(data); // copy, don't reference
    this.size = data.length / 2;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Accessors
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the +component (outward, positive, forward) at index i.
   */
  plus(i: number): Float64 {
    if (i < 0 || i >= this.size) return 0 as Float64;
    return this._data[2 * i] as Float64;
  }

  /**
   * Get the -component (inward, negative, backward) at index i.
   */
  minus(i: number): Float64 {
    if (i < 0 || i >= this.size) return 0 as Float64;
    return this._data[2 * i + 1] as Float64;
  }

  /**
   * Get both poles at index i as {plus, minus}.
   */
  polarity(i: number): { plus: Float64; minus: Float64 } {
    if (i < 0 || i >= this.size) return { plus: 0 as Float64, minus: 0 as Float64 };
    return {
      plus: this._data[2 * i] as Float64,
      minus: this._data[2 * i + 1] as Float64,
    };
  }

  /**
   * Get the net distinction at index i: + - (-) = a⁺ - a⁻.
   *
   * [PHIL] — The net is the "distinction" between the complementary poles.
   * It measures the directional bias or asymmetry at that position.
   */
  net(i: number): Float64 {
    if (i < 0 || i >= this.size) return 0 as Float64;
    return (at(this._data, 2 * i) - at(this._data, 2 * i + 1)) as Float64;
  }

  /**
   * Get the magnitude at index i: sqrt(plus² + minus²).
   *
   * [MATH] — The magnitude is the total amplitude of the complementary pair,
   * regardless of directional bias. It measures the total "presence" at that
   * position, combining both poles.
   */
  magnitude(i: number): Float64 {
    if (i < 0 || i >= this.size) return 0 as Float64;
    const p = at(this._data, 2 * i);
    const m = at(this._data, 2 * i + 1);
    return Math.sqrt(p * p + m * m) as Float64;
  }

  /**
   * Get the raw data as a flat Float64Array.
   */
  toArray(): Float64Array {
    return new Float64Array(this._data); // copy
  }

  /**
   * Get the total number of elements (2 × size).
   */
  get length(): number {
    return this._data.length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Involution — The Complement Map
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Apply the involution operator: swap + and - components for all elements.
   *
   * [PHIL] — The involution ι(a⁺, a⁻) = (a⁻, a⁺) expresses the reversibility
   * or complementarity needed for a dimension to be closed as a measurable
   * structure. Without such an involution, a direction cannot be fully resolved.
   *
   * @returns New ComplementaryField with swapped poles.
   */
  involution(): ComplementaryField {
    const result = new Float64Array(this._data.length);
    for (let i = 0; i < this.size; i++) {
      result[2 * i] = at(this._data, 2 * i + 1);     // + ← -
      result[2 * i + 1] = at(this._data, 2 * i);     // - ← +
    }
    return new ComplementaryField(result);
  }

  /**
   * Apply involution twice and verify it returns the original field.
   *
   * [MATH] — A valid involution satisfies ι(ι(x)) = x. This is a geometric
   * consistency check on the complementary field structure.
   */
  isValidInvolution(): boolean {
    const double = this.involution().involution();
    for (let i = 0; i < this._data.length; i++) {
      if (this._data[i] !== double.toArray()[i]) return false;
    }
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Algebraic Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Element-wise addition of two complementary fields.
   */
  add(other: ComplementaryField): ComplementaryField {
    if (this.size !== other.size) {
      throw new Error(
        `ComplementaryField.add: size mismatch (${this.size} vs ${other.size}).`
      );
    }
    const result = new Float64Array(this._data.length);
    for (let i = 0; i < this._data.length; i++) {
      result[i] = (at(this._data, i) + at(other.toArray(), i)) as Float64;
    }
    return new ComplementaryField(result);
  }

  /**
   * Scalar multiplication: c · (a⁺, a⁻) for all elements.
   */
  scale(scalar: Float64): ComplementaryField {
    const result = new Float64Array(this._data.length);
    for (let i = 0; i < this._data.length; i++) {
      result[i] = (at(this._data, i) * scalar) as Float64;
    }
    return new ComplementaryField(result);
  }

  /**
   * Inner product: <a|b> = Σ (a⁺·b⁺ + a⁻·b⁻).
   *
   * [MATH] — The inner product measures the total relational overlap between
   * two complementary fields, combining both poles symmetrically.
   */
  innerProduct(other: ComplementaryField): Float64 {
    if (this.size !== other.size) {
      throw new Error(
        `ComplementaryField.innerProduct: size mismatch (${this.size} vs ${other.size}).`
      );
    }
    let sum = 0.0;
    const otherData = other.toArray();
    for (let i = 0; i < this.size; i++) {
      const p1 = at(this._data, 2 * i);
      const m1 = at(this._data, 2 * i + 1);
      const p2 = at(otherData, 2 * i);
      const m2 = at(otherData, 2 * i + 1);
      sum += p1 * p2 + m1 * m2;
    }
    return sum as Float64;
  }

  /**
   * Coherence: normalized inner product = |<a|b>|² / (|a|² · |b|²).
   *
   * [MATH] — Coherence measures the degree of alignment between two complementary
   * fields. Range [0, 1]. 1 = identical fields, 0 = orthogonal fields.
   */
  coherence(other: ComplementaryField): Float64 {
    const inner = this.innerProduct(other);
    const normA = this.innerProduct(this);
    const normB = other.innerProduct(other);
    const product = normA * normB;
    if (product === 0) return 0 as Float64;
    const raw = (inner * inner) / product;
    // Clamp to [0, 1] to handle floating-point drift
    return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
  }

  /**
   * Compute the total net distinction (sum of all nets).
   *
   * [PHIL] — The total net measures the overall directional bias of the field.
   * A net of 0 means perfect balance between + and - poles (isotropic).
   */
  totalNet(): Float64 {
    let sum = 0.0;
    for (let i = 0; i < this.size; i++) {
      sum += at(this._data, 2 * i) - at(this._data, 2 * i + 1);
    }
    return sum as Float64;
  }

  /**
   * Compute the total magnitude (sum of all magnitudes).
   */
  totalMagnitude(): Float64 {
    let sum = 0.0;
    for (let i = 0; i < this.size; i++) {
      const p = at(this._data, 2 * i);
      const m = at(this._data, 2 * i + 1);
      sum += Math.sqrt(p * p + m * m);
    }
    return sum as Float64;
  }

  /**
   * Compute the average coherence between this field and its involution.
   *
   * [PHIL] — A field with high self-coherence under involution has strong
   * complementary closure. A field with low self-coherence is asymmetric.
   */
  involutionCoherence(): Float64 {
    return this.coherence(this.involution());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Static Factory Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create from a flat array of even length [+0, -0, +1, -1, ...].
   */
  static fromArray(arr: Float64Array): ComplementaryField {
    return new ComplementaryField(arr);
  }

  /**
   * Create from two separate arrays: plusField and minusField.
   *
   * @param plusField — Array of +components (length N).
   * @param minusField — Array of -components (length N).
   */
  static createDualPair(plusField: Float64Array, minusField: Float64Array): ComplementaryField {
    if (plusField.length !== minusField.length) {
      throw new Error(
        `ComplementaryField.createDualPair: length mismatch (${plusField.length} vs ${minusField.length}).`
      );
    }
    const result = new Float64Array(plusField.length * 2);
    for (let i = 0; i < plusField.length; i++) {
      result[2 * i] = plusField[i] ?? 0;
      result[2 * i + 1] = minusField[i] ?? 0;
    }
    return new ComplementaryField(result);
  }

  /**
   * Create a zero field of size N.
   */
  static zeros(N: number): ComplementaryField {
    return new ComplementaryField(new Float64Array(N * 2));
  }

  /**
   * Create a field where + and - are equal (balanced, isotropic).
   */
  static balanced(N: number, value: Float64 = 1.0 as Float64): ComplementaryField {
    const result = new Float64Array(N * 2);
    for (let i = 0; i < N; i++) {
      result[2 * i] = value;
      result[2 * i + 1] = value;
    }
    return new ComplementaryField(result);
  }

  /**
   * Create a field from a standard (non-complementary) array by treating
   * each element as the +component and setting the -component to zero.
   */
  static fromStandard(arr: Float64Array): ComplementaryField {
    const result = new Float64Array(arr.length * 2);
    for (let i = 0; i < arr.length; i++) {
      result[2 * i] = arr[i] ?? 0;
      result[2 * i + 1] = 0;
    }
    return new ComplementaryField(result);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Conversion: Complementary Field ↔ Interleaved Complex Field
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Convert this complementary field to an interleaved complex field.
   *
   * [PHIL] — The +component maps to the real part, the -component maps to
   * the imaginary part. This creates a complex representation where the
   * complementary pair is encoded as a single complex number: Ψ_i = a⁺ + i·a⁻.
   *
   * @returns Interleaved [Re₀, Im₀, Re₁, Im₁, ...] = [+0, -0, +1, -1, ...].
   */
  toComplex(): Float64Array {
    return this.toArray(); // identical ordering: [+0, -0, +1, -1, ...]
  }

  /**
   * Create from an interleaved complex field [Re₀, Im₀, Re₁, Im₁, ...].
   *
   * [PHIL] — Treats the complex field as a complementary field where
   * Re = +component and Im = -component.
   */
  static fromComplex(complex: Float64Array): ComplementaryField {
    return new ComplementaryField(new Float64Array(complex));
  }
}
