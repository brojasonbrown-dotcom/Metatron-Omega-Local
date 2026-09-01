/**
 * METATRON v10 — PREDICTIVE CODING GATE
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Hierarchical predictive coding over the shared 22-band vector. The model
 * keeps a running prediction, measures precision-weighted surprise against
 * each incoming observation, and returns a learning gain. Learning happens
 * where the world is surprising but not chaotic — nothing is spent on
 * already-predicted input, nothing is wasted on noise.
 *
 *   Rao & Ballard (1999), Nature Neuroscience 2(1):79–87
 *   Friston (2010), Nature Reviews Neuroscience 11:127–138
 *
 * Precision is the inverse of the online residual variance (Welford), so the
 * gate calibrates itself to the actual noise floor of the channel instead of
 * a hand-tuned threshold.
 */

const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;
const PHI_INV2 = PHI_INV * PHI_INV;

export interface SurpriseReport {
  /** Raw L2 prediction error, band units. */
  error: number;
  /** Precision-weighted surprise (error² · precision), dimensionless. */
  surprise: number;
  /** Inverse residual variance. */
  precision: number;
  /** Free-energy proxy: ½·surprise − ½·ln(precision). */
  freeEnergy: number;
  /** Learning gain in [0,1] applied downstream. */
  gain: number;
  /** Observation count so far. */
  n: number;
  /** Band-resolved absolute residual. */
  residual: Float64Array;
}

export class PredictiveCoder {
  readonly dim: number;

  /** Top-down prediction. */
  private mu: Float64Array;

  /** Welford accumulators for residual variance. */
  private rMean = 0;

  private rM2 = 0;

  private count = 0;

  /** Prediction lag, φ⁻² — slow enough to be a prediction, fast enough to track. */
  private readonly alpha: number;

  constructor(dim = 22, alpha = PHI_INV2) {
    this.dim = dim;
    this.mu = new Float64Array(dim);
    this.alpha = alpha;
  }

  /** Current prediction (copy). */
  prediction(): Float64Array {
    return new Float64Array(this.mu);
  }

  reset(): void {
    this.mu.fill(0);
    this.rMean = 0;
    this.rM2 = 0;
    this.count = 0;
  }

  /**
   * Observe one vector. Returns the surprise report BEFORE the prediction is
   * updated, so the gain reflects how unexpected this input actually was.
   */
  observe(x: ArrayLike<number>): SurpriseReport {
    const d = this.dim;
    const residual = new Float64Array(d);
    let sq = 0;
    for (let i = 0; i < d; i += 1) {
      const e = (x[i] ?? 0) - this.mu[i];
      residual[i] = Math.abs(e);
      sq += e * e;
    }
    const error = Math.sqrt(sq);

    // Welford on the scalar error magnitude.
    this.count += 1;
    const delta = error - this.rMean;
    this.rMean += delta / this.count;
    this.rM2 += delta * (error - this.rMean);
    const variance = this.count > 1 ? this.rM2 / (this.count - 1) : 0;
    const precision = 1 / Math.max(1e-6, variance);

    const surprise = sq * precision;
    const freeEnergy = 0.5 * surprise - 0.5 * Math.log(precision);

    // Update the prediction toward the observation.
    for (let i = 0; i < d; i += 1) {
      this.mu[i] += this.alpha * ((x[i] ?? 0) - this.mu[i]);
    }

    return {
      error,
      surprise,
      precision,
      freeEnergy,
      gain: surpriseGain(surprise, this.count),
      n: this.count,
      residual,
    };
  }
}

/**
 * Inverted-U learning gain.
 *
 * Fully predicted input (surprise → 0) teaches nothing. Wildly surprising
 * input is almost always noise or a channel change, and chasing it corrupts
 * the codebook. The peak sits at unit surprise — one standard deviation of
 * this channel's own residual — and falls off with a log-normal profile of
 * width φ⁻¹.
 *
 * During the first few observations the variance estimate is not yet
 * meaningful, so the gain is damped by a warm-up factor.
 */
export function surpriseGain(surprise: number, n = Infinity): number {
  if (!Number.isFinite(surprise) || surprise <= 0) return 0;
  const l = Math.log(surprise);
  const g = Math.exp(-(l * l) / (2 * PHI_INV * PHI_INV));
  const warmup = n >= 8 ? 1 : Math.max(0, n / 8);
  return Math.max(0, Math.min(1, g * warmup));
}

/**
 * Multi-scale coder bank: one coder per timescale, Fibonacci-strided so each
 * level sees the input at a coarser cadence. Level k observes every F(k+2)-th
 * frame, giving genuine hierarchical prediction rather than a single lag.
 */
const FIB_STRIDE = [1, 2, 3, 5, 8, 13, 21];

export interface HierarchicalSurprise {
  levels: SurpriseReport[];
  /** Geometric mean of per-level gains that fired this tick. */
  gain: number;
  /** Sum of per-level free energy. */
  totalFreeEnergy: number;
  /** Index of the level with the highest surprise. */
  dominantLevel: number;
}

export class HierarchicalCoder {
  private readonly coders: PredictiveCoder[];

  private tick = 0;

  private last: (SurpriseReport | null)[];

  constructor(dim = 22, levels = 5) {
    const n = Math.max(1, Math.min(FIB_STRIDE.length, levels));
    this.coders = Array.from({ length: n }, () => new PredictiveCoder(dim));
    this.last = Array.from({ length: n }, () => null);
  }

  reset(): void {
    for (const c of this.coders) c.reset();
    this.last = this.last.map(() => null);
    this.tick = 0;
  }

  observe(x: ArrayLike<number>): HierarchicalSurprise {
    this.tick += 1;
    const fired: number[] = [];
    for (let k = 0; k < this.coders.length; k += 1) {
      if (this.tick % FIB_STRIDE[k] !== 0) continue;
      this.last[k] = this.coders[k].observe(x);
      fired.push(k);
    }
    const reports = this.last.filter((r): r is SurpriseReport => r !== null);
    let logSum = 0;
    let cnt = 0;
    for (const k of fired) {
      const r = this.last[k];
      if (!r) continue;
      logSum += Math.log(Math.max(1e-9, r.gain));
      cnt += 1;
    }
    let dominant = 0;
    let best = -Infinity;
    this.last.forEach((r, i) => {
      if (r && r.surprise > best) { best = r.surprise; dominant = i; }
    });
    return {
      levels: reports,
      gain: cnt > 0 ? Math.exp(logSum / cnt) : 0,
      totalFreeEnergy: reports.reduce((a, r) => a + r.freeEnergy, 0),
      dominantLevel: dominant,
    };
  }
}

export const PREDICTIVE_CODING_PROVENANCE =
  'Predictive coding after Rao & Ballard (1999) and Friston (2010). Precision ' +
  'is the inverse online residual variance (Welford), so the surprise gate ' +
  'calibrates to the channel noise floor rather than a tuned constant. The ' +
  'inverted-U gain peaks at unit surprise with log-normal width phi^-1.';