/**
 * rhuft-multiscale-engine — public API barrel.
 *
 * Single entry point for the verified multiscale core. Re-exports every module
 * as a NAMESPACED layer so the public surface mirrors the architecture (and the
 * `constants` name in core/ and refinement/ cannot collide):
 *
 *   import { core, geometry, dynamics } from "rhuft-multiscale-engine";
 *   const s = core.getScale(13);  const t = geometry.torusForScale(13);
 *
 * Layers (dependency order, lowest first):
 *   core        — constants, provenance, Lucas ladder, scale table (no deps)
 *   geometry    — torus, closure residual, lattice, basis generators
 *   dynamics    — memory kernel, propagation, self-measurement, cross-scale flow
 *   information — density field, burden, actualizer
 *   analysis    — spectral/eigenmode/radial probes (read-only observers)
 *   refinement  — adaptive mesh refinement (curvature, octree, prolong/restrict)
 *   engine      — multiscale engine, morphism pipeline, scale measurement, gate
 */

export * as core from "./core/index.ts";
export * as geometry from "./geometry/index.ts";
export * as dynamics from "./dynamics/index.ts";
export * as information from "./information/index.ts";
export * as analysis from "./analysis/index.ts";
export * as refinement from "./refinement/index.ts";
export * as engine from "./engine/index.ts";
