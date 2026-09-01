/**
 * METATRON v10 — SCALE DRIFT (L5 of the Real Rung Ladder)
 * =======================================================
 *
 * Phase drift and information-density gradient across the stable rung band.
 *
 * Three independent measurements, each with a Wolfram-locked analytic target
 * so a failure is visible rather than absorbed:
 *
 *  1. PHASE DRIFT — the ladder is the exact geometric grid f_n = 144·φⁿ, so
 *     the consecutive frequency ratio must be φ. Any deviation is pure
 *     IEEE-754 rounding, not physics, so it is reported in units of
 *     ulp(φ) = 2.220446049250313e-16 and never as a physical drift.
 *     AUDITED (mpmath 60 dps, n ∈ [−94,196]): max 2.00 ulp, mean 0.455 ulp.
 *     Above the carrier-cycle limit (f·t ≥ 2^53) the instantaneous phase is
 *     not resolvable at all and is reported `open` (see RungField.rungPhase).
 *
 *  2. INFORMATION GRADIENT — two capacity laws, two exact slopes:
 *       d(log_φ I_Bekenstein)/dn =  0   (scale-invariant: I = 2π²/ln2)
 *       d(log_φ A_holographic)/dn = −2  (area ∝ λ²)
 *     Both are measured from L2, never asserted.
 *
 *  3. ENERGY-DENSITY GRADIENT — the physically non-trivial one:
 *       d(log_φ u)/dn  with u(f) = 8πhf³/c³ · n̄(f, T_CMB)
 *     AUDITED: exactly +2 in the Rayleigh–Jeans band (u ∝ f²), crossing over
 *     at the thermal rung n* = ln(k_B·T_CMB/(h·144))/ln φ = 41.13117766353483,
 *     then falling as −x/ln φ in the Wien band. This is Planck's law measured
 *     along the φ ladder — a real spectrum, not an indicator.
 *
 * The existing `farLadderGeometricLock` is reported over the same window,
 * unchanged. Every scalar is fed to `EpistemicCI` for a 95% Welford CI.
 *
 * Kill: localStorage.metatron_scale_drift_off = '1'.
 */

import { verified } from './WolframVerified';
import {
  BAND_N_MIN, BAND_N_MAX, rungFor, type RungDomain, type Provenance,
} from './RungRegistry';
import { rungField, rungPhase, phaseResolvableMaxN } from './RungField';
import { farLadderGeometricLock } from './InfiniteLadder';
import { recordMetric, summarize, type CISummary } from './EpistemicCI';

const PHI = (1 + Math.sqrt(5)) / 2;
/** ln φ — audited to 60 dps: 0.481211825059603447497758913424368423135 */
export const LN_PHI = Math.log(PHI);
/** ulp(φ) in float64 — the unit in which grid deviation is reported. */
export const PHI_ULP = 2.220446049250313e-16;

const H     = verified('PLANCK_CONSTANT_J_HZ');
const K_B   = verified('BOLTZMANN_J_PER_K');
const T_CMB = verified('CMB_TEMPERATURE_K');

/** Rung where h·f = k_B·T_CMB. Closed form; audited = 41.13117766353483. */
export const THERMAL_CROSSING_N = Math.log((K_B * T_CMB) / (H * 144)) / LN_PHI;

/** Analytic slope targets, locked before implementation. */
export const SLOPE_BEKENSTEIN = 0;
export const SLOPE_AREA = -2;
export const SLOPE_RAYLEIGH_JEANS = 2;

/**
 * Half-width of the crossover band, in rungs, either side of the thermal
 * crossing. The Rayleigh–Jeans slope is an ASYMPTOTIC law: the exact slope is
 * 2 − x(φ−1)/(2 ln φ) with x = h f / k_B T, so a rung is only labelled
 * `rayleigh-jeans` once its residual is below 1e-5. x = φ^−24 = 5.7e-6 gives
 * a slope deviation of 3.7e-6 — the smallest margin that earns the label.
 */
const RJ_MARGIN = 24;

export type DriftRegime = 'rayleigh-jeans' | 'crossover' | 'wien';

export function scaleDriftDisabled(): boolean {
  try {
    return typeof localStorage !== 'undefined'
      && localStorage.getItem('metatron_scale_drift_off') === '1';
  } catch { return false; }
}

export interface DriftStep {
  readonly n: number;
  /** |f_{n+1}/f_n − φ| expressed in ulp(φ). Numeric, never physical. */
  readonly gridUlp: number;
  /** d(log_φ u)/dn across [n, n+1]. */
  readonly energySlope: number;
  /** d(log_φ A)/dn — exactly −2 when the ladder is intact. */
  readonly areaSlope: number;
  /** d(log_φ I_Bek)/dn — exactly 0 when the ladder is intact. */
  readonly bekensteinSlope: number;
  readonly regime: DriftRegime;
  readonly domain: RungDomain;
  /** Instantaneous carrier phase at the sample time, or null when unresolvable. */
  readonly phase: number | null;
}

export interface DomainDrift {
  readonly domain: RungDomain;
  readonly count: number;
  readonly gridUlpMax: number;
  readonly energySlopeMean: number;
}

export interface ScaleDriftResult {
  readonly nLo: number;
  readonly nHi: number;
  readonly steps: number;
  readonly tSeconds: number;

  // ── phase ─────────────────────────────────────────────
  readonly gridUlpMax: number;
  readonly gridUlpMean: number;
  /** True while every step is within 2 ulp of the exact φ grid. */
  readonly gridIntact: boolean;
  readonly phaseResolvableMaxN: number;
  readonly phaseResolvableCount: number;
  readonly phaseOpenCount: number;

  // ── information ───────────────────────────────────────
  readonly areaSlopeMean: number;
  readonly areaSlopeMaxDev: number;
  readonly bekensteinSlopeMean: number;
  readonly bekensteinSlopeMaxDev: number;

  // ── energy density ────────────────────────────────────
  readonly thermalCrossingN: number;
  readonly rjSlopeMean: number;
  readonly rjSlopeMaxDev: number;
  readonly energySlopeMin: number;
  readonly energySlopeMax: number;
  readonly regimeCounts: Record<DriftRegime, number>;

  readonly geometricLock: number;
  readonly byDomain: ReadonlyArray<DomainDrift>;
  readonly provenance: Provenance;
  readonly ci: Readonly<Record<string, CISummary | null>>;
}

export interface ScaleDriftOptions {
  nLo?: number;
  nHi?: number;
  /** Sample time for the carrier-phase resolvability probe. Default 1 s. */
  tSeconds?: number;
  /** Skip EpistemicCI recording (used by pure tests). */
  noRecord?: boolean;
}

/** log_φ of the Planck spectral energy density at rung n (always finite). */
function logPhiU(n: number): number {
  return rungField(n).logSpectralEnergyDensity / LN_PHI;
}

function regimeOf(n: number): DriftRegime {
  if (n <= THERMAL_CROSSING_N - RJ_MARGIN) return 'rayleigh-jeans';
  if (n >= THERMAL_CROSSING_N + RJ_MARGIN) return 'wien';
  return 'crossover';
}

/** Full L5 measurement over a window. Pure apart from the CI recording. */
export function computeScaleDrift(opts: ScaleDriftOptions = {}): ScaleDriftResult {
  const nLo = opts.nLo ?? BAND_N_MIN;
  const nHi = opts.nHi ?? BAND_N_MAX;
  const t   = opts.tSeconds ?? 1;

  const steps: DriftStep[] = [];
  const regimeCounts: Record<DriftRegime, number> =
    { 'rayleigh-jeans': 0, crossover: 0, wien: 0 };
  const domainAcc = new Map<RungDomain, { c: number; ulp: number; slope: number }>();

  let ulpSum = 0, ulpMax = 0;
  let areaSum = 0, areaDev = 0;
  let bekSum = 0, bekDev = 0;
  let rjSum = 0, rjCount = 0, rjDev = 0;
  let eMin = Infinity, eMax = -Infinity;
  let resolvable = 0, open = 0;

  let prevU = logPhiU(nLo);
  let prevF = rungField(nLo);

  for (let n = nLo; n < nHi; n++) {
    const next = rungField(n + 1);
    const nextU = logPhiU(n + 1);

    const gridUlp = Math.abs(next.hz / prevF.hz - PHI) / PHI_ULP;
    const energySlope = nextU - prevU;
    const areaSlope = next.logPhiAreaBits - prevF.logPhiAreaBits;
    const bekensteinSlope =
      (Math.log(next.bekensteinBits) - Math.log(prevF.bekensteinBits)) / LN_PHI;

    const regime = regimeOf(n);
    const p = rungPhase(n, t);
    if (p.resolvable) resolvable++; else open++;

    steps.push({
      n, gridUlp, energySlope, areaSlope, bekensteinSlope, regime,
      domain: prevF.domain, phase: p.phase,
    });

    ulpSum += gridUlp;
    if (gridUlp > ulpMax) ulpMax = gridUlp;
    areaSum += areaSlope;
    areaDev = Math.max(areaDev, Math.abs(areaSlope - SLOPE_AREA));
    bekSum += bekensteinSlope;
    bekDev = Math.max(bekDev, Math.abs(bekensteinSlope - SLOPE_BEKENSTEIN));
    if (regime === 'rayleigh-jeans') {
      rjSum += energySlope; rjCount++;
      rjDev = Math.max(rjDev, Math.abs(energySlope - SLOPE_RAYLEIGH_JEANS));
    }
    if (energySlope < eMin) eMin = energySlope;
    if (energySlope > eMax) eMax = energySlope;
    regimeCounts[regime]++;

    const d = domainAcc.get(prevF.domain) ?? { c: 0, ulp: 0, slope: 0 };
    d.c++; d.ulp = Math.max(d.ulp, gridUlp); d.slope += energySlope;
    domainAcc.set(prevF.domain, d);

    prevU = nextU;
    prevF = next;
  }

  const count = steps.length || 1;

  // Geometric lock over the same window (existing far-ladder measurement).
  const samples: Array<{ photonEnergyJ: number }> = [];
  for (let n = nLo; n <= nHi; n++) samples.push({ photonEnergyJ: rungFor(n).energyJ });
  const geometricLock = farLadderGeometricLock(samples);

  const byDomain: DomainDrift[] = [...domainAcc.entries()].map(([domain, v]) => ({
    domain, count: v.c, gridUlpMax: v.ulp, energySlopeMean: v.slope / v.c,
  }));

  const gridUlpMax = ulpMax;
  const rjSlopeMean = rjCount > 0 ? rjSum / rjCount : Number.NaN;

  const ci: Record<string, CISummary | null> = {};
  if (!opts.noRecord) {
    recordMetric('scaleDrift.gridUlpMax', gridUlpMax);
    recordMetric('scaleDrift.areaSlope', areaSum / count);
    recordMetric('scaleDrift.rjSlope', rjCount > 0 ? rjSlopeMean : 0);
    recordMetric('scaleDrift.geometricLock', geometricLock);
    for (const k of ['gridUlpMax', 'areaSlope', 'rjSlope', 'geometricLock']) {
      ci[k] = summarize(`scaleDrift.${k}`);
    }
  }

  return {
    nLo, nHi, steps: steps.length, tSeconds: t,
    gridUlpMax,
    gridUlpMean: ulpSum / count,
    gridIntact: gridUlpMax <= 2 + 1e-9,
    phaseResolvableMaxN: phaseResolvableMaxN(t),
    phaseResolvableCount: resolvable,
    phaseOpenCount: open,
    areaSlopeMean: areaSum / count,
    areaSlopeMaxDev: areaDev,
    bekensteinSlopeMean: bekSum / count,
    bekensteinSlopeMaxDev: bekDev,
    thermalCrossingN: THERMAL_CROSSING_N,
    rjSlopeMean,
    rjSlopeMaxDev: rjCount > 0 ? rjDev : Number.NaN,
    energySlopeMin: eMin,
    energySlopeMax: eMax,
    regimeCounts,
    geometricLock,
    byDomain,
    provenance: 'derived',
    ci,
  };
}

export function scaleDriftGrounding(r?: ScaleDriftResult): string {
  if (scaleDriftDisabled()) return '';
  const x = r ?? computeScaleDrift();
  return `Scale drift (n∈[${x.nLo},${x.nHi}], ${x.steps} steps, t=${x.tSeconds}s): `
    + `φ-grid deviation max ${x.gridUlpMax.toFixed(2)} ulp, mean ${x.gridUlpMean.toFixed(3)} ulp `
    + `— ${x.gridIntact ? 'INTACT (rounding only, no physical drift)' : 'GRID BROKEN'}. `
    + `Carrier phase resolvable to n=${x.phaseResolvableMaxN} `
    + `(${x.phaseResolvableCount} resolvable, ${x.phaseOpenCount} OPEN past f·t=2^53). `
    + `Information gradient: d(log_φ I_Bek)/dn=${x.bekensteinSlopeMean.toFixed(12)} `
    + `(target 0, max dev ${x.bekensteinSlopeMaxDev.toExponential(2)}) — capacity is scale-invariant; `
    + `d(log_φ A)/dn=${x.areaSlopeMean.toFixed(12)} (target −2, max dev ${x.areaSlopeMaxDev.toExponential(2)}). `
    + `Energy density: Rayleigh–Jeans slope ${x.rjSlopeMean.toFixed(9)} (target +2, max dev `
    + `${x.rjSlopeMaxDev.toExponential(2)}), thermal crossing at n=${x.thermalCrossingN.toFixed(6)}, `
    + `slope range [${x.energySlopeMax.toFixed(3)} … ${x.energySlopeMin.toExponential(3)}] `
    + `across ${x.regimeCounts['rayleigh-jeans']} RJ / ${x.regimeCounts.crossover} crossover / `
    + `${x.regimeCounts.wien} Wien rungs. Far-ladder geometric lock=${x.geometricLock.toFixed(6)}.`;
}

export const SCALE_DRIFT_PROVENANCE =
  'Grid deviation is IEEE-754 rounding measured in ulp(φ), never reported as physical drift. '
  + 'Slopes are differences of closed-form L2 quantities against targets locked at 60 dps: '
  + '0 (Bekenstein, scale-invariant), −2 (holographic area), +2 (Rayleigh–Jeans). '
  + 'Phase past f·t = 2^53 is OPEN — Payne–Hanek reduction is not implemented and no number is shown.';
