/**
 * METATRON Ω — the answer path. The brain answers by COMPUTING over live input.
 * Meta-questions are read from the live HostSnapshot + the host's structural
 * views (describe / web / spectral / memory / cognition / learn). Free text is
 * encoded into the sensory plane and the brain advances — the honest learning
 * path. Nothing is canned.
 */
"use strict";

const PHI = (1 + Math.sqrt(5)) / 2; // φ-power ladder base (Ω-P9 / GEMATRIA_ALPHABET)

/**
 * φ-gematria: char → alphabet index k → value φ^(k/2).
 * Alphabet (28-fold, certified): a–z → 0..25, space → 26, any other symbol → 27.
 * Deterministic; matches encodeText's meaning-channel ladder exactly.
 */
function gematriaValue(word) {
  const chars = Array.from(String(word ?? "").normalize("NFKD").toLowerCase().replace(/\s+/g, " ").trim());
  const rows = chars.map((ch) => {
    const cp = ch.codePointAt(0);
    let k = 27;
    if (cp >= 0x61 && cp <= 0x7a) k = cp - 0x61;
    else if (cp === 0x20) k = 26;
    const v = Math.pow(PHI, k / 2);
    return { ch, k, v };
  });
  const total = rows.reduce((a, r) => a + r.v, 0);
  return { rows, total };
}

/**
 * gematria search: refined semantic recall over the HOST's word lexicon + relation
 * graph via the certified resonantRecall (φ-anchored similarity + honest φ⁻¹ floor
 * + attached relation processes). Observe-only; the host does the encoding.
 */
async function gematriaSearch(loop, target) {
  const hits = await loop.recallSimilar(target, 8, -1);
  if (!hits.length) return `gematria search "${target}" — no lexicon match above the φ⁻¹ floor (feed the brain text first).`;
  const rows = hits.map((h) => {
    const procs = h.processes && h.processes.length ? `  (${h.processes.map((e) => `${e.target}[${e.type}]`).join(", ")})` : "";
    return `${h.key}  ${(100 * h.similarityPct).toFixed(1)}%${procs}`;
  });
  return [`gematria search "${target}" — nearest lexicon atoms (φ-codec refined recall):`, ...rows].join("\n");
}

/**
 * @param {import("./omegaLoop.cjs").OmegaLoop} loop
 * @param {string} text
 */
async function respond(loop, text) {
  const t = String(text ?? "").trim();
  if (!t) return "…";
  const lower = t.toLowerCase();
  const s = await loop.state();

  if (/^(help|what can you do|commands|capabilities)\b/.test(lower)) {
    return [
      "I am METATRON Ω — a toroidal RHUFT brain: 18-rung dense core, deterministic, certified.",
      "LIVE STATE:  status · ladder · web · spectral · memory · mind · learn",
      "MEMORY (7 systems): braid(attractor) · associative(FHRR) · concepts(HNSW) · project(deep) · genome(sealed) · lexicon(salience) · tape(permanent)",
      "MEASURES:  resonance · depth/importance · friction · qualia · self-measure(Lyapunov) · fingerprint",
      "Or just talk — every word is φ-gematria encoded (φ^k/2 per character) into my field and I learn from it.",
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
      `Braid (attractor): ${m.load ?? s.memoryLoad}/${m.capacity ?? s.memoryCapacity} patterns · stage ${s.memoryStage} · familiarity ${fmt(s.familiarity)}`,
      lr ? `  last recall: ${lr.stage} · similarity ${fmt(lr.similarity)} · margin ${fmt(lr.margin)}` : "  no recall yet",
      `Associative (FHRR): ${s.associativeSize ?? 0} prototypes · resonance ${fmt(s.resonance)}${s.resonanceGated ? " (gated)" : ""}`,
      `Concepts (HNSW): ${s.concepts} · novelty ${fmt(s.novelty)} · surprise ${fmt(s.surprise)}`,
      `Project (deep): ${s.projectSize ?? 0} members · mean depth ${fmt(s.projectMeanDepth)}`,
      `Genome (sealed): ${s.genomeSize ?? 0} records · ${s.genomeCycles ?? 0} cycles`,
      `Lexicon (salience): ${s.lexiconSize ?? 0} words · ${s.lexiconTokens ?? 0} tokens`,
      `Depth/importance: ${fmt(s.depth)}`,
    ].join("\n");
  }

  if (/^(structure|terms|relations|words|lexicon)\b/.test(lower)) {
    const lex = s.lexicon ?? {};
    const top = (lex.top ?? []).slice(0, 5)
      .map((e) => `${e.word}(${fmt(e.salience)})`)
      .join(", ") || "none yet — talk to me and I'll structure what you say";
    const rel = s.relations ?? {};
    const edges = (rel.edges ?? []).slice(0, 8)
      .map((e) => `${e.source}→${e.target}[${e.type}]`)
      .join("  ") || "none yet";
    return [
      `Structure: ${lex.size ?? s.lexiconSize ?? 0} words · ${lex.tokens ?? s.lexiconTokens ?? 0} tokens · ${rel.nodes ?? 0} relation nodes.`,
      `Most salient terms (tf·idf in log φ): ${top}`,
      `Word-order edges: ${edges}`,
      `Merkle root (integrity): ${s.relationDigest ? String(s.relationDigest).slice(0, 16) : "none yet"}`,
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

  if (/^gematria\b/.test(lower)) {
    const rest = t.replace(/^gematria\b/i, "").trim();
    const search = rest.match(/^search\s+(.+)$/i);
    if (search) return await gematriaSearch(loop, search[1].trim());
    if (!rest) {
      return [
        "gematria <word> — φ-power ladder value φ^(k/2) of each character (a–z→0..25, space→26, other→27) and the total Σ.",
        "gematria search <word> — nearest lexicon neighbors by φ-codec cosine similarity.",
      ].join("\n");
    }
    const g = gematriaValue(rest);
    const per = g.rows.map((r) => `${r.ch}(k=${r.k})=${r.v.toFixed(4)}`).join(" · ");
    return [
      `φ-gematria "${rest}" (28-fold alphabet, v_k = φ^(k/2)):`,
      per,
      `Σ = ${g.total.toFixed(6)}`,
    ].join("\n");
  }

  if (/^report\b/.test(lower)) {
    const lex = s.lexicon ?? {};
    const rel = s.relations ?? {};
    return JSON.stringify(
      {
        profile: s.profile,
        running: s.running,
        ticks: s.ticks,
        coherence: s.coherence,
        resonance: s.resonance,
        depth: s.depth,
        familiarity: s.familiarity,
        novelty: s.novelty,
        surprise: s.surprise,
        lexicon: {
          size: lex.size ?? s.lexiconSize ?? 0,
          salient: (lex.top ?? []).slice(0, 20).map((e) => ({ word: e.word, salience: Number((e.salience ?? 0).toFixed(4)) })),
        },
        relations: {
          nodes: rel.nodes ?? 0,
          edges: (rel.edges ?? []).map((e) => ({ source: e.source, target: e.target, type: e.type })),
        },
        merkleRoot: s.relationDigest ? String(s.relationDigest) : null,
        project: { size: s.projectSize ?? 0, meanDepth: s.projectMeanDepth ?? null },
        genome: { size: s.genomeSize ?? 0, cycles: s.genomeCycles ?? 0 },
      },
      null,
      2,
    );
  }

  if (/^reflect\b/.test(lower)) {
    const r = s.reflect ?? {};
    const labels = (r.associativeLabels ?? []).slice(-12);
    return [
      "Reflection — deepest stored patterns:",
      `project ${r.projectSize ?? 0} deep members (mean depth ${fmt(r.projectMeanDepth)})`,
      `associative ${r.associativeSize ?? 0} prototypes`,
      labels.length ? `labels: ${labels.join(", ")}` : "no associative labels yet",
      "`seal` writes the project's accumulated shape into the sealed genome.",
    ].join("\n");
  }

  if (/^seal\b/.test(lower)) {
    const leaf = await loop.seal();
    return leaf > 0
      ? `Sealed the project (${s.projectSize ?? 0} members, mean depth ${fmt(s.projectMeanDepth)}) into the genome — leaf #${leaf}.`
      : "The project is empty — nothing to seal. Feed the brain deep input first.";
  }

  if (/^hardware\b/.test(lower)) {
    const h = await loop.hardware();
    const NL = String.fromCharCode(10);
    const rows = h.governor.table.map((v) => {
      const mem = v.memoryLoad === null ? "" : " memory " + (100 * v.memoryLoad).toFixed(0) + "%";
      const fit = v.fits ? "fits" : "rejected(" + v.reason + ")";
      return v.id + " " + fit + " compute " + (100 * v.computeLoad).toFixed(0) + "%" + mem;
    }).join(NL);
    return [
      "Hardware (measured): " + h.cores + " cores \u00b7 " + (h.memoryBytes / 1e9).toFixed(1) + " GB RAM",
      "throughput " + h.throughput.workUnitsPerSecond.toExponential(2) + " work-units/s \u00b7 " + h.throughput.msPerTick.toFixed(3) + " ms/tick \u00b7 jitter " + h.throughput.jitter.toFixed(3),
      "governor: " + h.governor.selected + " @ " + h.governor.targetHz + " Hz (max " + h.governor.maxHz.toFixed(1) + " Hz, " + (h.governor.degraded ? "degraded" : "headroom " + Math.round(100 * h.governor.headroom) + "%") + ")",
      rows,
    ].join(NL);
  }

  if (/^deepresolution\b/.test(lower)) {
    const dr = (await loop.state()).deepResolution;
    const NL = String.fromCharCode(10);
    if (!dr || !dr.latest) {
      return "deep-resolution tap: " + (dr ? dr.size : 0) + "/" + (dr ? dr.capacity : 233) +
        " frames. Step the brain past the first MIND_STRIDE boundary.";
    }
    const f = dr.latest;
    const energy = Array.from(f.energy).map((x) => x.toFixed(3)).join(" ");
    const peak = Array.from(f.peak).map((x) => x.toFixed(3)).join(" ");
    const occ = Array.from(f.occupancy);
    const occupied = occ.reduce((n, x) => n + (x > 0 ? 1 : 0), 0);
    return [
      "deep-resolution tap: " + dr.size + "/" + dr.capacity + " frames (latest tick " + f.tick + ")",
      "energy[rung] " + energy,
      "peak[rung] " + peak,
      "base-rung node freq: mean " + f.meanFrequency.toFixed(4) + " cycles/tick · peak " + f.peakFrequency.toFixed(4),
      "spectral occupancy " + occupied + "/" + occ.length + " bands latched · closure defect " + f.closureDefect.toExponential(2),
    ].join(NL);
  }

  // Free text: feed it, let the brain advance, report what changed. The honest
  // learning path — the input becomes part of the field. The brain is stepped
  // synchronously after the injection so the reported state is AFTER the input
  // landed (reading pre-tick state would return the previous frame's numbers,
  // identical across rapid prompts — that was the "brain doesn't respond" defect).
  const before = await loop.state();
  await loop.injectSensor("text", t);
  const stepped = typeof loop.step === "function" ? await loop.step() : 0;
  const after = await loop.state();
  if (!stepped && !after.running) {
    return [
      "Encoded into the sensory plane. The brain is asleep — wake it (⏻) and your words are read on its first tick.",
      `profile ${after.profile} · ${after.rungs.length} rungs · ${after.totalNodes} nodes standing by · memory ${after.memoryLoad}/${after.memoryCapacity}.`,
    ].join("\n");
  }
  const changed = String(after.digest) !== String(before.digest);
  return [
    `Encoded into the field. The brain is listening and learning.`,
    `coherence ${fmt(after.coherence)} · energy ${fmt(after.energy)} · novelty ${fmt(after.novelty)} · concepts ${after.concepts}`,
    changed
      ? `digest ${String(after.digest).slice(0, 16)} — the field's state changed by what you said.`
      : `digest ${String(after.digest).slice(0, 16)} — one tick did not move the digest; the input is in the plane and lands on the next stride.`,
  ].join("\n");
}

function fmt(x) {
  if (typeof x !== "number" || Number.isNaN(x) || !Number.isFinite(x)) return "—";
  if (Math.abs(x) >= 1000) return x.toExponential(2);
  if (Math.abs(x) < 0.0001 && x !== 0) return x.toExponential(2);
  return x.toFixed(4);
}

module.exports = { respond };
