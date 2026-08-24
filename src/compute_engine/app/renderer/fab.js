/**
 * METATRON Ω — FAB dock: ⏻ brain wake/sleep   Σ telemetry   🎙 mic   📷 camera
 * Every state shown comes from the main process (omega.state() → HostSnapshot +
 * the host's structural views). Six decks: BRAIN · LADDER · WEB · SPECTRAL ·
 * MEMORY · MIND. The buttons never fake activity — a failed toggle flashes the
 * error style. Nothing here is canned; every number is computed live.
 */
"use strict";

(() => {
  const btnEngine = document.getElementById("fab-engine");
  const btnStab = document.getElementById("fab-stab");
  const btnMic = document.getElementById("fab-mic");
  const btnCam = document.getElementById("fab-cam");
  const panel = document.getElementById("stab");
  const panelBody = document.getElementById("stab-body");
  const camprev = document.getElementById("camprev");
  const camvideo = document.getElementById("camvideo");

  let stabTimer = null;
  let deck = "brain";

  const DECKS = ["brain", "ladder", "web", "spectral", "memory", "mind"];

  const flashError = (btn, reason) => {
    btn.classList.add("error");
    btn.title = reason;
    setTimeout(() => btn.classList.remove("error"), 2600);
  };

  const bar = (v) =>
    `<div class="stab-bar"><div style="width:${Math.round(Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0)) * 100)}%"></div></div>`;
  const row = (k, v) => `<div class="stab-row"><span>${k}</span><b>${v}</b></div>`;
  const sec = (t) => `<div class="stab-sec">${t}</div>`;
  const sci = (x) => (typeof x !== "number" || !Number.isFinite(x) ? "—" : x === 0 ? "0" : Math.abs(x) < 0.001 || Math.abs(x) >= 1000 ? x.toExponential(2) : x.toFixed(4));

  // ── Deck renderers — each reads only the live snapshot `s` ────────────────

  function deckBrain(s) {
    return [
      row("brain", s.running ? "AWAKE" : "ASLEEP"),
      row("profile", s.profile ?? "—"),
      row("ticks", String(s.ticks ?? 0)),
      row("tick rate / bus", `${sci(s.tickRate)} / ${sci(s.busHz)} Hz`),
      row("uptime", `${((s.uptimeMs ?? 0) / 1000).toFixed(1)} s`),
      row("rungs / nodes", `${(s.rungs ?? []).length} / ${s.totalNodes ?? "—"}`),
      row("digest", String(s.digest ?? "—").slice(0, 16)),
      row("finite", String(s.finite)),
      sec("INVARIANTS (computed live)"),
      row("coherence", sci(s.coherence)), bar(s.coherence),
      row("energy", sci(s.energy)), bar(Math.min(1, (s.energy ?? 0) / Math.max(1, s.totalNodes ?? 1))),
      row("flux moved", sci(s.fluxMoved)),
      row("flux imbalance", sci(s.fluxImbalance)),
      row("ordering violations", String(s.orderingViolations ?? 0)),
      row("row-sum defect", sci(s.rowSumDefect)),
      row("worst octave ratio", sci(s.worstEnergyRatio)),
      sec("SENSE"),
      row("channels live", String(s.senseChannels ?? 0)),
      row("sense peak", sci(s.sensePeak)),
      ...(s.sense?.report ? [
        row("loop gain", sci(s.sense.report.loopGain)),
        row("within bound", String(s.sense.report.withinBound)),
        row("max peak", sci(s.sense.report.maxPeak)),
      ] : []),
    ].join("");
  }

  function deckLadder(s) {
    const d = s.describe?.rungs ?? [];
    if (!d.length) return row("ladder", "no structural view yet — wake the brain");
    return [
      sec(`DENSE CORE — ${d.length} stable rungs (structural truth)`),
      ...d.map((r) =>
        row(
          `n=${r.n} · ${r.nodes} nodes`,
          `logR ${sci(r.logRadius)} · qrf ${sci(r.qrf)} · emitted ${sci(r.emitted)}`,
        ),
      ),
      sec("LIVE COHERENCE"),
      ...(s.rungs ?? []).map((r) =>
        row(`n=${r.n}`, `coh ${sci(r.coherence)} ${r.warm ? "· warm" : "· cold"} · ${r.regime}`),
      ),
    ].join("");
  }

  function deckWeb(s) {
    const w = s.web;
    if (!w) return row("web", "the flux web has not ticked yet — wake the brain");
    const entries = (w.entries ?? []).slice(-8);
    return [
      row("web tick", String(w.tick ?? "—")),
      row("turnover", sci(w.turnover)),
      row("sink", sci(w.sink)),
      row("imbalance", sci(w.imbalance)),
      row("net imbalance", sci(w.netImbalance)),
      row("ordering violations", String(w.orderingViolations ?? 0)),
      sec("NET FLUX PER RUNG"),
      ...(w.net ?? []).map((v, i) => row(`rung ${i}`, sci(v))),
      sec("RECENT LEDGER ENTRIES"),
      ...(entries.length
        ? entries.map((e) => row(`t${e.tick}`, `rung ${e.from} → ${e.to < 0 ? "sink" : e.to} · ${sci(e.amount)}`))
        : [row("ledger", "no entries yet")]),
    ].join("");
  }

  function deckSpectral(s) {
    const sp = s.spectral;
    if (!sp) return row("spectral", "no spectral view yet — wake the brain");
    const sig = sp.signature ?? [];
    const maxSig = Math.max(...sig.map((v) => Math.abs(v)), 1e-12);
    return [
      row("rung", `n=${sp.n} · rank ${sp.rank}`),
      row("shell points", String(sp.shellPoints ?? "—")),
      row("source", sp.source ?? "—"),
      sec("13-MODE TRANSCRIPTION SIGNATURE"),
      `<div class="eig-spec">${sig
        .map((v, i) => {
          const h = Math.max(2, Math.round((Math.abs(v) / maxSig) * 44));
          const hot = i === 0 ? " eig-hot" : "";
          return `<div class="eig-bar${hot}" style="height:${h}px" title="k${i} = ${sci(v)}"></div>`;
        })
        .join("")}</div>`,
      ...sig.slice(0, 13).map((v, i) => row(`k${i}`, sci(v))),
      sec("ORGANS (per-node observers)"),
      row("organ nodes", String(s.organ?.organNodes ?? "—")),
      row("eigenmode residual", sci(s.organ?.organResidual)),
      row("participation", sci(s.organ?.organParticipation)),
    ].join("");
  }

  function deckMemory(s) {
    const m = s.memory ?? {};
    const lr = m.lastRecall;
    const pats = m.patterns ?? [];
    return [
      row("braid memory", `${m.load ?? s.memoryLoad}/${m.capacity ?? s.memoryCapacity} · ${s.memoryStage}`),
      row("β (hopfield temp)", sci(m.beta)),
      row("stored / skipped", `${m.stored ?? 0} / ${m.skipped ?? 0}`),
      row("last fold tick", String(m.lastFoldTick ?? "—")),
      row("familiarity", sci(s.familiarity)),
      ...(lr
        ? [
            sec("LAST RECALL"),
            row("stage", lr.stage ?? "—"),
            row("similarity", sci(lr.similarity)),
            row("margin", sci(lr.margin)),
            row("accepted", String(lr.accepted)),
            row("sweeps", String(lr.sweeps ?? 0)),
          ]
        : [row("recall", "none yet")]),
      sec(`PATTERNS HELD (${pats.length})`),
      ...(pats.length
        ? pats.slice(0, 8).map((p) => row(`#${p.index} · ${p.nodes} nodes`, `energy ${sci(p.energy)} · stored t${p.storedAt}`))
        : [row("patterns", "none consolidated yet — the brain is listening")]),
      sec("TAPE (permanent processing)"),
      row("tape occupancy", `${s.memory?.tapeOccupancy ?? "—"}`),
    ].join("");
  }

  function deckMind(s) {
    const c = s.cognition ?? {};
    const top = c.top ?? [];
    const recent = c.recent ?? [];
    return [
      row("concepts", String(s.concepts ?? 0)),
      row("novelty", sci(s.novelty)),
      row("surprise", sci(s.surprise)),
      row("mean novelty", sci(c.meanNovelty)),
      row("mean surprise", sci(c.meanSurprise)),
      row("novelty threshold", sci(c.noveltyThreshold)),
      row("self-model", `${s.selfModel ? "ahead" : "behind"} baseline (${sci(s.selfMargin)})`),
      sec("LEARN"),
      row("learn state", s.learn ? "run recorded" : "no learn run this session"),
      sec(`TOP CONCEPTS (${top.length})`),
      ...(top.length
        ? top.slice(0, 6).map((x) => row(`concept ${String(x.key ?? x.id).slice(0, 12)}`, `hits ${x.hits ?? "—"} · level ${x.level ?? "—"}`))
        : [row("concepts", "none consolidated yet")]),
      sec(`RECENT FOLDS (${recent.length})`),
      ...(recent.length
        ? recent.slice(-5).map((x) => row(`t${x.tick}`, `${x.action ?? "fold"} · novelty ${sci(x.novelty)} · ${x.source ?? ""}`))
        : [row("folds", "none yet")]),
    ].join("");
  }

  const RENDER = { brain: deckBrain, ladder: deckLadder, web: deckWeb, spectral: deckSpectral, memory: deckMemory, mind: deckMind };

  function renderState(s) {
    btnEngine.classList.toggle("active", s.running);
    if (panel.classList.contains("hidden")) return;
    panelBody.innerHTML = `
      <div class="deck-tabs">${DECKS.map(
        (d) => `<a href="#" class="deck-tab${d === deck ? " active" : ""}" data-deck="${d}">${d.toUpperCase()}</a>`,
      ).join("")}</div>
      <div class="deck-body">${RENDER[deck](s)}</div>`;
  }

  panelBody.addEventListener("click", (e) => {
    const tab = e.target.closest(".deck-tab");
    if (!tab) return;
    e.preventDefault();
    deck = tab.dataset.deck;
    void refreshState();
  });

  async function refreshState() {
    try {
      renderState(await window.omega.state());
    } catch { /* main busy — next poll retries */ }
  }

  btnEngine.addEventListener("click", async () => {
    try {
      const s = await window.omega.state();
      renderState(s.running ? await window.omega.stop() : await window.omega.start());
    } catch (err) {
      flashError(btnEngine, `brain control failed: ${err}`);
    }
  });

  btnStab.addEventListener("click", () => {
    const opening = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    btnStab.classList.toggle("active", opening);
    if (opening) {
      void refreshState();
      stabTimer = setInterval(refreshState, 500);
    } else if (stabTimer) {
      clearInterval(stabTimer);
      stabTimer = null;
    }
  });

  btnMic.addEventListener("click", async () => {
    const mic = window.AvaSensors.MicSensor;
    try {
      if (mic.active) {
        await mic.stop();
        btnMic.classList.remove("active");
        btnMic.title = "microphone";
      } else {
        await mic.start((energy, band) => {
          btnMic.style.boxShadow = `0 0 ${8 + energy * 60}px rgba(0,230,107,${0.3 + Math.min(0.6, energy * 2)})`;
          btnMic.title = `mic live · φ-band ${band} · energy ${energy.toExponential(2)}`;
        });
        btnMic.classList.add("active");
      }
    } catch (err) {
      flashError(btnMic, `mic unavailable: ${err && err.message ? err.message : err}`);
    }
  });

  btnCam.addEventListener("click", async () => {
    const cam = window.AvaSensors.CamSensor;
    try {
      if (cam.active) {
        await cam.stop(camvideo);
        btnCam.classList.remove("active");
        btnCam.title = "camera";
        camprev.classList.add("hidden");
      } else {
        await cam.start(camvideo, (mean) => {
          btnCam.style.boxShadow = `0 0 ${8 + mean * 30}px rgba(0,230,107,${0.3 + mean * 0.4})`;
          btnCam.title = `camera live · mean luminance ${mean.toFixed(3)}`;
        });
        btnCam.classList.add("active");
        if (cam.deviceLabel) btnCam.title = `camera live · ${cam.deviceLabel}`;
        camprev.classList.remove("hidden");
      }
    } catch (err) {
      const name = err && err.name ? err.name : "";
      const msg = err && err.message ? err.message : String(err);
      const friendly = name === "NotReadableError"
        ? `camera busy — held by another app (${msg})`
        : `camera unavailable: ${msg}`;
      flashError(btnCam, friendly);
    }
  });

  // sync the buttons with the true states at load
  void refreshState();
})();
