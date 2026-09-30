# SENSORY FORENSIC AUDIT — the scale ladder of the Ω field

**Status:** audit complete · dormancy fixed · verified (r30 + 769-test suite + smoke).

**Rule applied:** no speculation. Every claim names the file, function, and measured
number. A "scale" is the concrete φ-frequency the encoder computes, not an analogy.

---

## 1. The scale backbone — one φ-ladder, three axes

The machine is a **toroidal RHUFT lattice** (`MultiTorusEngine`, 18-rung dense core).
Every sensory module writes onto the same complex field and is placed on the same
**φ-octave ladder**. There is no "UV band" as a special case — the ladder *is* the
electromagnetic-scale backbone, because all wave scales are octaves and the ladder is
`φ^(k/2)` per step:

| Axis | Concrete scale | Where it lives |
|---|---|---|
| **Temporal frequency** | `f_k = 89 · φ^(k/2)` Hz, `k = 0..13`, octave-folded under Nyquist | `sensory.cjs:fieldFromWaveform` (Goertzel) + `sense/encode.ts:encodeAudio` (FFT → log-frequency bands) |
| **Spatial frequency** | golden-spiral modes at golden angle `2π(1 − 1/φ)`, radius `φ^(k/2)` | `sensory.cjs:fieldFromLuminanceGrid` + `sense/encode.ts:encodeGrid` |
| **Symbolic / meaning** | `φ^(k/2)` per character (28-fold alphabet) | `sense/encode.ts:encodeText` (φ-gematria) |
| **Slow mechanical envelope** | sub-`L/8` box-filter envelope | `sense/encode.ts:encodeTouch` |
| **Generic scalar phyllotaxis** | golden-angle `2π(i·φ⁻¹)` phase per node | `sense/encode.ts:encodeScalars` |

This is the "dimensionally stable spacetime": the scale ladder is **φ-ratioed**, so a
signal is the *same event* at every scale (octave invariance), and the rungs of the
torus are the same ladder in *space* (`rung r` receives the fused field scaled by
`φ^(−r/2)` — `plane.ts:resolve`, the √φ rung falloff).

**Scale ↔ wave mapping (what the user asked to audit):**

- **beyond-UV / EMF (highest octaves)** → the top of the temporal ladder
  (`f_13 ≈ 89·φ^6.5 ≈ 8.9 kHz`, then octave-folded); represented by `encodeAudio`'s
  high bands and by `encodeScalars` for an arbitrary EMF/telemetry series.
- **light (spatial)** → `encodeGrid` golden-spiral spatial DFT (the vision channel).
- **sound (temporal)** → `encodeAudio` (the audio channel).
- **feelings / mechanical** → `encodeTouch` (the slow envelope; *was dormant*).
- **thoughts / symbolic** → `encodeText` φ-gematria (the text channel; the meaning
  spectrum is recovered in perception's CONTENT block).

---

## 2. Sensory module census (as found)

The encoder declares **five modalities** (`sense/encode.ts:28`):
`'scalar' | 'text' | 'grid' | 'audio' | 'touch'`.

| Modality | Encoder | Was reachable on the live path? | Finding |
|---|---|---|---|
| `text` | `encodeText` | ✅ | declared + injected (chat/documents) |
| `grid` (vision/light) | `encodeGrid` | ✅ | declared + injected (camera) |
| `audio` (sound) | `encodeAudio` | ✅ | declared + injected (mic) |
| `touch` (feelings) | `encodeTouch` | ❌ **DEAD CODE** | `host.ts` switch had no `case 'touch'`; it fell through to the scalar default. `encodeTouch` had **zero consumers** (grep-verified). |
| `scalar` (EMF/telemetry) | `encodeScalars` | ❌ **unreachable** | only reachable via the `default` branch, but no channel was declared `scalar`, and `omegaLoop.injectSensor` accepted only `audio`/`vision`/`text`. |

**Conclusion the audit pinned:** the *plane* was never dormant — it always fused and
transported to every rung (`MultiTorusEngine.ts:256` → `plane.resolve()`). The dormancy
was exactly **two unwired encoders**: `touch` (dead code) and `scalar` (unreachable).

---

## 3. Full pipeline (verified, not assumed)

```
renderer sensor (mic/cam/chat/pointer/telemetry)
  → preload (window.omega.sensor*)
  → main.cjs ipcMain.handle("omega:sensor:*")
  → omegaLoop.injectSensor(kind, data)
  → host.pushChannel(id, data)          [encodeText/Grid/Audio/Touch/Scalars]
  → SensoryPlane.push(id, field)        [bound ‖v‖_inf ≤ φ — Law L-S1]
  → (each tick) SensoryPlane.resolve():
       fuseChannels (coherence-weighted 1/√k)  → bound again
       octaveTransport(fused → each rung)       → ×loopGain·φ^(−r/2)
  → MultiTorusEngine consumes staged per-rung fields (the ξ-term S)
  → Ω-P8 perceive() reads every live channel + the rung-0 sensor array
  → scan(0) six-section deep readout (per-node vibration/energy/flux/bands)
```

Every stage is **observe-only** (digest-neutral): the S0 determinism oracle is untouched,
which is why the 769-test suite still passes bit-exactly.

---

## 4. Fixes applied (this audit)

1. `runtime/host.ts` — import `encodeTouch`; add `case 'touch'` → `encodeTouch`
   (it had silently routed touch through the scalar default).
2. `app/electron/omegaLoop.cjs` — declare `touch` + `scalar` channels; accept both kinds
   in `injectSensor`.
3. `app/electron/main.cjs` — add `omega:sensor:touch` + `omega:sensor:scalar` handlers.
4. `app/electron/preload.cjs` — expose `sensorTouch` + `sensorScalar`.
5. `test/r30-sensory-full-wiring.test.ts` — permanent guard: all five modalities encode
   to a bound non-zero field, fuse, transport to every rung, and are deterministic.

**Measured after the fix** (`scripts/_sensory-audit.cjs`, MESO profile):

```
audio   peak=0.1340  energy=0.0213  support=71   bound ✓
vision  peak=0.0947  energy=0.0281  support=18   bound ✓
text    peak=0.3368  energy=1.5013  support=89   bound ✓
touch   peak=0.2798  energy=3.2659  support=89   bound ✓   ← was dead code
scalar  peak=0.3993  energy=7.2661  support=89   bound ✓   ← was unreachable
senseChannels = 5 (all five fused)
plane rungs   = 13/13 receiving sensory energy  (active across ALL nodes)
```

---

## 5. The blueprint — computational methods (in place, tested)

The "ideal computed coherent universe" is already the engine's contract; the audit's job
was to close the sensory gap, not to redesign it:

- **RHUFT toroidal lattice** — the coherent substrate (18-rung dense core, φ-ratioed).
- **φ-octave ladder** — the single scale backbone for time (frequency), space (angle),
  and meaning (gematria). Octave folding = scale invariance.
- **Fusion** — coherence-weighted `1/√k` sum, so N incoherent channels never blow the
  `φ` injection bound (`fusion.ts`).
- **Octave transport** — the fused field is transported rung→rung at `φ^(−r/2)` falloff,
  so a local sensory event arrives at every scale with the correct authority (`plane.ts`,
  `web/octave.ts`).
- **Perception Ω-P8** — BAND/SPACE/FIELD/CONTENT blocks, amplitude-invariant, so a quiet
  and a loud instance of the same signal land on the same concept (`perception.ts`).
- **Six-section scan** — per-node vibration, frequency, energy, flux, band capture
  (`scan.ts`, `rungScan`).
- **Determinism** — no RNG, no clock in any encoder; text hashing runs through the shared
  `SeedStream`. S0 bit-exactness holds (769/769).

---

## 6. Remaining work (concrete, not speculation)

The *engine* is now complete for all five modalities. What remains is the **digital
attachment** (the renderer drivers that feed the two newly-exposed channels), each with a
real, non-speculative source:

1. **Touch** — `pointerdown/pointermove` pressure (a real desktop input), buffered into a
   window and sent via `window.omega.sensorTouch`. (No touch hardware → the channel stays
   honest and silent, like a muted mic.)
2. **Scalar / EMF** — device telemetry (`navigator.getBattery`, CPU load, or an oscillator
   for testing), sent via `window.omega.sensorScalar`. This is the "beyond-UV" scale made
   concrete: any real scalar wave series lands on the φ-phyllotaxis field.
3. **Deep-resolution consistency** — `scan(rank)` is currently surfaced for rank 0 only;
   expose the scan of higher rungs so the six-section readout is visible at every scale.

These are renderer/UI wiring steps; the brain-side encoders and transport they depend on
are now wired and tested.

