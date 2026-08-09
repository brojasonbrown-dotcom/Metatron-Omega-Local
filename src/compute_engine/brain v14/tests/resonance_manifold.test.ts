/**
 * Unit — P6-B Resonance Manifold: the correlation / ontology layer.
 *
 * Directly answers the operator's question "can similarities and meanings be
 * correlated, in layers (cat → feline → animal, sharing 4-legs across species)?"
 *
 * GEOMETRY GROUND TRUTH (measured, not assumed): independent 28-fields
 * concentrate near 1/√14 (measure concentration — the property the whole design
 * relies on), so two RANDOM prototypes essentially never resonate ≥ 0.618. Real
 * learned concepts DO resonate because they form by reinforcing a family of
 * similar percepts — so the resonant prototypes here are BLENDS of a shared base
 * field (siblings under one family), exactly how the registry builds them. The
 * kernel is the live language_codec resonance(). [MATH]
 *
 * Proven:
 *   1. IS-A IS DIRECTED — cat{cat,feline,animal} is-a animal{animal}, never the
 *      reverse. Symmetric resonance cannot do this; label-inclusion can.
 *   2. SHARES-FEATURE — cat & dog both grounding "four-legged" share a symmetric
 *      edge witnessed by that label (the 4-legs cohort across species).
 *   3. NO FABRICATION — independent fields (weak resonance) yield NO edge, even
 *      with a shared label (geometry must agree).
 *   4. DEMOTION — an edge whose re-measured resonance collapses is removed.
 *   5. SWEETSPOTS — hub concepts (most connected, strongest coherence) surface.
 */
import { describe, expect, it } from "vitest";
import { ResonanceManifold } from "../cognition/resonance_manifold.ts";
import type { Concept } from "../cognition/concept_registry.ts";
import { blendFields, normalizeField, resonance } from "../adapters/language_codec.ts";

/** A distinct base 28-field, deterministic by seed (no RNG). */
function base(seed: number): Float64Array {
  const f = new Float64Array(28);
  let s = seed >>> 0;
  for (let i = 0; i < f.length; i++) {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    f[i] = (s / 4294967296) * 2 - 1;
  }
  return normalizeField(f);
}
/** A SIBLING field: base blended toward an independent perturbation (a learned
 *  family member — resonates with the base but is not identical to it). [MATH] */
function sibling(baseF: Float64Array, seed: number, w: number): Float64Array {
  return blendFields(baseF, base(seed), w);
}

let _id = 0;
function concept(field: Float64Array, labels: string[]): Concept {
  return {
    id: `c${++_id}`,
    labels: [...labels],
    prototype: field,
    semantic: null,
    reinforcement: 1,
    mastery: 0,
    verifications: 0,
    meanSurprise: 1,
    firstSeen: Date.now(),
    lastSeen: Date.now(),
    sourceTrace: ["test"],
  };
}

describe("P6-B — resonance manifold: correlated, layered meaning", () => {
  it("calibrates honestly: family blends resonate ≥0.618, independent fields do not", () => {
    const b = base(1);
    expect(resonance(b, sibling(b, 13, 0.2))).toBeGreaterThan(0.618);
    expect(resonance(base(1), base(2))).toBeLessThan(0.382); // independent ≈ 1/√14
  });

  it("derives DIRECTED is-a from label-inclusion gated by geometry (cat is-a animal, never the reverse)", () => {
    const fam = base(1);
    const animal = concept(fam, ["animal"]);
    const cat = concept(sibling(fam, 13, 0.2), ["cat", "feline", "animal"]);
    const man = new ResonanceManifold();
    man.relate(cat, animal);
    expect(man.supertypes(cat.id).map((e) => e.to)).toContain(animal.id); // cat is-a animal ✓
    expect(man.supertypes(animal.id).map((e) => e.to)).not.toContain(cat.id); // NOT reverse ✓
  });

  it("derives SHARES-FEATURE for a common grounded label (the 4-legs cohort across species)", () => {
    const fam = base(1);
    const cat = concept(fam, ["cat", "feline", "four-legged"]);
    const dog = concept(sibling(fam, 13, 0.2), ["dog", "canine", "four-legged"]);
    const man = new ResonanceManifold();
    man.relate(cat, dog);
    expect(man.sharedFeatures(cat.id).some((e) => e.to === dog.id && e.witness === "four-legged")).toBe(true);
    expect(man.sharedFeatures(dog.id).some((e) => e.to === cat.id)).toBe(true);
  });

  it("never fabricates: independent fields (weak resonance) yield NO edge, even with a shared label", () => {
    const a = concept(base(1), ["alpha", "shared"]);
    const b = concept(base(2), ["beta", "shared"]); // independent — does not resonate
    const man = new ResonanceManifold();
    man.relate(a, b);
    expect(man.sharedFeatures(a.id).length).toBe(0);
    expect(man.size).toBe(0);
  });

  it("demotes an edge whose re-measured resonance collapses (living, self-correcting)", () => {
    const fam = base(1);
    const animal = concept(fam, ["animal"]);
    const cat = concept(sibling(fam, 13, 0.2), ["cat", "animal"]);
    const man = new ResonanceManifold();
    man.relate(cat, animal);
    expect(man.supertypes(cat.id).length).toBeGreaterThan(0);
    // Drift cat's geometry to an INDEPENDENT field (no longer resonates with animal).
    cat.prototype = base(2);
    man.relate(cat, animal);
    man.relate(cat, animal);
    man.relate(cat, animal);
    expect(man.supertypes(cat.id).length).toBe(0);
  });

  it("surfaces resonance sweetspots — the measured attractor-basin hubs", () => {
    const fam = base(1);
    const animal = concept(fam, ["animal"]);
    const cat = concept(sibling(fam, 13, 0.2), ["cat", "animal"]);
    const dog = concept(sibling(fam, 17, 0.25), ["dog", "animal"]);
    const man = new ResonanceManifold();
    man.relate(cat, animal);
    man.relate(dog, animal);
    man.relate(cat, dog);
    // Minimal registry facade for the sweetspot lookup.
    const byId = new Map([animal, cat, dog].map((c) => [c.id, c]));
    const reg = { get: (id: string) => byId.get(id), all: () => [...byId.values()] } as never;
    const spots = man.sweetspots(reg, 5);
    expect(spots.length).toBeGreaterThan(0);
    const animalSpot = spots.find((s) => s.conceptId === animal.id);
    expect(animalSpot).toBeDefined();
    expect(animalSpot!.degree).toBeGreaterThanOrEqual(2); // the shared hypernym is a hub
    for (const s of spots) expect(s.meanResonance).toBeGreaterThan(0);
  });
});
