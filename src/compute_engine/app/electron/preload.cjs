/**
 * Preload — the ONLY bridge between the sandboxed renderer and the brain.
 * Exposes a minimal, typed surface; the renderer can do nothing else.
 */
"use strict";

const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("omega", {
  /** Send a chat message; resolves to { ok, answer?, error? }. */
  send: (message) => ipcRenderer.invoke("omega:send", message),

  /**
   * Drop a document on the window: the renderer passes ONLY the file path; the
   * main process reads + extracts it and feeds the text to the brain.
   */
  ingestDocument: (filePath) => ipcRenderer.invoke("omega:document", filePath),

  /**
   * Resolve the absolute filesystem path of a dropped File. `File.path` was
   * REMOVED in Electron 32 — webUtils.getPathForFile is the only supported way,
   * and it only exists here in the preload, never in the sandboxed page.
   */
  pathForFile: (file) => webUtils.getPathForFile(file),

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

  /**
   * LLM instrument — the OPTIONAL external answerer (toggled in the Σ panel).
   * Providers: openrouter (universal key — DeepSeek + general models) or
   * deepseek (native API). status → { hasKey, active, provider, model };
   * setKey persists the key for the current provider; toggle refuses to
   * activate without a key; ask resolves { ok, answer?, error? } and is only
   * ever called when the instrument is active.
   */
  llmStatus: () => ipcRenderer.invoke("omega:llm:status"),
  llmSetKey: (key) => ipcRenderer.invoke("omega:llm:set", key),
  llmSetProvider: (provider) => ipcRenderer.invoke("omega:llm:provider", provider),
  llmSetModel: (model) => ipcRenderer.invoke("omega:llm:model", model),
  llmToggle: (on) => ipcRenderer.invoke("omega:llm:toggle", on),
  llmAsk: (text) => ipcRenderer.invoke("omega:llm:ask", text),
});
