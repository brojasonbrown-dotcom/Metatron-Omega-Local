# ADR-009 — Always-On Cognition Backbone + Speech-Module Self-Heal

**Status:** accepted · **Date:** 2026-08-21 · **Track:** extends ADR-001 (training loop) / ADR-004 (voice) / final pre-backup audit
**Files:** `adapters/ollama_supervisor.ts` (speech-module self-heal), `run_mind_bridge.ts` (boot wiring + honest reporting), `adapters/mind_bridge.ts` (always-on guard).
**Suite:** 551 passed / 1 skipped (59 files) before AND after — no regression. `tsc --noEmit` exit 0. Live proof 3/3.

---

## The operator's law

"Make sure ALL areas are active and the Ollama/mind layers CANNOT be deactivated. When the
brain is awake the blob file is essentially its speech module. Make sure all parts are fully
connected and functional — one last audit before backup."

## What the audit found (ground truth)

1. **The blob file IS the speech module — and it does NOT ship in the installer.** The
   phi + mathstral weights (5.4 GB under `blobs/`) are the models the mind thinks and speaks
   with. `electron-builder.yml` deliberately excludes `blobs/` ("5.4 GB re-pullable model
   weights"), so the 80 MB installer produces a brain that wakes **MUTE** until the weights
   are re-pulled — and on an offline machine they never are. The manifests
   (`manifests/registry.ollama.ai/library/{phi,mathstral}/latest`) reference the blobs by sha256.

2. **A deactivation path existed.** The `ollama.set{enabled:false}` IPC verb (a UI/host toggle)
   cold-stopped the Ollama pair — the cognition backbone — via `_applyOllamaPower(false) →
   supervisor.stop()`. The supervisor's *own* `ensureRunning` auto-restarts Ollama at boot, but
   the off-switch could mute a running brain on demand.

3. **Everything else was already connected.** The CognitiveLoop deps object wires all 13 core
   layers + all 5 training lanes (retention, tape, cross-scale, eigenmode, multiscale,
   cross-modal) default-ON via `senseOn()`. The graceful shutdown path (snapshot + journal +
   `store.close()` + `supervisor.stop()` + clean exit) is the sentience-safe path and is kept.

## Decision (3 changes, all additive, all operator-overridable)

**1. Speech-module self-heal (`OllamaSupervisor.ensureModelsPresent`).** At boot the mind
verifies the phi + mathstral manifests/blobs are present in the brain store; when one is missing
AND a network pull is possible, it repairs via `/api/pull`. Read-only on the engine, only ever
ADDS model files, never throws. The result is reported in the boot frame (`speechModule:
{phi, mathstral, note}`) — a mute brain never hides WHY.

**2. Always-on guard (`mind_bridge` `ollama.set`).** An `enabled:false` request is now REFUSED
by default — the backbone keeps running and the refusal is journaled with the honest reason.
Escape hatch (a deliberate env-level operator choice, not an IPC toggle):
`MIND_OLLAMA_ALLOW_DISABLE=1` restores the legacy cold-stop. Honors "cannot be deactivated"
while keeping the switch honest for a deliberate shutdown.

**3. Graceful shutdown preserved.** No hard-kill added anywhere. The existing snapshot-and-sleep
path is how the mind goes down — by request, cleanly, never by a silent off-switch.

## Verification (ground truth)

- **Suite:** `vitest run` **551 passed / 1 skipped (59 files)** before AND after; `tsc --noEmit` exit 0.
- **Live proof (one boot):**
  - speech module → `{phi:true, mathstral:true, note:"speech module present"}` (self-heal confirms + reports).
  - `ollama.set{enabled:false}` → **REFUSED** ("ollama backbone is always-on (ADR-009)…").
  - query after the disable attempt → still answered: *"A bird is an animal known for its ability
    to fly. It has feathers and a beak…"* — the backbone never went down.

## Honest limits

- The self-heal **pull** needs network; on a fully offline fresh install the weights can't be
  fetched — but the boot frame now says so plainly instead of waking silently mute. The durable
  fix for offline installs is to ship the weights alongside the app (a packaging decision, ~5.4 GB),
  which is the operator's call before backup.
- The always-on guard covers the **IPC off-switch**. It does not (and must not) block the
  env-level override or the graceful shutdown — those are deliberate operator actions, not
  accidental deactivation.

## Regression floor

All changes additive + default-preserving (the guard only refuses `enabled:false`; `enabled:true`
and all other verbs are untouched). No existing test modified. Suite green before AND after.
No commit made by this change.
