# ADR-008 — Depth-Graded Percept Memory + Build Fix + Secret Hygiene

**Status:** accepted · **Date:** 2026-08-17 · **Track:** extends ADR-007 (sensory-depth scaling)
**Files:** `cognition/visual_memory.ts` (hi-res evidence layer), `run_mind_bridge.ts` (consumer passes the field), `app/electron-builder.yml` (publish fix), `app/BUILD-AVA.bat` + `app/LAUNCH-AVA.bat` (secret removed).
**Suite:** 549 passed / 3 skipped (58 files) before AND after — no regression. `tsc --noEmit` exit 0. Unit proof 4/4.

---

## 1. The rewarding change: depth-graded percept memory (done SOUNDLY)

ADR-007 wired the hi-res capture → encoder → `visual_memory`, but the resolved octave-graded
`hiResField` was computed then **discarded** (`void`): `observe` stored only the fixed 32×32
DCT descriptor. This closes that — the resolved field is now **persisted on the record** and
**blended into `discriminate()`** as a second fine-evidence channel.

**The rigor catch (why this ADR exists in this form).** The first design graded the *stored
descriptor size* (16/32). That was caught as **unsound before shipping**: `dct2d` is a
raster-order block DCT, so a size-32 prefix is NOT the same basis as size-16 — prefix-similarity
across sizes is invalid. The second design claimed the hi-res field was "prefix-comparable
across octave counts." Verification **disproved that too**: the rings are per-ring
energy-normalized, so a 3-octave field is NOT a prefix of an 8-octave field (same scene at
8-vs-3 read ~0.14, not ~1). Both cross-depth shortcuts are mathematically broken.

**The sound law that shipped:** hi-res evidence is blended **same-depth only** (equal field
length — the dial's steady state). `hiResSimilarity` returns an honest **0** ("no comparable
evidence") on any length mismatch, never a fabricated cross-depth score. Absent/legacy → 0.
This is E2/E3 applied: the system never claims a match it did not validly measure.

- `VisualRecord.hiRes?` — optional, never fabricated; legacy/fast-path records carry descriptor-only.
- `observe(…, hiRes?)` — stores the field when the caller resolved one.
- `discriminate(…, queryHiRes?)` — blends `(descriptorSim + hiResSim)/2` only when BOTH sides
  carry a field at the same depth; otherwise descriptor-only (unchanged legacy behavior).
- Persistence: `hiRes` serialized base64 alongside `descriptor`; load restores it. Length-agnostic.

## 2. Build fix (the diagnosed root cause)

`app/electron-builder.yml` gained **`publish: null`**. The crash was in electron-builder's
`updateInfoBuilder.computeChannelNames` dereferencing `null.channel` — reached only when a
publish provider is resolved. `PublishManager.getPublishConfigs` returns `null` for an explicit
`publish: null` ("if explicitly set to null — do not publish"), which short-circuits
`createUpdateInfoTasks` entirely (the `publishConfigs == null → return` guard). We ship a local
portable/NSIS app with **no auto-update server**, so `publish: null` is the honest declaration —
verified against the electron-builder source, not assumed.

## 3. Secret hygiene (a real exposure, resolved)

A live **KIMI_K3_API_KEY was hardcoded plaintext** in `BUILD-AVA.bat` **and** `LAUNCH-AVA.bat`
(tracked, and present in git history at commit `0101ccd`). Both files now read the key from the
environment (`if not defined … echo … unavailable`) and carry an honest comment. **The key is in
git history, so it must be treated as compromised and ROTATED by the operator** — removing it from
the working tree does not revoke the historical copy.

## Verification (ground truth)

- **Suite:** `vitest run` **549 passed / 3 skipped (58 files)** before AND after; `tsc --noEmit` exit 0.
- **ADR-008 unit proof (4/4):** same-depth identical → ~1.0; same-depth same-scene (0.895) >
  different-scene (0.199) — discriminates; cross-depth → 0 (honest); absent → 0.
- **Build fix:** proven against `PublishManager.js` / `updateInfoBuilder.js` source (the null-publish
  guard skips the crashing path). End-to-end `electron-builder --win` run in progress.

## Honest limits

- The hi-res blend fires only when the query + a record share the same depth AND survive the
  pre-existing pHash/dHash candidate gate (pHash ≤ 8, dHash ≤ 16). On very low-frequency scenes
  the pHash is sensitive enough that a small patch can exceed the radius → no candidate → the
  fine layer never runs. That is **pre-existing `findSimilar` gate behavior, unchanged here**;
  widening it is a separate, carefully-measured decision (false-positive risk) and was NOT done.
- The engine's live dynamics still see only the 28-field; this enriches percept memory/recall/
  discrimination, not the 14-mode engine field. (ADR-007 risk note stands.)

## Regression floor

Fast path (89×55 → 28-field → descriptor-only) is byte-identical when `MIND_VISION_HIRES` is unset
or no hi-res field is passed. No existing test modified. No commit made; unrelated in-flight tree
changes left untouched.
