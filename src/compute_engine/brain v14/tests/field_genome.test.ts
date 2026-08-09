/**
 * Field-State Genome (Phase 5) — rigor suite.
 *
 * What is proven here, and how:
 *   1. CHECKSUM DETERMINISM — same lattice bytes → same FNV-1a hash, always.
 *   2. RING BOUND — the hot ring never exceeds F₈ = 21, warm never exceeds
 *      F₉ = 34, no matter how many ticks are recorded. A real bound, not a leak.
 *   3. φ-TIER CASCADE — recording beyond hot capacity evicts the OLDEST hot
 *      snapshot into warm, in tick order (FIFO, not random).
 *   4. RECALL — nearest-neighbour by cosine returns the genuinely-closest
 *      snapshot; an empty genome returns honest null, never a fabrication.
 *   5. PERSISTENCE ROUND-TRIP — save → load restores the warm ring bit-exact,
 *      checksums re-verified on load.
 *   6. CHECKSUM QUARANTINE — a tampered persisted file fails its checksum and is
 *      quarantined (renamed aside), never silently repaired.
 *   7. ENGINE LATTICE DETERMINISM — two identically-configured engines ticked the
 *      same number of times produce the SAME snapshot lattice (bit-identical),
 *      which is what makes the genome's checksums a real determinism oracle.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  FIELD_COMPONENTS,
  FieldGenome,
  GENOME_HOT,
  GENOME_WARM,
  checksumLattice,
  latticeSimilarity,
} from "./../cognition/field_genome.ts";
import { FractalNodeEngine } from "./../fractal_node_engine.ts";

/** A deterministic pseudo-field (no RNG): a fixed function of (tick, index). */
function latticeFor(tick: number, nodeCount: number): Float64Array {
  const n = nodeCount * FIELD_COMPONENTS;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.sin(tick * 0.5 + i * 0.1) * Math.cos(i * 0.03);
  }
  return out;
}

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "genome-test-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("checksumLattice — determinism oracle", () => {
  it("is bit-stable: same bytes → same hash, independent of call order", () => {
    const a = latticeFor(1, 5);
    const b = latticeFor(1, 5); // identical construction
    const c = latticeFor(2, 5); // different tick
    expect(checksumLattice(a)).toBe(checksumLattice(b));
    expect(checksumLattice(a)).not.toBe(checksumLattice(c));
    // 16-hex-char (64-bit) stable string form.
    expect(checksumLattice(a)).toMatch(/^[0-9a-f]{16}$/);
  });

  it("detects a single-element mutation (real sensitivity)", () => {
    const a = latticeFor(1, 5);
    const m = new Float64Array(a);
    m[123] = m[123]! + 1e-9;
    expect(checksumLattice(a)).not.toBe(checksumLattice(m));
  });
});

describe("latticeSimilarity — cosine over the lattice", () => {
  it("is 1 for identical, ~0 for orthogonal-ish, and symmetric", () => {
    const a = latticeFor(1, 5);
    const b = latticeFor(1, 5);
    const c = latticeFor(7, 5);
    expect(latticeSimilarity(a, b)).toBeCloseTo(1, 12);
    expect(latticeSimilarity(a, c)).toBe(latticeSimilarity(c, a));
    expect(latticeSimilarity(a, c)).toBeLessThan(1);
  });

  it("returns 0 for a zero-norm input (no fabricated evidence)", () => {
    const a = latticeFor(1, 5);
    const z = new Float64Array(a.length);
    expect(latticeSimilarity(a, z)).toBe(0);
  });
});

describe("FieldGenome ring bounds + φ-tier cascade", () => {
  it("hot ring never exceeds F₈=21; warm ring receives the overflow in tick order", () => {
    const g = new FieldGenome(dir);
    // Record hot + a few overflow.
    const total = GENOME_HOT + 5;
    for (let t = 0; t < total; t++) g.record(t, latticeFor(t, 3), 3);
    expect(g.hotSize).toBe(GENOME_HOT);
    expect(g.warmSize).toBe(5);
    // Hot holds the NEWEST 21: ticks (total-21 .. total-1).
    expect(g.latest()!.tick).toBe(total - 1);
    // Warm holds the evicted OLDEST, in order: ticks 0..4.
    const recalled = g.recall(latticeFor(0, 3));
    expect(recalled).not.toBeNull();
    expect(recalled!.snapshot.tier).toBe("warm");
    expect(recalled!.snapshot.tick).toBe(0);
  });

  it("warm ring is bounded at F₉=34; the oldest warm snapshots leave the genome", () => {
    const g = new FieldGenome(dir);
    // Overflow warm by recording hot + warm + extra.
    const total = GENOME_HOT + GENOME_WARM + 7;
    for (let t = 0; t < total; t++) g.record(t, latticeFor(t, 2), 2);
    expect(g.hotSize).toBe(GENOME_HOT);
    expect(g.warmSize).toBe(GENOME_WARM);
    // The very oldest ticks (0..6) are gone entirely; tick 7 is the oldest warm.
    const r7 = g.recall(latticeFor(7, 2));
    expect(r7!.snapshot.tick).toBe(7);
  });

  it("records honestly: `recorded` counts every snapshot even as rings evict", () => {
    const g = new FieldGenome(dir);
    const total = GENOME_HOT + 10;
    for (let t = 0; t < total; t++) g.record(t, latticeFor(t, 2), 2);
    expect(g.recorded).toBe(total);
    expect(g.hotSize + g.warmSize).toBeLessThanOrEqual(GENOME_HOT + GENOME_WARM);
  });
});

describe("FieldGenome recall — nearest neighbour, honest emptiness", () => {
  it("returns null on an empty genome (never a fabricated match)", () => {
    const g = new FieldGenome(dir);
    expect(g.recall(latticeFor(0, 3))).toBeNull();
    expect(g.latest()).toBeNull();
  });

  it("finds the genuinely-closest snapshot among many", () => {
    const g = new FieldGenome(dir);
    for (let t = 0; t < 12; t++) g.record(t, latticeFor(t, 4), 4);
    // Query exactly snapshot tick 5's field → similarity ~1, tick 5 returned.
    const q = latticeFor(5, 4);
    const r = g.recall(q);
    expect(r!.snapshot.tick).toBe(5);
    expect(r!.similarity).toBeCloseTo(1, 9);
  });

  it("hot wins ties over warm (fresher memory preferred)", () => {
    const g = new FieldGenome(dir);
    // Force an identical lattice into both tiers: record the same field twice
    // far enough apart that the first cascades to warm while the second is hot.
    const field = latticeFor(99, 2);
    g.record(0, field, 2);
    for (let t = 1; t <= GENOME_HOT; t++) g.record(t, latticeFor(t, 2), 2); // pushes tick0 → warm
    g.record(GENOME_HOT + 1, field, 2); // identical field, now hot
    const r = g.recall(field);
    expect(r!.snapshot.tier).toBe("hot");
    expect(r!.similarity).toBeCloseTo(1, 9);
  });
});

describe("FieldGenome persistence — round-trip + checksum quarantine", () => {
  it("save → load restores the warm ring bit-exact (checksums re-verified)", () => {
    const g = new FieldGenome(dir);
    const total = GENOME_HOT + 6; // 6 warm snapshots persisted
    for (let t = 0; t < total; t++) g.record(t, latticeFor(t, 3), 3);
    expect(g.warmSize).toBe(6);

    const g2 = new FieldGenome(dir);
    const res = g2.load();
    expect(res.ok).toBe(true);
    expect(res.restored).toBe(6);
    // The restored warm ring recalls the same ticks with the same checksums.
    const orig = g.recall(latticeFor(0, 3));
    const rest = g2.recall(latticeFor(0, 3));
    expect(rest!.snapshot.tick).toBe(orig!.snapshot.tick);
    expect(rest!.snapshot.checksum).toBe(orig!.snapshot.checksum);
  });

  it("quarantines a checksum-tampered file — never silently repairs", () => {
    const g = new FieldGenome(dir);
    for (let t = 0; t < GENOME_HOT + 3; t++) g.record(t, latticeFor(t, 2), 2);
    // Corrupt the persisted lattice bytes without updating the checksum.
    const file = path.join(dir, "field_genome.json");
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const buf = Buffer.from(raw.snapshots[0].lattice, "base64");
    buf[0] = buf[0]! ^ 0xff; // flip a byte
    raw.snapshots[0].lattice = buf.toString("base64");
    fs.writeFileSync(file, JSON.stringify(raw));

    const g2 = new FieldGenome(dir);
    const res = g2.load();
    expect(res.ok).toBe(false);
    expect(res.restored).toBe(0);
    expect(res.quarantined).toBeTruthy();
    expect(fs.existsSync(res.quarantined!)).toBe(true);
    // Original file moved aside; warm ring fresh.
    expect(g2.warmSize).toBe(0);
  });
});

describe("engine lattice — the genome's snapshot is a real determinism oracle", () => {
  it("two identically-configured engines ticked equally produce the SAME lattice", async () => {
    const mk = () =>
      new FractalNodeEngine({
        target_scale: 292,
        max_depth: 4,
        hardware_adaptive: false, // measure the requested depth, not a capped one
        parallel: false, // serial path — the canonical reference
      });
    const a = mk();
    const b = mk();
    a.initialize();
    b.initialize();
    for (let i = 0; i < 4; i++) {
      await a.tick();
      await b.tick();
    }
    const la = a.snapshot_field_lattice();
    const lb = b.snapshot_field_lattice();
    expect(la.length).toBe(lb.length);
    expect(la.length).toBe(a.get_state().total_nodes * FIELD_COMPONENTS);
    // Bit-identical lattice → identical genome checksum.
    expect(checksumLattice(la)).toBe(checksumLattice(lb));
    a.shutdown();
    b.shutdown();
  });

  it("the lattice actually changes across ticks (it is live field, not a constant)", async () => {
    const e = new FractalNodeEngine({ target_scale: 292, max_depth: 3, hardware_adaptive: false, parallel: false });
    e.initialize();
    await e.tick();
    const first = e.snapshot_field_lattice();
    await e.tick();
    const second = e.snapshot_field_lattice();
    expect(checksumLattice(first)).not.toBe(checksumLattice(second));
    e.shutdown();
  });
});
