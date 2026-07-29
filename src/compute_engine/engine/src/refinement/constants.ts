/**
 * refinement/constants.ts — φ-graded adaptive-mesh-refinement constants.
 *
 * Part of the AMR program (sandbox/ADAPTIVE_REFINEMENT_PLAN.md; CORE_VISION
 * §5.D Resolution Law / §5.E Graceful Downscale Law). Single source of truth for
 * every refinement threshold — no magic numbers in kernels (golden rule 3).
 *
 * Epistemic discipline: every constant carries a Provenance tag.
 *   EXACT     — mathematical identity (φ powers).
 *   POSTULATE — framework operating point, ablation-ready (golden rule 6).
 */

import { PHI, PHI_NEG2 } from "../core/constants.ts";

/** φ² = φ + 1 — the refinement-level resolution grading. EXACT.
 *  Each refinement level multiplies local resolution by φ² (≈2.618), preserving
 *  the engine's scale-invariance law R(s·φⁿ) = R(s)·(φ^(1/D))ⁿ exactly. */
export const REFINE_GRADING = PHI * PHI;

/** φ⁻² — the standing-wave-instability refinement threshold. EXACT.
 *  A node refines when its normalised local curvature λ exceeds φ⁻²·λ_ref.
 *  This is the same coherence threshold that appears in the Master Equation —
 *  a live control constant, not a tuning knob. */
export const REFINE_THRESHOLD = PHI_NEG2;

/** φ⁻⁴ = φ⁻²·φ⁻² — the coarsening threshold (hysteresis floor). EXACT.
 *  A node coarsens when λ falls below φ⁻⁴·λ_ref. The φ⁻²..φ⁻⁴ gap is the
 *  hysteresis band: a proven no-oscillation margin (a node that just refined
 *  cannot immediately re-coarsen), so the tree never chatters. */
export const COARSEN_THRESHOLD = PHI_NEG2 * PHI_NEG2;

/** Bytes per tree node, conservative estimate (64 KB). POSTULATE.
 *  Mirrors the legacy hardware_governor BYTES_PER_NODE so the RAM-tier ceiling
 *  (plan §0) is computed on the same footing as the measured governor. */
export const BYTES_PER_NODE = 64 * 1024;

/** Cognitive cadence the engine shares, ms (1000/φ⁴ ≈ 146). POSTULATE.
 *  Mirrors the legacy hardware_governor CADENCE_MS; the refinement budget is
 *  derived from the same cadence × target-usage share. */
export const CADENCE_MS = 146;

/** Default target resource-usage ratio (φ⁻² rounded to 0.35). POSTULATE.
 *  The engine aims to occupy ~35% of the headroom available to it, leaving the
 *  host responsive — the "good guest" operating point (CORE_VISION §5.E). */
export const TARGET_USAGE = 0.35;

/** RAM headroom hysteresis ratio for tier changes. POSTULATE.
 *  A tier change requires the available-RAM ratio to cross a tier boundary by
 *  more than this margin, so fluctuating background load does not make the
 *  tree oscillate between depths (anti-thrash, §5.E-22). */
export const TIER_HYSTERESIS = 0.1;
