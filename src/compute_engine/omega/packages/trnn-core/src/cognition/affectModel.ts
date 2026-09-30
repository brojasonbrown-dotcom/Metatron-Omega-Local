/**
 * affectModel — a self-model over the field's felt state (Ω-REAL).
 *
 * The brain already measures its own situation (friction + qualia) and has a
 * self-model (DiagonalSSM/RLS) that predicts a vector stream. This composes the
 * two: a fixed-length "affect" observation — friction, situation, flow, and the
 * six qualia axes — is fed through a SelfModel, so the brain *predicts* its own
 * felt state and registers surprise when it changes unexpectedly (a friction
 * spike is surprise, not just a reading).
 *
 * No named emotions here: "affect" is the dimensionless felt state, a pure
 * function of the measured coherence + closure + signature. The same G7 gate
 * applies — the SSM is only trusted while it beats the RLS baseline, so the
 * model stays honest about whether the affect is actually predictable.
 *
 * Observe-only and deterministic (L2): composes QualiaTracker, frictionReading
 * and SelfModel; never actuates the field.
 */

import { SelfModel, type SelfModelReport } from './selfModel';
import { QualiaTracker, type QualiaVector } from '../measure/qualia';
import { frictionReading } from '../measure/friction';
import type { Regime } from '../measure/state';

/** friction, situation, flow, C, N, S, V, I, Cphi. */
export const AFFECT_DIM = 9;

export interface AffectObservation {
  readonly friction: number;
  readonly situation: number;
  readonly flow: number;
  readonly qualia: QualiaVector;
  readonly regime: Regime;
}

export class AffectModel {
  private readonly qualia = new QualiaTracker();
  private readonly self: SelfModel;

  constructor(window?: number) {
    this.self = new SelfModel(AFFECT_DIM, window);
  }

  /** Fold one per-rung tick into the affect vector and train/predict. */
  observe(
    psi: Float64Array,
    coherence: number,
    closureGamma: number,
    defect: number,
    regime: Regime,
    tick: number,
    abstaining = false,
  ): AffectObservation {
    const q = this.qualia.observe(psi, coherence, closureGamma);
    const fr = frictionReading(coherence, defect, closureGamma, regime, abstaining);

    const v = new Float64Array(AFFECT_DIM);
    v[0] = fr.friction;
    v[1] = fr.situation;
    v[2] = fr.flow;
    v[3] = q.C;
    v[4] = q.N;
    v[5] = q.S;
    v[6] = q.V;
    v[7] = q.I;
    v[8] = q.Cphi;
    this.self.observe(v, tick);

    return { friction: fr.friction, situation: fr.situation, flow: fr.flow, qualia: q, regime };
  }

  /** The self-model's honest report (SSM vs RLS margin, residual audit). */
  report(): SelfModelReport {
    return this.self.report();
  }

  reset(): void {
    this.qualia.reset();
    this.self.reset();
  }
}
