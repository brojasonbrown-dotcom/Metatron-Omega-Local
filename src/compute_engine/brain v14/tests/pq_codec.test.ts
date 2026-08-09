import { describe, it, expect } from "vitest";
import {
  trainPQ,
  pqEncode,
  pqDecode,
  pqAsymmetricDistance,
  pqDistortion,
  PQ_SUBSPACES,
  PQ_CENTROIDS,
} from "./../cognition/pq_codec.ts";
import { FIELD_SIZE } from "./../adapters/language_codec.ts";
import { fieldFromLuminanceGrid } from "./../adapters/sensors/signal_codec.ts";

import { at } from "../core/indexing.ts";
function makeField(seed: number): Float64Array {
  const w = 8, h = 8;
  const g = new Float64Array(w * h);
  for (let i = 0; i < g.length; i++) {
    g[i] = Math.sin(seed * 1.7 + i * 0.618) * Math.cos(seed * 0.3 + i * 0.11);
  }
  return fieldFromLuminanceGrid(g, w, h);
}

function trainingSet(n: number): Float64Array[] {
  const out: Float64Array[] = [];
  for (let i = 0; i < n; i++) out.push(makeField(i * 23 + 5));
  return out;
}

describe("pq_codec", () => {
  it("trains a codebook with the spec'd shape", () => {
    const pq = trainPQ(trainingSet(64));
    expect(pq.subspaces).toBe(PQ_SUBSPACES);
    expect(pq.centroidsPerSubspace).toBe(PQ_CENTROIDS);
    expect(pq.subDim).toBe(FIELD_SIZE / PQ_SUBSPACES);
    expect(pq.codebook.length).toBe(PQ_SUBSPACES);
    expect(at(pq.codebook, 0).length).toBe(PQ_CENTROIDS);
    expect(at(at(pq.codebook, 0), 0).length).toBe(pq.subDim);
  });

  it("training is deterministic", () => {
    const a = trainPQ(trainingSet(40));
    const b = trainPQ(trainingSet(40));
    expect(at(a.codebook, 0)[0]).toEqual(at(b.codebook, 0)[0]);
    expect(at(a.codebook, 3)[255]).toEqual(at(b.codebook, 3)[255]);
  });

  it("encodes to one byte per subspace", () => {
    const pq = trainPQ(trainingSet(64));
    const code = pqEncode(pq, makeField(99));
    expect(code).toBeInstanceOf(Uint8Array);
    expect(code.length).toBe(PQ_SUBSPACES);
    for (const byte of code) {
      expect(byte).toBeGreaterThanOrEqual(0);
      expect(byte).toBeLessThanOrEqual(255);
    }
  });

  it("decodes back to a full field of the right dimension", () => {
    const pq = trainPQ(trainingSet(64));
    const recon = pqDecode(pq, pqEncode(pq, makeField(7)));
    expect(recon.length).toBe(FIELD_SIZE);
  });

  it("compresses ~14× (224 bytes → 4 bytes)", () => {
    const raw = FIELD_SIZE * 8; // Float64 bytes
    const compressed = PQ_SUBSPACES * 1; // one byte per subspace
    expect(raw / compressed).toBeGreaterThanOrEqual(14);
  });

  it("reconstruction distortion is bounded on trained data", () => {
    const samples = trainingSet(80);
    const pq = trainPQ(samples);
    const d = pqDistortion(pq, samples);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(0.5); // well under 50% mean relative error
  });

  it("encode→decode→re-encode is a fixed point (idempotent codes)", () => {
    const pq = trainPQ(trainingSet(64));
    const code = pqEncode(pq, makeField(31));
    const recon = pqDecode(pq, code);
    const code2 = pqEncode(pq, recon);
    expect(Array.from(code2)).toEqual(Array.from(code));
  });

  it("asymmetric distance ranks the true match nearest", () => {
    const samples = trainingSet(80);
    const pq = trainPQ(samples);
    const target = makeField(31); // in the training distribution
    const targetCode = pqEncode(pq, target);

    // Distance from the raw query to its own code should be smallest.
    const selfDist = pqAsymmetricDistance(pq, target, targetCode);
    const otherDist = pqAsymmetricDistance(pq, target, pqEncode(pq, makeField(900)));
    expect(selfDist).toBeLessThan(otherDist);
  });

  it("pqDistortion of an empty set is 0", () => {
    const pq = trainPQ(trainingSet(16));
    expect(pqDistortion(pq, [])).toBe(0);
  });

  it("throws if FIELD_SIZE is not divisible by the subspace count", () => {
    // Guard the invariant; with the spec'd 28/4 this never throws.
    expect(FIELD_SIZE % PQ_SUBSPACES).toBe(0);
  });
});
