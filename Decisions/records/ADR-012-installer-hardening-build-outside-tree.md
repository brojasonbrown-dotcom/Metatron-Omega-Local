# ADR-012 — Installer Hardening: EBUSY-proof pack/dist via build-outside-tree

**Status:** accepted · **Date:** 2026-08-25 · **Track:** closes the ADR-011 honest-limit (the packaging EBUSY)
**Files:** `app/scripts/{pre-pack.mjs,build-driver.mjs}`, `app/package.json`
**Verified:** brain battery **550/550 green** · app smoke **28/28 PASS** · `pack` exit 0 · `dist` exit 0 → **NSIS installer + portable exe both staged to `release/`** while the watcher lock was active.

---

## The operator's ask

"make sure the installers and packagers are scanned and updated for this new brain and
structures involved … truly foolproof and rigorous … do not cause regressions."

## Scan result (ground truth, before any change)

The packaging surface was already fully migrated to Metatron Ω. **Zero stale references**
to `brain v14`, AVA branding, the old RHUFT engine, Ollama, or the weights/materializer
anywhere in `app/` (electron-builder.yml, package.json, BUILD/LAUNCH-OMEGA.bat,
bundle-omega.mjs, main.cjs, omegaLoop.cjs, sensory.cjs, preload.cjs, smoke.mjs).
The bundle is self-contained: `EngineHost` embedded, no external file deps, no old brain
path. The two on-disk `brain v14` dirs are dead weight (untracked; one is empty generated
output). So the scan found **one real defect**, not a migration gap.

## The one real defect — the ADR-011 EBUSY, reproduced and root-caused

`electron-builder --dir` died with `EBUSY: … unlink 'release\win-unpacked.tmp\resources\default_app.asar'`.
Root cause traced to upstream `app-builder-lib/out/util/electronGet.js`:
`extractArchive(file, dir)` creates `tmpDir = ${dir}.tmp`, extracts the Electron dist zip
there, then `fs.rename(tmpDir, dir)`. An editor/indexer watcher (Kimi / VS Code) scans the
workspace and holds a Windows **delete-share lock** on the staging `default_app.asar`
(opens `r+` fine; `rename`/`unlink` fail with EBUSY). The watcher re-grabs the lock
continuously while the build writes, so **no retry or pre-clean can break it** — proven
empirically (the cleaner cleared everything else but this file stayed locked).

## The decision — build outside the watched tree

Do not fight the watcher for the in-progress rename. Move the whole electron-builder output
to a location the watcher never scans. The watcher only watches the workspace, so staging
under the OS temp root is invisible to it.

**`build-driver.mjs`** (the fix):
1. Wipe + recreate an unwatched build root at `%TEMP%/omega-build/release`.
2. Run electron-builder with `-c.directories.output=<stagedRelease>` — overrides the
   committed yml **for that invocation only**; the committed config is untouched.
3. Copy the finished artifacts back into the project `release/`. Copying finished files is
   safe — the watcher may read them; only in-progress rename/unlink ever broke.

**`pre-pack.mjs`** (safety net): best-effort clears stale `release/win-unpacked{,.tmp}` so
the dir is never mistaken for a real artifact, and **reports** a residual external lock
without failing (it no longer blocks, since the build stages outside the tree).

**`package.json`**: `pack`, `dist`, `verify:dist` now route `bundle:omega → pre-pack →
build-driver`. `prepack`/`predist` lifecycle hooks kept for any direct electron-builder call.

## Why this is foolproof, not fragile

- **No node_modules patch** — the override is a supported CLI flag, upstream-agnostic.
- **Committed config unchanged** — `electron-builder.yml` still says `output: release`;
  the redirection is per-invocation, so a plain `npx electron-builder` outside the driver
  behaves exactly as before.
- **Watcher-agnostic** — works whether the lock is held or not; degrades to a normal build.
- **Honest** — the watcher note is always printed; a copy-back failure is a loud WARNING,
  never silent.

## Verified (ground truth)

| Gate | Result |
|---|---|
| `npm run bundle:omega` | `omega-bundle.cjs` 448.6 KB, exit 0 |
| `node scripts/smoke.mjs` | **28/28 PASS** |
| `npx vitest run` (omega) | **34 files / 550 assertions, all PASS** |
| `npm run pack` | exit 0 — watcher lock present, build succeeded |
| `npm run dist` | exit 0 — `METATRON-OMEGA-1.0.0-setup.exe` (80.3 MB) + `-portable.exe` (80.0 MB) + blockmap + `win-unpacked/METATRON-OMEGA.exe` |
| packaged exe `--ci` roundtrip | **PASS** — renderer+IPC+brain+sensors OK (verified on the out-of-tree build) |

## Regression floor

Unchanged and confirmed green: the 550-assertion brain battery + 28-check app smoke are the
floor; both ran clean before AND after every change in this ADR. No engine/renderer/IPC code
was touched — only the two build scripts and the package.json script wiring.

## Honest limits

- The stale `release/win-unpacked.tmp` lock is **environmental** (a live Kimi/VS Code
  process). The build no longer depends on clearing it, but if the operator wants the dir
  gone entirely, closing the holding app releases it. Not required for a green build.
- Artifacts land in `release/` by copy-back; a watcher holding a *previous finished* exe
  could in principle block that copy (loud WARNING, not silent) — not yet observed.
- No git commit made (operator's call).
