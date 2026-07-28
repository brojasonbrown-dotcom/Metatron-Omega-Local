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
});
