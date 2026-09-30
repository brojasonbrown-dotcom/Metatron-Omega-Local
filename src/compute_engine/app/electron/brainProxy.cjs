/**
 * BrainProxy — an async mirror of OmegaLoop that talks to the brain worker.
 * Same method names as OmegaLoop, but every call is a Promise (worker round-trip).
 * `ticks` is cached from the most recent state() so the shutdown save-guard can
 * stay synchronous. Only plain data crosses the worker boundary.
 */
"use strict";

const { Worker } = require("node:worker_threads");
const path = require("node:path");

class BrainProxy {
  constructor(opts) {
    this._worker = new Worker(path.join(__dirname, "omegaWorker.cjs"), { workerData: opts || {} });
    this._pending = new Map();
    this._seq = 0;
    this._lastTicks = 0;
    this._worker.on("message", (msg) => {
      const p = this._pending.get(msg.id);
      if (p) {
        this._pending.delete(msg.id);
        if (msg.ok) p.resolve(msg.result);
        else p.reject(new Error(msg.error));
      }
    });
    this._worker.on("error", (err) => {
      for (const p of this._pending.values()) p.reject(err);
      this._pending.clear();
    });
  }

  _call(type, args = {}) {
    const id = ++this._seq;
    return new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject });
      this._worker.postMessage({ id, type, ...args });
    });
  }

  async state() {
    const s = await this._call("state");
    if (s && typeof s.ticks === "number") this._lastTicks = s.ticks;
    return s;
  }

  async start() {
    const s = await this._call("start");
    if (s && typeof s.ticks === "number") this._lastTicks = s.ticks;
    return s;
  }

  async stop() {
    const s = await this._call("stop");
    if (s && typeof s.ticks === "number") this._lastTicks = s.ticks;
    return s;
  }
  step() { return this._call("step"); }
  injectSensor(kind, data, extra) { return this._call("sensor", { kind, data, extra }); }
  seal() { return this._call("seal"); }
  save() { return this._call("save"); }
  load(doc) { return this._call("load", { doc }); }
  recallSimilar(text, k, floor) { return this._call("recall", { text, k, floor }); }
  hardware() { return this._call("hardware"); }
  terminate() { return this._worker.terminate(); }

  get ticks() { return this._lastTicks; }
}

module.exports = { BrainProxy };
