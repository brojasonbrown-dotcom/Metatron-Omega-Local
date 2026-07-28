/**
 * Tests — Drive Arbiter + Thought Tracker
 *
 * Plan requirements:
 *  - synthetic scalar inputs → expected gate decisions incl. forced-bootstrap window
 *  - existence replay: stable thought fires at expected ticks (3 consecutive
 *    `exists` ticks), re-arms only when the field actually moves
 *  - determinism: same inputs → identical drive state (no RNG anywhere)
 */

import { describe, expect, it } from "vitest";
import { encodeText, resonance } from "../adapters/language_codec.ts";
import {
    BOOTSTRAP_THOUGHTS,
    DriveArbiter,
} from "../cognition/drive_arbiter.ts";
import { PERSISTENCE_TICKS, ThoughtTracker } from "../cognition/thought.ts";
import { COHERENCE_THRESHOLD } from "../core/constants.ts";
import { ExistenceDetector, type ExistenceScore } from "../existence_detector.ts";

/** Synthetic ExistenceScore factory for replay tests. */
function score(exists: boolean, persistence = 0.9): ExistenceScore {
  const s = {
    signalScore: 1.5,
    persistenceScore: persistence,
    coherenceScore: 0.8,
    relationScore: 0.7,
    exists,
  };
  return {
    ...s,
    overallScore:
      (s.signalScore + s.persistenceScore + s.coherenceScore + s.relationScore) / 4,
  };
}

describe("DriveArbiter constants", () => {
  it("forced-use bootstrap window is F_12 = 144 stable thoughts", () => {
    expect(BOOTSTRAP_THOUGHTS).toBe(144);
  });
});

describe("DriveArbiter.tick", () => {
  it("returns drive scalars in [0, 1] and is deterministic across fresh arbiters", () => {
    const field = encodeText("perception of a new pattern");
    const prev = encodeText("the previous root state");
    const s = score(true, 0.6);

    const a = new DriveArbiter().tick(field, prev, s);
    const b = new DriveArbiter().tick(field, prev, s);

    for (const d of [a, b]) {
      expect(d.curiosity).toBeGreaterThanOrEqual(0);
      expect(d.curiosity).toBeLessThanOrEqual(1);
      expect(d.urgency).toBeGreaterThanOrEqual(0);
      expect(d.urgency).toBeLessThanOrEqual(1);
      expect(d.throttle).toBeGreaterThanOrEqual(0);
      expect(d.throttle).toBeLessThanOrEqual(1);
    }
    expect(a).toEqual(b); // no RNG — same inputs, same drives
  });
});

describe("DriveArbiter.chooseAction — forced bootstrap window", () => {
  it("always acts inside the bootstrap window (never 'none')", () => {
    const arbiter = new DriveArbiter();
    for (const count of [1, 50, BOOTSTRAP_THOUGHTS]) {
      const action = arbiter.chooseAction(
        { known: true, topResonance: 0.9, reinforcement: 100, labelCount: 3 },
        count,
        1000
      );
      expect(action).not.toBe("none");
    }
  });

  it("unknown percept → 'name' (identity precedes depth)", () => {
    const arbiter = new DriveArbiter();
    const action = arbiter.chooseAction(
      { known: false, topResonance: 0.1, reinforcement: 0, labelCount: 0 },
      1,
      0
    );
    expect(action).toBe("name");
  });

  it("known-but-shallow with 1 label → 'define'; with ≥2 labels → 'relate'", () => {
    const arbiter = new DriveArbiter();
    expect(
      arbiter.chooseAction(
        { known: true, topResonance: 0.9, reinforcement: 1, labelCount: 1 },
        10,
        5
      )
    ).toBe("define");
    expect(
      arbiter.chooseAction(
        { known: true, topResonance: 0.9, reinforcement: 1, labelCount: 2 },
        10,
        5
      )
    ).toBe("relate");
  });
});

describe("DriveArbiter.chooseAction — after bootstrap", () => {
  it("deep known concept with no structure pressure → 'none' (earned selectivity)", () => {
    const arbiter = new DriveArbiter(); // initial curiosity=1 passes the gate
    const action = arbiter.chooseAction(
      { known: true, topResonance: 0.95, reinforcement: 100, labelCount: 5 },
      BOOTSTRAP_THOUGHTS + 1,
      1000
    );
    expect(action).toBe("none");
  });

  it("unknown percept still → 'name' even after bootstrap", () => {
    const arbiter = new DriveArbiter();
    const action = arbiter.chooseAction(
      { known: false, topResonance: 0.1, reinforcement: 0, labelCount: 0 },
      BOOTSTRAP_THOUGHTS + 500,
      1000
    );
    expect(action).toBe("name");
  });
});

describe("ThoughtTracker — existence replay", () => {
  it(`fires a stable thought exactly on the ${PERSISTENCE_TICKS}rd consecutive exists tick`, () => {
    const tracker = new ThoughtTracker();
    const field = encodeText("a persistent structure");

    expect(tracker.observe(field, score(true), 1)).toBeNull();
    expect(tracker.observe(field, score(true), 2)).toBeNull();
    const thought = tracker.observe(field, score(true), 3);
    expect(thought).not.toBeNull();
    expect(thought!.bornTick).toBe(3);
    expect(thought!.phase).toBe("stable");
    expect(tracker.thoughtCount).toBe(1);
  });

  it("a broken exists streak resets the persistence counter", () => {
    const tracker = new ThoughtTracker();
    const field = encodeText("a flickering structure");

    expect(tracker.observe(field, score(true), 1)).toBeNull();
    expect(tracker.observe(field, score(true), 2)).toBeNull();
    expect(tracker.observe(field, score(false), 3)).toBeNull(); // streak broken
    expect(tracker.observe(field, score(true), 4)).toBeNull();
    expect(tracker.observe(field, score(true), 5)).toBeNull();
    expect(tracker.observe(field, score(true), 6)).not.toBeNull(); // 3 in a row again
  });

  it("does NOT re-fire while the field stays on the same thought", () => {
    const tracker = new ThoughtTracker();
    const field = encodeText("one steady idea");
    tracker.observe(field, score(true), 1);
    tracker.observe(field, score(true), 2);
    expect(tracker.observe(field, score(true), 3)).not.toBeNull();
    // same field, still existing — thinking the same thought is not a new thought
    for (let t = 4; t <= 10; t++) {
      expect(tracker.observe(field, score(true), t)).toBeNull();
    }
    expect(tracker.thoughtCount).toBe(1);
  });

  it("re-fires when the root field moves away (resonance < λ)", () => {
    const tracker = new ThoughtTracker();
    const first = encodeText("thinking about water");
    const second = encodeText("zqx jvk wmp"); // structurally distant text
    // Only meaningful if the two fields are actually below the threshold:
    expect(resonance(first, second)).toBeLessThan(COHERENCE_THRESHOLD);

    tracker.observe(first, score(true), 1);
    tracker.observe(first, score(true), 2);
    expect(tracker.observe(first, score(true), 3)).not.toBeNull();
    const moved = tracker.observe(second, score(true), 4);
    expect(moved).not.toBeNull();
    expect(tracker.thoughtCount).toBe(2);
  });

  it("snapshots the field (thought is decoupled from the live root)", () => {
    const tracker = new ThoughtTracker();
    const field = encodeText("mutable world");
    tracker.observe(field, score(true), 1);
    tracker.observe(field, score(true), 2);
    const thought = tracker.observe(field, score(true), 3)!;
    const before = Array.from(thought.field);
    field[0] = 999; // mutate the live field
    expect(Array.from(thought.field)).toEqual(before);
  });

  it("attaches pending sensory sources as provenance, then clears them", () => {
    const tracker = new ThoughtTracker();
    const field = encodeText("what the eye saw");
    tracker.noteSource("vision.screen");
    tracker.noteSource("text.feed");
    tracker.noteSource("vision.screen"); // deduplicated
    tracker.observe(field, score(true), 1);
    tracker.observe(field, score(true), 2);
    const thought = tracker.observe(field, score(true), 3)!;
    expect(thought.sources).toEqual(["vision.screen", "text.feed"]);
  });
});

describe("ExistenceDetector on codec fields (real evaluate, deterministic)", () => {
  it("evaluate is deterministic and well-formed on encoded fields", () => {
    const field = encodeText("existence itself");
    const prev = encodeText("what came before");
    const a = ExistenceDetector.evaluate(field, prev, field);
    const b = ExistenceDetector.evaluate(field, prev, field);
    expect(a).toEqual(b);
    for (const v of [a.signalScore, a.persistenceScore, a.coherenceScore, a.relationScore, a.overallScore]) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(typeof a.exists).toBe("boolean");
  });

  it("an unchanged field scores perfect persistence", () => {
    const field = encodeText("the same thought twice");
    const s = ExistenceDetector.evaluate(field, field, field);
    expect(s.persistenceScore).toBeCloseTo(1.0, 9);
    expect(s.relationScore).toBeCloseTo(1.0, 9);
  });
});
