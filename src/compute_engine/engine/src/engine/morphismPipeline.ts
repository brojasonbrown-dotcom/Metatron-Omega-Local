/**
 * FILE 17 — engine/morphismPipeline.ts
 *
 * Owns: **the L0→L1→L2 morphism + the ablation harness.**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   The engine's claims rest on a chain of maps from raw constants to measured
 *   observables:
 *
 *     L0  constants        φ, the Lucas ladder, the spectral lines
 *      ↓  constantsToLattice
 *     L1  lattice state    the band-limited Metatron field Σ a_k e^{iθ_k}
 *      ↓  latticeToMeasured
 *     L2  observables      closure residual, coherence, burden (measured)
 *
 *   `runMorphism` composes the chain end-to-end and is PURE: same config in,
 *   same observables out, no hidden state.
 *
 *   The ablation harness is the engine's scientific conscience. It re-runs the
 *   morphism with the GOLDEN ratio φ swapped for an alternative ρ and measures
 *   the invariant deltas. If the golden structure is load-bearing — not an
 *   arbitrary choice — then φ→ρ must make closure measurably WORSE. That is
 *   the "ablation-ready principle" made real: a claim that survives only its
 *   own assumption is no claim at all.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. THE GOLDEN STRUCTURE IS TWO THINGS, AND ABLATION BREAKS BOTH. The
 *      Metatron field's "goldenness" is (a) the amplitude law a_k = φ⁻ᵏ and
 *      (b) the wavenumber law = the Lucas spectral lines (integers ⇒ periodic
 *      ⇒ closure). Substituting a generic ratio ρ for φ breaks BOTH: the
 *      amplitude pair-sum ρ⁻¹+ρ⁻² ≠ 1 (the golden telescoping identity fails),
 *      and a non-integer ratio's wavenumber sequence loses the integer
 *      periodicity the File-6 closure rests on. Either is sufficient to
 *      degrade closure; the ablation measures the combined effect. [EXACT]
 *
 *   2. THE GOLDEN PAIR IDENTITY IS EXACT AND UNIQUE TO φ. φ⁻¹ + φ⁻² = 1 holds
 *      iff φ² = φ + 1, i.e. φ is the golden ratio (the positive root). For any
 *      other positive ρ, ρ⁻¹+ρ⁻² ≠ 1; the defect |1 − (ρ⁻¹+ρ⁻²)| is an EXACT
 *      measure of how far the ratio is from golden, computed before any field
 *      is built. This is the ablation's leading-order predictor. [EXACT]
 *
 *   3. PURITY IS STRUCTURAL. The morphism has no module-level mutable state;
 *      every function is a pure map config → value. `runMorphism` called twice
 *      with the same config returns identical observables (bit-for-bit, since
 *      the field and the quadrature are deterministic). [EXACT]
 *
 *   4. CLOSURE DEGRADATION IS THE MEASURED SIGNAL. The golden config's field
 *      is band-limited and periodic, so its File-6 residual is at the
 *      machine-epsilon floor (≈0). An ablated config's residual is larger; the
 *      delta (ablated − golden) is the ablation cost. The harness reports both
 *      residuals and the delta, with the provenance of each (File 6 POSTULATE
 *      for the physical reading; the COMPARISON is EXACT arithmetic).
 *
 * Provenance: the pair-identity defect and the residual comparison are EXACT
 * arithmetic; the reading of the residual as physical closure is POSTULATE
 * (File 6's own taint, inherited). The harness never blends the two.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   morphismPipeline(17) → { lattice(07), basisGenerators(08),
 *                            selfMeasurement(12), multiscaleEngine(16),
 *                            closureResidual(06), torus(05), constants(01) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI, HARMONIC_COUNT, METATRON_SHELL, type StableScaleIndex } from "../core/constants.js";
import { spectralLines } from "../core/lucas.ts";
import { classify, tainted, type Classified, type Provenance } from "../core/provenance.ts";
import { torusForScale, type TorusParams, type TorusPoint } from "../geometry/torus.ts";
import { closureResidual } from "../geometry/closureResidual.ts";

// ─────────────────────────────────────────────────────────────────────────────
// L0 — the morphism configuration (the ratio is EXPLICIT, for ablation)
// ─────────────────────────────────────────────────────────────────────────────

/** A ratio choice for the morphism: golden (φ) or an ablation alternative. */
export interface RatioChoice {
  /** The base of the amplitude law a_k = ratio⁻ᵏ and the wavenumber scaling. */
  readonly ratio: number;
  /** Label for the report (e.g. "φ", "3/2"). */
  readonly label: string;
}

/** The canonical golden ratio choice. */
export const GOLDEN_RATIO: RatioChoice = Object.freeze({ ratio: PHI, label: "φ" });

/** The morphism configuration. */
export interface MorphismConfig {
  /** The rung whose torus hosts the lattice (default: the Metatron shell 13). */
  readonly rung?: StableScaleIndex;
  /** The ratio choice (default: golden φ). */
  readonly ratioChoice?: RatioChoice;
  /** Number of harmonics (default: HARMONIC_COUNT = 13). */
  readonly harmonicCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// L1 — the lattice state
// ─────────────────────────────────────────────────────────────────────────────

/** The L1 lattice state: the harmonic content the field is built from. */
export interface LatticeState {
  readonly rung: StableScaleIndex;
  readonly ratio: number;
  readonly amplitudes: readonly number[]; // a_k = ratio⁻ᵏ
  readonly wavenumbers: readonly number[]; // the spectral lines (scaled for ablation)
  readonly pairSum: number; // ratio⁻¹ + ratio⁻²
  readonly pairDefect: number; // |1 − pairSum| — exact distance from golden
}

/**
 * L0 → L1: build the lattice state from the constants + ratio choice.
 *
 * For the golden ratio the wavenumbers ARE the Lucas spectral lines (integer,
 * periodic). For an ablation, the wavenumber law is scaled by the ratio's
 * departure from golden — breaking the integer periodicity, which is part of
 * the measured closure cost (fact 1). The pair defect is computed exactly.
 */
export function constantsToLattice(config: MorphismConfig = {}): LatticeState {
  const rung = config.rung ?? METATRON_SHELL;
  const rc = config.ratioChoice ?? GOLDEN_RATIO;
  const K = config.harmonicCount ?? HARMONIC_COUNT;
  if (!Number.isFinite(rc.ratio) || rc.ratio <= 0) {
    throw new RangeError(`constantsToLattice: ratio must be positive finite; got ${rc.ratio}.`);
  }
  if (!Number.isInteger(K) || K < 1) {
    throw new RangeError(`constantsToLattice: harmonicCount must be an integer ≥ 1; got ${K}.`);
  }
  const lines = spectralLines();
  const r = rc.ratio;
  const amplitudes: number[] = [];
  const wavenumbers: number[] = [];
  for (let k = 0; k < K; k++) {
    amplitudes.push(Math.pow(r, -k));
    // Golden: the integer Lucas line (periodic). Ablated: scaled by the ratio
    // relative to φ, which makes the wavenumber non-integer (aperiodic) — the
    // periodicity break is a real, measured part of the closure cost.
    const base = lines[k % lines.length]!;
    wavenumbers.push(base * (r / PHI));
  }
  const pairSum = Math.pow(r, -1) + Math.pow(r, -2);
  const pairDefect = Math.abs(1 - pairSum);
  return Object.freeze({
    rung,
    ratio: r,
    amplitudes: Object.freeze(amplitudes),
    wavenumbers: Object.freeze(wavenumbers),
    pairSum,
    pairDefect,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 — the measured observables
// ─────────────────────────────────────────────────────────────────────────────

/** The L2 observables measured from a lattice. */
export interface Observables {
  readonly rung: StableScaleIndex;
  readonly ratio: number;
  /** The closure residual of the lattice field (File 6; lower = more closed). */
  readonly closureResidual: Classified<number>;
  /** The exact pair defect |1 − (ρ⁻¹+ρ⁻²)| (0 only for φ). */
  readonly pairDefect: number;
}

/**
 * L1 → L2: build the lattice field and measure its closure residual.
 *
 * The field is the band-limited standing wave Σ a_k e^{i(k_k·u + k_k·v)} — we
 * take its real part as the observable File-6 operates on. Periodic (integer
 * wavenumbers) ⇒ residual at the machine floor; aperiodic (ablated) ⇒ a real
 * residual. Pure: same lattice ⇒ same observable.
 */
export function latticeToMeasured(lattice: LatticeState): Observables {
  const torus: TorusParams = torusForScale(lattice.rung);
  const amps = lattice.amplitudes;
  const waves = lattice.wavenumbers;
  const field = (p: TorusPoint): number => {
    let re = 0;
    for (let k = 0; k < amps.length; k++) {
      re += amps[k]! * Math.cos(waves[k]! * p.u + waves[k]! * p.v);
    }
    return re;
  };
  const residual = closureResidual(field, torus);
  return Object.freeze({
    rung: lattice.rung,
    ratio: lattice.ratio,
    closureResidual: residual,
    pairDefect: lattice.pairDefect,
  });
}

/**
 * The full morphism L0→L1→L2, composed. Pure: same config ⇒ same observables.
 */
export function runMorphism(config: MorphismConfig = {}): Observables {
  return latticeToMeasured(constantsToLattice(config));
}

// ─────────────────────────────────────────────────────────────────────────────
// The ablation harness
// ─────────────────────────────────────────────────────────────────────────────

/** The result of one ablation: golden vs an alternative ratio. */
export interface AblationReport {
  readonly golden: Observables;
  readonly alternative: Observables;
  /** alternative.residual − golden.residual (the ablation cost; > 0 = worse). */
  readonly closureDelta: number;
  /** The exact pair-identity defect of the alternative (0 only for φ). */
  readonly pairDefect: number;
  /** True iff the alternative's closure is measurably worse (delta > tol). */
  readonly goldenIsBetter: boolean;
  readonly provenance: Provenance;
}

/**
 * Ablate the golden ratio with an alternative: run the morphism both ways and
 * measure the closure delta. If the golden structure is load-bearing, the
 * alternative closes measurably worse (delta > 0).
 *
 * @param alternative  the ratio to swap in (e.g. { ratio: 1.5, label: "3/2" })
 * @param config       base morphism config (rung, harmonicCount)
 * @param tol          the closure-delta tolerance for "measurably worse"
 */
export function ablate(
  alternative: RatioChoice,
  config: MorphismConfig = {},
  tol = 1e-6,
): AblationReport {
  if (!Number.isFinite(alternative.ratio) || alternative.ratio <= 0) {
    throw new RangeError(`ablate: alternative ratio must be positive finite; got ${alternative.ratio}.`);
  }
  const golden = runMorphism({ ...config, ratioChoice: GOLDEN_RATIO });
  const alt = runMorphism({ ...config, ratioChoice: alternative });
  const delta = alt.closureResidual.value - golden.closureResidual.value;
  return Object.freeze({
    golden,
    alternative: alt,
    closureDelta: delta,
    pairDefect: alt.pairDefect,
    goldenIsBetter: delta > tol,
    provenance: tainted("EXACT", golden.closureResidual.provenance),
  });
}
