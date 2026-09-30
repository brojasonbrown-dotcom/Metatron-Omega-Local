/**
 * deepResolution — the continuous deep-resolution tap (Ω-REAL G4).
 *
 * The transcription tape keeps the 13-mode field signature; this module keeps
 * the DEEPER readout — the scale-graded field (per-rung energy/peak) and the
 * base-rung node-frequency spectrum — at a deterministic cadence, in a bounded
 * ring, so "how each node reacts through the scales" is retained at high
 * frequency, not just summarised. Observe-only: nothing here feeds the digest.
 *
 * Immutability: the tap stores a freshly-allocated Float64Array per frame, so a
 * pushed frame can never alias later engine state.
 */

export interface DeepFrame {
  /** Absolute tick this frame was captured at. */
  readonly tick: number;
  /** Per-rung field energy (length = rung count). */
  readonly energy: Float64Array;
  /** Per-rung peak |field| magnitude (length = rung count). */
  readonly peak: Float64Array;
  /** Base-rung mean |instantaneous frequency| across nodes, cycles/tick. */
  readonly meanFrequency: number;
  /** Base-rung frequency of the peak-energy convergence, cycles/tick. */
  readonly peakFrequency: number;
  /** Base-rung mean latched magnitude per spectral band (the φ ladder). */
  readonly occupancy: Float64Array;
  /** Base-rung relative transport closure defect |Σ div| / (Σ|div| + ε). */
  readonly closureDefect: number;
  /** 0-D topological persistence of the per-rung energy profile — the shape of the scale axis (how many distinct scales persist). */
  readonly persistence: number;
}

export interface DeepResolutionView {
  readonly size: number;
  readonly capacity: number;
  readonly latest: DeepFrame | null;
}

/**
 * Fibonacci ring capacity for the deep-resolution tap. At the MIND_STRIDE (21)
 * cadence, 233 frames retain ~2.7 minutes of deep resolution at a 30 Hz bus
 * while never letting the store dominate the footprint.
 */
export const DEEP_TAP_CAPACITY = 233;

/** Bounded, deterministic ring of deep-resolution frames. */
export class DeepResolutionTap {
  private readonly frames: DeepFrame[] = [];
  readonly capacity: number;

  constructor(capacity = DEEP_TAP_CAPACITY) {
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  get size(): number {
    return this.frames.length;
  }

  /** Append a frame; evict the oldest when full (strict LRU). */
  push(frame: DeepFrame): void {
    if (this.frames.length >= this.capacity) this.frames.shift();
    this.frames.push(frame);
  }

  latest(): DeepFrame | null {
    return this.frames.length ? this.frames[this.frames.length - 1] : null;
  }

  /** Most recent k frames, oldest first (bounded copy, never the live array). */
  tail(k: number): DeepFrame[] {
    return this.frames.slice(-Math.max(0, Math.floor(k)));
  }

  view(): DeepResolutionView {
    return { size: this.frames.length, capacity: this.capacity, latest: this.latest() };
  }
}
