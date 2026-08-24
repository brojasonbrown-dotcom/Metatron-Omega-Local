/**
 * Preload — the ONLY bridge between the sandboxed renderer and the brain.
 * Exposes a minimal, typed surface; the renderer can do nothing else.
 */
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("omega", {
  /** Send a chat message; resolves to { ok, answer?, error? }. */
  send: (message) => ipcRenderer.invoke("omega:send", message),

  /**
   * Drop a document on the window: the renderer passes ONLY the file path; the
   * main process reads + extracts it and feeds the text to the brain.
   */
  ingestDocument: (filePath) => ipcRenderer.invoke("omega:document", filePath),

  /** Brain loop control — all resolve to the live HostSnapshot-shaped state. */
  start: () => ipcRenderer.invoke("omega:start"),
  stop: () => ipcRenderer.invoke("omega:stop"),
  state: () => ipcRenderer.invoke("omega:state"),

  /**
   * Sensory frames — raw measurements in, encoded into the brain's sensory plane.
   * audio: Float32Array waveform + its true sample rate.
   * video: Float32Array luminance grid + its dimensions.
   */
  sensorAudio: (samples, sampleRate) =>
    ipcRenderer.invoke("omega:sensor:audio", samples, sampleRate),
  sensorVideo: (grid, width, height) =>
    ipcRenderer.invoke("omega:sensor:video", grid, width, height),
});
