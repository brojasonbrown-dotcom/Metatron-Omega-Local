/**
 * RHUFT Mind — Linguistic Gate: instrument words are MEASURED before believed
 *
 * Epistemic Status: [SPEC] + [MATH] — Cognition layer. ADDITIVE module.
 *
 * [PHIL] — The engine is the sole locus of learning. An instrument (phi, or the
 * K3 frontier model) PROPOSES language; it never asserts it. The gate is the
 * single choke-point where every proposed label, definition, relation or spoken
 * sentence is re-encoded into field space and MEASURED against the concept it
 * claims to describe. Only words whose geometry coheres with the concept's own
 * attractor may touch the registry, the glossary, the lexicon, or the echo
 * feedback that re-enters memory. This is what makes the mind's linguistics
 * algorithmic rather than a thin wrapper over an LLM: the LLM raises the
 * ceiling of what gets PROPOSED; the field math decides what gets BELIEVED.
 *
 * Three measurements, all in the one shared resonance kernel C(a,b) ∈ [0,1]:
 *
 *   1. COHERENCE GATE (λ = φ⁻²) — a word is admitted only when its language
 *      field resonates with the concept's geometry at ≥ λ. Below that the word
 *      and the percept disagree structurally: it is rejected and journaled,
 *      never learned. This is the same λ the registry uses for recognition, so
 *      "this word names this thing" and "this field is this attractor" are one
 *      threshold, not two. [MATH]
 *
 *   2. CONVERGENCE INVARIANT — binding a word must never DRAG DOWN a concept's
 *      internal self-coherence (resonance between its percept prototype and its
 *      semantic prototype). A proposal that would de-cohere a mature attractor
 *      is rejected. "Stabilised linguistics" is thereby a provable property:
 *      semantic coherence is non-decreasing across admitted updates, bounded by
 *      the φ-hardening law in reinforceField. [MATH]
 *
 *   3. LEARNED-CONCEPT SHIELD (M6) — a concept the mind has MASTERED (verified
 *      predictions beat the φ-prior ≥ F₅ times, mastery > 0) is hardened fact.
 *      A single instrument proposal can never move it. Only words that pass the
 *      gate AND do not lower coherence may bind to a mastered concept — and even
 *      then the φ-hardening in reinforceField (η ∝ 1/(evidence+1)) damps the
 *      move. This is the structural fix for the dog/cat echo-poison class: an
 *      ungrounded or incoherent label cannot overwrite what was verified. [FIX]
 *
 * TRUTH_SOURCES: the gate never fabricates. A rejected word is dropped and
 * journaled with its measured resonance; nothing is substituted, nothing mocked.
 * Every decision is derivable from fields already in the engine.
 */

import { PHI_NEG2 } from "./../core/constants.ts";
import {
  encodeText,
  isFieldFinite,
  normalizeField,
  resonance,
} from "./../adapters/language_codec.ts";
import { atom, similarity } from "./../adapters/phasor_field.ts";
import type { Concept, ConceptRegistry } from "./concept_registry.ts";

/** Admission threshold: λ = φ⁻² — the one shared coherence floor. [MATH] */
export const GATE_LAMBDA: number = PHI_NEG2;

/** Coherence floor: a mastered concept's self-coherence may never fall below λ. [MATH] */
export const COHERENCE_FLOOR: number = PHI_NEG2;

/** The verdict on one proposed word. */
export interface GateVerdict {
  /** The normalized word that was measured. */
  readonly word: string;
  /** Measured resonance between the word's field and the concept's geometry. */
  readonly resonance: number;
  /** True iff the word may bind/learn (resonance ≥ λ and invariant holds). */
  readonly admitted: boolean;
  /** Why it was rejected, when not admitted (empty when admitted). */
  readonly reason: string;
}

/** The result of gating a whole instrument payload. */
export interface GateReport {
  /** Words that passed the gate, in original order. */
  readonly admitted: string[];
  /** Per-word verdicts (admitted and rejected), for the journal. */
  readonly verdicts: readonly GateVerdict[];
  /** The concept's self-coherence BEFORE any binding (null when un-named). */
  readonly coherenceBefore: number | null;
}

/**
 * The reference geometry a word must cohere with: the concept's semantic
 * prototype when it exists (the fused word-geometry — the strongest statement
 * of "what this concept means"), else its percept prototype. [PHIL]
 */
function referenceField(concept: Concept): Float64Array {
  return concept.semantic ?? concept.prototype;
}

/**
 * A concept's internal self-coherence: resonance between its percept prototype
 * and its semantic prototype. Null when the concept is un-named (no semantic
 * channel yet — there is nothing to de-cohere). [MATH]
 */
export function selfCoherence(concept: Concept): number | null {
  if (concept.semantic === null) return null;
  return resonance(concept.prototype, concept.semantic);
}

export class LinguisticGate {
  private readonly _registry: ConceptRegistry;
  /**
   * D-space anchor cache: conceptId → [labelsKey, bound-label atoms].
   * Rebuilt only when the concept's label set changes (the labelsKey mismatch).
   * The anchors are the individual D-space atoms of the concept's bound labels —
   * each one a clean unit-norm statement of "one name this concept carries". [MATH]
   */
  private readonly _dAnchors = new Map<string, [string, readonly Float64Array[]]>();

  constructor(registry: ConceptRegistry) {
    this._registry = registry;
  }

  /**
   * The concept's bound-label anchors: one D-space atom per encodable bound
   * label. Returns null when the concept has no encodable labels (un-named) —
   * the caller then falls back to the 28-field measure, honestly.
   *
   * Why anchors and not the bundled superposition: a normalized bundle dilutes
   * each constituent by 1/√n, so a bound label's own resonance decays below λ as
   * the concept accrues names (measured 2026-08-13: n=4 → 0.50, n=6 → 0.41 <
   * λ — the gate was rejecting the concept's own learned words). A word must
   * cohere with ONE of the concept's names, not the blended centroid, so the
   * measurement is the max similarity over the individual label-atoms. A word
   * then reads 1.0 against its own atom regardless of label count, while an
   * unrelated word sits at the 1/√D floor against EVERY anchor — so a pre-bind
   * λ-gate stays sound (false-accept unchanged) AND stops rejecting bound
   * labels (false-reject fixed). [MATH]
   */
  private _dAnchorsOf(concept: Concept): readonly Float64Array[] | null {
    const key = concept.labels.join("");
    const hit = this._dAnchors.get(concept.id);
    if (hit !== undefined && hit[0] === key) return hit[1];
    const atoms: Float64Array[] = [];
    for (const label of concept.labels) {
      try {
        atoms.push(atom(label));
      } catch {
        // Skip un-encodable labels; the anchors are built from what encodes.
      }
    }
    if (atoms.length === 0) return null;
    this._dAnchors.set(concept.id, [key, atoms]);
    return atoms;
  }

  /**
   * Measure a single proposed word against a concept. Pure: no mutation.
   *
   * Admission rule: the word must encode cleanly (finite, non-degenerate), and
   * its field must resonate with the concept's reference geometry at ≥ λ.
   *
   * M8 — measured in the PHASOR hypervector space when the concept has bound
   * labels: `max over label-atoms of similarity(atom(word), atom(label))` — the
   * word's nearest bound anchor. On the 28-field this measurement was UNSOUND
   * (unrelated words hit 0.773 on the shared φ-DFT structure while bound labels
   * read 0.215 — a λ-threshold straddled both). In D-space the unrelated floor
   * collapses to 1/√D ≈ 0.011 against every anchor, while a bound label reads
   * ≈1.0 against its own atom no matter how many labels the concept carries —
   * a normalized bundle would dilute that to 1/√n and reject the concept's own
   * names past ~4 labels (measured). A pre-bind λ-gate is SOUND here at any
   * label count. When the concept is un-named (no anchors), falls back to the
   * 28-field measure — honestly noisy, but there is no bound label to be
   * false-positive against yet. [MATH]
   */
  measureWord(concept: Concept, word: string): GateVerdict {
    const w = word.trim().toLowerCase();
    if (w.length === 0) {
      return { word: w, resonance: 0, admitted: false, reason: "empty after normalization" };
    }
    const anchors = this._dAnchorsOf(concept);
    if (anchors !== null) {
      let wordAtom: Float64Array;
      try {
        wordAtom = atom(w);
      } catch {
        return { word: w, resonance: 0, admitted: false, reason: "cannot be encoded" };
      }
      let r = 0;
      for (const anchor of anchors) {
        const s = similarity(wordAtom, anchor);
        if (s > r) r = s;
      }
      if (r < GATE_LAMBDA) {
        return {
          word: w,
          resonance: r,
          admitted: false,
          reason: `incoherent: D-resonance ${r.toFixed(3)} < λ ${GATE_LAMBDA.toFixed(3)}`,
        };
      }
      return { word: w, resonance: r, admitted: true, reason: "" };
    }
    // Un-named concept: no D-channel yet → the 28-field measure (see header).
    let wordField: Float64Array;
    try {
      wordField = encodeText(w);
    } catch {
      return { word: w, resonance: 0, admitted: false, reason: "cannot be encoded" };
    }
    if (!isFieldFinite(wordField)) {
      return { word: w, resonance: 0, admitted: false, reason: "encoded field not finite" };
    }
    const ref = referenceField(concept);
    const r = resonance(wordField, ref);
    if (r < GATE_LAMBDA) {
      return {
        word: w,
        resonance: r,
        admitted: false,
        reason: `incoherent: resonance ${r.toFixed(3)} < λ ${GATE_LAMBDA.toFixed(3)}`,
      };
    }
    return { word: w, resonance: r, admitted: true, reason: "" };
  }

  /**
   * Gate a set of proposed words for a concept. Pure: returns the admitted
   * subset and per-word verdicts; binds nothing. The caller binds only
   * `report.admitted`, then calls `checkInvariant` to confirm the binding did
   * not de-cohere the concept.
   */
  gateWords(concept: Concept, words: readonly string[]): GateReport {
    const verdicts: GateVerdict[] = [];
    const admitted: string[] = [];
    for (const w of words) {
      const v = this.measureWord(concept, w);
      verdicts.push(v);
      if (v.admitted) admitted.push(v.word);
    }
    return { admitted, verdicts, coherenceBefore: selfCoherence(concept) };
  }

  /**
   * CONVERGENCE INVARIANT — verify a concept after admitted words were bound.
   *
   * Returns true iff the concept's self-coherence did not fall. For a concept
   * that was un-named before (coherenceBefore === null) the invariant is
   * trivially satisfied on first binding — there was no coherence to lower —
   * but it must then be coherent at all: the freshly created semantic channel
   * must resonate with the percept at ≥ λ, or the bind created an incoherent
   * split-brain (the word and the percept now disagree about one concept).
   *
   * On failure the caller MUST treat the whole proposal as rejected: the words
   * were admitted individually but their fusion broke the attractor, so the
   * mutation is rolled back by the caller (labels removed, geometry restored)
   * and the rejection journaled. [MATH]
   */
  checkInvariant(concept: Concept, coherenceBefore: number | null): { ok: boolean; after: number | null; reason: string } {
    const after = selfCoherence(concept);
    if (coherenceBefore === null) {
      // First naming: the new semantic channel must cohere with the percept.
      if (after === null) {
        // No semantic channel was created — the bind did nothing; not a violation.
        return { ok: true, after, reason: "" };
      }
      if (after < COHERENCE_FLOOR) {
        return {
          ok: false,
          after,
          reason: `first binding split the concept: coherence ${after.toFixed(3)} < floor ${COHERENCE_FLOOR.toFixed(3)}`,
        };
      }
      return { ok: true, after, reason: "" };
    }
    // Named concept: coherence must be non-decreasing across the update.
    if (after === null || after < coherenceBefore) {
      return {
        ok: false,
        after,
        reason: `convergence violated: coherence ${coherenceBefore.toFixed(3)} → ${after === null ? "null" : after.toFixed(3)}`,
      };
    }
    return { ok: true, after, reason: "" };
  }

  /**
   * LEARNED-CONCEPT SHIELD — is this concept hardened fact that an instrument
   * may not move? [MATH] A mastered concept (M6: learned) rejects any word that
   * is not BOTH admitted by the gate AND coherence-preserving. In practice the
   * caller gates first and binds nothing on a mastered concept unless the word
   * passed; this predicate is the explicit guard for the echo-poison class.
   */
  isMastered(concept: Concept): boolean {
    return this._registry.masteryOf(concept.id).learned;
  }
}

/**
 * Gate a free-text payload (a definition, relation, gloss, reasoning, or spoken
 * sentence) before it is fed back into memory as "llm.answer". The text is
 * encoded as one field; it is admitted only when finite AND it resonates with
 * the originating concept's geometry at ≥ λ — so the echo the mind learns is
 * about the concept, not incoherent noise. Returns the encoded field when
 * admitted, else null (caller skips the feedback and journals the rejection).
 */
export function gateEchoText(concept: Concept, text: string): { field: Float64Array | null; resonance: number; reason: string } {
  const t = text.trim();
  if (t.length === 0) return { field: null, resonance: 0, reason: "empty text" };
  let field: Float64Array;
  try {
    field = normalizeField(encodeText(t));
  } catch {
    return { field: null, resonance: 0, reason: "cannot be encoded" };
  }
  if (!isFieldFinite(field)) return { field: null, resonance: 0, reason: "encoded field not finite" };
  const ref = concept.semantic ?? concept.prototype;
  const r = resonance(field, ref);
  if (r < GATE_LAMBDA) {
    return { field: null, resonance: r, reason: `echo incoherent: ${r.toFixed(3)} < λ ${GATE_LAMBDA.toFixed(3)}` };
  }
  return { field, resonance: r, reason: "" };
}
