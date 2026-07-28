/**
 * AVA FAB dock — the four floating controls:
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
    panelBody.innerHTML = [
      row("loop", s.running ? "RUNNING" : "STOPPED"),
      row("ticks", String(s.ticks)),
      row("uptime", `${(s.uptimeMs / 1000).toFixed(1)} s`),
      row("nodes / ν", `${s.nodes} / ${s.courant.toFixed(3)}`),
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
    ].join("");
  }

  async function refreshState() {
    try {
      renderState(await window.ava.engine.state());
    } catch { /* main busy — next poll retries */ }
  }

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

  // sync the engine button with the true loop state at load
  void refreshState();
})();
