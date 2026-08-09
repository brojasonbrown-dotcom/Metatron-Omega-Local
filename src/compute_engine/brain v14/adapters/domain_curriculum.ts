/**
 * RHUFT Mind — Domain Curriculum Adapter (P6-E): specialise by instructed corpora
 *
 * Epistemic Status: [SPEC] — Adapter-layer sensor. The operator's Phase-6 mandate:
 * specialise the mind in learning BUSINESSES and their structures, how to use
 * SOFTWARE systems, and to learn in pretty much ANY WAY it is instructed.
 *
 * THE UNIFICATION (why this is one door, not a new subsystem)
 * The engine only ever ingests 28-element geometric fields through the
 * L4_Sensory door, and the loop perceives every frame identically: SENSE →
 * DETECT → RECOGNIZE → manifold. So a "business document", a "software screen",
 * and an "operator instruction" are not three kinds of learning — they are three
 * PROVENANCES of the SAME structured percept. This adapter canonicalises each
 * corpus item through the verified P6-C structured codec and pushes it onto the
 * sanctioned SensorBus as a validated frame, exactly like vision and text.
 *
 * WHAT "LEARN ANY WAY IT IS INSTRUCTED" MECHANICALLY MEANS
 * The mind does not get a special mode per domain. The instruction is a corpora
 * of observations; the learning is the SAME consolidation the brain already runs
 * (perception → concept registry → mastery ledger → manifold). The curriculum's
 * job is honest PROOF: for each corpus it measures the post-observation mastery
 * of the concepts the corpus actually resolved to (registry.masteryOf), so a
 * corpus is "learned" only when its measured mastery clears the φ⁻² coherence
 * threshold — a MEASUREMENT, never a claim. A corpus that does not move mastery
 * reports learned:false with the measured mastery exposed (TRUTH_SOURCES).
 *
 * THREE PROVENANCES, ONE DOOR:
 *   doc.feed    — business documents, records, org structures (encodeDocument)
 *   ui.observe  — software/SaaS UI element trees (encodeUiTree)
 *   text.feed   — operator-authored instruction / prose (encodeText)
 */

import { encodeText } from "./language_codec.ts";
import { encodeDocument, encodeUiTree, type UiElement } from "./structured_codec.ts";
import type { SensorBus } from "./sensors/sensor_bus.ts";

/** Coherence threshold: a corpus counts as learned when its mean measured
 * mastery clears φ⁻² = λ — the same recognition floor the registry uses. [SPEC] */
const LEARN_MASTERY_THRESHOLD = 0.3819660112501051; // φ⁻² = λ = COHERENCE_THRESHOLD

/** The three ways the mind can presently be instructed (its real percepts). [SPEC] */
export type CorpusKind = "business.doc" | "software.ui" | "instruction.text";

/**
 * One observation to be taught. `kind` selects the codec and the bus provenance;
 * the payload is the raw document / UI tree / instruction string. A corpus is a
 * SET of such observations about one domain (one business, one application). [SPEC]
 */
export type CurriculumItem =
  | { readonly kind: "business.doc"; readonly doc: unknown; readonly provenance: string }
  | { readonly kind: "software.ui"; readonly tree: UiElement; readonly provenance: string }
  | { readonly kind: "instruction.text"; readonly text: string };

/** The minimal read-surface of the concept registry this adapter needs. The full
 * ConceptRegistry satisfies it; a test fake can too. Structural, not nominal. [SPEC] */
export interface CurriculumRegistry {
  nearestText(text: string, k: number): readonly { readonly concept: { readonly id: string }; readonly resonance: number }[];
  /** ConceptRegistry.masteryOf returns the mastery RECORD; we read .mastery. [SPEC] */
  masteryOf(id: string): { readonly mastery: number };
}

/** A named corpus: the observations + the concepts that mean "I know this". [SPEC] */
export interface Corpus {
  /** Human label for reporting ("acme-crm", "onboarding-flow"). */
  readonly name: string;
  /**
   * Probe strings that mean "I have learned this corpus". After teaching, each
   * probe is recognised text-side (nearestText) and the resolved concept's
   * measured mastery is read. The corpus is learned iff mean mastery ≥ λ. [SPEC]
   */
  readonly probes: readonly string[];
  /** The observations to feed the mind, in order. */
  readonly items: readonly CurriculumItem[];
}

/** Per-corpus outcome — the honest verdict. [SPEC] */
export interface CorpusResult {
  readonly name: string;
  /** Frames accepted onto the bus (rejected frames are surfaced, not hidden). */
  readonly framesAccepted: number;
  readonly framesRejected: number;
  /** Mean measured mastery across probes AFTER teaching (0 if no probe resolved). */
  readonly mastery: number;
  /** True iff mastery cleared the λ coherence floor — measured, not asserted. */
  readonly learned: boolean;
  /** How many probes resolved to a known concept (vs. landing on nothing). */
  readonly probesResolved: number;
}

export interface CurriculumStats {
  readonly corporaRun: number;
  readonly framesAccepted: number;
  readonly framesRejected: number;
  readonly lastError: string | null;
}

export class DomainCurriculum {
  private readonly _bus: SensorBus;
  private readonly _registry: CurriculumRegistry;
  private _corporaRun = 0;
  private _framesAccepted = 0;
  private _framesRejected = 0;
  private _lastError: string | null = null;

  constructor(bus: SensorBus, registry: CurriculumRegistry) {
    this._bus = bus;
    this._registry = registry;
  }

  stats(): CurriculumStats {
    return {
      corporaRun: this._corporaRun,
      framesAccepted: this._framesAccepted,
      framesRejected: this._framesRejected,
      lastError: this._lastError,
    };
  }

  /**
   * Teach one corpus: push every item through its codec onto the bus, then
   * measure the resulting mastery of the corpus's probe concepts. Returns the
   * honest per-corpus verdict. The mind consolidates the frames on its own loop
   * cadence — this adapter feeds and MEASURES; it never reaches inside the loop. [SPEC]
   */
  teach(corpus: Corpus): CorpusResult {
    let accepted = 0;
    let rejected = 0;
    try {
      for (const item of corpus.items) {
        const frame = this._frameFor(item);
        if (this._bus.push(frame)) accepted++;
        else rejected++;
      }
    } catch (err) {
      this._lastError = `${corpus.name}: ${String(err instanceof Error ? err.message : err)}`;
    }
    this._framesAccepted += accepted;
    this._framesRejected += rejected;
    this._corporaRun++;

    const { mastery, resolved } = this._measureMastery(corpus);
    return {
      name: corpus.name,
      framesAccepted: accepted,
      framesRejected: rejected,
      mastery,
      learned: mastery >= LEARN_MASTERY_THRESHOLD,
      probesResolved: resolved,
    };
  }

  /** Teach a whole curriculum (several corpora) and return every verdict. [SPEC] */
  teachAll(corpora: readonly Corpus[]): CorpusResult[] {
    return corpora.map((c) => this.teach(c));
  }

  /** Encode one item through its provenance codec and wrap it as a bus frame. [SPEC] */
  private _frameFor(item: CurriculumItem): {
    source: "doc.feed" | "ui.observe" | "text.feed";
    timestamp: number;
    meta: Record<string, string>;
    field: Float64Array;
  } {
    const timestamp = Date.now();
    switch (item.kind) {
      case "business.doc":
        return {
          source: "doc.feed",
          timestamp,
          meta: { origin: "curriculum", provenance: item.provenance },
          field: encodeDocument(item.doc, item.provenance),
        };
      case "software.ui":
        return {
          source: "ui.observe",
          timestamp,
          meta: { origin: "curriculum", provenance: item.provenance },
          field: encodeUiTree(item.tree, item.provenance),
        };
      case "instruction.text":
        return {
          source: "text.feed",
          timestamp,
          meta: { origin: "curriculum", provenance: "instruction" },
          field: encodeText(item.text),
        };
    }
  }

  /**
   * Measure the mastery a corpus reached. Each probe is recognised TEXT-SIDE
   * (nearestText — the probe is words) and the resolved concept's mastery is
   * read. Mean over resolved probes; unresolved probes count 0 toward the mean
   * only when at least one probe resolved (an all-unresolved corpus is 0). [SPEC]
   */
  private _measureMastery(corpus: Corpus): { mastery: number; resolved: number } {
    if (corpus.probes.length === 0) return { mastery: 0, resolved: 0 };
    let sum = 0;
    let resolved = 0;
    for (const probe of corpus.probes) {
      const top = this._registry.nearestText(probe, 1)[0];
      if (!top) continue;
      sum += this._registry.masteryOf(top.concept.id).mastery;
      resolved++;
    }
    if (resolved === 0) return { mastery: 0, resolved: 0 };
    // Divide by the FULL probe count: an unresolved probe is unmastered ground,
    // so it pulls the mean down honestly rather than being excused. [SPEC]
    return { mastery: sum / corpus.probes.length, resolved };
  }
}
