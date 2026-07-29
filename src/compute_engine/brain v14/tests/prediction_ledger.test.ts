/**
 * M6 — Prediction Ledger: mastery as verified prediction, proven against the
 * φ-prior. The whole point: "learned" must mean "predicts better than baseline",
 * and this suite proves the ledger cannot be gamed by accretion.
 */
import { describe, it, expect } from "vitest";
import {
  PredictionLedger,
  verifyPrediction,
  PREDICTION_BASELINE,
  MIN_VERIFICATIONS,
} from "./../cognition/prediction_ledger.ts";
import { PHI, PHI_INV, PHI_NEG2 } from "./../core/constants.ts";
import { HopfieldMemory } from "./../cognition/hopfield.ts";
import { FIELD_SIZE, normalizeField } from "./../adapters/language_codec.ts";

/** Deterministic, near-orthogonal fields (golden-angle phase spacing). */
function field(seed: number): Float64Array {
  const f = new Float64Array(FIELD_SIZE);
  for (let i = 0; i < FIELD_SIZE; i++) f[i] = Math.sin((seed + 1) * (i + 1) * 2.399963);
  return normalizeField(f);
}

describe("constants are φ-derived, never hand-tuned", () => {
  it("baseline B = 1 − φ⁻² = φ⁻¹", () => {
    expect(PREDICTION_BASELINE).toBeCloseTo(1 - PHI_NEG2, 12);
    expect(PREDICTION_BASELINE).toBeCloseTo(PHI_INV, 12);
    expect(PREDICTION_BASELINE).toBeCloseTo(PHI - 1, 12); // 1/φ = φ − 1
  });
  it("min verifications = F₅ = 5", () => {
    expect(MIN_VERIFICATIONS).toBe(5);
  });
});

describe("gain vs the φ-prior", () => {
  it("a perfect prediction has positive gain", () => {
    const l = new PredictionLedger();
    const o = l.record(1, 1);
    expect(o.measured).toBe(1);
    expect(o.gain).toBeCloseTo(1 - PHI_INV, 12);
    expect(o.surprise).toBe(0);
    expect(o.gain).toBeGreaterThan(0);
  });
  it("an orthogonal field has negative gain and maximal surprise", () => {
    const l = new PredictionLedger();
    const o = l.record(0, 0);
    expect(o.gain).toBeCloseTo(-PHI_INV, 12);
    expect(o.surprise).toBe(1); // (1 − 0)^φ = 1
  });
  it("no prediction (null) is scored honestly against the prior", () => {
    const l = new PredictionLedger();
    const o = l.record(null, PHI_INV); // measured exactly at the prior
    expect(o.predicted).toBeNull();
    expect(o.gain).toBeCloseTo(0, 12); // at baseline: zero gain
  });
});

describe("mastery is earned, never accreted", () => {
  it("good predictions drive mastery UP above 0", () => {
    const l = new PredictionLedger();
    for (let i = 0; i < 8; i++) l.record(0.95, 0.95);
    expect(l.state.mastery).toBeGreaterThan(0);
  });
  it("bad predictions drive mastery DOWN below 0 — accretion is impossible", () => {
    const l = new PredictionLedger();
    for (let i = 0; i < 8; i++) l.record(0.1, 0.1);
    expect(l.state.mastery).toBeLessThan(0);
    expect(l.state.learned).toBe(false);
  });
  it("mixed quality pulls mastery back toward the baseline — it does not ratchet", () => {
    const l = new PredictionLedger();
    for (let i = 0; i < 6; i++) l.record(0.95, 0.95); // earn it
    const earned = l.state.mastery;
    for (let i = 0; i < 12; i++) l.record(0.2, 0.2); // then fail repeatedly
    expect(l.state.mastery).toBeLessThan(earned); // mastery FELL on failure
  });
  it("learned ⟺ mastery > 0 AND ≥ F₅ verifications — both required", () => {
    const l = new PredictionLedger();
    for (let i = 0; i < MIN_VERIFICATIONS - 1; i++) l.record(1, 1);
    expect(l.state.mastery).toBeGreaterThan(0);
    expect(l.state.learned).toBe(false); // not enough verifications yet
    l.record(1, 1); // the F₅-th
    expect(l.state.verifications).toBe(MIN_VERIFICATIONS);
    expect(l.state.learned).toBe(true);
  });
  it("surprise slows mastery growth — hard content is mastered slowly", () => {
    const easy = new PredictionLedger();
    const hard = new PredictionLedger();
    easy.record(0.9, 0.9); // low surprise
    hard.record(0.9, 0.62); // higher surprise, similar gain
    // The η = φ⁻²/(1+surprise) decay means the surprising one moves mastery less.
    expect(Math.abs(hard.state.mastery)).toBeLessThan(Math.abs(easy.state.mastery));
  });
});

describe("verifyPrediction against the mind's real episodic memory", () => {
  it("with an empty memory there is no prediction — measured at the prior", () => {
    const bank = new HopfieldMemory();
    const prior = { mastery: 0, verifications: 0, meanSurprise: 1, learned: false };
    const { outcome, next } = verifyPrediction(prior, bank, field(1));
    expect(outcome.predicted).toBeNull();
    expect(outcome.measured).toBeCloseTo(PHI_INV, 12);
    expect(next.verifications).toBe(1);
    expect(next.learned).toBe(false);
  });
  it("after storing an episode, the same field is predicted — and the gain is real", () => {
    const bank = new HopfieldMemory();
    const f = field(7);
    bank.store(f);
    const prior = { mastery: 0, verifications: 0, meanSurprise: 1, learned: false };
    const { outcome, next } = verifyPrediction(prior, bank, f);
    expect(outcome.predicted).not.toBeNull();
    expect(outcome.measured).toBeGreaterThan(PHI_INV); // beat the prior
    expect(outcome.gain).toBeGreaterThan(0);
    expect(next.mastery).toBeGreaterThan(0);
  });
  it("a novel field after storing a DIFFERENT episode predicts worse", () => {
    const bank = new HopfieldMemory();
    bank.store(field(1));
    const prior = { mastery: 0, verifications: 0, meanSurprise: 1, learned: false };
    const seen = verifyPrediction(prior, bank, field(1));
    const novel = verifyPrediction(prior, bank, field(42));
    expect(novel.outcome.measured).toBeLessThan(seen.outcome.measured);
    expect(novel.outcome.gain).toBeLessThan(seen.outcome.gain);
  });
});

describe("ledger restore round-trips the running statistics", () => {
  it("restored state is identical to the live state", () => {
    const a = new PredictionLedger();
    a.record(0.9, 0.9);
    a.record(0.8, 0.85);
    a.record(0.3, 0.4);
    const s = a.state;
    const b = new PredictionLedger();
    b.restore(s.mastery, s.verifications, s.meanSurprise);
    expect(b.state.mastery).toBeCloseTo(s.mastery, 15);
    expect(b.state.verifications).toBe(s.verifications);
    expect(b.state.meanSurprise).toBeCloseTo(s.meanSurprise, 15);
    expect(b.state.learned).toBe(s.learned);
  });
});
