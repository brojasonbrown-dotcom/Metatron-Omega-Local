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
const { ingestDocument } = require("./documentIngest.cjs");
const sensory = require("./sensory.cjs");

let engineLoop = new EngineLoop();

// Last-resort guard: a single bad frame / broken pipe must NEVER take down the
// whole main process (the "JavaScript error occurred in the main process"
// dialog). Log it and keep the app alive — the per-stream handlers already
// swallow the expected EPIPE; this catches anything that slips past.
process.on("uncaughtException", (err) => {
  console.error("[main] uncaughtException (kept alive):", err && err.message ? err.message : err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[main] unhandledRejection (kept alive):", reason);
});

// Live ring-resolution switch: stop, rebuild at the new node count, resume
// (state is seeded fresh — an honest restart, not a fake continuity).
function setLoopNodes(n) {
  const wasRunning = engineLoop.running;
  engineLoop.stop();
  engineLoop = new EngineLoop({ nodes: n });
  if (wasRunning) engineLoop.start();
  return engineLoop.state();
}

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

// Chat IPC: every message is answered by real computation from the engine.
ipcMain.handle("ava:send", async (_event, message) => {
  if (typeof message !== "string" || message.trim().length === 0) {
    return { ok: false, error: "empty message" };
  }
  try {
    const text = message.slice(0, 8000);
    const answer = respond(text);
    return { ok: true, answer };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

// Document ingest IPC: the renderer drops a file and sends only its PATH; the
// file is read HERE in the trusted main process (the sandboxed renderer never
// touches raw bytes), type-sniffed, size-capped, text-extracted. The extracted
// text is routed to the engine exactly like a chat message.
ipcMain.handle("ava:document", async (_event, filePath) => {
  const ing = ingestDocument(filePath);
  if (!ing.ok) return ing;
  const prompt = `Document "${ing.name}" (${ing.kind}, ${ing.bytes} bytes${ing.truncated ? ", truncated" : ""}):\n\n${ing.text}`;
  try {
    const answer = respond(prompt.slice(0, 8000));
    return {
      ok: true, name: ing.name, kind: ing.kind,
      answer: `ingested "${ing.name}" (${ing.chars} chars${ing.truncated ? ", truncated to " + ing.text.length : ""}).\n\n${answer}`,
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
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
    return { ok: true, mean };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

app.whenReady().then(() => {
  mainWindow = createWindow();

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
          return "PASS|renderer+IPC+engine+sensors roundtrip OK";
        })()`);
        const ok = typeof probe === "string" && probe.startsWith("PASS");
        console.log(`[ci] renderer+IPC+engine+sensors roundtrip: ${ok ? probe : `FAIL (${probe})`}`);
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
        // open the stability panel and run the engine, so the shot shows the
        // live UI (real state, real controls — no staging)
        await mainWindow.webContents.executeJavaScript(`(async () => {
          await window.ava.engine.start();
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
