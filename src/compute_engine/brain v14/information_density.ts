/**
 * RHUFT v13 — Information Density: Chapter 8 — Information Density, Mass, and Gravitational Burden
 *
 * Implements the doctrine that mass is the stabilization burden of information
 * density at scale. Information density is the structural content of stabilized
 * distinction. Mass is the field-cost of maintaining that structure. Gravity is the
 * field response to dense stabilized burden. Inertia is resistance to reconfiguration.
 *
 * [PHIL] — Matter is not primitive substance. It is a highly stabilized mode of
 * distinction. Mass is the burden of stabilizing dense structured distinction.
 * The more complex the structure, the more measurement is required, the more
 * recursive burden, the greater the resistance to change and the stronger the
 * field impact. That resistance and field impact are what appear as inertia and
 * gravity.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI,
  PHI_INV,
  PHI_NEG2,
  PI,
  COHERENCE_THRESHOLD,
} from "./core/constants.ts";
import { at } from "./core/indexing.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Information Density Analysis Result
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete analysis of a field's information density, mass, inertia, and
 * gravitational burden.
 */
export interface InformationDensityAnalysis {
  /** Complexity score (Shannon entropy of magnitudes). [0, 1]. */
  readonly complexity: Float64;
  /** Relational coupling (phase alignment between neighbors). [0, 1]. */
  readonly relationalCoupling: Float64;
  /** Geometric differentiation (discrete gradient magnitude). [0, 1]. */
  readonly geometricDifferentiation: Float64;
  /** Stabilization cost (1 - coherence). [0, 1]. */
  readonly stabilizationCost: Float64;
  /** Total information density: ρ_I = (C + R + K + S) / 4. [0, 1]. */
  readonly density: Float64;
  /** Mass: m = ρ_I · φ^(depth) · coherence. */
  readonly mass: Float64;
  /** Inertia: I = m · Σ|current - previous|² / (2 · coherence · fieldLen). */
  readonly inertia: Float64;
  /** Gravitational burden: G = m · Σ|∂Ψ/∂x|² / fieldLen. */
  readonly gravitationalBurden: Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. InformationDensity Class — Mass as Stabilization Burden
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes information density, mass, inertia, and gravitational burden from
 * geometric field states according to the RHUFT v13 ontology.
 *
 * [PHIL] — In RHUFT, information is not primarily symbolic data. It is
 * structured distinction. A region of the field contains more information when it
 * contains more resolved distinctions, more relational dependencies, more geometric
 * differentiation, more internal constraints, more multiscale couplings.
 */
export class InformationDensity {
  // ─────────────────────────────────────────────────────────────────────────
  // 3. Component Scores
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute complexity score: Shannon entropy of field magnitudes.
   *
   * [MATH] — C = -Σ p_i · ln(p_i) / ln(N) where p_i = |Ψ_i| / Σ|Ψ_j|.
   * Normalized to [0, 1]. High complexity = diverse magnitudes (many distinctions).
   * Low complexity = uniform magnitudes (few distinctions).
   *
   * @param field — Interleaved complex field [Re₀, Im₀, Re₁, Im₁, ...].
   * @returns Complexity score in [0, 1].
   */
  static computeComplexity(field: Float64Array): Float64 {
    const n = Math.floor(field.length / 2);
    if (n === 0) return 0 as Float64;

    // Compute magnitudes
    const magnitudes = new Float64Array(n);
    let totalMag = 0.0;
    for (let i = 0; i < n; i++) {
      const re = field[2 * i] ?? 0;
      const im = field[2 * i + 1] ?? 0;
      const mag = Math.sqrt(re * re + im * im);
      magnitudes[i] = mag;
      totalMag += mag;
    }

    if (totalMag === 0) return 0 as Float64;

    // Compute probabilities and entropy
    let entropy = 0.0;
    for (let i = 0; i < n; i++) {
      const p = at(magnitudes, i) / totalMag;
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }

    // Normalize by max entropy (ln(N)) to get [0, 1]
    const maxEntropy = Math.log(n);
    if (maxEntropy === 0) return 0 as Float64;

    const normalized = entropy / maxEntropy;
    return (normalized < 0 ? 0 : normalized > 1 ? 1 : normalized) as Float64;
  }

  /**
   * Compute relational coupling: phase alignment between adjacent elements.
   *
   * [MATH] — R = (1/N) Σ cos(θ_{i+1} - θ_i) where θ_i = atan2(Im, Re).
   * Range [-1, 1]. We map to [0, 1] as (R + 1) / 2.
   * High coupling = smooth phase transitions (strong relational structure).
   * Low coupling = random phase jumps (weak relational structure).
   *
   * @param field — Interleaved complex field.
   * @returns Relational coupling in [0, 1].
   */
  static computeRelationalCoupling(field: Float64Array): Float64 {
    const n = Math.floor(field.length / 2);
    if (n < 2) return 0 as Float64;

    let sum = 0.0;
    for (let i = 0; i < n - 1; i++) {
      const re1 = field[2 * i] ?? 0;
      const im1 = field[2 * i + 1] ?? 0;
      const re2 = field[2 * (i + 1)] ?? 0;
      const im2 = field[2 * (i + 1) + 1] ?? 0;

      const theta1 = Math.atan2(im1, re1);
      const theta2 = Math.atan2(im2, re2);
      let diff = theta2 - theta1;

      // Wrap to [-π, π]
      while (diff > PI) diff -= 2 * PI;
      while (diff < -PI) diff += 2 * PI;

      sum += Math.cos(diff);
    }

    const avg = sum / (n - 1);
    // Map [-1, 1] to [0, 1]
    const normalized = (avg + 1.0) / 2.0;
    return (normalized < 0 ? 0 : normalized > 1 ? 1 : normalized) as Float64;
  }

  /**
   * Compute geometric differentiation: discrete gradient magnitude.
   *
   * [MATH] — K = (1/N) Σ |Ψ_{i+1} - Ψ_i|² / max(|Ψ|²).
   * Normalized to [0, 1]. High differentiation = sharp geometric features.
   * Low differentiation = smooth geometric form.
   *
   * @param field — Interleaved complex field.
   * @returns Geometric differentiation in [0, 1].
   */
  static computeGeometricDifferentiation(field: Float64Array): Float64 {
    const n = Math.floor(field.length / 2);
    if (n < 2) return 0 as Float64;

    // Find max magnitude squared for normalization
    let maxMagSq = 0.0;
    for (let i = 0; i < n; i++) {
      const re = field[2 * i] ?? 0;
      const im = field[2 * i + 1] ?? 0;
      const magSq = re * re + im * im;
      if (magSq > maxMagSq) maxMagSq = magSq;
    }

    if (maxMagSq === 0) return 0 as Float64;

    // Compute average squared difference between adjacent elements
    let sum = 0.0;
    for (let i = 0; i < n - 1; i++) {
      const re1 = field[2 * i] ?? 0;
      const im1 = field[2 * i + 1] ?? 0;
      const re2 = field[2 * (i + 1)] ?? 0;
      const im2 = field[2 * (i + 1) + 1] ?? 0;

      const diffRe = re2 - re1;
      const diffIm = im2 - im1;
      sum += (diffRe * diffRe + diffIm * diffIm) / maxMagSq;
    }

    const avg = sum / (n - 1);
    // Clamp to [0, 1] (can exceed 1 if adjacent elements differ more than max)
    return (avg < 0 ? 0 : avg > 1 ? 1 : avg) as Float64;
  }

  /**
   * Compute stabilization cost: S = (1 - coherence) / λ.
   *
   * [MATH] — S = (1 - C) / λ where λ = 1/φ² ≈ 0.382. This measures the
   * "cost" of maintaining the field's coherence. High coherence = low cost.
   * Low coherence = high cost. Normalized to [0, 1].
   *
   * @param coherence — Coherence value C in [0, 1].
   * @returns Stabilization cost in [0, 1].
   */
  static computeStabilizationCost(coherence: Float64): Float64 {
    const raw = (1.0 - coherence) / PHI_NEG2;
    // Clamp to [0, 1] (coherence can be 0 → raw = 1/0.382 ≈ 2.61)
    return (raw < 0 ? 0 : raw > 1 ? 1 : raw) as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Aggregate Metrics
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute total information density: ρ_I = (C + R + K + S) / 4.
   *
   * [PHIL] — Information density is the density of stabilized structured
   * distinction per scale-local domain. It increases with more resolved
   * distinctions, more relational dependencies, more geometric differentiation,
   * and more internal constraints.
   *
   * @param field — Interleaved complex field.
   * @param coherence — Coherence value C in [0, 1].
   * @returns Information density in [0, 1].
   */
  static computeDensity(field: Float64Array, coherence: Float64): Float64 {
    const C = this.computeComplexity(field);
    const R = this.computeRelationalCoupling(field);
    const K = this.computeGeometricDifferentiation(field);
    const S = this.computeStabilizationCost(coherence);

    const density = (C + R + K + S) / 4.0;
    return (density < 0 ? 0 : density > 1 ? 1 : density) as Float64;
  }

  /**
   * Compute mass: m = ρ_I · φ^(depth) · coherence.
   *
   * [PHIL] — Mass is the stabilization burden of information density at scale.
   * It is the field-cost of maintaining structured information across scale.
   * More complex = more measurement = more burden = more mass.
   *
   * [MATH] — m = ρ_I · φ^depth · C. The φ^depth factor accounts for the
   * hierarchical nesting of scales. Deeper in the tree (higher depth) =
   * more nested structure = more mass. Coherence modulates the mass:
   * incoherent structures have less effective mass.
   *
   * @param density — Information density ρ_I in [0, 1].
   * @param depth — Fractal depth (0 = root, higher = deeper).
   * @param coherence — Coherence value C in [0, 1].
   * @returns Mass (non-negative, unbounded theoretically, clamped to Float64 safe).
   */
  static computeMass(density: Float64, depth: number, coherence: Float64): Float64 {
    if (coherence <= 0) return 0 as Float64;

    const depthFactor = Math.pow(PHI, depth);
    const mass = density * depthFactor * coherence;

    // Clamp to prevent overflow
    if (!isFinite(mass)) return 1e150 as Float64;
    if (mass < 0) return 0 as Float64;
    if (mass > 1e150) return 1e150 as Float64;

    return mass as Float64;
  }

  /**
   * Compute inertia: resistance to reconfiguration.
   *
   * [PHIL] — Inertia is the resistance of an informationally stabilized
   * structure to deviation from its current recursive coherence. It is the
   * "reluctance" of the field to change its stabilized pattern.
   *
   * [MATH] — I = m · Σ|current_i - previous_i|² / (2 · C · fieldLen).
   * If no previous field, inertia = 0 (no prior state to resist change from).
   * Clamped to [0, 1000] to prevent overflow.
   *
   * @param current — Current field state.
   * @param previous — Previous field state (or null).
   * @param mass — Mass value.
   * @param coherence — Coherence value.
   * @returns Inertia (non-negative, clamped to [0, 1000]).
   */
  static computeInertia(
    current: Float64Array,
    previous: Float64Array | null,
    mass: Float64,
    coherence: Float64
  ): Float64 {
    if (previous === null || previous.length !== current.length) {
      return 0 as Float64;
    }
    if (coherence <= 0) return 0 as Float64;
    if (mass <= 0) return 0 as Float64;

    let sumSq = 0.0;
    for (let i = 0; i < current.length; i++) {
      const diff = (current[i] ?? 0) - (previous[i] ?? 0);
      sumSq += diff * diff;
    }

    const denominator = 2.0 * coherence * current.length;
    if (denominator === 0) return 0 as Float64;

    const inertia = mass * sumSq / denominator;

    // Clamp to [0, 1000]
    if (!isFinite(inertia)) return 0 as Float64;
    if (inertia < 0) return 0 as Float64;
    if (inertia > 1000) return 1000 as Float64;

    return inertia as Float64;
  }

  /**
   * Compute gravitational burden: field deformation from dense information.
   *
   * [PHIL] — Gravity is the field response to dense stabilized informational
   * structure. It is the deformation or recursive burden induced by dense
   * stabilized structure. Dense information "bends" the field around it.
   *
   * [MATH] — G = m · Σ|∂Ψ/∂x|² / fieldLen. The discrete gradient is
   * approximated as |magnitude_{i+1} - magnitude_i|² / fieldLen.
   *
   * @param field — Interleaved complex field.
   * @param mass — Mass value.
   * @returns Gravitational burden (non-negative).
   */
  static computeGravitationalBurden(field: Float64Array, mass: Float64): Float64 {
    const n = Math.floor(field.length / 2);
    if (n < 2) return 0 as Float64;
    if (mass <= 0) return 0 as Float64;

    // Compute magnitudes
    const magnitudes = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const re = field[2 * i] ?? 0;
      const im = field[2 * i + 1] ?? 0;
      magnitudes[i] = Math.sqrt(re * re + im * im);
    }

    // Compute discrete gradient squared
    let sumSq = 0.0;
    for (let i = 0; i < n - 1; i++) {
      const diff = at(magnitudes, i + 1) - at(magnitudes, i);
      sumSq += diff * diff;
    }

    const burden = mass * sumSq / field.length;

    if (!isFinite(burden)) return 0 as Float64;
    if (burden < 0) return 0 as Float64;

    return burden as Float64;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Full Analysis
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute all information density metrics in one call.
   *
   * @param field — Current field state.
   * @param previous — Previous field state (or null).
   * @param depth — Fractal depth.
   * @param coherence — Coherence value.
   * @returns Complete analysis with all metrics.
   */
  static analyze(
    field: Float64Array,
    previous: Float64Array | null,
    depth: number,
    coherence: Float64
  ): InformationDensityAnalysis {
    const complexity = this.computeComplexity(field);
    const relationalCoupling = this.computeRelationalCoupling(field);
    const geometricDifferentiation = this.computeGeometricDifferentiation(field);
    const stabilizationCost = this.computeStabilizationCost(coherence);

    const density = this.computeDensity(field, coherence);
    const mass = this.computeMass(density, depth, coherence);
    const inertia = this.computeInertia(field, previous, mass, coherence);
    const gravitationalBurden = this.computeGravitationalBurden(field, mass);

    return {
      complexity,
      relationalCoupling,
      geometricDifferentiation,
      stabilizationCost,
      density,
      mass,
      inertia,
      gravitationalBurden,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Utility: Mass-to-Frequency Conversion
  // ─────────────────────────────────══════════════════════════════════════════

  /**
   * Convert mass to characteristic frequency via E = mc² → E = hf.
   *
   * [PHIL] — In RHUFT, mass is information density, and frequency is the rate
   * of recursive self-measurement. This conversion bridges the mass-frequency
   * correspondence: heavier structures vibrate more slowly (lower frequency).
   *
   * [MATH] — f = f₀ / (1 + m) where f₀ is the base frequency. This is a
   * simplified version: more mass = lower frequency = slower update rate.
   *
   * @param mass — Mass value.
   * @param baseFrequency — Base frequency f₀ (default: 144 Hz, RHUFT resonance).
   * @returns Characteristic frequency.
   */
  static massToFrequency(mass: Float64, baseFrequency: number = 144.0): Float64 {
    if (mass < 0) return baseFrequency as Float64;
    const frequency = baseFrequency / (1.0 + mass);
    return (frequency > 0 ? frequency : 0) as Float64;
  }

  /**
   * Compute the information density gradient across the fractal tree.
   *
   * [MATH] — This measures how density changes with depth. A positive gradient
   * means density increases with depth (more information at smaller scales).
   * A negative gradient means density decreases with depth.
   *
   * @param densities — Array of densities at each depth level.
   * @returns Average density gradient.
   */
  static densityGradient(densities: Float64[]): Float64 {
    if (densities.length < 2) return 0 as Float64;

    let sum = 0.0;
    for (let i = 1; i < densities.length; i++) {
      sum += at(densities, i) - at(densities, i - 1);
    }

    return (sum / (densities.length - 1)) as Float64;
  }
}
