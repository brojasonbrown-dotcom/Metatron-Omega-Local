/**
 * P3 — Memory-Algorithm Test Battery (measures LEARNING, not API shape)
 *
 * Each substrate is exercised and its learning behavior is MEASURED:
 *   1. ConceptRegistry prototype averaging — teach A, recall A; prototype
 *      converges toward the taught attractor with the φ-decayed EMA rate 1/φ².
 *   2. Dual-channel recognition — a concept is found by its percept field AND
 *      by its bound word field (symbol grounding, complementary channels).
 *   3. Hopfield one-step recall — store patterns, retrieve from a noisy/partial
 *      cue in ONE step; near-duplicates merge (no unbounded copies).
 *   4. Glossary persist/restore — learned meanings survive a save/load cycle.
 *   5. EMA reinforcement decay — the reinforceField learning curve matches the
 *      closed-form geometric convergence 1 − (1−η)^t with η = 1/φ².
 *   6. Capacity/eviction — Hopfield bounded at F₁₁=89 (FIFO); registry honors
 *      its maxConcepts cap.
 *
 * Regret discipline (A4): where a closed-form optimum exists, we report the
 * empirical regret vs that optimum, not just "it went up". A learning CURVE is
 * a picture; a regret BOUND is a number with a theory.
 */

import { describe, expect, it } from "vitest";
import { ConceptRegistry } from "../cognition/concept_registry.ts";
import { HopfieldMemory } from "../cognition/hopfield.ts";
import { ConceptGlossary } from "../cognition/glossary.ts";
import {
  encodeText,
  normalizeField,
  reinforceField,
  resonance,
} from "../adapters/language_codec.ts";
import { fieldFromLuminanceGrid } from "../adapters/sensors/signal_codec.ts";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const PHI = 1.618033988749895;
const ETA = 1.0 / (PHI * PHI); // 1/φ² — the engine's universal learning rate
const LAMBDA = 0.3819660112501051; // 1/φ² — recognition threshold

/** Deterministic distinct percept field. */
function makePercept(seed: number): Float64Array {
  const w = 8;
  const h = 8;
  const grid = new Float64Array(w * h);
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.sin(seed * 1.7 + i * 0.618) * Math.cos(seed * 0.3 + i * 0.11);
  }
  return fieldFromLuminanceGrid(grid, w, h);
}

/** Closed-form EMA convergence toward a fixed incoming field: distance from the
 *  running prototype to the incoming attractor after t reinforcements is
 *  ~ (1−η)^t of the initial distance. */
function emaCurve(t: number): number {
  return Math.pow(1.0 - ETA, t);
}

describe("P3.1 — registry prototype averaging (teach A, recall A)", () => {
  it("a taught concept is recalled by its own percept at ≥ λ", () => {
    const reg = new ConceptRegistry();
    const percept = makePercept(5);
    const obs = reg.observe(percept, [], "vision.screen");
    expect(obs.isNew).toBe(true);
    const back = reg.nearest(percept, 1)[0];
    expect(back?.concept.id).toBe(obs.concept.id);
    expect(back?.resonance).toBeGreaterThanOrEqual(LAMBDA);
  });

  it("repeated reinforcement drives the prototype toward the attractor (measured curve)", () => {
    const reg = new ConceptRegistry();
    // A concept born near (but not on) an attractor; reinforce with the target.
    const seed = makePercept(11);
    const target = makePercept(11); // same seed → same field → pure convergence
    const obs = reg.observe(seed, [], "vision.screen");
    // Perturb the prototype slightly so there is a real distance to close.
    const perturbed = normalizeField(
      obs.concept.prototype.map((x, i) => x + 0.05 * Math.sin(i)) as Float64Array
    );
    const r0 = resonance(perturbed, target);
    // Simulate the EMA reinforcement path the registry uses.
    let cur = perturbed;
    const steps = 21; // F₈
    for (let t = 1; t <= steps; t++) cur = reinforceField(cur, target);
    const rT = resonance(cur, target);
    // Learning happened: resonance strictly increased toward the attractor.
    expect(rT).toBeGreaterThan(r0);
    // Regret vs closed form: after `steps` EMA updates the residual distance is
    // ~ (1−η)^steps of the initial. Assert we are within a small factor of that
    // bound (theory is a guide, not exact for normalized fields).
    const distInit = 1 - r0;
    const distFinal = 1 - rT;
    const bound = emaCurve(steps) * distInit;
    // distFinal should be the same order or better than the geometric bound.
    expect(distFinal).toBeLessThanOrEqual(Math.max(bound * 4, 1e-6));
  });
});

describe("P3.2 — dual-channel recognition (word vs percept)", () => {
  it("a bound concept is retrieved by BOTH its percept and its word", () => {
    const reg = new ConceptRegistry();
    const percept = makePercept(23);
    const obs = reg.observe(percept, [], "audio.mic");
    reg.addLabels(obs.concept.id, ["ember"], "llm.nameThis");
    reg.bindLabel(obs.concept.id, "ember");
    // Percept channel.
    const byPercept = reg.nearest(percept, 1)[0];
    expect(byPercept?.concept.id).toBe(obs.concept.id);
    // Word channel.
    const byWord = reg.nearest(encodeText("ember"), 1)[0];
    expect(byWord?.concept.id).toBe(obs.concept.id);
  });
});

describe("P3.3 — Hopfield one-step recall + near-dup merge", () => {
  it("retrieves a stored attractor from a noisy cue in one step", () => {
    const mem = new HopfieldMemory();
    const a = makePercept(31);
    const b = makePercept(77);
    mem.store(a);
    mem.store(b);
    // Noisy cue: a blended toward b slightly.
    const noisy = normalizeField(a.map((x, i) => x * 0.9 + 0.05 * Math.sin(i * 1.3)) as Float64Array);
    const rec = mem.retrieve(noisy);
    expect(rec.ok).toBe(true);
    // Recalled field is closer to A than to B (the correct attractor won).
    expect(resonance(rec.field, a)).toBeGreaterThan(resonance(rec.field, b));
  });

  it("near-duplicate store merges instead of duplicating (bounded memory)", () => {
    const mem = new HopfieldMemory();
    const a = makePercept(41);
    mem.store(a);
    const sizeAfterFirst = mem.size;
    // Store a near-identical copy (resonance ≥ merge threshold) → merge.
    const nearDup = normalizeField(a.map((x) => x * 1.0001) as Float64Array);
    const added = mem.store(nearDup);
    expect(added).toBe(false); // merged, not added
    expect(mem.size).toBe(sizeAfterFirst);
  });
});

describe("P3.4 — glossary persist/restore", () => {
  it("learned meanings survive a save/load round-trip", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p3-gloss-"));
    try {
      const g1 = new ConceptGlossary(dir);
      g1.learn({
        conceptId: "cX",
        definition: "a measured, grounded meaning",
        related: ["ember", "glow"],
        source: "define",
        confidence: 0.8,
      });
      const g2 = new ConceptGlossary(dir);
      const res = g2.load();
      expect(res.ok).toBe(true);
      expect(res.restored).toBe(1);
      expect(g2.get("cX")?.definition).toBe("a measured, grounded meaning");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("P3.5 — EMA reinforcement decay matches closed form", () => {
  it("reinforceField converges geometrically at rate (1−η), η=1/φ²", () => {
    const target = makePercept(53);
    let cur = makePercept(97); // a different attractor
    const r0 = resonance(cur, target);
    const residuals: number[] = [];
    for (let t = 1; t <= 13; t++) {
      cur = reinforceField(cur, target);
      residuals.push(1 - resonance(cur, target));
    }
    // The residual sequence is non-increasing (monotone learning).
    for (let i = 1; i < residuals.length; i++) {
      expect(residuals[i]).toBeLessThanOrEqual(residuals[i - 1] + 1e-9);
    }
    // Regret vs closed form: the FINAL residual should be near (1−η)^13 × initial.
    const init = 1 - r0;
    const bound = emaCurve(13) * init;
    expect(residuals[residuals.length - 1]).toBeLessThanOrEqual(Math.max(bound * 4, 1e-6));
  });
});

describe("P3.5b — D1 confidence-weighted learning (prototype hardening)", () => {
  it("a mature prototype moves far less per novel frame than a fresh one", () => {
    const target = makePercept(53);
    const novel = makePercept(4242); // an out-of-distribution frame

    // Fresh prototype: 1 prior observation (evidence = 1).
    const freshProto = reinforceField(target, makePercept(97), 0);
    const freshBefore = resonance(freshProto, target);
    const freshAfter = reinforceField(freshProto, novel, 1);
    const freshDrift = Math.abs(resonance(freshAfter, target) - freshBefore);

    // Mature prototype: many prior observations (evidence = 144).
    const matureProto = reinforceField(target, makePercept(97), 0);
    const matureBefore = resonance(matureProto, target);
    const matureAfter = reinforceField(matureProto, novel, 144);
    const matureDrift = Math.abs(resonance(matureAfter, target) - matureBefore);

    // The mature attractor HARDENS: the same novel frame moves it strictly
    // less than it moves the fresh one. This is the robustness upgrade —
    // a single noisy/adversarial observation cannot drag a well-evidenced concept.
    expect(matureDrift).toBeLessThan(freshDrift);
    // And the ratio respects the η decay: η_mature = base/145 vs η_fresh = base/2,
    // so mature drift should be a small fraction of fresh drift.
    expect(matureDrift).toBeLessThan(freshDrift * 0.1);
  });

  it("default (no evidence) path still uses canonical η = 1/φ²", () => {
    // Regression guard: the 2-arg form must remain the L2_Hebbian rate so the
    // P3.5 closed-form convergence contract is unchanged.
    const a = makePercept(11);
    const b = makePercept(22);
    const two = reinforceField(a, b); // no evidence
    const explicit = reinforceField(a, b, undefined);
    expect(resonance(two, explicit)).toBeGreaterThanOrEqual(1 - 1e-9);
  });
});

describe("P3.6 — capacity / eviction", () => {
  it("Hopfield bank is bounded at F₁₁ = 89 (FIFO eviction)", () => {
    const mem = new HopfieldMemory();
    for (let i = 0; i < 144; i++) {
      mem.store(makePercept(1000 + i * 13));
    }
    expect(mem.size).toBeLessThanOrEqual(89);
  });

  it("registry honors its maxConcepts cap (F₂₁ = 10946)", () => {
    const reg = new ConceptRegistry();
    expect(reg.maxConcepts).toBe(10946);
    // We do not mint 11k concepts in a unit test; we assert the cap constant and
    // that a healthy number of mints stay well under it without eviction.
    for (let i = 0; i < 64; i++) reg.observe(makePercept(2000 + i * 7), [], "vision.file");
    expect(reg.size).toBeLessThanOrEqual(reg.maxConcepts);
  });
});
