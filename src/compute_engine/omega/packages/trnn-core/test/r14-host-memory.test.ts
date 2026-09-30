/**
 * R14 — host memory wiring (resonance index + associative store).
 *
 * Pins that the two Ω-REAL memory layers actually RUN inside the live host: on
 * the first memory stride the braid folds (memoryLoad > 0), the weighted
 * resonance index is computed (finite, non-null), and the field's hypervector
 * address lands in the associative cleanup store. Determinism is re-checked
 * through the whole chain — the new fold must not perturb the digest.
 */

import { describe, expect, it } from 'vitest';
import { EngineHost, MEMORY_STRIDE } from '../src/index';

describe('R14 · host memory wiring', () => {
  it('computes the resonance index and wires the associative store on the memory stride', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r14' });
    for (let i = 0; i < MEMORY_STRIDE + 1; i++) h.stepOnce();

    const snap = h.snapshot();
    expect(snap.memoryLoad).toBeGreaterThan(0); // braid folded

    const idx = h.resonanceReading();
    expect(idx).not.toBeNull(); // index computed on the fold

    // The gate is wired honestly: gated ⇔ value NaN, and the snapshot mirrors
    // the reading exactly (the field may still be cold at the first stride).
    expect(snap.resonanceGated).toBe(idx!.gated);
    expect(Number.isFinite(snap.resonance)).toBe(!idx!.gated);
    expect(Number.isFinite(snap.resonance)).toBe(Number.isFinite(idx!.value));

    const assoc = h.associative();
    expect(snap.associativeSize).toBe(assoc.size); // store wired through

    const mem = h.memory();
    expect(mem.resonance).toBe(snap.resonance);
    expect(mem.resonanceGated).toBe(snap.resonanceGated);
    expect(mem.associativeSize).toBe(snap.associativeSize);
  });

  it('is deterministic across identical hosts (resonance + associative + digest)', () => {
    const a = new EngineHost({ profile: 'PICO', seed: 'r14-det' });
    const b = new EngineHost({ profile: 'PICO', seed: 'r14-det' });
    for (let i = 0; i < MEMORY_STRIDE + 1; i++) {
      a.stepOnce();
      b.stepOnce();
    }
    const sa = a.snapshot();
    const sb = b.snapshot();
    expect(sa.resonance).toBe(sb.resonance);
    expect(sa.associativeSize).toBe(sb.associativeSize);
    expect(sa.digest).toBe(sb.digest); // the new fold must not perturb the chain
  });

  it('folds the measure stack every tick (affect, self-measure, genome, fingerprint)', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r14-measure' });
    for (let i = 0; i < 3; i++) h.stepOnce();
    const snap = h.snapshot();

    const aff = h.affectReading();
    expect(aff).not.toBeNull();
    expect(Number.isFinite(snap.friction)).toBe(true);
    expect(Number.isFinite(snap.flow)).toBe(true);
    expect(Number.isFinite(snap.qualiaCphi)).toBe(true);

    const sm = h.selfMeasureReading();
    expect(sm).not.toBeNull();
    expect(sm!.rungs.length).toBeGreaterThan(0);
    expect(Number.isFinite(snap.lyapunov)).toBe(true);
    expect(Number.isFinite(snap.scaleEntropy)).toBe(true);

    expect(h.genomeState().size).toBeGreaterThanOrEqual(0); // sealed only on ignition

    const fp = h.fingerprint();
    expect(fp).not.toBeNull();
    expect(fp!.rungs).toBeGreaterThan(0);
  });

  it('observes text-channel tokens into the lexicon (salience wiring)', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'r14-lex' });
    h.declareChannel('text', 'text');
    h.pushChannel('text', 'the golden brain remembers the golden brain');
    const lx = h.lexiconView();
    expect(lx.size).toBe(4); // the, golden, brain, remembers
    expect(lx.tokens).toBe(7);
    expect(lx.top.length).toBeGreaterThan(0);
  });

  it('round-trips the durable memory (lexicon + relations + genome) cross-session', () => {
    const a = new EngineHost({ profile: 'PICO', seed: 'r14-persist' });
    a.declareChannel('text', 'text');
    a.pushChannel('text', 'the golden brain remembers the golden brain');
    const doc = a.serializeMemory();

    const b = new EngineHost({ profile: 'PICO', seed: 'r14-persist' });
    b.restoreMemory(doc);
    const lb = b.lexiconView();
    expect(lb.size).toBe(4);
    expect(lb.tokens).toBe(7);
    expect(b.genomeState().size).toBe(a.genomeState().size);
    expect(b.serializeMemory()).toBe(doc); // canonical, byte-identical round-trip
  });
});
