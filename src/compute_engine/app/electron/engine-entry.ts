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
