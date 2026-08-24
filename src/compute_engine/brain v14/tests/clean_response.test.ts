/**
 * Tests — P8: clean responses (no metric dumps).
 * (adapters/clean_response.ts; MASTER_PLAN_V3 §P8 + Gate P8.)
 *
 * Gate P8: default answers ≤ spine + one sentence; details on request. Every test
 * asserts the presentation law, never a change to what was measured:
 *   · verified commentary leads (ONE short human sentence); the facts-spine is
 *     deferred to `details` — a metric dump never sits above the sentence.
 *   · numbers appear only when they ARE the answer (no commentary but real facts).
 *   · neither commentary nor facts → an honest human refusal, never an empty
 *     bubble and never a fabricated line.
 *   · depth is preserved, not discarded: everything deferred is in `details`.
 */

import { describe, expect, it } from "vitest";
import { cleanResponse } from "../adapters/clean_response.ts";

const FACTS = "engine: 281 nodes · tick 146 ms · coherence 0.94";
const SENTENCE = "The system is stable and holding its learned structure.";

describe("P8 — the human sentence leads", () => {
  it("verified commentary is the surface; facts go to details", () => {
    const r = cleanResponse({
      facts: FACTS,
      commentary: SENTENCE,
      grounded: ["stability"],
      certificate: 0.42,
      verification: "valid",
    });
    expect(r.text).toBe(SENTENCE);
    expect(r.text).not.toContain("engine:"); // no metric dump on the surface
    expect(r.details).toContain(FACTS); // depth preserved, one tap away
    expect(r.details).toContain("resonance 0.420");
    expect(r.details).toContain("grounded: stability");
  });

  it("the surface is bounded to one short sentence even from a run-on reply", () => {
    const long = "First sentence here. " + "More words follow. ".repeat(40);
    const r = cleanResponse({ facts: FACTS, commentary: long, grounded: [] });
    expect(r.text.startsWith("First sentence here.")).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(201); // MAX_SURFACE_CHARS + ellipsis
    expect(r.details).toContain(FACTS);
  });

  it("a commentary with no facts yields null details (nothing measured to expand)", () => {
    const r = cleanResponse({ facts: "", commentary: SENTENCE, grounded: [] });
    expect(r.text).toBe(SENTENCE);
    // details may still carry provenance; with no facts/cert/grounded it is null.
    expect(r.details).toBeNull();
  });
});

describe("P8 — numbers only when they ARE the answer", () => {
  it("no commentary but real facts → the measured facts lead (they are the answer)", () => {
    const r = cleanResponse({
      facts: FACTS,
      commentary: null,
      fallbackNote: "my phrasing didn't stabilize",
      grounded: [],
    });
    expect(r.text).toContain(FACTS); // the numbers lead because they ARE the reply
    expect(r.text).toContain("didn't stabilize");
    expect(r.details).toBeNull(); // facts already shown; nothing deferred
  });
});

describe("P8 — honest refusal", () => {
  it("nothing measured and nothing phrased → an explicit human refusal", () => {
    const r = cleanResponse({ facts: "", commentary: null, grounded: [] });
    expect(r.text.toLowerCase()).toContain("verified answer");
    expect(r.details).toBeNull();
  });

  it("the refusal carries the honest 'why' when one is given", () => {
    const r = cleanResponse({
      facts: "",
      commentary: null,
      fallbackNote: "numeric verification failed",
      grounded: [],
    });
    expect(r.text).toContain("numeric verification failed");
    expect(r.details).toBeNull();
  });

  it("the refusal is never an empty string", () => {
    const r = cleanResponse({ facts: "   ", commentary: "   ", grounded: [] });
    expect(r.text.trim().length).toBeGreaterThan(0);
  });
});

describe("P8 — depth is preserved, not discarded", () => {
  it("every deferred fact is reachable in details (nothing dropped)", () => {
    const r = cleanResponse({
      facts: FACTS,
      commentary: SENTENCE,
      grounded: ["a", "b"],
      certificate: 0.5,
    });
    // The surface is clean; the ENTIRE measured block survives in details.
    expect(r.details).toContain("281 nodes");
    expect(r.details).toContain("coherence 0.94");
    expect(r.details).toContain("a, b");
  });

  it("grounded concepts always surface as chips regardless of case", () => {
    const withC = cleanResponse({ facts: FACTS, commentary: SENTENCE, grounded: ["x"] });
    const noC = cleanResponse({ facts: "", commentary: null, grounded: ["x"] });
    expect(withC.grounded).toEqual(["x"]);
    expect(noC.grounded).toEqual(["x"]);
  });
});
