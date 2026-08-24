/**
 * FILE 9 — dynamics/memoryKernel.ts
 *
 * The conservative recursion — "present + past → future". This is the engine's
 * memory substrate: the rule by which a scale's next field value is formed from
 * its present and its golden-delayed past WITHOUT gaining or losing energy. It
 * is the discrete atom of the Tier-1 closure drive (the field measuring its own
 * history) and the substrate File 12's golden-delay self-overlap `C(t)` reads.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE LAW (convex / conservative form).
 *
 *     Ψ(t+τ) = (1−λ)·Ψ(t) + λ·Ψ(t−τ),     λ = φ⁻².
 *
 * Because (1−λ) + λ = 1 EXACTLY, the update is a *convex combination* of the two
 * past states. A convex combination of bounded values is bounded by them — so
 * the recursion can neither blow up nor dissipate: it CONSERVES. This is the
 * unit-root case the blueprint demands.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * UNIT-ROOT THEOREM (the stability certificate, derived — not asserted).
 *
 * Seek a modal solution Ψ(t) = z^(t/τ). Substituting into the law gives the
 * characteristic equation
 *
 *     z = (1−λ) + λ·z⁻¹   ⇒   z² − (1−λ)z − λ = 0.
 *
 * Factor:  z² − (1−λ)z − λ = (z − 1)(z + λ).   Check: (z−1)(z+λ) = z² + λz − z − λ
 * = z² − (1−λ)z − λ. ✓  So the roots are EXACTLY
 *
 *     z₁ = 1,   z₂ = −λ = −φ⁻².
 *
 * |z₁| = 1  → the persistent mode: information is carried forward without decay.
 * |z₂| = φ⁻² < 1  → the transient mode: it decays geometrically (and alternates
 * sign), so any non-modal component is damped out at rate φ⁻² per step.
 * A unit root (|z|=1) with all other roots strictly inside the unit circle is the
 * definition of a *marginally stable, energy-conserving* recursion. [EXACT —
 * closed-form factorisation; roots exposed by `characteristicRoots()`.]
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY NOT THE ADDITIVE-SOURCE FORM.
 *
 * The tempting alternative  Ψ(t+τ) = (1−λ)Ψ(t) + λΨ(t−τ) + source  injects an
 * external term every step; its characteristic polynomial is unchanged but the
 * driven response has no bounding guarantee — a persistent or resonant source
 * grows the state linearly (secular growth). That is NOT conservative. It is
 * therefore flagged unstable and only reachable through `dampedRegularization`,
 * which implements the NORMALIZED damped-memory embedding of MEMORY_ALGORITHMS
 * §2.3 (kernel `γe^{−γs}`, strength λ at every scale) — bounded by construction.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * CANON ALIGNMENT (MEMORY_ALGORITHMS.md, 2026-07-27 — the audited File 9/12 math).
 *   §2.1 conservative law        → `step` (the gate; this file's core).
 *   §2.2 deep history (ENH-1)    → `stepN` + `deepMemoryWeight` (w_k = φ^{1−3k},
 *                                  W_∞ = 1/2 exact). N=1 reduces exactly to `step`.
 *   §2.3 damped memory (ENH-4)   → `dampedRegularization` (normalized Markovian
 *                                  embedding `dM/dt = −γM + λγΨ`, exact integrating
 *                                  factor — no forward-Euler drift).
 *   §2.4 self-referential pole   → cross-checked by `characteristicRoots` (e^{sτ}=−λ
 *                                  ⇔ root −λ; pole sτ = −2lnφ, ENH-3).
 * The additive form is REJECTED (dominant root 1.294963 → diverges); it is never
 * implemented as a step, only the bounded damped embedding above.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * FIELD TYPING (settled by the author's THL blueprints, CORE_VISION §5a-ii).
 * The field is REAL-VALUED — real geometric structure, real winding numbers; no
 * complex e^{iθ} machinery. The BUILD_SPEC's "ComplexAmplitude" is aspirational;
 * the honest per-point field value here is a real `number`. Vector fields are
 * `number[]` (one real value per lattice/torus node).
 *
 * Dependency direction (strictly downward, spec §4 DAG):
 *   memoryKernel(09) → { constants(01), provenance/scaled(02) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI, PHI_NEG2 } from "../core/constants.ts";

/**
 * Default conservative coupling λ = φ⁻². Imported from the single source of
 * truth (File 1) — never re-literalised here (rule: constants centralised).
 */
export const DEFAULT_LAMBDA = PHI_NEG2;

/**
 * The exact transient-mode magnitude |z₂| = φ⁻², equal to λ in the unit-root
 * case. Exposed so tests assert the *relationship* (robust insight), not a
 * hard-coded literal.
 */
export const TRANSIENT_DECAY = PHI_NEG2;

/** A per-node real field value. */
export type FieldValue = number;

/** A real field sampled across nodes (torus / lattice grid). */
export type Field = readonly FieldValue[];

/**
 * MemoryKernel — the conservative "present + past → future" recursion.
 *
 * Immutable once constructed: λ and τ are fixed. λ MUST lie in (0,1) for the
 * convex (conservative) property to hold; the constructor enforces this and
 * refuses anything outside — making the unstable case unrepresentable
 * (foolproof-by-construction, golden rule B14).
 */
export class MemoryKernel {
  /** The conservative coupling λ ∈ (0,1). Default φ⁻². */
  readonly lambda: number;
  /** The recursion time-step τ (informational; scales the golden delay). */
  readonly tau: number;

  constructor(lambda: number = DEFAULT_LAMBDA, tau: number = 1) {
    if (!Number.isFinite(lambda) || lambda <= 0 || lambda >= 1) {
      throw new RangeError(
        `MemoryKernel: lambda must be in the open interval (0,1) for a conservative convex update; got ${lambda}.`,
      );
    }
    if (!Number.isFinite(tau) || tau <= 0) {
      throw new RangeError(`MemoryKernel: tau must be a positive finite number; got ${tau}.`);
    }
    this.lambda = lambda;
    this.tau = tau;
  }

  /**
   * One conservative step for a SINGLE node:
   *   next = (1−λ)·psiT + λ·psiTminusTau.
   * The (1−λ) is computed as `1 - this.lambda` directly so the two weights sum
   * to 1 to the last representable bit (no separate literal that could drift).
   */
  step(psiT: FieldValue, psiTminusTau: FieldValue): FieldValue {
    this.assertFinite(psiT, "psiT");
    this.assertFinite(psiTminusTau, "psiTminusTau");
    return (1 - this.lambda) * psiT + this.lambda * psiTminusTau;
  }

  /**
   * One conservative step for a whole FIELD (per node). The two fields must
   * cover the same node set (equal length). Pure: returns a new array, never
   * mutates the inputs — so callers can keep the history they need for the
   * golden-delay self-overlap in File 12.
   */
  stepField(psiT: Field, psiTminusTau: Field): FieldValue[] {
    if (psiT.length !== psiTminusTau.length) {
      throw new RangeError(
        `MemoryKernel.stepField: field length mismatch (present ${psiT.length} vs past ${psiTminusTau.length}); ` +
          `both must sample the same node set.`,
      );
    }
    const out = new Array<FieldValue>(psiT.length);
    for (let i = 0; i < psiT.length; i++) {
      out[i] = this.step(psiT[i] as number, psiTminusTau[i] as number);
    }
    return out;
  }

  /**
   * The exact characteristic roots of the recursion: [1, −λ].
   * In the canonical unit-root case λ = φ⁻² these are [1, −φ⁻²].
   * Returned as a fresh tuple each call (no shared mutable state).
   */
  characteristicRoots(): readonly [number, number] {
    return [1, -this.lambda] as const;
  }

  /**
   * ENH-1 (MEMORY_ALGORITHMS §2.2) — the exact N-tap weight `w_k = φ^{1−3k}`.
   * Derivation (not asserted): the author's N-step weights are `λᵏ/φ^{k−1}`.
   * With λ = φ⁻², `λᵏ/φ^{k−1} = φ⁻²ᵏ·φ^{−(k−1)} = φ^{1−3k}`. [EXACT]
   * These telescope to `Σ_{k=1}^{∞} φ^{1−3k} = φ⁻²/(1−φ⁻³) = 1/2` exactly,
   * because `1−φ⁻³ = 2φ⁻²`. Infinitely deep golden memory weighs the whole past
   * at exactly one half — present and past are equal partners in the limit.
   */
  static deepMemoryWeight(k: number): number {
    if (!Number.isInteger(k) || k < 1) {
      throw new RangeError(`MemoryKernel.deepMemoryWeight: k must be an integer ≥ 1; got ${k}.`);
    }
    return Math.pow(PHI, 1 - 3 * k);
  }

  /**
   * The exact infinite-depth weight sum `W_∞ = 1/2`, exposed so tests assert the
   * *identity* (φ⁻²/(1−φ⁻³) = 1/2) rather than a hard literal.
   */
  static deepMemoryTotalWeight(): number {
    return PHI_NEG2 / (1 - Math.pow(PHI, -3));
  }

  /**
   * ENH-1 (§2.2) — N-tap conservative deep-memory step:
   *
   *     Ψ(t+τ) = (1−W_N)·Ψ(t) + Σ_{k=1}^{N} w_k·Ψ(t−kτ),   w_k = φ^{1−3k},  W_N = Σ w_k.
   *
   * The conservative closure `(1−W_N)` on the present term makes the coefficients
   * sum to 1 for EVERY N — restoring the exact unit root (§2.1 is the N=1 case,
   * since `w_1 = φ^{1−3} = φ⁻² = λ` and `1−W_1 = 1−λ`). `history` is ordered
   * most-recent-first: history[0] = Ψ(t−τ), history[1] = Ψ(t−2τ), … Only the
   * first N entries are used. Convex ⇒ conservative ⇒ bounded by the hull of
   * {Ψ(t)} ∪ history, exactly as the single-step law.
   */
  stepN(psiT: FieldValue, history: Field): FieldValue {
    this.assertFinite(psiT, "psiT");
    if (history.length === 0) {
      throw new RangeError("MemoryKernel.stepN: history must contain at least Ψ(t−τ).");
    }
    let wSum = 0;
    let pastSum = 0;
    for (let k = 1; k <= history.length; k++) {
      const h = history[k - 1] as number;
      this.assertFinite(h, `history[${k - 1}]`);
      const w = MemoryKernel.deepMemoryWeight(k);
      wSum += w;
      pastSum += w * h;
    }
    return (1 - wSum) * psiT + pastSum;
  }

  /**
   * ENH-4 / §2.3 (damped memory, Term II) — the ONLY sanctioned way to fold an
   * external drive into the state, as a NORMALIZED Markovian-embedding update.
   *
   * The canonical damped memory is the integral
   *     M_II[Ψ](t) = λ ∫₀^∞ Ψ(t−s)·γe^{−γs} ds,
   * whose kernel `γe^{−γs}` is normalized (∫ = 1) so the memory strength is λ at
   * every scale — decoupling strength (λ) from depth (1/γ). Its exact computable
   * form is the Markovian embedding
   *     dM/dt = −γ·M + λ·γ·Ψ(t).
   * This method advances that embedding one step with the exact integrating
   * factor (not a forward-Euler guess — strongest-method law §C-15):
   *     M(t+dt) = M(t)·e^{−γdt} + λ·Ψ(t)·(1 − e^{−γdt}).
   * Convex in {M(t), Ψ(t)} ⇒ bounded, conservative envelope preserved; the
   * unstable raw additive form is never reachable.
   *
   * `gamma` = γ (memory decay rate, §2.3 uses γ(n)=ε·ω(n)); `dt` = step; `m` =
   * current memory state; `psiT` = present field value. Returns the new memory
   * state. γ→0 recovers the timeless average, γ→∞ the memoryless limit.
   */
  dampedRegularization(m: FieldValue, psiT: FieldValue, gamma: number, dt: number): FieldValue {
    this.assertFinite(m, "m");
    this.assertFinite(psiT, "psiT");
    if (!Number.isFinite(gamma) || gamma < 0) {
      throw new RangeError(`MemoryKernel.dampedRegularization: gamma must be ≥ 0 finite; got ${gamma}.`);
    }
    if (!Number.isFinite(dt) || dt < 0) {
      throw new RangeError(`MemoryKernel.dampedRegularization: dt must be ≥ 0 finite; got ${dt}.`);
    }
    const decay = Math.exp(-gamma * dt);
    // Exact integrating factor: M·e^{−γdt} + λ·Ψ·(1−e^{−γdt}). At γ=0 the limit
    // is M (the drive vanishes with the kernel width) — handled explicitly to
    // avoid the 0·∞ indeterminacy of the naive formula.
    if (gamma === 0) {
      return m;
    }
    return decay * m + this.lambda * (1 - decay) * psiT;
  }

  /**
   * True iff the recursion is in the conservative (unit-root) regime: one root
   * on the unit circle, the other strictly inside. For λ∈(0,1) enforced by the
   * constructor this always holds, so this is a *certificate* rather than a
   * guess — it re-derives the fact from the actual roots.
   */
  isConservative(): boolean {
    const [z1, z2] = this.characteristicRoots();
    const onUnit = Math.abs(Math.abs(z1) - 1) < 1e-12;
    const inside = Math.abs(z2) < 1;
    return onUnit && inside;
  }

  private assertFinite(x: FieldValue, name: string): void {
    if (!Number.isFinite(x)) {
      throw new RangeError(`MemoryKernel: ${name} must be finite; got ${x}.`);
    }
  }
}
