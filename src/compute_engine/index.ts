/**
 * rhuft-compute-engine — unified public surface (M6).
 *
 * ONE import reaches both halves of the unified system, namespaced so nothing
 * collides:
 *
 *   import { core, mind } from "rhuft-compute-engine";
 *   core.scaleLengthAt(96);            // verified engine core (exact, provenance)
 *   mind.FractalNode;                  // v14 mind/cognition layer
 *
 *   - `core` — the verified multiscale engine (geometry/dynamics/information/
 *     analysis/refinement/engine). Namespaced layers, 0-error strict, 422 tests.
 *   - `mind` — the brain-v14 cognition layer (its existing barrel, re-exported
 *     as a namespace). 0-error strict under the unified config, 335 tests.
 *
 * Both compile under the single strict soundness core (tsconfig.base.json) and
 * are gated by the single vitest workspace. This barrel is the seamless surface;
 * it adds no logic and changes no behaviour.
 */

// Verified engine core — namespaced layers (core/geometry/dynamics/…).
export * from "./engine/src/index.js";

// Mind / cognition layer — its full barrel as a single namespace.
export * as mind from "./brain v14/index.js";
