// Probe: does the Electron MAIN process support SAB + Atomics + worker_threads?
// All engine computation runs in main (renderer is sandboxed), so main is the
// environment that matters for shared-memory parallelism. Writes a JSON verdict
// to the path given by --sab-report=PATH (defaults to %TEMP%) and exits.
"use strict";
const { app } = require("electron");

const reportArg = process.argv.find((a) => a.startsWith("--sab-report="));
const REPORT = reportArg
  ? reportArg.split("=")[1]
  : require("node:path").join(require("node:os").tmpdir(), "ava-sab-report.json");

app.whenReady().then(async () => {
  const out = {
    platform: "electron-main",
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    SharedArrayBuffer: typeof SharedArrayBuffer,
    Atomics: typeof Atomics,
    sab_functional: false,
    worker_threads: "no",
    worker_sab_roundtrip: false,
  };

  try {
    const b = new SharedArrayBuffer(16);
    const f = new Float64Array(b);
    f[0] = 1.618033988749895;
    out.sab_functional = new Float64Array(b)[0] === 1.618033988749895;
  } catch (e) {
    out.sab_error = String(e);
  }

  try {
    const { Worker } = require("node:worker_threads");
    out.worker_threads = "function";
    const sab = new SharedArrayBuffer(8);
    const i32 = new Int32Array(sab);
    Atomics.store(i32, 0, 0);
    const src = `const {parentPort, workerData} = require("node:worker_threads");
      const i32 = new Int32Array(workerData.sab);
      Atomics.add(i32, 0, 41);
      parentPort.postMessage({ done: true });`;
    const w = new Worker(src, { eval: true, workerData: { sab } });
    await new Promise((res, rej) => {
      w.on("message", res);
      w.on("error", rej);
      setTimeout(() => rej(new Error("worker timeout")), 5000);
    });
    out.worker_sab_roundtrip = Atomics.load(i32, 0) === 41;
    await w.terminate();
  } catch (e) {
    out.worker_error = String(e);
  }

  require("node:fs").writeFileSync(REPORT, JSON.stringify(out, null, 2));
  app.exit(out.sab_functional && out.worker_sab_roundtrip ? 0 : 1);
});
