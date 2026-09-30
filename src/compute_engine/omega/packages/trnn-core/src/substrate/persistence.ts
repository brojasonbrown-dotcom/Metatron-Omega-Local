/**
 * persistence — 0-dimensional persistent homology (Ω-REAL: the insight sense).
 *
 * The "convergence / insight" readout of a field is its *shape*, not its values.
 * 0-D persistent homology measures exactly that: for the field's magnitude
 * profile taken around the ring, it sweeps a threshold from high to low and
 * records how long each connected component (each local peak) *persists* before
 * it merges into a taller neighbour. The sorted list of persistence values is
 * the 0-D barcode — a topological invariant of the profile: a sharp, multi-peak
 * field has many long bars; a flat field has one trivial bar.
 *
 * This is the classic union-find (merge-tree) algorithm for superlevel sets of
 * a 1-D signal, with the circle's periodic boundary respected. Deterministic:
 * sorting is by value with a fixed tie-break (index), and the sweep order is
 * total.
 */

export interface PersistenceReport {
  /** Sorted descending 0-D persistence values (the barcode). */
  readonly bars: Float64Array;
  /** Number of bars. */
  readonly count: number;
  /** Longest bar — the most persistent feature (the dominant peak). */
  readonly max: number;
  /** Sum of bars — total topological persistence (a depth scalar). */
  readonly total: number;
}

export function persistence0D(values: ArrayLike<number>): Float64Array {
  const n = values.length;
  if (n === 0) return new Float64Array(0);

  // Order by value descending; ties broken by index for a total, deterministic order.
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[b] - values[a] || a - b);

  const parent = new Int32Array(n);
  const birth = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    parent[i] = i;
    birth[i] = values[i];
  }
  const added = new Uint8Array(n);
  const bars: number[] = [];

  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) {
      const p = parent[x];
      parent[x] = r;
      x = p;
    }
    return r;
  };

  for (const i of order) {
    const v = values[i];
    added[i] = 1;
    let root = find(i);
    for (const j of [(i + 1) % n, (i + n - 1) % n]) {
      if (!added[j]) continue;
      const rj = find(j);
      if (rj === root) continue;
      // merge; the younger component (lower birth) dies at the current threshold
      const older = birth[root] >= birth[rj] ? root : rj;
      const younger = older === root ? rj : root;
      bars.push(birth[younger] - v);
      parent[younger] = older;
      birth[older] = Math.max(birth[older], birth[younger]);
      root = older;
    }
  }

  // The surviving component persists to the global minimum.
  let minV = Infinity;
  for (let i = 0; i < n; i++) if (values[i] < minV) minV = values[i];
  const root = find(order[0]);
  bars.push(Math.max(0, birth[root] - minV));

  bars.sort((a, b) => b - a);
  return Float64Array.from(bars);
}

export function persistenceReport(values: ArrayLike<number>): PersistenceReport {
  const bars = persistence0D(values);
  let max = 0;
  let total = 0;
  for (let i = 0; i < bars.length; i++) {
    total += bars[i];
    if (bars[i] > max) max = bars[i];
  }
  return { bars, count: bars.length, max, total };
}
