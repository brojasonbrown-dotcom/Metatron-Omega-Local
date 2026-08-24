# ADR-005 — Bridge Visual Memory Wiring + Invariant-Culture Vision CSV

**Status:** accepted · **Date:** 2026-08-14 · **Track:** fixes P2 (vision) on the live bridge path

## Symptom

Operator report: "0 visuals identified and learned." The mind saw frames but
remembered nothing, and the screen eye produced no usable percepts on this host.

## Root cause (measured, two distinct defects)

1. **`VisualMemory` was wired into the wrong entry point.** It was constructed and
   fed via `screenEye.onGrid` / `fileEye.onGrid` only in `run_mind.ts`. The app
   boots `run_mind_bridge.ts`, which never constructed it — every frame was
   dropped after the 28-field projection. The 9 vision tests pass because they
   test the class in isolation; nothing tested that the bridge wires it.

2. **Culture-sensitive CSV from the vision PowerShell.** Both `captureScript`
   (screen) and `decodeScript` (file) append `[math]::Round($l,2)` to a
   comma-joined string. On a comma-decimal locale (this host is `en-ZA`,
   `(4.01).ToString()` → `4,01`) the decimal point is a comma — colliding with
   the `,` delimiter. `parseLuminanceCsv` then reads ~2× the expected 4895
   values (measured 9666) and throws. **This silently killed the screen eye and
   the file eye on any comma-locale host** — the deeper reason "0 visuals" was
   reported even where frames were captured.

## Decision

1. Mirror the `run_mind.ts` wiring into `run_mind_bridge.ts`: construct
   `VisualMemory`, load, quarantine-warn, and attach both eyes' `onGrid`. Report
   `visualMemory` / `visualRestored` in the `sensors` boot phase.
2. Pin `[System.Threading.Thread]::CurrentThread.CurrentCulture =
   [CultureInfo]::InvariantCulture` at the top of BOTH vision PowerShell scripts
   (fix at the source, not the parser — a robust parser also guards hand-written
   CSVs, but the canonical producer must emit a stable format).

## Verified (headless, this host)

- Direct sensor drive: `sensed=2 failures=0 lastError=null`, `onGrid` fired,
  `vm.size=1`, `visual_memory.json` written and reloaded (`restored=1`).
- Live bridge boot (stdin held open): image dropped → archived to
  `processed/`, `visual_memory.json` records 4 (screen eye also capturing),
  no culture parse errors.
- Full gate: `typecheck` (engine + mind) clean; `vitest` 1017 passed / 0 failed;
  `smoke.mjs` 78/78 (also fixed a stale `status` assertion: `/18 files present`
  → `subsystems`/`modules`, matching the rewritten `responder.statusInfo()`).

## Files touched

- `brain v14/run_mind_bridge.ts` — import + construction + boot phase.
- `brain v14/adapters/sensors/vision_screen.ts` — invariant-culture pin.
- `brain v14/adapters/sensors/vision_files.ts` — invariant-culture pin.
- `app/scripts/smoke.mjs` — stale status assertion.

## Not done (honest remainder)

- The mind still cannot NAME what it sees (no hosted vision model) — the
  28-field is a luminance texture descriptor by design. It now *remembers* and
  can *recall similar*; identification ("what is it") remains [SPEC] P9.
- OCR path (`mind_inbox/ocr/`) still never exercised end-to-end with a real scan.
- Camera frames are still ingested by the internal screen sensor as
  `vision.screen` (provenance/privacy asymmetry) — unchanged.
