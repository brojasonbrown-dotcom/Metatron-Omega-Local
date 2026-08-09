/**
 * RHUFT Mind — Resonance Manifold (P6-B): the correlation / ontology layer
 *
 * Epistemic Status: [SPEC] — Cognition-layer structure over the ConceptRegistry.
 *
 * THE QUESTION THIS ANSWERS
 * "Can similarities and meanings be correlated?" — yes, and this is the layer
 * that does it explicitly. The ConceptRegistry holds flat concepts (field
 * prototype ↔ word labels). The manifold lifts that into a DIRECTED, TYPED
 * relation graph — the mind's ontology — built ONLY from measured structure:
 *
 *   is-a            A subsumes B when A's label vocabulary is a subset of B's
 *                   (A is the more general term) AND their geometries resonate.
 *                   resonance() is symmetric, so it cannot alone say "cat IS-A
 *                   animal" — but label-inclusion IS directional. Geometry gates
 *                   it; vocabulary directs it. cat{cat,feline,animal} ⊇
 *                   animal{animal}  ⟹  cat is-a animal. [PHIL]
 *
 *   shares-feature  Two concepts ground a common LABEL (the "4-legs" case):
 *                   cat and dog both carry "four-legged" → a shared-feature edge
 *                   to that attribute concept, symmetric, geometry-gated. [PHIL]
 *
 *   analogous-to    A CROSS-domain structural rhyme: two concepts with disjoint
 *                   label vocabularies whose geometries still resonate — the
 *                   geometric "shaped alike though named differently". [PHIL]
 *
 * THE DISCIPLINE (no fabrication, ever)
 * A relation is asserted only when its measured resonance clears λ with a
 * φ-margin (stronger than the registry's bare-λ recognition, so the ontology
 * is strictly more conservative than the lexicon it sits on). Every edge
 * carries its measured resonance + evidence count, hardens with repeated
 * measurement (η decays), and is DEMOTED when re-measurement drops it — the
 * ontology is a living, self-correcting structure, not an accrued list. A
 * relation to an un-grounded or un-correlated pair is NEVER invented.
 *
 * RESONANCE SWEETSPOTS
 * `sweetspots()` surfaces the attractor basins: concepts that are hubs of the
 * manifold (many strong edges) — the measured clusters where the mind's
 * meanings densely cohere. This is the operator's "where does it resonate"
 * readout, derived from the live graph, never modelled.
 */

import { resonance } from "./../adapters/language_codec.ts";
import type { Concept, ConceptRegistry } from "./concept_registry.ts";

/** Recognition floor λ = 1/φ²; the manifold requires λ plus a φ-margin. [MATH] */
const LAMBDA = 0.3819660112501051;
/** Assert an edge only at ≥ λ + φ⁻¹·λ ≈ 0.618 — the high-margin ontology floor. [MATH] */
const EDGE_ASSERT = 0.6180339887498949;
/** Demote an edge when re-measurement falls below λ (it stopped resonating). [MATH] */
const EDGE_DEMOTE = LAMBDA;
/** Edges per concept pair are remembered up to F₆ = 8 relation kinds max. [SPEC] */
const MAX_RELATIONS_PER_PAIR = 8;

export type RelationKind = "is-a" | "shares-feature" | "analogous-to";

/** A single measured, directed edge in the manifold. [SPEC] */
export interface ManifoldEdge {
  readonly from: string; // concept id
  readonly to: string; // concept id
  readonly kind: RelationKind;
  /** The measured resonance that supports this edge (φ-hardened running mean). */
  resonance: number;
  /** How many times this edge has been re-measured (evidence). */
  evidence: number;
  /** The shared label that grounds shares-feature / the subset witness for is-a. */
  readonly witness: string | null;
  lastMeasured: number;
}

export interface Sweetspot {
  readonly conceptId: string;
  readonly labels: readonly string[];
  /** Number of live edges touching this concept (hub degree). */
  readonly degree: number;
  /** Mean resonance across its edges (how strongly it coheres). */
  readonly meanResonance: number;
}

export class ResonanceManifold {
  private readonly _edges = new Map<string, ManifoldEdge>(); // key: from|kind|to
  /** Total relation assertions measured this session (telemetry). */
  private _measured = 0;

  private static _key(from: string, kind: RelationKind, to: string): string {
    return `${from}|${kind}|${to}`;
  }

  get size(): number {
    return this._edges.size;
  }
  get measured(): number {
    return this._measured;
  }

  /** All live edges (read-only view for telemetry / tests). */
  edges(): readonly ManifoldEdge[] {
    return Array.from(this._edges.values());
  }

  /**
   * The core measurement: given two concepts, derive every warranted relation
   * between them and upsert the edges. Returns the relations derived this call.
   * Pure measurement over the registry's live concepts — no fabrication. [SPEC]
   */
  relate(a: Concept, b: Concept): ManifoldEdge[] {
    if (a.id === b.id) return [];
    const derived: ManifoldEdge[] = [];
    const r = resonance(a.prototype, b.prototype);
    this._measured++;

    // ── is-a (directed, label-inclusion gated by geometry) ────────────────
    // The more general concept's label set is a proper subset of the specific's.
    if (r >= EDGE_DEMOTE) {
      const aSub = this._properSubset(a.labels, b.labels); // a ⊂ b → b is-a a
      const bSub = this._properSubset(b.labels, a.labels); // b ⊂ a → a is-a b
      if (aSub) derived.push(this._upsert(b.id, "is-a", a.id, r, this._witness(a.labels)));
      if (bSub) derived.push(this._upsert(a.id, "is-a", b.id, r, this._witness(b.labels)));

      // ── shares-feature (symmetric, common grounded label) ────────────────
      const shared = this._sharedLabels(a.labels, b.labels);
      for (const w of shared) {
        derived.push(this._upsert(a.id, "shares-feature", b.id, r, w));
        derived.push(this._upsert(b.id, "shares-feature", a.id, r, w));
      }

      // ── analogous-to (disjoint vocabularies, geometric rhyme) ───────────
      if (aSub === false && bSub === false && shared.length === 0 && r >= EDGE_ASSERT) {
        derived.push(this._upsert(a.id, "analogous-to", b.id, r, null));
        derived.push(this._upsert(b.id, "analogous-to", a.id, r, null));
      }
    } else {
      // Below the demote floor: any existing edge between this pair decays out.
      this._demotePair(a.id, b.id);
    }
    return derived;
  }

  /**
   * Measure a concept against the whole registry, deriving its manifold edges.
   * Called by the loop when a stable thought resolves to a concept. Bounded:
   * only named concepts (labels present) can form is-a / shares-feature edges;
   * analogous-to needs no labels but the high-margin gate keeps it rare. [SPEC]
   */
  indexConcept(concept: Concept, registry: ConceptRegistry): ManifoldEdge[] {
    const out: ManifoldEdge[] = [];
    for (const other of registry.all()) {
      if (other.id === concept.id) continue;
      // Cheap gate: only spend the resonance measurement when there is a chance
      // of a relation — shared label, subset vocabulary, or a named concept that
      // could rhyme. (analogous-to still requires the geometric measurement.)
      const mayRelate =
        concept.labels.length > 0 && other.labels.length > 0
          ? this._sharedLabels(concept.labels, other.labels).length > 0 ||
            this._properSubset(concept.labels, other.labels) ||
            this._properSubset(other.labels, concept.labels)
          : false;
      if (mayRelate) {
        out.push(...this.relate(concept, other));
      }
    }
    return out;
  }

  /** Forward query: every relation `kind` FROM a concept. [SPEC] */
  relations(fromId: string, kind?: RelationKind): ManifoldEdge[] {
    const out: ManifoldEdge[] = [];
    for (const e of this._edges.values()) {
      if (e.from === fromId && (kind === undefined || e.kind === kind)) out.push(e);
    }
    return out.sort((x, y) => y.resonance - x.resonance);
  }

  /** The hypernyms of a concept: what it is-a. [SPEC] */
  supertypes(ofId: string): ManifoldEdge[] {
    return this.relations(ofId, "is-a");
  }

  /** Every concept sharing a feature with this one (the 4-legs cohort). [SPEC] */
  sharedFeatures(ofId: string): ManifoldEdge[] {
    return this.relations(ofId, "shares-feature");
  }

  /**
   * Resonance sweetspots — the hub concepts of the live manifold, ranked by
   * (degree, mean resonance). These are the measured attractor basins where the
   * mind's meanings densely cohere. [SPEC]
   */
  sweetspots(registry: ConceptRegistry, k: number = 8): Sweetspot[] {
    const deg = new Map<string, { n: number; sum: number }>();
    for (const e of this._edges.values()) {
      for (const id of [e.from, e.to]) {
        const cur = deg.get(id) ?? { n: 0, sum: 0 };
        cur.n++;
        cur.sum += e.resonance;
        deg.set(id, cur);
      }
    }
    const spots: Sweetspot[] = [];
    for (const [id, d] of deg) {
      const c = registry.get(id);
      if (!c) continue;
      spots.push({ conceptId: id, labels: c.labels, degree: d.n, meanResonance: d.n > 0 ? d.sum / d.n : 0 });
    }
    spots.sort((a, b) => b.degree - a.degree || b.meanResonance - a.meanResonance);
    return spots.slice(0, Math.max(0, k));
  }

  /** Drop every edge touching a concept (e.g. after it is evicted/consolidated). */
  removeConcept(id: string): void {
    for (const [key, e] of this._edges) {
      if (e.from === id || e.to === id) this._edges.delete(key);
    }
  }

  // ─── internals ─────────────────────────────────────────────────────────────

  private _upsert(from: string, kind: RelationKind, to: string, r: number, witness: string | null): ManifoldEdge {
    const key = ResonanceManifold._key(from, kind, to);
    const now = Date.now();
    const existing = this._edges.get(key);
    if (existing) {
      // φ-hardened running mean: a well-evidenced edge resists a single noisy read.
      const eta = 1 / (1 + existing.evidence);
      existing.resonance = existing.resonance * (1 - eta) + r * eta;
      existing.evidence++;
      existing.lastMeasured = now;
      if (existing.resonance < EDGE_DEMOTE) this._edges.delete(key); // it stopped resonating
      return existing;
    }
    if (r < EDGE_ASSERT) {
      // Never assert below the high-margin floor — return an un-persisted view.
      return { from, to, kind, resonance: r, evidence: 0, witness, lastMeasured: now };
    }
    const edge: ManifoldEdge = { from, to, kind, resonance: r, evidence: 1, witness, lastMeasured: now };
    this._edges.set(key, edge);
    return edge;
  }

  /** Decay all edges between a pair that no longer resonates. [SPEC] */
  private _demotePair(a: string, b: string): void {
    for (const [key, e] of this._edges) {
      if ((e.from === a && e.to === b) || (e.from === b && e.to === a)) {
        e.resonance *= 0.5;
        if (e.resonance < EDGE_DEMOTE) this._edges.delete(key);
      }
    }
  }

  /** true iff `sub` is a proper, non-empty subset of `sup` (vocabulary inclusion). */
  private _properSubset(sub: readonly string[], sup: readonly string[]): boolean {
    if (sub.length === 0 || sub.length >= sup.length) return false;
    return sub.every((l) => sup.includes(l));
  }

  /** The grounded labels two concepts share (the feature witnesses). */
  private _sharedLabels(a: readonly string[], b: readonly string[]): string[] {
    const out: string[] = [];
    for (const l of a) if (b.includes(l) && out.length < MAX_RELATIONS_PER_PAIR) out.push(l);
    return out;
  }

  /** The most general label (the subset witness) — the shortest, which is the
   *  least-specific term in a grounded vocabulary ("animal" over "four-legged"). */
  private _witness(labels: readonly string[]): string | null {
    if (labels.length === 0) return null;
    let best = labels[0]!;
    for (const l of labels) if (l.length < best.length) best = l;
    return best;
  }
}
