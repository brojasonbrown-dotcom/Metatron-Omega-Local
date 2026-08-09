/**
 * Persist the Kimi (K3) API key so it survives restarts. Personal-use build:
 * the operator asked for plaintext. Three sinks, best-effort each (a failure
 * never blocks the runtime set — the key has already reached the live mind):
 *   1. process.env          — this session, immediately.
 *   2. setx (HKCU registry) — every future process the user launches.
 *   3. LAUNCH/BUILD .bat    — the double-click path stays the source of truth.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const BAT_LINE_PREFIX = 'if not defined KIMI_K3_API_KEY set "KIMI_K3_API_KEY=';
// Matches an existing key line (any value), CRLF/LF agnostic, anchored to a line.
const BAT_LINE_RE = /^if not defined KIMI_K3_API_KEY set "KIMI_K3_API_KEY=.*"[^\S\r\n]*$/m;

function batLine(key) {
  return `${BAT_LINE_PREFIX}${key}"`;
}

function persistK3Key(key) {
  if (typeof key !== "string" || !key.trim()) return;
  const k = key.trim();

  // 1) This session.
  try {
    process.env.KIMI_K3_API_KEY = k;
  } catch {
    /* a read-only env is non-fatal */
  }

  // 2) OS-level persistence for the current user (survives reboot). setx truncates
  //    above 1024 chars; a Kimi token is well under that.
  try {
    const child = spawn("setx", ["KIMI_K3_API_KEY", k], { windowsHide: true });
    child.on("error", () => {
      /* setx unavailable — the bats still carry it */
    });
  } catch {
    /* non-fatal */
  }

  // 3) Rewrite the two launcher bats so the next double-click carries the (new) key.
  try {
    const appDir = path.join(__dirname, "..");
    for (const bat of ["LAUNCH-AVA.bat", "BUILD-AVA.bat"]) {
      const f = path.join(appDir, bat);
      if (!fs.existsSync(f)) continue;
      const text = fs.readFileSync(f, "utf8");
      if (BAT_LINE_RE.test(text)) {
        // Replace the existing key line in place, preserving line endings.
        fs.writeFileSync(f, text.replace(BAT_LINE_RE, batLine(k)));
      } else {
        // No key line yet — inject one right after the ELECTRON_RUN_AS_NODE reset.
        const nl = text.includes("\r\n") ? "\r\n" : "\n";
        const block =
          `${nl}REM -- Kimi (K3) API key (written by the UI "set" action; plaintext by request)${nl}` +
          `${batLine(k)}${nl}`;
        const anchor = 'set "ELECTRON_RUN_AS_NODE="';
        fs.writeFileSync(f, text.includes(anchor) ? text.replace(anchor, anchor + block) : text + block);
      }
    }
  } catch {
    /* the bats are a convenience, never a hard dependency */
  }
}

module.exports = { persistK3Key };
