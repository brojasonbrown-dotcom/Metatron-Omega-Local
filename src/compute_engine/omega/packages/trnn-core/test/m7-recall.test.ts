/**
 * m7 — Ω-REAL coherence-gated recall battery (Layer C: abstention primitive).
 *
 * Pins that `recallNearest` turns the field fingerprint into an *abstaining*
 * associative memory — it recalls the right label for exact and near matches,
 * and falls silent in exactly the two places it must:
 *   • unknown   — nearest distance above `maxDistance` (the field isn't in
 *     memory);
 *   • ambiguous — nearest is close but (2nd−1st) distance is below `minMargin`
 *     (two labels are indistinguishable at this resolution; don't flip a coin).
 *
 * Thresholds are the measured separability gap × margin (see m6/m7 calibration),
 * not guesses, and the whole thing scores cleanly under the P8 abstention gate
 * (rate 1.0, zero false-confident).
 */

import { describe, expect, it } from 'vitest';
import { MultiTorusEngine } from '../src/engine/MultiTorusEngine';
import { DENSE_CORE } from '../src/core/scaleLadder';
import { fieldFingerprint } from '../src/measure/fieldFingerprint';
import { recallNearest, type RecallEntry, type RecallConfig } from '../src/harness/recall';
import { scoreAbstention, abstentionGate, type AbstentionCase } from '../src/harness/abstention';

const RUNGS = DENSE_CORE.slice(0, 8);
const TICKS = 50;
const CFG: RecallConfig = { maxDistance: 0.08, minMargin: 0.03 };

function fp(seed: string, drive: number): Float64Array {
  const eng = new MultiTorusEngine({ rungs: RUNGS, nodes: 21, seed, drive });
  eng.run(TICKS);
  return fieldFingerprint(eng).vector;
}

function store(drives: readonly [string, number][]): RecallEntry[] {
  return drives.map(([label, drive]) => ({ label, vector: fp('s', drive) }));
}

// wide store: A=0.5, B=0.6, C=0.8 — exercises distance gate + correctness
const wide = () => store([['A', 0.5], ['B', 0.6], ['C', 0.8]]);
// close store: A=0.5, B=0.52 — isolates the margin gate
const pair = () => store([['A', 0.5], ['B', 0.52]]);

describe('M7 · coherence-gated recall (associative memory + abstention)', () => {
  it('recalls exact and near matches to the right label', () => {
    const s = wide();
    expect(recallNearest(s, fp('q', 0.5), CFG).label).toBe('A');
    expect(recallNearest(s, fp('q', 0.51), CFG).label).toBe('A'); // perturbed, stable band
    expect(recallNearest(s, fp('q', 0.59), CFG).label).toBe('B'); // perturbed toward B
    expect(recallNearest(s, fp('q', 0.6), CFG).label).toBe('B');
    expect(recallNearest(s, fp('q', 0.8), CFG).label).toBe('C');
  });

  it('abstains on an unknown field via the distance gate', () => {
    const s = wide();
    const r = recallNearest(s, fp('q', 0.7), CFG); // nearest C at ~0.184
    expect(r.verdict).toBe('abstain');
    expect(r.label).toBeNull();
    expect(r.distance).toBeGreaterThan(CFG.maxDistance);
  });

  it('abstains on an ambiguous query via the margin gate', () => {
    // close pair: nearest is only 0.020 away (below maxDistance) but the margin
    // is ~0.0002 — two labels are indistinguishable, so it must refuse.
    const s = pair();
    const r = recallNearest(s, fp('q', 0.51), CFG);
    expect(r.verdict).toBe('abstain');
    expect(r.distance).toBeLessThan(CFG.maxDistance); // it's CLOSE…
    expect(r.margin).toBeLessThan(CFG.minMargin);      // …but ambiguous
  });

  it('abstains on the wide midpoint (both gates defensible)', () => {
    const s = wide();
    const r = recallNearest(s, fp('q', 0.55), CFG); // A≈B≈0.10
    expect(r.verdict).toBe('abstain');
    expect(r.margin).toBeLessThan(CFG.minMargin);
  });

  it('scores cleanly under the P8 abstention discipline', () => {
    const w = wide();
    const p = pair();
    const cases: AbstentionCase[] = [
      { id: 'exact-A', expected: 'report', rationale: 'exact match to stored A', run: () => recallNearest(w, fp('q', 0.5), CFG).label ? 1 : null },
      { id: 'near-A', expected: 'report', rationale: 'within the stable band of A', run: () => recallNearest(w, fp('q', 0.51), CFG).label ? 1 : null },
      { id: 'exact-B', expected: 'report', rationale: 'exact match to stored B', run: () => recallNearest(w, fp('q', 0.6), CFG).label ? 1 : null },
      { id: 'exact-C', expected: 'report', rationale: 'exact match to stored C', run: () => recallNearest(w, fp('q', 0.8), CFG).label ? 1 : null },
      { id: 'unknown-X', expected: 'abstain', rationale: 'no stored field is close', run: () => recallNearest(w, fp('q', 0.7), CFG).label ? 1 : null },
      { id: 'ambiguous-mid', expected: 'abstain', rationale: 'midpoint between A and B', run: () => recallNearest(w, fp('q', 0.55), CFG).label ? 1 : null },
      { id: 'ambiguous-pair', expected: 'abstain', rationale: 'close pair, indistinguishable here', run: () => recallNearest(p, fp('q', 0.51), CFG).label ? 1 : null },
    ];
    const rep = scoreAbstention(cases);
    const gate = abstentionGate(rep);
    expect(rep.falseConfident).toEqual([]);
    expect(rep.falseSilent).toEqual([]);
    expect(rep.threw).toEqual([]);
    expect(gate.pass).toBe(true);
  });

  it('is deterministic across identical queries', () => {
    const a = recallNearest(wide(), fp('q', 0.51), CFG);
    const b = recallNearest(wide(), fp('q', 0.51), CFG);
    expect(a).toEqual(b);
  });
});
