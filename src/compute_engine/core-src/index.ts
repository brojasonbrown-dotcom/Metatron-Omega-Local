/**
 * METATRON V11 — core barrel
 *
 * Foundation layer. Phase 1: numerics + Wolfram-verified constants.
 * Subsequent phases (topology, drivers, field, controller, verify, frameworks)
 * register through this module.
 */

export * as Real from './numerics/Real';
export * as Complex from './numerics/Complex';
export * as Linalg from './numerics/Linalg';
export * as Constants from './constants/WolframVerified';
