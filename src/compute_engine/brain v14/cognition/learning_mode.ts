/**
 * RHUFT Mind — P6-D Learning Mode Governor: the honest speed/consolidation dial
 *
 * Epistemic Status: [SPEC] — cognition policy. Every claim here is wired to a
 * real, measured lever; nothing asserts an unmeasured speedup.
 *
 * WHAT A "MODE" GENUINELY CONTROLS IN THIS MIND
 * The loop's only background-learning mechanism is the P6-A recall→reinjection
 * loop (reliving a remembered field lattice through the engine's deterministic
 * sensory door). That, plus idle-time replay of the genome, is the whole of the
 * "learn faster offline" lever. The RAM/depth budget is owned by the
 * HardwareGovernor (the measured depth-8 ceiling law) — a mode may DEFER to it,
 * never override it. So the three modes are an honest dial on background
 * consolidation throughput, gated by the resource governor:
 *
 *   EFFICIENT — live perception only. Reinjection OFF, replay OFF. Minimal
 *               background compute/RAM; the conservative default. The mind still
 *               learns from what it perceives (recognition + verified prediction
 *               gain); it simply does no OFFLINE reliving.
 *   TRAINING  — reinjection ON. As stable thoughts resolve, strongly-resonant
 *               memories are relived to consolidate their attractors. Higher
 *               throughput, bounded by the stability gate + anti-echo cooldown.
 *   REPLAY    — TRAINING plus: when the sensor bus is IDLE, the mind sweeps its
 *               own genome snapshots back through the sensory door to consolidate
 *               experience without new input. Bounded per idle stretch, and
 *               DEFERRED whenever the tree sits at the measured depth ceiling
 *               (no RAM headroom for the extra field evolution).
 *
 * This module is the pure, testable policy — it decides, the CognitiveLoop acts.
 * No engine state is touched here; the governor is READ, never written.
 */

/** The three learning modes. [SPEC] */
export type LearningMode = "EFFICIENT" | "TRAINING" | "REPLAY";

/** φ⁻¹ — the high-margin floor, reused as the replay similarity gate. [MATH] */
const PHI_INV = 0.6180339887498949;

/** Max genome snapshots replayed in a single idle stretch (F_5 = 5). [SPEC] */
export const REPLAY_MAX_PER_IDLE = 5;
/** Min ticks between idle replay sweeps (anti-thrash). [SPEC] */
export const REPLAY_MIN_INTERVAL_TICKS = 8;

/**
 * The policy state the loop reports each tick, so the governor can decide
 * without touching engine internals. All values are read-only snapshots.
 */
export interface ModeContext {
  /** Ticks since the loop started (monotonic). */
  readonly tick: number;
  /** Sensor frames currently queued (0 ⇒ the mind is idle this tick). */
  readonly queuedSensors: number;
  /** Auto-scaled tree depth (live, from engine scaling telemetry). */
  readonly depth: number;
  /** Governor's budgeted max depth (the measured ceiling the mode defers to). */
  readonly maxDepth: number;
  /** Measured EMA tick cost in ms (the governor's scaling signal). */
  readonly emaTickMs: number;
  /** Snapshots available in the genome (hot + warm); replay needs ≥ 1. */
  readonly genomeSize: number;
  /** Tick of the last replay sweep (for the anti-thrash interval). */
  readonly lastReplayTick: number;
}

/**
 * Pure mode governor. Decides whether reinjection and replay may run, given the
 * current mode and the live resource picture. Never mutates anything. [SPEC]
 */
export class LearningModeGovernor {
  private _mode: LearningMode = "EFFICIENT"; // conservative default

  get mode(): LearningMode {
    return this._mode;
  }

  /** Set the mode. Returns the previous mode (for an honest mode.change journal). */
  setMode(next: LearningMode): LearningMode {
    const prev = this._mode;
    this._mode = next;
    return prev;
  }

  /** Reinjection (P6-A) runs in TRAINING and REPLAY; never in EFFICIENT. */
  get reinjectionEnabled(): boolean {
    return this._mode !== "EFFICIENT";
  }

  /**
   * May the loop replay one genome snapshot this (idle) tick? Pure decision.
   *
   * Gates, each honest and necessary:
   *   - mode must be REPLAY;
   *   - the bus must be idle (replay never competes with live perception);
   *   - the genome must hold at least one snapshot to relive;
   *   - anti-thrash interval since the last sweep;
   *   - CO-GOVERNOR: the tree must NOT be pinned at the measured depth ceiling.
   *     At the ceiling the governor has no RAM headroom; replaying would evolve
   *     the field against a saturated tree, so we defer. The mode yields to the
   *     HardwareGovernor's law — it never overrides it.
   */
  mayReplay(ctx: ModeContext): { allow: boolean; reason: string } {
    if (this._mode !== "REPLAY") {
      return { allow: false, reason: `mode=${this._mode} (replay only in REPLAY)` };
    }
    if (ctx.queuedSensors > 0) {
      return { allow: false, reason: `bus busy (${ctx.queuedSensors} queued) — live perception wins` };
    }
    if (ctx.genomeSize < 1) {
      return { allow: false, reason: "genome empty — nothing to relive" };
    }
    if (ctx.tick - ctx.lastReplayTick < REPLAY_MIN_INTERVAL_TICKS) {
      return { allow: false, reason: `anti-thrash (${ctx.tick - ctx.lastReplayTick} < ${REPLAY_MIN_INTERVAL_TICKS} ticks)` };
    }
    if (ctx.depth >= ctx.maxDepth) {
      return {
        allow: false,
        reason: `co-governor defer: depth ${ctx.depth} at ceiling ${ctx.maxDepth} — no RAM headroom to relive`,
      };
    }
    return { allow: true, reason: "idle, headroom, genome non-empty" };
  }
}

export { PHI_INV };
