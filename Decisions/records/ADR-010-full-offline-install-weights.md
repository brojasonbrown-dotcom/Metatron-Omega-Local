# ADR-010 — Full Offline Install: Speech-Module Weights Ship Beside the Installer

**Status:** accepted · **Date:** 2026-08-21 · **Track:** extends ADR-009 (always-on backbone + speech-module self-heal)
**Files:** `app/electron/weightsMaterialize.cjs` (NEW — first-run materializer), `app/electron/main.cjs` (boot wiring), `app/BUILD-AVA.bat` (weights staging step).
**Suite:** brain 551 passed / 1 skipped (59 files) before AND after; app `smoke.mjs` exit 0. End-to-end install→boot→respond verified.

---

## The operator's law

"Make it FULLY install the full program and its weights, learning and all of it. Make sure it
runs FULL hardware."

## The constraints (ground truth, rigor before code)

1. **NSIS installer has a ~2 GB ceiling** (electron-builder issue #2086). The 5.4 GB weight set
   **cannot** be packed into the `AVA-setup.exe`. Attempting it would fail the build outright.
2. **The weight set is complete and self-consistent.** Verified: phi = 6 layers/config (1.60 GB),
   mathstral = 5 (4.11 GB), every manifest-referenced blob present. Safe to ship offline.
3. **Install location is user-writable.** NSIS `perMachine:false` → installs to
   `%LOCALAPPDATA%\Programs`, so `mind_state` (journal, visual memory, genome) writes fine at
   runtime. No latent read-only bug.
4. **The ADR-009 self-heal checks manifests in `BRAIN_DIR`.** If the weights are present there,
   it does NOT re-pull. So the fix is to land them there before first boot.
5. **Full-hardware scaling is already honored.** The HardwareGovernor auto-scales depth to the
   measured ceiling (this host: 30 GB RAM / 12 cores → realistic depth 8 = ~44k nodes; depth 9
   structural ceiling). `MIND_FORCE_DEPTH` pins it. No change needed.

## Decision — the sound architecture

**Weights ship as a sibling `weights/` folder, not inside the installer.** The NSIS `.exe`
stays lean (80 MB — fast updates); the 5.4 GB weight set ships beside it. A **first-run
materializer** (`weightsMaterialize.cjs`, wired into `main.cjs` before the mind boots) copies
the weights into the writable install brain dir, so the supervisor finds them present and never
pulls. Fully offline, no admin, no 2 GB wall.

The materializer is **military-grade**:
- **Idempotent** — if both manifests are already present it's a verified no-op (never re-copies).
- **Atomic** — each blob copies to a `.part` temp then renames over the target; an interrupted
  first run never leaves a half-written weight that looks valid.
- **Manifest-led** — copies exactly the blobs the manifests reference, never a guessed set.
- **Honest** — if no weights folder is found it reports plainly ("mind will wake mute offline")
  and never blocks the boot.
- **Source resolution:** `AVA_WEIGHTS_DIR` env → `<install>/../weights` (the shipped layout) →
  `cwd/weights` (dev/portable).

`BUILD-AVA.bat` gained a `[6/6]` step that stages `release/weights/{blobs,manifests}` from the
brain tree so the full program + weights always ship together.

## Verification (ground truth)

- **Brain suite:** 551 passed / 1 skipped (59 files) before AND after; `tsc --noEmit` exit 0.
- **App smoke:** `smoke.mjs` all pass, exit 0.
- **Full dist build:** NSIS + portable both exit 0 (`AVA-0.1.0-setup.exe` 80.8 MB, portable 80.5 MB).
- **End-to-end fresh-install simulation:** weights stripped from the packaged brain (fresh-install
  state), `weights/` placed beside the exe, app run → materializer restored all **5.72 GB** offline
  (`manifests` + `blobs` landed in `resources/brain v14`), CI **PASS / mindState=awake**.
- **Response from materialized weights:** live query "what is a tree" → Ollama running with both
  models, `speechModule:{phi:true,mathstral:true}`, phi delivered a real answer.

## What ships (the backup artifact)

```
release/
  AVA-0.1.0-setup.exe       (80.8 MB — NSIS installer, lean)
  AVA-0.1.0-portable.exe    (80.5 MB — portable)
  weights/                  (5.4 GB — the speech module; keep beside the installer)
    blobs/  manifests/
```

**Install:** run the setup exe with `weights/` in the same folder. First boot materializes the
speech module into the install dir; every later boot finds it present (no re-copy, no re-pull).

## Honest limits

- The weights folder is **separate from the installer** by design (the 2 GB ceiling is a hard
  NSIS constraint). If a user moves the installer without the folder, the boot reports "weights
  not found — mute offline" honestly; the ADR-009 self-heal pulls them if network is available.
- Learned state (`mind_state/`, incl. the 97 MB journal) is deliberately NOT shipped — it is
  per-machine learned state, auto-created and grown at runtime. Shipping a snapshot is a separate
  decision (it would seed the backup brain's memory into every install).
- The portable exe + `weights/` is the simplest offline artifact (no install step at all).

## Regression floor

All changes additive; the materializer is a no-op when weights are present and never blocks boot.
No existing test modified. Suite green before AND after. No commit made by this change.
