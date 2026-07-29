/**
 * Engine entry — the exact public surface the chat responder uses.
 * Bundled by scripts/bundle-engine.mjs into engine-bundle.cjs (CJS).
 * Imports point DOWNWARD into the engine's DAG; nothing here is engine code.
 */
export { getScale, allScales, CONTINUATION } from "../../engine/src/core/scaleTable.ts";
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
export type { MeshSnapshot } from "../../engine/src/refinement/adaptiveMesh.ts";
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
