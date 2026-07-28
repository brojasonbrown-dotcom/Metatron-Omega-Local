/**
 * RHUFT Mind — Sensor Bus: validated fan-in of all sensory frames
 *
 * Epistemic Status: [SPEC] — Adapter-layer transport.
 *
 * Every sensor pushes SensoryFrames here; every frame is schema-validated
 * (schemas/validate.ts#validateSensoryFrame) BEFORE it can ever reach
 * FractalNodeEngine.process(). Invalid frames are counted and reported —
 * never silently repaired (TRUTH_SOURCES).
 *
 * The queue is bounded (Fibonacci F_11 = 89 frames [SPEC]); when full, the
 * OLDEST frame is dropped: the present matters more than a stale past.
 */

import { validateSensoryFrame, type SensoryFrame } from "./../../schemas/validate.ts";

export interface SensorBusStats {
  readonly accepted: number;
  readonly rejected: number;
  readonly dropped: number;
  readonly queued: number;
}

export class SensorBus {
  /** Bounded queue capacity: F_11 = 89. [SPEC] */
  readonly capacity: number = 89;

  private readonly _queue: SensoryFrame[] = [];
  private _accepted = 0;
  private _rejected = 0;
  private _dropped = 0;
  private _lastRejectReason: string | null = null;

  /**
   * Push a candidate frame. Returns true if accepted, false (with reason
   * retrievable via lastRejectReason) if validation failed.
   */
  push(candidate: unknown): boolean {
    const check = validateSensoryFrame(candidate);
    if (!check.ok) {
      this._rejected++;
      this._lastRejectReason = check.reason;
      return false;
    }
    this._queue.push(check.value);
    this._accepted++;
    if (this._queue.length > this.capacity) {
      this._queue.shift();
      this._dropped++;
    }
    return true;
  }

  /** Drain up to `max` frames (FIFO). */
  drain(max: number): SensoryFrame[] {
    if (max <= 0) return [];
    return this._queue.splice(0, Math.min(max, this._queue.length));
  }

  get lastRejectReason(): string | null {
    return this._lastRejectReason;
  }

  stats(): SensorBusStats {
    return {
      accepted: this._accepted,
      rejected: this._rejected,
      dropped: this._dropped,
      queued: this._queue.length,
    };
  }
}
