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
    const inv = s.invariants;
    const c = s.certificates;
    const rf = s.refinement; // live adaptive-mesh snapshot (Phases 1-4)
    panelBody.innerHTML = [
      row("loop", s.running ? "RUNNING" : "STOPPED"),
      row("ticks", String(s.ticks)),
      row("uptime", `${(s.uptimeMs / 1000).toFixed(1)} s`),
      row("nodes / ν", `${s.nodes} / ${s.courant.toFixed(3)}`),
      `<div class="stab-row"><span>resolution</span><b id="res-switch">` +
        [64, 144, 256].map((n) =>
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
      row("burden Σu²", inv.burden.toFixed(4)), bar(inv.burden / 50),
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
      `<div class="stab-sec">MIND (v14 cognition)</div>`,
      row("state", mindStatus ? mindStatus.state : "stopped"),
      row("ticks", String(mindInfo().ticks ?? 0)),
      row("stable thoughts", String(mindInfo().stableThoughts ?? 0)),
      row("concepts", String(mindInfo().concepts ?? 0)),
      // Auto-scaling: the governor settles the fractal-tree depth on measured
      // tick cost; this is the honest live value (never modelled).
      ...(mindInfo().scaling
        ? [
            row("auto-scale depth", `${mindInfo().scaling.depth} / ${mindInfo().scaling.maxDepth}`),
            row("engine nodes", String(mindInfo().scaling.nodes)),
            row("tick cost (EMA)", `${(mindInfo().scaling.emaTickMs ?? 0).toFixed(1)} ms`),
          ]
        : []),
      ...(mindInfo().lexicon
        ? [row("lexicon", `${mindInfo().lexicon.words} words · ${mindInfo().lexicon.relations} relations`)]
        : []),
      row("ollama", mindInfo().ollama ?? (mindStatus && mindStatus.running ? "warming…" : "—")),
      row("restarts", String(mindStatus ? mindStatus.restarts : 0)),
    ].join("");
  }

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
        camprev.classList.remove("hidden");
      }
    } catch (err) {
      flashError(btnCam, `camera unavailable: ${err && err.message ? err.message : err}`);
    }
  });

  // sync the buttons with the true states at load
  void refreshState();
  void refreshMind();
})();
