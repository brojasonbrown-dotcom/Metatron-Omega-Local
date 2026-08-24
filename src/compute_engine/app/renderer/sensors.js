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
        const r = await window.omega.sensorAudio(buf, ctx.sampleRate);
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
  let activeLabel = null;

  /**
   * Acquire a video stream, falling back across every camera when the
   * default is busy. The common failure here is NotReadableError ("Device
   * in use") — another app holds the default camera exclusively, but a
   * second camera is often free. We try the plain request first (happy
   * path, unchanged), then walk the enumerated videoinput devices in
   * order, skipping any that fail, until one yields a stream. The last
   * error is re-thrown honestly when every device is unavailable.
   */
  async function acquireVideo() {
    const base = { width: { ideal: 1280 }, height: { ideal: 720 } };
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: base });
      const track = s.getVideoTracks()[0];
      activeLabel = track && track.label ? track.label : null;
      return s;
    } catch (firstErr) {
      // Only a "busy / not readable" failure is worth a device walk; a
      // denial (NotAllowedError) or no-camera (NotFoundError) is final.
      if (firstErr && firstErr.name !== "NotReadableError" && firstErr.name !== "OverconstrainedError") throw firstErr;
    }
    let devices = [];
    try {
      devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
    } catch { /* enumeration failed — fall through to rethrow the original */ }
    let lastErr = null;
    for (const dev of devices) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { ...base, deviceId: { exact: dev.deviceId } } });
        activeLabel = dev.label || (s.getVideoTracks()[0] && s.getVideoTracks()[0].label) || null;
        return s;
      } catch (err) {
        lastErr = err; // this device busy too — try the next
      }
    }
    throw lastErr ?? new DOMException("Device in use", "NotReadableError");
  }

  async function start(videoEl, onLevel) {
    stream = await acquireVideo();
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
        const r = await window.omega.sensorVideo(grid, GRID_W, GRID_H);
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
    activeLabel = null;
  }

  return { start, stop, get active() { return timer !== null; }, get deviceLabel() { return activeLabel; } };
})();

window.AvaSensors = { MicSensor, CamSensor };
