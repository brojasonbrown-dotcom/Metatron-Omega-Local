/**
 * RHUFT Mind — Structured Spine: the rich, measured fact-spine for grounded answers.
 *
 * Epistemic Status: [SPEC] — Cognition/adapter layer. Spine-upgrade (the exploit).
 *
 * WHY THIS EXISTS. The answer path's strength was never the LLM — it is the
 * COPY-TASK: hand phi a deterministic block of facts and let it only comment, with
 * mathstral verifying any number. But the spine itself was THIN (engine constants
 * only). Meanwhile the mind's VERIFIED learned structure — its strongest concepts,
 * measured relations, glossary meanings — sat unused. This module builds the RICH
 * spine: layered, every line measured, nothing invented.
 *
 * THE LAYERS (each measured, each honest about its provenance):
 *   1. LEARNED CONCEPTS — the strongest concepts by verified mastery (M6: the
 *      φ-decayed mean prediction gain, the honest "learned" signal), each with its
 *      glossary gloss and its top measured relations.
 *   2. MEASURED RELATIONS — the strongest relation edges across the vocabulary
 *      (is-a / part-of / opposite-of / related-to), strength = φ-decayed mean
 *      resonance of observed co-occurrences — never a guess (lexicon's own law).
 *   3. LIVE DEPTH — the deep observer lanes' latest readouts (cross-scale flux
 *      conservation, eigenmode dominance, multiscale coherence) when enabled.
 *
 * DISCIPLINE: every number is read from the live mind; a layer with no measured
 * content contributes NOTHING (no filler, no "nothing yet" padding that would eat
 * the LLM's attention). The spine is bounded (Fibonacci caps) so it never floods
 * the copy-task. Pure assembly from measured state. [SPEC]
 */

import type { ConceptRegistry } from "./concept_registry.ts";
import type { Lexicon } from "./lexicon.ts";
import type { ConceptGlossary } from "./glossary.ts";
import { at } from "../core/indexing.ts";

/** Fibonacci caps — the spine stays focused, never floods the copy-task. [SPEC] */
const MAX_CONCEPTS = 5;   // F_5
const MAX_REL_PER_CONCEPT = 3; // F_4
const MAX_GLOBAL_RELS = 8; // F_6

/** The live observer lanes whose readouts can join the spine (all optional). */
export interface SpineObservers {
  crossScaleFlow?: { stats(): { fluxConserved: boolean; routed: number; totalFlux: number } } | undefined;
  eigenmodeGrid?: { stats(): { lastGrid: { nodes: number; meanDominance: number } | null } } | undefined;
  multiscaleBridge?: { stats(): { lastMeanCoherence: number; lastTotalResidual: number; lastFluxConserved: boolean } } | undefined;
}

export interface SpineDeps {
  registry: ConceptRegistry;
  lexicon?: Lexicon | undefined;
  glossary?: ConceptGlossary | undefined;
  observers?: SpineObservers | undefined;
}

/**
 * Build the rich structured spine. Returns the spine TEXT (the deterministic facts
 * block) — empty string when the mind has measured nothing yet (honest, never a
 * fabricated "I know nothing" filler). Every line carries its measured number.
 */
export function buildStructuredSpine(deps: SpineDeps): string {
  const lines: string[] = [];
  const { registry, lexicon, glossary, observers } = deps;

  // ── Layer 1: the strongest learned concepts (by verified mastery) ──────────
  const concepts = registry
    .all()
    .filter((c) => c.labels.length > 0)
    .sort((a, b) => b.mastery - a.mastery || b.reinforcement - a.reinforcement)
    .slice(0, MAX_CONCEPTS);
  if (concepts.length > 0) {
    lines.push(`LEARNED CONCEPTS (${registry.size} total, strongest by verified mastery):`);
    for (const c of concepts) {
      const word = at(c.labels, 0) ?? "unnamed";
      const gloss = glossary?.get(c.id)?.definition;
      const binding = lexicon?.resolve(word);
      const relTail =
        binding && binding.relations.length > 0
          ? " [" + binding.relations.slice(0, MAX_REL_PER_CONCEPT).map((r) => `${r.kind} ${r.to}`).join("; ") + "]"
          : "";
      const glossTail = gloss ? ` — ${gloss}` : "";
      lines.push(
        `  ${word}: mastery ${c.mastery.toFixed(3)} (${c.verifications} verified), reinforcement ${c.reinforcement}${glossTail}${relTail}`,
      );
    }
  }

  // ── Layer 2: the strongest measured relations across the vocabulary ────────
  if (lexicon) {
    const vocab = lexicon.vocabulary();
    const seen = new Set<string>();
    const edges: Array<{ from: string; kind: string; to: string; strength: number }> = [];
    for (const w of vocab) {
      for (const e of lexicon.relationsOf(w)) {
        const key = [e.from, e.kind, e.to].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from: e.from, kind: e.kind, to: e.to, strength: e.strength });
      }
    }
    edges.sort((a, b) => b.strength - a.strength);
    const top = edges.slice(0, MAX_GLOBAL_RELS);
    if (top.length > 0) {
      lines.push(`MEASURED RELATIONS (${edges.length} edges, strongest first):`);
      for (const e of top) {
        lines.push(`  ${e.from} ${e.kind} ${e.to} (strength ${e.strength.toFixed(3)})`);
      }
    }
  }

  // ── Layer 3: live depth (the deep observer lanes, when enabled) ────────────
  if (observers) {
    const depthLines: string[] = [];
    const csf = observers.crossScaleFlow?.stats();
    if (csf && csf.routed > 0) {
      depthLines.push(`  cross-scale octave flow: ${csf.routed} transfers, flux conserved = ${csf.fluxConserved}`);
    }
    const eg = observers.eigenmodeGrid?.stats().lastGrid;
    if (eg) {
      depthLines.push(`  eigenmode grid: ${eg.nodes} nodes, mean mode-dominance ${eg.meanDominance.toFixed(3)}`);
    }
    const ms = observers.multiscaleBridge?.stats();
    if (ms && ms.lastTotalResidual > 0) {
      depthLines.push(
        `  18-torus engine: coherence ${ms.lastMeanCoherence.toFixed(4)}, total residual ${ms.lastTotalResidual.toExponential(2)}, flux conserved = ${ms.lastFluxConserved}`,
      );
    }
    if (depthLines.length > 0) {
      lines.push("LIVE ENGINE DEPTH:");
      lines.push(...depthLines);
    }
  }

  return lines.join("\n");
}
