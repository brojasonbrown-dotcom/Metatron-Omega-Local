/**
 * RHUFT Mind — HNSW Approximate Nearest-Neighbor Index
 *
 * Epistemic Status: [MATH] — Malkov & Yashunin, "Efficient and robust
 * approximate nearest neighbor search using Hierarchical Navigable Small World
 * graphs" (arXiv:1603.09320, TPAMI 2018).
 *
 * [PHIL] — Recognition must stay fast as the lexicon grows. Brute-force
 * resonance ranking is O(N) per query and is the first thing that breaks as
 * concepts accumulate. HNSW gives polylogarithmic search with ~95–99% recall by
 * organizing concepts into a navigable small-world graph layered exponentially
 * (a skip-list over graphs): coarse layers route long-range, fine layers refine.
 *
 * DETERMINISM [SPEC] — The engine forbids RNG. HNSW's only randomness is the
 * per-node layer assignment; we derive it deterministically from the concept id
 * via a SplitMix-style hash, so the index is reproducible run-to-run. The search
 * itself is fully deterministic greedy best-first.
 *
 * METRIC — We index by the mind's single resonance kernel C(a,b) ∈ [0,1] and
 * convert it to a distance d = 1 − C (a monotone transform; identical ranking).
 *
 * Bounded, Float64Array throughout, no external dependencies. A brute-force
 * `exactNearest` is provided alongside so tests can assert recall@k honestly.
 */

import { PHI } from "./../core/constants.ts";
import { resonance } from "./../adapters/language_codec.ts";
import { at } from "../core/indexing.ts";

/** Distance between two fields: 1 − resonance (monotone in resonance). */
function fieldDistance(a: Float64Array, b: Float64Array): number {
  return 1.0 - resonance(a, b);
}

/**
 * Deterministic 32-bit hash of a string (SplitMix32-style finalize over FNV).
 * Used ONLY for layer assignment — never for content. [SPEC]
 */
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // SplitMix32 finalizer for good avalanche behaviour.
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return (h ^ (h >>> 15)) >>> 0;
}

interface HnswNode {
  readonly id: string;
  field: Float64Array;
  /** Maximum layer this node participates in (0 = base only). */
  level: number;
  /** neighbors[layer] = array of neighbor ids at that layer. */
  neighbors: string[][];
  /** Lazily deleted (evicted from the registry). */
  deleted: boolean;
}

export interface HnswMatch {
  readonly id: string;
  readonly resonance: number;
}

export class HnswIndex {
  /** Max neighbors per node per layer: M = 8 (F_6). [SPEC] */
  readonly M: number = 8;
  /** Candidate pool width during construction: efConstruction = 21 (F_8). [SPEC] */
  readonly efConstruction: number = 21;
  /** Candidate pool width during search. */
  efSearch: number = 21;
  /** Level generation factor: 1/ln(M), standard for HNSW. */
  private readonly _ml: number;

  private readonly _nodes: Map<string, HnswNode> = new Map();
  private _entryPoint: string | null = null;
  private _maxLevel: number = -1;

  constructor() {
    this._ml = 1.0 / Math.log(this.M);
  }

  get size(): number {
    let n = 0;
    for (const node of this._nodes.values()) if (!node.deleted) n++;
    return n;
  }

  /** Deterministic level assignment from the id (geometric distribution). */
  private _levelFor(id: string): number {
    const u = (hash32(id) + 1) / 0x100000001; // ∈ (0, 1]
    const level = Math.floor(-Math.log(u) * this._ml);
    return Math.max(0, Math.min(level, 8)); // cap levels for sanity
  }

  /** Insert a concept field into the index. Re-inserting updates in place. */
  add(id: string, field: Float64Array): void {
    const existing = this._nodes.get(id);
    if (existing) {
      existing.field = field;
      existing.deleted = false;
      return;
    }
    const level = this._levelFor(id);
    const node: HnswNode = {
      id,
      field: new Float64Array(field),
      level,
      neighbors: Array.from({ length: level + 1 }, () => []),
      deleted: false,
    };
    this._nodes.set(id, node);

    if (this._entryPoint === null) {
      this._entryPoint = id;
      this._maxLevel = level;
      return;
    }

    // Greedy descent from the entry point to the node's own top layer.
    let curr = this._entryPoint;
    const entry = this._nodes.get(curr)!;
    for (let layer = this._maxLevel; layer > level; layer--) {
      curr = this._greedyClosest(curr, field, layer);
    }

    // For each layer the node joins, link it to its M nearest neighbors.
    const topJoin = Math.min(level, this._maxLevel);
    for (let layer = topJoin; layer >= 0; layer--) {
      const candidates = this._searchLayer(curr, field, layer, this.efConstruction);
      const neighbors = this._selectNeighbors(field, candidates, this.M);
      node.neighbors[layer] = neighbors.map((n) => n.id);
      for (const nb of neighbors) {
        const nbNode = this._nodes.get(nb.id)!;
        if (layer < nbNode.neighbors.length) {
          at(nbNode.neighbors, layer).push(id);
          // Prune the neighbor's list back to M closest.
          if (at(nbNode.neighbors, layer).length > this.M) {
            nbNode.neighbors[layer] = this._pruneNeighbors(nbNode, layer);
          }
        }
      }
      if (neighbors.length > 0) curr = at(neighbors, 0).id; // descend from closest
    }

    if (level > this._maxLevel) {
      this._maxLevel = level;
      this._entryPoint = id;
    }
    void entry;
  }

  /** Lazy delete: mark the node deleted (edges pruned opportunistically). */
  remove(id: string): void {
    const node = this._nodes.get(id);
    if (node) node.deleted = true;
  }

  /** Approximate k nearest by resonance (descending). */
  search(query: Float64Array, k: number = 5): HnswMatch[] {
    if (this._entryPoint === null || k <= 0) return [];
    // Descend to base layer.
    let curr = this._entryPoint;
    for (let layer = this._maxLevel; layer > 0; layer--) {
      curr = this._greedyClosest(curr, query, layer);
    }
    const candidates = this._searchLayer(curr, query, 0, Math.max(this.efSearch, k));
    // Rank by resonance, drop deleted, take top-k.
    const ranked = candidates
      .filter((c) => !this._nodes.get(c.id)!.deleted)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k)
      .map((c) => ({ id: c.id, resonance: 1.0 - c.dist }));
    return ranked;
  }

  /** Exact brute-force k-nearest (ground truth for tests). */
  exactNearest(query: Float64Array, k: number = 5): HnswMatch[] {
    const all: HnswMatch[] = [];
    for (const node of this._nodes.values()) {
      if (node.deleted) continue;
      all.push({ id: node.id, resonance: resonance(query, node.field) });
    }
    all.sort((a, b) => b.resonance - a.resonance);
    return all.slice(0, Math.max(0, k));
  }

  /** Clear the whole index. */
  clear(): void {
    this._nodes.clear();
    this._entryPoint = null;
    this._maxLevel = -1;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  /** Greedy walk: from `start`, keep moving to a closer node at `layer`. */
  private _greedyClosest(start: string, query: Float64Array, layer: number): string {
    let curr = start;
    let currNode = this._nodes.get(curr);
    if (!currNode) return start;
    let currDist = fieldDistance(query, currNode.field);
    let improved = true;
    while (improved) {
      improved = false;
      const neighbors = layer < currNode!.neighbors.length ? currNode!.neighbors[layer] : [];
      for (const nbId of neighbors) {
        const nb = this._nodes.get(nbId);
        if (!nb || nb.deleted) continue;
        const d = fieldDistance(query, nb.field);
        if (d < currDist) {
          curr = nbId;
          currNode = nb;
          currDist = d;
          improved = true;
        }
      }
    }
    return curr;
  }

  /**
   * Best-first search of one layer, returning up to `ef` candidate nodes
   * (with their distances), deleted nodes excluded from results.
   */
  private _searchLayer(
    entry: string,
    query: Float64Array,
    layer: number,
    ef: number
  ): Array<{ id: string; dist: number }> {
    const visited = new Set<string>([entry]);
    const entryNode = this._nodes.get(entry);
    if (!entryNode) return [];
    const entryDist = fieldDistance(query, entryNode.field);

    // Candidate min-heap (by dist) and result max-heap (by dist). Simple arrays
    // kept sorted — ef is small (≤ a few dozen), so linear ops are fine.
    const candidates: Array<{ id: string; dist: number }> = [{ id: entry, dist: entryDist }];
    const results: Array<{ id: string; dist: number }> = [{ id: entry, dist: entryDist }];

    while (candidates.length > 0) {
      // Pop closest candidate.
      candidates.sort((a, b) => a.dist - b.dist);
      const c = candidates.shift()!;
      // Furthest result.
      results.sort((a, b) => b.dist - a.dist);
      const furthest = at(results, 0);
      if (c.dist > furthest.dist && results.length >= ef) break;

      const cNode = this._nodes.get(c.id);
      const neighbors = cNode && layer < cNode.neighbors.length ? cNode.neighbors[layer] : [];
      for (const nbId of neighbors) {
        if (visited.has(nbId)) continue;
        visited.add(nbId);
        const nb = this._nodes.get(nbId);
        if (!nb) continue;
        const d = fieldDistance(query, nb.field);
        results.sort((a, b) => b.dist - a.dist);
        const worst = at(results, 0);
        if (results.length < ef || d < worst.dist) {
          candidates.push({ id: nbId, dist: d });
          results.push({ id: nbId, dist: d });
          if (results.length > ef) {
            results.sort((a, b) => b.dist - a.dist);
            results.shift(); // drop the furthest
          }
        }
      }
    }
    return results.filter((r) => !this._nodes.get(r.id)!.deleted);
  }

  /** Select the M nearest from a candidate list (by distance). */
  private _selectNeighbors(
    query: Float64Array,
    candidates: Array<{ id: string; dist: number }>,
    m: number
  ): Array<{ id: string; dist: number }> {
    return [...candidates].sort((a, b) => a.dist - b.dist).slice(0, m);
  }

  /** Prune a node's neighbor list at `layer` to its M closest neighbors. */
  private _pruneNeighbors(node: HnswNode, layer: number): string[] {
    const withDist = at(node.neighbors, layer)
      .map((id) => {
        const nb = this._nodes.get(id);
        return nb && !nb.deleted ? { id, dist: fieldDistance(node.field, nb.field) } : null;
      })
      .filter((x): x is { id: string; dist: number } => x !== null);
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist.slice(0, this.M).map((x) => x.id);
  }
}
