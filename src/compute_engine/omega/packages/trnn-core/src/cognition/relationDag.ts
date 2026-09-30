/**
 * relationDag — the content-addressable, hash-chained relation structure
 * (Ω-REAL: the "branches of information" format).
 *
 * The flat RelationGraph records typed edges, but has no integrity: there is no
 * single value that proves the learned structure is exactly what was recorded.
 * This module folds it into a Merkle-DAG:
 *
 *   • each term's digest = sha256(term + its canonical edges, where each edge
 *     chains the TARGET term's current digest) — content-addressed;
 *   • computed as a deterministic fixpoint, so cycles converge (the sentence
 *     `temporal` edges are acyclic, but the graph may not always be);
 *   • the ROOT digest = sha256 over all node digests in canonical term order —
 *     one value that fingerprints the entire learned structure.
 *
 * Tamper-evidence: change any edge → its node digest changes → its parents'
 * digests change → the root changes. Deterministic (canonical order + sha256,
 * no clock, no RNG). Observe-only: it reads the graph, never mutates it.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { canonicalJson, utf8 } from '../ledger/canonical';
import { toHex } from '../ledger/merkle';
import { RelationGraph, type RelationEdge } from './relations';

export interface RelationDagNode {
  readonly term: string;
  readonly digest: string;
  readonly edges: readonly { type: string; target: string; weight: number }[];
}

export interface RelationDagState {
  /** The Merkle root — one deterministic fingerprint of the whole structure. */
  readonly root: string;
  readonly nodes: readonly RelationDagNode[];
}

/** Fold a relation graph into its content-addressable, hash-chained Merkle-DAG. */
export function relationDag(graph: RelationGraph): RelationDagState {
  const st = graph.serialize();
  const terms = Object.keys(st.edges).sort();
  const termSet = new Set(terms);

  // Flat content: cache each term's edges once and hash its flat content as the
  // hash-chaining seed (target = term name, no chained digest yet). O(n + e).
  const flatCache = new Map<string, { type: string; target: string; weight: number }[]>();
  const flatDigest = new Map<string, string>();
  for (const t of terms) {
    const edges = st.edges[t].map((e) => ({ type: e.type, target: e.target, weight: e.weight }));
    flatCache.set(t, edges);
    flatDigest.set(t, toHex(sha256(utf8(canonicalJson({ term: t, edges })))));
  }

  // Dependency graph: only edges whose target is itself a term participate in the
  // chain; external targets keep their name as their "digest".
  const deps = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();
  for (const t of terms) {
    const d: string[] = [];
    for (const e of flatCache.get(t)!) {
      if (termSet.has(e.target)) {
        d.push(e.target);
        let list = dependents.get(e.target);
        if (!list) { list = []; dependents.set(e.target, list); }
        list.push(t);
      }
    }
    deps.set(t, d);
  }

  const chained = new Map<string, string>();

  // Hash a term's content with its targets' current digests chained in. Cyclic
  // targets (cycleDigest non-empty) use the canonical cycle digest; acyclic
  // targets use their already-computed chained digest; external targets use name.
  const hashChained = (t: string, cycleDigest: string, cyclicSet: ReadonlySet<string>): string => {
    const edges = flatCache.get(t)!.map((e) => ({
      type: e.type,
      target: e.target,
      targetDigest: termSet.has(e.target)
        ? (cyclicSet.has(e.target) ? cycleDigest : (chained.get(e.target) ?? e.target))
        : e.target,
      weight: e.weight,
    }));
    return toHex(sha256(utf8(canonicalJson({ term: t, edges }))));
  };

  // Kahn's algorithm — deterministic (smallest term first) topological order over
  // the acyclic core. Chaining a target's CURRENT digest into its source is what
  // makes a leaf change cascade up the DAG (the r22 hash-chain property). O(n + e)
  // instead of the old O(n²) full-sweep fixpoint.
  const indegree = new Map<string, number>();
  for (const t of terms) indegree.set(t, (deps.get(t) ?? []).length);
  const noCycles: ReadonlySet<string> = new Set();
  const ready: string[] = [];
  for (const t of terms) if (indegree.get(t) === 0) ready.push(t);

  const insertSorted = (arr: string[], v: string): void => {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < v) lo = mid + 1; else hi = mid; }
    arr.splice(lo, 0, v);
  };

  while (ready.length > 0) {
    const t = ready.shift()!;
    chained.set(t, hashChained(t, '', noCycles));
    for (const src of dependents.get(t) ?? []) {
      const d = indegree.get(src)! - 1;
      indegree.set(src, d);
      if (d === 0) insertSorted(ready, src);
    }
  }

  // Leftover nodes are cycle members. Resolve deterministically: one canonical
  // cycle digest (hash of the sorted members' flat digests) is chained into every
  // member, so a cycle is tamper-evident and order-independent without a full
  // N-iteration fixpoint (the old path ran `terms.length` full sweeps for cyclic
  // graphs — quadratic and, on a large learned graph, minutes of blocking).
  const cyclic = terms.filter((t) => (indegree.get(t) ?? 0) > 0);
  if (cyclic.length > 0) {
    const cyclicSet: ReadonlySet<string> = new Set(cyclic);
    const cycleDigest = toHex(sha256(utf8(canonicalJson(
      [...cyclic].sort().map((t) => ({ term: t, digest: flatDigest.get(t)! })),
    ))));
    for (const t of [...cyclic].sort()) {
      chained.set(t, hashChained(t, cycleDigest, cyclicSet));
    }
  }

  const nodes = terms.map((t) => ({
    term: t,
    digest: chained.get(t) ?? flatDigest.get(t)!,
    edges: flatCache.get(t) as { type: string; target: string; weight: number }[],
  }));
  const root = toHex(sha256(utf8(canonicalJson(nodes.map((n) => n.digest)))));
  return { root, nodes };
}
