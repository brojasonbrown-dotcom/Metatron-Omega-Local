/**
 * rhufTransport — the RHUFT self-model (Ω-REAL: the deepest self-measurement).
 *
 * The field's information is HOLOMORPHIC: each modal coefficient c_k carries a
 * magnitude AND a phase (a direction). The old signature collapsed this to
 * |c_k|² — phase-blind — so the self-model saw a constant and could never beat
 * the trivial "stay the same" predictor. `scripts/prove-complex-transport.cjs`
 * measured this: a complex transport model beats persistence by ~32% on the
 * field's own rotation, where the power signature is invariant.
 *
 * This module is the natural fix, and it IS the RHUFT transport:
 *
 *   c_k(t+1) ≈ λ_k · c_k(t) + d_k ,   λ_k ∈ ℂ, |λ_k| ≤ φ⁻¹
 *
 * — a per-mode complex multiplier (rotation + damping), exactly the linear
 * transport term of the RHUFT master equation ∂_t c = Λ c + N(c). The diagonal
 * is the transport; the reaction N(c) is the (future) mode coupling. λ_k is
 * parametrised as λ = φ⁻¹·tanh(θ)·e^{iφ} so stability (|λ| ≤ φ⁻¹) is a property
 * of the parametrisation, not of the training run — the same law the certified
 * real DiagonalSSM already honours.
 *
 * Deterministic: only +,−,×,÷,√, tanh (via dtanh) — no RNG, no clock.
 */

import { PHI_INV, phiPow } from '../core/constants';
import { dtanh, dcos, dsin } from '../core/dmath';

export const LAMBDA_MAX = phiPow(-1);

export interface ComplexVec {
  readonly re: Float64Array;
  readonly im: Float64Array;
  readonly n: number;
}

function zeros(n: number): ComplexVec {
  return { re: new Float64Array(n), im: new Float64Array(n), n };
}

export interface RhufTransportReport {
  readonly dim: number;
  readonly samples: number;
  readonly mse: number;
  readonly persistenceMse: number;
  readonly skill: number; // 1 - mse/persistenceMse  (>0 = learned the rotation)
  readonly spectralRadius: number; // max |λ_k| ≤ φ⁻¹
  readonly lambdaMax: number;
}

/**
 * Online complex diagonal transport: learns λ_k (rotation+damping) + d_k per
 * mode by online gradient on the one-step error, with a persistence baseline.
 */
export class RhufTransport {
  private readonly theta: Float64Array; // magnitude param
  private readonly phase: Float64Array; // phase param
  private readonly dr: Float64Array;    // bias re
  private readonly di: Float64Array;    // bias im
  private readonly out: ComplexVec;
  private samples = 0;
  private mseSum = 0;
  private persistSum = 0;
  private prev: ComplexVec | null = null;

  constructor(readonly dim: number, private readonly lr = 0.02) {
    this.theta = new Float64Array(dim);
    this.phase = new Float64Array(dim);
    this.dr = new Float64Array(dim);
    this.di = new Float64Array(dim);
    this.out = zeros(dim);
  }

  private lambda(k: number): { re: number; im: number } {
    const m = LAMBDA_MAX * dtanh(this.theta[k]);
    return { re: m * dcos(this.phase[k]), im: m * dsin(this.phase[k]) };
  }

  predict(x: ComplexVec, out: ComplexVec): ComplexVec {
    for (let k = 0; k < this.dim; k++) {
      const l = this.lambda(k);
      out.re[k] = l.re * x.re[k] - l.im * x.im[k] + this.dr[k];
      out.im[k] = l.re * x.im[k] + l.im * x.re[k] + this.di[k];
    }
    return out;
  }

  /** Train on (x → y), return the one-step prediction for y. */
  observe(x: ComplexVec, y: ComplexVec): ComplexVec {
    this.predict(x, this.out);
    for (let k = 0; k < this.dim; k++) {
      const l = this.lambda(k);
      const er = y.re[k] - this.out.re[k];
      const ei = y.im[k] - this.out.im[k];
      // online gradient on |y - yhat|^2 w.r.t. theta (magnitude) and phase
      const m = LAMBDA_MAX * dtanh(this.theta[k]);
      const dm = LAMBDA_MAX * (1 - dtanh(this.theta[k]) ** 2);
      const c = dcos(this.phase[k]);
      const s = dsin(this.phase[k]);
      const dLdm = -2 * (er * (c * x.re[k] - s * x.im[k]) + ei * (c * x.im[k] + s * x.re[k]));
      const dLdph = -2 * (er * (-m * s * x.re[k] - m * c * x.im[k]) + ei * (-m * s * x.im[k] + m * c * x.re[k]));
      this.theta[k] -= this.lr * dLdm * dm;
      this.phase[k] -= this.lr * dLdph;
      this.dr[k] += this.lr * er;
      this.di[k] += this.lr * ei;
      // error accounting
      this.mseSum += er * er + ei * ei;
    }
    // persistence baseline: predict "stay the same" (the phase-blind optimum)
    if (this.prev) {
      let p = 0;
      for (let k = 0; k < this.dim; k++) {
        const er = y.re[k] - this.prev.re[k];
        const ei = y.im[k] - this.prev.im[k];
        p += er * er + ei * ei;
      }
      this.persistSum += p;
    }
    this.prev = { re: Float64Array.from(x.re), im: Float64Array.from(x.im), n: x.n };
    this.samples++;
    return this.out;
  }

  report(): RhufTransportReport {
    const n = this.samples > 0 ? this.samples : 1;
    const mse = this.mseSum / (n * this.dim);
    const persist = this.persistSum / (n * this.dim);
    let radius = 0;
    for (let k = 0; k < this.dim; k++) {
      const l = this.lambda(k);
      const r = Math.sqrt(l.re * l.re + l.im * l.im);
      if (r > radius) radius = r;
    }
    return {
      dim: this.dim,
      samples: this.samples,
      mse,
      persistenceMse: persist,
      skill: persist > 0 ? 1 - mse / persist : 0,
      spectralRadius: radius,
      lambdaMax: LAMBDA_MAX,
    };
  }
}
