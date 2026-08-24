/**
 * core/fractal_field.ts — Track G4 LIVE: fractal self-similarity of the real
 * field structure, MEASURED. (GEMATRIA_ENGINE_PLAN.md §G4; MASTER_PLAN_V3 §5.)
 *
 * Epistemic Status: [MEASURED ESTIMATE] — this is the integration layer that
 * connects the validated estimators in core/fractal_diagnostics.ts to the LIVE
 * whole-tree lattice. It RE-USES boxCountingDimension / discreteScaleInvariance /
 * censusLawHolds; it never re-implements an estimator and never attaches a
 * meaning. The one law (plan G0 / G5) is inherited unchanged: a self-similarity
 * measurement is DATA; no function here returns an interpretation.
 *
 * What is implemented:
 *   G4.1-live  fieldFractalDimension — box-counting dimension (with 95% CI) of
 *              the energy-support of the real [nodes][28] field lattice. The
 *              "field/mode structure" the plan names is measured directly: the
 *              lattice is reshaped to its native nodes × 28 grid, the field energy
 *              above the row-median is taken as the occupied set, and its
 *              box-counting dimension is returned. A flat / DC-only / degenerate
 *              lattice has no structure → null (never a fabricated dimension).
 *   G4.2-live  phiBandSelfSimilarity — the discrete-scale-invariance signature
 *              of a mode-power spectrum measured against the φ-band ladder
 *              (89·φ^(k/2), ratio √φ), recovering the log-spacing vs the theory
 *              PHI_BAND_LOG_SPACING = (1/2)·log φ.
 *   composite  fractalFieldReport — one snapshot { dimension+CI, dsi, census }.
 *              The census term re-verifies Cert 4.D1 live, so a broken census law
 *              surfaces in the same frame as the field dimension.
 *
 * What is REFUSED (unchanged from fractal_diagnostics.ts):
 *   · a dimension asserted without its confidence interval;
 *   · any claim that a measured self-similarity "means" anything.
 */

import {
  boxCountingDimension,
  discreteScaleInvariance,
  censusLawHolds,
  PHI_BAND_LOG_SPACING,
  type BoxCountResult,
  type DsiResult,
} from "./fractal_diagnostics.ts";

/** The locked field contract: 14 complex modes → 28 interleaved reals. [SPEC]
 *  Matches telemetry_tape.TAPE_FIELD_SIZE; declared locally so this module has
 *  no cognition-layer dependency (it is core/, reusable and engine-free). */
export const FIELD_LATTICE_WIDTH: number = 28;

/**
 * The result of measuring the live field's fractal dimension. Either a real
 * BoxCountResult (dimension + CI + r²), or null when the lattice carries no
 * measurable structure (flat / DC-only / too few nodes to threshold honestly).
 */
export type FieldFractalResult = BoxCountResult | null;

/**
 * Reshape a flattened lattice into its [nodes][28] grid and return the occupied
 * cell set: the integer (node, modeBin) coordinates whose field ENERGY exceeds
 * the row-median energy. This is the "field/mode structure" made countable.
 *
 * Honesty rules (each returns null — no invented structure):
 *   · length not a positive multiple of 28 → not a lattice, null;
 *   · fewer than 2 nodes → a single field has no 2-D support to count, null;
 *   · a node whose energy is ~0 (flat / DC-only) contributes no cells;
 *   · if NO node exceeds its own median (a perfectly uniform field) → null.
 *
 * The 28-element row is folded to 14 mode bins by pairing the interleaved
 * (re, im) reals into an energy re²+im², so the occupied set lives on the
 * native nodes × 14-mode grid — the lattice's true shape, not a forced one.
 */
export function fieldOccupiedCells(
  lattice: ArrayLike<number>,
): { cells: number[][]; nodes: number; modeBins: number } | null {
  const flat =
    lattice instanceof Float64Array ? lattice : Float64Array.from(lattice as ArrayLike<number>);
  const len = flat.length;
  if (len === 0 || len % FIELD_LATTICE_WIDTH !== 0) return null;
  const nodes = len / FIELD_LATTICE_WIDTH;
  if (nodes < 2) return null;
  const modeBins = FIELD_LATTICE_WIDTH / 2; // 14 (re,im) pairs

  // Per-node mode energies, then threshold above that node's OWN median so a
  // bright node and a dim node both contribute their structure (not their level).
  const cells: number[][] = [];
  for (let n = 0; n < nodes; n++) {
    const base = n * FIELD_LATTICE_WIDTH;
    const energy = new Array<number>(modeBins);
    let total = 0;
    for (let m = 0; m < modeBins; m++) {
      const re = flat[base + 2 * m]!;
      const im = flat[base + 2 * m + 1]!;
      const e = re * re + im * im;
      energy[m] = e;
      total += e;
    }
    if (total === 0) continue; // flat node → no structure, honestly skipped
    const sorted = [...energy].sort((a, b) => a - b);
    const median = sorted[modeBins >> 1]!;
    for (let m = 0; m < modeBins; m++) {
      if (energy[m]! > median) cells.push([n, m]);
    }
  }
  if (cells.length === 0) return null; // perfectly uniform → no occupied set
  return { cells, nodes, modeBins };
}

/**
 * The dyadic box scales for a nodes × 14-mode grid. Box-counting needs ≥ 3
 * scales for an honest slope (plan Gate G4); we use powers of 2 from 1 up to
 * the grid's smaller side, which for a 14-mode axis gives 1, 2, 4, 8 (4 scales).
 */
export function fieldBoxScales(nodes: number, modeBins: number): number[] {
  const span = Math.max(1, Math.min(nodes, modeBins));
  const scales: number[] = [];
  for (let s = 1; s <= span; s *= 2) scales.push(s);
  return scales;
}

/**
 * G4.1-live: the box-counting fractal dimension of the real field lattice,
 * with a 95% CI. Exploits the validated boxCountingDimension estimator on the
 * lattice's own occupied-cell support. Returns null (honest) when the lattice
 * has no measurable structure or too few scales to fit a line.
 */
export function fieldFractalDimension(lattice: ArrayLike<number>): FieldFractalResult {
  const occ = fieldOccupiedCells(lattice);
  if (occ === null) return null;
  const scales = fieldBoxScales(occ.nodes, occ.modeBins);
  const r = boxCountingDimension(occ.cells, scales);
  // boxCountingDimension is itself honest (NaN slope on <3 scales); surface that
  // as null so a caller never mistakes an un-estimable field for a real number.
  if (Number.isNaN(r.dimension)) return null;
  return r;
}

/**
 * G4.2-live: the discrete-scale-invariance signature of a mode-power spectrum,
 * measured against the φ-band ladder. `values` are the positive increasing axis
 * coordinates of the spectrum (e.g. the 14 band centres 89·φ^(k/2)); `power` is
 * the measured power at each. Returns the DsiResult; `isDiscreteScaleInvariant`
 * is true only when ≥3 peaks form a measurably even log-spaced ladder, and
 * `logSpacing` can then be compared to PHI_BAND_LOG_SPACING = (1/2)·log φ.
 */
export function phiBandSelfSimilarity(
  values: readonly number[],
  power: readonly number[],
): DsiResult {
  return discreteScaleInvariance(values, power);
}

/** The 14 φ-band centre coordinates (89·φ^(k/2), k=0…13): the value axis a
 *  measured mode-power spectrum is compared against. Pure geometry. [MATH] */
export function phiBandCentres(phi: number, numBands: number = 14): number[] {
  const ratio = Math.sqrt(phi);
  return Array.from({ length: numBands }, (_, k) => 89 * Math.pow(ratio, k));
}

/** One composite G4 snapshot of the live field: dimension + DSI + census law. */
export interface FractalFieldReport {
  /** G4.1-live: measured field dimension + CI, or null when no structure. */
  readonly dimension: FieldFractalResult;
  /** G4.2-live: DSI signature of the mode power (when provided), else null. */
  readonly dsi: DsiResult | null;
  /** The theory log-spacing the DSI measurement is compared against. */
  readonly phiBandLogSpacing: number;
  /** G4.3-live: Cert 4.D1 re-verified in this same frame (census law intact). */
  readonly censusLawHolds: boolean;
}

/**
 * The composite live G4 read. `lattice` is the whole-tree flattened [nodes][28]
 * field (as from snapshot_field_lattice()); `bandValues`/`bandPower` optionally
 * supply the mode-power spectrum for the DSI term. Either term degrades honestly
 * to null when its input carries no structure — the census law always reports.
 */
export function fractalFieldReport(
  lattice: ArrayLike<number>,
  bandValues?: readonly number[],
  bandPower?: readonly number[],
): FractalFieldReport {
  const dimension = fieldFractalDimension(lattice);
  const dsi =
    bandValues != null && bandPower != null
      ? phiBandSelfSimilarity(bandValues, bandPower)
      : null;
  return {
    dimension,
    dsi,
    phiBandLogSpacing: PHI_BAND_LOG_SPACING,
    censusLawHolds: censusLawHolds(),
  };
}
