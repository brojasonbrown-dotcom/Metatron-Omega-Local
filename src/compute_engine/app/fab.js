/**
 * AVA FAB dock — the four floating controls:
 *   ⏻ engine start/stop   Σ framework-stability panel   🎙 mic   📷 camera
 * Every state shown comes from the main process (engineLoop.state()); the
 * buttons never fake activity — a failed toggle flashes the error style.
 */
"use strict";

(() => {
  const btnEngine = document.getElementById("fab-engine");
  const btnMind = document.getElementById("fab-mind");
  const btnStab = document.getElementById("fab-stab");
  const btnMic = document.getElementById("fab-mic");
  const btnCam = document.getElementById("fab-cam");
  const panel = document.getElementById("stab");
  const panelBody = document.getElementById("stab-body");
  const camprev = document.getElementById("camprev");
  const camvideo = document.getElementById("camvideo");

  let stabTimer = null;
  let mindStatus = null; // last status() snapshot
  let lastEngineState = null; // last engine.state() — lets a mind push re-render
  const mindInfo = () => (mindStatus && mindStatus.info) || {};

  const flashError = (btn, reason) => {
    btn.classList.add("error");
    btn.title = reason;
    setTimeout(() => btn.classList.remove("error"), 2600);
  };

  const bar = (v) =>
    `<div class="stab-bar"><div style="width:${Math.round(Math.min(1, Math.max(0, v)) * 100)}%"></div></div>`;
  const row = (k, v) => `<div class="stab-row"><span>${k}</span><b>${v}</b></div>`;
  const sci = (x) => (x === 0 ? "0" : x.toExponential(2));

  function renderState(s) {
    btnEngine.classList.toggle("active", s.running);
    if (panel.classList.contains("hidden")) return;
    // The K3 key field is live-editable; a 500ms innerHTML rebuild would destroy
    // it mid-type. Snapshot its value/focus/selection before the rebuild and
    // restore it after, so typing in it is never interrupted.
    const prevKey = panelBody.querySelector("#k3-key");
    const keyState = prevKey
      ? { value: prevKey.value, focused: document.activeElement === prevKey, sel: [prevKey.selectionStart, prevKey.selectionEnd] }
      : null;
    const inv = s.invariants;
    const c = s.certificates;
    const rf = s.refinement; // live adaptive-mesh snapshot (Phases 1-4)
    panelBody.innerHTML = [
      row("loop", s.running ? "RUNNING" : "STOPPED"),
      row("ticks", String(s.ticks)),
      row("uptime", `${(s.uptimeMs / 1000).toFixed(1)} s`),
      row("nodes / ν", `${s.nodes} / ${s.courant.toFixed(3)}`),
      `<div class="stab-row"><span>resolution</span><b id="res-switch">` +
        (s.resolutionLadder || [s.nodes]).map((n) =>
          n === s.nodes
            ? `<span class="res-cur">${n}</span>`
            : `<a href="#" class="res-opt" data-n="${n}">${n}</a>`,
        ).join(" · ") +
        `</b></div>`,
      `<div class="stab-sec">INVARIANTS (computed live)</div>`,
      row("coherence", inv.coherence.toFixed(6)), bar(inv.coherence),
      row("closure defect", sci(inv.closure)), bar(inv.closure),
      // drift bar = fraction of the measured 1e-3 certificate bound (30k-tick
      // saturation is ~4e-4) — the honest scale, not a saturated 100%
      row("drift", sci(inv.drift)), bar(Math.min(1, inv.drift / 1e-3)),
      ...(typeof inv.driftSigned === "number"
        ? [row("drift dir", (inv.driftSigned >= 0 ? "+" : "-") + sci(Math.abs(inv.driftSigned)) + (inv.driftSigned >= 0 ? " (gain)" : " (loss)"))]
        : []),
      ...(typeof inv.burdenPerNode === "number"
        ? [row("burden/node", inv.burdenPerNode.toFixed(4)), bar(Math.min(1, inv.burdenPerNode))]
        : [row("burden raw", inv.burden.toFixed(4)), bar(Math.min(1, inv.burden / 1000))]),
      // DRIFT/BURDEN HEALTH SCAN — the "is it actually at rest?" verdict. This
      // is the section that flags the pairing the operator cares about: drift
      // large + burden huge + coherence pinned at 1.0000 = a secular blow-up
      // that phase-lock (coherence) is structurally blind to. Computed in main.
      ...(s.health
        ? (() => {
            const h = s.health;
            const alertOn = h.level === "blowup" || h.level === "drifting";
            return [
              `<div class="stab-sec">DRIFT / BURDEN SCAN</div>`,
              `<div class="stab-health"><span class="lvl ${h.level}">${h.code}</span><span class="why">coherence ${inv.coherence.toFixed(4)}</span></div>`,
              row("energy gain", h.ratio !== null && h.ratio < 1e300 ? `×${h.ratio.toExponential(2)}` : "≫1e300×"),
              `<div class="stab-alert ${alertOn ? "" : "calm"}">${h.headline}</div>`,
              `<div class="stab-note">${h.detail}</div>`,
            ];
          })()
        : []),
      `<div class="stab-sec">SENSOR DRIVES</div>`,
      row("audio drive", sci(s.drives.audio)), bar(s.drives.audio),
      row("vision drive", sci(s.drives.vision)), bar(s.drives.vision),
      `<div class="stab-sec">CERTIFICATES (exact)</div>`,
      row("λ = φ⁻²", c.lambda.toFixed(9)),
      row("roots", `{${c.roots[0]}, ${c.roots[1].toFixed(6)}}`),
      row("conservative", String(c.conservative)),
      row("ν limit / boundary", `${c.cflLimit} / ${c.cflBoundary.toFixed(3)}`),
      // REFINEMENT — the live adaptive mesh (Phases 1-4). Guarded: an old
      // bundle without refinement telemetry degrades to an honest dash, never
      // a fabricated zero.
      ...(rf
        ? [
            `<div class="stab-sec">REFINEMENT (adaptive mesh)</div>`,
            row("mesh leaves / depth", `${rf.leaves} / ${rf.depth}`),
            row("mesh nodes", String(rf.nodes)),
            row("max curvature λ", sci(rf.maxLambda)),
            row("refined / coarsened", `${rf.refined} / ${rf.coarsened}`),
            row("prolong residual", sci(rf.conservationResidual)),
            // The two transfer directions, each measured live: prolongation =
            // refine (parent→child), restriction = coarsen (child→parent, the
            // Phase-4 Galerkin adjoint). Both conserve Σ to ~1e-16 when exact.
            // Guarded: an old bundle without restriction telemetry degrades to
            // an honest dash, never a fabricated zero.
            ...(typeof rf.restrictionResidual === "number"
              ? [row("restrict residual", sci(rf.restrictionResidual))]
              : [row("restrict residual", "— no telemetry —")]),
            row("thresholds φ⁻² / φ⁻⁴", `${rf.refineThreshold.toFixed(3)} / ${rf.coarsenThreshold.toFixed(3)}`),
          ]
        : [`<div class="stab-sec">REFINEMENT (adaptive mesh)</div>`, row("mesh", "— no telemetry —")]),
      // SUPER-RESOLUTION EIGENMODES — the live DFT spectrum of the ring field,
      // rendered as φ-weighted spectral lines (the structure resolved below the
      // grid). Guarded behind telemetry; degrades to an honest dash.
      ...(s.spectrum && Array.isArray(s.spectrum.modes)
        ? (() => {
            const sp = s.spectrum;
            const maxE = Math.max(...sp.modes.map((m) => m.energy), 1e-12);
            const barsHtml = sp.modes
              .map((m) => {
                const h = Math.max(2, Math.round((m.energy / maxE) * 44));
                const hot = m.k === sp.dominantK ? " eig-hot" : "";
                return `<div class="eig-bar${hot}" style="height:${h}px" title="k=${m.k} · E=${m.energy.toExponential(2)} · λ=${m.eigenvalue.toFixed(3)}"></div>`;
              })
              .join("");
            return [
              `<div class="stab-sec">EIGENMODES (super-resolution)</div>`,
              row("dominant mode k", String(sp.dominantK)),
              row("parseval residual", sci(sp.parsevalResidual)),
              `<div class="eig-spec">${barsHtml}</div>`,
            ];
          })()
        : []),
      // MESH NODES — the REAL adaptive-mesh leaf geometry as a 2D scatter over
      // the torus domain (u → angle, v → radius). Every dot is a live leaf at
      // its true (u,v); colour intensity tracks its measured curvature λ.
      ...(rf && Array.isArray(rf.leafNodes) && rf.leafNodes.length
        ? (() => {
            const TWO_PI = 2 * Math.PI;
            const C = 60; // canvas centre / half-size (SVG 120×120)
            const maxL = Math.max(...rf.leafNodes.map((l) => l.lambda), 1e-9);
            const pts = rf.leafNodes
              .map((l) => {
                const r = 8 + (l.v / TWO_PI) * (C - 12);
                const x = C + r * Math.cos(l.u);
                const y = C + r * Math.sin(l.u);
                const a = 0.25 + 0.75 * Math.min(1, l.lambda / maxL);
                const sz = Math.max(1.2, 3.2 - l.depth * 0.4);
                return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sz.toFixed(1)}" fill="rgba(0,230,107,${a.toFixed(2)})"/>`;
              })
              .join("");
            return [
              `<div class="stab-sec">MESH NODES (live · ${rf.leafNodes.length} leaves)</div>`,
              `<svg class="mesh-map" viewBox="0 0 120 120" width="120" height="120">${pts}</svg>`,
            ];
          })()
        : []),

      `<div class="stab-sec">MIND (v14 cognition)</div>`,
      row("state", mindStatus ? mindStatus.state : "stopped"),
      row("ticks", String(mindInfo().ticks ?? 0)),
      row("stable thoughts", String(mindInfo().stableThoughts ?? 0)),
      row("concepts", String(mindInfo().concepts ?? 0)),
      // Auto-scaling: the governor settles the fractal-tree depth on measured
      // tick cost; this is the honest live value (never modelled). The
      // operator can pin a force-depth floor here — a click rebuilds the tree
      // at that depth and the governor cannot shrink below it until released.
      ...(mindInfo().scaling
        ? (() => {
            const sc = mindInfo().scaling;
            const forced = Number.isInteger(sc.forceDepth) ? sc.forceDepth : null;
            // The selectable floors, honestly annotated by what this machine
            // measured in the stability oracle. A forced floor shows a badge.
            const opts = [6, 7, 8, 9].map((d) =>
              d === forced
                ? `<span class="res-cur scale-cur">${d}</span>`
                : `<a href="#" class="res-opt scale-opt" data-depth="${d}">${d}</a>`,
            ).join(" · ");
            const modeRow = forced !== null
              ? `<div class="stab-row"><span>mode</span><b><span class="scale-forced">FORCED ${forced}</span> · <a href="#" class="scale-auto">release to auto</a></b></div>`
              : `<div class="stab-row"><span>mode</span><b><span class="scale-auto-badge">AUTO</span> (governor-scaled)</b></div>`;
            return [
              `<div class="stab-sec">SCALING (fractal-tree depth)</div>`,
              row("depth / ceiling", `${sc.depth} / ${sc.maxDepth}`),
              modeRow,
              `<div class="stab-row"><span>force depth</span><b id="scale-switch">${opts}</b></div>`,
              `<div class="stab-note">6 light · 7 balanced · 8 max stable · 9 deep (slow)</div>`,
              row("engine nodes", String(sc.nodes)),
              row("tick cost (EMA)", `${(sc.emaTickMs ?? 0).toFixed(1)} ms`),
            ];
          })()
        : []),
      // P6-D — the learning-mode dial. The loop's consolidation governor is
      // flippable live: EFFICIENT defers replay, TRAINING re-injects, REPLAY
      // sweeps. Reflects mindInfo().learningMode, reported in every state
      // push — never modelled here.
      ...(mindInfo().learningMode
        ? (() => {
            const lm = mindInfo().learningMode;
            const cur = String(lm.mode || "EFFICIENT");
            const modes = ["EFFICIENT", "TRAINING", "REPLAY"].map((m) =>
              m === cur
                ? `<span class="res-cur mode-cur">${m}</span>`
                : `<a href="#" class="res-opt mode-opt" data-mode="${m}">${m}</a>`,
            ).join(" · ");
            return [
              `<div class="stab-sec">LEARNING MODE</div>`,
              `<div class="stab-row"><span>mode</span><b id="mode-switch">${modes}</b></div>`,
              row("reinjection", lm.reinjectionEnabled ? "on" : "off"),
              row("replay sweeps / defers", `${lm.replaySweeps ?? 0} / ${lm.replayDefers ?? 0}`),
              `<div class="stab-note">EFFICIENT defers replay · TRAINING re-injects · REPLAY sweeps</div>`,
            ];
          })()
        : []),
      ...(mindInfo().lexicon
        ? [row("lexicon", `${mindInfo().lexicon.words} words · ${mindInfo().lexicon.relations} relations`)]
        : []),
      row("ollama", mindInfo().ollama ?? (mindStatus && mindStatus.running ? "warming…" : "—")),
      row("restarts", String(mindStatus ? mindStatus.restarts : 0)),
      // M9 — the switchable language instrument: which model is answering, and
      // the honest switcher. Unavailable instruments render disabled with the
      // reason in their title — never hidden, never faked.
      ...renderInstrumentSection(),
    ].join("");
  // Restore the key field's value + focus + caret after the rebuild (see the
  // snapshot above) so a mid-render keystroke is never lost.
  if (keyState) {
    const nextKey = panelBody.querySelector("#k3-key");
    if (nextKey) {
      nextKey.value = keyState.value;
      if (keyState.focused) {
        nextKey.focus();
        try { nextKey.setSelectionRange(keyState.sel[0], keyState.sel[1]); } catch { /* not a text input */ }
      }
    }
  }
  }

  // The active instrument + the two toggle squares. Kimi (K3, the API-key
  // frontier instrument) and Ollama (local — carries the linguistics loops).
  // Either or both can be on; the most-recently-activated one answers and the
  // other stands by, and turning one off fails over to the other. No separate
  // active / power / key rows — the squares do it all.
  function renderInstrumentSection() {
    const inst = mindInfo().instrument;
    if (!inst) {
      return [`<div class="stab-sec">INSTRUMENT (language model)</div>`, row("instrument", "— no telemetry —")];
    }
    const avail = Array.isArray(inst.instruments) ? inst.instruments : [];
    const byId = {};
    for (const a of avail) byId[a.id] = a;
    const known = avail.length > 0;

    const ollamaOn = typeof inst.ollamaEnabled === "boolean"
      ? inst.ollamaEnabled
      : (byId.ollama && typeof byId.ollama.enabled === "boolean" ? byId.ollama.enabled : true);
    const k3HasKey = !!(byId.k3 && (typeof byId.k3.hasKey === "boolean" ? byId.k3.hasKey : byId.k3.available));

    // A square: on = lit + clickable (turns off), off = dim + clickable
    // (activates, or prompts for the K3 key when it has none).
    const square = (id, label, on) =>
      `<span class="inst-square ${on ? "on" : "off"}${inst.active === id ? " active" : ""}" data-power="${id}" ` +
        `title="${escapeAttr(
          id === "k3"
            ? (on ? "Kimi (K3) on — click to deactivate" : (k3HasKey ? "click to activate Kimi (K3)" : "no K3 key — paste one to enable"))
            : (on ? "Ollama on (linguistics loops) — click to cold-stop" : "click to cold-start Ollama (linguistics loops)")
        )}">${label}</span>`;

    const out = [
      `<div class="stab-sec">INSTRUMENT (language model)</div>`,
      `<div class="stab-row inst-squares">` +
        square("k3", "kimi", k3HasKey) +
        square("ollama", "ollama", ollamaOn) +
        // Inline K3 key entry - always present so the key can be SET the first
        // time and UPDATED later (one-way: the token is sent to the mind and
        // never read back). Placeholder + action label reflect the current state.
        `<span class="inst-keywrap"><input id="k3-key" type="password" ` +
            `placeholder="${k3HasKey ? "update KIMI_K3 token" : "paste KIMI_K3 token"}" ` +
            `autocomplete="off" spellcheck="false" />` +
            `<a href="#" id="k3-save" class="inst-set">${k3HasKey ? "update" : "set"}</a></span>` +
      `</div>`,
    ];

    // Ollama model picker — only while the local instrument is on.
    if (ollamaOn && known) {
      const models = byId.ollama && Array.isArray(byId.ollama.models) ? byId.ollama.models : [];
      if (models.length > 0) {
        const options = models
          .map((m) => `<option value="${escapeAttr(m)}"${m === inst.ollamaModel ? " selected" : ""}>${escapeHtml(m)}</option>`)
          .join("");
        out.push(
          `<div class="stab-row"><span>model</span><b><select id="inst-model" class="inst-select">${options}</select></b></div>`,
        );
      } else if (inst.ollamaModel) {
        out.push(row("model", inst.ollamaModel));
      }
    }
    return out;
  }

  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const escapeAttr = escapeHtml;

  async function refreshState() {
    try {
      const s = await window.ava.engine.state();
      lastEngineState = s;
      renderState(s);
      // Keep the mind section honest too — a missed event never leaves it stale.
      renderMind(await window.ava.mind.status());
    } catch { /* main busy — next poll retries */ }
  }

  btnMind.addEventListener("click", async () => {
    try {
      const s = await window.ava.mind.status();
      if (s.running) {
        renderMind(await window.ava.mind.stop());
      } else {
        if (!s.brainPresent) {
          flashError(btnMind, s.lastError ?? `mind unavailable (tried: ${(s.brainTried ?? []).join(" | ")})`);
          return;
        }
        btnMind.classList.add("active");
        renderMind(await window.ava.mind.start());
      }
    } catch (err) {
      flashError(btnMind, `mind control failed: ${err}`);
    }
  });

  function renderMind(s) {
    mindStatus = s;
    btnMind.classList.toggle("active", s.running);
    btnMind.title =
      s.state === "awake"
        ? `mind awake · ${mindInfo().stableThoughts ?? 0} thoughts · ${mindInfo().concepts ?? 0} concepts`
        : s.lastError ?? `mind ${s.state}`;
  }

  // The mind's stream of consciousness, as it happens.
  window.ava.mind.onEvent((f) => {
    if (f.type === "journal" && f.kind === "voice" && f.data && f.data.text) {
      addBubble(f.data.text, "mind");
    } else if (f.type === "journal" && f.kind === "thought" && f.data) {
      const d = f.data;
      addBubble(
        `ψ thought #${d.stableCount ?? "?"} stabilized [${(d.sources ?? []).join("+") || "internal"}]` +
          (Array.isArray(d.labels) && d.labels.length ? ` → ${d.labels.join(", ")}` : ""),
        "mind thought",
      );
      // keep the panel's counters live from the thought stream itself
      mindStatus = { ...(mindStatus || {}), running: true, state: "awake",
        info: { ...mindInfo(), stableThoughts: d.stableCount ?? mindInfo().stableThoughts } };
      btnMind.classList.add("active");
    } else if (f.type === "boot" && f.phase === "ollama") {
      mindStatus = { ...(mindStatus || {}), running: true, state: f.running ? "starting (models)" : "degraded",
        info: { ...mindInfo(), ollama: f.running ? f.baseUrl : null } };
    } else if (f.type === "boot" && f.phase === "awake") {
      addBubble("ψ mind awake — cognition online (v14 + ollama).", "sys");
      mindStatus = { ...(mindStatus || {}), running: true, state: "awake" };
      btnMind.classList.add("active");
    } else if (f.type === "boot") {
      // every other boot phase moves the panel honestly (starting/warming)
      mindStatus = { ...(mindStatus || {}), running: true, state: `starting (${f.phase})` };
    } else if (f.type === "fatal" || f.type === "error") {
      addBubble(`ψ ${f.where ?? "mind"}: ${f.message ?? f.text ?? "error"}`, "ava error");
    } else if (f.type === "mind.exit") {
      addBubble(`ψ mind sleeping (exit ${f.code}).`, "sys");
      void refreshMind();
    }
    // keep the panel honest without polling
    if (f.type === "state") {
      mindStatus = { ...(mindStatus || {}), running: true, state: "awake",
        info: { ...mindInfo(), ticks: f.ticks, stableThoughts: f.stableThoughts, concepts: f.concepts,
          ...(f.lexicon ? { lexicon: f.lexicon } : {}), ...(f.scaling ? { scaling: f.scaling } : {}) } };
      btnMind.classList.add("active");
      // The panel reads mindStatus on its own 500 ms poll — re-render now so the
      // open panel reflects this push immediately rather than a beat later.
      if (!panel.classList.contains("hidden")) {
        try { renderState({ ...(lastEngineState || {}), running: true }); } catch { /* engine state not cached yet */ }
      }
    }
  });

  async function refreshMind() {
    try {
      renderMind(await window.ava.mind.status());
    } catch { /* next poll retries */ }
  }

  // resolution switch (delegated — the panel re-renders every poll)
  panelBody.addEventListener("click", async (e) => {
    const opt = e.target.closest(".res-opt");
    if (!opt) return;
    e.preventDefault();
    try {
      renderState(await window.ava.engine.setNodes(Number(opt.dataset.n)));
    } catch (err) {
      flashError(btnEngine, `resolution switch failed: ${err}`);
    }
  });

  btnEngine.addEventListener("click", async () => {
    try {
      const s = await window.ava.engine.state();
      renderState(s.running ? await window.ava.engine.stop() : await window.ava.engine.start());
    } catch (err) {
      flashError(btnEngine, `engine control failed: ${err}`);
    }
  });

  btnStab.addEventListener("click", () => {
    const opening = panel.classList.contains("hidden");
    panel.classList.toggle("hidden");
    btnStab.classList.toggle("active", opening);
    if (opening) {
      void refreshState();
      void refreshInstrument(); // full availability probe for the switcher
      stabTimer = setInterval(refreshState, 500);
    } else if (stabTimer) {
      clearInterval(stabTimer);
      stabTimer = null;
    }
  });

  // Pull the full instrument availability (which Ollama models are installed,
  // which instruments are reachable) into the cached status, then re-render.
  async function refreshInstrument() {
    try {
      if (!mindStatus || !mindStatus.running) return;
      const r = await window.ava.mind.instrumentGet();
      if (r && r.ok) {
        mindStatus = { ...(mindStatus || {}), running: true, state: "awake",
          info: { ...mindInfo(), instrument: { active: r.active, ollamaModel: r.ollamaModel, ollamaEnabled: r.ollamaEnabled, instruments: r.instruments } } };
        if (!panel.classList.contains("hidden") && lastEngineState) {
          try { renderState(lastEngineState); } catch { /* engine state not cached yet */ }
        }
      }
    } catch { /* instrument unsupported on this build — panel shows dash */ }
  }

  // Ollama model picker — switch which installed model serves.
  panelBody.addEventListener("change", async (e) => {
    const sel = e.target.closest("#inst-model");
    if (!sel) return;
    try {
      const r = await window.ava.mind.instrumentSet("ollama", sel.value);
      if (r && r.ok) {
        mindStatus = { ...(mindStatus || {}), info: { ...mindInfo(),
          instrument: { active: r.active, ollamaModel: r.ollamaModel, ollamaEnabled: r.ollamaEnabled, instruments: r.instruments } } };
        if (lastEngineState) renderState(lastEngineState);
      } else {
        flashError(btnMind, `model switch failed: ${r && r.error ? r.error : "unknown"}`);
      }
    } catch (err) {
      flashError(btnMind, `model switch failed: ${err}`);
    }
  });

  // Fold a fresh instrument snapshot into the cached status and re-render.
  const applyInstrument = (r) => {
    if (!(r && r.ok)) return false;
    mindStatus = { ...(mindStatus || {}), info: { ...mindInfo(),
      instrument: { active: r.active, ollamaModel: r.ollamaModel, ollamaEnabled: r.ollamaEnabled, instruments: r.instruments } } };
    if (lastEngineState) renderState(lastEngineState);
    return true;
  };

  // The two toggle squares — kimi (K3) and ollama. Click activates or
  // deactivates an instrument; activating one makes it answer (the most-recently
  // activated wins) and deactivating fails over to the other. ollama off quits
  // its process (frees memory); K3 off clears the key (falls back to ollama);
  // K3 on with no key prompts for one inline.
  panelBody.addEventListener("click", async (e) => {
    const sw = e.target.closest(".inst-square");
    if (!sw) return;
    e.preventDefault();
    const which = sw.dataset.power;
    const turningOn = sw.classList.contains("off"); // off → click turns on
    if (which === "k3") {
      if (turningOn) { // no key → the inline field next to the square takes it
        flashError(btnMind, "paste a KIMI_K3 token next to the kimi square");
        const f = panelBody.querySelector("#k3-key");
        if (f) f.focus();
        return;
      }
      try {
        if (!applyInstrument(await window.ava.mind.k3SetKey(""))) {
          flashError(btnMind, "K3 deactivate failed");
        }
      } catch (err) {
        flashError(btnMind, `K3 failed: ${err}`);
      } finally {
        void refreshInstrument();
      }
      return;
    }
    sw.textContent = turningOn ? "starting…" : "stopping…";
    try {
      const r = await window.ava.mind.ollamaSet(turningOn);
      if (!applyInstrument(r)) {
        flashError(btnMind, `ollama ${turningOn ? "start" : "stop"} failed: ${r && r.error ? r.error : "unknown"}`);
      }
    } catch (err) {
      flashError(btnMind, `ollama power failed: ${err}`);
    } finally {
      void refreshInstrument(); // honest re-probe (the server takes a beat to die/wake)
    }
  });

  // K3 runtime key - set/update (one-way: the token is sent, never read back).
  // Shared by the set/update link and Enter inside the field. Validates, disables
  // the control while the request is in flight, and confirms success in the title.
  async function submitK3Key() {
    const field = panelBody.querySelector("#k3-key");
    const apiKey = field && field.value ? field.value.trim() : "";
    if (!field) return;
    if (apiKey.length === 0) {
      flashError(btnMind, "paste a KIMI_K3 token first");
      field.focus();
      return;
    }
    if (apiKey.length < 20) { // real tokens are far longer; catch a truncated paste early
      flashError(btnMind, `that token looks too short (${apiKey.length} chars) - paste the full key`);
      field.focus();
      return;
    }
    const save = panelBody.querySelector("#k3-save");
    if (save) save.textContent = "saving…";
    field.disabled = true;
    try {
      const r = await window.ava.mind.k3SetKey(apiKey);
      if (applyInstrument(r)) {
        field.value = ""; // never leave the token sitting in the DOM
        btnMind.title = "Kimi (K3) key saved - persisted to LAUNCH/BUILD .bat";
      } else {
        flashError(btnMind, `K3 key failed: ${r && r.error ? r.error : "unknown"}`);
      }
    } catch (err) {
      flashError(btnMind, `K3 key failed: ${err}`);
    } finally {
      field.disabled = false;
      if (save) save.textContent = ""; // renderState restores the correct label
      void refreshInstrument();
    }
  }

  panelBody.addEventListener("click", (e) => {
    const save = e.target.closest("#k3-save");
    if (!save) return;
    e.preventDefault();
    void submitK3Key();
  });

  // Enter inside the key field submits (same as clicking set/update).
  panelBody.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target && e.target.id === "k3-key") {
      e.preventDefault();
      void submitK3Key();
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
        // Name the device actually acquired (the fallback may have picked
        // a non-default camera when the default was busy).
        if (cam.deviceLabel) btnCam.title = `camera live · ${cam.deviceLabel}`;
        camprev.classList.remove("hidden");
      }
    } catch (err) {
      const name = err && err.name ? err.name : "";
      const msg = err && err.message ? err.message : String(err);
      // A busy camera reads as "Device in use" — say plainly that another
      // app holds it, so the flash is actionable rather than cryptic.
      const friendly = name === "NotReadableError"
        ? `camera busy — held by another app (${msg})`
        : `camera unavailable: ${msg}`;
      flashError(btnCam, friendly);
    }
  });

  // SCALING — the operator's force-depth override (Phase 4). A depth click
  // pins the governor's floor; "release to auto" hands control back to the
  // measured auto-scale. The reply carries the live scaling snapshot, which
  // we fold into mindStatus so the panel re-renders the true depth at once.
  panelBody.addEventListener("click", async (e) => {
    const opt = e.target.closest(".scale-opt");
    const auto = e.target.closest(".scale-auto");
    if (!opt && !auto) return;
    e.preventDefault();
    const depth = opt ? Number(opt.dataset.depth) : null;
    try {
      const r = await window.ava.mind.setScaling(depth);
      if (r && r.ok) {
        if (r.scaling) {
          mindStatus = { ...(mindStatus || {}), info: { ...mindInfo(), scaling: r.scaling } };
        }
        if (lastEngineState && !panel.classList.contains("hidden")) renderState(lastEngineState);
      } else {
        flashError(btnMind, `scaling failed: ${r && r.error ? r.error : "unknown"}`);
      }
    } catch (err) {
      flashError(btnMind, `scaling control failed: ${err}`);
    }
  });

  // LEARNING MODE (P6-D) — flip the consolidation governor live. The reply
  // carries the fresh learningModeStats, which we fold into mindStatus so the
  // dial re-renders the true mode at once (the mind also pushes a full state
  // frame; this just makes the click feel instant).
  panelBody.addEventListener("click", async (e) => {
    const opt = e.target.closest(".mode-opt");
    if (!opt) return;
    e.preventDefault();
    try {
      const r = await window.ava.mind.setMode(opt.dataset.mode);
      if (r && r.ok) {
        mindStatus = { ...(mindStatus || {}), info: { ...mindInfo(), learningMode: { mode: r.mode, reinjectionEnabled: r.reinjectionEnabled, replaySweeps: r.replaySweeps, replayDefers: r.replayDefers } } };
        if (lastEngineState && !panel.classList.contains("hidden")) renderState(lastEngineState);
      } else {
        flashError(btnMind, `mode failed: ${r && r.error ? r.error : "unknown"}`);
      }
    } catch (err) {
      flashError(btnMind, `mode control failed: ${err}`);
    }
  });

  // sync the buttons with the true states at load
  void refreshState();
  void refreshMind();
})();
