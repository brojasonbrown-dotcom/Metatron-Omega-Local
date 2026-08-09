/**
 * AVA — Electron main process.
 * Structure follows Electron's own canonical secure-window example
 * (default_app.ts + tutorial/security.md):
 *   contextIsolation + sandbox + nodeIntegration OFF
 *   show:false → ready-to-show (no first-paint flash)
 *   window.open denied, navigation locked to the local file, permissions denied
 *   single-instance lock
 * All computation stays in THIS process; the sandboxed renderer only talks
 * through one IPC channel (ava:send).
 */
"use strict";

const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { respond } = require("./responder.cjs");
const { EngineLoop } = require("./engineLoop.cjs");
const { MindService } = require("./mindService.cjs");
const { persistK3Key } = require("./k3KeyStore.cjs");
const sensory = require("./sensory.cjs");

let engineLoop = new EngineLoop();

// Live ring-resolution switch: stop, rebuild at the new node count, resume
// (state is seeded fresh — an honest restart, not a fake continuity).
function setLoopNodes(n) {
  const wasRunning = engineLoop.running;
  engineLoop.stop();
  engineLoop = new EngineLoop({ nodes: n });
  if (wasRunning) engineLoop.start();
  return engineLoop.state();
}
const mind = new MindService();

const CI_MODE = process.argv.includes("--ci");
// --ci-report=PATH: where the CI verdict is written (packaged GUI apps have
// no reliable console — the report file is the deterministic channel).
const ciReportArg = process.argv.find((a) => a.startsWith("--ci-report="));
const CI_REPORT = ciReportArg
  ? ciReportArg.split("=")[1]
  : path.join(require("node:os").tmpdir(), "ava-ci-report.txt");
// --shot[=path]: hidden window → let the UI settle → capture a PNG → quit.
const shotArg = process.argv.find((a) => a.startsWith("--shot"));
const SHOT_PATH = shotArg
  ? (shotArg.includes("=") ? shotArg.split("=")[1] : "ava-screenshot.png")
  : null;

// One AVA instance at a time; a second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 740,
    useContentSize: true,
    show: false, // revealed on ready-to-show — no unpainted flash
    autoHideMenuBar: true,
    backgroundColor: "#020604",
    title: "AVA — RHUFT Engine Interface",
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
  // Permissions: ONLY mic/camera (the sensory FABs), ONLY for our own local
  // page — everything else is refused. Navigation is locked above, so this
  // grant can never leak to an external origin.
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

// Chat IPC: every message is answered by real computation. Routing law:
//   1. the engine responder answers computed intents directly (numbers win);
//   2. else, if the mind is awake, the GROUNDED query path — phi phrases an
//      answer over real context (engine digest + learned concepts), inline;
//   3. else the honest fallback with the capabilities list.
ipcMain.handle("ava:send", async (_event, message) => {
  if (typeof message !== "string" || message.trim().length === 0) {
    return { ok: false, error: "empty message" };
  }
  try {
    const text = message.slice(0, 4000);
    const answer = respond(text);
    const isFallback = answer.startsWith("I don't have a computed answer");
    if (isFallback && mind.running) {
      const facts = engineDigest();
      const q = await mind.query(text.slice(0, 500), facts);
      if (q.ok) {
        return { ok: true, answer: q.answer, grounded: q.grounded, via: "mind+engine" };
      }
      // query failed or mind busy — fall through to the async sensory path
      mind.chat(text.slice(0, 500));
      return { ok: true, answer: `${answer}\n\n(mind query: ${q.error} — your words reached the sensory stream instead)`, routedToMind: true };
    }
    return { ok: true, answer };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

/** The compact engine-truth digest fed to the mind's grounded answers. */
function engineDigest() {
  const s = engineLoop.state();
  const inv = s.invariants;
  return [
    `Engine loop: ${s.running ? "running" : "stopped"}, ${s.nodes} nodes, ν=${s.courant.toFixed(2)}.`,
    `Live invariants: coherence ${inv.coherence.toFixed(4)}, closure defect ${inv.closure.toExponential(2)}, drift ${inv.drift.toExponential(2)}, burden ${inv.burden.toFixed(2)}.`,
    `Stable ladder (18 dense rungs): 1, 13, 15, 27, 29, 41, 43, 55, 57, 69, 71, 83, 85, 97, 99, 111, 113, 125 — stability ⇔ Lₙ ≡ ±1 (mod 13).`,
    `Metatron shell n=13: flux = φ⁻²⁶ = 3.6840146919e-6; L(13) = 8.421e-33 m; λ = φ⁻² = 0.381966.`,
  ].join("\n");
}

// Mind IPC: the v14 cognitive mind as a supervised sidecar.
ipcMain.handle("ava:mind:start", () => mind.start());
ipcMain.handle("ava:mind:stop", () => mind.stop());
ipcMain.handle("ava:mind:status", () => mind.status());
ipcMain.handle("ava:mind:chat", (_e, text) => mind.chat(text));
ipcMain.handle("ava:mind:query", (_e, text, facts) => mind.query(text, facts));
// M9 — the switchable language instrument (K3 ⟷ any installed Ollama model).
ipcMain.handle("ava:mind:instrument:get", () => mind.instrumentGet());
ipcMain.handle("ava:mind:instrument:set", (_e, instrument, model) => mind.instrumentSet(instrument, model));
// The Ollama off-switch — cold stop/start of the local instrument (frees RAM).
ipcMain.handle("ava:mind:ollama:set", (_e, enabled) => mind.ollamaSet(enabled));
  // The operator's force-depth override (Phase 4) — pins the engine governor's
  // shrink floor (1..9) or releases it to auto (null). Live; no restart.
  ipcMain.handle("ava:mind:scaling", (_e, depth) => mind.setScaling(depth));
    // P6-D — the learning-mode dial (EFFICIENT/TRAINING/REPLAY). Live; no restart.
    ipcMain.handle("ava:mind:mode", (_e, mode) => mind.setMode(mode));
    // P6-E — teach one domain corpus; returns the honest per-corpus verdict.
    ipcMain.handle("ava:mind:teach", (_e, corpus) => mind.teachCorpus(corpus));
// Runtime K3 key entry — the token travels host→mind once, never echoed back.
// On success it is also persisted (process.env + setx + the launcher bats) so
// the instrument survives restarts — personal-use build, plaintext by request.
ipcMain.handle("ava:mind:k3:setKey", async (_e, apiKey) => {
  const r = await mind.k3SetKey(apiKey);
  if (r && r.ok && typeof apiKey === "string" && apiKey.trim()) {
    persistK3Key(apiKey);
  }
  return r;
});

// Engine loop IPC: start/stop/reset/state — the live simulation service.
ipcMain.handle("ava:engine:start", () => engineLoop.start());
ipcMain.handle("ava:engine:stop", () => engineLoop.stop());
ipcMain.handle("ava:engine:reset", () => engineLoop.reset());
ipcMain.handle("ava:engine:state", () => engineLoop.state());
ipcMain.handle("ava:engine:nodes", (_e, n) => {
  const E = require("./engine-bundle.cjs");
  if (!Number.isInteger(n) || !E.isRung(n)) throw new RangeError(`nodes must be a ladder rung ${E.RESOLUTION_LADDER.join("/")}; got ${n}`);
  return setLoopNodes(n);
});

// Sensory IPC: raw measurements arrive; the projections + drive injection
// happen HERE (main process = authoritative compute), never in the renderer.
ipcMain.handle("ava:sensor:audio", async (_event, samples, sampleRate) => {
  try {
    const field = sensory.fieldFromWaveform(Float64Array.from(samples), sampleRate);
    const energy = sensory.waveformEnergy(samples);
    engineLoop.injectSensor("audio", Math.min(1, energy * 4));
    // dual-feed: the SAME computed field is the mind's ear too (no double work)
    if (mind.running) mind.sensorFrame("audio", Array.from(field), { energy });
    // dominant φ-band (computed, for the UI to show what was heard)
    let dom = 0;
    let best = -1;
    for (let k = 0; k < sensory.NUM_MODES; k++) {
      const m = field[2 * k] ** 2 + field[2 * k + 1] ** 2;
      if (m > best) { best = m; dom = k; }
    }
    return { ok: true, energy, dominantBand: dom };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle("ava:sensor:video", async (_event, grid, width, height) => {
  try {
    const g = Float64Array.from(grid);
    const field = sensory.fieldFromLuminanceGrid(g, width, height); // validated + projected
    const mean = sensory.gridMean(g);
    engineLoop.injectSensor("vision", Math.min(1, mean));
    // dual-feed: the SAME computed field is the mind's upgraded eye
    if (mind.running) mind.sensorFrame("vision", Array.from(field), { mean });
    return { ok: true, mean };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

app.whenReady().then(() => {
  mainWindow = createWindow();
  // The mind pushes its stream of consciousness to the renderer as it happens.
  mind.onEvent((frame) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("ava:mind:event", frame);
    }
  });

  if (CI_MODE) {
    // Headless end-to-end smoke: renderer loads, all IPC surfaces roundtrip.
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const probe = await mainWindow.webContents.executeJavaScript(`(async () => {
          const chat = await window.ava.send("scale 13");
          if (!(chat.ok && chat.answer.includes("METATRON"))) return "chat";
          const started = await window.ava.engine.start();
          if (!started.running) return "engine-start";
          await new Promise(r => setTimeout(r, 250));
          const s = await window.ava.engine.state();
          const stopped = await window.ava.engine.stop();
          if (!(s.ticks > 0 && !stopped.running)) return "engine-ticks";
          if (!(s.invariants.coherence >= 0 && s.invariants.coherence <= 1)) return "invariants";
          const audio = await window.ava.sensorAudio(new Float32Array(4096).map((_,n) => Math.sin(n*0.05)), 48000);
          if (!(audio.ok && audio.energy > 0)) return "sensor-audio";
          const video = await window.ava.sensorVideo(new Float32Array(144*89).fill(0.5), 144, 89);
          if (!(video.ok && Math.abs(video.mean - 0.5) < 1e-9)) return "sensor-video";
          const ms = await window.ava.mind.status();
          // packaged context: the brain dir is OUTSIDE the package by design
          // (5.4 GB models are not shipped) — the channel must answer sanely,
          // whether or not a brain is present here.
          if (!(ms && typeof ms.state === "string" && typeof ms.brainPresent === "boolean")) return "mind-status";
          if (!document.getElementById("fab-mind")) return "mind-fab";
          return "PASS";
        })()`);
        console.log(`[ci] renderer+IPC+engine+sensors roundtrip: ${probe === "PASS" ? "PASS" : `FAIL (${probe})`}`);
        require("node:fs").writeFileSync(
          CI_REPORT,
          `${probe === "PASS" ? "PASS" : `FAIL (${probe})`} ${new Date().toISOString()}\n`,
        );
        app.exit(probe === "PASS" ? 0 : 1);
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
        // open the stability panel and run the engine, so the shot shows the
        // live UI (real state, real controls — no staging)
        await mainWindow.webContents.executeJavaScript(`(async () => {
          await window.ava.engine.start();
          await window.ava.mind.start();
          document.getElementById("fab-stab").click();
        })()`);
        await new Promise((r) => setTimeout(r, 20000));
        const img = await mainWindow.webContents.capturePage();
        require("node:fs").writeFileSync(SHOT_PATH, img.toPNG());
        await mainWindow.webContents.executeJavaScript("window.ava.engine.stop()");
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
