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
    const text = message.slice(0, 8000);
    const answer = respond(text);
    const isFallback = answer.startsWith("I don't have a computed answer");
    if (isFallback && mind.running) {
      const facts = engineDigest();
      let q = await mind.query(text, facts); // FULL message, never decapitated [FIX: truncation]
      // SEAMLESS LOCAL ANSWERING: a transient failure (a rebound Ollama port,
      // a model still warming, a one-shot timeout) must not end the turn in
      // silence. Retry the grounded query ONCE before degrading — the split
      // instrument re-measures liveness fresh on this attempt. [FIX]
      if (!q.ok) {
        q = await mind.query(text, facts);
      }
      if (q.ok) {
        return { ok: true, answer: q.answer, grounded: q.grounded, via: "mind+engine" };
      }
      // Both attempts failed — the words still reach the mind's learning
      // stream, and the human gets the REAL reason, never silence.
      mind.chat(text);
      return { ok: true, answer: `${answer}\n\n(local instrument: ${q.error} — your words still reached the mind's learning stream)`, routedToMind: true };
    }
    return { ok: true, answer };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
});

// Document ingest IPC: the renderer drops a file and sends only its PATH; the
// file is read HERE in the trusted main process (the sandboxed renderer never
// touches raw bytes), type-sniffed, size-capped, text-extracted. The extracted
// text is then routed exactly like a chat message — engine first, else the
// mind's grounded path — so a document gets the same honest compute as typing.
ipcMain.handle("ava:document", async (_event, filePath) => {
  const ing = ingestDocument(filePath, { brainDir: mind.brainDir });
  if (!ing.ok) return ing;
  // OCR ROUTE: images and scanned PDFs were handed to the mind's OCR sense —
  // the honest acknowledgement is already the answer; nothing more to compute.
  if (ing.ocr) {
    return { ok: true, name: ing.name, kind: ing.kind, answer: ing.answer, via: "ocr" };
  }
  // Wrap the document so the routing treats it as a query about real content.
  // The engine answers computed intents inside it; otherwise the grounded mind
  // path reasons over it with the live engine digest as context.
  const prompt = `Document "${ing.name}" (${ing.kind}, ${ing.bytes} bytes${ing.truncated ? ", truncated" : ""}):\n\n${ing.text}`;
  try {
    const answer = respond(prompt.slice(0, 8000));
    const isFallback = answer.startsWith("I don't have a computed answer");
    if (isFallback && mind.running) {
      const facts = engineDigest();
      const q = await mind.query(
        `Summarise and ground this document: ${ing.name}`,
        `${facts}\n\nDocument excerpt:\n${ing.text.slice(0, 6000)}`,
      );
      if (q.ok) {
        return { ok: true, name: ing.name, kind: ing.kind, answer: q.answer, via: "mind+engine" };
      }
    }
    return {
      ok: true, name: ing.name, kind: ing.kind,
      answer: `ingested "${ing.name}" (${ing.chars} chars${ing.truncated ? ", truncated to " + ing.text.length : ""}).\n\n${answer}`,
    };
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
    // F4 — hand the mind a URL to read + learn from, live. Honest verdict.
    ipcMain.handle("ava:mind:webFeed", (_e, url) => mind.webFeed(url));
      // ADR-001 - flip/read a Sigma-panel sense (retention | telemetry) live.
      ipcMain.handle("ava:mind:sense:set", (_e, sense, enabled) => mind.setSense(sense, enabled));
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
  // ADR-010 — SPEECH-MODULE MATERIALIZATION (first-run, offline, no admin). The
  // phi + mathstral weights are too large for the NSIS installer (~2 GB ceiling),
  // so they ship as a sibling weights/ folder and are copied into the user-writable
  // install brain dir BEFORE the mind boots. Idempotent + atomic; if absent it reports
  // honestly (the mind wakes mute offline) and never blocks the boot. [SPEC]
  try {
    const { materializeWeights } = require("./weightsMaterialize.cjs");
    const wres = materializeWeights(mind.brainDir, (done, total) => {
      if (total > 0) console.log(`[weights] materializing speech module ${(done/1e9).toFixed(2)}/${(total/1e9).toFixed(2)} GB`);
    });
    console.log(`[weights] ${wres.note}`);
  } catch (e) {
    console.warn(`[weights] materializer error (boot continues): ${e && e.message ? e.message : e}`);
  }
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
          // ADR-001 — live round-trip of the Sigma-panel sense verb through
          // renderer -> preload -> IPC -> mindService -> the RUNNING mind.
          // Boot the mind first (brain is present in dev), then flip retention.
          // Honest either way: the verdict is the bridge's real shape
          // ({ok:true,sense,enabled:bool} when wired; ok:false+error otherwise).
          let sense; let st;
          try {
            await window.ava.mind.start();
            // poll until awake (real brain boot can take a few seconds)
            for (let i = 0; i < 40; i++) {
              st = await window.ava.mind.status();
              if (st.state === "awake") break;
              await new Promise((r) => setTimeout(r, 250));
            }
            if (!st || st.state !== "awake") return "mind-boot:" + JSON.stringify(st);
            // flip retention ON, verify the live state changed; flip OFF, verify back.
            const on = await window.ava.mind.setSense("retention", true);
            if (!(on && on.ok && on.enabled === true)) return "sense-on:" + JSON.stringify(on);
            const readOn = await window.ava.mind.setSense("retention");
            if (!(readOn && readOn.ok && readOn.enabled === true)) return "sense-read-on:" + JSON.stringify(readOn);
            sense = await window.ava.mind.setSense("retention", false);
            if (!(sense && sense.ok && sense.enabled === false)) return "sense-off:" + JSON.stringify(sense);
          } catch (e) {
            return "sense-threw:" + (e && e.message ? e.message : String(e));
          }
          const senseShape = sense && typeof sense.ok === "boolean"
            && (sense.ok ? (sense.sense === "retention" && typeof sense.enabled === "boolean")
                          : typeof sense.error === "string");
          if (!senseShape) return "mind-sense-set:" + JSON.stringify(sense);
          await window.ava.mind.stop();
          return "PASS|sense-toggle=on->read->off OK|mindState=" + st.state;
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
