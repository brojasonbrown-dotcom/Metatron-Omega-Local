/**
 * Tests — P1 De-biased Naming (the hallucination kill)
 *
 * The dog/cat poison (journal t=1785240418285): `nameThis` was handed ONLY
 * abstract scores (signal/coherence/persistence/relation) and a 3B model,
 * asked to name a perception from bare numbers, invented concrete objects.
 *
 * P1 makes that structurally impossible. These tests prove:
 *   1. A thought born of INTERNAL DYNAMICS ONLY (no perceptual source) never
 *      triggers an LLM nameThis call — it is honestly suppressed and journaled.
 *   2. A thought WITH real perceptual grounding IS named, but the description
 *      carries measured field structure (φ-band energies + real sources), NOT a
 *      score-dump that invites object invention, and it carries a provenance hash.
 *   3. The "llm.answer" echo is NOT perceptual grounding (the mind's own prior
 *      output fed back must not authorize naming).
 */

import { describe, expect, it } from "vitest";
import { CognitiveLoop } from "../cognition/cognitive_loop.ts";
import type { Thought } from "../cognition/thought.ts";
import type { ExistenceScore } from "../existence_detector.ts";
import { fieldFromLuminanceGrid } from "../adapters/sensors/signal_codec.ts";

/** A deterministic field with known dominant modes. */
function makeField(seed: number): Float64Array {
  const w = 8;
  const h = 8;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.sin(seed * 1.7 + i * 0.618) * Math.cos(seed * 0.3 + i * 0.11);
  }
  return fieldFromLuminanceGrid(grid, w, h);
}

function makeScore(): ExistenceScore {
  return {
    signalScore: 0.9,
    persistenceScore: 1.0,
    coherenceScore: 0.92,
    relationScore: 0.28,
    exists: true,
  } as ExistenceScore;
}

function makeThought(sources: string[]): Thought {
  return {
    id: "t-test",
    bornAt: Date.now(),
    bornTick: 1,
    field: makeField(7),
    score: makeScore(),
    sources: sources as Thought["sources"],
    phase: "stable",
    labels: [],
    spokenText: null,
  };
}

/** Minimal stubs for the CognitiveLoop deps _actName actually touches. */
function makeDeps() {
  const journal: Array<{ kind: string; data: Record<string, unknown> }> = [];
  const nameThisCalls: string[] = [];
  const deps = {
    store: {
      journal: (e: { kind: string; data: Record<string, unknown> }) => journal.push(e),
    },
    registry: {
      addLabels: () => {},
      bindLabel: () => true,
    },
    llm: {
      nameThis: async (description: string) => {
        nameThisCalls.push(description);
        return { ok: true as const, value: { labels: ["alpha", "beta"], confidence: 0.9 }, elapsedMs: 5 };
      },
    },
  };
  return { deps, journal, nameThisCalls };
}

// Reach the private method without standing up the whole loop. The loop's
// constructor only stores deps; _actName uses store/registry/llm + its own
// private helpers, so a cast instance is a faithful seam for the gate.
function loopFor(deps: unknown): CognitiveLoop {
  return new CognitiveLoop(deps as never);
}

describe("P1 — de-biased naming gate", () => {
  it("internal-dynamics thought (no sources) → nameThis NEVER called, suppressed+journaled", async () => {
    const { deps, journal, nameThisCalls } = makeDeps();
    const loop = loopFor(deps);
    const thought = makeThought([]); // pure internal dynamics
    await (loop as unknown as { _actName(t: Thought, o: unknown): Promise<void> })._actName(thought, {
      concept: { id: "c1" },
    });

    expect(nameThisCalls.length).toBe(0); // THE POISON IS DEAD: no LLM call
    const suppressed = journal.find((j) => j.kind === "name.suppressed");
    expect(suppressed).toBeDefined();
    expect(String(suppressed!.data["reason"])).toContain("no perceptual content");
    // No label was minted.
    expect(thought.labels.length).toBe(0);
  });

  it("llm.answer echo is NOT perceptual grounding → still suppressed", async () => {
    const { deps, journal, nameThisCalls } = makeDeps();
    const loop = loopFor(deps);
    // The mind's own prior output fed back — must NOT authorize naming.
    const thought = makeThought(["llm.answer"]);
    await (loop as unknown as { _actName(t: Thought, o: unknown): Promise<void> })._actName(thought, {
      concept: { id: "c1" },
    });

    expect(nameThisCalls.length).toBe(0);
    expect(journal.some((j) => j.kind === "name.suppressed")).toBe(true);
  });

  it("perceptual thought (text.feed) → named, with measured-structure description + provenance", async () => {
    const { deps, journal, nameThisCalls } = makeDeps();
    const loop = loopFor(deps);
    const thought = makeThought(["text.feed"]);
    await (loop as unknown as { _actName(t: Thought, o: unknown): Promise<void> })._actName(thought, {
      concept: { id: "c1" },
    });

    // Named exactly once.
    expect(nameThisCalls.length).toBe(1);
    const description = nameThisCalls[0];
    // Description carries MEASURED structure, not a score-dump.
    expect(description).toContain("measured field structure");
    expect(description).toContain("φ-bands");
    expect(description).toContain("text.feed");
    // The old poison format (abstract scores) is gone.
    expect(description).not.toContain("signal 0.");
    expect(description).not.toContain("coherence 0.");
    expect(description).not.toContain("persistence");

    // tool.ok carries a provenance hash + grounded flag.
    const ok = journal.find((j) => j.kind === "tool.ok");
    expect(ok).toBeDefined();
    expect(typeof ok!.data["provenance"]).toBe("string");
    expect((ok!.data["provenance"] as string).length).toBe(16);
    expect(ok!.data["grounded"]).toBe(true);
    // Labels were minted from the (real-content) naming.
    expect(thought.labels).toEqual(["alpha", "beta"]);
  });

  it("vision + audio sources also count as perceptual grounding", async () => {
    const { deps, nameThisCalls } = makeDeps();
    const loop = loopFor(deps);
    const thought = makeThought(["vision.screen", "audio.mic"]);
    await (loop as unknown as { _actName(t: Thought, o: unknown): Promise<void> })._actName(thought, {
      concept: { id: "c1" },
    });
    expect(nameThisCalls.length).toBe(1);
    expect(nameThisCalls[0]).toContain("vision.screen");
  });
});
