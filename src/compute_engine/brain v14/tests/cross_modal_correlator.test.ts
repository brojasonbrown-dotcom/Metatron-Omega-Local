/**
 * Tests — Cross-Modal CAUSAL Correlator (M1 lagged precedence, M2 prediction-
 * error gate, M3 confidence decay + counter-evidence).
 *
 * The rigor lives here. The guarantees under test:
 *   1. ZERO REGRESSION — gates off ⇒ behaviour is the plain co-occurrence path
 *      (lagged=false): every distinct-source pair updates, no precedence rejection.
 *   2. M1 ANTECEDENT — in lagged mode a pair where BOTH modalities are static is
 *      REJECTED (no causal antecedent): the dog-still + car-vroom case.
 *   3. M1 PRECEDENCE — a pair where one modality CHANGED is counted.
 *   4. M2 PREDICTION-ERROR — an unsurprising repeat moves the mean FAR less than a
 *      surprise, but still increments the count (honesty: the sample is real).
 *   5. M3 COUNTER-EVIDENCE — a definitive counter-observation SUBTRACTS evidence
 *      without touching the mean.
 *   6. M3 DECAY — an unconfirmed pair's confidence decays toward zero over ticks.
 *   7. DETERMINISM + NO-EQUIVALENCE — the honesty law still holds.
 */

import { describe, expect, it } from "vitest";
import { CrossModalCorrelator, type CorrelatorFrame } from "../cognition/cross_modal_correlator.ts";
import { encodeText } from "../adapters/language_codec.ts";

function frame(source: string, text: string, tick?: number): CorrelatorFrame {
  const f: CorrelatorFrame = { source, field: encodeText(text) };
  return tick === undefined ? f : { ...f, tick };
}

describe("CrossModalCorrelator — causal hardening", () => {
  it("ZERO REGRESSION: lagged=false counts every distinct-source pair (plain path)", () => {
    const c = new CrossModalCorrelator(true, false);
    // Both modalities STATIC (same text repeated) — in lagged mode this would be
    // rejected, but the plain path must still count it (byte-identical behaviour).
    c.observe([frame("vision.screen", "dog"), frame("audio.mic", "dog")]);
    c.observe([frame("vision.screen", "dog"), frame("audio.mic", "dog")]);
    expect(c.stats().observations).toBe(2);
    expect(c.stats().precedenceRejected).toBe(0);
    expect(c.correlations()[0]!.count).toBe(2);
  });

  it("M1 ANTECEDENT: dog-STILL + car-vroom keeps dog↔audio mean LOW (adversarial)", () => {
    const c = new CrossModalCorrelator(true, true); // lagged ON
    // Tick 1: establish a STABLE visual field (the dog) so tick 2 shows NO change.
    c.observe([frame("vision.screen", "a dog sitting still", 1)]);
    // Tick 2: dog UNCHANGED (identical field) + a car sound arrives. The dog side
    // contributes no antecedent; any recorded link rests on audio's own change.
    c.observe([frame("vision.screen", "a dog sitting still", 2), frame("audio.mic", "car vroom", 2)]);
    const dogAudio = c.correlations().find((x) => x.pair.includes("vision.screen") && x.pair.includes("audio.mic"));
    if (dogAudio) {
      expect(dogAudio.meanResonance).toBeLessThan(0.5); // unrelated fields
    }
  });

  it("M1 PRECEDENCE: a changed modality followed by another observation IS linked", () => {
    const c = new CrossModalCorrelator(true, true);
    c.observe([frame("vision.screen", "still room", 1), frame("audio.mic", "silence", 1)]);
    const before = c.stats().observations;
    // The dog's visual field CHANGES (mouth opens) THEN a bark: a real antecedent.
    c.observe([frame("vision.screen", "dog mouth opens wide", 2), frame("audio.mic", "loud bark", 2)]);
    expect(c.stats().observations).toBeGreaterThan(before);
    const link = c.correlations().find((x) => x.pair.includes("vision.screen") && x.pair.includes("audio.mic"));
    expect(link).toBeDefined();
  });

  it("M1: both-static pair is REJECTED outright (precedenceRejected increments)", () => {
    const c = new CrossModalCorrelator(true, true);
    c.observe([frame("vision.screen", "static A", 1), frame("audio.mic", "static B", 1)]);
    const obsAfterFirst = c.stats().observations;
    // Identical fields again — no change anywhere → no antecedent → reject.
    c.observe([frame("vision.screen", "static A", 2), frame("audio.mic", "static B", 2)]);
    expect(c.stats().observations).toBe(obsAfterFirst);
    expect(c.stats().precedenceRejected).toBeGreaterThan(0);
  });

  it("M2 PREDICTION-ERROR: surprise moves the mean far more than an unsurprising repeat", () => {
    const c = new CrossModalCorrelator(true, false);
    for (let i = 0; i < 6; i++) c.observe([frame("a.x", "golden spiral"), frame("b.y", "golden spiral")]);
    const stableMean = c.correlations()[0]!.meanResonance;
    c.observe([frame("a.x", "golden spiral"), frame("b.y", "golden spiral")]);
    const afterRepeat = c.correlations()[0]!.meanResonance;
    expect(Math.abs(afterRepeat - stableMean)).toBeLessThan(0.02);
    expect(c.stats().suppressed).toBeGreaterThan(0);
    expect(c.correlations()[0]!.count).toBe(7); // sample still counted (honesty)
  });

  it("M3 COUNTER-EVIDENCE: a counter-observation SUBTRACTS evidence, mean untouched", () => {
    const c = new CrossModalCorrelator(true, false);
    for (let i = 0; i < 4; i++) c.observe([frame("vision", "dog"), frame("audio", "bark")]);
    const beforeMean = c.correlations()[0]!.meanResonance;
    const beforeEvidence = c.correlations()[0]!.evidence;
    c.counterEvidence("vision", "audio"); // dog present, definitively silent
    const after = c.correlations()[0]!;
    expect(after.evidence).toBeLessThan(beforeEvidence);
    expect(after.meanResonance).toBeCloseTo(beforeMean, 12); // mean NOT touched
  });

  it("M3 DECAY: an unconfirmed pair's confidence decays toward zero", () => {
    const c = new CrossModalCorrelator(true, false);
    for (let i = 0; i < 4; i++) c.observe([frame("vision", "dog", i), frame("audio", "bark", i)]);
    const confident = c.correlations()[0]!.evidence;
    for (let t = 10; t < 60; t++) c.tickClock(t); // well past DECAY_AFTER
    const faded = c.correlations()[0]!.evidence;
    expect(faded).toBeLessThan(confident);
  });

  it("HONESTY: no equivalence/same/cause field exists on the record", () => {
    const c = new CrossModalCorrelator(true, true);
    c.observe([frame("vision", "x", 1), frame("audio", "x", 2)]);
    const rec = c.correlations()[0]!;
    expect(rec).toHaveProperty("meanResonance");
    expect(rec).toHaveProperty("count");
    expect(rec).toHaveProperty("evidence");
    expect(rec).not.toHaveProperty("same");
    expect(rec).not.toHaveProperty("equivalent");
    expect(rec).not.toHaveProperty("causes");
    expect(rec).not.toHaveProperty("causedBy");
  });

  it("DETERMINISM: identical gated sequences yield identical records", () => {
    const seq = [
      [frame("vision", "alpha", 1), frame("audio", "beta", 1)],
      [frame("vision", "gamma moved", 2), frame("audio", "delta", 2)],
      [frame("vision", "gamma moved", 3), frame("audio", "delta", 3)],
    ];
    const run = () => {
      const cc = new CrossModalCorrelator(true, true);
      for (const tick of seq) cc.observe(tick);
      return cc.correlations().map((x) => [x.pair, x.meanResonance, x.count, x.evidence]);
    };
    expect(run()).toEqual(run());
  });
});
