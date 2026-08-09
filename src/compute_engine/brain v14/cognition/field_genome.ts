/**
 * RHUFT Mind — Field-State Genome (Phase 5): the mind's field memory
 *
 * Epistemic Status: [SPEC] — Adapter/cognition persistence. The field lattice
 * is real engine state; the genome is an honest, checksummed record of it.
 *
 * WHAT THIS IS
 * ------------
 * Each cognitive tick the engine advances the fractal tree and every node's
 * 28-component geometric field (Ψ) is recomputed, then the previous tick's
 * high-resolution field is discarded. That discarded history IS the mind's
 * experience. The Field-State Genome keeps it: a ring-buffered, checksummed,
 * φ-tiered store of full field-lattice snapshots, with recall feeding the
 * engine through its OWN deterministic sensory door (never a state bypass).
 *
 * THE LATTICE
 * -----------
 * A snapshot is the ordered pre-order DFS of the node tree, flattening each
 * node's `state.field_state` (Float64Array, 28) into one [nodeCount][28]
 * vector. Pre-order DFS is a fixed, deterministic order for a given tree
 * shape, so the same field evolution yields the same lattice every run.
 *
 * CHECKSUMS
 * ---------
 * Every snapshot carries an FNV-1a 64-bit hash over the lattice bytes
 * (FNV prime F₈ = 1099511628211 is a genuine Fibonacci number). Two runs of
 * the same ticks produce the same checksums — the genome doubles as a
 * determinism oracle. A corrupt persisted snapshot fails its checksum and is
 * quarantined, never silently repaired.
 *
 * φ-TIERS
 * -------
 *   HOT  — in-RAM ring of the F₈ = 21 most recent snapshots (instant recall).
 *   WARM — persisted ring of F₉ = 34 snapshots on disk; evicted hot snapshots
 *          cascade here in tick order. Loaded at boot.
 * Ring sizes are Fibonacci, matching the project's bounded-memory discipline
 * (visual_memory uses F₁₄ = 377). Capacity is a real bound, never a leak.
 *
 * RECALL FEEDS THE TREE
 * ---------------------
 * `recall(field)` returns the stored snapshot whose lattice is nearest by
 * cosine similarity — the same comparison the engine's own descriptor code
 * uses. The CognitiveLoop may then inject the recalled lattice through
 * `engine.process()` (the L4_Sensory door), so a remembered field genuinely
 * re-enters the dynamics. Injection is deterministic and journaled; the genome
 * never writes node state directly.
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// Constants — real Fibonacci numbers, honestly labelled. [MATH]
// ─────────────────────────────────────────────────────────────────────────────

/** Hot ring capacity: F₈ = 21 most-recent snapshots in RAM. [SPEC] */
export const GENOME_HOT = 21;
/** Warm ring capacity: F₉ = 34 persisted snapshots on disk. [SPEC] */
export const GENOME_WARM = 34;
/** Field components per node (boundary field 2·(N+1) for N=13). [SPEC] */
export const FIELD_COMPONENTS = 28;

/** FNV-1a 64-bit offset basis and prime. 1099511628211 = F₈₀ (Fibonacci). [MATH] */
const FNV_OFFSET = 14695981039346656037n;
const FNV_PRIME = 1099511628211n;
const FNV_MASK = 0xffffffffffffffffn;

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One tick's full field lattice, flattened.
 * `lattice` is [nodeCount][28] row-major; `checksum` is FNV-1a over its bytes.
 */
export interface FieldSnapshot {
  readonly tick: number;
  readonly nodeCount: number;
  readonly timestamp: number;
  /** Flattened lattice, length nodeCount * 28. */
  readonly lattice: Float64Array;
  /** FNV-1a 64-bit checksum of the lattice bytes (hex string, stable). */
  readonly checksum: string;
  /** Which tier this snapshot currently lives in. */
  readonly tier: "hot" | "warm";
}

// ─────────────────────────────────────────────────────────────────────────────
// Checksum + similarity primitives
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FNV-1a 64-bit over the little-endian bytes of a Float64Array. Deterministic:
 * same lattice bytes → same hash, every run, every machine. [MATH]
 */
export function checksumLattice(lattice: Float64Array): string {
  const bytes = new Uint8Array(lattice.buffer, lattice.byteOffset, lattice.byteLength);
  let h = FNV_OFFSET;
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i]!);
    h = (h * FNV_PRIME) & FNV_MASK;
  }
  return h.toString(16).padStart(16, "0");
}

/**
 * Cosine similarity in [-1,1] between two flattened lattices (or a lattice and
 * a query field). Length-mismatched inputs compare over the shared prefix;
 * a zero-norm input returns 0 (no evidence, never fabricated). [MATH]
 */
export function latticeSimilarity(a: Float64Array, b: Float64Array): number {
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

// ─────────────────────────────────────────────────────────────────────────────
// Persistence shape (versioned, checksummed)
// ─────────────────────────────────────────────────────────────────────────────

interface SerializedGenome {
  readonly version: 1;
  readonly savedAt: number;
  readonly snapshots: Array<{
    readonly tick: number;
    readonly nodeCount: number;
    readonly timestamp: number;
    readonly checksum: string;
    /** lattice bytes as base64 Float64. */
    readonly lattice: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// The genome
// ─────────────────────────────────────────────────────────────────────────────

export class FieldGenome {
  private readonly _file: string;
  /** Hot ring (RAM): newest at the end. */
  private _hot: FieldSnapshot[] = [];
  /** Warm ring (disk): newest at the end. */
  private _warm: FieldSnapshot[] = [];
  /** Total snapshots ever recorded this session (monotonic, for telemetry). */
  private _recorded = 0;

  constructor(stateDir: string) {
    this._file = path.join(stateDir, "field_genome.json");
  }

  /** Snapshot count per tier. */
  get hotSize(): number {
    return this._hot.length;
  }
  get warmSize(): number {
    return this._warm.length;
  }
  get recorded(): number {
    return this._recorded;
  }

  /**
   * Record one tick's field lattice. The lattice is COPIED (the caller's buffer
   * may be the engine's live state). Checksummed, pushed to the hot ring; an
   * overflow cascades the oldest hot snapshot to the warm ring, which itself
   * evicts its oldest beyond F₉. The warm ring is persisted atomically.
   *
   * @param tick      cognitive tick index (monotonic).
   * @param lattice   flattened [nodeCount][28] lattice for this tick.
   * @param nodeCount number of nodes the lattice covers.
   */
  record(tick: number, lattice: Float64Array, nodeCount: number): FieldSnapshot {
    const copy = new Float64Array(lattice); // own the bytes
    const snap: FieldSnapshot = {
      tick,
      nodeCount,
      timestamp: Date.now(),
      lattice: copy,
      checksum: checksumLattice(copy),
      tier: "hot",
    };
    this._hot.push(snap);
    this._recorded++;
    if (this._hot.length > GENOME_HOT) {
      const evicted = this._hot.shift()!;
      this._warm.push({ ...evicted, tier: "warm" });
      if (this._warm.length > GENOME_WARM) {
        this._warm.shift(); // oldest warm snapshot leaves the genome entirely
      }
      this._save();
    }
    return snap;
  }

  /**
   * Recall the snapshot whose lattice is nearest to `query` by cosine
   * similarity, searching hot then warm (hot wins ties — it is the fresher
   * memory). Returns null when the genome is empty (honest "nothing yet").
   */
  recall(query: Float64Array): { snapshot: FieldSnapshot; similarity: number } | null {
    let best: { snapshot: FieldSnapshot; similarity: number } | null = null;
    for (const snap of this._hot) {
      const sim = latticeSimilarity(query, snap.lattice);
      if (!best || sim >= best.similarity) best = { snapshot: snap, similarity: sim };
    }
    for (const snap of this._warm) {
      const sim = latticeSimilarity(query, snap.lattice);
      if (!best || sim > best.similarity) best = { snapshot: snap, similarity: sim };
    }
    return best;
  }

  /** The most recent snapshot, or null. */
  latest(): FieldSnapshot | null {
    return this._hot.length > 0 ? this._hot[this._hot.length - 1]! : null;
  }

  // ─── Persistence ────────────────────────────────────────────────────────────

  /** Atomically persist the warm ring (temp-write + rename; never throws). */
  private _save(): void {
    try {
      const payload: SerializedGenome = {
        version: 1,
        savedAt: Date.now(),
        snapshots: this._warm.map((s) => ({
          tick: s.tick,
          nodeCount: s.nodeCount,
          timestamp: s.timestamp,
          checksum: s.checksum,
          lattice: Buffer.from(s.lattice.buffer, s.lattice.byteOffset, s.lattice.byteLength).toString("base64"),
        })),
      };
      const tmp = this._file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(payload));
      fs.renameSync(tmp, this._file);
    } catch {
      /* persistence loss must never kill cognition; next cascade retries */
    }
  }

  /**
   * Load + validate the warm ring. Every snapshot's lattice is re-checksummed;
   * any mismatch quarantines the file (rename aside) and starts the warm ring
   * fresh. Corruption is never silently repaired. Returns an honest report.
   */
  load(): { ok: boolean; restored: number; quarantined?: string } {
    if (!fs.existsSync(this._file)) return { ok: true, restored: 0 };
    let parsed: SerializedGenome;
    try {
      parsed = JSON.parse(fs.readFileSync(this._file, "utf8")) as SerializedGenome;
      if (parsed.version !== 1 || !Array.isArray(parsed.snapshots)) {
        throw new Error("field_genome: bad shape");
      }
      const restored: FieldSnapshot[] = [];
      for (const r of parsed.snapshots) {
        if (!Number.isFinite(r.tick) || !Number.isFinite(r.nodeCount) || typeof r.lattice !== "string") {
          throw new Error("field_genome: bad snapshot entry");
        }
        const buf = Buffer.from(r.lattice, "base64");
        const n = Math.floor(buf.length / 8);
        const lattice = new Float64Array(n);
        for (let i = 0; i < n; i++) lattice[i] = buf.readDoubleLE(i * 8);
        // Integrity gate: the persisted checksum must match the bytes.
        if (checksumLattice(lattice) !== r.checksum) {
          throw new Error(`field_genome: checksum mismatch at tick ${r.tick}`);
        }
        restored.push({ tick: r.tick, nodeCount: r.nodeCount, timestamp: r.timestamp, lattice, checksum: r.checksum, tier: "warm" });
      }
      this._warm = restored.slice(-GENOME_WARM);
      return { ok: true, restored: this._warm.length };
    } catch (err) {
      const q = `${this._file}.quarantine-${Date.now()}`;
      try {
        fs.renameSync(this._file, q);
      } catch {
        /* leave the file; load already refused it */
      }
      return { ok: false, restored: 0, quarantined: q };
    }
  }

  /** Drop all in-RAM state (hot + warm). Persistence file is left on disk. */
  clear(): void {
    this._hot = [];
    this._warm = [];
  }
}
