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
    width: 980,
    height: 740,
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

// Brain loop IPC: start/stop/state — the live simulation service.
ipcMain.handle("omega:start", () => omega.start());
ipcMain.handle("omega:stop", () => omega.stop());
ipcMain.handle("omega:state", () => omega.state());

// Sensory IPC: raw measurements arrive; encoded + injected HERE (main = trusted).
ipcMain.handle("omega:sensor:audio", async (_event, samples, sampleRate) => {
  try {
    const field = sensory.fieldFromWaveform(Float64Array.from(samples), sampleRate);
    const energy = sensory.waveformEnergy(samples);
    omega.injectSensor("audio", Array.from(field));
    let dom = 0, best = -1;
    for (let k = 0; k < sensory.NUM_MODES; k++) {
      const m = field[2 * k] ** 2 + field[2 * k + 1] ** 2;
      if (m > best) { best = m; dom = k; }
    }
    return { ok: true, energy, dominantBand: dom };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

ipcMain.handle("omega:sensor:video", async (_event, grid, width, height) => {
  try {
    const g = Float64Array.from(grid);
    const mean = sensory.gridMean(g);
    omega.injectSensor("vision", Array.from(g), { width, height });
    return { ok: true, mean };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

app.whenReady().then(() => {
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
          document.getElementById("fab-stab")?.click();
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
