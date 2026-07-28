/**
 * Matrix rain — a quiet phosphor-green glyph fall behind the chat.
 * Deliberately subtle (low alpha) so the conversation stays readable.
 * Pauses when the window is hidden; honours prefers-reduced-motion.
 * Classic canvas trail technique: translucent black fade + one glyph per
 * column per frame.
 */
"use strict";

(() => {
  const canvas = document.getElementById("rain");
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const GLYPHS = "アカサタナハマヤラワ0123456789φλτψ∮∇=+*";
  const FONT_SIZE = 15;
  const FADE = "rgba(2, 6, 4, 0.09)"; // trail length
  const GREEN = "rgba(0, 255, 120, 0.34)";
  const HEAD = "rgba(160, 255, 200, 0.55)";

  let columns = 0;
  let drops = [];
  let running = false;
  let rafId = 0;
  let last = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.ceil(canvas.width / FONT_SIZE);
    drops = Array.from({ length: columns }, () => ({
      y: Math.floor((Math.random() * canvas.height) / FONT_SIZE),
      speed: 0.5 + Math.random() * 0.8,
    }));
    ctx.fillStyle = "#020604";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    if (now - last < 50) return; // ~20fps is plenty for ambience
    last = now;

    ctx.fillStyle = FADE;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${FONT_SIZE}px monospace`;

    for (let i = 0; i < columns; i++) {
      const d = drops[i];
      const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      ctx.fillStyle = Math.random() < 0.08 ? HEAD : GREEN;
      ctx.fillText(glyph, i * FONT_SIZE, d.y * FONT_SIZE);
      d.y += d.speed;
      if (d.y * FONT_SIZE > canvas.height && Math.random() > 0.975) {
        d.y = 0;
        d.speed = 0.5 + Math.random() * 0.8;
      }
    }
  }

  function start() {
    if (running || reduced) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  if (!reduced) start();
})();
