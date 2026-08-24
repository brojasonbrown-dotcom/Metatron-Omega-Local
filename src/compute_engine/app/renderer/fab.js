/**
 * AVA FAB dock — the floating controls:
 *   ⏻ engine start/stop   Σ framework-stability panel   🎙 mic   📷 camera
 * Every state shown comes from the main process (engineLoop.state()); the
 * buttons never fake activity — a failed toggle flashes the error style.
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
    const rf = s.refinement; // live adaptive-mesh snapshot
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
      // drift bar = fraction of the measured 1e-3 certificate bound — the
      // honest scale, not a saturated 100%
      row("drift", sci(inv.drift)), bar(Math.min(1, inv.drift / 1e-3)),
      ...(typeof inv.driftSigned === "number"
        ? [row("drift dir", (inv.driftSigned >= 0 ? "+" : "-") + sci(Math.abs(inv.driftSigned)) + (inv.driftSigned >= 0 ? " (gain)" : " (loss)"))]
        : []),
      ...(typeof inv.burdenPerNode === "number"
        ? [row("burden/node", inv.burdenPerNode.toFixed(4)), bar(Math.min(1, inv.burdenPerNode))]
        : [row("burden raw", inv.burden.toFixed(4)), bar(Math.min(1, inv.burden / 1000))]),
      // DRIFT/BURDEN HEALTH SCAN — the "is it actually at rest?" verdict.
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
      // REFINEMENT — the live adaptive mesh.
      ...(rf
        ? [
            `<div class="stab-sec">REFINEMENT (adaptive mesh)</div>`,
            row("mesh leaves / depth", `${rf.leaves} / ${rf.depth}`),
            row("mesh nodes", String(rf.nodes)),
            row("max curvature λ", sci(rf.maxLambda)),
            row("refined / coarsened", `${rf.refined} / ${rf.coarsened}`),
            row("prolong residual", sci(rf.conservationResidual)),
            ...(typeof rf.restrictionResidual === "number"
              ? [row("restrict residual", sci(rf.restrictionResidual))]
              : [row("restrict residual", "— no telemetry —")]),
            row("thresholds φ⁻² / φ⁻⁴", `${rf.refineThreshold.toFixed(3)} / ${rf.coarsenThreshold.toFixed(3)}`),
          ]
        : [`<div class="stab-sec">REFINEMENT (adaptive mesh)</div>`, row("mesh", "— no telemetry —")]),
      // SUPER-RESOLUTION EIGENMODES — the live DFT spectrum of the ring field.
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
      // MESH NODES — the REAL adaptive-mesh leaf geometry as a 2D scatter.
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
    ].join("");
  }

  async function refreshState() {
    try {
      renderState(await window.ava.engine.state());
    } catch { /* main busy — next poll retries */ }
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

  // sync the buttons with the true states at load
  void refreshState();
})();
