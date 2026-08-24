/**
 * RHUFT Mind — Sensory-Depth Scaling Law (hardware-relative, futureproof).
 *
 * Epistemic Status: [SPEC] — Adapter-layer policy. ADDITIVE module, no engine change.
 *
 * THE OPERATOR'S LAW (2026-08-17): "sensory depth scales with the engine and the
 * hardware, and must scale BEYOND modern hardware — futureproof." This module is
 * that law, made honest.
 *
 * WHY HARDWARE-RELATIVE (the futureproof argument). An absolute depth or octave
 * count is calibrated to one machine and rots on the next. The governor's
 * `maxDepth` is NOT absolute: it is derived from `totalmem()` at boot
 * (`hardware_governor._compute_budget` — available RAM ÷ BYTES_PER_NODE →
 * log₂ → clamp to [1, 9]). Bigger hardware yields a higher `maxDepth`; the
 * structural ceiling is 9 (the canonical ladder's 9 descents). So the ratio
 *
 *     fill = min(depth, maxDepth) / maxDepth
 *
 * is a **hardware-relative** measure of "how much of what this machine can do the
 * engine is currently doing." On a future machine with more RAM, `maxDepth` rises
 * and the SAME ratio maps to proportionally deeper sensory resolution — no
 * retuning, no per-machine constants. That is the futureproofing.
 *
 * THE LIVE THROTTLE. `fill` is the *structural* headroom. The measured
 * `emaTickMs` (the same signal the governor scales on) is the *live* throttle:
 * when the engine is over its cadence budget, sensory depth drops to MIN regardless
 * of structural headroom — perception never competes with the engine for the tick
 * (E5/E7: the sensory door stays open; the *resolution* of what is remembered
 * yields, the live dynamics never do).
 *
 * OCTAVES AS THE RESOLUTION DIAL. `hiResFieldFromLuminanceGrid`'s `octaves` is the
 * fine-structure dial: more octaves = finer spatial-frequency rings resolved =
 * the percept separates nearer-identical scenes (eye spacing, micro-edges). The
 * φ-lawful ladder is Fibonacci: 3, 5, 8 (F₄/F₅/F₆) — coarse, standard, deep.
 * The default is the middle rung; the governor's fill moves it up or down.
 *
 * Deterministic, RNG-free, opt-in. The fast 89×55→28-field path is untouched.
 */

/** Sensory depth rungs (octave counts): F₄/F₅/F₆ — coarse / standard / deep. [SPEC] */
export const SENSORY_OCTAVES_MIN = 3;
export const SENSORY_OCTAVES_STANDARD = 6;
export const SENSORY_OCTAVES_MAX = 8;

/**
 * The governor telemetry the dial reads — the exact shape of
 * `FractalNodeEngine.get_scaling_telemetry()`. Structural: anything carrying
 * these four numbers drives the law (testable with a plain object). [SPEC]
 */
export interface SensoryDepthTelemetry {
  /** Current auto-scaled tree depth. */
  readonly depth: number;
  /** Governor's measured max depth for THIS hardware (RAM-derived, ceiling 9). */
  readonly maxDepth: number;
  /** Measured EMA tick cost in ms — the live throttle signal. */
  readonly emaTickMs: number;
  /** The engine's cadence budget in ms (ticks must stay under this). */
  readonly budgetMs: number;
}

/** The resolved sensory-depth decision, with the honest reason for the journal. */
export interface SensoryDepthDecision {
  /** Octave count for the hi-res field encoder (3 | 5 | 8). */
  readonly octaves: number;
  /** The hardware-relative structural fill ∈ [0,1] the decision was derived from. */
  readonly fill: number;
  /** True when the live tick cost forced the minimal depth regardless of fill. */
  readonly throttled: boolean;
  /** Why — for the honest journal. */
  readonly reason: string;
}

/**
 * Resolve the sensory depth for this capture from governor telemetry.
 *
 * Law:
 *   - throttle:  emaTickMs > budgetMs          → MIN (live overload trumps all)
 *   - deep:      fill ≥ 2/3 (≈ φ⁻¹ headroom)   → MAX (this machine has room, use it)
 *   - standard:  fill ≥ 1/3 (≈ φ⁻²)            → STANDARD (the default rung)
 *   - else:                                     → MIN (little structural headroom)
 *
 * The 1/3 and 2/3 bands are φ⁻² ≈ 0.382 and φ⁻¹ ≈ 0.618 rounded to the clean
 * thirds — stated honestly as policy dials, not derived constants. [SPEC]
 */
export function resolveSensoryDepth(t: SensoryDepthTelemetry): SensoryDepthDecision {
  const maxDepth = Math.max(1, t.maxDepth);
  const fill = Math.min(Math.max(t.depth, 0), maxDepth) / maxDepth;

  // Live overload: the engine is over budget — drop to minimal depth regardless
  // of structural headroom. Perception yields; the tick never starves. [E5/E7]
  if (t.emaTickMs > t.budgetMs) {
    return {
      octaves: SENSORY_OCTAVES_MIN,
      fill,
      throttled: true,
      reason: `live overload: emaTick ${t.emaTickMs.toFixed(1)}ms > budget ${t.budgetMs.toFixed(0)}ms → min depth`,
    };
  }

  if (fill >= 2 / 3) {
    return {
      octaves: SENSORY_OCTAVES_MAX,
      fill,
      throttled: false,
      reason: `deep: engine at ${(fill * 100).toFixed(0)}% of this hardware's max depth → F₆ = 8 octaves`,
    };
  }
  if (fill >= 1 / 3) {
    return {
      octaves: SENSORY_OCTAVES_STANDARD,
      fill,
      throttled: false,
      reason: `standard: engine at ${(fill * 100).toFixed(0)}% of max depth → F₅ = 6 octaves`,
    };
  }
  return {
    octaves: SENSORY_OCTAVES_MIN,
    fill,
    throttled: false,
    reason: `coarse: engine at ${(fill * 100).toFixed(0)}% of max depth → F₄ = 3 octaves`,
  };
}
