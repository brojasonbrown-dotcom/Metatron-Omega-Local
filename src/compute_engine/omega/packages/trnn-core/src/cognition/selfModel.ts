/**
 * Ω-P7 — the self-model, and the baseline that is allowed to kill it.
 *
 * The engine predicts its own next observation vector. Two predictors run side
 * by side on the same stream:
 *
 *   DiagonalRLS   — per-dimension recursive least squares on (x_t, 1) → x_{t+1}.
 *                   Exactly-solved, no learning rate, no tuning. This is the
 *                   honest baseline: if the SSM cannot beat it, the SSM is
 *                   decoration.
 *
 *   DiagonalSSM   — a λ-SSM: h ← λ⊙h + b⊙x, ŷ = c⊙h + d⊙x, trained online by
 *                   truncated gradient on the one-step error. λ is carried in
 *                   an unconstrained parameter θ and read through
 *                   λ = λ_max·tanh(θ), so |λ| < λ_max = φ⁻¹ < 1 holds for every
 *                   value θ can ever take. The stability certificate is a
 *                   property of the parametrisation, not of the training run —
 *                   there is no learning rate that can push this model into a
 *                   divergent regime.
 *
 * Gate G7: the self-model is only *used* while its held-out error is below the
 * baseline's. `enabled` is measured, never asserted; when the margin goes
 * negative the model keeps training but the mind reads the baseline.
 */

import { PHI, phiPow } from '../core/constants';
import { datanh, dtanh } from '../core/dmath';
import { STAT_FLOOR } from '../substrate/correlation';

/** [DEFINED] spectral cap on the self-model's recurrence: |λ| ≤ φ⁻¹. */
export const LAMBDA_MAX = phiPow(-1);

export interface Predictor {
  readonly name: string;
  predict(x: Float64Array, out: Float64Array): Float64Array;
  update(x: Float64Array, y: Float64Array): void;
  reset(): void;
}

/** Per-dimension RLS on ŷ_i = a_i·x_i + b_i, forgetting factor μ. */
export class DiagonalRLS implements Predictor {
  readonly name = 'rls';
  private readonly a: Float64Array;
  private readonly b: Float64Array;
  /** 2×2 inverse covariance per dimension, stored row-major [p00,p01,p10,p11]. */
  private readonly p: Float64Array;
  private readonly mu: number;

  constructor(
    readonly dim: number,
    mu = 0.995,
    private readonly delta = 1e3,
  ) {
    this.a = new Float64Array(dim).fill(1);
    this.b = new Float64Array(dim);
    this.p = new Float64Array(dim * 4);
    this.mu = mu;
    this.reset();
  }

  reset(): void {
    this.a.fill(1);
    this.b.fill(0);
    for (let i = 0; i < this.dim; i++) {
      this.p[i * 4 + 0] = this.delta;
      this.p[i * 4 + 1] = 0;
      this.p[i * 4 + 2] = 0;
      this.p[i * 4 + 3] = this.delta;
    }
  }

  predict(x: Float64Array, out: Float64Array): Float64Array {
    for (let i = 0; i < this.dim; i++) out[i] = this.a[i] * x[i] + this.b[i];
    return out;
  }

  update(x: Float64Array, y: Float64Array): void {
    const mu = this.mu;
    for (let i = 0; i < this.dim; i++) {
      const u0 = x[i];
      const u1 = 1;
      const o = i * 4;
      const p00 = this.p[o],
        p01 = this.p[o + 1],
        p10 = this.p[o + 2],
        p11 = this.p[o + 3];
      // Pu
      const pu0 = p00 * u0 + p01 * u1;
      const pu1 = p10 * u0 + p11 * u1;
      const denom = mu + u0 * pu0 + u1 * pu1;
      if (!(denom > 1e-300) || !Number.isFinite(denom)) continue;
      const k0 = pu0 / denom;
      const k1 = pu1 / denom;
      const err = y[i] - (this.a[i] * u0 + this.b[i]);
      this.a[i] += k0 * err;
      this.b[i] += k1 * err;
      // P ← (P − k·(uᵀP)) / μ
      const up0 = u0 * p00 + u1 * p10;
      const up1 = u0 * p01 + u1 * p11;
      this.p[o] = (p00 - k0 * up0) / mu;
      this.p[o + 1] = (p01 - k0 * up1) / mu;
      this.p[o + 2] = (p10 - k1 * up0) / mu;
      this.p[o + 3] = (p11 - k1 * up1) / mu;
    }
  }
}

/**
 * λ-SSM as a strict superset of the RLS baseline.
 *
 *   ŷ = (a·x + b) + cOut·h_next,   h ← λ·h + x
 *
 * The affine part (a, b) is the SAME exact recursive least squares as
 * `DiagonalRLS` — trained by the identical update, so it can never fall behind
 * the baseline. The recurrence is a SEPARATE correction whose gain `cOut`
 * starts at 0: at initialisation the SSM is byte-identical to the RLS baseline,
 * and learning can only engage the recurrence in the direction the error
 * gradient pays for. λ keeps the stability-safe parametrisation
 * λ = λ_max·tanh(θ), so |λ| ≤ φ⁻¹ for every θ.
 */
export class DiagonalSSM implements Predictor {
  readonly name = 'ssm';
  private readonly rls: DiagonalRLS;
  private readonly cOut: Float64Array;
  private readonly theta: Float64Array;
  private readonly h: Float64Array;
  private readonly lam: Float64Array;
  private readonly lr: number;
  private readonly bufRls: Float64Array;
  private readonly bufH: Float64Array;
  private readonly bufRes: Float64Array;

  constructor(readonly dim: number, lr = phiPow(-1)) {
    this.rls = new DiagonalRLS(dim);
    this.cOut = new Float64Array(dim); // 0 → recurrence off
    this.theta = new Float64Array(dim).fill(datanh(phiPow(-2) / LAMBDA_MAX));
    this.h = new Float64Array(dim);
    this.lam = new Float64Array(dim);
    this.lr = lr;
    this.bufRls = new Float64Array(dim);
    this.bufH = new Float64Array(dim);
    this.bufRes = new Float64Array(dim);
    this.refreshLambda();
  }

  reset(): void {
    this.rls.reset();
    this.cOut.fill(0);
    this.theta.fill(datanh(phiPow(-2) / LAMBDA_MAX));
    this.h.fill(0);
    this.refreshLambda();
  }

  lambdas(): Float64Array {
    return this.lam;
  }

  /** Largest |λ| in force — the measured spectral radius of the recurrence. */
  spectralRadius(): number {
    let m = 0;
    for (let i = 0; i < this.dim; i++) m = Math.max(m, Math.abs(this.lam[i]));
    return m;
  }

  private refreshLambda(): void {
    for (let i = 0; i < this.dim; i++) this.lam[i] = LAMBDA_MAX * dtanh(this.theta[i]);
  }

  /**
   * Predict without mutating the carried state: the mind may query the model
   * more than once per tick, and a predictor whose state depends on how often
   * it was *read* is not a model of anything.
   */
  predict(x: Float64Array, out: Float64Array): Float64Array {
    this.rls.predict(x, this.bufRls); // affine a·x + b
    for (let i = 0; i < this.dim; i++) {
      const hNext = this.lam[i] * this.h[i] + x[i];
      out[i] = this.bufRls[i] + this.cOut[i] * hNext;
    }
    return out;
  }

  /** Advance the state and take one online step against target y. */
  update(x: Float64Array, y: Float64Array): void {
    // current affine prediction and next state (before any update)
    this.rls.predict(x, this.bufRls);
    for (let i = 0; i < this.dim; i++) this.bufH[i] = this.lam[i] * this.h[i] + x[i];

    // affine part (exact RLS) learns the residual the recurrence left behind
    for (let i = 0; i < this.dim; i++) this.bufRes[i] = y[i] - this.cOut[i] * this.bufH[i];
    this.rls.update(x, this.bufRes);

    // recurrence correction: per-parameter normalised gradient, engaged only
    // while it reduces error. Each parameter is normalised by its OWN feature
    // energy (h² for cOut, (cOut·h)² for λ), so no single scale couples them.
    for (let i = 0; i < this.dim; i++) {
      const hNext = this.bufH[i];
      const hPrev = this.h[i];
      const e = this.bufRls[i] + this.cOut[i] * hNext - y[i];
      if (!Number.isFinite(e)) {
        this.h[i] = Number.isFinite(hNext) ? clamp(hNext, -phiPow(6), phiPow(6)) : 0;
        continue;
      }
      // ∂L/∂cOut = e·hNext
      const energyC = 1e-9 + hNext * hNext;
      this.cOut[i] = clamp(this.cOut[i] - (this.lr * e * hNext) / energyC, -PHI, PHI);
      // ∂L/∂θ = e·cOut·hPrev·dλ/dθ, dλ/dθ = λ_max·sech²(θ)
      const t = dtanh(this.theta[i]);
      const dLam = LAMBDA_MAX * (1 - t * t);
      const gLam = e * this.cOut[i] * hPrev * dLam;
      const energyL = 1e-9 + (this.cOut[i] * hPrev) * (this.cOut[i] * hPrev);
      this.theta[i] = clamp(this.theta[i] - (this.lr * gLam) / energyL, -8, 8);

      this.h[i] = Number.isFinite(hNext) ? clamp(hNext, -phiPow(6), phiPow(6)) : 0;
    }
    this.refreshLambda();
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export interface PredictionEntry {
  readonly tick: number;
  /** ‖ŷ − y‖² of the model in force. */
  readonly error: number;
  readonly ssmError: number;
  readonly rlsError: number;
  readonly persistenceError: number;
  /** Which predictor the mind was reading at this tick. */
  readonly source: 'ssm' | 'rls';
}

export interface SelfModelReport {
  readonly dim: number;
  readonly samples: number;
  readonly ssmMse: number;
  readonly rlsMse: number;
  readonly persistenceMse: number;
  /** (rls − ssm)/max(rls, ε): > 0 means the self-model earns its place. */
  readonly margin: number;
  /** Skill of the model in force against naive persistence. */
  readonly skill: number;
  readonly enabled: boolean;
  readonly spectralRadius: number;
  readonly lambdaMax: number;
  readonly window: number;
  readonly recent: readonly PredictionEntry[];
  /** Mean lag-1 residual autocorrelation, or null while the audit warms. */
  readonly residualAuto: number | null;
  /** Max |cross-correlation| between residual dims, or null while warming. */
  readonly residualCross: number | null;
}

/**
 * Runs both predictors on one stream and decides, from measurement alone,
 * which one the mind is allowed to read.
 */
export class SelfModel {
  private readonly ssm: DiagonalSSM;
  private readonly rls: DiagonalRLS;
  private readonly bufSsm: Float64Array;
  private readonly bufRls: Float64Array;
  private readonly prev: Float64Array;
  private havePrev = false;

  private readonly ssmWin: Float64Array;
  private readonly rlsWin: Float64Array;
  private readonly perWin: Float64Array;
  /** window × dim ring of SSM residual vectors, for the residual-dependence audit. */
  private readonly resid: Float64Array;
  private residHead = 0;
  private residCount = 0;
  private w = 0;
  private filled = 0;
  private samples = 0;
  private seen = 0;
  private readonly log: PredictionEntry[] = [];

  constructor(
    readonly dim: number,
    readonly window = 144,
    /** Ticks of warm-up before the gate may enable the self-model. */
    readonly warmup = 34,
    /**
     * Folds discarded before scoring starts. The opening ticks of a run are a
     * cold-start transient shared by every predictor — scoring them measures
     * the transient, not the models, and a ring window keeps that pollution
     * alive for `window` folds. Training still happens throughout.
     */
    readonly coldStart = 21,
  ) {
    this.ssm = new DiagonalSSM(dim);
    this.rls = new DiagonalRLS(dim);
    this.bufSsm = new Float64Array(dim);
    this.bufRls = new Float64Array(dim);
    this.prev = new Float64Array(dim);
    this.ssmWin = new Float64Array(window);
    this.rlsWin = new Float64Array(window);
    this.perWin = new Float64Array(window);
    this.resid = new Float64Array(window * dim);
  }

  /** True while the measured margin says the self-model is the better read. */
  get enabled(): boolean {
    return this.filled >= this.warmup && this.margin() > 0;
  }

  /**
   * Feed one observation. Returns the prediction of the *next* observation
   * from the predictor currently in force.
   */
  observe(x: Float64Array, tick: number): Float64Array {
    if (this.havePrev) {
      // score the predictions that were made from `prev` against this x
      this.ssm.predict(this.prev, this.bufSsm);
      this.rls.predict(this.prev, this.bufRls);
      let eS = 0;
      let eR = 0;
      let eP = 0;
      const residBase = this.residHead * this.dim;
      for (let i = 0; i < this.dim; i++) {
        const dS = this.bufSsm[i] - x[i];
        const dR = this.bufRls[i] - x[i];
        const dP = this.prev[i] - x[i];
        this.resid[residBase + i] = dS;
        eS += dS * dS;
        eR += dR * dR;
        eP += dP * dP;
      }
      this.residHead = (this.residHead + 1) % this.window;
      this.residCount = Math.min(this.window, this.residCount + 1);
      this.seen++;
      if (Number.isFinite(eS) && Number.isFinite(eR) && this.seen > this.coldStart) {
        this.ssmWin[this.w] = eS;
        this.rlsWin[this.w] = eR;
        this.perWin[this.w] = eP;
        this.w = (this.w + 1) % this.window;
        this.filled = Math.min(this.window, this.filled + 1);
        this.samples++;
        const source: 'ssm' | 'rls' = this.enabled ? 'ssm' : 'rls';
        this.log.push({
          tick,
          error: source === 'ssm' ? eS : eR,
          ssmError: eS,
          rlsError: eR,
          persistenceError: eP,
          source,
        });
        if (this.log.length > 34) this.log.shift();
      }
      // learn from the realised pair (prev → x)
      this.ssm.update(this.prev, x);
      this.rls.update(this.prev, x);
    }
    this.prev.set(x);
    this.havePrev = true;
    const out = this.enabled ? this.bufSsm : this.bufRls;
    const pred = this.enabled ? this.ssm.predict(x, out) : this.rls.predict(x, out);
    // A predictor that emits a non-finite value has told us nothing; fall back
    // to persistence for that coordinate rather than poisoning downstream
    // surprise with NaN.
    for (let i = 0; i < this.dim; i++) if (!Number.isFinite(pred[i])) pred[i] = x[i];
    return pred;
  }

  private mean(win: Float64Array): number {
    if (this.filled === 0) return 0;
    let s = 0;
    for (let i = 0; i < this.filled; i++) s += win[i];
    return s / this.filled;
  }

  /** Row-major chronological access into the residual ring (t oldest-first). */
  private residualAt(t: number, i: number): number {
    const row = ((this.residHead - this.residCount + t) % this.window + this.window) % this.window;
    return this.resid[row * this.dim + i];
  }

  /**
   * Residual-dependence audit. A diagonal model cannot see cross-dimension
   * structure; this measures what it leaves behind, so "does the model
   * understand correlates" is a number, not an opinion.
   */
  private residualDependence(): { auto: number | null; cross: number | null } {
    const n = this.residCount;
    if (n < 2) return { auto: null, cross: null };

    // mean lag-1 autocorrelation of the residual, averaged over dimensions
    let autoSum = 0;
    let autoN = 0;
    for (let i = 0; i < this.dim; i++) {
      let m = 0;
      for (let t = 0; t < n; t++) m += this.residualAt(t, i);
      m /= n;
      let sxy = 0, sxx = 0, syy = 0;
      for (let t = 1; t < n; t++) {
        const a = this.residualAt(t, i) - m;
        const b = this.residualAt(t - 1, i) - m;
        sxy += a * b;
        sxx += a * a;
        syy += b * b;
      }
      if (sxx > 0 && syy > 0) { autoSum += sxy / Math.sqrt(sxx * syy); autoN++; }
    }
    const auto = autoN > 0 ? autoSum / autoN : null;

    // max |cross-correlation| between residual dimensions (needs STAT_FLOOR)
    let cross: number | null = null;
    if (n >= STAT_FLOOR) {
      let best = 0;
      for (let i = 0; i < this.dim; i++) {
        for (let j = i + 1; j < this.dim; j++) {
          let mi = 0, mj = 0;
          for (let t = 0; t < n; t++) {
            mi += this.residualAt(t, i);
            mj += this.residualAt(t, j);
          }
          mi /= n;
          mj /= n;
          let sxy = 0, sxx = 0, syy = 0;
          for (let t = 0; t < n; t++) {
            const a = this.residualAt(t, i) - mi;
            const b = this.residualAt(t, j) - mj;
            sxy += a * b;
            sxx += a * a;
            syy += b * b;
          }
          if (sxx > 0 && syy > 0) {
            const r = Math.abs(sxy / Math.sqrt(sxx * syy));
            if (r > best) best = r;
          }
        }
      }
      cross = best;
    }
    return { auto, cross };
  }

  margin(): number {
    const r = this.mean(this.rlsWin);
    const s = this.mean(this.ssmWin);
    if (!(r > 0)) return 0;
    return (r - s) / r;
  }

  report(): SelfModelReport {
    const ssmMse = this.mean(this.ssmWin);
    const rlsMse = this.mean(this.rlsWin);
    const perMse = this.mean(this.perWin);
    const inForce = this.enabled ? ssmMse : rlsMse;
    const dep = this.residualDependence();
    return {
      dim: this.dim,
      samples: this.samples,
      ssmMse,
      rlsMse,
      persistenceMse: perMse,
      margin: this.margin(),
      skill: perMse > 0 ? 1 - inForce / perMse : 0,
      enabled: this.enabled,
      spectralRadius: this.ssm.spectralRadius(),
      lambdaMax: LAMBDA_MAX,
      window: this.filled,
      recent: this.log.slice(-13),
      residualAuto: dep.auto,
      residualCross: dep.cross,
    };
  }

  reset(): void {
    this.ssm.reset();
    this.rls.reset();
    this.havePrev = false;
    this.filled = 0;
    this.w = 0;
    this.samples = 0;
    this.seen = 0;
    this.log.length = 0;
  }
}
