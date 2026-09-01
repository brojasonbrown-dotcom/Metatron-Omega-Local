/**
 * METATRON Ω — split-layout mechanics: the drag divider between the chat
 * column (left) and the telemetry column (right).
 *
 * Contract:
 *   - panel width lives in the CSS variable --panel-w on <html>; styles.css
 *     reads it for #stab width and for shifting #fab / #camprev when
 *     body.panel-open is set.
 *   - width persists in localStorage ("omega.panelW") and is clamped to
 *     [240, 640] px so neither column can be crushed to nothing.
 *   - collapse/expand (the Σ button) is fab.js's job; this file only owns
 *     the divider drag + width restore.
 */
"use strict";

(() => {
  const MIN_W = 240;
  const MAX_W = 640;
  const KEY = "omega.panelW";
  const divider = document.getElementById("divider");

  const clamp = (w) => Math.min(MAX_W, Math.max(MIN_W, Math.round(w)));

  function setWidth(w) {
    document.documentElement.style.setProperty("--panel-w", `${clamp(w)}px`);
  }

  // Restore the last width (survives restarts).
  const saved = Number(localStorage.getItem(KEY));
  if (Number.isFinite(saved) && saved > 0) setWidth(saved);

  let dragging = false;

  divider.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    document.body.classList.add("resizing"); // styles.css: no transitions while dragging
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    // Panel is the RIGHT column: width = distance from the pointer to the
    // window's right edge.
    setWidth(window.innerWidth - e.clientX);
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("resizing");
    const cur = Number(document.documentElement.style.getPropertyValue("--panel-w").replace("px", ""));
    if (Number.isFinite(cur) && cur > 0) localStorage.setItem(KEY, String(cur));
  });
})();
