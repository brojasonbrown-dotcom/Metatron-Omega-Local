/**
 * PHASE 3 BENCHMARK — scaling envelope for the record-perceptron.
 *
 * "Highest resolution, but respect computational limits" → we MEASURE the
 * trade-off instead of asserting it. For each candidate D we report:
 *   1. the unrelated-word floor (≈1/√D) and the w-threshold at which a bound
 *      label becomes detectable (separates from the floor by a safe margin);
 *   2. wall-clock per op: atom(), bundle(), bind(), unbind(), similarity(),
 *      and ONE associator read (unbind + k similarities);
 *   3. memory per residual record (one D-hypervector snapshot) and per-concept
 *      associator, projected to a realistic concept/record census.
 *
 * RUN: node --experimental-strip-types tests/record-perceptron-bench.mjs
 */
import { performance } from "node:perf_hooks";

// Re-implement the D-parametric phasor ops here so we can sweep D (the shipped
// module fixes D=8192; the benchmark varies it). Identical math to
// phasor_field.ts, parameterised by complex-dimension n.
const PHI = 1.618033988749895;
const PHI_INV = 0.6180339887498949;
const GOLDEN_DEN = 89;

function makeStream(seed) {
  let s = seed >>> 0;
  return () => {
    // xorshift32 — same family as phasor_field's deterministic stream
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
function seedOf(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function makeAtom(n, label) {
  const rand = makeStream(seedOf(label));
  const out = new Float64Array(2 * n);
  for (let k = 0; k < n; k++) {
    const golden = (2 * Math.PI * k * PHI_INV) / GOLDEN_DEN;
    const th = golden + 2 * Math.PI * rand();
    out[2 * k] = Math.cos(th);
    out[2 * k + 1] = Math.sin(th);
  }
  const invn = 1 / Math.sqrt(n);
  for (let i = 0; i < out.length; i++) out[i] *= invn;
  return out;
}
function sim(n, a, b) {
  let re = 0, na = 0, nb = 0;
  for (let k = 0; k < n; k++) {
    const ar = a[2*k], ai = a[2*k+1], br = b[2*k], bi = b[2*k+1];
    re += ar*br + ai*bi; na += ar*ar + ai*ai; nb += br*br + bi*bi;
  }
  const d = Math.sqrt(na*nb); return d === 0 ? 0 : re/d;
}
function bundleN(n, items) {
  const out = new Float64Array(2 * n);
  for (const v of items) for (let i = 0; i < out.length; i++) out[i] += v[i];
  let ns = 0; for (let i = 0; i < out.length; i++) ns += out[i]*out[i];
  const inv = 1/(Math.sqrt(ns)||1); for (let i=0;i<out.length;i++) out[i]*=inv;
  return out;
}
function bindN(n, a, b) {
  const out = new Float64Array(2 * n);
  for (let k = 0; k < n; k++) {
    const ar=a[2*k],ai=a[2*k+1],br=b[2*k],bi=b[2*k+1];
    out[2*k]=ar*br-ai*bi; out[2*k+1]=ar*bi+ai*br;
  }
  let ns=0; for(let i=0;i<out.length;i++) ns+=out[i]*out[i];
  const inv=1/(Math.sqrt(ns)||1); for(let i=0;i<out.length;i++) out[i]*=inv;
  return out;
}
const unbindN = (n, bound, key) => {
  const conj = new Float64Array(2 * n);
  for (let k = 0; k < n; k++) { conj[2*k] = key[2*k]; conj[2*k+1] = -key[2*k+1]; }
  return bindN(n, bound, conj);
};

function timeit(fn, reps) {
  fn(); // warm
  const t0 = performance.now();
  for (let i = 0; i < reps; i++) fn();
  return (performance.now() - t0) / reps; // ms per op
}

const LABELS = ["dog","animal","pet","canine","furry","barks","tail","loyal","four-legged"];
const GARBAGE = ["trampoline","quasar","algebra","soup","vertex","bureaucracy"];

console.log("D(complex)  floor    w@detect  atom(ms)  bundle(ms) bind(ms)  unbind(ms) sim(ms)  read1(ms)  mem/record");
for (const n of [4096, 8192, 16384, 32768]) {
  const floor = 1 / Math.sqrt(n);
  const atoms = Object.fromEntries([...LABELS, ...GARBAGE].map((l) => [l, makeAtom(n, l)]));
  const percept = bundleN(n, LABELS.slice(4).map((l) => atoms[l]));
  // w-threshold: smallest w where sim(bound word) ≥ floor + 0.30 margin
  let wDetect = null;
  for (let w = 0.05; w <= 0.55; w += 0.025) {
    const concept = bundleN(n, [
      ...LABELS.slice(0, 4).map((l) => { const v = new Float64Array(atoms[l]); return v; }),
    ]);
    // mix word at weight w into the percept
    const mixed = new Float64Array(2 * n);
    for (let i = 0; i < mixed.length; i++) mixed[i] = percept[i] * (1 - w) + atoms["dog"][i] * w;
    let ns = 0; for (let i=0;i<mixed.length;i++) ns+=mixed[i]*mixed[i];
    const inv=1/(Math.sqrt(ns)||1); for(let i=0;i<mixed.length;i++) mixed[i]*=inv;
    const s = sim(n, atoms["dog"], mixed);
    if (s >= floor + 0.30) { wDetect = w; break; }
  }
  // timings
  const reps = n <= 8192 ? 400 : n <= 16384 ? 200 : 100;
  const tAtom = timeit(() => makeAtom(n, "benchmark-probe"), 50);
  const tBundle = timeit(() => bundleN(n, [atoms["dog"], atoms["animal"], atoms["pet"]]), reps);
  const tBind = timeit(() => bindN(n, percept, atoms["dog"]), reps);
  const tUnbind = timeit(() => unbindN(n, percept, atoms["dog"]), reps);
  const tSim = timeit(() => sim(n, atoms["dog"], atoms["animal"]), reps);
  const assoc = bundleN(n, LABELS.map((l) => bindN(n, percept, atoms[l])));
  const tRead = timeit(() => {
    const r = unbindN(n, assoc, percept);
    for (const l of LABELS) sim(n, r, atoms[l]);
  }, Math.max(20, reps >> 2));
  const memKB = (2 * n * 8) / 1024;
  console.log(
    `${String(n).padEnd(10)}  ${floor.toFixed(4)}  ${wDetect === null ? " >0.55 " : wDetect.toFixed(3).padStart(6)}   ${tAtom.toFixed(3).padStart(7)}  ${tBundle.toFixed(4).padStart(8)}  ${tBind.toFixed(4).padStart(7)}  ${tUnbind.toFixed(4).padStart(9)}  ${tSim.toFixed(4).padStart(6)}  ${tRead.toFixed(3).padStart(8)}  ${memKB.toFixed(0)} KB`
  );
}

console.log("\nProjection at a realistic census (10k concepts × 5 records, 1 associator each):");
for (const n of [8192, 16384]) {
  const recKB = (2 * n * 8) / 1024;
  const totalMB = (10000 * 5 * recKB + 10000 * recKB) / 1024;
  console.log(`  D=${n}: ${totalMB.toFixed(0)} MB  (records ${(10000*5*recKB/1024).toFixed(0)} MB + associators ${(10000*recKB/1024).toFixed(0)} MB)`);
}
console.log("\nNOTE: bundle/bind/unbind/sim are all O(D); atom() is O(D) but cached. The associator read is O(D·k) for k candidate labels.");
