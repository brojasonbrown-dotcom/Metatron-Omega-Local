/**
 * consolidation — ignition-triggered knowledge sealing (Ω-REAL: Q5).
 *
 * The last seam of the self-measurement loop: the qualia ignition train (the
 * transient "conscious moments" — up-crossings of the golden-delay self-overlap
 * Cphi over φ⁻²) is what should be CONSOLIDATED into stable knowledge, not the
 * steady state. Each up-crossing records one moment into a `Corpus`; once a
 * Fibonacci batch accumulates, a full `TenSweepProtocol` cycle runs and seals
 * the ten sweep records into the append-only `GenomeLedger`.
 *
 * The ledger is the durable substrate: every sealed record carries an inclusion
 * proof and a signed head, so "stable knowledge derived from self-measurement"
 * is auditable, not asserted. Deterministic throughout — the moment atom is a
 * seeded FHRR vector, and the protocol reads no wall clock.
 */

import { QualiaTracker } from '../measure/qualia';
import { Corpus, TenSweepProtocol } from '../sweeps/tenSweep';
import { GenomeLedger } from '../genome/record';
import { randomHv } from '../substrate/vsa';
import { PHI_INV } from '../core/constants';

export interface ConsolidationConfig {
  /** Ignitions to accumulate before a consolidation cycle (Fibonacci default). */
  readonly batch?: number;
  /** FHRR dimension of the per-moment atom. */
  readonly dim?: number;
  readonly owner?: string;
  /** Depth (importance) threshold for the second consolidation trigger — φ⁻¹. */
  readonly depthThreshold?: number;
}

export interface ConsolidationObserve {
  readonly ignited: boolean;
  /** True on the up-crossing tick — a NEW transient conscious moment. */
  readonly upCrossing: boolean;
  /** True on the tick depth rose across `depthThreshold` — a deep moment. */
  readonly depthUpCrossing: boolean;
  /** The depth value observed this tick (NaN when unmeasured). */
  readonly depth: number;
  readonly ignitions: number;
  readonly pending: number;
  /** True when this observation completed a consolidation cycle. */
  readonly cycled: boolean;
}

export class IgnitionConsolidator {
  private readonly qualia = new QualiaTracker();
  private readonly corpus = new Corpus();
  private readonly protocol: TenSweepProtocol;
  private readonly batch: number;
  private readonly dim: number;
  private prevIgnited = false;
  private prevDepth = 0;
  private pending = 0;
  private cycles = 0;
  private readonly depthThreshold: number;

  constructor(
    private readonly ledger: GenomeLedger,
    cfg: ConsolidationConfig = {},
  ) {
    this.batch = cfg.batch ?? 13;
    this.dim = cfg.dim ?? 512;
    this.depthThreshold = cfg.depthThreshold ?? PHI_INV;
    this.protocol = new TenSweepProtocol(ledger, cfg.owner);
  }

  get corpusSize(): number {
    return this.corpus.items.length;
  }

  get cycleCount(): number {
    return this.cycles;
  }

  /**
   * Feed one qualia observation. On each up-crossing a moment is recorded; once
   * `batch` moments accumulate, a ten-sweep cycle seals them into the ledger.
   */
  observe(psi: Float64Array, coherence: number, closureGamma: number, tick: number, depth?: number): ConsolidationObserve {
    const q = this.qualia.observe(psi, coherence, closureGamma);
    const upCrossing = q.ignited && !this.prevIgnited;
    this.prevIgnited = q.ignited;

    const d = depth !== undefined && Number.isFinite(depth) ? depth : NaN;
    const depthUpCrossing = Number.isFinite(d) && d >= this.depthThreshold && this.prevDepth < this.depthThreshold;
    // Keep the last VALID depth: an unmeasured (NaN) tick must not poison the
    // crossing detector, or the next real crossing would be silently missed.
    this.prevDepth = Number.isFinite(d) ? d : this.prevDepth;

    if (!upCrossing && !depthUpCrossing) {
      return {
        ignited: q.ignited,
        upCrossing: false,
        depthUpCrossing: false,
        depth: d,
        ignitions: q.ignitions,
        pending: this.pending,
        cycled: false,
      };
    }

    if (upCrossing) {
      this.corpus.add({
        id: `moment:${tick}`,
        kind: 'Ignition',
        vector: randomHv(this.dim, `moment:${tick}`),
        trust: q.Cphi,
        contradicts: [],
        recordedAt: tick,
        validFrom: tick,
        validTo: null,
        supersededBy: null,
      });
      this.pending++;
    }

    if (depthUpCrossing) {
      this.corpus.add({
        id: `deep:${tick}`,
        kind: 'DeepMoment',
        vector: randomHv(this.dim, `deep:${tick}`),
        trust: d,
        contradicts: [],
        recordedAt: tick,
        validFrom: tick,
        validTo: null,
        supersededBy: null,
      });
      this.pending++;
    }

    let cycled = false;
    if (this.pending >= this.batch) {
      this.protocol.run(this.corpus, { now: tick });
      this.pending = 0;
      this.cycles++;
      cycled = true;
    }

    return {
      ignited: q.ignited,
      upCrossing,
      depthUpCrossing,
      depth: d,
      ignitions: q.ignitions,
      pending: this.pending,
      cycled,
    };
  }
}
