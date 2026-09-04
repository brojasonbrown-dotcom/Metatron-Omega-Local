/**
 * fieldSelfModel — per-rung field-level self-model (Ω-REAL: Q4).
 *
 * `SelfModel` predicts ONE observation stream (the Mind's folded vector). The
 * self-measurement (Q2) needs a per-rung predictor over the 13-mode signature,
 * so drift = ‖sig − siĝ‖² is a real one-step prediction error (surprise), not
 * merely "how much the field moved" (the persistence baseline).
 *
 * This wraps one `SelfModel` per rung over the shared signature dimension. Each
 * rung's model runs the same DiagonalSSM-vs-DiagonalRLS gate (G7): it is only
 * trusted while it beats persistence on held-out error. Read-only — it predicts
 * and trains on a stream, never actuates the field.
 */

import { SelfModel, type SelfModelReport } from './selfModel';

export interface FieldSelfModelReport {
  readonly rungs: number;
  /** Mean held-out SSM error across rungs. */
  readonly ssmMse: number;
  /** Mean held-out RLS error across rungs. */
  readonly rlsMse: number;
  /** Mean persistence baseline error across rungs. */
  readonly persistenceMse: number;
  /** True when every rung's self-model has beaten persistence. */
  readonly enabled: boolean;
  readonly per: readonly SelfModelReport[];
}

export class FieldSelfModel {
  private readonly models: SelfModel[];

  constructor(readonly rungs: number, readonly dim: number, window?: number) {
    this.models = Array.from({ length: rungs }, () => new SelfModel(dim, window));
  }

  /**
   * Train on the current signatures and return, per rung, the prediction of the
   * NEXT signature (from the predictor in force). Returned buffers are internal
   * and reused — copy before the next call if you keep them.
   */
  predict(signatures: readonly Float64Array[], tick: number): Float64Array[] {
    const out: Float64Array[] = [];
    for (let i = 0; i < signatures.length; i++) {
      out.push(this.models[i].observe(signatures[i], tick));
    }
    return out;
  }

  /** Aggregate self-model report across all rungs. */
  report(): FieldSelfModelReport {
    const per = this.models.map((m) => m.report());
    const mean = (f: (r: SelfModelReport) => number) => per.reduce((s, r) => s + f(r), 0) / per.length;
    return {
      rungs: per.length,
      ssmMse: mean((r) => r.ssmMse),
      rlsMse: mean((r) => r.rlsMse),
      persistenceMse: mean((r) => r.persistenceMse),
      enabled: per.every((r) => r.enabled),
      per,
    };
  }

  reset(): void {
    for (const m of this.models) m.reset();
  }
}
