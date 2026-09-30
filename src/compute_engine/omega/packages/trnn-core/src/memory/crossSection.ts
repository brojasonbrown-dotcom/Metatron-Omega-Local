/**
 * crossSection — the unified memory (Ω-REAL: one substrate for every store).
 *
 * The brain had three separate memory planes — the torus braid (attractor
 * recall), the Zeckendorf tape (permanent), and the FHRR cleanup memory
 * (associative) — each correct in isolation but never joined. This unifies them
 * into one write path and one recall:
 *
 *   write(field, coherence) — gated by coherence ≥ φ⁻², then stored three ways:
 *     • braid   — the unit-normalised complex field (attractor recall);
 *     • tape    — advanced by the field (permanent, Zeckendorf-addressed);
 *     • cleanup — the field's per-node phases, coherence-weighted (associative).
 *   recall(field) — the associative hit (abstention-aware) plus the braid
 *     attractor match, both returned, never silently one or the other.
 *
 * "Weighted" is real here, not cosmetic: the coherence is the superposition
 * weight, so a resonant state persists more strongly than a noisy one. Fully
 * deterministic (L2), observe-only, and serialisable for cross-session.
 */

import { TorusBraid } from './braid';
import { TuringTape } from './turingTape';
import { CleanupMemory, wrapPhase, type Hypervector, type CleanupHit } from '../substrate/vsa';
import { LAMBDA_MEMORY, PHI_INV } from '../core/constants';
import { datan2, dsin, dcos, dmag } from '../core/dmath';
import type { CField } from '../core/complex';

export interface CrossSectionOptions {
  readonly dim?: number;
  readonly braidCapacity?: number;
  /** Write gate — only resonant states (coherence ≥ this) are stored. */
  readonly writeThreshold?: number;
}

export interface CrossSectionWrite {
  readonly stored: boolean;
  readonly gated: boolean;
  readonly coherence: number;
  readonly key: string;
}

export interface CrossSectionRecall {
  readonly associative: CleanupHit | null;
  readonly braidMatch: string | null;
}

/**
 * Golden-angle lattice projection of a *complex* field onto `dim` phases. Each
 * dim is the vector sum of every node's value ξ_k bound onto the lattice angle
 * 2π·frac(k·i·φ⁻¹), so distinct fields land ~orthogonal (the cleanup memory's
 * chance-floor math then applies) while the same field reproduces exactly.
 * Module-level so the host can address a field without instantiating a store.
 */
export function fieldToHv(field: CField, dim: number): Hypervector {
  const hv = new Float64Array(dim);
  const n = field.n;
  for (let i = 0; i < dim; i++) {
    let re = 0;
    let im = 0;
    for (let k = 0; k < n; k++) {
      const lattice = 2 * Math.PI * k * i * PHI_INV;
      const ang = lattice + datan2(field.im[k], field.re[k]);
      const mag = dmag(field.re[k], field.im[k]);
      re += mag * dcos(ang);
      im += mag * dsin(ang);
    }
    hv[i] = wrapPhase(datan2(im, re));
  }
  return hv;
}

export class CrossSectionMemory {
  readonly braid: TorusBraid;
  readonly tape: TuringTape;
  private readonly cleanup: CleanupMemory;
  private readonly dim: number;
  private readonly writeThreshold: number;
  private writes = 0;
  private gated = 0;

  constructor(readonly nodes: number, opts: CrossSectionOptions = {}) {
    this.dim = opts.dim ?? 512;
    this.braid = new TorusBraid({ nodes, capacity: opts.braidCapacity });
    this.tape = new TuringTape();
    this.cleanup = new CleanupMemory(this.dim);
    this.writeThreshold = opts.writeThreshold ?? LAMBDA_MEMORY;
  }

  get size(): number {
    return this.writes;
  }

  get gatedCount(): number {
    return this.gated;
  }

  /** The field's hypervector address: a golden-angle lattice projection of the
   *  *complex* field (see the module-level `fieldToHv`). */
  fieldToHv(field: CField): Hypervector {
    return fieldToHv(field, this.dim);
  }

  /** One write into all three stores, gated and weighted by coherence. */
  write(key: string, field: CField, coherence: number, tick: number): CrossSectionWrite {
    if (!Number.isFinite(coherence) || coherence < this.writeThreshold) {
      this.gated++;
      return { stored: false, gated: true, coherence, key };
    }
    this.braid.store(key, field, tick);
    this.tape.advance(field);
    this.cleanup.add(key, this.fieldToHv(field), coherence);
    this.writes++;
    return { stored: true, gated: false, coherence, key };
  }

  /** Unified recall: the associative hit and the braid attractor match. */
  recall(field: CField): CrossSectionRecall {
    const associative = this.cleanup.query(this.fieldToHv(field));
    const braid = this.braid.recall(field);
    return { associative, braidMatch: braid.stage === 'miss' ? null : (braid.key ?? null) };
  }
}
