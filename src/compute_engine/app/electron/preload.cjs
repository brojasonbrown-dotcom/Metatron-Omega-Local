/**
 * Preload — the ONLY bridge between the sandboxed renderer and the engine.
 * Exposes a minimal, typed surface; the renderer can do nothing else.
 */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ava", {
  /** Send a chat message; resolves to { ok, answer? , error? }. */
  send: (message) => ipcRenderer.invoke("ava:send", message),

  /** Engine loop control — all resolve to the live loop state. */
  engine: {
    start: () => ipcRenderer.invoke("ava:engine:start"),
    stop: () => ipcRenderer.invoke("ava:engine:stop"),
    reset: () => ipcRenderer.invoke("ava:engine:reset"),
    state: () => ipcRenderer.invoke("ava:engine:state"),
    /** Ring resolution: 64 | 144 | 256 nodes (honest restart at the new scale). */
    setNodes: (n) => ipcRenderer.invoke("ava:engine:nodes", n),
  },

  /**
   * Sensory frames — raw measurements in, computed projections out.
   * audio: Float32Array waveform + its true sample rate.
   * video: Float32Array luminance grid + its dimensions.
   */
  sensorAudio: (samples, sampleRate) =>
    ipcRenderer.invoke("ava:sensor:audio", samples, sampleRate),
  sensorVideo: (grid, width, height) =>
    ipcRenderer.invoke("ava:sensor:video", grid, width, height),

  /** The v14 mind sidecar: lifecycle + chat + its live event stream. */
  mind: {
    start: () => ipcRenderer.invoke("ava:mind:start"),
    stop: () => ipcRenderer.invoke("ava:mind:stop"),
    status: () => ipcRenderer.invoke("ava:mind:status"),
    chat: (text) => ipcRenderer.invoke("ava:mind:chat", text),
    /** The grounded-answer path: a synchronous, context-grounded mind reply. */
    query: (text, facts) => ipcRenderer.invoke("ava:mind:query", text, facts),
    /** Subscribe to mind events (journal relays, boot, state, exits). */
    onEvent: (cb) => {
      const listener = (_e, frame) => cb(frame);
      ipcRenderer.on("ava:mind:event", listener);
      return () => ipcRenderer.removeListener("ava:mind:event", listener);
    },
  },
});
