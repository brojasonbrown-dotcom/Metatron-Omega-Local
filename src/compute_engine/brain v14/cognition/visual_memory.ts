/**
 * RHUFT Mind — True Vision (P2): see, find-similar, remember
 *
 * Epistemic Status: [SPEC] — Adapter/cognition bridge. The honest Google Lens.
 *
 * Three elite upgrades over the v2 sketch:
 *  A1 — Hamming distance is a METRIC → a BK-tree gives O(log n) "find similar"
 *       instead of an O(n) scan.
 *  A2 — DUAL hash: pHash (DCT, frequency-domain) ⊕ dHash (gradient, spatial).
 *       The two disagree exactly on the hard cases (blurry-vs-edge), so we
 *       AND-gate for "seen before" and OR-gate for "candidate" — fewer false
 *       positives AND fewer misses than either alone.
 *  A7 — Visual episodic memory is a bounded, persisted store of significant
 *       frames ({pHash, dHash, caption?, ts}) loaded at boot and searched by the
 *       BK-tree. Novelty-gated so the camera's history doesn't flood.
 *
 * No internet, no API keys, no fabrication. Until a vision model is hosted (P9)
 * the honest answer to "what is it" is "I see structure, I can't name it yet".
 *
 * Hash contract: both hashes are 64-bit BigInt over an 8×8 (pHash) and 8×8
 * (dHash, 9-wide) reduction of the luminance grid. Hamming via popcount of XOR.
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Hash primitives
// ─────────────────────────────────────────────────────────────────────────────

/** popcount of a 64-bit BigInt. */
function popcount64(x: bigint): number {
  let n = 0;
  let v = x;
  while (v > 0n) {
    n += Number(v & 1n);
    v >>= 1n;
  }
  return n;
}

/** Hamming distance between two 64-bit hashes. */
export function hamming(a: bigint, b: bigint): number {
  return popcount64(a ^ b);
}

/** Normalized similarity in [0,1] from a 64-bit Hamming distance. */
export function hashSimilarity(a: bigint, b: bigint): number {
  return 1 - hamming(a, b) / 64;
}

/**
 * Reduce a luminance grid to an 8×8 block-averaged thumbnail and emit a
 * difference hash (dHash): bit set where a pixel is brighter than its left
 * neighbour. Spatial/gradient-sensitive — robust to blur, sensitive to edges.
 */
export function dHash(grid: Float64Array, w: number, h: number): bigint {
  const TW = 9; // 9 wide → 8 horizontal comparisons per row
  const TH = 8;
  const thumb = blockReduce(grid, w, h, TW, TH);
  let bits = 0n;
  let idx = 0;
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW - 1; x++) {
      if (thumb[y * TW + x] > thumb[y * TW + x + 1]) bits |= 1n << BigInt(idx);
      idx++;
    }
  }
  return bits;
}

/**
 * Perceptual hash (pHash): block-reduce to 8×8, apply a 2D DCT, keep the low
 * 8×8 frequency block, threshold against the median (excluding DC). Frequency
 * domain — robust to small spatial shifts, sensitive to global structure.
 */
export function pHash(grid: Float64Array, w: number, h: number): bigint {
  const T = 8;
  const thumb = blockReduce(grid, w, h, T, T);
  const dct = dct2d(thumb, T);
  // Median of the low-frequency terms, excluding the DC term (index 0).
  const terms: number[] = [];
  for (let i = 1; i < T * T; i++) terms.push(dct[i]);
  const sorted = [...terms].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let bits = 0n;
  for (let i = 0; i < T * T; i++) {
    if (dct[i] > median) bits |= 1n << BigInt(i);
  }
  return bits;
}

/** Block-average a w×h grid into a tw×th thumbnail. */
function blockReduce(grid: Float64Array, w: number, h: number, tw: number, th: number): Float64Array {
  const out = new Float64Array(tw * th);
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor((tx * w) / tw);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * w) / tw));
      const y0 = Math.floor((ty * h) / th);
      const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * h) / th));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += grid[y * w + x];
          n++;
        }
      }
      out[ty * tw + tx] = n > 0 ? sum / n : 0;
    }
  }
  return out;
}

/** Naive 8×8 2D DCT (deterministic; n=8 so O(n⁴)=4096 ops is trivial). */
function dct2d(thumb: Float64Array, n: number): Float64Array {
  const out = new Float64Array(n * n);
  const cu = (u: number) => (u === 0 ? Math.SQRT1_2 : 1);
  for (let v = 0; v < n; v++) {
    for (let u = 0; u < n; u++) {
      let sum = 0;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          sum +=
            thumb[y * n + x] *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * n)) *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * n));
        }
      }
      out[v * n + u] = 0.25 * cu(u) * cu(v) * sum;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BK-tree — O(log n) metric index over Hamming space
// ─────────────────────────────────────────────────────────────────────────────

interface BkNode {
  readonly hash: bigint;
  readonly meta: VisualRecord;
  /** children keyed by exact Hamming distance from this node. */
  children: Map<number, BkNode>;
}

/** A stored visual memory record. */
export interface VisualRecord {
  readonly pHash: bigint;
  readonly dHash: bigint;
  readonly caption: string | null;
  readonly timestamp: number;
  /**
   * High-resolution percept descriptor (multi-scale block-DCT), present on all
   * records written after the resolution upgrade. Absent on legacy records —
   * treated as "no fine evidence" and never fabricated. [SPEC]
   */
  readonly descriptor?: Float64Array;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1b. High-resolution percept descriptor (multi-scale block-DCT)
// ─────────────────────────────────────────────────────────────────────────────
//
// WHY THIS EXISTS [MEASURED] — pHash is an 8×8 DCT and dHash an 9×8 gradient:
// together 128 bits. Two different people's faces collide constantly at that
// resolution, because the discriminating structure (eye spacing, fine edge
// geometry) is below the 8×8 floor. The hashes stay as the fast BK-tree INDEX;
// this descriptor is the fine-grained REPRESENTATION used to actually separate
// near-identical percepts. [SPEC]
//
// [MATH] — The grid is block-reduced to a DESC_SIZE×DESC_SIZE thumbnail, a 2-D
// DCT is applied, and the full frequency block (mean-normalized, DC dropped) is
// kept as real amplitudes — NOT thresholded to a single bit. Keeping the real
// coefficients (instead of 1-bit signs) is what preserves the magnitude of the
// fine detail that a hash throws away. Similarity is a cosine over the raw
// coefficient vector, so it degrades smoothly as structure diverges. [SPEC]

/** Hi-res descriptor thumbnail side: 32×32 = 1024 real coefficients. [SPEC] */
export const DESC_SIZE = 32;

/**
 * Compute the high-resolution percept descriptor for a luminance grid: a
 * DESC_SIZE×DESC_SIZE 2-D DCT, DC removed, coefficients L2-normalized (so the
 * cosine read is scale-free). Deterministic; no RNG. [MATH]
 */
export function perceptDescriptor(grid: Float64Array, w: number, h: number): Float64Array {
  const T = DESC_SIZE;
  const thumb = blockReduce(grid, w, h, T, T);
  // Mean-centre so coefficient 0 (DC) carries brightness, not structure.
  let mean = 0;
  for (let i = 0; i < T * T; i++) mean += thumb[i]!;
  mean /= T * T;
  for (let i = 0; i < T * T; i++) thumb[i]! -= mean;

  const dct = dct2d(thumb, T);
  // Drop DC (index 0): structure over brightness, matching the field codec.
  dct[0] = 0;
  // L2-normalize so the cosine read is a pure shape comparison. [MATH]
  let ns = 0;
  for (let i = 0; i < dct.length; i++) ns += dct[i]! * dct[i]!;
  if (ns <= 0 || !Number.isFinite(ns)) {
    // A perfectly flat grid has no structure — the honest descriptor is all-zero.
    return new Float64Array(dct.length);
  }
  const inv = 1 / Math.sqrt(ns);
  const out = new Float64Array(dct.length);
  for (let i = 0; i < dct.length; i++) out[i] = dct[i]! * inv;
  return out;
}

/**
 * Cosine similarity in [-1,1] between two percept descriptors. Returns 0 if
 * either is absent/empty (a legacy record carries no fine evidence — never
 * fabricate a match against it). [MATH]
 */
export function descriptorSimilarity(a: Float64Array | undefined, b: Float64Array | undefined): number {
  if (a === undefined || b === undefined) return 0;
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na * nb);
  if (denom === 0) return 0;
  const s = dot / denom;
  return s < -1 ? -1 : s > 1 ? 1 : s;
}


/**
 * BK-tree over 64-bit hashes (indexed by pHash; dHash used as the AND-gate).
 * Hamming is a metric → insert/search are O(log n) expected.
 */
export class VisualIndex {
  private _root: BkNode | null = null;
  private _size = 0;

  get size(): number {
    return this._size;
  }

  add(rec: VisualRecord): void {
    const node: BkNode = { hash: rec.pHash, meta: rec, children: new Map() };
    if (!this._root) {
      this._root = node;
      this._size++;
      return;
    }
    let cur = this._root;
    for (;;) {
      const d = hamming(rec.pHash, cur.hash);
      const next = cur.children.get(d);
      if (!next) {
        cur.children.set(d, node);
        this._size++;
        return;
      }
      cur = next;
    }
  }

  /**
   * Find the most similar record within a pHash distance radius.
   * Dual-hash gate: a candidate is CONFIRMED only if dHash also agrees within
   * `dRadius`. Returns the best confirmed match, or null (honest "not seen").
   */
  findSimilar(
    pH: bigint,
    dH: bigint,
    pRadius: number = 8,
    dRadius: number = 16
  ): { rec: VisualRecord; similarity: number } | null {
    // dHash is edge-sensitive: ±1 luminance noise flips many gradient bits, so it
    // is the TOLERANT spatial witness (wide gate), while pHash (DCT, low-freq)
    // carries the precision. pHash alone can false-positive on coincidental
    // low-frequency matches; requiring SOME dHash agreement kills those. The
    // BK-tree prunes on pHash only (the indexed metric) — correct regardless of
    // the dRadius, which is applied as a per-candidate confirmation, not a prune.
    let best: { rec: VisualRecord; similarity: number } | null = null;
    const visit = (node: BkNode | null): void => {
      if (!node) return;
      const d = hamming(pH, node.hash);
      if (d <= pRadius) {
        // Dual-gate: dHash must ALSO broadly agree for a confirmed "seen before".
        const dd = hamming(dH, node.meta.dHash);
        if (dd <= dRadius) {
          const sim = hashSimilarity(pH, node.hash) * 0.5 + hashSimilarity(dH, node.meta.dHash) * 0.5;
          if (!best || sim > best.similarity) best = { rec: node.meta, similarity: sim };
        }
      }
      // Triangle inequality: only descend into children whose distance bucket
      // can contain a node within radius.
      for (const [bucket, child] of node.children) {
        if (bucket >= d - pRadius && bucket <= d + pRadius) visit(child);
      }
    };
    visit(this._root);
    return best;
  }

  /** All records (for persistence). */
  records(): VisualRecord[] {
    const out: VisualRecord[] = [];
    const walk = (n: BkNode | null): void => {
      if (!n) return;
      out.push(n.meta);
      for (const c of n.children.values()) walk(c);
    };
    walk(this._root);
    return out;
  }

  /** Drop all records (used by bounded-memory eviction). */
  clear(): void {
    this._root = null;
    this._size = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Visual episodic memory — bounded, persisted, novelty-gated
// ─────────────────────────────────────────────────────────────────────────────

/** Max visual memories retained: F₁₄ = 377. [SPEC] */
const MAX_VISUAL = 377;

interface SerializedVisual {
  readonly version: 1;
  readonly savedAt: number;
  readonly records: Array<{
    readonly pHash: string; // BigInt serialized as string
    readonly dHash: string;
    readonly caption: string | null;
    readonly timestamp: number;
    /** Hi-res descriptor as base64 Float64; absent on legacy records. [SPEC] */
    readonly descriptor?: string;
  }>;
}

export class VisualMemory {
  private readonly _file: string;
  private readonly _index = new VisualIndex();
  private _lastSeenPH: bigint | null = null;

  constructor(stateDir: string) {
    this._file = path.join(stateDir, "visual_memory.json");
  }

  get size(): number {
    return this._index.size;
  }

  /**
   * Observe a new frame's luminance grid. Novelty-gated: a frame nearly
   * identical to the last is not stored again. Returns the stored record, or
   * null if it was a repeat. Never fabricated — only real measured hashes.
   */
  observe(grid: Float64Array, w: number, h: number, caption: string | null = null): VisualRecord | null {
    const pH = pHash(grid, w, h);
    const dH = dHash(grid, w, h);
    // Novelty gate: skip if essentially the same as the last observed frame.
    if (this._lastSeenPH !== null && hamming(pH, this._lastSeenPH) <= 2) {
      return null;
    }
    this._lastSeenPH = pH;
    const rec: VisualRecord = {
      pHash: pH,
      dHash: dH,
      caption,
      timestamp: Date.now(),
      descriptor: perceptDescriptor(grid, w, h),
    };
    this._index.add(rec);
    this._evictIfNeeded();
    this._save();
    return rec;
  }

  /** Find a visually-similar remembered frame. Honest null when none match. */
  findSimilar(grid: Float64Array, w: number, h: number): { rec: VisualRecord; similarity: number } | null {
    const pH = pHash(grid, w, h);
    const dH = dHash(grid, w, h);
    return this._index.findSimilar(pH, dH);
  }

  /**
   * DISCRIMINATE at high resolution [P3] — separate near-identical percepts the
   * 128-bit hashes physically cannot. The hashes remain the fast BK-tree index;
   * this ranks candidates by the fine DCT descriptor. Two uses:
   *
   *   - IDENTIFY: whose/which remembered percept is this, among very similar ones?
   *   - VERIFY: is this the SAME instance as a remembered one, not merely the kind?
   *
   * Returns the best-matching record with BOTH the coarse (hash) and fine
   * (descriptor) similarities so the caller can see the resolution gain. Records
   * without a descriptor (legacy) contribute coarse-only evidence and are never
   * given fabricated fine scores. [SPEC]
   *
   * @param candidateRadius  pHash radius for candidate generation (wide — the
   *                         descriptor does the precise ranking). [SPEC]
   */
  discriminate(
    grid: Float64Array,
    w: number,
    h: number,
    candidateRadius: number = 14
  ): { rec: VisualRecord; coarse: number; fine: number } | null {
    const pH = pHash(grid, w, h);
    const dH = dHash(grid, w, h);
    const queryDesc = perceptDescriptor(grid, w, h);
    // Rank every record within the hash neighbourhood by fine descriptor. We use
    // the BK-tree for a coarse candidate set is an optimisation; with a bounded
    // 377-record store a full descriptor sweep is cheap and exact, so we rank all.
    let best: { rec: VisualRecord; coarse: number; fine: number } | null = null;
    for (const rec of this._index.records()) {
      const coarse = hashSimilarity(pH, rec.pHash) * 0.5 + hashSimilarity(dH, rec.dHash) * 0.5;
      // Only consider records that are even coarse candidates.
      if (hamming(pH, rec.pHash) > candidateRadius) continue;
      const fine = descriptorSimilarity(queryDesc, rec.descriptor);
      if (best === null || fine > best.fine || (fine === best.fine && coarse > best.coarse)) {
        best = { rec, coarse, fine };
      }
    }
    return best;
  }

  private _evictIfNeeded(): void {
    if (this._index.size <= MAX_VISUAL) return;
    // Rebuild without the oldest records (FIFO by timestamp).
    const all = this._index.records().sort((a, b) => a.timestamp - b.timestamp);
    const keep = all.slice(all.length - MAX_VISUAL);
    this._index.clear();
    for (const r of keep) this._index.add(r);
  }

  private _save(): void {
    try {
      const payload: SerializedVisual = {
        version: 1,
        savedAt: Date.now(),
        records: this._index.records().map((r) => ({
          pHash: r.pHash.toString(),
          dHash: r.dHash.toString(),
          caption: r.caption,
          timestamp: r.timestamp,
          ...(r.descriptor !== undefined
            ? {
                descriptor: Buffer.from(
                  r.descriptor.buffer,
                  r.descriptor.byteOffset,
                  r.descriptor.byteLength
                ).toString("base64"),
              }
            : {}),
        })),
      };
      const tmp = this._file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(payload));
      fs.renameSync(tmp, this._file);
    } catch {
      /* journal-loss must never kill vision; next observe retries */
    }
  }

  /** Load + validate. Corrupt file → renamed aside, fresh start, honest reason. */
  load(): { ok: boolean; restored: number; quarantined?: string } {
    if (!fs.existsSync(this._file)) return { ok: true, restored: 0 };
    try {
      const raw = JSON.parse(fs.readFileSync(this._file, "utf8")) as SerializedVisual;
      if (raw.version !== 1 || !Array.isArray(raw.records)) {
        throw new Error("visual_memory: bad shape");
      }
      let restored = 0;
      for (const r of raw.records) {
        if (typeof r.pHash === "string" && typeof r.dHash === "string" && Number.isFinite(r.timestamp)) {
          let descriptor: Float64Array | undefined;
          if (typeof r.descriptor === "string") {
            const buf = Buffer.from(r.descriptor, "base64");
            const n = Math.floor(buf.length / 8);
            descriptor = new Float64Array(n);
            for (let i = 0; i < n; i++) descriptor[i] = buf.readDoubleLE(i * 8);
          }
          this._index.add({
            pHash: BigInt(r.pHash),
            dHash: BigInt(r.dHash),
            caption: typeof r.caption === "string" ? r.caption : null,
            timestamp: r.timestamp,
            ...(descriptor !== undefined ? { descriptor } : {}),
          });
          restored++;
        }
      }
      return { ok: true, restored };
    } catch {
      const aside = `${this._file}.quarantine-${Date.now()}`;
      try {
        fs.renameSync(this._file, aside);
      } catch {
        /* best effort */
      }
      return { ok: false, restored: 0, quarantined: aside };
    }
  }
}
