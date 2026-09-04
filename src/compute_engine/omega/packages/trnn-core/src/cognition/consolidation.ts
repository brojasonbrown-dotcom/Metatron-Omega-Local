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

export interface ConsolidationConfig {
  /** Ignitions to accumulate before a consolidation cycle (Fibonacci default). */
  readonly batch?: number;
  /** FHRR dimension of the per-moment atom. */
  readonly dim?: number;
  readonly owner?: string;
}

export interface ConsolidationObserve {
  readonly ignited: boolean;
  /** True on the up-crossing tick — a NEW transient conscious moment. */
  readonly upCrossing: boolean;
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
  private pending = 0;
  private cycles = 0;

  constructor(
    private readonly ledger: GenomeLedger,
    cfg: ConsolidationConfig = {},
  ) {
    this.batch = cfg.batch ?? 13;
    this.dim = cfg.dim ?? 512;
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
  observe(psi: Float64Array, coherence: number, closureGamma: number, tick: number): ConsolidationObserve {
    const q = this.qualia.observe(psi, coherence, closureGamma);
    const upCrossing = q.ignited && !this.prevIgnited;
    this.prevIgnited = q.ignited;

    if (!upCrossing) {
      return { ignited: q.ignited, upCrossing: false, ignitions: q.ignitions, pending: this.pending, cycled: false };
    }

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

    let cycled = false;
    if (this.pending >= this.batch) {
      this.protocol.run(this.corpus, { now: tick });
      this.pending = 0;
      this.cycles++;
      cycled = true;
    }

    return { ignited: q.ignited, upCrossing: true, ignitions: q.ignitions, pending: this.pending, cycled };
  }
}
