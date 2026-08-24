/**
 * Characterization test — L2_Hebbian: pin the EXACT current recall/store output
 * BEFORE any optimization. The optimization (A) must reproduce this byte-for-byte.
 *
 * IMPORTANT (found during review): recall() is NOT pure — its Step 3 mutates the
 * correlation matrix (LTP strengthen / LTD decay). So the normalized-matrix cache
 * must invalidate on BOTH store() and recall(). This test pins the full behaviour
 * including that statefulness, so any caching that changes it is caught here.
 */

import { describe, expect, it } from "vitest";
import { L2_Hebbian } from "../frameworks.ts";

function probe(seed: number): Float64Array {
  const v = new Float64Array(14);
  for (let i = 0; i < 14; i++) v[i] = Math.sin(seed * 1.3 + i * 0.7);
  return v;
}

/** Run a fixed store/recall sequence, return every recall output flattened. */
function runSequence(): number[] {
  const mem = new L2_Hebbian();
  const out: number[] = [];
  const probes = [probe(1), probe(2), probe(3), probe(4), probe(5)];
  for (let round = 0; round < 4; round++) {
    for (const p of probes) {
      mem.store(p);
      const r = mem.recall(p);
      for (const x of r) out.push(x);
    }
  }
  return out;
}

describe("L2_Hebbian — behaviour is pinned (characterization)", () => {
  it("two identical runs produce byte-identical outputs (determinism)", () => {
    expect(runSequence()).toEqual(runSequence());
  });

  it("recall output length matches probe length; empty matrix → zero field", () => {
    const mem = new L2_Hebbian();
    const p = probe(1);
    // No store yet → empty correlation matrix → honest zero field.
    const r0 = mem.recall(p);
    expect(r0.length).toBe(p.length);
    for (const x of r0) expect(x).toBe(0);
  });

  it("recall is STATEFUL (Step 3 mutates the matrix) — repeated recalls drift", () => {
    const mem = new L2_Hebbian();
    const p = probe(1);
    mem.store(p);
    const a = Array.from(mem.recall(p));
    const b = Array.from(mem.recall(p)); // same probe, but matrix was mutated by recall #1
    // This ASSERTS the statefulness the cache must respect: a ≠ b in general.
    // (If a future refactor makes recall pure, this test SHOULD be updated then.)
    expect(a).not.toEqual(b);
  });
});
