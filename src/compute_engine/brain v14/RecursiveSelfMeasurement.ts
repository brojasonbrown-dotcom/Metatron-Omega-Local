/**
 * RHUFT v13 — Recursive Self-Measurement: Chapter 7 Deepening
 *
 * Implements self-measurement of self-measurement — nested cycles that measure
 * the measurement process itself. This is the ontological engine of recursive
 * depth: the system not only measures its field state, but measures the quality,
 * accuracy, and stability of its own measurement process.
 *
 * [PHIL] — A system that measures only its external state is blind to its own
 * blindness. Recursive self-measurement is the closure of the measurement loop:
 * the measurement process becomes itself the object of measurement. This is
 * the foundation of self-awareness in the RHUFT ontology: to know that one is
 * measuring, and to know the quality of that measurement.
 *
 * Epistemic Status: [SPEC] + [PHIL] — Mathematical ontology, not predictive physics.
 * All numeric values are IEEE-754 Float64 (≈15 significant digits).
 * Strictly deterministic — no random seeds, no entropy injection.
 * Scale-invariant by construction: all parameters are φ-scale-proportional.
 */

import {
  PHI,
  PHI_INV,
  PHI_SQUARED,
  PHI_CUBED,
  PHI_NEG2,
  PHI_NEG3,
  PHI_NEG5,
  CLOSURE_COUPLING,
} from "./core/constants.ts";

import {
  SelfMeasurementCycle,
  type SelfMeasurementResult,
} from "./self_measurement.ts";

import {
  phaseDriftMetric,
} from "./torus_recurrence.ts";

/** Float64 type alias for epistemic clarity. [SPEC] */
type Float64 = number;

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of a recursive self-measurement cycle.
 *
 * [PHIL] — The recursive cycle produces not just a next state, but a
 * complete diagnostic of the measurement process itself. It tells us
 * whether the first-level measurement was reliable, how much the
 * measurement process drifted, and what the stabilized measurement state is.
 */
export interface RecursiveMeasurementResult {
  /** Recursive state after the nested cycle: R_{t+1}. */
  readonly recursiveState: Float64Array;
  /** First-level measurement of the field Ψ_t. */
  readonly firstLevelResult: SelfMeasurementResult;
  /** Second-level measurement of the measurement process R_t. */
  readonly secondLevelResult: SelfMeasurementResult;
  /** Whether the second-level measurement detected first-level error. */
  readonly errorDetected: boolean;
  /** Magnitude of detected error (0 if none). */
  readonly errorMagnitude: Float64;
  /** Quality of directional projection [0, 1]. */
  readonly projectionQuality: Float64;
  /** Quality of geometric reflection [0, 1]. */
  readonly reflectionQuality: Float64;
  /** Quality of dimensional comparison [0, 1]. */
  readonly comparisonQuality: Float64;
  /** Quality of multiscale stabilization [0, 1]. */
  readonly stabilizationQuality: Float64;
  /** Recursive depth achieved in this cycle. */
  readonly depth: number;
}

/**
 * A directional filter for measurement projection.
 *
 * [PHIL] — Measurement is never omnidirectional and unbiased. Every
 * measurement selects certain directions and suppresses others. The
 * directional filter formalizes this selectivity: it is the "lens"
 * through which the field projects itself.
 */
export interface DirectionalFilter {
  /** Direction identifier (e.g., "complementary", "spherical", "toroidal", "scale"). */
  readonly direction: string;
  /** φ-scale proportional weight. */
  readonly weight: Float64;
  /** Filter function: transforms field in direction-specific way. */
  readonly filter: (field: Float64Array) => Float64Array;
}

/**
 * A scale-local logical constraint for multiscale stabilization.
 *
 * [PHIL] — Each scale in the fractal hierarchy has its own logical
 * constraints on what states are admissible. The multiscale stabilization
 * respects these constraints by stabilizing each scale separately and
 * then blending.
 */
export interface ScaleLocalConstraint {
  /** Scale index in the decomposition. */
  readonly scaleIndex: number;
  /** φ-scale proportional weight for this scale. */
  readonly weight: Float64;
  /** Constraint field for this scale (ideal/target state). */
  readonly constraint: Float64Array;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Internal Helpers — Deterministic, No Randomness
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute discrete Laplacian of a field.
 *
 * [MATH] — (∇²f)_i = f_{i-1} - 2f_i + f_{i+1} (1D discrete Laplacian).
 * Boundary points use mirror conditions: f_{-1} = f_1, f_n = f_{n-2}.
 */
function computeLaplacian(field: Float64Array): Float64Array {
  const n = field.length;
  const result = new Float64Array(n);
  if (n === 0) return result;
  if (n === 1) {
    result[0] = 0;
    return result;
  }

  // Mirror boundary: f_{-1} = f_1  →  laplacian_0 = 2(f_1 - f_0)
  result[0] = (2.0 * ((field[1] ?? 0) - (field[0] ?? 0))) as Float64;

  // Interior points: standard second difference
  for (let i = 1; i < n - 1; i++) {
    const left = field[i - 1] ?? 0;
    const center = field[i] ?? 0;
    const right = field[i + 1] ?? 0;
    result[i] = (left - 2.0 * center + right) as Float64;
  }

  // Mirror boundary: f_n = f_{n-2}  →  laplacian_{n-1} = 2(f_{n-2} - f_{n-1})
  result[n - 1] = (2.0 * ((field[n - 2] ?? 0) - (field[n - 1] ?? 0))) as Float64;

  return result;
}

/**
 * Compute local coherence field.
 *
 * [MATH] — C_local[i] = (f_i - mean(f_{i-1}, f_i, f_{i+1}))².
 * High coherence = low deviation = smooth neighborhood.
 */
function computeLocalCoherence(field: Float64Array): Float64Array {
  const n = field.length;
  const result = new Float64Array(n);
  if (n === 0) return result;

  for (let i = 0; i < n; i++) {
    const left = field[i - 1] ?? field[i] ?? 0;
    const center = field[i] ?? 0;
    const right = field[i + 1] ?? field[i] ?? 0;
    const mean = (left + center + right) / 3.0;
    const diff = center - mean;
    result[i] = (diff * diff) as Float64;
  }

  return result;
}

/**
 * Decompose a field into multiple scales using recursive averaging.
 *
 * [MATH] — Scale 0 = original field. Scale k+1 = average of adjacent pairs
 * in scale k, then upsampled by nearest-neighbor. This creates a multi-scale
 * representation where each scale captures progressively coarser structure.
 */
function decomposeScales(field: Float64Array, numScales: number): Float64Array[] {
  const scales: Float64Array[] = [new Float64Array(field)];
  let current = field;

  for (let s = 1; s < numScales; s++) {
    const downLen = Math.max(1, Math.floor(current.length / 2));
    const down = new Float64Array(downLen);
    for (let i = 0; i < downLen; i++) {
      const idx = 2 * i;
      const a = current[idx] ?? 0;
      const b = current[idx + 1] ?? a;
      down[i] = ((a + b) / 2.0) as Float64;
    }

    // Upsample by nearest-neighbor to match original length
    const up = new Float64Array(field.length);
    const scaleFactor = Math.pow(2, s);
    for (let i = 0; i < field.length; i++) {
      const srcIdx = Math.min(Math.floor(i / scaleFactor), downLen - 1);
      up[i] = down[srcIdx] ?? 0;
    }

    scales.push(up);
    current = down;
  }

  return scales;
}

/**
 * Compute L² norm of a field.
 *
 * [MATH] — ||f|| = √(Σ f_i²).
 */
function fieldNorm(field: Float64Array): Float64 {
  let sum = 0.0;
  for (let i = 0; i < field.length; i++) {
    const v = field[i] ?? 0;
    sum += v * v;
  }
  return Math.sqrt(sum) as Float64;
}

/**
 * Compute L² distance between two fields.
 *
 * [MATH] — d(f, g) = √(Σ (f_i - g_i)²).
 */
function fieldDistance(a: Float64Array, b: Float64Array): Float64 {
  const len = Math.min(a.length, b.length);
  let sum = 0.0;
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum) as Float64;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Standalone Computational Functions — Real, Deterministic, No Placeholders
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute directional projection of a field.
 *
 * [MATH] — P_dir[Ψ] = Σ_{d∈D} w_d · F_d[Ψ].
 * The projection is a weighted sum of direction-specific filtered versions
 * of the field. Each filter captures a different relational aspect.
 *
 * [PHIL] — No measurement is omnidirectional. The directional projection
 * formalizes the fact that every measurement is selective: it sees the
 * field through particular "lenses" and combines these partial views.
 */
export function computeDirectionalProjection(
  field: Float64Array,
  filters: DirectionalFilter[]
): Float64Array {
  if (filters.length === 0) return new Float64Array(field);

  let totalWeight = 0.0;
  const result = new Float64Array(field.length);

  for (const filter of filters) {
    const filtered = filter.filter(field);
    const weight = filter.weight;
    const len = Math.min(filtered.length, result.length);
    for (let i = 0; i < len; i++) {
      result[i] += (filtered[i] ?? 0) * weight;
    }
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    for (let i = 0; i < result.length; i++) {
      result[i] = (result[i] / totalWeight) as Float64;
    }
  }

  return result;
}

/**
 * Compute geometric reflection of a projected field.
 *
 * [MATH] — R_geom[Y; E] = (1/φ)·Y + (1/φ²)·E + (1/φ³)·G_geom[Y].
 * The geometric reflection adds a curvature-induced return term to the
 * standard boundary blend. G_geom[Y] is the discrete Laplacian of Y,
 * representing how the field's curvature causes it to "reflect back".
 *
 * [PHIL] — The boundary is not a passive mirror. It reflects the field
 * with modifications that depend on the field's own structure. Regions
 * of high curvature return more strongly than flat regions.
 */
export function computeGeometricReflection(
  projected: Float64Array,
  boundaryField: Float64Array,
  curvatureWeight: Float64 = PHI_NEG3
): Float64Array {
  const len = Math.min(projected.length, boundaryField.length);
  if (len === 0) return new Float64Array(0);

  const result = new Float64Array(len);
  const projWeight = PHI_INV;        // ≈ 0.618
  const boundWeight = PHI_NEG2;      // ≈ 0.382
  const curvWeight = curvatureWeight; // ≈ 0.236

  // Compute curvature-induced geometric reflection: G_geom[Y] = ∇²Y
  const curvature = computeLaplacian(projected);

  for (let i = 0; i < len; i++) {
    const y = projected[i] ?? 0;
    const e = boundaryField[i] ?? 0;
    const g = curvature[i] ?? 0;
    result[i] = (projWeight * y + boundWeight * e + curvWeight * g) as Float64;
  }

  return result;
}

/**
 * Compute dimensional comparison between current and reflected fields.
 *
 * [MATH] — C_dim(Ψ, Ỹ) = (Ψ - Ỹ) + γ·(∇²Ψ - ∇²Ỹ) + δ·(C_local(Ψ) - C_local(Ỹ)).
 * The discrepancy includes field difference, curvature difference, and
 * local coherence difference. This ensures structural sensitivity.
 *
 * [PHIL] — Two fields can have the same values but different stability.
 * Dimensional comparison measures the deeper structural difference:
 * does the field have the same "shape" as its reflection?
 */
export function computeDimensionalComparison(
  current: Float64Array,
  reflected: Float64Array,
  gamma: Float64 = PHI_NEG3,
  delta: Float64 = PHI_NEG5
): Float64Array {
  const len = Math.min(current.length, reflected.length);
  if (len === 0) return new Float64Array(0);

  const result = new Float64Array(len);

  // Laplacian difference: ∇²Ψ - ∇²Ỹ
  const lapCurrent = computeLaplacian(current);
  const lapReflected = computeLaplacian(reflected);

  // Local coherence difference: C_local(Ψ) - C_local(Ỹ)
  const cohCurrent = computeLocalCoherence(current);
  const cohReflected = computeLocalCoherence(reflected);

  for (let i = 0; i < len; i++) {
    const diff = (current[i] ?? 0) - (reflected[i] ?? 0);
    const lapDiff = (lapCurrent[i] ?? 0) - (lapReflected[i] ?? 0);
    const cohDiff = (cohCurrent[i] ?? 0) - (cohReflected[i] ?? 0);
    result[i] = (diff + gamma * lapDiff + delta * cohDiff) as Float64;
  }

  return result;
}

/**
 * Compute multiscale stabilization of a field under scale-local constraints.
 *
 * [MATH] — S_multi(Ψ, Δ; {L_s}) = Σ_s w_s · S(Ψ_s, Δ_s; L_s).
 * The field is decomposed into scales, each scale is stabilized against
 * its own discrepancy and constraint, and the results are blended.
 *
 * [PHIL] — Reality does not stabilize at a single scale. A stable atom
 * is not the same as a stable molecule. Multiscale stabilization ensures
 * coherence at all scales simultaneously.
 */
export function computeMultiscaleStabilization(
  current: Float64Array,
  discrepancy: Float64Array,
  constraints: ScaleLocalConstraint[]
): Float64Array {
  if (constraints.length === 0) {
    const cycle = new SelfMeasurementCycle();
    return cycle.stabilize(current, discrepancy, current);
  }

  const numScales = Math.min(constraints.length, 5);
  const scales = decomposeScales(current, numScales);
  const discScales = decomposeScales(discrepancy, numScales);

  const cycle = new SelfMeasurementCycle();
  let totalWeight = 0.0;
  const blended = new Float64Array(current.length);

  for (let s = 0; s < numScales; s++) {
    const scaleField = scales[s] ?? new Float64Array(current.length);
    const scaleDisc = discScales[s] ?? new Float64Array(current.length);
    const constraint = constraints[s];
    if (!constraint) continue;

    const weight = constraint.weight;
    const stabilized = cycle.stabilize(scaleField, scaleDisc, constraint.constraint);

    const len = Math.min(stabilized.length, blended.length);
    for (let i = 0; i < len; i++) {
      blended[i] += (stabilized[i] ?? 0) * weight;
    }
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    for (let i = 0; i < blended.length; i++) {
      blended[i] = (blended[i] / totalWeight) as Float64;
    }
  }

  return blended;
}

/**
 * Detect measurement error by comparing first and second level discrepancies.
 *
 * [MATH] — Error magnitude = |D₂ - D₁| / (D₁ + D₂ + ε).
 * If the measurement process is unstable (high D₂), the first-level
 * measurement is unreliable.
 *
 * [PHIL] — A measurement process that is itself unstable cannot produce
 * reliable measurements. The second-level discrepancy is the "wobble" of
 * the measurement instrument.
 */
export function detectMeasurementError(
  firstLevel: SelfMeasurementResult,
  secondLevel: SelfMeasurementResult
): { detected: boolean; magnitude: Float64 } {
  const d1 = fieldNorm(firstLevel.discrepancy);
  const d2 = fieldNorm(secondLevel.discrepancy);
  const eps = 1e-300;

  const magnitude = (Math.abs(d2 - d1) / (d1 + d2 + eps)) as Float64;
  const threshold = PHI_NEG2; // ≈ 0.382
  const detected = d2 > d1 || magnitude > threshold;

  return { detected, magnitude };
}

/**
 * Standalone function to compute a recursive measurement cycle.
 *
 * [MATH] — R_{t+1} = M_cycle(R_t, Ψ_t, M_t).
 */
export function computeRecursiveMeasurement(
  nodeId: string,
  field: Float64Array,
  boundaryField: Float64Array,
  memoryField: Float64Array | null,
  existingRSM?: RecursiveSelfMeasurement
): RecursiveMeasurementResult {
  const rsm = existingRSM ?? new RecursiveSelfMeasurement();
  return rsm.recursiveCycle(nodeId, field, boundaryField, memoryField);
}

/**
 * Create default directional filters for a field.
 *
 * [PHIL] — The default directions are complementary (polarity inversion),
 * spherical (radial decay), toroidal (circular shift), and scale-relative
 * (multi-scale averaging). These cover the four fundamental relational
 * modes of the RHUFT ontology.
 */
export function createDefaultDirectionalFilters(fieldLength: number): DirectionalFilter[] {
  const halfLen = Math.floor(fieldLength / 2);

  return [
    {
      direction: "complementary",
      weight: PHI_INV as Float64,
      filter: (field: Float64Array) => {
        const result = new Float64Array(field.length);
        for (let i = 0; i < field.length; i++) {
          result[i] = ((i % 2 === 0 ? 1.0 : -1.0) * (field[i] ?? 0)) as Float64;
        }
        return result;
      },
    },
    {
      direction: "spherical",
      weight: PHI_NEG2 as Float64,
      filter: (field: Float64Array) => {
        const result = new Float64Array(field.length);
        for (let i = 0; i < field.length; i++) {
          const r = Math.abs(i - halfLen) / (halfLen + 1.0);
          const decay = Math.exp(-r * PHI);
          result[i] = ((field[i] ?? 0) * decay) as Float64;
        }
        return result;
      },
    },
    {
      direction: "toroidal",
      weight: PHI_NEG3 as Float64,
      filter: (field: Float64Array) => {
        const shift = Math.floor(field.length / 4);
        const result = new Float64Array(field.length);
        for (let i = 0; i < field.length; i++) {
          const srcIdx = (i + shift) % field.length;
          result[i] = (field[srcIdx] ?? 0) as Float64;
        }
        return result;
      },
    },
    {
      direction: "scale-relative",
      weight: PHI_NEG5 as Float64,
      filter: (field: Float64Array) => {
        const result = new Float64Array(field.length);
        for (let i = 0; i < field.length; i++) {
          const left = field[i - 1] ?? field[i] ?? 0;
          const center = field[i] ?? 0;
          const right = field[i + 1] ?? field[i] ?? 0;
          result[i] = ((left + center + right) / 3.0) as Float64;
        }
        return result;
      },
    },
  ];
}

/**
 * Create default scale-local constraints for multiscale stabilization.
 */
export function createDefaultScaleConstraints(field: Float64Array, numScales: number): ScaleLocalConstraint[] {
  const constraints: ScaleLocalConstraint[] = [];
  const scales = decomposeScales(field, numScales);

  for (let s = 0; s < numScales; s++) {
    const weight = Math.pow(PHI_INV, s) as Float64;
    constraints.push({
      scaleIndex: s,
      weight,
      constraint: scales[s] ?? new Float64Array(field.length),
    });
  }

  return constraints;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. RecursiveSelfMeasurement Class — Nested Self-Measurement Cycles
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Implements recursive self-measurement: self-measurement of self-measurement.
 *
 * [PHIL] — The recursive self-measurement module closes the epistemic loop.
 * It not only measures the field, but measures the measurement process itself.
 * This is the ontological foundation of self-awareness: to know that one is
 * measuring, and to know the quality and reliability of that measurement.
 *
 * The recursive cycle follows:
 *   R_{t+1} = M_cycle(R_t, Ψ_t, M_t)
 * Where:
 *   - R_t = recursive self-measurement state
 *   - Ψ_t = original field state (the "boundary" for the measurement process)
 *   - M_t = memory of previous recursive states
 *   - M_cycle = the four-stage self-measurement cycle
 */
export class RecursiveSelfMeasurement {
  private readonly _cycle: SelfMeasurementCycle;
  private readonly _recursiveState: Map<string, Float64Array>;
  private readonly _recursiveHistory: Map<string, RecursiveMeasurementResult[]>;

  constructor() {
    this._cycle = new SelfMeasurementCycle();
    this._recursiveState = new Map();
    this._recursiveHistory = new Map();
  }

  /**
   * Directional projection: P_dir[Ψ] = Σ w_d · F_d[Ψ].
   *
   * [PHIL] — Measurement is never omnidirectional. Every measurement
   * selects certain aspects and suppresses others.
   */
  directionalProject(field: Float64Array, filters: DirectionalFilter[]): Float64Array {
    return computeDirectionalProjection(field, filters);
  }

  /**
   * Geometric reflection: R_geom[Y; E] = (1/φ)·Y + (1/φ²)·E + (1/φ³)·G_geom[Y].
   *
   * [PHIL] — The boundary reflects not just amplitude, but curvature.
   * Regions of high curvature experience stronger geometric return.
   */
  geometricReflect(
    projected: Float64Array,
    boundaryField: Float64Array,
    curvatureWeight: Float64 = PHI_NEG3
  ): Float64Array {
    return computeGeometricReflection(projected, boundaryField, curvatureWeight);
  }

  /**
   * Dimensional comparison: C_dim(Ψ, Ỹ) = (Ψ - Ỹ) + γ·(∇²Ψ - ∇²Ỹ) + δ·(C_local(Ψ) - C_local(Ỹ)).
   *
   * [PHIL] — Two fields can have the same values but different stability.
   * Dimensional comparison detects structural differences.
   */
  dimensionalCompare(
    current: Float64Array,
    reflected: Float64Array,
    gamma: Float64 = PHI_NEG3,
    delta: Float64 = PHI_NEG5
  ): Float64Array {
    return computeDimensionalComparison(current, reflected, gamma, delta);
  }

  /**
   * Multiscale stabilization: S_multi(Ψ, Δ; {L_s}) = Σ_s w_s · S(Ψ_s, Δ_s; L_s).
   *
   * [PHIL] — Stability is not a single-scale property. A field must be
   * stable at all scales simultaneously to be truly stable.
   */
  multiscaleStabilize(
    current: Float64Array,
    discrepancy: Float64Array,
    constraints: ScaleLocalConstraint[]
  ): Float64Array {
    return computeMultiscaleStabilization(current, discrepancy, constraints);
  }

  /**
   * Run a single recursive self-measurement cycle.
   *
   * [MATH] — R_{t+1} = M_cycle(R_t, Ψ_t, M_t).
   * The recursive state R_t is measured against the original field Ψ_t
   * as boundary, using memory M_t as the previous recursive state.
   *
   * [PHIL] — This is the core of recursive self-measurement. The system
   * measures its own measurement process: it asks "how well am I measuring?"
   * and updates its measurement state based on the answer.
   */
  recursiveCycle(
    nodeId: string,
    field: Float64Array,
    boundaryField: Float64Array,
    memoryField: Float64Array | null
  ): RecursiveMeasurementResult {
    // Step 1: First-level measurement of the field
    const firstLevel = this._cycle.cycle(field, boundaryField);

    // Step 2: Get or initialize recursive state
    let recursiveState = this._recursiveState.get(nodeId);
    if (!recursiveState || recursiveState.length !== field.length) {
      recursiveState = new Float64Array(field.length);
      // Initialize with a small curvature-derived value to ensure non-trivial state
      const lap = computeLaplacian(field);
      for (let i = 0; i < field.length; i++) {
        recursiveState[i] = (lap[i] ?? 0) * PHI_NEG5;
      }
    }

    // Step 3: Build memory for recursive cycle
    const recursiveBoundary = memoryField !== null ? memoryField : firstLevel.nextState;

    // Step 4: Second-level measurement of the recursive state
    const secondLevel = this._cycle.cycle(recursiveState, recursiveBoundary);

    // Step 5: Detect first-level errors using second-level information
    const error = this._detectFirstLevelError(firstLevel, secondLevel);

    // Step 6: Compute quality metrics
    const projQuality = this._computeProjectionQuality(firstLevel.projected, field);
    const reflQuality = this._computeReflectionQuality(firstLevel.reflected, firstLevel.projected);
    const compQuality = this._computeComparisonQuality(firstLevel.discrepancy, field);
    const stabQuality = this._computeStabilizationQuality(firstLevel.nextState, field, boundaryField);

    // Step 7: Update recursive state (R_{t+1} = secondLevel.nextState)
    const newRecursiveState = new Float64Array(secondLevel.nextState);
    this._recursiveState.set(nodeId, newRecursiveState);

    // Step 8: Build and store result
    const result: RecursiveMeasurementResult = {
      recursiveState: newRecursiveState,
      firstLevelResult: firstLevel,
      secondLevelResult: secondLevel,
      errorDetected: error.detected,
      errorMagnitude: error.magnitude,
      projectionQuality: projQuality,
      reflectionQuality: reflQuality,
      comparisonQuality: compQuality,
      stabilizationQuality: stabQuality,
      depth: 2,
    };

    if (!this._recursiveHistory.has(nodeId)) {
      this._recursiveHistory.set(nodeId, []);
    }
    this._recursiveHistory.get(nodeId)!.push(result);

    return result;
  }

  /**
   * Detect errors in the first-level measurement using second-level information.
   *
   * [MATH] — Error magnitude = |D₂ - D₁| / (D₁ + D₂ + ε).
   * If the measurement process is unstable (high D₂), the first-level
   * measurement is unreliable.
   */
  private _detectFirstLevelError(
    firstLevel: SelfMeasurementResult,
    secondLevel: SelfMeasurementResult
  ): { detected: boolean; magnitude: Float64 } {
    return detectMeasurementError(firstLevel, secondLevel);
  }

  /**
   * Compute projection quality: how well the projection preserves the field.
   *
   * [MATH] — Q_proj = 1 - d(projected, field) / (||field|| + ε).
   */
  private _computeProjectionQuality(projected: Float64Array, field: Float64Array): Float64 {
    const dist = fieldDistance(projected, field);
    const norm = fieldNorm(field);
    const eps = 1e-300;
    const quality = (1.0 - dist / (norm + eps)) as Float64;
    return (quality < 0.0 ? 0.0 : quality > 1.0 ? 1.0 : quality) as Float64;
  }

  /**
   * Compute reflection quality: how well the reflection preserves the projection.
   *
   * [MATH] — Q_refl = 1 - d(reflected, projected) / (||projected|| + ε).
   */
  private _computeReflectionQuality(reflected: Float64Array, projected: Float64Array): Float64 {
    const dist = fieldDistance(reflected, projected);
    const norm = fieldNorm(projected);
    const eps = 1e-300;
    const quality = (1.0 - dist / (norm + eps)) as Float64;
    return (quality < 0.0 ? 0.0 : quality > 1.0 ? 1.0 : quality) as Float64;
  }

  /**
   * Compute comparison quality: how meaningful the discrepancy is.
   *
   * [MATH] — Q_comp = exp(-||discrepancy|| / (||field|| + ε)).
   * Small discrepancy = high quality (good agreement).
   */
  private _computeComparisonQuality(discrepancy: Float64Array, field: Float64Array): Float64 {
    const discNorm = fieldNorm(discrepancy);
    const fNorm = fieldNorm(field);
    const eps = 1e-300;
    const quality = Math.exp(-discNorm / (fNorm + eps)) as Float64;
    return (quality < 0.0 ? 0.0 : quality > 1.0 ? 1.0 : quality) as Float64;
  }

  /**
   * Compute stabilization quality: how much the next state improved.
   *
   * [MATH] — Q_stab = 1 - d(nextState, boundary) / (d(field, boundary) + ε).
   * If nextState is closer to boundary than field was, stabilization succeeded.
   */
  private _computeStabilizationQuality(
    nextState: Float64Array,
    field: Float64Array,
    boundary: Float64Array
  ): Float64 {
    const distNext = fieldDistance(nextState, boundary);
    const distField = fieldDistance(field, boundary);
    const eps = 1e-300;
    const quality = (1.0 - distNext / (distField + eps)) as Float64;
    return (quality < 0.0 ? 0.0 : quality > 1.0 ? 1.0 : quality) as Float64;
  }

  /**
   * Run a nested cycle with specified depth.
   *
   * [MATH] — Level 1: M_cycle(Ψ_t, B).
   * Level 2: M_cycle(R_t, Ψ_t).
   * Level 3+: M_cycle(R_t^{(k)}, R_t^{(k-1)}).
   * Each level measures the measurement state of the previous level.
   *
   * [PHIL] — Nested measurement is the ladder of self-awareness. Each
   * rung asks "how well is the level below measuring?"
   */
  nestedCycle(
    nodeId: string,
    field: Float64Array,
    boundaryField: Float64Array,
    depth: number
  ): RecursiveMeasurementResult {
    if (depth <= 1) {
      const firstLevel = this._cycle.cycle(field, boundaryField);
      return {
        recursiveState: firstLevel.nextState,
        firstLevelResult: firstLevel,
        secondLevelResult: firstLevel,
        errorDetected: false,
        errorMagnitude: 0 as Float64,
        projectionQuality: 1 as Float64,
        reflectionQuality: 1 as Float64,
        comparisonQuality: 1 as Float64,
        stabilizationQuality: 1 as Float64,
        depth: 1,
      };
    }

    // Start with depth 2
    let result = this.recursiveCycle(nodeId, field, boundaryField, null);

    // For each additional level, measure the recursive state against itself
    for (let level = 3; level <= depth; level++) {
      const rState = result.recursiveState;
      const sState = result.secondLevelResult.nextState;
      result = this.recursiveCycle(nodeId, rState, sState, null);
    }

    return {
      ...result,
      depth,
    };
  }

  /**
   * Compute phase drift of the recursive state over time.
   *
   * [MATH] — Phase drift between successive recursive states.
   */
  computeRecursivePhaseDrift(nodeId: string): Float64 {
    const history = this._recursiveHistory.get(nodeId);
    if (!history || history.length < 2) return 0 as Float64;

    const prev = history[history.length - 2];
    const curr = history[history.length - 1];
    return phaseDriftMetric(prev.recursiveState, curr.recursiveState);
  }

  /**
   * Get the recursive state for a node.
   */
  getRecursiveState(nodeId: string): Float64Array | null {
    return this._recursiveState.get(nodeId) ?? null;
  }

  /**
   * Get recursive measurement history for a node.
   */
  getRecursiveHistory(nodeId: string): readonly RecursiveMeasurementResult[] {
    return this._recursiveHistory.get(nodeId) ?? [];
  }

  /**
   * Compute the average projection quality across recorded history.
   */
  averageProjectionQuality(nodeId: string): Float64 {
    const history = this._recursiveHistory.get(nodeId);
    if (!history || history.length === 0) return 0 as Float64;
    let sum = 0.0;
    for (const h of history) {
      sum += h.projectionQuality;
    }
    return (sum / history.length) as Float64;
  }

  /**
   * Compute the average error magnitude across recorded history.
   */
  averageErrorMagnitude(nodeId: string): Float64 {
    const history = this._recursiveHistory.get(nodeId);
    if (!history || history.length === 0) return 0 as Float64;
    let sum = 0.0;
    for (const h of history) {
      sum += h.errorMagnitude;
    }
    return (sum / history.length) as Float64;
  }

  /**
   * Get the global error rate: fraction of nodes with detected errors.
   */
  getGlobalErrorRate(): Float64 {
    if (this._recursiveHistory.size === 0) return 0 as Float64;
    let errorCount = 0;
    let totalEntries = 0;
    for (const [, history] of this._recursiveHistory) {
      for (const entry of history) {
        totalEntries++;
        if (entry.errorDetected) errorCount++;
      }
    }
    if (totalEntries === 0) return 0 as Float64;
    return (errorCount / totalEntries) as Float64;
  }

  /**
   * Get the number of tracked nodes.
   */
  getTrackedNodeCount(): number {
    return this._recursiveState.size;
  }

  /**
   * Reset all state for a node.
   */
  resetNode(nodeId: string): void {
    this._recursiveState.delete(nodeId);
    this._recursiveHistory.delete(nodeId);
  }

  /**
   * Reset all state for all nodes.
   */
  reset(): void {
    this._recursiveState.clear();
    this._recursiveHistory.clear();
  }
}
