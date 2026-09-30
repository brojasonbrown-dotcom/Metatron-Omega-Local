/**
 * relations — Ω-REAL: the universal relation types and resonant recall.
 *
 * The GIC blueprint's 12 relation structures, re-anchored from arbitrary
 * decimals (0.85–0.99) onto the machine's φ-octave ladder: each type is one
 * φ-octave below the previous, so the tiers actually discriminate instead of
 * clustering near 1. Causation is the machine's own `causal.ts` (Granger/TE/DML)
 * when measured; the relation graph stores the *structural* weight and the typed
 * edge — the "processes" attached to a concept.
 *
 * `resonantRecall` is the refined-similarity read side: a probe is scored
 * against every stored atom by the φ-anchored percentage (`similarityPct`), and
 * the top matches come back with their refined % AND their outgoing relations —
 * the information *and* the processes, not just the nearest node.
 */

import { phiPow } from '../core/constants';
import { similarityPct, type Hypervector } from '../substrate/vsa';

export type RelationType =
  | 'identity' | 'causation' | 'inheritance' | 'composition'
  | 'opposition' | 'temporal' | 'evaluation' | 'function'
  | 'possession' | 'location' | 'gradation' | 'correlation';

/** Importance order (GIC §7), most structural first. */
const RELATION_ORDER: readonly RelationType[] = Object.freeze([
  'identity', 'causation', 'inheritance', 'composition', 'opposition',
  'temporal', 'evaluation', 'function', 'possession', 'location',
  'gradation', 'correlation',
]);

/** φ-octave structural weights: rank i → φ^(−i). identity = 1 … correlation = φ^(−11). */
export const RELATION_WEIGHTS: Readonly<Record<RelationType, number>> = (() => {
  const w = {} as Record<RelationType, number>;
  RELATION_ORDER.forEach((t, i) => { w[t] = phiPow(-i); });
  return Object.freeze(w);
})();

export interface RelationEdge {
  readonly type: RelationType;
  readonly target: string;
  readonly weight: number;
}

/** Cross-session state of a relation graph (typed edges = the "processes"). */
export interface RelationGraphState {
  readonly edges: Readonly<Record<string, readonly RelationEdge[]>>;
}

/** A typed relation graph: nodes are keys, edges are their "processes". */
export class RelationGraph {
  private readonly out = new Map<string, RelationEdge[]>();
  /** Structural epoch — bumps on every mutation so the host can cache the Merkle root. */
  private _version = 0;

  /** Monotonic structural version; the host keys its relation-digest cache on this. */
  get version(): number { return this._version; }

  relate(source: string, type: RelationType, target: string, weight = RELATION_WEIGHTS[type]): void {
    const list = this.out.get(source) ?? [];
    // Dedupe: an identical typed edge is already recorded — repetition must not
    // grow the graph unbounded (a relation exists, it is not "counted").
    for (const e of list) {
      if (e.type === type && e.target === target) return;
    }
    list.push({ type, target, weight });
    this.out.set(source, list);
    this._version++;
  }

  /** The processes attached to a node (its outgoing typed relations). */
  outgoing(source: string): readonly RelationEdge[] {
    return this.out.get(source) ?? [];
  }

  get size(): number { return this.out.size; }

  /** Snapshot the typed edges for cross-session persistence. */
  serialize(): RelationGraphState {
    const edges: Record<string, readonly RelationEdge[]> = {};
    for (const [src, list] of this.out) {
      edges[src] = list.map((e) => ({ type: e.type, target: e.target, weight: e.weight }));
    }
    return { edges };
  }

  /** Rebuild a relation graph from a saved state. */
  static restore(s: RelationGraphState): RelationGraph {
    const g = new RelationGraph();
    let edgeCount = 0;
    for (const [src, list] of Object.entries(s.edges)) {
      g.out.set(src, list.map((e) => ({ type: e.type, target: e.target, weight: e.weight })));
      edgeCount += list.length;
    }
    g._version = edgeCount; // a restored graph differs from a fresh empty one
    return g;
  }
}

export interface ResonantHit {
  readonly key: string;
  /** Refined φ-anchored similarity percentage ∈ [0,1]. */
  readonly similarityPct: number;
  /** The processes (outgoing relations) attached to the recalled node. */
  readonly processes: readonly RelationEdge[];
}

export interface ResonantRecallOptions {
  readonly k?: number;
  /** Similarity floor for "similar enough to recall" (default φ⁻¹). */
  readonly floor?: number;
}

/**
 * Refined-similarity recall: score a probe against every atom, keep the top-k
 * that clear the floor, and attach each hit's outgoing relations. Returns an
 * empty list (honest miss) when nothing clears the floor — never a fabricated
 * nearest neighbour.
 */
export function resonantRecall(
  probe: Hypervector,
  atoms: ReadonlyMap<string, Hypervector>,
  graph: RelationGraph,
  opts: ResonantRecallOptions = {},
): ResonantHit[] {
  const k = opts.k ?? 5;
  const floor = opts.floor ?? phiPow(-1);
  const hits: ResonantHit[] = [];
  for (const [key, atom] of atoms) {
    const pct = similarityPct(probe, atom, floor);
    if (pct <= 0) continue;
    hits.push({ key, similarityPct: pct, processes: graph.outgoing(key) });
  }
  hits.sort((a, b) => b.similarityPct - a.similarityPct || (a.key < b.key ? -1 : 1));
  return hits.slice(0, k);
}
