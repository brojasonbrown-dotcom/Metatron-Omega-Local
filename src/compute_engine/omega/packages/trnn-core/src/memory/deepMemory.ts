/**
 * deepMemory — the extended-precision deep-memory tier (Ω-REAL).
 *
 * The live tick path stays f64 (fast, deterministic, certified). This module is
 * the DEEP archival tier: it stores patterns whose φ-mode amplitudes fall below
 * the float64 half-ULP (|k| > 76) using the exact Z[φ] representation (phiExact),
 * so deep structure survives that the f64 stores (braid/crossSection/project)
 * silently drop.
 *
 * Weighting is cross-wired with the resonance index and the depth reading — a
 * pattern persists at weight = resonance × depth, the same law the cross-section
 * write path uses (host.foldMemory multiplies the resonance index by the depth).
 * Recall reuses the canonical FHRR CleanupMemory substrate. Observe-only,
 * deterministic, OFF the tick path.
 */

import { CleanupMemory, type Hypervector, type CleanupHit } from '../substrate/vsa';
import type { ResonanceIndex } from '../measure/resonanceIndex';
import type { DepthReading } from '../measure/depth';
import { phiPowExact, PHI_F64_MODE_CEILING, type PhiExact } from './phiExact';

/** One exact deep φ-mode amplitude (φ^-|k|), stored losslessly. */
export interface DeepMode {
  readonly k: number;
  readonly amp: PhiExact;
}

/** A stored deep pattern. */
export interface DeepPattern {
  readonly key: string;
  readonly hv: number[];
  readonly depth: number;
  readonly resonance: number;
  /** Combined weight = resonance × depth (the cross-section write law). */
  readonly weight: number;
  /** Exact deep φ-modes (|k| > f64 ceiling) this pattern carries. */
  readonly deepModes: DeepMode[];
}

export interface DeepMemoryOptions {
  readonly dim?: number;
  readonly capacity?: number;
}

export class DeepMemory {
  private cleanup: CleanupMemory;
  private readonly dim: number;
  private readonly capacity: number;
  private entries: DeepPattern[] = [];
  private depthSum = 0;

  constructor(opts: DeepMemoryOptions = {}) {
    this.dim = opts.dim ?? 512;
    this.capacity = Math.max(1, Math.floor(opts.capacity ?? 610));
    this.cleanup = new CleanupMemory(this.dim);
  }

  get size(): number {
    return this.entries.length;
  }

  get meanDepth(): number {
    return this.entries.length ? this.depthSum / this.entries.length : 0;
  }

  /**
   * Store a deep pattern. Only deep φ-modes (|k| > f64 ceiling) are kept exact;
   * shallow modes stay on the f64 path. The combined resonance × depth weight
   * ranks the entry and seeds the cleanup store (same law as the cross-section
   * write). Returns false when there is nothing deep to store or the weight is
   * not positive (gated/abstained).
   */
  store(
    key: string,
    hv: Hypervector,
    resonance: ResonanceIndex,
    depth: DepthReading,
    modeIndices: readonly number[],
  ): boolean {
    const r = Number.isFinite(resonance.value) ? resonance.value : 0;
    const d = Number.isFinite(depth.value) ? depth.value : 0;
    const weight = r * d;
    if (!(weight > 0)) return false;

    const deepModes: DeepMode[] = [];
    for (const k of modeIndices) {
      if (Math.abs(k) <= PHI_F64_MODE_CEILING) continue;
      deepModes.push({ k, amp: phiPowExact(-Math.abs(k)) });
    }
    if (deepModes.length === 0) return false;

    if (this.entries.length >= this.capacity) {
      let worst = 0;
      for (let i = 1; i < this.entries.length; i++) {
        if (this.entries[i].weight < this.entries[worst].weight) worst = i;
      }
      this.entries.splice(worst, 1);
      this.rebuildCleanup();
    }

    this.cleanup.add(key, hv, weight);
    this.entries.push({
      key,
      hv: Array.from(hv.slice(0, this.dim)),
      depth: d,
      resonance: r,
      weight,
      deepModes,
    });
    this.depthSum += d;
    return true;
  }

  /** Recall the nearest deep pattern, or null below the chance floor. */
  recall(probe: Hypervector): CleanupHit | null {
    return this.cleanup.query(probe);
  }

  /** Exact deep φ-mode amplitudes of the strongest stored pattern. */
  strongestDeepModes(): DeepMode[] {
    let best: DeepPattern | null = null;
    for (const e of this.entries) if (!best || e.weight > best.weight) best = e;
    return best ? best.deepModes : [];
  }

  /** A read-only view for the snapshot (no exact vectors, just counts + top). */
  view(): { size: number; meanDepth: number; strongestKey: string | null; strongestModes: number } {
    let best: DeepPattern | null = null;
    for (const e of this.entries) if (!best || e.weight > best.weight) best = e;
    return {
      size: this.entries.length,
      meanDepth: this.meanDepth,
      strongestKey: best ? best.key : null,
      strongestModes: best ? best.deepModes.length : 0,
    };
  }

  private rebuildCleanup(): void {
    this.cleanup = new CleanupMemory(this.dim);
    for (const e of this.entries) this.cleanup.add(e.key, Float64Array.from(e.hv), e.weight);
  }
}
