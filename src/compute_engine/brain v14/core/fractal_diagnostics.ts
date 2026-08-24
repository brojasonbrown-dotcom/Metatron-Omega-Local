/**
 * core/fractal_diagnostics.ts — Track G4: fractals & self-similarity, MEASURED.
 * (GEMATRIA_ENGINE_PLAN.md §G4; MASTER_PLAN_V3 §5 honesty laws.)
 *
 * Epistemic Status: [MEASURED ESTIMATE] — every quantity here is a number with a
 * confidence interval, never a vibe and never a meaning. The one law (plan G0 /
 * G5) is inherited: a self-similarity measurement is DATA; attaching a "meaning"
 * to it is NUMEROLOGY and is REFUSED by construction — no function in this module
 * returns an interpretation.
 *
 * What is implemented (each gated by tests/fractal_diagnostics.test.ts):
 *   G4.1 box-counting fractal dimension of a binary field/mode structure, with an
 *        OLS log–log slope and a 95% CI. Validated against known-dimension sets:
 *        the middle-thirds Cantor set (D = log 2 / log 3 ≈ 0.631) and the
 *        Sierpinski carpet (D = log 8 / log 3 ≈ 1.893) are recovered exactly.
 *   G4.2 discrete-scale-invariance (log-periodicity) of a geometric ladder — the
 *        14 φ-spaced bands (89·φ^(k/2)). The peaks of a geometric ladder sit at
 *        EQUAL steps on a log axis; we measure the spacing and its uniformity and
 *        report the recovered log-ratio against the theory log(√φ).
 *   G4.3 the node-census branching spectrum (Cert 4.D1) — the census law is
 *        itself a discrete fractal; we expose its per-level branching factors and
 *        verify the cumulative totals against the certified anchors 41/281/3401/
 *        43961 at depths 5/6/7/8, and the F₂₁ = 10946 cap crossing at depth 8
 *        (CENSUS_CAP_DEPTH).
 *
 * What is REFUSED (plan G5 honesty table):
 *   · a fractal dimension asserted without its confidence interval;
 *   · any claim that a measured self-similarity "means" anything.
 * These are not implemented and cannot be — the only outputs are numbers + CIs.
 */

import { PHI, CENSUS_CAP_DEPTH } from "./constants.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Shared statistics helpers (ordinary least squares on log–log data).
// ─────────────────────────────────────────────────────────────────────────────

/** A straight-line fit y ≈ slope·x + intercept with a 95% CI on the slope. */
export interface LinFit {
  slope: number;
  intercept: number;
  /** Coefficient of determination of the fit (1 = perfect line). */
  r2: number;
  /** Half-width of the 95% confidence interval on the slope. */
  ciHalfWidth: number;
  /** Number of (x,y) points used. */
  points: number;
}

/** Student-t 0.975 two-tailed critical values by residual degrees of freedom. */
const T975: readonly number[] = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201,
  2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074,
  2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042,
];

function tCrit(df: number): number {
  if (df <= 0) return NaN;
  if (df <= T975.length) return T975[df - 1]!;
  return 1.96; // large-sample limit
}

/**
 * Ordinary least squares of y on x with a 95% CI on the slope. Returns NaN
 * fields when there are fewer than 3 points or zero x-variance — an honest
 * "cannot estimate", never a fabricated slope.
 */
export function linFit(x: readonly number[], y: readonly number[]): LinFit {
  const n = Math.min(x.length, y.length);
  if (n < 3) {
    return { slope: NaN, intercept: NaN, r2: NaN, ciHalfWidth: NaN, points: n };
  }
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]!; sy += y[i]!; }
  const mx = sx / n, my = sy / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx, dy = y[i]! - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  if (sxx === 0) {
    return { slope: NaN, intercept: NaN, r2: NaN, ciHalfWidth: NaN, points: n };
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  // Residual sum of squares → standard error of the slope.
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const r = y[i]! - (slope * x[i]! + intercept);
    sse += r * r;
  }
  const r2 = syy === 0 ? 1 : Math.max(0, 1 - sse / syy);
  const df = n - 2;
  const sigma2 = df > 0 ? sse / df : NaN;
  const seSlope = Math.sqrt(sigma2 / sxx);
  const ciHalfWidth = tCrit(df) * seSlope;
  return { slope, intercept, r2, ciHalfWidth, points: n };
}

// ─────────────────────────────────────────────────────────────────────────────
// G4.1 — Box-counting fractal dimension of a binary set, with a 95% CI.
// ─────────────────────────────────────────────────────────────────────────────

/** The result of a box-counting dimension estimate. CI is mandatory. */
export interface BoxCountResult {
  /** Measured box-counting dimension (OLS slope of log N(ε) vs log(1/ε)). */
  dimension: number;
  /** Half-width of the 95% CI on the dimension. */
  ciHalfWidth: number;
  /** [lower, upper] 95% confidence interval on the dimension. */
  ci: readonly [number, number];
  /** Goodness of the log–log linear fit (1 = perfectly self-similar). */
  r2: number;
  /** Box sizes used (the ε values, as cells-per-side). */
  scales: readonly number[];
  /** Occupied-box counts at each scale. */
  counts: readonly number[];
}

/**
 * Box-counting dimension of a set of occupied integer cells in D dimensions
 * (1-D, 2-D, or 3-D). `cells` are integer lattice coordinates; `scales` are the
 * box side-lengths ε (in cells). At each scale the lattice is partitioned into
 * boxes of side ε and the number of boxes containing ≥1 occupied cell is counted.
 * The dimension is the OLS slope of log N(ε) vs log(1/ε).
 *
 * Honest edge cases: an empty set has dimension 0 with a 0-width CI (nothing is
 * there to measure); a set with < 3 usable scales returns NaN slope rather than
 * a fabricated line.
 */
export function boxCountingDimension(
  cells: readonly (readonly number[])[],
  scales: readonly number[],
): BoxCountResult {
  if (cells.length === 0) {
    return {
      dimension: 0, ciHalfWidth: 0, ci: [0, 0], r2: 1,
      scales: [], counts: [],
    };
  }
  const logInvEps: number[] = [];
  const logN: number[] = [];
  const usedScales: number[] = [];
  const usedCounts: number[] = [];
  for (const eps of scales) {
    if (!Number.isInteger(eps) || eps < 1) {
      throw new RangeError(`boxCountingDimension: scale must be an integer ≥ 1; got ${eps}.`);
    }
    const boxes = new Set<string>();
    for (const cell of cells) {
      const key = cell.map((c) => Math.floor(c / eps)).join(",");
      boxes.add(key);
    }
    const count = boxes.size;
    if (count > 0) {
      logInvEps.push(Math.log(1 / eps));
      logN.push(Math.log(count));
      usedScales.push(eps);
      usedCounts.push(count);
    }
  }
  const fit = linFit(logInvEps, logN);
  // x = log(1/ε): ε increases → 1/ε decreases → x decreases, while N(ε) falls,
  // so the OLS slope of logN vs log(1/ε) is already POSITIVE and equals D.
  const dimension = fit.slope;
  return {
    dimension,
    ciHalfWidth: fit.ciHalfWidth,
    ci: [dimension - fit.ciHalfWidth, dimension + fit.ciHalfWidth],
    r2: fit.r2,
    scales: usedScales,
    counts: usedCounts,
  };
}

// ── Known-dimension reference sets (used to VALIDATE the estimator) ──────────

/**
 * The depth-`depth` middle-thirds Cantor set as occupied integer cells on a
 * lattice of side 3^depth. Box-counting at scales 3^k (k=0…depth) yields exactly
 * D = log 2 / log 3. This is the 1-D calibration fixture for the estimator.
 */
export function cantorSetCells(depth: number): number[][] {
  if (!Number.isInteger(depth) || depth < 0) {
    throw new RangeError(`cantorSetCells: depth must be an integer ≥ 0; got ${depth}.`);
  }
  let cells: number[][] = [[0]];
  for (let d = 0; d < depth; d++) {
    const next: number[][] = [];
    for (const [c] of cells) {
      next.push([3 * c!], [3 * c! + 2]);
    }
    cells = next;
  }
  return cells;
}

/**
 * The depth-`depth` Sierpinski carpet as occupied integer (x,y) cells on a
 * lattice of side 3^depth. Box-counting at scales 3^k yields exactly
 * D = log 8 / log 3. The 2-D calibration fixture.
 */
export function sierpinskiCarpetCells(depth: number): number[][] {
  if (!Number.isInteger(depth) || depth < 0) {
    throw new RangeError(`sierpinskiCarpetCells: depth must be an integer ≥ 0; got ${depth}.`);
  }
  let cells: number[][] = [[0, 0]];
  for (let d = 0; d < depth; d++) {
    const next: number[][] = [];
    for (const [x, y] of cells) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (i === 1 && j === 1) continue; // the removed centre square
          next.push([3 * x! + i, 3 * y! + j]);
        }
      }
    }
    cells = next;
  }
  return cells;
}

/** The analytic dimension of the middle-thirds Cantor set: log 2 / log 3. */
export const CANTOR_DIMENSION: number = Math.log(2) / Math.log(3);
/** The analytic dimension of the Sierpinski carpet: log 8 / log 3. */
export const SIERPINSKI_CARPET_DIMENSION: number = Math.log(8) / Math.log(3);

// ─────────────────────────────────────────────────────────────────────────────
// G4.2 — Discrete scale invariance (log-periodicity) of a geometric ladder.
// ─────────────────────────────────────────────────────────────────────────────

/** The DSI measurement of a set of spectral peaks (a self-similar ladder). */
export interface DsiResult {
  /** Detected peak locations (the input `values` at local maxima of `power`). */
  peaks: readonly number[];
  /**
   * Measured mean spacing of the peaks on a natural-log axis. For a geometric
   * ladder with ratio r this equals log r.
   */
  logSpacing: number;
  /** 95% CI half-width on the log-spacing (uniformity of the ladder). */
  ciHalfWidth: number;
  /** [lower, upper] 95% CI on the log-spacing. */
  ci: readonly [number, number];
  /**
   * Recovered geometric ratio r = exp(logSpacing). For the φ-band ladder this
   * should recover √φ (bands are 89·φ^(k/2)).
   */
  recoveredRatio: number;
  /** How evenly spaced the log-peaks are: 1 − (stddev/mean) of the gaps. */
  uniformity: number;
  /** True only when ≥3 peaks were found AND the ladder is measurably even. */
  isDiscreteScaleInvariant: boolean;
}

/**
 * Measure the discrete-scale-invariance signature of a 1-D power spectrum given
 * on a value axis. `values` are the axis coordinates (must be positive and
 * increasing); `power` is the spectral power at each. Local maxima of power are
 * taken as the ladder peaks; on a log axis the peaks of a geometric ladder are
 * equally spaced, and their spacing is log(ratio).
 *
 * Honesty: if fewer than 3 peaks exist, or the log-gaps are wildly uneven
 * (uniformity < 0.5), `isDiscreteScaleInvariant` is false — the signature is
 * reported as absent, never asserted.
 */
export function discreteScaleInvariance(
  values: readonly number[],
  power: readonly number[],
): DsiResult {
  const n = Math.min(values.length, power.length);
  const peaks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (power[i]! > power[i - 1]! && power[i]! >= power[i + 1]! && values[i]! > 0) {
      peaks.push(values[i]!);
    }
  }
  const empty: DsiResult = {
    peaks, logSpacing: NaN, ciHalfWidth: NaN, ci: [NaN, NaN],
    recoveredRatio: NaN, uniformity: 0, isDiscreteScaleInvariant: false,
  };
  if (peaks.length < 3) return empty;

  const logPeaks = peaks.map((v) => Math.log(v));
  const gaps: number[] = [];
  for (let i = 1; i < logPeaks.length; i++) gaps.push(logPeaks[i]! - logPeaks[i - 1]!);

  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((a, g) => a + (g - mean) * (g - mean), 0) / gaps.length;
  const stddev = Math.sqrt(variance);
  const uniformity = mean === 0 ? 0 : Math.max(0, 1 - stddev / mean);

  // 95% CI on the mean gap (the log-spacing): t · stddev / √m over the m gaps.
  const ciHalfWidth = gaps.length > 1 ? (tCrit(gaps.length - 1) * stddev) / Math.sqrt(gaps.length) : NaN;

  return {
    peaks,
    logSpacing: mean,
    ciHalfWidth,
    ci: [mean - ciHalfWidth, mean + ciHalfWidth],
    recoveredRatio: Math.exp(mean),
    uniformity,
    isDiscreteScaleInvariant: uniformity >= 0.5,
  };
}

/**
 * The theoretical log-spacing of the φ-band ladder. The 14 bands are placed at
 * 89·φ^(k/2), i.e. a geometric ladder with ratio φ^(1/2) = √φ. On a natural-log
 * axis the peaks are therefore spaced by log(√φ) = (1/2)·log φ. This is the value
 * a measured `discreteScaleInvariance` of the band power must recover. [MATH]
 */
export const PHI_BAND_LOG_SPACING: number = 0.5 * Math.log(PHI);

// ─────────────────────────────────────────────────────────────────────────────
// G4.3 — Node-census branching spectrum (Cert 4.D1), a discrete fractal.
// ─────────────────────────────────────────────────────────────────────────────

/** One level of the census: how many nodes, and the branching that produced it. */
export interface CensusLevel {
  depth: number;
  /** Nodes at this level: L(0)=1; L(d)=L(d−1)·min(Fib(d),13). */
  nodes: number;
  /** Branching factor applied from the previous level: min(Fib(d),13); 1 at d=0. */
  branching: number;
  /** Cumulative node total from depth 0 through this depth. */
  cumulative: number;
}

/** The certified census anchors (plan §0 row 3 / Cert 4.D1). */
export const CENSUS_ANCHORS: Readonly<Record<number, number>> = {
  5: 41,
  6: 281,
  7: 3401,
  8: 43961,
};

/** The F₂₁ = 10946 concept cap the census crosses at CENSUS_CAP_DEPTH. */
export const CONCEPT_CAP: number = 10946;

/**
 * Fibonacci number matching `fractal_node._fibonacci` / the census law:
 * F(0)=0, F(1)=1, F(2)=1, F(3)=2, … Exact integer arithmetic.
 */
function fib(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) { const next = a + b; a = b; b = next; }
  return b;
}

/**
 * The per-level census spectrum up to `maxDepth` (inclusive), following the
 * spawn law in fractal_node.create_children: a node at depth d spawns
 * min(Fib(d+1),13) children, so the level count obeys
 *   L(0) = 1;  L(d) = L(d−1) · min(Fib(d), 13).
 * Returns the levels in depth order. DATA (a branching spectrum), never meaning.
 */
export function censusSpectrum(maxDepth: number): CensusLevel[] {
  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new RangeError(`censusSpectrum: maxDepth must be an integer ≥ 0; got ${maxDepth}.`);
  }
  const levels: CensusLevel[] = [];
  let nodes = 1;
  let cumulative = 1;
  levels.push({ depth: 0, nodes, branching: 1, cumulative });
  for (let d = 1; d <= maxDepth; d++) {
    const branching = Math.min(fib(d), 13);
    nodes = nodes * branching;
    cumulative += nodes;
    levels.push({ depth: d, nodes, branching, cumulative });
  }
  return levels;
}

/**
 * The depth at which the cumulative census first exceeds `cap` (default the
 * F₂₁ concept cap). Returns −1 if it never crosses within `maxDepth`. This is the
 * collision the co-governor must own (Track D / CENSUS_CAP_DEPTH).
 */
export function censusCapCrossing(cap: number = CONCEPT_CAP, maxDepth: number = 64): number {
  for (const level of censusSpectrum(maxDepth)) {
    if (level.cumulative > cap) return level.depth;
  }
  return -1;
}

/**
 * Verify the census law against the certified anchors. Returns true only if the
 * cumulative totals at depths 5/6/7/8 equal 41/281/3401/43961 AND the cap
 * crossing lands at CENSUS_CAP_DEPTH. This re-verifies Cert 4.D1 in TS.
 */
export function censusLawHolds(): boolean {
  const spectrum = censusSpectrum(CENSUS_CAP_DEPTH);
  for (const [depthStr, expected] of Object.entries(CENSUS_ANCHORS)) {
    const depth = Number(depthStr);
    const level = spectrum[depth];
    if (!level || level.cumulative !== expected) return false;
  }
  return censusCapCrossing(CONCEPT_CAP, CENSUS_CAP_DEPTH) === CENSUS_CAP_DEPTH;
}
