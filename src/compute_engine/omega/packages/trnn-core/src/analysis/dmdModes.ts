/**
 * dmdModes — Ω-REAL P9 extension: DMD/Koopman mode discovery over the ladder's
 * coherence trajectory, run in the analysis service's long-heartbeat batch slot.
 *
 * The service holds one fixed-depth ring of per-rung coherence per tick. Pushed in
 * lockstep, those rings form a matrix whose columns are ticks and whose rows are
 * rungs; each COLUMN is one snapshot of the ladder's coherence state. `fitDmd`
 * then reads the best-fit linear operator A and its eigenvalues → the collective
 * modes (growth rate, frequency, energy share) of the ladder's coherence dynamics.
 *
 * DESIGN RULES (identical to the rest of the substrate):
 *  • observe-only: reads already-materialised rings, writes nothing;
 *  • abstain, never fabricate: fewer than MIN_SNAPSHOTS snapshots or fewer than
 *    2 rungs → a report with `abstained: true`, never invented modes;
 *  • bounded cost: the DMD Gram/Jacobi route is O(m²·D + m³); the window is capped
 *    at F11 = 89 snapshots so a long heartbeat never degrades into a dense 232²
 *    eigendecomposition.
 */

import { fitDmd, MIN_SNAPSHOTS, type DmdMode } from '../substrate/dmd';
import { pseudospectrum } from '../substrate/pseudospectrum';
import { floquet } from '../substrate/floquet';

/** F11 = 89 — bounds the batch-path DMD cost (Gram 88×88, not 232×232). */
export const DMD_WINDOW = 89;

export interface DmdLadderReport {
  readonly tick: number;
  readonly rank: number;
  readonly modes: readonly DmdMode[];
  /** max|λ| of the fitted operator; >1 ⇒ the fitted modes grow. */
  readonly spectralRadius: number;
  /** ‖Y − A·X‖_F / ‖Y‖_F of the projected operator. */
  readonly relError: number;
  readonly abstained: boolean;
  readonly reason?: string;
  /** M2 — min σ_min of the ε-pseudospectrum over the grid (the non-normality / resonance horizon). */
  readonly pseudoMinSigma: number;
  /** M2 — Floquet spectral radius of the reduced operator (period-1 monodromy). */
  readonly floquetRadius: number;
}

/**
 * Fit DMD over aligned per-rung coherence series. Each series is a chronological
 * Float64Array (oldest → newest) of one rung's coherence; all series must be the
 * same length (the service pushes rings in lockstep). Returns an abstained report,
 * never null, so the service can always publish it.
 */
export function ladderDmd(
  rungSeries: readonly ArrayLike<number>[],
  tick: number,
): DmdLadderReport {
  if (rungSeries.length < 2) {
    return { tick, rank: 0, modes: [], spectralRadius: NaN, relError: NaN, abstained: true, reason: 'fewer than 2 rungs', pseudoMinSigma: NaN, floquetRadius: NaN };
  }
  const n = rungSeries[0].length;
  for (const s of rungSeries) {
    if (s.length !== n) {
      return { tick, rank: 0, modes: [], spectralRadius: NaN, relError: NaN, abstained: true, reason: 'unaligned series lengths', pseudoMinSigma: NaN, floquetRadius: NaN };
    }
  }
  if (n < MIN_SNAPSHOTS) {
    return { tick, rank: 0, modes: [], spectralRadius: NaN, relError: NaN, abstained: true, reason: `n=${n} < MIN_SNAPSHOTS=${MIN_SNAPSHOTS}`, pseudoMinSigma: NaN, floquetRadius: NaN };
  }

  const start = Math.max(0, n - DMD_WINDOW);
  const snapshots: Float64Array[] = [];
  for (let t = start; t < n; t++) {
    const v = new Float64Array(rungSeries.length);
    for (let r = 0; r < rungSeries.length; r++) v[r] = rungSeries[r][t];
    snapshots.push(v);
  }

  const fit = fitDmd(snapshots);
  if (!fit) {
    return { tick, rank: 0, modes: [], spectralRadius: NaN, relError: NaN, abstained: true, reason: 'DMD fit did not exist', pseudoMinSigma: NaN, floquetRadius: NaN };
  }

  // M2 — pseudospectrum (non-normality / resonance horizon) and Floquet
  // multipliers of the reduced DMD operator Ã, computed on a coarse grid so the
  // batch slot stays bounded. A non-normal Ã has σ_min(zI−Ã) ≪ dist(z, spec)
  // — the smaller pseudoMinSigma, the more non-normal (effectively resonant)
  // the fitted coherence dynamics are.
  const g = Math.max(fit.spectralRadius, 0.5);
  const reGrid = [0, 0.5 * g, 0.9 * g, g, 1.1 * g];
  const imGrid = [0, 0.2, 0.5];
  const pts = pseudospectrum(fit.operator, fit.rank, reGrid, imGrid);
  let pseudoMinSigma = Infinity;
  for (const p of pts) if (p.sigmaMin < pseudoMinSigma) pseudoMinSigma = p.sigmaMin;

  const fl = floquet(fit.operator, fit.rank, 1);

  return {
    tick,
    rank: fit.rank,
    modes: fit.modes,
    spectralRadius: fit.spectralRadius,
    relError: fit.relError,
    abstained: false,
    pseudoMinSigma,
    floquetRadius: fl.spectralRadius,
  };
}
