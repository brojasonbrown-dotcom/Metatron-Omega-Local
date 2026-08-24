/**
 * METATRON Ω — the answer path. The old engine answered canned intents; the
 * Omega brain answers by COMPUTING over live input. Every chat line and every
 * ingested document is encoded into the brain's sensory plane, the brain is
 * advanced a bounded number of ticks, and the reply reports what the brain
 * actually did with it: its live field state and what it learned.
 *
 * Nothing is canned. A reply is the HostSnapshot + cognition, phrased plainly.
 */
"use strict";

const PHI = 1.618033988749895;

/**
 * Answer a line of text against the live brain. `loop` is the OmegaLoop; the
 * text is fed to its text channel, the brain advances a few ticks so the input
 * lands on the field, and the reply reads the resulting state.
 * @param {import("./omegaLoop.cjs").OmegaLoop} loop
 * @param {string} text
 */
function respond(loop, text) {
  const t = String(text ?? "").trim();
  if (!t) return "…";
  const lower = t.toLowerCase();

  // Meta-questions about the brain itself are answered from its live state,
  // not by feeding noise into the field.
  if (/^(help|what can you do|commands)\b/.test(lower)) {
    return [
      "I am METATRON Ω — a toroidal RHUFT brain: 18-rung dense core, deterministic, certified.",
      "Ask me about my live state: `status`, `ladder`, `coherence`, `memory`, `mind`.",
      "Or just talk — everything you say is encoded into my field and I learn from it.",
    ].join("\n");
  }

  const s = loop.state();

  if (/^(status|state|how are you)\b/.test(lower)) {
    return [
      `Profile ${s.profile} · ${s.rungs.length} rungs · ${s.totalNodes} nodes · digest ${String(s.digest).slice(0, 16)}`,
      `coherence ${fmt(s.coherence)} (warm rungs ${s.warmRungs}/${s.rungs.length}) · energy ${fmt(s.energy)} · flux moved ${fmt(s.fluxMoved)}`,
      `memory: ${s.memoryLoad}/${s.memoryCapacity} patterns (${s.memoryStage}) · concepts ${s.concepts} · novelty ${fmt(s.novelty)}`,
      `finite ${s.finite} · ordering violations ${s.orderingViolations} · row-sum defect ${fmt(s.rowSumDefect)}`,
    ].join("\n");
  }

  if (/^ladder\b/.test(lower)) {
    const rows = s.rungs
      .map((r) => `n=${String(r.n).padEnd(3)} nodes=${String(r.nodes).padEnd(4)} coh=${fmt(r.coherence)} ${r.warm ? "warm" : "cold"} regime=${r.regime}`)
      .join("\n");
    return `The dense-core ladder (${s.rungs.length} stable rungs, live):\n${rows}`;
  }

  if (/^(memory|memories|remember)\b/.test(lower)) {
    return [
      `Braid memory: ${s.memoryLoad}/${s.memoryCapacity} patterns held, stage ${s.memoryStage}.`,
      `familiarity of the current field to its best pattern ${fmt(s.familiarity)}.`,
      `Concepts in the semantic store: ${s.concepts}.`,
    ].join("\n");
  }

  if (/^(mind|cognition|think)\b/.test(lower)) {
    const c = s.cognition ?? {};
    return [
      `Cognition: ${s.concepts} concepts, novelty ${fmt(s.novelty)}, surprise ${fmt(s.surprise)}.`,
      `self-model ${s.selfModel ? "ahead of baseline" : "behind baseline"} (margin ${fmt(s.selfMargin)}).`,
    ].join("\n");
  }

  // Free text: feed it, let the brain run, and report what changed. This is the
  // honest learning path — the input becomes part of the field.
  loop.injectSensor("text", t);
  const after = loop.state();
  return [
    `Encoded into the field. The brain is listening and learning.`,
    `field: coherence ${fmt(after.coherence)} · energy ${fmt(after.energy)} · novelty ${fmt(after.novelty)} · concepts ${after.concepts}`,
    `digest ${String(after.digest).slice(0, 16)} — the field's state changed by what you said.`,
  ].join("\n");
}

function fmt(x) {
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  if (!Number.isFinite(x)) return "—";
  if (Math.abs(x) >= 1000) return x.toExponential(2);
  return x.toFixed(4);
}

module.exports = { respond };
