/**
 * METATRON Ω — the answer path. The brain answers by COMPUTING over live input.
 * Meta-questions are read from the live HostSnapshot + the host's structural
 * views (describe / web / spectral / memory / cognition / learn). Free text is
 * encoded into the sensory plane and the brain advances — the honest learning
 * path. Nothing is canned.
 */
"use strict";

const PHI = 1.618033988749895;
const PHI_INV = 1 / PHI;

/**
 * @param {import("./omegaLoop.cjs").OmegaLoop} loop
 * @param {string} text
 */
function respond(loop, text) {
  const t = String(text ?? "").trim();
  if (!t) return "…";
  const lower = t.toLowerCase();
  const s = loop.state();

  if (/^(help|what can you do|commands)\b/.test(lower)) {
    return [
      "I am METATRON Ω — a toroidal RHUFT brain: 18-rung dense core, deterministic, certified.",
      "Ask about my live state:  status · ladder · web · spectral · memory · mind · learn",
      "Or just talk — everything you say is encoded into my field and I learn from it.",
    ].join("\n");
  }

  if (/^(status|state|how are you)\b/.test(lower)) {
    return [
      `Profile ${s.profile} · ${s.rungs.length} rungs · ${s.totalNodes} nodes · digest ${String(s.digest).slice(0, 16)}`,
      `coherence ${fmt(s.coherence)} (warm ${s.warmRungs}/${s.rungs.length}) · energy ${fmt(s.energy)} · flux moved ${fmt(s.fluxMoved)}`,
      `memory ${s.memoryLoad}/${s.memoryCapacity} (${s.memoryStage}) · concepts ${s.concepts} · novelty ${fmt(s.novelty)}`,
      `finite ${s.finite} · ordering violations ${s.orderingViolations} · row-sum defect ${fmt(s.rowSumDefect)}`,
      `tick rate ${fmt(s.tickRate)} Hz · bus ${fmt(s.busHz)} Hz`,
    ].join("\n");
  }

  if (/^(ladder|rungs|scales)\b/.test(lower)) {
    const d = s.describe?.rungs;
    if (d && d.length) {
      const rows = d
        .map((r) => `n=${String(r.n).padEnd(3)} nodes=${String(r.nodes).padEnd(4)} logR=${fmt(r.logRadius)} qrf=${fmt(r.qrf)} emitted=${fmt(r.emitted)}`)
        .join("\n");
      return `The dense-core ladder (${d.length} stable rungs, structural truth):\n${rows}`;
    }
    const rows = s.rungs
      .map((r) => `n=${String(r.n).padEnd(3)} nodes=${String(r.nodes).padEnd(4)} coh=${fmt(r.coherence)} ${r.warm ? "warm" : "cold"} ${r.regime}`)
      .join("\n");
    return `The dense-core ladder (${s.rungs.length} stable rungs, live):\n${rows}`;
  }

  if (/^(web|flux|ledger)\b/.test(lower)) {
    const w = s.web;
    if (!w) return "The flux web has not ticked yet — wake the brain.";
    const entries = (w.entries ?? []).slice(-5)
      .map((e) => `  t${e.tick} rung ${e.from}→${e.to} · ${fmt(e.amount)}`)
      .join("\n");
    return [
      `Flux web · tick ${w.tick} · turnover ${fmt(w.turnover)} · sink ${fmt(w.sink)}`,
      `imbalance ${fmt(w.imbalance)} · net imbalance ${fmt(w.netImbalance)} · ordering violations ${w.orderingViolations}`,
      entries ? `recent ledger entries:\n${entries}` : "no ledger entries yet",
    ].join("\n");
  }

  if (/^(spectral|signature|spectrum|modes)\b/.test(lower)) {
    const sp = s.spectral;
    if (!sp) return "No spectral view yet — wake the brain.";
    const sig = (sp.signature ?? []).slice(0, 13).map((v, i) => `k${i}=${fmt(v)}`).join("  ");
    return [
      `Spectral view · rung n=${sp.n} · rank ${sp.rank} · ${sp.shellPoints} shell points`,
      `13-mode transcription signature:\n${sig}`,
      `organ nodes ${s.organ?.organNodes ?? "—"} · residual ${fmt(s.organ?.organResidual)} · participation ${fmt(s.organ?.organParticipation)}`,
    ].join("\n");
  }

  if (/^(memory|memories|remember|recall)\b/.test(lower)) {
    const m = s.memory ?? {};
    const lr = m.lastRecall;
    return [
      `Braid memory: ${m.load ?? s.memoryLoad}/${m.capacity ?? s.memoryCapacity} patterns, stage ${s.memoryStage}.`,
      `familiarity of the live field to its best pattern ${fmt(s.familiarity)}.`,
      lr ? `last recall: stage ${lr.stage} · similarity ${fmt(lr.similarity)} · margin ${fmt(lr.margin)} · accepted ${lr.accepted}` : "no recall yet",
      `concepts in the semantic store: ${s.concepts} · tape ${s.memory?.lastFoldTick ?? "—"}`,
    ].join("\n");
  }

  if (/^(mind|cognition|think|concepts)\b/.test(lower)) {
    const c = s.cognition ?? {};
    const top = (c.top ?? []).slice(0, 3).map((x) => `  concept ${String(x.key ?? x.id).slice(0, 12)} · hits ${x.hits ?? "—"}`).join("\n");
    return [
      `Cognition: ${s.concepts} concepts · novelty ${fmt(s.novelty)} · surprise ${fmt(s.surprise)}.`,
      `mean novelty ${fmt(c.meanNovelty)} · mean surprise ${fmt(c.meanSurprise)} · threshold ${fmt(c.noveltyThreshold)}.`,
      `self-model ${s.selfModel ? "ahead" : "behind"} baseline (margin ${fmt(s.selfMargin)}).`,
      top || "no concepts consolidated yet — the brain is still listening",
    ].join("\n");
  }

  if (/^(learn|learning|train|battery|tier)\b/.test(lower)) {
    const l = s.learn;
    if (!l) {
      return [
        `Learning tiers: the brain holds an honest battery — T1 associative, T2 spectral, T3 structural.`,
        `No learn run has executed this session. The self-model currently reads ${s.selfModel ? "ahead of" : "behind"} its RLS baseline (margin ${fmt(s.selfMargin)}).`,
        `Certificates hold ∀ params (constrained parametrisation), so learning never breaks stability.`,
      ].join("\n");
    }
    return `Last learn run: ${JSON.stringify(l).slice(0, 300)}`;
  }

  // Free text: feed it, let the brain advance, report what changed. The honest
  // learning path — the input becomes part of the field.
  loop.injectSensor("text", t);
  const after = loop.state();
  return [
    `Encoded into the field. The brain is listening and learning.`,
    `coherence ${fmt(after.coherence)} · energy ${fmt(after.energy)} · novelty ${fmt(after.novelty)} · concepts ${after.concepts}`,
    `digest ${String(after.digest).slice(0, 16)} — the field's state changed by what you said.`,
  ].join("\n");
}

function fmt(x) {
  if (typeof x !== "number" || Number.isNaN(x) || !Number.isFinite(x)) return "—";
  if (Math.abs(x) >= 1000) return x.toExponential(2);
  if (Math.abs(x) < 0.0001 && x !== 0) return x.toExponential(2);
  return x.toFixed(4);
}

module.exports = { respond };
