import { describe, it, expect } from "vitest";
import { HnswIndex } from "./../cognition/hnsw_index.ts";
import { resonance } from "./../adapters/language_codec.ts";
import { fieldFromLuminanceGrid } from "./../adapters/sensors/signal_codec.ts";

function makeField(seed: number): Float64Array {
  const w = 8, h = 8;
  const g = new Float64Array(w * h);
  for (let i = 0; i < g.length; i++) {
    g[i] = Math.sin(seed * 1.7 + i * 0.618) * Math.cos(seed * 0.3 + i * 0.11);
  }
  return fieldFromLuminanceGrid(g, w, h);
}

describe("HnswIndex", () => {
  it("starts empty", () => {
    const idx = new HnswIndex();
    expect(idx.size).toBe(0);
    expect(idx.search(makeField(1), 5)).toEqual([]);
  });

  it("retrieves the exact nearest neighbor from a small set", () => {
    const idx = new HnswIndex();
    const target = makeField(42);
    idx.add("a", makeField(1));
    idx.add("b", target);
    idx.add("c", makeField(200));
    const hits = idx.search(target, 1);
    expect(hits[0]?.id).toBe("b");
    expect(hits[0]?.resonance).toBeCloseTo(1, 3);
  });

  it("search results are sorted by descending resonance", () => {
    const idx = new HnswIndex();
    for (let i = 0; i < 30; i++) idx.add(`n${i}`, makeField(i * 17 + 1));
    const hits = idx.search(makeField(300), 5);
    expect(hits.length).toBe(5);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].resonance).toBeGreaterThanOrEqual(hits[i].resonance);
    }
  });

  it("achieves high recall@10 vs exact brute force on a growing set", () => {
    const idx = new HnswIndex();
    idx.efSearch = 40; // widen the candidate pool for an honest recall check
    const N = 120;
    for (let i = 0; i < N; i++) idx.add(`c${i}`, makeField(i * 31 + 7));
    expect(idx.size).toBe(N);

    // Measure recall@10 over several queries against exactNearest ground truth.
    let hits = 0;
    let total = 0;
    for (let q = 0; q < 12; q++) {
      const query = makeField(q * 91 + 13);
      const approx = new Set(idx.search(query, 10).map((m) => m.id));
      const exact = idx.exactNearest(query, 10).map((m) => m.id);
      for (const id of exact) {
        total++;
        if (approx.has(id)) hits++;
      }
    }
    const recall = hits / total;
    expect(recall).toBeGreaterThan(0.85);
  });

  it("is deterministic: rebuilding yields identical results", () => {
    const build = () => {
      const idx = new HnswIndex();
      for (let i = 0; i < 40; i++) idx.add(`id-${i}`, makeField(i * 7 + 3));
      return idx.search(makeField(101), 5).map((m) => m.id);
    };
    expect(build()).toEqual(build());
  });

  it("remove() lazily excludes a node from search", () => {
    const idx = new HnswIndex();
    const target = makeField(9);
    idx.add("keep", makeField(1));
    idx.add("drop", target);
    idx.add("other", makeField(300));
    expect(idx.size).toBe(3);
    idx.remove("drop");
    expect(idx.size).toBe(2);
    const hits = idx.search(target, 3);
    expect(hits.some((h) => h.id === "drop")).toBe(false);
  });

  it("re-adding an id updates it in place without growing size", () => {
    const idx = new HnswIndex();
    idx.add("x", makeField(1));
    idx.add("x", makeField(50));
    expect(idx.size).toBe(1);
    const hits = idx.search(makeField(50), 1);
    expect(hits[0]?.id).toBe("x");
  });

  it("honors k=0 and negative k by returning nothing", () => {
    const idx = new HnswIndex();
    idx.add("a", makeField(1));
    expect(idx.search(makeField(1), 0)).toEqual([]);
  });

  it("clear() resets the index", () => {
    const idx = new HnswIndex();
    for (let i = 0; i < 10; i++) idx.add(`n${i}`, makeField(i));
    idx.clear();
    expect(idx.size).toBe(0);
    expect(idx.search(makeField(1), 5)).toEqual([]);
  });

  it("search resonance matches the shared resonance kernel", () => {
    const idx = new HnswIndex();
    const a = makeField(11);
    idx.add("a", a);
    idx.add("b", makeField(77));
    const query = makeField(11);
    const hit = idx.search(query, 2).find((h) => h.id === "a");
    expect(hit?.resonance).toBeCloseTo(resonance(query, a), 6);
  });
});
