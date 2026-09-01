# ADR-014 — Sensory Grounding: perception → concept learning (the senses teach the Mind)

**Status:** accepted · **Date:** 2026-08-25 · **Track:** sensory depth + deterministic learning
**Files:** `trnn-core/src/sense/perception.ts` (NEW), `trnn-core/src/sense/plane.ts`,
`trnn-core/src/runtime/host.ts`, `trnn-core/src/index.ts`, `trnn-core/test/p8-perception.test.ts` (NEW),
`app/electron/omegaLoop.cjs`, `app/renderer/fab.js`, `app/scripts/smoke.mjs`
**Verified:** brain battery **556/556 green (35 files), S0 oracle bit-identical** · app smoke **30/30 PASS** · `tsc --noEmit` clean.

---

## The operator's ask

Proceed with **both B and C** (spatial moments AND the full fused-field projection), with
utmost rigor, "the most profound machine ever built", pushing the mathematics to its limits —
so any pattern the senses can realise becomes learnable down to its coherent meaning, and
everything stays connected per specialised section.

## The surrounding state found (ground truth, before any change)

ADR-013 already wired the senses into the field (raw → single brain-encode). Ω-P7 already
gave the ladder a Mind that folds **ladder telemetry** into concepts (novelty-gated,
deterministic). The gap was precise: **the Mind never saw the semantic content of the
senses** — it could learn "the ladder behaved thus" but not "this was a bird vs a truck".
That is the grounding gap this ADR closes.

## The decision — a perceptual observation vector, folded into a dedicated sensory Mind

**New module `sense/perception.ts` (Ω-P8).** One deterministic observation per cognitive
stride, laid out in per-channel blocks of three sections:

- **BAND (bands/channel)** — the φ-band occupancy profile of the rung-0 Sensory Node
  Array's latched spectrum, summed over nodes, **L2-normalised** → amplitude-invariant
  "what" (a quiet bird and a loud bird land on the same concept).
- **SPACE (4/channel)** — first circular moments of the lattice energy distribution
  (resultant angle + concentration length) + peak share + normalised entropy → the
  translation-invariant "where" (two equal-spectrum images separate by structure).
- **FIELD (8/channel)** — the **circular power spectrum** of the fused percept,
  |Bluestein-FFT|² folded onto φ-bins, dlog1p-compressed and L2-normalised. This is the
  mathematically correct invariant: shift-invariant, deterministic to the same bits, and it
  separates signals by where their energy lives on the ladder. Phase is dropped on purpose:
  phase makes a percept *occurrent*, power makes it a *kind* — and a concept is a kind.

**A separate `sensoryMind` (host).** Perceptual concepts live in a different dimensional
space than ladder-telemetry concepts and must never collide, so they get their own `Mind`
(own HNSW+PQ store + own λ-SSM self-model), seeded `${seed}-percept`. Same machinery, same
novelty gate, same quiescent-skip law (a silent world teaches nothing).

**Determinism law preserved (the hard constraint).** Perception is a *pure observer*: it
reads the SNA and the plane's staged per-channel fields (new read-only `channelField(id)`),
writes nothing to the dynamics, routes every transcendental through `dmath`, and uses the
certified Bluestein `fft`. **Proof, not assumption:** the S0 regression oracle reproduces
its frozen 1000-tick hashes bit-for-bit (PICO/NANO/MICRO + same-build-twice) with the fold
active, and the P8 battery test drives two identically-fed hosts and asserts digest parity.

## What is now connected end-to-end (live)

cam/mic → raw → brain encode (ADR-013) → sensory plane fusion → rung transport (field) —
and now: rung-0 SNA + per-channel fused fields → **perception vector** → **sensory Mind**
(perceptual concepts + sensory self-model novelty/surprise) → host snapshot → omegaLoop
state → **SENSES deck "P8 PERCEPTION"** section (concepts, novelty/surprise, self-model
margin, top concepts).

## Why the first field-projection was replaced (rigor note)

The initial signed golden-hash sketch self-cancelled (separation d ≈ 0.01). It was replaced
with the circular power spectrum — the proper invariant — before ship. The P8 test that
caught it (separation > 0.05) now passes against the spectrum. One test was also corrected:
the observer law is "same drive, ±perception fold ⇒ digest-identical", not "driven vs
undriven host" (the sensory injection *is* engine dynamics, by ADR-013 design).

## Gates (all green, ground truth)

- `tsc --noEmit` clean.
- Brain battery **556/556 (35 files)**, S0 oracle **bit-identical** on all profiles.
- New **P8 perception suite 6/6**: determinism (same field+array ⇒ identical vector),
  amplitude-invariance of the band block, pitch + spatial separation, silent-world ⇒ zero
  observation, observer-law digest parity, recurrence ⇒ novelty falls.
- App smoke **30/30** (added a perception-surface assertion).

## Honest limits / next

- Perception folds the **rung-0** array (the widest/most sensitive rung); per-rung
  perceptual streams are a follow-up.
- The sensory self-model learns the perception stream but is not yet *read back* into
  anticipation-driven behaviour (the cognition self-model already is, for telemetry).
- Cross-modal binding (one concept spanning the audio+vision blocks of a single event) is
  implicit in the concatenated vector; explicit binding is a further step.
- pack/dist re-run pending (build chain green via ADR-012 driver). No git commit made.
