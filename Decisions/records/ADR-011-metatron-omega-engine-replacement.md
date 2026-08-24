# ADR-011 — Engine Replacement: RHUFT Engine → Certified METATRON Ω Brain

**Status:** accepted · **Date:** 2026-08-24 · **Track:** supersedes the RHUFT-engine era (ADR-001…010)
**Files:** `omega/packages/trnn-core` (the brain), `app/electron/{omegaLoop,omegaResponder,main,preload,sensory}.cjs`, `app/scripts/{bundle-omega,smoke}.mjs`, `app/renderer/*`, `app/{package.json,electron-builder.yml,BUILD-OMEGA.bat,LAUNCH-OMEGA.bat}`.
**Verified:** bundle + 18 smoke + **550-assertion certified battery (34 files, all green)** + `tsc --noEmit` clean + GUI CI roundtrip PASS.

---

## The operator's law

"Remove all files that will affect this metatron omega — implement it truly fully and without
compromise. I don't want old files or irrelevant brain modules from AVA present. Rename the
program to Metatron Omega."

## What was decided

**1. The Lovable web shell stays behind.** The Metatron omega folder was a Lovable-hosted
TanStack/Cloudflare web app. Its React UI, routes, SSR server, wrangler, and `src/core`
browser-shaped embodiment layer are webview code and were **deleted, not ported.** The
Electron shell is the UI. This is the simplification the operator asked for: one UI, one app.

**2. The portable brain is `trnn-core`.** Pure TypeScript, deterministic, zero DOM (every
`window`/`navigator` hit is a comment, a variable name, or a `globalThis.navigator?…` with a
Node fallback). Only 3 `@noble/*` pure-JS crypto imports (ledger/genome) — vendored, bundles
clean. This is the certified engine: 18-rung dense-core `MultiTorusEngine`, `EngineHost`
(pump/sensory plane/HostSnapshot), cognition `Mind`, learning, substrate, ledger/genome.

**3. The brain drives the app behind the SAME IPC contract.** `omega-bundle.cjs` (esbuild,
448 KB, 422 exports) is required by `omegaLoop.cjs`, which wraps `EngineHost` exactly the way
`engineLoop.cjs` wrapped the old engine. `main.cjs`/`preload.cjs` expose `omega:*` channels
shaped on the old `ava:engine:*`/`ava:sensor:*`/`ava:send`/`ava:document` contract, so the
renderer keeps its structure and only changes namespace + telemetry fields + branding.

**4. Chat is computed, not canned.** `omegaResponder.cjs` answers meta-questions (status,
ladder, memory, mind) from the live `HostSnapshot`, and encodes free text into the brain's
sensory plane, advances it, and reports what changed. Nothing is a static string table.

## Purge (everything old/irrelevant, all committed)

old RHUFT `engine/` · Lovable web shell (`src`, `public`, routes, wrangler, `bun.lock`) ·
`Eagle-main` + `Unlimited-OCR-main` · Wolfram python bridge · old electron engine modules
(`engineLoop`, `engine-bundle`, `scanDrift`, `responder`, `engine-entry`, `bundle-engine`) ·
old `BUILD-AVA`/`LAUNCH-AVA` · `INTEGRATION_LEDGER.md` · `index.ts` barrel ·
web-shell tests under `omega/test/` (referenced deleted `src/`).

## Verified (ground truth)

- `bundle-omega.mjs` → `omega-bundle.cjs` loads in Node, 422 exports, deterministic.
- `scripts/smoke.mjs` — 18 checks, all PASS.
- `npx vitest run` (omega) — **34 files / 550 assertions, all PASS** (S0 oracles bit-for-bit,
  S4 ISS 10k-step certificate, W2 warm/cold coherence, G1/G4/G5, N/R/A/B-series).
- `tsc --noEmit` (omega) — clean.
- `npm run smoke:gui` — renderer + IPC + brain + sensors roundtrip **PASS**.

## Honest limits

- **Packaging (`electron-builder --dir`) is blocked by an external file lock**: a Kimi/editor
  watcher holds `release/win-unpacked/resources/brain v14` (stale output from the old build),
  so the final `rmdir` of stale output fails with EBUSY. This is environmental, not a code
  defect — bundle/smoke/GUI-CI all pass. Close the holding app and the pack completes.
- `coherenceWarm` reads NaN until a rung's coherence ring fills (~233 ticks); the panel shows
  the raw mean until then. Correct early-boot behaviour, not a bug.
- The `ava` remote push needs the operator's GitHub auth (this shell has no stored credential).

## Regression floor

The brain battery is the floor: it must stay green on every change. The app's smoke suite +
GUI CI roundtrip are the second gate. No old engine path remains to regress into.
