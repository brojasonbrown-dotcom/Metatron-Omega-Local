/**
 * omegaWorker — the brain hosted on a dedicated worker thread.
 *
 * WHY THIS EXISTS
 * ---------------
 * The engine (MultiTorusEngine) is fast — ~2.4 ms/tick for MESO — but the
 * observe-only fold stack (measure/self-model/mind/memory/perception/analysis)
 * is 87–93% of the per-tick cost, and it was running on the Electron MAIN
 * process, blocking window management and IPC. Hosting the brain on a
 * `worker_threads` worker means the main process is only ever a thin async
 * bridge: the brain can strain as deep as it wants on its own thread and the
 * UI stays responsive.
 *
 * The worker owns the OmegaLoop (host + pump). The main process sends
 * request messages ({id, type, ...args}) and receives {id, ok, result|error}.
 * The digest chain is untouched: the worker runs the SAME deterministic tick
 * path, only on a different thread, and only plain data crosses the boundary.
 *
 * One worker for the WHOLE brain — NOT one worker per toroid. Measured: a
 * rung tick is ~185–265 µs, far below thread-spawn/message overhead, and the
 * Jacobi staging + ordered digest serialise the cross-rung exchange anyway.
 */
"use strict";

const { parentPort, workerData } = require("node:worker_threads");
const { OmegaLoop } = require("./omegaLoop.cjs");

const loop = new OmegaLoop(workerData || {});

parentPort.on("message", (msg) => {
  try {
    let result;
    switch (msg.type) {
      case "start": result = loop.start(); break;
      case "stop": result = loop.stop(); break;
      case "state": result = loop.state(); break;
      case "step": result = loop.step(); break;
      case "sensor": result = loop.injectSensor(msg.kind, msg.data, msg.extra || {}); break;
      case "seal": result = loop.seal(); break;
      case "save": result = loop.save(); break;
      case "load": loop.load(msg.doc); result = true; break;
      case "recall": result = loop.recallSimilar(msg.text, msg.k, msg.floor); break;
      case "hardware": result = loop.hardware(); break;
      case "ticks": result = loop.ticks; break;
      case "profile": result = loop.profile; break;
      default: throw new Error(`omegaWorker: unknown op "${msg.type}"`);
    }
    parentPort.postMessage({ id: msg.id, ok: true, result });
  } catch (err) {
    parentPort.postMessage({ id: msg.id, ok: false, error: String((err && err.message) || err) });
  }
});
