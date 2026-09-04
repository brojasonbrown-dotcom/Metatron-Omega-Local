/**
 * m8 — Ω-REAL cross-modal text binding battery (Layer A).
 *
 * Pins that `textFingerprint` closes the B→C→A loop from the semantic end. The
 * certified Ω-P9 text codec is a *sharp discriminator* (its identity channel
 * dominates by design), so the honest properties are:
 *   • deterministic — same text ⇒ distance exactly 0;
 *   • normalisation-invariant — case/whitespace collapse (NFKD + lowercase +
 *     trim) ⇒ distance 0;
 *   • unit-normalised, fixed-length (φ-aligned bin count);
 *   • sharply separating — distinct texts (even a morphological variant like
 *     "resonance"→"resonances") land far apart, so recall is exact-match, not
 *     fuzzy, and a held-out text abstains rather than false-match;
 *   • P8-clean — the recall scores a perfect abstention gate (zero
 *     false-confident).
 *
 * Thresholds are measured values (see m8 calibration): exact 0, distinct
 * 0.51–0.68 — a wide, unambiguous band.
 */

import { describe, expect, it } from 'vitest';
import { textFingerprint, TEXT_FINGERPRINT_BINS } from '../src/sense/textFingerprint';
import { fingerprintDistance } from '../src/measure/fieldFingerprint';
import { recallNearest, type RecallEntry, type RecallConfig } from '../src/harness/recall';
import { scoreAbstention, abstentionGate, type AbstentionCase } from '../src/harness/abstention';

const NODES = 34;
const CFG: RecallConfig = { maxDistance: 0.3, minMargin: 0.1 };

function fp(text: string): Float64Array {
  return textFingerprint(text, NODES);
}

function store(): RecallEntry[] {
  return [
    { label: 'resonance', vector: fp('resonance') },
    { label: 'coherence', vector: fp('coherence') },
    { label: 'cat', vector: fp('cat') },
  ];
}

describe('M8 · cross-modal text binding (Layer A)', () => {
  it('is deterministic: same text ⇒ identical fingerprint', () => {
    expect(fingerprintDistance(fp('resonance'), fp('resonance'))).toBe(0);
  });

  it('is normalisation-invariant: case and whitespace collapse', () => {
    expect(fingerprintDistance(fp('resonance'), fp('Resonance'))).toBe(0);
    expect(fingerprintDistance(fp('cat'), fp('cat '))).toBe(0);
    expect(fingerprintDistance(fp('  Field '), fp('field'))).toBe(0);
  });

  it('is unit-normalised and fixed-length', () => {
    const v = fp('resonance');
    expect(v.length).toBe(TEXT_FINGERPRINT_BINS);
    let s2 = 0;
    for (const x of v) s2 += x * x;
    expect(Math.sqrt(s2)).toBeCloseTo(1, 10);
  });

  it('discriminates sharply: distinct texts land far apart', () => {
    // measured 0.51–0.68
    expect(fingerprintDistance(fp('resonance'), fp('coherence'))).toBeGreaterThan(0.4);
    expect(fingerprintDistance(fp('cat'), fp('dog'))).toBeGreaterThan(0.4);
    // even a morphological variant is far — recall is exact-match, not fuzzy
    expect(fingerprintDistance(fp('resonance'), fp('resonances'))).toBeGreaterThan(0.4);
  });

  it('recalls exact text and abstains on held-out text', () => {
    const s = store();
    expect(recallNearest(s, fp('resonance'), CFG).label).toBe('resonance');
    expect(recallNearest(s, fp('Resonance'), CFG).label).toBe('resonance'); // normalised
    expect(recallNearest(s, fp('cat'), CFG).label).toBe('cat');

    const held = recallNearest(s, fp('dog'), CFG);
    expect(held.verdict).toBe('abstain');
    expect(held.label).toBeNull();
    expect(held.distance).toBeGreaterThan(CFG.maxDistance);
  });

  it('scores cleanly under the P8 abstention discipline', () => {
    const s = store();
    const cases: AbstentionCase[] = [
      { id: 'exact', expected: 'report', rationale: 'exact stored text', run: () => recallNearest(s, fp('resonance'), CFG).label ? 1 : null },
      { id: 'case-variant', expected: 'report', rationale: 'normalisation-equivalent', run: () => recallNearest(s, fp('Resonance'), CFG).label ? 1 : null },
      { id: 'other-stored', expected: 'report', rationale: 'exact stored text', run: () => recallNearest(s, fp('cat'), CFG).label ? 1 : null },
      { id: 'held-out', expected: 'abstain', rationale: 'not in memory', run: () => recallNearest(s, fp('dog'), CFG).label ? 1 : null },
      { id: 'held-out-2', expected: 'abstain', rationale: 'not in memory', run: () => recallNearest(s, fp('xyzzy'), CFG).label ? 1 : null },
    ];
    const rep = scoreAbstention(cases);
    const gate = abstentionGate(rep);
    expect(rep.falseConfident).toEqual([]);
    expect(rep.falseSilent).toEqual([]);
    expect(gate.pass).toBe(true);
  });
});
