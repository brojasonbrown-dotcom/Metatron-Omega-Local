/**
 * project — the persistent "project" context (Ω-REAL: deep information, accumulated).
 *
 * A long-running project is not a single field but a WEIGHTED BUNDLE of the
 * deep fields it has produced. This module accumulates deep field hypervectors
 * into one addressable object, gated by depth (only fields at/above `threshold`
 * = φ⁻¹ join), so shallow noise never dilutes the project. The bundle is a
 * phasor sum weighted by depth; recall is the abstention-aware cleanup query.
 * Deterministic, observe-only, serialisable for cross-session persistence.
 */

import { CleanupMemory, wrapPhase, type Hypervector, type CleanupHit } from '../substrate/vsa';
import { PHI_INV } from '../core/constants';
import { dcos, dsin, datan2 } from '../core/dmath';

export interface ProjectEntry {
  readonly key: string;
  readonly hv: number[];
  readonly depth: number;
}

export interface ProjectState {
  readonly dim: number;
  readonly threshold: number;
  readonly capacity?: number;
  readonly entries: readonly ProjectEntry[];
}

export class ProjectContext {
  private cleanup: CleanupMemory;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  private readonly entries: ProjectEntry[] = [];
  private readonly capacity: number;
  private depthSum = 0;

  constructor(readonly dim = 512, readonly threshold = PHI_INV, capacity = 610) {
    this.capacity = Math.max(1, Math.floor(capacity));
    this.cleanup = new CleanupMemory(dim);
    this.re = new Float64Array(dim);
    this.im = new Float64Array(dim);
  }

  get size(): number {
    return this.entries.length;
  }

  get meanDepth(): number {
    return this.entries.length ? this.depthSum / this.entries.length : 0;
  }

  /** Fold a deep field's hypervector into the project. Returns false when the
   *  field is below the depth threshold (shallow — not folded). At capacity the
   *  lowest-depth member is evicted and the bundle + store are rebuilt. */
  observe(key: string, hv: Hypervector, depth: number): boolean {
    const d = Number.isFinite(depth) ? depth : NaN;
    if (!Number.isFinite(d) || d < this.threshold) return false;

    if (this.entries.length >= this.capacity) {
      let worst = 0;
      for (let i = 1; i < this.entries.length; i++) {
        if (this.entries[i].depth < this.entries[worst].depth) worst = i;
      }
      this.depthSum -= this.entries[worst].depth;
      this.entries.splice(worst, 1);
      this.rebuild();
    }

    this.cleanup.add(key, hv, d);
    const lim = Math.min(this.dim, hv.length);
    for (let i = 0; i < lim; i++) {
      const p = hv[i];
      if (!Number.isFinite(p)) continue;
      this.re[i] += d * dcos(p);
      this.im[i] += d * dsin(p);
    }
    this.entries.push({ key, hv: Array.from(hv.slice(0, lim)), depth: d });
    this.depthSum += d;
    return true;
  }

  private rebuild(): void {
    this.re.fill(0);
    this.im.fill(0);
    this.cleanup = new CleanupMemory(this.dim);
    for (const e of this.entries) {
      this.cleanup.add(e.key, Float64Array.from(e.hv), e.depth);
      const lim = Math.min(this.dim, e.hv.length);
      for (let i = 0; i < lim; i++) {
        const p = e.hv[i];
        if (!Number.isFinite(p)) continue;
        this.re[i] += e.depth * dcos(p);
        this.im[i] += e.depth * dsin(p);
      }
    }
  }

  /** The bundled project hypervector — the weighted phasor sum over members. */
  vector(): Hypervector {
    const out = new Float64Array(this.dim);
    for (let i = 0; i < this.dim; i++) out[i] = wrapPhase(datan2(this.im[i], this.re[i]));
    return out;
  }

  /** Nearest stored project member, or null when the probe is below chance. */
  recall(probe: Hypervector): CleanupHit | null {
    return this.cleanup.query(probe);
  }

  serialize(): ProjectState {
    return {
      dim: this.dim,
      threshold: this.threshold,
      capacity: this.capacity,
      entries: this.entries.map((e) => ({ key: e.key, hv: e.hv.slice(), depth: e.depth })),
    };
  }

  static restore(s: ProjectState): ProjectContext {
    const p = new ProjectContext(s.dim, s.threshold, s.capacity ?? 610);
    for (const e of s.entries) p.observe(e.key, Float64Array.from(e.hv), e.depth);
    return p;
  }
}
