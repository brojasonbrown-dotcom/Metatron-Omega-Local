/**
 * AVA sensors — mic & camera capture (renderer side: measurement ONLY).
 * All projection/drive math happens in the main process (sensory.cjs);
 * this module is the ear and the eye, never the brain.
 *
 *   mic    getUserMedia → AudioContext (native rate, ~48 kHz) → AnalyserNode
 *          fftSize 8192 → 100 ms frames → main (Goertzel φ-bands + energy)
 *   camera getUserMedia → video → 144×89 (F_12×F_11) luminance grid → main
 *          (golden-spiral modes + mean) at 2 Hz
 *
 * Honest failure: if a device is absent/denied, the button flashes the error
 * state and the title carries the reason — nothing is faked.
 */
"use strict";

const MicSensor = (() => {
  let ctx = null;
  let stream = null;
  let timer = null;
  const buf = new Float32Array(8192);

  async function start(onLevel) {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 8192;
    src.connect(analyser);
    timer = setInterval(async () => {
      analyser.getFloatTimeDomainData(buf);
      try {
        const r = await window.ava.sensorAudio(buf, ctx.sampleRate);
        if (r.ok) onLevel(r.energy, r.dominantBand);
      } catch { /* transient IPC loss — next frame retries */ }
    }, 100);
  }

  async function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (stream) for (const t of stream.getTracks()) t.stop();
    stream = null;
    if (ctx) await ctx.close();
    ctx = null;
  }

  return { start, stop, get active() { return timer !== null; } };
})();

const CamSensor = (() => {
  const GRID_W = 144; // F_12 — one Fibonacci step up from v14's 89
  const GRID_H = 89; //  F_11 — one Fibonacci step up from v14's 55
  let stream = null;
  let timer = null;
  let canvas = null;
  let g2d = null;

  async function start(videoEl, onLevel) {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    canvas = document.createElement("canvas");
    canvas.width = GRID_W;
    canvas.height = GRID_H;
    g2d = canvas.getContext("2d", { willReadFrequently: true });
    timer = setInterval(async () => {
      if (videoEl.readyState < 2) return;
      g2d.drawImage(videoEl, 0, 0, GRID_W, GRID_H);
      const img = g2d.getImageData(0, 0, GRID_W, GRID_H).data;
      const grid = new Float32Array(GRID_W * GRID_H);
      for (let i = 0; i < grid.length; i++) {
        const o = i * 4;
        grid[i] = (0.2126 * img[o] + 0.7152 * img[o + 1] + 0.0722 * img[o + 2]) / 255;
      }
      try {
        const r = await window.ava.sensorVideo(grid, GRID_W, GRID_H);
        if (r.ok) onLevel(r.mean);
      } catch { /* transient IPC loss — next frame retries */ }
    }, 500);
  }

  async function stop(videoEl) {
    if (timer) clearInterval(timer);
    timer = null;
    if (stream) for (const t of stream.getTracks()) t.stop();
    stream = null;
    videoEl.srcObject = null;
    canvas = null;
    g2d = null;
  }

  return { start, stop, get active() { return timer !== null; } };
})();

window.AvaSensors = { MicSensor, CamSensor };
