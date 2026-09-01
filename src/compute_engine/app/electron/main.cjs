/**
 * METATRON Ω — Electron main process.
 * Structure follows Electron's own canonical secure-window example
 * (default_app.ts + tutorial/security.md):
 *   contextIsolation + sandbox + nodeIntegration OFF
 *   show:false → ready-to-show (no first-paint flash)
 *   window.open denied, navigation locked to the local file, permissions denied
 *   single-instance lock
 * All computation stays in THIS process; the sandboxed renderer only talks
 * through one IPC channel (omega:*).
 */
"use strict";

const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { respond } = require("./omegaResponder.cjs");
const { OmegaLoop } = require("./omegaLoop.cjs");
const { ingestDocument } = require("./documentIngest.cjs");
const sensory = require("./sensory.cjs");
const llm = require("./llmClient.cjs");

let omega = new OmegaLoop();

// Last-resort guard: a single bad frame / broken pipe must NEVER take down the
// whole main process. Log it and keep the app alive — the per-stream handlers
// already swallow the expected EPIPE; this catches anything that slips past.
process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException (kept alive):", err && err.message ? err.message : err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[main] unhandledRejection (kept alive):", reason);
});

const CI_MODE = process.argv.includes("--ci");
const ciReportArg = process.argv.find((a) => a.startsWith("--ci-report="));
const CI_REPORT = ciReportArg
  ? ciReportArg.split("=")[1]
  : path.join(require("node:os").tmpdir(), "omega-ci-report.txt");
// --shot[=path]: hidden window → settle → capture a PNG → quit.
const shotArg = process.argv.find((a) => a.startsWith("--shot"));
const SHOT_PATH = shotArg
  ? (shotArg.includes("=") ? shotArg.split("=")[1] : "omega-screenshot.png")
  : null;

// One instance at a time; a second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, // two-column split: chat + permanent telemetry panel
    height: 760,
    useContentSize: true,
    show: false, // revealed on ready-to-show — no unpainted flash
    autoHideMenuBar: true,
    backgroundColor: "#020604",
    title: "METATRON Ω — Toroidal Brain Interface",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => {
    if (!CI_MODE) win.show();
  });

  // The app is fully local: deny every navigation away from the loaded file…
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  // …and every attempt to open a new window (links go nowhere).
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  // No webviews, ever.
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
  // Permissions: ONLY mic/camera (the sensory FABs), ONLY for our own local page.
  const isOurPage = (wc) => wc.getURL().startsWith("file://");
  win.webContents.session.setPermissionRequestHandler((wc, permission, done) => {
    done(isOurPage(wc) && permission === "media");
  });
  win.webContents.session.setPermissionCheckHandler((wc, permission) => {
    return isOurPage(wc) && permission === "media";
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  return win;
}

// Chat IPC: every message is computed by the brain (encoded → advanced → read).
ipcMain.handle("omega:send", async (_event, message) => {
  if (typeof message !== "string" || message.trim().length === 0) {
    return { ok: false, error: "empty message" };
  }
  try {
    const answer = respond(omega, message.slice(0, 8000));
    return { ok: true, answer };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

// Document ingest IPC: read in the trusted main process, text fed to the brain.
ipcMain.handle("omega:document", async (_event, filePath) => {
  const ing = ingestDocument(filePath);
  if (!ing.ok) return ing;
  try {
    omega.injectSensor("text", `Document "${ing.name}":\n${ing.text}`);
    const s = omega.state();
    return {
      ok: true, name: ing.name, kind: ing.kind,
      answer: `Ingested "${ing.name}" (${ing.chars} chars${ing.truncated ? ", truncated" : ""}) into the field. The brain is reading it — concepts ${s.concepts}, novelty ${s.novelty.toFixed(4)}.`,
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

// LLM instrument IPC: the OPTIONAL external answerer (OpenRouter / DeepSeek).
// State (provider/model/key, on/off) lives here in main so the chat loop and
// the Σ panel always agree.
ipcMain.handle("omega:llm:status", () => llm.status());
ipcMain.handle("omega:llm:set", (_event, key) => llm.setKey(key));
ipcMain.handle("omega:llm:provider", (_event, provider) => llm.setProvider(provider));
ipcMain.handle("omega:llm:model", (_event, model) => llm.setModel(model));
ipcMain.handle("omega:llm:toggle", (_event, on) => llm.setActive(!!on));

/**
 * Compact live-state digest handed to the LLM instrument, so it answers WITH
 * knowledge of the field — rungs, coherence, memory, cognition — not in a
 * vacuum. Every number is the host's own snapshot reading.
 */
function brainContext(s) {
  const f = (x) => (typeof x === "number" && Number.isFinite(x) ? x.toPrecision(4) : "—");
  const top = (s.cognition?.top ?? [])
    .slice(0, 3)
    .map((x) => `${String(x.key ?? x.id).slice(0, 12)}(${x.hits ?? 0} hits)`)
    .join(", ") || "none consolidated yet";
  return [
    `LIVE BRAIN STATE (METATRON Ω, read this tick):`,
    `profile ${s.profile} · ${s.rungs?.length ?? 0} stable rungs · ${s.totalNodes} nodes · ${s.running ? `AWAKE, tick ${s.ticks} at ${f(s.tickRate)} Hz` : "ASLEEP (field idle until woken)"}`,
    `coherence ${f(s.coherence)} (warm rungs ${s.warmRungs}) · energy ${f(s.energy)} · flux moved ${f(s.fluxMoved)} · digest ${String(s.digest).slice(0, 16)}`,
    `braid memory ${s.memoryLoad}/${s.memoryCapacity} (${s.memoryStage}) · familiarity ${f(s.familiarity)}`,
    `cognition: ${s.concepts} concepts · novelty ${f(s.novelty)} · surprise ${f(s.surprise)} · top: ${top}`,
    `self-model ${s.selfModel ? "ahead of" : "behind"} baseline (margin ${f(s.selfMargin)})`,
  ].join("\n");
}

ipcMain.handle("omega:llm:ask", async (_event, text) => {
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "empty message" };
  }
  // Brain-in-the-loop: the brain HEARS the question first (encoded + stepped
  // synchronously, so the context below is the field AFTER the prompt landed),
  // the instrument answers with that live state in view, and the answer is fed
  // back — the exchange becomes the brain's memory, whichever instrument spoke.
  omega.injectSensor("text", text);
  omega.step();
  const r = await llm.ask(text, brainContext(omega.state()));
  if (r.ok) {
    omega.injectSensor("text", `LLM answered: ${r.answer}`);
    omega.step();
  }
  return r;
});

// Brain loop IPC: start/stop/state — the live simulation service.
ipcMain.handle("omega:start", () => omega.start());
ipcMain.handle("omega:stop", () => omega.stop());
ipcMain.handle("omega:state", () => omega.state());

// Sensory IPC: raw measurements arrive; the BRAIN's certified encoders transform
// them exactly once (host.pushChannel → encodeAudio/encodeGrid). The app codec
// (sensory.cjs) is NOT on the live injection path — that was the double-encode
// defect (a 14-mode field re-interpreted as PCM). It now only computes the
// telemetry the FAB displays (energy / dominant band), from the SAME raw signal.
ipcMain.handle("omega:sensor:audio", async (_event, samples, sampleRate) => {
  try {
    const pcm = Float64Array.from(samples);
    // Telemetry for the level meter — computed, never injected.
    const energy = sensory.waveformEnergy(pcm);
    const field = sensory.fieldFromWaveform(pcm, sampleRate);
    let dom = 0, best = -1;
    for (let k = 0; k < sensory.NUM_MODES; k++) {
      const m = field[2 * k] ** 2 + field[2 * k + 1] ** 2;
      if (m > best) { best = m; dom = k; }
    }
    // The real path: raw PCM → the brain's own encodeAudio (single transform).
    omega.injectSensor("audio", pcm);
    return { ok: true, energy, dominantBand: dom };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle("omega:sensor:video", async (_event, grid, width, height) => {
  try {
    const g = Float64Array.from(grid);
    // Telemetry for the level meter — computed, never injected.
    const mean = sensory.gridMean(g);
    // The real path: raw luminance grid → the brain's own encodeGrid (single transform).
    omega.injectSensor("vision", g, { width, height });
    return { ok: true, mean };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

app.whenReady().then(() => {
  if (!gotLock) return; // second instance — quitting; never build a window
  mainWindow = createWindow();

  if (CI_MODE) {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const probe = await mainWindow.webContents.executeJavaScript(`(async () => {
          const chat = await window.omega.send("status");
          if (!(chat.ok && chat.answer.length > 0)) return "chat";
          const started = await window.omega.start();
          if (!started.running) return "engine-start";
          await new Promise(r => setTimeout(r, 400));
          const s = await window.omega.state();
          const stopped = await window.omega.stop();
          if (!(s.ticks > 0 && !stopped.running)) return "engine-ticks";
          if (!(Number.isFinite(s.totalNodes) && s.totalNodes > 0)) return "nodes";
          const audio = await window.omega.sensorAudio(new Float32Array(4096).map((_,n) => Math.sin(n*0.05)), 48000);
          if (!(audio.ok && audio.energy > 0)) return "sensor-audio";
          const video = await window.omega.sensorVideo(new Float32Array(144*89).fill(0.5), 144, 89);
          if (!(video.ok && Math.abs(video.mean - 0.5) < 1e-9)) return "sensor-video";
          return "PASS|renderer+IPC+brain+sensors roundtrip OK";
        })()`);
        const ok = typeof probe === "string" && probe.startsWith("PASS");
        console.log(`[ci] renderer+IPC+brain+sensors roundtrip: ${ok ? probe : `FAIL (${probe})`}`);
        require("node:fs").writeFileSync(
          CI_REPORT,
          `${ok ? probe : `FAIL (${probe})`} ${new Date().toISOString()}\n`,
        );
        app.exit(ok ? 0 : 1);
      } catch (err) {
        console.error(`[ci] smoke failed: ${err}`);
        require("node:fs").writeFileSync(CI_REPORT, `FAIL (${err}) ${new Date().toISOString()}\n`);
        app.exit(1);
      }
    });
  }

  if (SHOT_PATH) {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        await mainWindow.webContents.executeJavaScript(`(async () => {
          await window.omega.start();
          // The telemetry column is open by default; only expand it if collapsed.
          const stab = document.getElementById("stab");
          if (stab && stab.classList.contains("hidden")) document.getElementById("fab-stab")?.click();
        })()`);
        await new Promise((r) => setTimeout(r, 8000));
        const img = await mainWindow.webContents.capturePage();
        require("node:fs").writeFileSync(SHOT_PATH, img.toPNG());
        await mainWindow.webContents.executeJavaScript("window.omega.stop()");
        console.log(`[shot] captured ${SHOT_PATH}`);
        app.exit(0);
      } catch (err) {
        console.error(`[shot] capture failed: ${err}`);
        app.exit(1);
      }
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
