# ADR-013 — Sensory Actualization: kill the double-encode, surface the six-section scan

**Status:** accepted · **Date:** 2026-08-25 · **Track:** sensory depth + deterministic learning foundation
**Files:** `app/electron/{main,omegaLoop}.cjs`, `app/renderer/fab.js`, `app/scripts/smoke.mjs`
**Verified:** brain battery **550/550 green, S0 oracle bit-identical** · app smoke **29/29 PASS** · `fab.js` parses clean.

---

## The operator's ask

Review the depth of the sensory nodes / resolutions / Fourier transforms so the brain
*feels and actualizes* the sensory experiences deterministically; wire the sensory
pipelines truly into the cam/mic UI buttons; lay the foundation so any pattern that can be
realised can be learned down to its coherent meaning.

## The defect found (ground truth, before any change)

**The brain never heard the real signal.** The renderer sent raw PCM (8192 samples) and a
raw 144×89 luminance grid over IPC, but `main.cjs` then flattened audio through the app's
own 14-mode Goertzel codec into a **28-number field** and injected *that*. The brain's
`encodeAudio` received the 28-value spectral sketch and re-interpreted it as **raw PCM**,
folding it a second, wrong time. Two irreconcilable transforms stacked — the certified
`sense/` substrate (5 encoders, Sensory Node Array, scan, fusion, per-rung transport) was
being fed a pre-flattened shadow instead of the waveform. Vision was less broken (its grid
reached `encodeGrid`) but `main.cjs`'s `fieldFromLuminanceGrid` was **dead code**.

## The decision — encode exactly once, in the brain

**Pass raw over IPC; the brain's certified encoders do the only transform.** The app codec
(`sensory.cjs`) leaves the live injection path and becomes **telemetry-only** (it still
drives the FAB level meter: energy / dominant φ-band / mean luminance, computed from the
same raw signal). Single source of truth, determinism law L2 preserved, no engine code touched.

- `main.cjs` — audio: `injectSensor("audio", pcm)` (raw Float64 PCM); vision:
  `injectSensor("vision", grid)`. Telemetry still computed, never injected.
- `omegaLoop.cjs` — `injectSensor` now **returns the brain's `EncodeReport`**
  (`{peak, energy, support, scale}`) and surfaces errors as `{error}` instead of silently
  swallowing — the live sensory path is now observable.
- `omegaLoop.cjs` state — added `scan` (the host's six-section sensory scan of the base
  rung), the deepest sensory-depth readout the engine computes.
- `fab.js` — new **SENSES deck** rendering the scan: S1 census (lattice grid), S2 organs,
  S3 spectral vibration depth (φ-band occupancy bars, capture, drift), S4 energy (entropy,
  mean frequency), S5 flux (circulation, closure defect), plus the verdict.
- `smoke.mjs` — sensory block rewritten to the live contract (raw → brain encoder, assert
  the returned report) + a scan-view assertion.

## Why no regression is provable, not assumed

The encoders, engine, and dynamics are **untouched** — only what the app *feeds* them
changed, and the read-only views surfaced. The **S0 regression oracle reproduces its frozen
1000-tick hashes bit-for-bit** (PICO/NANO/MICRO + same-build-twice), which is the ground-truth
proof the certified dynamics did not move. Battery 550/550, smoke 29/29.

## What is now wired end-to-end (live)

cam/mic FAB → raw capture → brain's own encodeGrid/encodeAudio → sensory plane fusion →
per-rung transport → the field; and back out: six-section scan + spectral + fusion/loop-gain
telemetry → the SENSES deck, all computed live each tick.

## Honest limits / next (not yet done — see plan step 4)

- **Deterministic pattern-learning on the sensory stream** (Mind concepts + braid memory +
  self-model surprise/novelty, fed *by the senses*) is the foundation this ADR enables but
  does **not** yet wire — that is plan step 4, deliberately separated so this ADR stays a
  clean, verifiable sensory fix.
- The SENSES deck reads the base rung (rank 0); per-rung scan selection is a UI follow-up.
- pack/dist re-run after these changes is pending (build chain is green via ADR-012 driver).
- No git commit made (operator's call).
