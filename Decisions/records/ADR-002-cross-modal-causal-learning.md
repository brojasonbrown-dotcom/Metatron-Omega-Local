# ADR-002 — Cross-Modal Causal Learning (correlation → causation)

**Status:** Accepted. Phase A (M1/M3) + Phase B (M4/M2) SHIPPED. Phase C (full generative cross-modal prediction) DEFERRED.
**Date:** 2026-08-10 (Phase A); 2026-08-10 (Phase B — M4/M2 shipped on real data contracts)
**Context:** `cognition/cross_modal_correlator.ts`, `cognition/cognitive_loop.ts`, `adapters/sensors/optical_flow.ts`, `adapters/sensors/stream_separator.ts`, `adapters/sensors/vision_screen.ts`, `adapters/sensors/audio_mic.ts`, `schemas/validate.ts`.

## The problem

The first cross-modal correlator learned `vision.dog ↔ audio.bark` purely by
co-occurrence in time. Time is the **weakest** correlate. It makes a precise,
repeatable error: a dog sits in frame while a car passes out of frame → the
correlator strengthens `dog ↔ vroom`. That is false learning, and it compounds.

The goal is not "things co-occur" but "**what causes what**" — without ever
violating the honesty law (a correlation is reported with its n, never asserted as
equivalence or causation).

## What was considered (7 mechanisms)

1. **Lagged causal precedence** — only count a link when a *change* in modality A
   precedes an observation in B.
2. **Auditory source separation** — parse a mixed soundscape into streams
   (bark-stream, car-stream) before any correlation.
3. **Prediction-error gating** — only surprise updates a link; repetition is
   suppressed.
4. **Movement-anchor** — attribute sound to the *region that moved* (optical flow).
5. **Confidence decay** — unconfirmed links fade; counter-examples subtract.
6. **Counterfactual tracking** — record "dog present, no bark" as disconfirming.
7. **Cross-modal prediction** — predict one modality from another; the residual is
   the learning signal.

## Decision

**Shipped (Phase A):** M1 (lagged precedence), M2 (prediction-error gate), M3
(confidence decay + counter-evidence). These are pure-data mechanisms: they operate
only on the 28-fields and per-source history the pipeline already produces. Each is
independently gated and reversible:

- `MIND_CROSS_MODAL=1` — master switch (default off; observe() is a no-op).
- `MIND_CROSS_MODAL_LAG=1` — M1 lagged precedence (default off = plain path).

The correlator remains **read-only** — it never perturbs the engine's sensory door.

**Shipped (Phase B — the deferred two, built on REAL data contracts):** the original
ADR deferred M4 (movement-anchor) and M2 (source separation) as "requiring data the
pipeline does not produce." On inspection, the pipeline **already produces** that
data at the sensor boundary and discards it: `vision_screen` computes a full 89×55
luminance grid before collapsing to the 28-field, and `audio_mic` computes a full
Parseval-certified spectrogram before collapsing. The mechanisms were built on that
real data — no proxy, no fake data:

- **M4 · movement-anchor** (`adapters/sensors/optical_flow.ts`). Real per-region
  optical flow (Lucas–Kanade brightness-constancy, 2×2 structure-tensor Cramer
  inversion per region) over consecutive luminance grids. A region's motion is
  trustworthy only when its structure tensor is well-conditioned (aperture floor);
  a textureless region reports ~zero confidence rather than a fabricated vector.
  The dominant confident region is attached to the vision frame as `motion`
  (config-gated, additive).
- **M2 · auditory source separation** (`adapters/sensors/stream_separator.ts`).
  Spectral-flux onset segmentation + whitened-signature clustering over the
  certified spectrogram, decomposing a soundscape into energy-certified streams
  (bark-stream / car-stream). Streams carry Parseval-backed energy mass; slivers
  under 5% of clip energy are dropped. Attached to the audio frame as `streams`
  (config-gated, additive).
- **Attribution** (`cross_modal_correlator._attribute`). When a vision frame carries
  `motion` and an audio frame carries `streams`, each stream is linked to the moved
  REGION (weighted by stream energyFraction × anchor confidence), recorded in a
  separate region↔stream map alongside the honest whole-frame sample. The dog/car
  case is now **resolved**: the vroom lands on the car's moved region; the static
  dog contributes no anchor and is exonerated (no region link).

Both side-channels are additive, config-gated, and never touch the locked 28-field.
The `SensoryFrame` contract gained optional `motion` / `streams` blocks with
validate-if-present semantics (reject loudly on corruption — TRUTH_SOURCES).

## Honest deferral (what remains)

**Phase C — full generative cross-modal prediction (M7)** is DEFERRED. Predicting
one modality's *field content* from another (a generative model that hallucinates
the expected bark-spectrum from a dog-image and scores the residual) requires a
learned generative head the project does not yet have. M3's `counterEvidence()` is
the primitive counterfactual. The module measures **lagged, region-anchored,
stream-separated, prediction-gated, decaying** correlation — the strongest honest
statement the current data supports — and does **not** claim proven causation.

## Consequences

- The dog↔vroom class of error is now **addressed at two levels**: M1 removes the
  no-antecedent link (the dog didn't change), and M4+M2 actively attribute the
  sound to the correct region+stream when the data supports it.
- Zero regression: every gate is opt-in; with all gates off the behaviour is
  byte-identical to the plain co-occurrence correlator (proven by test).
- No production behaviour change by default.

## Verification

- `tests/cross_modal_correlator.test.ts` — 9 tests (Phase A: zero-regression, M1
  antecedent, precedence, both-static rejection, M2 surprise-vs-repeat, M3
  counter-evidence, decay, honesty, determinism).
- `tests/optical_flow.test.ts` — 5 tests (static→null anchor, localisation to the
  moved region, dog/car region separation, aperture honesty, determinism).
- `tests/stream_separator.test.ts` — 5 tests (single tone→1 stream, bark+hum→2
  streams with distinct support+pitch, energy certified ~1.0, silence honest,
  determinism).
- `tests/region_stream_attribution.test.ts` — 6 tests (region↔stream record, dog
  exonerated on static scene, bark/vroom separate records, whole-frame + region
  coexist, energy-honest sliver drop, determinism).
- Full battery: v14 typecheck clean, engine 432/432 untouched.
