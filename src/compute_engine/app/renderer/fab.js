/**
 * METATRON Ω — FAB dock: ⏻ brain wake/sleep   Σ telemetry panel   🎙 mic   📷 camera
 * Every state shown comes from the main process (omega.state() → HostSnapshot);
 * the buttons never fake activity — a failed toggle flashes the error style.
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
    `<div class="stab-bar"><div style="width:${Math.round(Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0)) * 100)}%"></div></div>`;
  const row = (k, v) => `<div class="stab-row"><span>${k}</span><b>${v}</b></div>`;
  const sci = (x) => (typeof x !== "number" || !Number.isFinite(x) ? "—" : x === 0 ? "0" : Math.abs(x) < 0.001 || Math.abs(x) >= 1000 ? x.toExponential(2) : x.toFixed(4));

  function renderState(s) {
    btnEngine.classList.toggle("active", s.running);
    if (panel.classList.contains("hidden")) return;
    const rungs = Array.isArray(s.rungs) ? s.rungs : [];
    panelBody.innerHTML = [
      row("brain", s.running ? "AWAKE" : "ASLEEP"),
      row("profile", s.profile ?? "—"),
      row("ticks", String(s.ticks ?? 0)),
      row("tick rate", `${sci(s.tickRate)} Hz`),
      row("uptime", `${((s.uptimeMs ?? 0) / 1000).toFixed(1)} s`),
      row("rungs / nodes", `${rungs.length} / ${s.totalNodes ?? "—"}`),
      row("digest", String(s.digest ?? "—").slice(0, 16)),
      row("finite", String(s.finite)),

      `<div class="stab-sec">INVARIANTS (computed live)</div>`,
      row("coherence", sci(s.coherence)), bar(s.coherence),
      row("energy", sci(s.energy)), bar(Math.min(1, (s.energy ?? 0) / Math.max(1, s.totalNodes ?? 1))),
      row("flux moved", sci(s.fluxMoved)),
      row("flux imbalance", sci(s.fluxImbalance)),
      row("ordering violations", String(s.orderingViolations ?? 0)),
      row("row-sum defect", sci(s.rowSumDefect)),
      row("worst octave ratio", sci(s.worstEnergyRatio)),

      `<div class="stab-sec">LADDER (dense core)</div>`,
      ...rungs.slice(0, 18).map((r) =>
        row(`n=${r.n}`, `${r.nodes} nodes · coh ${sci(r.coherence)} ${r.warm ? "· warm" : "· cold"} · ${r.regime}`),
      ),

      `<div class="stab-sec">SENSE · MEMORY · MIND</div>`,
      row("sense channels", String(s.senseChannels ?? 0)),
      row("sense peak", sci(s.sensePeak)),
      row("memory", `${s.memoryLoad ?? 0}/${s.memoryCapacity ?? 0} (${s.memoryStage ?? "—"})`),
      row("familiarity", sci(s.familiarity)),
      row("concepts", String(s.concepts ?? 0)),
      row("novelty", sci(s.novelty)),
      row("surprise", sci(s.surprise)),
      row("self-model", `${s.selfModel ? "ahead" : "behind"} (${sci(s.selfMargin)})`),
    ].join("");
  }

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
