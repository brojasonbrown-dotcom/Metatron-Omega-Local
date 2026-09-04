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
    return { tick, rank: 0, modes: [], spectralRadius: NaN, relError: NaN, abstained: true, reason: 'fewer than 2 rungs' };
  }
  const n = rungSeries[0].length;
  for (const s of rungSeries) {
    if (s.length !== n) {
      return { tick, rank: 0, modes: [], spectralRadius: NaN, relError: NaN, abstained: true, reason: 'unaligned series lengths' };
    }
  }
  if (n < MIN_SNAPSHOTS) {
    return { tick, rank: 0, modes: [], spectralRadius: NaN, relError: NaN, abstained: true, reason: `n=${n} < MIN_SNAPSHOTS=${MIN_SNAPSHOTS}` };
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
    return { tick, rank: 0, modes: [], spectralRadius: NaN, relError: NaN, abstained: true, reason: 'DMD fit did not exist' };
  }
  return {
    tick,
    rank: fit.rank,
    modes: fit.modes,
    spectralRadius: fit.spectralRadius,
    relError: fit.relError,
    abstained: false,
  };
}
