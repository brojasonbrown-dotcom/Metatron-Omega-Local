/**
 * Engine entry — the exact public surface the chat responder uses.
 * Bundled by scripts/bundle-engine.mjs into engine-bundle.cjs (CJS).
 * Imports point DOWNWARD into the engine's DAG; nothing here is engine code.
 */
export { getScale, allScales, CONTINUATION } from "../../engine/src/core/scaleTable.ts";
// ── Dual-registry reconciler (M5) — the engine↔mind scale bridge ────────────
// The canonical scale-axis reconciler: nearest Lucas-stable rung for any n, the
// exact scale law L(n)/T(n)/f(n) at ARBITRARY n (not just stable rungs), the
// reconciliation residual, and the provenance-tagged stable record. This is what
// lets the panel report the mind's scale navigation on the engine's exact math.
export {
  nearestStableRung,
  isStableRung,
  scaleLengthAt,
  scaleTimeAt,
  scaleFrequencyAt,
  reconciliationResidual,
  stableRecordAt,
} from "../../engine/src/core/scaleReconciler.ts";
export {
  lucas,
  fibonacci,
  isStable,
  stableScalesUpTo,
  lucasResidue,
  closureResidueMin,
  binetDefect,
  spectralLines,
} from "../../engine/src/core/lucas.ts";
export {
  PHI,
  PHI_INV,
  PHI_NEG2,
  PHI_NEG26,
  PLANCK_LENGTH,
  C,
  STABLE_SCALES,
  METATRON_SHELL,
  UNRESOLVED,
} from "../../engine/src/core/constants.ts";
// The φ-graded resolution ladder (analysis/resolutionLadder.ts): the canonical
// Fibonacci node counts the sensory ring can switch between, all ν = 0.5 stable.
export {
  RESOLUTION_LADDER,
  MAX_RESOLUTION,
  nearestRung,
  isRung,
} from "../../engine/src/analysis/resolutionLadder.ts";
export { Scaled } from "../../engine/src/core/provenance.ts";
export {
  torusForScale,
  surfaceArea,
  metatronShellFlux,
  isClosed,
} from "../../engine/src/geometry/torus.ts";
export {
  closureResidual,
  closureScore,
  minimallyOpenFloor,
} from "../../engine/src/geometry/closureResidual.ts";
export {
  initialCondition,
  spectralWeightSum,
  goldenPairSum,
  spectralAmplitudes,
} from "../../engine/src/geometry/lattice.ts";
export { MemoryKernel } from "../../engine/src/dynamics/memoryKernel.ts";
// ── Super-resolution spectral eigenmodes (analysis) ─────────────────────────
// The exact DFT eigen-decomposition of the live ring field — resolves the
// field's structure in the basis where the ring Laplacian is diagonal. Pure,
// Parseval-certified, computed live each tick.
export {
  eigenSpectrum,
  dominantModeIndex,
} from "../../engine/src/analysis/eigenmodes.ts";
export type { Eigenmode, Spectrum } from "../../engine/src/analysis/eigenmodes.ts";
// ── Multidimensional spectral layer (analysis) ───────────────────────────────
// The certified multidimensional stack: n-D Cartesian FFT (separable, Parseval
// -certified), the spherical-Bessel/Hankel radial transform (cubic-spline
// quadrature, inversion-certified), and the complexity probe that reads a
// field's true modal occupancy (entropy / participation / flatness / moments).
// All pure, all computed live from the field — nothing canned.
export {
  spectrumND,
  powerSpectrum,
  dominantBinND,
  unitaryPrefactor,
} from "../../engine/src/analysis/spectralND.ts";
export type { SpectrumND } from "../../engine/src/analysis/spectralND.ts";
export {
  sphericalBesselJ,
  radialTransform,
  inverseRadialTransform,
  inversionResidual,
  gaussLegendreRadial,
} from "../../engine/src/analysis/radialTransform.ts";
export type { RadialSpectrum } from "../../engine/src/analysis/radialTransform.ts";
export {
  probeCartesian,
  complexityFromPower,
} from "../../engine/src/analysis/complexityProbe.ts";
export type { ComplexityReport } from "../../engine/src/analysis/complexityProbe.ts";
export {
  Propagator,
  CFL_LIMIT,
  CFL_STABILITY_BOUNDARY,
} from "../../engine/src/dynamics/propagation.ts";
export { selfOverlap } from "../../engine/src/dynamics/selfMeasurement.ts";
export { LADDER, ladderNeighbors, octavePartners } from "../../engine/src/dynamics/crossScaleFlow.ts";
export { envelopeDensity, DensityField } from "../../engine/src/information/densityField.ts";
// ── Adaptive mesh refinement (Phases 1–4 + the live observer) ────────────────
// The φ-graded dyadic tree, the prolongation/restriction transfer operators,
// and AdaptiveMesh — the live curvature-driven observer the stability panel
// reports. All real, measured; nothing canned.
export { AdaptiveMesh } from "../../engine/src/refinement/adaptiveMesh.ts";
export type { MeshSnapshot, MeshLeaf } from "../../engine/src/refinement/adaptiveMesh.ts";
export {
  REFINE_GRADING,
  REFINE_THRESHOLD,
  COARSEN_THRESHOLD,
  CADENCE_MS,
  TARGET_USAGE,
} from "../../engine/src/refinement/constants.ts";
// ── Phase 4 transfer operators, exported so the live bundle carries them ─────
// Restriction is the Galerkin adjoint of prolongation (R = P, doubly
// stochastic): it conserves the integrated field exactly on coarsen. The mesh
// exercises it live; exporting the operators keeps the deployed bundle in step
// with the verified engine source (they were dead code here until wired).
export {
  prolongateBlock,
  PROLONGATION_WEIGHT,
  relativeConservationResidual,
} from "../../engine/src/refinement/prolongation.ts";
export {
  restrictBlock,
  restrictParent,
  restrictPartial,
  restrictionWeights,
  RESTRICTION_WEIGHT,
  roundTripDefect,
  relativeRoundTripDefect,
  energyRatio,
  restrictionConservationResidual,
  relativeRestrictionResidual,
} from "../../engine/src/refinement/restriction.ts";
