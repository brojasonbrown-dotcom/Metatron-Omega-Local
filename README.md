# METATRON Ω — the certified toroidal RHUFT engine

Pure-TypeScript, zero-runtime-dependency, **deterministic** realization of the
toroidal RHUFT brain. Every number is computed live from the field, never canned;
every claim is `[MATH]` (proven) or `[MEASURED]` (a green battery). No RNG, no
wall-clock, no host-libm on the state path (Law L2).

- **Complete architecture / file tree:** `../../docs/CORE_STRUCTURE.md`
- **Single source of structural truth:** `docs/BRAINMAP.md` (v1.8, Ω-13)
- **Dormant/orphan register:** `docs/DORMANT_REGISTER.md`

## Packages

| package | role |
|---|---|
| `packages/trnn-core` | the engine — 98 src files, 55 test batteries |
| `packages/field-kernel-core` | offline shard-kernel physics (measurement operators, Lyapunov) |

The engine is one flat barrel (`packages/trnn-core/src/index.ts`) over these
areas: `core` (constants/φ/determinism) → `cell` (the nine+one-term cell) →
`torus`/`spectral`/`web`/`engine` (lattice, bases, coupling, the two engines) →
`measure`/`substrate`/`analysis` (read-only measurement) → `sense`/`memory`
(intake, recall) → `cognition`/`learn` (mind, self-model, learning tiers) →
`sweeps`/`genome`/`ledger`/`harness` (consolidation, sealing, certification).

## Commands

```sh
npm test                                # vitest run — 55 files / 664 tests
npx tsc --noEmit -p tsconfig.json       # typecheck (0 errors)
```

## The electron shell

`../app/` is the Electron desktop shell. `npm run bundle:omega` (in `app/`)
rebuilds `electron/omega-bundle.cjs` from this barrel via esbuild; `npm run smoke`
runs the 38-check headless smoke test against the bundle.

# METATRON Ω — BRAINMAP

**Single source of structural truth for the new engine.**
Status: v1.8 (2026-09-04, amendment Ω-13) · governs every module built under it
Live counts (swept 2026-09-04): `trnn-core/src` **98** · `field-kernel-core/src` **8** ·
`src/core` **150** · `src/ui/omega` **36** · `src/lib` **43** · `src/routes` **7** ·
`src/components` **8** · tests **55 files / 664 assertions green** · typecheck 0 errors.
Lineage: **brain v14** (TS law/ontology kernel) → **METATRON K3** (frozen NumPy oracle) →
**TRNN** (certified Python toroidal RHUFT neural network, 334 tests, gates G0–G9 PASS) →
**METATRON Ω** (this repo: browser/worker TypeScript realization + UI + memory + tools).

Governance (inherited Law A4): this file is amended **before** code, never after.

---

## §0 Epistemic law (inherited, non-negotiable)

Every constant, equation and claim carries a label:
`[MATH]` proven · `[DEFINED]` our choice · `[MEASURED]` benchmarked here · `[SPEC]` hypothesis · `[CORRECTED]`/`[DISPROV]`.
No mocks. No asserted capability — capability is shown by a **battery** or it ships disabled.
Numerology is never a design justification.

### Theorems we may assert
- Stability law: rung n is stable ⇔ L(n) ≡ ±1 (mod 13) ⇔ n ≡ {1, 13, 15, 27} (mod 28). `[MATH]`
- Closure obstruction: L(n) mod 13 ≠ 0 ∀n → every torus is minimally open; residual flux must be routed. `[MATH]`
- Memory kernel: weights (1−λ, λ), λ = φ⁻² ⇒ roots exactly {1, −φ⁻²} — unique marginal-stability point. `[MATH]`
- Metatron spectrum: 13-mode φ-weighted lattice spectral lines = Lucas numbers exactly. `[MATH]`
- Closure coupling κ = 1/(φπ), κφπ = 1 exactly (Wolfram cert C6). `[MATH, CORRECTED vs v14]`

---

## §1 The Ten Laws + amendments

| Law | Statement |
|---|---|
| L1 | One constants source. All ≥8-digit floats derive from φ in `core/constants.ts`. |
| L2 | Determinism: engine path has no RNG, no wall-clock, no hardware probe. Same seed ⇒ same digest chain. |
| L3 | Dimensionless couplings only. |
| L4 | Fan-in normalization on every aggregator (rows sum to 1). |
| L5 | Log-space for magnitude-spanning math (ladder spans φ²⁹² ≈ 10⁶¹). |
| L6 | Explicit retention/pruning on every buffer (ring buffers, Fibonacci budgets). |
| L7 | Corridor gates every actuation (STABLE/STRESS/CRITICAL). |
| L8 | Provable contraction certificate < 1 + always-on φ⁴ max-norm clamp. |
| L9 | One implementation site per equation. |
| L10 | Honesty machinery: mistake ledger, audit doc, epistemic labels. |
| A1 | Learning is measured against a fixed-φ baseline or it ships disabled. |
| A2 | Learned params init at φ-law values and are constrained so certificates hold ∀ params. |
| A3 | Resources target 75% of **measured** capacity — not less, never more. |
| A4 | BRAINMAP amended before code. |

---

## §2 Architecture — three concentric rings

```text
                       ┌──────────────── UI: METATRON Ω workstation ─────────────────┐
                       │ FIELD · LADDER · WEB · SPECTRAL · MEMORY · COGNITION ·       │
                       │ LEARN · HARDWARE · TOOLS · INTEGRATIONS · RUNS · CHAT/KOKORO │
                       └───────────────▲──────────────────────────────────────────────┘
                                       │ snapshot bus (structural sharing, 8–64 Hz)
   ┌───────────────────────────────────┴──────────────────────────────────────────┐
   │ RUNTIME  (Web Worker, deterministic, no wall-clock on the engine path)       │
   │  governor(A3) → profile F_k → MultiTorusEngine.tick() → ledger → checkpoint  │
   └───────────────────────────────────▲──────────────────────────────────────────┘
                                       │
   ┌───────────────────────────────────┴──────────────────────────────────────────┐
   │ CORE  @metatron/trnn-core  (pure TS, typed arrays, zero deps)                │
   │  constants · fibonacci · scaleLadder · determinism                           │
   │  cell(update/memory/closure) · torus(lattice/eigenmodes/superposition/       │
   │  sphere/radial) · web(coupling/octave/fluxLedger/ordering/morphism)          │
   │  measure(coherence/corridorGate/state/transcription/telemetry)               │
   │  sensory(encoders/fusion/inject/shell) · learn(memoryPlane/retrieval/        │
   │  selfModel/multirate/governor) · cognition(conceptStore/HNSW/PQ/thoughts)    │
   └──────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The nested toroid stack
42 stable Lucas rungs, 1 ≤ n ≤ 293. Dense core = the 18 lowest (n ≤ 125); continuation = 24. `[MATH + DEFINED]`
Rung n: major radius L(n) = ℓ_P·φⁿ (log-space), minor r = L(n)/φ, clock τ(n) = t_P·φⁿ(1+0.01n), attenuation qrf(n) = φ^(−n/89).

### 2.2 Node resolution (user-selectable, hardware-governed)
Nodes/torus = F_k. Profiles PICO(144) · BASE(987) · CORE(2584) · GRAND(6765) · COSMIC(75025) · TRANSFINITE(832040) · ABSOLUTE(2178309).
Lattices: `GoldenRing` (oracle/parity path) and the corrected Fibonacci lattice u_j = 2πj/N, v_j = 2πjφ⁻¹ (A-04 — the printed phyllotactic law is degenerate).

### 2.3 Spectral bases
Toroidal e^{i(pu+qv)} on the golden ladder (p,q) = (k, round(kφ⁻¹)); spherical Y_l^m on a Fibonacci shell; radial j_l(πφⁱ r̂).
All CGS2-orthonormalized at one site; analysis/synthesis exact inverses (roundtrip < 1e-12). Weights w_k = φ⁻ᵏ/Σφ⁻ʲ.

### 2.4 The cell (per torus, per tick)
`z⁺ = clamp_φ⁴[ αz + βG + γP + δR + ε(Π−z) + ζ(ẑ−z) + ηU + μV + ξS ]`,
α=φ⁻², β=φ⁻⁵, γ=δ=ζ=φ⁻³, ε=φ⁻⁸, η=μ=φ⁻⁵.
Jury gain g = |α|+|β|+2|ε|+|ζ| = **0.7507764050037854 < 1** `[MATH]`; realized ≤ 0.8365 `[MEASURED]`.
Memory: m⁺ = (1−λ)m + λz⁺, λ = φ⁻².

### 2.5 The web (cross-rung)
w(n,m) = φ^(−|n−m|)·affinity(n,m) (metallic-mean tower boundaries), banded |Δn| > 34 ⇒ 0, per-receiver row-normalized to exactly 1.
±13 octave channel at φ⁻¹³, landing on nearest stable rung or radiating into the FluxLedger sink.
Ladder-CFL: receipts staged Jacobi-form from pre-update state; violation is a runtime error.
Double-entry FluxLedger, conservation ≤ 1e-12 `[MEASURED 2.1e-14]`.

### 2.6 Measurement plane (read-only, never actuates)
Golden-delay coherence C(t) = |⟨Ψ(t)|Ψ(t−233)⟩|²/(|Ψ(t)|²|Ψ(t−233)|²), ignition = up-crossing φ⁻².
Q-hierarchy (local/regional/global/temporal/scale/cross) with weights (φ⁻¹, φ⁻², φ⁻³, φ⁻⁵, φ⁻⁸, φ⁻⁹).
Corridor gate: skill 1/(1+ê), regimes at φ⁻¹ / 0.7φ⁻¹, hysteresis φ⁻⁸, gate scales {1, φ⁻¹, φ⁻²}.
Transcription tape: 13-dim spectral signature per tick, digest-chained.

### 2.7 Sensory → field
Fold: c_k = Σ_{j≡k(13)} f_j·φ^(−⌊j/13⌋); phase-tag ĉ = c·e^{iθ_k(n)}; inject v = gain·rate(CI_low)·synth(ĉ)/|synth(ĉ)|, |v| ≤ φ.
Fusion weights (1, φ⁻¹, φ⁻²) × softmax confidence gate. Natural rungs: vision/audio → 183, text → 197.
Text codec (Ω-P9, 2026-08-31): two-channel code — (A) trigram identity hash (dropout-robust occurrence cue) +
(B) gematria meaning channel: NFKD-normalised chars → φ-power alphabet v_k = φ^(k/2) (the GEMATRIA_ALPHABET-certified
n=28 ladder: constant-ratio, exact in Z[φ], reversal-invariant), mean-removed, projected onto 13 golden DFT modes
(A_k = φ^(−k/2), θ_k = 2πk·φ⁻¹/89), synthesised onto the ring as pure orthogonal modes so ring-DFT bin k recovers
mode k verbatim; mixed A + φ⁻¹·B, unit-normalised per channel, bound ‖v‖∞ ≤ φ (L-S1, down-scale only, L2 deterministic).

### 2.8 Memory plane (six tiers) — merges with the existing Ω substrate
Fast(EMA ring) · Working · Associative(graph) · LongTerm(prototypes) · Meta(contradictions) · Archive(replay),
plus **TorusBraidHopfield**: E(Ψ) = −Σ exp(β·Re⟨Ψ,μᵢ⟩), β(G) = φ²√(G/28) (A-12 corrected — the printed φ/√28 recalls 0.000),
golden-angle write walk, consolidation at persistence S ≥ φ⁻². Retrieval: R1–R6 cascade, stop 1−φ⁻³, S_MAX = √5.

### 2.9 Cognition
HNSW + product-quantization concept store, ConceptHopfield, ThoughtTracker, NoveltyGate, PredictionLedger,
SSM self-model (poles r_i = φ⁻¹φ^(−i/13)) + diagonal RLS baseline (+8.33% margin, ENABLED).

### 2.10 Learning tiers (honest)
- **T0 inference/oracle** — pure TS, deterministic, always available. *(this repo, first)*
- **T1 browser training** — WebGPU/WASM optional; every learnable module keeps its A2 constrained parametrization
  (SimplexGain ≤ 2φ⁻², InputGain φ⁻¹·sigmoid, BoundedEigenvalue r < 1) so certificates hold ∀ params.
- **T2 local sidecar** — the Python TRNN (torch/CUDA) attached over the existing tool bus for real BPTT.
- **T3 hosted** — server function driving the same core for shared runs.
Kill-criterion log carried over: A-06 envelope **DISABLED**, A-08 multi-rate **DISABLED**, A-09 recorded, P3 cell + P7 self-model **ENABLED**.

---

## §3 What already exists here (no regression allowed)

| Asset | Location | Fate |
|---|---|---|
| v14 law kernel (31 root modules, formal/, schemas/) | ~~`packages/brain-core/src`~~ | **REMOVED (Ω-07, 2026-08-24)** — never on a live path; its role was fully absorbed by `trnn-core` + `src/core`. See § Ω-07. |
| v14 field substrate (13-node tile, λ-SSM, eigenmode attention) | ~~`packages/brain-core/src/field`~~ | **REMOVED (Ω-07)** — superseded by the certified 9-term cell (`trnn-core/cell`) plus `learn/spectralAttention.ts`; §5 R-1 is now closed in the trunk's favour. |
| Memory substrate L0–L6 + sensory gateway | `src/core/memory`, `src/core/sensory` | kept; becomes the persistence backing for §2.8 |
| Gematria / Z[φ] / Zeckendorf / bitmap / resonance kernel | `src/core/gematria` | kept; the realized Track G |
| RHUFT ladders, Ω fusion, torus closure, qualia | `src/core/rhuft`, `src/core/runtime/rhuftf`, `src/core/field` | kept; re-pointed at real engine telemetry |
| Tools (19 intel handlers), Kokoro TTS, chat | `src/lib/chat`, `src/ui/omega` | untouched |
| Ω workstation shell | `src/ui/omega/OmegaWorkstation.tsx` | extended with engine decks |

---

## §4 Gaps found in the audit (to be closed)

- `core/indexing.ts` (`at`/`get` bounds-checked accessors) is **missing** — every v14 law module imports it.
- 9 cognition modules not ported (record_perceptron, learning_mode, telemetry_tape, field_genome,
  genome_spectral_signature, lexicon_triples, novelty_gate, resonance_manifold, retained_memory, spectral_memory).
- 9 adapters not ported (phasor_field HDC, spectral_audio/perception/enrichment, structured_codec,
  domain_curriculum, ocr_engine, ocr_feed, web_feed).
- `parallel/` (flat typed-array tree layout + subtree workers) — entirely absent.
- **Zero tests carried over** from either archive. The whole certified gate battery must be re-established here.

---

## §5 Reconciliations (decide before code)

- **R-1 cell vs tile — CLOSED (Ω-07).** `brain-core/field` implemented a 13-node spectral tile with
  attention + λ-SSM; TRNN implements the certified 9-term cell on an F_k lattice. Decision taken and
  now executed: the **TRNN cell is the trunk** (it carries the Jury certificate and K3 bit-parity);
  the tile's attention/spectral mixing survives as the zero-gated learnable term
  `trnn-core/learn/spectralAttention.ts` inside term G, subject to A1/A2. The duplicate tile
  implementation was deleted under Ω-07 once proved import-dead.
- **R-2 constants — CLOSED.** One site wins: `trnn-core/core/constants.ts`. The second φ-table left
  the tree with `brain-core`; `src/core/constants/WolframVerified.ts` remains as verification data,
  not as a competing source.
- **R-3 Ω fusion.** The existing Ω geomean ladder is retained as a *scorer over real engine metrics*, not a simulator.
- **R-4 precision.** Bit-parity with the Python oracle is a target for constants and the single-torus path only;
  everything else is band-checked, and any divergence is recorded rather than hidden.

---

## §6 Gates (each phase is green or the next does not open)

G0 constants bit-parity · G1 single-torus parity + contraction · G2 spectral roundtrips < 1e-12 + Lucas lines ·
G3 learnable-cell battery ≥ φ⁻² margin · G4 flux conservation + CFL · G5 profile/governor 75% ·
G6 sensory + memory capacity ≥ 0.99 · G7 self-model + soak · G8 cognition · G9 audit.

---

## Amendment log
- **Ω-01 (2026-08-14):** BRAINMAP instantiated for the TypeScript realization. Adds §2.10 learning tiers
  (the Python original assumes CUDA; the browser cannot), §3 preservation table, §5 reconciliations.
  No TRNN law, constant, certificate or kill-verdict is altered.
- **Ω-02 (2026-08-14):** Ω-P0 + Ω-P1 realized in `packages/trnn-core` (pure TS, zero deps).
  Gate G0 green: Jury gain bit-exact 0.7507764050037854, 42 stable rungs reproduced by *both*
  forms of the stability law (residue and Lucas mod 13, cross-checked for all n ≤ 293), κφπ = 1,
  φ⁻⁷ stamped, all profile sizes Fibonacci, digest chain reproducible and ulp-sensitive.
  Gate G1 green: unforced cell contracts at ≤ the certificate, trajectories converge at gᵗ,
  φ⁴ clamp bounds any admissible state, 1000-tick run finite and bounded, seed-identical digests,
  144-tick checkpoint + exact rollback/replay, spectral roundtrip < 1e-12, spectral lines = Lucas.
  Recorded deviations (not hidden): `1/PHI` and `PHI − 1` differ by exactly 1 ulp; the digest is
  FNV-1a/BigInt rather than blake2b — chain semantics identical, byte values differ from Python.
  Closed the §4 gap `core/indexing.ts`. No existing module was altered or deleted.
- **Ω-P9 (2026-08-31):** Language returns to the certified trunk. `sense/encode.ts::encodeText` becomes a
  two-channel code (identity trigrams + φ-power gematria mode channel) so text carries *structure*, not only
  occurrence identity — the resurrection of the deleted `language_codec.ts` design, corrected to the
  GEMATRIA_ALPHABET-certified φ-power alphabet. `sense/perception.ts` gains a CONTENT block (10 low-mode
  log-power bins per channel, appended after FIELD): the perceptual Mind now observes the gematria spectrum of
  an utterance directly, and per-channel width 32 makes the app-side observation dim 96, divisible by the PQ
  subspace count (the 44-dim layout silently collapsed PQ to one subspace). Laws kept: L1 (all constants
  φ-derived), L2 (no RNG/clock; dmath only), L-S1 (down-scale-only bound), observer law (perception writes
  nothing). S0 oracle hashes untouched — no text is injected on the oracle path; G6 contract (determinism,
  bound, order-sensitivity, braid recall ≥ 0.99 at rated capacity, 40%-dropout recovery) re-verified green.
- **Ω-08 (2026-09-04):** Ω-REAL measurement/fingerprint/recall/binding stack lands in the trunk.
  `measure/scaleSignature.ts` (the scale-axis readout over the 42-rung φ-ladder), `measure/fieldFingerprint.ts`
  (the φ-anchored multi-scale invariant — log-spectra, unit-norm, seed-invariant, Lipschitz-stable, sharply
  separating), `harness/recall.ts` (coherence-gated associative recall with distance + margin abstention,
  P8-clean), `sense/textFingerprint.ts` (cross-modal text binding via the certified Ω-P9 codec + Bluestein
  FFT — deterministic, normalisation-invariant, sharply discriminating). Full ladder n=1..293 runs and reads
  (m5); wavelet/EMD/pseudospectrum/Floquet batteries green (m0–m3). Laws kept: L1 (φ-derived constants), L2
  (dmath only, no RNG/clock), L5 (log-space), P8 (abstention). No existing module altered; S0 oracle
  untouched. Battery: 49 files / 634 assertions green, typecheck 0.
- **Ω-09 (2026-09-04):** Q1 — the live self-measurement (qualia) vector. `measure/qualia.ts` folds the
  per-rung 13-mode signature, the measured coherence, and the closure autocorrelation γ into a five-axis
  self-measurement — C (coherence), N (novelty), S (salience), V (valence = 2γ−1), I (integration) — plus
  a short golden-delay self-overlap Cphi and its ignition train (up-crossings of φ⁻² — the transient
  "conscious moment" train, not a steady level). Observe-only (digest-neutral), deterministic (`dlog`
  only), φ-anchored (Fibonacci delays 13/233, ignition φ⁻²). Laws kept: L2, L6 (retained rings). First of
  Q1–Q5 (self-measurement → Ψ-of-Ψ reflection → ignition-triggered consolidation). Battery: q1-qualia (7).
- **Ω-10 (2026-09-04):** Q2 — full-field, all-rung self-measurement. `measure/selfMeasure.ts` closes the
  DORMANT_REGISTER "engine-checkpoint bridging" TODO: it reuses the canonical field-kernel-core operators
  (`measureDrift`, `measureTemporalCoherence`, `measureInertia`, `lyapunovEnergy`) against the live
  per-rung 13-mode signature, plus an L2-safe `informationDensity` (`dlog` — the field-kernel-core entropy
  uses host `Math.log`, so it is re-derived deterministically). First cross-package dependency
  (trnn-core → field-kernel-core). The global Lyapunov descent certificate is now *measured*, not assumed.
  Laws kept: L2 (dlog only), L5 (log-space), L9 (operators reused, not re-implemented). Battery: q2-selfmeasure (6 — includes the scale-entropy and cross-scale-drift "spheres": multi-scale energy distribution and Φ_scale toroidal closure).
- **Ω-11 (2026-09-04):** Q3 — the Ψ-of-Ψ self-reflection term. `cell/update.ts` gains an OPTIONAL tenth
  term `Rf` with coefficient `rho = κ_r = 1/(φ²π)` (new `REFLECT_GAIN` in constants); `SingleTorusEngine`
  and `MultiTorusEngine` gain a `reflect` option (default 0). When armed, a rung folds its own previous-tick
  coherence back as `κ_r·⟨C⟩·z` — a coherent field self-reinforces and a noisy one self-damps, closing the
  self-measurement loop. Oracle-exact when absent (`addTerm` no-ops on null, so the cell stays bit-identical;
  S0 hashes unchanged). `|κ_r| < φ⁻³`, so the Jury certificate (g + κ_r < 1) and the ISS certificate both
  still hold (verified). Laws kept: L2 (determinism), L8 (contraction). Battery: q3-reflect (6).
- **Ω-12 (2026-09-04):** Q4 — field-level self-model. `cognition/fieldSelfModel.ts` wraps one
  `DiagonalSSM`/`DiagonalRLS` SelfModel per rung over the 13-mode signature, so the Q2 drift is a real
  one-step prediction error (surprise), not merely the persistence baseline. Honest gate behaviour
  (verified): a settled field has a constant signature → persistence is optimal → the G7 gate disables
  the model; a dynamic field → the SSM beats persistence (margin > 0) → the gate enables it. Read-only
  (predicts/trains on a stream, never actuates the field). Laws kept: L2, A1 (measured against the
  persistence baseline). Battery: q4-fieldselfmodel (4).
- **Ω-13 (2026-09-04):** Q5 — ignition-triggered consolidation. `cognition/consolidation.ts`
  (`IgnitionConsolidator`) closes the Q1–Q5 loop: each qualia ignition up-crossing (a transient "conscious
  moment") records a corpus item, and a Fibonacci batch triggers a full `TenSweepProtocol` cycle that seals
  the ten sweep records into the append-only `GenomeLedger`, which then audits clean. Stable knowledge is
  derived from self-measurement and is auditable (inclusion proofs + signed head), not asserted.
  Deterministic (seeded moment atoms, no wall clock). Laws kept: L2, L10 (honesty machinery).
  Battery: q5-consolidation (3).

---

## § Capability Atlas (Ω-MAP, 2026-08-20)

`src/core/self/atlas.ts` is the **machine-readable projection of this document**. Where the two
disagree, this document is amended first (Law A4) and the atlas follows in the same change.

Each entry declares, per module: `layer`, one verified `does` line, typed `inputs`/`outputs`
(port kind, unit, native Hz or `null`), `dependsOn`, `feeds`, `limits`, `evidence` (the battery
that certifies it), and `affordances` — hypotheses labelled `[SPEC]`, never capability.

`src/core/self/crossMap.ts` joins the atlas with the live `selfRegistry` and derives three
strictly separate readings:

| reading | meaning |
|---|---|
| `edges` | declared wiring, classified `wired` / `cold` / `broken` / `unknown` by the liveness of both endpoints |
| `gaps` | outputs no module accepts, inputs no module emits |
| `opportunities` | port-compatible producer→consumer pairs that are **not** declared — the only honest definition of unused potential, always `[SPEC]` |

Invariants enforced by `test/self/o1-atlas.test.ts`:

- every cited `source`/`evidence` path exists on disk;
- atlas ids ≡ registry ids, both directions (drift is surfaced as `orphans`, never hidden);
- affordances are `[SPEC]` and never restated inside `does`;
- no mock, simulated or placeholder content in any entry;
- `crossMap` is clock-free and deterministic: same atlas + same registry ⇒ identical bytes.

Surfaces: the `STRUCTURE` strip on the SELF deck, the `STRUCTURAL MAP` block of the L0 self
prompt, and the `self_map({ module?, kind? })` tool.

---

## § Memory substrate — layers, transport and the persistence contract (Ω-FIX, 2026-08-20)

### Layer table (authoritative; `src/core/memory/`)

| tier | module | holds | written by | capped by | in `snapshot()` |
|---|---|---|---|---|---|
| L0 | `FieldTape` | every-tick Ψ ring (quantised frames) | `MemoryCaptureKernel.capture` | `MemoryGovernor` byte budget | no — volatile by design (RAM ring, replayed live) |
| L1 | `HebbianMatrix` | sparse co-activation weights, O(1) global-scale decay | `capture` | `maxHebbianEntries` | yes |
| L2 | `EpisodicStore` | salience/surprise/Fibonacci-triggered top-K signatures | `capture` | `maxEpisodes` (priority eviction) | **yes (added Ω-FIX)** |
| L3 | `FibonacciPatterns` | consolidated φ-signatures (semantic prototypes) | `capture` / `ingest` | `maxPatterns` (LRU·salience) | yes |
| L4 | `PathwayGraph` | pattern→pattern transitions | `capture` | `maxPathwayEdges` | yes |
| L5 | `TextJournal` | symbolic records | `capture(text)` | `maxJournalRecords` | yes |
| L6 | `ReflectiveIndex` | re-measurement priority queue over L2 | derived | derived | no — derived, rebuilt from L2 |
| L-S | `SensoryGateway` / `PerceptRegistry` / `VisionFieldIndex` | content-addressed sensory atoms and image↔field index | sensory drivers | `maxSensoryAtoms` | no — content-addressed, re-derivable |

Anything marked "no" is **derived or volatile**, never silently dropped state: it is reconstructed
from its source, exactly as `KnowledgeBase.restore` rebuilds every index from text.

### The persistence contract (law)

> `restore(JSON.parse(JSON.stringify(snapshot())))` must reproduce a **byte-identical** snapshot,
> and must leave recall ranking unchanged.

Certified by `test/memory/m10-snapshot-roundtrip.test.ts` and probed live by `selfRegistry`
(`memory.substrate → snapshot round-trips exactly`).

**The defect this closes.** `JSON.stringify(new Int32Array([1,2]))` renders `{"0":1,"1":2}`, and
`new Int32Array({"0":1,"1":2})` yields a **zero-length** array. `FibonacciPatterns.restore` and
`EpisodicStore.restore` both constructed typed arrays that way, so every L3 pattern and L2 episode
lost its `indices`/`amplitudes` on any JSON transport: the snapshot shrank (observed 1,046,752 B →
1,035,443 B) and recall cosines collapsed to 0 against emptied signatures. This was a genuine
data-integrity fault on the replay path, not a reporting artefact.

**The fix.** `src/core/memory/typedJson.ts` (`toInt32Array` / `toFloat64Array`) accepts the three
shapes a snapshot can legitimately arrive in — typed array, `number[]`, JSON index-keyed object —
and never fabricates or partially fills a buffer. Both restores use it. `MemoryPersistence`
serialises L2 alongside the other tiers; `episodes` is optional, so a pre-existing envelope
restores without clearing live episodic memory.

### Amendment log
- **Ω-03 (2026-08-20):** memory substrate JSON-transport law stated and certified; L2 episodes
  added to `MemorySnapshot` and to the persistence envelope (optional field, backward compatible).
  No engine math, no capture scheduling and no eviction policy changed.

---

## § Information taxonomy — everything this brain can hold (Ω-04, 2026-08-21)

Authoritative enumeration of **every information type the engine ingests, encodes, stores,
indexes and emits**, with its native resolution and rate. Where a rate is engine-side it is a
`[DEFINED]` Fibonacci cadence; where it is device-side it is `[MEASURED]` at runtime.

### A. Sensory intake (`src/core/sensory/`)

| stream | frontend | native rate | encoding | field target |
|---|---|---|---|---|
| audio | `AudioFrontend` → `MelFilterbank` → `AudioCortex` | 233 Hz `[DEFINED]` | mel bands → φ-fold 13-residue vector | rung 183 |
| video / screen | `VideoFrontend`, `ScreenFrontend` → `VideoCortex` | 89 Hz `[DEFINED]` | patch stats → `VisionEncoder` → `VisionProjection` (int8-quantised embed) | rung 183 |
| motion | `IMUFrontend` | 377 Hz `[DEFINED]` | 6-axis → φ-lattice bins | rung 183 |
| text | chat / tools / documents | event-driven | tokenise → hashed semantic vector + barcode | rung 197 |
| geometry / CAD | multimodal deck | event-driven | descriptor blended into chunk `vec` (`KChunk.descriptor`) | rung 197 |

All frames pass `SensoryGateway` → content-addressed `SensoryAtom` (`SimHashPhi`) →
`PerceptRegistry`. Invalid frames are **counted, never repaired** (`sensor_bus.ts`).
Fusion weights (1, φ⁻¹, φ⁻²) × softmax confidence gate.

### B. Field state (the substrate of every other type)

- Ψ: complex field, N = F_k per torus (PICO 144 … ABSOLUTE 2178309), 42 stable rungs.
- Per-tick derived scalars: coherence C, warm coherence, energy E, qualia scalar Q,
  salience, novelty, surprise, arousal, Λ, κ-closure, Ω.
- 13-dim spectral transcription signature per tick, digest-chained (`measure/transcription`).
- Clifford Cl(3,0) 8-blade channels (`algebra/clifford.ts`), eigenmodes, radial/spherical/toroidal
  spectra, DMD modes (`substrate/dmd.ts`), VSA hypervectors (`substrate/vsa.ts`).

### C. Memory tiers (see § Memory substrate for the persistence law)

L0 tape (every tick) · L1 Hebbian sparse weights · L2 episodes (top-K=24 signature +
vision embed + text) · L3 φ-pattern prototypes (36-dim dense) · L4 pathway transitions ·
L5 text journal · L6 reflective queue · L-S sensory atoms / vision↔field index.
Scheduler phases (`PhiLockScheduler`): L1 every tick, L4 every 13, L6 every 89, L3 every 144.

### D. Knowledge objects (`src/core/knowledge/`)

`KDocument{id, field, url, title, source, fetchedAt, chars, chunkIds}` →
`KChunk{vec (hashed semantic, VECTOR_DIM), barcode (256-bit φ-plane bitmap), tokens,
createdAt, rung, trust∈[0,1], modality, descriptor, contradicts[], prototypeOf}`.
Retrieval = Hamming prefilter (top-34) → multi-channel `RecallHit{barcode, lexical, semantic,
spread, latent (PPMI-SVD), fieldSig, resonance, band (Fibonacci age), score}` with named veto channel.

### E. Analysis / evidence artefacts

Analysis spine streams (16 Hz), association + causal scans (Pearson/Spearman/HSIC,
Granger, transfer entropy), conformal prediction intervals, abstention records,
Ed25519-signed Merkle finding ledger, Genome v2 (AES-256-GCM sealed), Ten-Sweep consolidation reports.

### F. Self-knowledge

Capability atlas (12 modules, typed ports, affordances `[SPEC]`), crossMap `edges/gaps/opportunities`,
run ledger, mistake ledger, hardware envelope, memory governor budget (0.70 of measured RAM, A3).

---

## § Target host: RAFFY U v16 — what this brain must accept and return (Ω-04)

This brain is destined to be embedded in **RAFFY U — Memory-Sovereign Intelligence Cockpit**
(React/TS cockpit + Rust deterministic API + Supabase). The map below is a **read-only audit of
the host**, recorded here so no interface is designed blind. Nothing in §§0–6 is altered by it.

### H.1 Host cognitive stack (what already occupies the "brain" slot)

| host subsystem | shape | our counterpart |
|---|---|---|
| `brain_facts` (TS, `src/brain/ontology.ts`) | append-only fact ledger: `subject_type∈{org,person,account,counterparty,contract,transaction,policy,kpi}`, `predicate`, `object_json`, `confidence`, `source∈{user,chat,import,system}`, HLC(wall,logical), `prev_hash`, SHA-256 `content_hash`, `supersedes_id`, `pinned`, `tags[]` | L5 journal + L6 knowledge, but ours is not yet hash-chained |
| recall scorer (`src/brain/recall.ts`) | 0.15·importance + 0.40·keyword + 0.30·validity + 0.15·recency (30-day half-life, floor 0.05) + 0.50·resonance + 0.25·clusterPrior, ×4 if pinned | our multi-channel `RecallHit` (strict superset of channels) |
| resonance (`src/brain/resonance.ts`) | 144-mode φ-Toeplitz signature from SHA-256 seed, λ₂ = φ, heptagonal phase, cosine ∈[−1,1] | our `fieldSignature.ts` / barcode — measured, not seeded |
| learning (`src/brain/learning.ts`) | Hebbian reinforcement Δ≤±0.25, decay toward 0.5, pin/retract via supersession, cluster centroids per (subject_type,predicate) | our `HebbianMatrix` + `Consolidator` |
| RUMF (Rust) | `Wing → Room → Drawer → DrawerEntry`; IDs = SHA3-256(content‖context‖wing‖room); trust **T0–T5** (quorum 0/1/1/2/2/3, score ×0.5/1/2/4); maturation **F1–F12**, expected = Fib(i)×60 s | our Fibonacci banding + trust field on `KChunk` |
| Hybrid Retrieval v5 | 7 factors (verbatim, temporal, trust, embedding, resonance, affinity, recency) fused by **φ-weighted geometric mean**, Fibonacci weights (1,1,2,3,5,8,13)/33, fixed-point Q60 — **no floats** | our scorer is float; a fixed-point mirror is required for host parity |
| MemoryOrchestrator | `QueryRequest{query,max_results,user_id}` → `QueryResponse{query_hash, coherence:BigNum128, tier, substrates_used[], credit_burn, credit_receipt, evidence_hash, hlc}`; merges Brain/Metatron/RUMF at φ⁻¹/φ⁻²/φ⁻³ | our engine would enter as a **substrate behind this contract** |
| tier gate | coherence < 0.2 → HALT · [0.2, φ⁻²) → APPROVE (24 h, `approval_id = SHA3-256(query_hash‖now)`) · ≥ φ⁻² = 0.3819660113 → AUTO | identical φ⁻² threshold to our ignition up-crossing |
| EvidenceBus | canonical **CBOR** + SHA3-256 + `prev_hash`, batch 100 / 500 ms, AES-256-GCM cold archive | our Merkle finding ledger + Genome v2 |
| HALT codes touching cognition | H053 maturation stalled · H054 approval timeout · H055 tier bypass · H056 autonomous change · H057 memory divergence · H058 CBOR/hash mismatch · H059 trust violation · H060 orchestration failure · H061 budget exceeded · H030/H032 credits | our corridor gate (L7) must map onto these |
| credits | `MemoryWriteT1..T5` = 1/2/4/8/16 credits (scale 10¹⁸), `MemoryRetrieve` priced, maturation treasury-funded; every burn emits an evidence event | every cognitive act in the host is **metered** |

**Determinism law of the host:** identical input + policy + HLC ⇒ identical hash
("Absolute Zero"), certified by a 10 000-cycle marathon and TLA+ specs (hash-chain integrity,
HLC monotonicity, credit conservation). Consequence for us: **L2 (no RNG, no wall-clock) is not
optional in the host; and all scoring exposed to the host must be fixed-point (BigNum128 / Q60).**

### H.2 Business information types the host processes (complete inventory)

1. **Construction projects** — `construction_projects/_branches/_employees/_vendors/_catalog_items/_revisions`, node graph `construction_nodes/_edges` with types RFI, SUBMITTAL, DRAWING, SPEC, CHANGE_ORDER, CONTRACT, DAILY_REPORT, SAFETY_RECORD, PUNCH_ITEM, VENDOR, COST_CODE, SCHEDULE_ITEM and edges REFERENCES/IMPACTS/DEPENDS_ON/CONFLICTS_WITH/SUPERSEDES/TRIGGERED_BY/BLOCKS. Contract types aia_a201/a101/subcontract/owner.
2. **Documents, drawings, specs** — PDF/CAD/IFC-referenced sheets, `drawing_sheets/_revisions`, `document_signatures`, numbering sequences, `contract_clauses` (indemnification, liquidated damages, no-damage-for-delay, insurance, bonding, notice, lien, termination), `spec_sections`, `spec_compliance_matrix`, `scope_analysis` (gap/overlap/missing). SHA-256 on upload.
3. **RFIs / submittals / change management** — status + urgency enums, submittal packages/attachments (product data, sample, test report, drawing, certification, warranty, maintenance data), compliance matrix (compliant/non-compliant/partial/not addressed), change events (rfi/ncr/field_change/directive) and change orders with line types labor/material/equipment/subcontractor/overhead/profit.
4. **Daily ops, schedule, safety** — daily reports, safety incidents (ppe, fall, struck-by, electrical, trenching) with severity, inspections (daily/weekly/monthly/incident/OSHA), periods, time entries.
5. **Cost, finance, payroll, treasury** — cost accounts, cashflow rows, burden rules, payroll class/tax maps, runs, SOP stages/approvals, invoices and line items, payment runs/approvals/payees/wallets, treasury reserve, FX rates, fuel log, organisational budgets, monthly close.
6. **Meetings and audio** — `meeting_audio_chunks` (webm/ogg/mp4/wav, streamed live), transcript segments, summaries, minutes, notes, sign-offs.
7. **Compliance, AML, legal** — KYC evidence, sanctions lists/entries, screening runs, beneficial owners, authorised signers, legal entities (12 role types), CDD tiers 0–4, DSAR requests, emergency freezes, recovery ceremonies.
8. **Identity, auth, RBAC** — profiles, `user_roles` (owner/admin/user), entity members, badge capabilities (view/edit payroll, financials, staff, vendors, projects, sign documents, reports), MFA/WebAuthn, auth audit log.
9. **Credits economy** — ledger, budgets, pricing + approvals, exchange rate, forecasts, emergency controls, overage debt, plans (freelancer/sme/enterprise), subscriptions, flash loans.
10. **Federated learning & Kaizen marketplace** — pools, rounds, contributions, marketplace listings, curator councils/votes, DP budgets + RNG seeds, ε state, SMPC commit/reveal, baselines, live/shadow attribution, reputation, drift escrow, oscillation log; Kaizen nodes/models (Ollama/vLLM/TGI/Transformers.js), LoRA adapters, evolution proposals/mutations (human-gated).
11. **Institutional memory & CAG** — RUMF tables, `institutional_memory` (decision, lesson learned, issue, solution, best practice, SOP, tribal knowledge, vendor relationship), CAG cache/registry/metrics/evidence/tier snapshots.
12. **Evidence & determinism** — evidence bus/entries, audit event log, determinism audit log, parity runs, idempotency keys, swarm evidence tails, webhook event log.
13. **Governance** — proposals/approvals/votes/owners/keys/tiers, railback (drift, bad migration, breach, deadlock, operator), emergency freeze scopes, halt state + dedup, monitoring rules/events.
14. **Integrations** — Procore (projects, timecards, costs, submittals, RFIs, observations; 30 req/min, hashed for evidence), QuickBooks, Amex, Paychex, Wesbuilt imports; Notion, Microsoft 365, Google Workspace, Slack connectors; classification public/internal/confidential/sovereign; webhooks and sync jobs.
15. **OmniConnector** — actions, approvals, invoices/lines, payment runs/items/events, settings; EN/DE/FR locales.
16. **Simulation & sandbox** — simulation runs/scenarios/fuel, sandbox runs/fuel rates/overage, chaos, compare, promote.
17. **Telemetry & security** — monitoring events/rules, LLM usage log and provider traces, skill security scans/findings, behaviour baselines/anomalies, zero-trust audit, agent identities, skill knowledge graphs.
18. **Edge / mobile / sovereign** — CBOR compact payloads for offline sync, desktop/Capacitor clients, on-prem Kaizen inference nodes.

### H.3 Pipelines the brain must sit inside

```text
field/tablet capture ─┐
Procore/QBO/Paychex ──┤  ingest + SHA-256 ─→ documents / construction_nodes
meeting audio chunks ─┤                          │
chat + user facts ────┘                          ▼
                                   recordFact() → brain_facts (HLC, prev_hash, append-only)
                                                 │
   ┌── CAG cache (query_hash) ──────────────────┤
   ▼                                             ▼
MemoryOrchestrator.query ──φ⁻¹/φ⁻²/φ⁻³ merge──→ Brain · Metatron · RUMF   ← THIS ENGINE lands here
   │                                             │
   ├─ tier gate (HALT / APPROVE / AUTO at φ⁻²)   ├─ credit burn + receipt
   └─ EvidenceBus (CBOR + SHA3-256 + prev_hash) ─┘
```

**Inbound contract we must satisfy:** accept `{query, max_results, user_id}` plus a typed
domain payload (any of H.2), return coherence in fixed-point, result set, and an evidence hash.
**Outbound obligations:** deterministic bytes, HLC stamp, `prev_hash` chaining, credit accounting,
trust tier + maturation stage on anything written into RUMF, and a HALT code rather than a guess.

### H.4 Gaps to close before porting (recorded, not yet actioned)

- G-R1 our scoring is float; the host demands **Q60 fixed-point** for anything hashed.
- G-R2 no CBOR canonical codec here; ours is JSON (see § Memory substrate transport law).
- G-R3 no HLC — our tape is tick-indexed; a wall/logical/node clock must wrap it at the boundary.
- G-R4 no SHA3-256 or Ed25519 chaining on memory writes (only on the analysis finding ledger).
- G-R5 no trust tier (T0–T5) or maturation stage (F1–F12) on L2/L3 records — `KChunk.trust` is the only trust field.
- G-R6 no credit metering on cognitive acts; every host memory write/retrieve is billed.
- G-R7 domain ontology (H.2) has no encoder here — construction artefacts must reach Ψ through a typed sensory adapter, not free text.

### Amendment log
- **Ω-04 (2026-08-21):** § Information taxonomy added (complete native information-type inventory
  with rates and resolutions). § Target host added: audited RAFFY U v16 cognitive stack, its complete
  business information inventory, its in/out pipelines, and seven recorded porting gaps (G-R1…G-R7).
  Audit only — no law, constant, module or contract in §§0–6 changed.

---

## § Module register — every file of the brain (Ω-05, re-swept Ω-07 2026-08-24)

**Law.** This register is *exhaustive by construction*: it was generated by walking
`packages/*/src`, `src/core`, `src/ui/omega`, `src/lib`, `src/routes`, `src/components` and
`test/`, and each entry carries the file's own declared purpose. Any file added to — **or removed
from** — those trees must be reflected here in the same commit, or the brainmap is out of date and
the Ω-MAP atlas may not be trusted.

**Sweep of 2026-08-24 (authoritative):** `packages/trnn-core/src` **78** ·
`packages/trnn-core/test` **35** · `packages/field-kernel-core/src` **8** · `src/core` **150**
(incl. 9 `interop/`, 30 `runtime/rhuftf/`, 24 `memory/`, 18 `sensory/`, 11 `knowledge/`) ·
`src/ui/omega` **36** (17 panels) · `src/lib` **43** (incl. 19 tool specs) · `src/routes` **7** ·
`src/components` **8** · root `test/` **20**. Total live TypeScript modules: **~350**.

**Trees that no longer exist** (Ω-07): `packages/brain-core/` (97 files), `src/context/rhuft/`
(59 prose files), `src/hooks/` (empty), and 43 unmounted `src/components/ui/*` primitives —
217 files / ≈2.5 MB removed with zero effect on engine, memory or computation.

### R1 · `packages/trnn-core/src` — the certified toroidal engine (Ω trunk)

**core/** — foundation, no dependencies upward.
| File | Purpose |
|---|---|
| `core/constants.ts` | L1, the single constants source (φ, λ=φ⁻², thresholds). |
| `core/complex.ts` | Split complex field: two `Float64Array`s (re/im), zero per-step allocation. |
| `core/determinism.ts` | Law L2 — determinism (seeded RNG, ordered reduction). |
| `core/dmath.ts` | Deterministic transcendental bank (sin/cos/exp reproducible across hosts). |
| `core/fibonacci.ts` | Fibonacci / Lucas arithmetic. |
| `core/indexing.ts` | Bounds-checked accessors (closes §4 gap). |
| `core/scaleLadder.ts` | The nested toroid stack (§2.1) — 18 rungs, node counts, golden strides. |
| `core/window.ts` | S3 Fibonacci windows and per-rung environment binding. |

**cell/** — the per-tick local law.
| File | Purpose |
|---|---|
| `cell/update.ts` | The certified nine-term cell (§2.4). |
| `cell/memory.ts` | Two-tap memory kernel `m⁺=(1−λ)m+λz⁺`, roots {1, −φ⁻²} — marginal stability. |
| `cell/closure.ts` | Closure term Π and its residual flux. |
| `cell/organs.ts` | N0/N1/N2 per-node organ bank. |

**torus/ · spectral/ · algebra/ · fractal/** — geometry and bases.
| File | Purpose |
|---|---|
| `torus/lattice.ts` | Toroidal lattices (§2.2). |
| `torus/eigenmodes.ts` | Toroidal eigenmodes on the golden ladder (§2.3). |
| `torus/superposition.ts` | Analysis/synthesis over the mode basis, CGS2-orthonormalised. |
| `spectral/sphere.ts` | Spherical shell — Fibonacci golden-spiral sampling + real harmonics. |
| `spectral/radial.ts` | Radial plane — spherical Bessel `j_l` on the golden radii. |
| `spectral/site.ts` | CGS2 spectral site where torus, shell and radial bases meet. |
| `spectral/laplacian.ts` | SHFN §A — measured spectral ground truth (graph Laplacian eigenpairs). |
| `spectral/fft.ts` | SHFN §B — the O(K log K) transform path. |
| `spectral/wavelet.ts` | Ω-REAL M0 — φ-spaced multi-scale wavelet (scale-axis decomposition). |
| `algebra/clifford.ts` | Ω-DEPTH §4 — Cl(3,0) 8-blade geometric-algebra channels. |
| `fractal/nest.ts` | Ω-DEPTH §2 — demand-driven fractal nesting (child fields inside spheres). |
| `fractal/pool.ts` | Ω-DEPTH §2 — fixed child-field slot pool (bounded RAM, no GC churn). |

**web/ · engine/** — cross-rung structure and the tick loops.
| File | Purpose |
|---|---|
| `web/coupling.ts` | Cross-rung coupling matrix (§3.1). |
| `web/octave.ts` | Octave transport between rungs of different node counts. |
| `web/fluxLedger.ts` | Double-entry flux ledger (§3.3) — conservation is *audited*, not assumed. |
| `web/ordering.ts` | Deterministic tick ordering, Jacobi read/write discipline. |
| `web/morphism.ts` | Structure-preserving checks for the web (§3.5). |
| `engine/SingleTorusEngine.ts` | The certified O-P1 trunk (one rung). |
| `engine/MultiTorusEngine.ts` | The web over the dense core (Ω-P3); owns `coherenceWarm`. |

**measure/** — read-only plane; nothing here ever actuates the field.
| File | Purpose |
|---|---|
| `measure/coherence.ts` | Coherence functionals. |
| `measure/state.ts` | Field readouts + corridor gate (§2.6). |
| `measure/transcription.ts` | 13-dimensional spectral signature per tick — the transcription tape. |
| `measure/scaleSignature.ts` | Ω-REAL M4 — the scale-axis readout over the φ-ladder (per-rung measures + octave morphism defects). |
| `measure/fieldFingerprint.ts` | Ω-REAL Layer B — the φ-anchored multi-scale invariant (log-spectra, unit-norm). |
| `measure/qualia.ts` | Ω-REAL Q1 — the live self-measurement vector (C,N,S,V,I + golden-delay self-overlap + ignition train). |
| `measure/selfMeasure.ts` | Ω-REAL Q2 — full-field, all-rung self-measurement (drift, temporal coherence, information density, inertia, closure γ, Lyapunov descent). |

**sense/ · memory/** — intake and the engine-side memory planes.
| File | Purpose |
|---|---|
| `sense/encode.ts` | Sensory encoders (modality → field-compatible complex frame); text = Ω-P9 two-channel codec. |
| `sense/fusion.ts` | Multi-modal fusion. |
| `sense/plane.ts` | The sensory plane. |
| `sense/nodeArray.ts` | N1 — the Sensory Node Array (SNA). |
| `sense/scan.ts` | N1 — the six-section toroid scan (basis of the 18-rung certification). |
| `sense/perception.ts` | Ω-P8 — the sensory meaning-vector (BAND/SPACE/FIELD/CONTENT blocks). |
| `sense/textFingerprint.ts` | Ω-REAL Layer A — cross-modal text binding (Ω-P9 codec + Bluestein FFT spectrum). |
| `memory/braid.ts` | Ω-P6 TorusBraid Hopfield plane (attractor recall). |
| `memory/turingTape.ts` | N4 — Zeckendorf-addressed read/write tape, the permanent processing layer. |
| `memory/persistence.ts` | Ω-REAL — cross-session persistence (canonical-safe snapshots). |

**substrate/** — Ω-REAL measurement stack (symbols → measured computation).
| File | Purpose |
|---|---|
| `substrate/phiSubstrate.ts` | P0 — Class-A substrate parity. |
| `substrate/coherenceKernel.ts` | P1 — φ-delayed memory kernel, innovation-form coherence C(t). |
| `substrate/signalStats.ts` | P2 L1 — moments, stationarity, effective sample size. |
| `substrate/correlation.ts` | P2 L2 — Pearson / Spearman / distance-correlation / MI. |
| `substrate/causal.ts` | P2 L3 — directed dependence (Granger, transfer entropy). |
| `substrate/resonanceBus.ts` | P4 — the abstention-aware fusion law, stated once. |
| `substrate/vsa.ts` | P5 — Fourier HRR hypervectors over the phase plane. |
| `substrate/plasticity.ts` | P5 — memristive + Oja learning for the L1 associative store. |
| `substrate/dmd.ts` | P5 — Dynamic Mode Decomposition over L0 trajectories. |
| `substrate/emd.ts` | Ω-REAL M1 — empirical mode decomposition (φ-sifted IMFs). |
| `substrate/pseudospectrum.ts` | Ω-REAL M2 — ε-pseudospectra, σ_min via one-sided Jacobi SVD. |
| `substrate/floquet.ts` | Ω-REAL M3 — Floquet theory of a periodic linear map (monodromy → multipliers). |

**analysis/** — Ω-REAL live analysis service (heartbeat scheduler, rings, xcorr stack).
| File | Purpose |
|---|---|
| `analysis/service.ts` | P9 — the live analysis service (heartbeat scheduler, long-batch slots). |
| `analysis/xcorrStack.ts` | P9 — cross-correlation stack. |
| `analysis/dmdModes.ts` | P9 — DMD mode tracking over rings. |
| `analysis/evidenceLedger.ts` | P9 — evidence ledger (append-only findings). |

**learn/ · sweeps/ · harness/ · ledger/ · genome/ · runtime/ · cognition/**
| File | Purpose |
|---|---|
| `learn/params.ts` | Constrained parametrisations (stability-preserving by construction). |
| `learn/cell.ts` | The learnable cell term. |
| `learn/spectralFilter.ts` | SHFN §C Path A — learnable dispersion filter α(λ_k). |
| `learn/mixer.ts` | SHFN §D Path B — the superposition mixer. |
| `learn/spectralAttention.ts` | SHFN §E Path C — cross-spectral phase attention. |
| `learn/tiers.ts` | The four honest execution tiers (what may learn at which cost). |
| `learn/battery.ts` | The learning battery (pass/fail before a tier may run live). |
| `sweeps/tenSweep.ts` | The Ten-Sweep Consolidation Protocol. |
| `harness/golden.ts` | Golden regression set. |
| `harness/abstention.ts` | Abstention correctness. |
| `harness/battery.ts` | Standing abstention battery. |
| `harness/conformal.ts` | Adaptive Conformal Inference (ACI) intervals. |
| `harness/latency.ts` | Proof latency. |
| `harness/certify.ts` | The certification gate — green or the phase does not open. |
| `harness/recall.ts` | Ω-REAL Layer C — coherence-gated associative recall (distance + margin abstention). |
| `ledger/canonical.ts` | Canonical JSON — the exact bytes the ledger hashes. |
| `ledger/merkle.ts` | RFC-6962 append-only log, inclusion + consistency proofs. |
| `ledger/sth.ts` | Signed Tree Heads, Ed25519 over the canonical head. |
| `genome/record.ts` | Genome v2 — sealed, provenanced, append-only knowledge records. |
| `runtime/profiles.ts` · `hardware.ts` · `governor.ts` · `calibrate.ts` · `runLedger.ts` · `host.ts` · `views.ts` | Capacity profiles, measured hardware probe, the governor, the measurement harness, the run ledger, the engine host (`MEMORY_STRIDE`, `MIND_STRIDE`, `LearnRun`), read-only views. |
| `cognition/mind.ts` | Ω-P7 — turns engine observations into thoughts; `NOVELTY_THRESHOLD`. |
| `cognition/concepts.ts` | Concept store — HNSW over product-quantised embeddings. |
| `cognition/selfModel.ts` | Self-model (`DiagonalSSM`, `DiagonalRLS`) + the baseline allowed to kill it. |
| `cognition/fieldSelfModel.ts` | Ω-REAL Q4 — per-rung field self-model (one SSM/RLS per rung over the signature). |
| `cognition/consolidation.ts` | Ω-REAL Q5 — ignition-triggered consolidation (qualia ignition → TenSweep → sealed GenomeLedger). |
| `cognition/lexicon.ts` | Ω-REAL — the salience-weighted word catalogue (tf·idf in base φ, gematria atoms). |
| `cognition/relations.ts` | Ω-REAL — cross-catalogue relations. |
| `index.ts` | The public surface (barrel). |

### R2 · ~~`packages/brain-core/src`~~ — REMOVED under Ω-07 (2026-08-24)

The 97-file `brain-core` package (v13 RHUFT ontology chapters, the Fractal Node Engine, the V14
13-node field substrate, the `cognition/` Mind, the `adapters/` language instruments, 5 `.wl`
certificates, 3 JSON schemas) has been deleted. It was ~1.8 MB and **not reachable from any live
path**: no route, deck, driver, worker or server function imported it, and its Vite/tsconfig
aliases were removed with it.

**Where each capability actually lives now** (nothing was lost, only de-duplicated):

| Former `brain-core` capability | Live owner today |
|---|---|
| 13-node spectral tile, λ-SSM spine | `trnn-core/cell/{update,closure,memory,organs}.ts` (certified 9-term cell) |
| eigenmode attention over mode tokens | `trnn-core/learn/spectralAttention.ts`, `learn/spectralFilter.ts` |
| Fibonacci ring of tiles, φ-transport, stack | `trnn-core/torus/lattice.ts`, `web/{coupling,morphism,octave,ordering,fluxLedger}.ts` |
| coherence-gated JEPA plasticity | `trnn-core/learn/tiers.ts` + `substrate/plasticity.ts` (memristive) |
| Hopfield / HNSW / PQ associative memory | `src/core/knowledge/{LatentSpace,BarcodeIndex,ConceptGraph}.ts`, `trnn-core/substrate/vsa.ts` |
| concept registry, glossary, lexicon | `trnn-core/cognition/concepts.ts`, `src/core/knowledge/{KnowledgeBase,LexicalIndex}.ts` |
| cognitive loop, thought, drive arbiter | `trnn-core/cognition/{mind,selfModel}.ts` + `src/ui/omega/omegaRuntime.ts` drive edges |
| prediction ledger, novelty gate | `src/core/analysis/findingLedger.ts`, `analysisSpine.ts` (with abstention) |
| language instrument / codec adapters | `src/lib/chat/*` + `src/core/interop/intake.ts` (text → 28-dim field vector) |
| sensor bus, vision/audio/text feeds | `src/core/sensory/*` (gateway, cortices, frontends, worker) |
| validated state + JSONL journal | `src/core/memory/{MemoryPersistence,TextJournal,typedJson}.ts` |
| coupled governor / hardware probe | `src/core/runtime/{ResourceGovernor,HardwareEnvelope,computeBench}.ts`, `trnn-core/runtime/*` |
| `.wl` Wolfram certificates | the live gate battery (`s2`, `r5`, `r6`, `r8`, `f1`) |

Evidence of no regression: after removal, `tsgo --noEmit` reports 0 errors, the production build
succeeds, all 830 remaining assertions pass, and the app renders with zero runtime errors.

### R3 · `packages/field-kernel-core/src` — the shard kernel
`kernel.ts` (unified field kernel), `state.ts`, `localUpdate.ts`, `measurement.ts`,
`lyapunov.ts` (per-shard descent certificate), `cos.ts`, `portFlags.ts`, `index.ts`.

### R4 · `src/core` — the application brain

**Field / frameworks / RHUFT numerics.** `MetatronCore.ts` (unified analytic core — Ω fusion,
reported separately from measured field coherence), `field/Reflect.ts` (Ψ-of-Ψ), `field/Qualia.ts`,
`field/QualiaCorrelate.ts`; `frameworks/F1_Septenary…F9_HyperGalactic` + `frameworks/constants.ts`;
`rhuft/PhiLadder.ts`, `LadderBinding.ts`, `LucasClosure.ts`, `ExactIdentities.ts` (60-digit
BigInt fixed point), `Thermal.ts`; `constants/Chapter47.ts`, `constants/WolframVerified.ts`;
`numerics/StableSum.ts` (compensated summation — the ordered-reduction law);
`residuals/ChapterResiduals.ts`, `residuals/Stability.ts`.

*(Ω-07: `field/QRF.ts`, `field/Torus.ts`, `field/SelfMeasure.ts`, `numerics/Real.ts`,
`harmonic/RecursiveOctave.ts`, `stability/CrystallinePLL.ts`, `recursion/MemoryFeedback.ts` were
removed — each was import-dead, and each function is carried by a certified `trnn-core` module:
`torus/lattice`, `torus/superposition`, `measure/state`, `core/dmath`, `web/octave`,
`substrate/phiSubstrate`, `memory/braid` respectively.)*

**V12 audit bank (independent checker, not a driver).** `v12/audit/LyapunovBank.ts` (descent
certificates), `WolframBankWave2.ts`, `wave2Precision.ts`, `F2Provenance.ts`.
*(Ω-07: the `v12/MasterUpdate.ts` / `MasterUpdateController.ts` / `ExistenceGate.ts` /
`TriadicValue.ts` / `SelfValidationRHUFT.ts` wrappers were removed — the canonical Ψ_{t+1} is
`trnn-core/cell/update.ts` + `cell/closure.ts`, reached through `MultiTorusEngine`. §5 R-1 closed:
the trunk cell is the single master update, and `v12/audit/` audits it from outside.)*

**Runtime (14 files + `rhuftf/`).** `runtime/ResourceGovernor.ts` (sovereign), `governorSingleton.ts`,
`HardwareEnvelope.ts` (0.70 RAM budget under Ω-DEPTH), `computeBench.ts`, `PhiLockScheduler.ts`
(one φ-phase scheduler for every memory layer), `WorkerPool.ts`, `workerPoolFallback.ts`,
`fieldKernel.worker.ts`, `ShadowStateTape.ts` (rollback/replay shadow), `Chapter47.ts`,
`portFlags.ts`; **`runtime/rhuftf/`** — nine `F*LocalUpdate.ts` + nine `F*Measurement.ts` kernels
(n = 0…8), plus `localUpdateKernel.ts`, `localUpdateRegistry.ts`, `registry.ts`,
`ScaleMeasurement.ts`, `LadderProjection.ts`, `eigenmodes.ts`, `phiModes.ts` (project, don't
push), `contraction.ts` (contract first, compose second), `conjugate.ts` (φ-conjugate dual pass),
`omega.ts` (geometric-mean fusion), `torusClosure.ts` (close the loop, audit the ring).

**Sensory (`sensory/`).** `SensoryGateway.ts` (L-S content-addressed intake), `SensoryCortex.ts`
(fuses every modality through a governor-sized `PhiLattice.ts`), `SensoryAtom.ts`,
`SimHashPhi.ts`; audio: `AudioCortex.ts`, `AudioFrontend.ts`, `MelFilterbank.ts`; video/screen:
`VideoCortex.ts`, `VideoFrontend.ts`, `ScreenFrontend.ts`, `sensoryFrame.worker.ts`; vision
embedding: `VisionEncoder.ts`, `VisionEmbedFrontend.ts`, `VisionProjection.ts`; motion:
`IMUFrontend.ts`; bridge: `sensoryFieldBridge.ts`.

**Memory (`memory/`).** Layers L0–L6 + governance: `FieldTape.ts` (L0 ring),
`HebbianMatrix.ts` (L1), `EpisodicStore.ts` (L2), `FibonacciPatterns.ts` (L3),
`PathwayGraph.ts` (L4), `TextJournal.ts` (L5), `ReflectiveIndex.ts` (L6);
`MemoryStore.ts` (facade), `MemoryCaptureKernel.ts` (per-tick capture), `tickMemory.ts`
(MetatronOutput → capture), `MemoryGovernor.ts`, `MemoryPolicy.ts`, `MemoryPersistence.ts`,
`typedJson.ts` (the transport law: typed arrays survive JSON), `Banding.ts` (Fibonacci age
bands), `Consolidator.ts` (experience → structure), `Resonance.ts` (how strongly a memory
answers the live field), `Weave.ts` (reconstruct a *moment*), `Trajectory.ts` (what the field was
doing around a moment), `TapeDmd.ts` (DMD over L0), `PatternBitmapIndex.ts`,
`PerceptRegistry.ts`, `VisionFieldIndex.ts`, `LearningEngine.ts` (error-driven learning atop the
layers).

**Knowledge (`knowledge/`).** `KnowledgeBase.ts` (local-first corpus + recall cascade),
`Acquisition.ts`, `LocalArchive.ts` (on-device persistence), `LexicalIndex.ts` (BM25),
`LatentSpace.ts` (distributional semantics), `BarcodeIndex.ts` (Fibonacci-stride LSH banding),
`ConceptGraph.ts` (Hebbian co-occurrence), `fieldSignature.ts` (SHFN §G memory ↔ field bridge),
`genome.ts` (genome contract + measured health), `tokenize.ts` (deterministic tokenizer + hashed
semantic vector), `types.ts`.

**Gematria / geometry / OCR.** `gematria/zphi.ts` (exact Z[φ] ring), `zeckendorf.ts` (unique
Fibonacci addressing), `residue.ts` (residue fingerprints), `bitmap.ts` (multi-plane field
bitmap), `resonanceKernel.ts` (Certificate 2), `index.ts`; `geometry/parse.ts` (CAD/BIM/mesh →
primitives), `descriptors.ts`, `index.ts`; `ocr/ocrLadder.ts` (three measured tiers, no silent
fallback).

**Analysis / self / bus / omega.** `analysis/channelSampler.ts` (channel taps), `streamWindow.ts`
(causal, monotone, aligned windows), `analysisSpine.ts` (L1 stats / L2 association / L3 causality
with explicit abstention), `findingLedger.ts` (RFC-6962 leaves + Ed25519 signed tree head),
`consolidation.ts` (Ten-Sweep promotion into Genome v2); `self/atlas.ts` (Capability Atlas),
`self/crossMap.ts`, `self/types.ts`; `bus/protocol.ts`, `bus/EngineBus.ts`;
`omega/omega.worker.ts`, `omega/omegaProtocol.ts`.

**Interop (`interop/`) — the transplant seam.** `contract.ts`, `bn128.ts`, `rumf.ts`,
`evidence.ts`, `tierGate.ts`, `recall.ts`, `intake.ts`, `facade.ts`, `index.ts`. Full law table in
§ Transplant seam below.

*(Ω-07 corrections to this register: `bus/FallbackEngine.ts`, `bus/useEngine.ts` and
`context/RhuftLibrary.ts` were removed — the last together with the 59-file `src/context/rhuft/`
prose corpus, which no live path read. The RHUFT ontology now lives only where it is computed:
`src/core/rhuft/`, `src/core/runtime/rhuftf/` and `packages/trnn-core`.)*

### R5 · `src/ui/omega` — drive edges and decks
Drivers: `omegaRuntime.ts`, `useOmegaRuntime.ts`, `useOmegaPull.ts`, `engineProjection.ts`
(4 Hz truth for engine state), `memoryDriver.ts` (64 Hz substrate drive), `memoryRuntime.ts`,
`useMemoryRuntime.ts`, `memoryBridge.ts`, `sensoryDriver.ts` (IMU 377 / audio 233 / video 89 Hz),
`useSensoryDriver.ts`, `analysisRuntime.ts` (16 Hz), `useAnalysisRuntime.ts`,
`knowledgeRuntime.ts`, `fieldContext.ts`, `fieldViewStore.ts`, `selfRegistry.ts`,
`OmegaEngineShim.tsx`. Shell + decks: `OmegaWorkstation.tsx`, `FieldStage.tsx`, and panels
`Field`, `Ladder`, `Engine`, `Web`, `Spectral`, `Sense`, `Memory`, `Mind`, `Learn`, `Analysis`,
`Self`, `Cognition`, `Toroid`, `Multimodal`, `Integrations`, `Kokoro`, `SourceChip`.

### R6 · `src/lib` + `src/routes` — language, tools, transport
`chat/systemPrompt.ts` (evidence-only, agentic), `client.ts` (SSE + tool dispatch),
`engineSnapshot.ts`, `memoryPack.ts`, `selfPack.ts`, `sessions.ts`, `chatSettings.ts`,
`toolMarkers.ts`, `types.ts`; tools: `registry.ts`, `intelMeta.ts`, `intel.server.ts`,
`handlers.server.ts`, `dispatch.functions.ts`, `health.functions.ts`, `toolPrefs.ts`, and 18
`specs/*.json` (arxiv, crossref, pubmed, semantic_scholar, wikidata, wolfram, github, hackernews,
reddit, newsapi, openweather, nasa_donki, osm_geocode, wayback, ipfs, http_probe, shodan,
virustotal, abuseipdb). Also `tts/kokoro.ts`, `persist/flush.ts`, `diagnostics/crashLogger.ts`,
`error-capture.ts`, `themes.ts`. Routes: `__root.tsx`, `index.tsx`, `download.tsx`,
`api/chat.ts`, `api/kimi.ts`, `api/ocr.ts`, `api/public/omega-train.ts`.

### R7 · Certification files (the brain is only as true as its gates)
`packages/trnn-core/test/`: `s0…s5` (oracle, measurement, constants, window, ISS, dmath,
environment), `g0…g8` (foundation → learning), `a0` laplacian, `b0` fft, `b1` EFIT,
`f0` nesting, `f1` clifford, `n0` organs, `n1` sensory nodes, `n2` the 18-rung scan,
`r0…r8` (substrate parity, innovation coherence, correlation, causal, resonance bus,
VSA/plasticity/DMD, ledger/genome, ten-sweep, harness), `w2` warm coherence, `oracle.ts`.
Root `test/` (20 files): `analysis/p9-*` (spine, sampler, consolidation, finding ledger),
`interop/` (`i1` contract, `i2` transport, `i3` learning proof), `memory/` (`m9` substrate,
`m10` snapshot round-trip, `b1` tape readback, `p5` L1↔L0 port, `s1` RAM governor,
`s3` multiscale), `self/o1-atlas`, `sense/a1-sense-intake`, `wake/w1-drive-edges`, `geometry`,
`omega-field-signature`, `omega-vec`, `self-genome`.

**Standing total (2026-08-24): 55 test files, 830 assertions, all green; `tsgo --noEmit` 0 errors;
production build succeeds.** The former `packages/brain-core/test/field.test.ts` (29 assertions)
left the tree with its package under Ω-07 — the only deliberate assertion-count reduction in the
brain's history, and it covered no live path.

---

## § Reasoning, learning and memory logic — how the parts actually think (Ω-05)

### L-A. The reasoning chain (one live pass, end to end)
1. **Intake** — `SensoryGateway` content-addresses each frame (`SimHashPhi`) from
   audio 233 Hz / video 89 Hz / IMU 377 Hz / screen / text / images; `SensoryCortex` fuses them
   over a governor-sized `PhiLattice` into one complex field frame.
2. **Field step** — `trnn-core/cell/update.ts` (the certified nine-term cell) plus
   `cell/closure.ts` (closure Π) advance Ψ on every instantiated rung, driven by
   `engine/MultiTorusEngine.ts`; `web/coupling.ts` moves energy across rungs and
   `web/fluxLedger.ts` double-entry audits it. (Ω-07: the former `src/core/v12/MasterUpdate.ts`
   wrapper is gone — the trunk cell *is* the master update; only `v12/audit/` remains, as the
   independent Lyapunov/Wolfram bank that checks it.)
3. **Measure, never actuate** — `measure/state` + `coherence` + `transcription` produce the
   13-dim per-tick signature, C(t), Λ, κ-closure. Cold rungs are excluded via `coherenceWarm`;
   analytic Ω (MetatronCore) is reported separately from measured field coherence.
4. **Analyse** — `channelSampler` → `streamWindow` (causal, monotone, aligned) → `analysisSpine`
   runs Level-1 stats, Level-2 association (Pearson/Spearman/dCor/MI) and Level-3 causality
   (Granger, transfer entropy), each with an explicit **abstain** verdict when n or stationarity
   is insufficient.
5. **Fuse** — `resonanceBus` combines only non-abstaining channels under one stated law.
6. **Seal** — `findingLedger` canonicalises the pass, appends the RFC-6962 leaf and publishes an
   Ed25519 signed tree head; nothing may be edited or reordered afterwards.
7. **Consolidate** — `consolidation.ts` drives the **Ten-Sweep** protocol, promoting sealed
   findings into Genome v2 records with provenance.
8. **Recall & speak** — `KnowledgeBase` recall cascade (barcode Hamming prefilter → lexical BM25
   → latent → field-signature resonance), packed by `memoryPack` / `selfPack` into the chat turn;
   `linguistic_gate` measures any model-produced words before they are believed.

**Reasoning invariants.** Abstention is a first-class verdict; conformal intervals (`harness/
conformal`) bound every reported estimate; no claim leaves the system without a ledger leaf.

### L-B. Learning — four honest tiers (`learn/tiers.ts`)
| Tier | What adapts | Gate |
|---|---|---|
| T0 passive | statistics, banding, salience thresholds | always on |
| T1 associative | `HebbianMatrix`, memristive/Oja `plasticity` | coherence gate |
| T2 spectral | dispersion filter α(λ_k), superposition mixer, cross-spectral attention | `learn/battery` green |
| T3 structural | cell term parameters (`learn/cell`, `learn/params` constrained so stability is preserved by construction) | full certification (`harness/certify`) |
Supporting machinery: `field/learning.ts` (coherence-gated JEPA-style plasticity),
`LearningEngine.ts` (error-driven), `selfModel.ts` (DiagonalSSM + RLS predictor, with a baseline
that is *allowed to kill it*), `prediction_ledger.ts` (mastery = verified prediction, not
confidence), `dmd.ts`/`TapeDmd.ts` (mode discovery over trajectories).

### L-C. Memory — seven planes, one transport law
L0 `FieldTape` (continuous Ψ ring) → L1 `HebbianMatrix` (sparse co-activation) →
L2 `EpisodicStore` (salience-triggered snapshots) → L3 `FibonacciPatterns` (Fibonacci-tick
patterns) → L4 `PathwayGraph` (pattern→pattern transitions) → L5 `TextJournal` (append-only,
IndexedDB) → L6 `ReflectiveIndex` (re-measurement queue); plus L-S `SensoryGateway` beneath and
the knowledge/genome plane above. Access paths: `Resonance` (live-field answer strength),
`Weave` (reconstruct a moment), `Trajectory` (its dynamics), `Banding` (Fibonacci age selection),
`Consolidator` (experience → structure), all scheduled by one `PhiLockScheduler` and capped by
`MemoryGovernor` ← sovereign `ResourceGovernor` (0.70 working budget).
**Transport law (Ω-03):** typed arrays never survive `JSON.stringify` intact — every `restore()`
must go through `typedJson.ts` coercion, and snapshot round-trips must be byte-identical
(certified by `test/memory/m10-snapshot-roundtrip.test.ts`).

### L-D. Business logic — what the brain must do inside RAFFY U v16
The host's own stack (`brain_facts`, RUMF wings/rooms/drawers, T0–T5 trust tiers, F1–F12
maturation, Hybrid Retrieval v5, `MemoryOrchestrator`, the φ⁻² tier gate, `EvidenceBus`, HALT
codes, credit pricing) is inventoried in § Target host above. The mapping this brain provides:
- **Trust T0–T5** ⇄ verdict + conformal interval + ledger leaf; a fact may only rise a tier when
  a sealed finding supports it, and HALT codes map to `abstain`.
- **RUMF wings/rooms/drawers** ⇄ `ConceptGraph` + `BarcodeIndex` banding; a drawer is a barcode
  band, a room a concept cluster, a wing a genome domain.
- **Hybrid Retrieval v5** ⇄ the recall cascade in L-A step 8 (barcode → BM25 → latent → field
  resonance), with the φ⁻² gate applied at fusion in `resonanceBus`.
- **F1–F12 maturation** ⇄ the four learning tiers plus `prediction_ledger` verification counts.
- **EvidenceBus** ⇄ `findingLedger` signed tree heads (external verifiers need only the head).
- **Credit pricing** ⇄ `harness/latency` proof-latency budgets and the governor's tier caps.
The 18-domain business information inventory and the seven porting gaps (G-R1…G-R7) remain as
recorded in § Target host; nothing in this register changes them.

### Amendment log
- **Ω-05 (2026-08-21):** § Module register added — complete, sweep-generated file inventory of
  every brain module (`trnn-core`, `brain-core`, `field-kernel-core`, `src/core`, `src/ui/omega`,
  `src/lib`, `src/routes`, all test batteries) with each file's declared purpose; plus
  § Reasoning/learning/memory logic (the live reasoning chain, the four learning tiers, the seven
  memory planes and the transport law) and the business-logic mapping into RAFFY U v16.
  Documentation only — no law, constant, module or contract changed.

## § Transplant seam — `src/core/interop/` (Ω-06, 2026-08-22)

The brain is now transplantable. Everything the host touches passes through ONE directory; no
host module reaches into field math, and no Ω module needs to know the host exists.

| File | Law it carries |
| --- | --- |
| `contract.ts` | Canonical CBOR (RFC 8949 deterministic encoding), the SHA3-256 hash law, HLC v2.1 timestamps (physical ms · logical counter · node id), content-derived deterministic IDs. |
| `bn128.ts` | `BigNum128` 10^18 decimal fixed point and the host merge law: a **φ-weighted geometric mean** via Q60 log2/exp2 with saturating arithmetic — bit-identical to the host orchestrator, not an arithmetic-mean approximation. |
| `rumf.ts` | Wing / Room / Drawer ID laws (labels hash as strings, drawers hash decoded hex bytes — the asymmetry is the host's and is preserved), plus the F1–F12 Fibonacci maturation ladder and its expected durations. |
| `evidence.ts` | `BrainFact` envelopes, deterministic sealing, Merkle-linked `EvidenceChain` and full `verifyChain` replay. |
| `tierGate.ts` | The single admission law reconciling Ω learn tiers with host trust levels T0–T4. Fail-closed: absent evidence means refusal, never optimism. |
| `recall.ts` | The host `SCORE_WEIGHTS` mirror (keyword, validity, recency, importance) with resonance kept strictly **additive** — callers without a field score are numerically unchanged. |
| `intake.ts` | Typed host fact → 28-element field vector: SHA3-derived signed feature hashing, φ-decayed token weights, L2-normalised, key-order independent. One projection shared by facts and free text. |
| `facade.ts` | `IMetatron` — the only interface the host implements against, with explicit abstention (reasons attached) whenever the engine is dormant or the gate is below the requested trust. |
| `index.ts` | The sole export surface. |

**Determinism law (R1):** no `Math.random()` anywhere on an intake or memory path. Sensory atom
eviction uses a golden-ratio Weyl cursor, so two machines fed the same stream hold the same
substrate — the precondition for any of the above hashes meaning anything.

**Certification.** `test/interop/i1-contract.test.ts` (contract, fixed point), `i2-transport.test.ts`
(RUMF, evidence, gate, recall, facade — host vectors quoted verbatim from the Rust source),
`i3-learning-proof.test.ts` (the end-to-end proof: an untrained store abstains at T0; after a
host-shaped fact book is presented on the Fibonacci ladder every fact recalls with positive
cosine, seen beats unseen, two runs are byte-comparable, and the book leaves Ω as a verified
chain with collision-free drawer IDs).

**Substrate law worth stating plainly:** L3 consolidates only on Fibonacci ticks. A fact presented
off-ladder is, by design, not yet a memory — host intake must respect the ladder rather than
assume every write lands.

### Amendment log addendum
- **Ω-06 (2026-08-22):** § Transplant seam added; `intake.ts` created and exported; the RUMF
  Fibonacci helper corrected to the host's `fibonacci` definition (F(0)=0, F(1)=F(2)=1) — the
  previous helper was one index ahead, so F8 read 780s instead of the host's 1260s. No field math,
  no constant and no memory law changed.

### R8 · Exact filenames for the families abbreviated above
**`src/core/frameworks/`:** `F1_Septenary.ts`, `F2_Quantum.ts`, `F3_Atomic.ts`,
`F4_Geometric.ts`, `F5_ColorMusic.ts`, `F6_Hebrew.ts`, `F7_Galactic.ts`, `F8_SubPlanckian.ts`,
`F9_HyperGalactic.ts`, `constants.ts`.

**`src/core/runtime/rhuftf/` local updates:** `F1SeptenaryLocalUpdate.ts`,
`F2QuantumLocalUpdate.ts`, `F3AtomicLocalUpdate.ts`, `F4GeometricLocalUpdate.ts`,
`F5ColorMusicLocalUpdate.ts`, `F6HebrewLocalUpdate.ts`, `F7GalacticLocalUpdate.ts`,
`F8SubPlanckianLocalUpdate.ts`, `F9HyperGalacticLocalUpdate.ts`.
**…measurements:** `F1SeptenaryMeasurement.ts`, `F2QuantumMeasurement.ts`,
`F3AtomicMeasurement.ts`, `F4GeometricMeasurement.ts`, `F5ColorMusicMeasurement.ts`,
`F6HebrewMeasurement.ts`, `F7GalacticMeasurement.ts`, `F8SubPlanckianMeasurement.ts`,
`F9HyperGalacticMeasurement.ts`.

**`src/ui/omega/panels/`:** `FieldDeckPanel.tsx`, `LadderDeckPanel.tsx`, `EngineDeckPanel.tsx`,
`WebDeckPanel.tsx`, `SpectralDeckPanel.tsx`, `SenseDeckPanel.tsx`, `MemoryDeckPanel.tsx`,
`MindDeckPanel.tsx`, `LearnDeckPanel.tsx`, `AnalysisDeckPanel.tsx`, `SelfDeckPanel.tsx`,
`CognitionPanel.tsx`, `ToroidScanPanel.tsx`, `MultimodalDeck.tsx`, `IntegrationsView.tsx`,
`KokoroPanel.tsx`, `SourceChip.tsx`.

**`src/lib/chat/tools/specs/`:** `arxiv_search.json`, `crossref.json`, `pubmed.json`,
`semantic_scholar.json`, `wikidata.json`, `wolfram.json`, `github_search.json`,
`hackernews.json`, `reddit.json`, `newsapi.json`, `openweather.json`, `nasa_donki.json`,
`osm_geocode.json`, `wayback.json`, `ipfs.json`, `http_probe.json`,
`shodan_host_search.json`, `virustotal.json`, `abuseipdb.json`.

**`src/lib/` remainder:** `utils.ts`, `error-page.ts`, `tts/kokoroPrefs.ts`.

**`src/core/interop/`:** `contract.ts`, `bn128.ts`, `rumf.ts`, `evidence.ts`, `tierGate.ts`,
`recall.ts`, `intake.ts`, `facade.ts`, `index.ts` (the sole export surface — restored under Ω-07).

**`src/components/`:** `ui/popover.tsx`, `ui/slider.tsx`, `ui/switch.tsx`, `v11/EngineContext.tsx`,
`v11/chat/ChatSettingsPopover.tsx`, `v11/chat/ToolsPanel.tsx`, `v11/legacy/ThemeProvider.tsx`,
`v11/panels/KokoroTTSPanel.tsx`. (43 unused shadcn primitives were removed under Ω-07; only the
three actually mounted by the decks remain.)

*(The five `brain-core/src/formal/*.wl` Wolfram certificates left the tree with that package under
Ω-07. Their content is superseded by the live gate battery: `s2-constants`, `r6-ledger-genome`,
`f1-clifford`, `r5-vsa-plasticity-dmd`, `r8-harness`.)*

---

## § Live data-flow map (Ω-07, 2026-08-24) — the whole brain in one pass

```text
  HOST / WORLD
      │  facts, text, files, screen, mic, motion
      ▼
[interop/intake.ts]────────────► 28-dim L2-normalised field vector (SHA3 feature hashing, φ-decay)
      │                                    (deterministic: key-order independent, no Math.random)
      ▼
[sensory/SensoryGateway]  content-address (SimHashPhi) · golden-Weyl eviction cursor
      │   audio 233 Hz · video 89 Hz · IMU 377 Hz · screen · text · images
      ▼
[sensory/SensoryCortex + PhiLattice]  one fused complex field frame  (governor-sized)
      │
      ▼
[trnn-core/engine/MultiTorusEngine]  ── per rung, per tick ──────────────────────────────┐
      │   cell/update (9 terms) → cell/closure (Π) → cell/memory → cell/organs           │
      │   web/coupling (cross-rung energy) ⇄ web/fluxLedger (double-entry audit)         │
      │   spectral/{fft,laplacian,radial,site,sphere} · torus/{lattice,eigenmodes,       │
      │   superposition} · algebra/clifford (Cl(3,0)) · fractal/{nest,pool}              │
      └──────────────────────────────────────────────────────────────────────────────────┘
      │
      ├──► [measure/*]  READ-ONLY plane: state · coherence (warm-gated) · transcription
      │        13-dim per-tick signature, C(t), Λ, κ-closure    (never actuates)
      │
      ├──► [src/core/MetatronCore]  analytic Ω fusion — reported SEPARATELY from measured C(t)
      │
      ├──► [memory] L0 FieldTape ring → L1 HebbianMatrix → L2 EpisodicStore →
      │        L3 FibonacciPatterns (consolidates ONLY on Fibonacci ticks) →
      │        L4 PathwayGraph → L5 TextJournal → L6 ReflectiveIndex
      │        governed by MemoryGovernor (0.70 envelope) + PhiLockScheduler
      │        transported by typedJson.ts (byte-exact typed-array round-trip)
      │
      ├──► [knowledge] fieldSignature → genome (binding vector + 256-bit barcode) →
      │        BarcodeIndex (Hamming prefilter) → KnowledgeBase recall cascade
      │
      └──► [analysis] channelSampler → streamWindow (causal/monotone/aligned) →
               analysisSpine  L1 stats │ L2 association (Pearson/Spearman/dCor/MI) │
                              L3 causality (Granger, transfer entropy)
               every level may ABSTAIN (insufficient n or non-stationary)
                   │
                   ▼
             substrate/resonanceBus  (fuses non-abstaining channels only)
                   │
                   ▼
             findingLedger  RFC-6962 leaf + Ed25519 signed tree head  (append-only)
                   │
                   ▼
             consolidation  Ten-Sweep → Genome v2 records with provenance
                   │
                   ▼
             interop/evidence  BrainFact envelope → Merkle EvidenceChain → verifyChain
                   │
                   ▼
             interop/tierGate  T0–T4 admission, FAIL-CLOSED   ──► interop/facade (IMetatron)
                                                                       │
                                                                       ▼
                                                              HOST answer or explicit
                                                              ABSTENTION with reasons
```

**Two independent audit paths cross this flow and never sit inside it:**
`v12/audit/*` (Lyapunov descent + Wolfram precision banks) and `packages/field-kernel-core`
(per-shard `lyapunov.ts` certificate). Both observe; neither drives.

**Rates, stated honestly.** Drive edges: `engineProjection` 4 Hz (engine truth),
`memoryDriver` 64 Hz (substrate), `analysisRuntime` 16 Hz, sensory drivers at their native
233 / 89 / 377 Hz. Nothing else claims a rate it cannot sustain under the governor.

---

## § Amendment Ω-07 (2026-08-24) — the clean sweep, and what it means for truth

**What changed.** 217 files (≈2.5 MB) were removed: the unreachable `packages/brain-core/`
(97 files), the `src/context/rhuft/` prose corpus (59 files) with its `RhuftLibrary.ts` loader,
20 import-dead engine-adjacent modules under `src/core`, 43 unmounted shadcn primitives, and an
empty `src/hooks/`. Two candidates were *proved live* mid-sweep and restored: `src/core/v12/audit/`
and `runtime/ShadowStateTape.ts`.

**What was restored in this amendment.** `src/core/interop/index.ts` — the seam's declared sole
export surface — had been swept as unreferenced. It is a *contract* file (hosts import it, this
repo does not), so unreferenced-ness is expected and is not evidence of deadness. Restored and
typechecked. **Standing rule:** files whose only consumers are outside this repo
(`interop/index.ts`, `facade.ts`, `routes/api/public/*`) are exempt from reachability pruning.

**Effect on this document.** §3, R2, R4, R7, R8 and the register counts above were corrected in
the same change — the brainmap had drifted, describing 97 `brain-core` files and 11 `src/core`
modules that no longer exist. It is now byte-consistent with a live filesystem sweep.

**Verification.** 55 test files / 830 assertions green · `tsgo --noEmit` 0 errors · production
build succeeds · preview renders with zero runtime errors. One deliberate assertion-count
reduction (−29, `brain-core/test/field.test.ts`) covering no live path; no other test lost.

**No law, constant, contract, gate, memory tier or field term was altered.**
# BRAINMAP — Metatron Ω Local (full project map)

Generated: 2026-09-02 · Repo: `brojasonbrown-dotcom/Metatron-Omega-Local` · Branch: `main`

## 1. Where things went wrong (diagnosis)

1. **`main` has diverged.** GitHub (`origin/main`) has commit `750b762` "Add files via upload" — a 22 MB `Metatron Omega.zip` at repo root containing only presentation material (27 JPEGs, 8 figure PNGs, 1 PPTX). Local `main` has commit `e235200` (obsidian MCP swap) that is **not pushed**. Neither side contains the other — this must be reconciled before any push.
2. **The brain IS on GitHub, but buried.** The actual Metatron Ω engine — 136 files — lives at `src/compute_engine/omega/` (the "certified trunk"), three levels deep. Browsing the repo root shows no obvious brain; the only root-level "Metatron Omega" artifact is the zip of slides/images. It *looks* missing even though the source is pushed.
3. **The mind's memory is local-only by design.** `.Omega/` (brain.json, graph.json, memory.json/md — the learned state), `sandbox/`, and `.obsidian/` are gitignored. They will never appear on GitHub unless that policy is deliberately changed.
4. **A stale duplicate exists only locally.** `src/compute_engine/Metatron Omega/` (29 MB, old vite/bun web export) is gitignored as superseded by `src/compute_engine/omega/` — it exists on disk but not in git, another source of confusion about "where the system is".
5. **Empty scaffold directories.** `docs/`, `include/compute/`, `tests/unit/`, `tests/benchmarks/` exist on disk but contain **zero files** — git tracks nothing in them.
6. **Orphaned root `node_modules/`** (with `.vite` cache) exists with **no root `package.json`** — leftover from the abandoned web build. Safe to delete.
7. **Secrets hygiene.** `.mcp.json` (gitignored, correct) contains a **live GitHub PAT in plaintext** — rotate it, it has been exposed in plain view. `.env` *is* tracked; per `.gitignore` comments it holds only devcontainer build config, but that should be re-verified.

## 2. What is on GitHub vs. local-only

| Area | Tracked | On GitHub | Notes |
|---|---|---|---|
| `src/compute_engine/omega/` (brain, 136 files) | yes | yes | the certified trunk |
| `src/compute_engine/app/` (Electron UI) | yes (src only) | yes | 779 MB local incl. node_modules/release — artifacts ignored |
| `notebooks/` (178 files incl. brain architecture.nb, BRAINMAP_*.md) | yes | yes | |
| `Decisions/` (ADRs 012–015) | yes | yes | |
| `scripts/`, `devcontainer*.json`, `Makefile`, `CMakeLists.txt` | yes | yes | |
| `Metatron Omega.zip` | — | **yes (only on GitHub)** | web upload, slides not code; candidate for removal |
| `.Omega/` (mind memory) | no | no | gitignored — local-only by design |
| `sandbox/` (study scripts, OMEGA reports) | no | no | gitignored |
| `src/compute_engine/Metatron Omega/` | no | no | stale duplicate, gitignored |
| `.mcp.json`, `.env.local`, `.obsidian/`, `.pytest_cache/` | no | no | secrets / local state |
| `docs/`, `include/`, `tests/` | — | — | empty dirs |

## 3. Full tracked file tree (368 files, every one — no skips)

.devcontainer/
  Decisions/
    context.md
    overview.md
.vscode/
  extensions.json
  settings.json
Decisions/
  records/
    ADR-012-installer-hardening-build-outside-tree.md
    ADR-013-sensory-actualization-single-encode.md
    ADR-014-sensory-grounding-perception-learning.md
    ADR-015-language-codec-certified-trunk.md
notebooks/
  01_introduction.md
  02_geometric_framework.md
  03_frequency_correction.md
  04_master_equation.md
  1-Planck foam.nb
  18scales testbed.nb
  18scales testbednb.nb
  2-Quark core.nb
  AdaptiveCA.ts
  BRAINMAP_18_Scale_Engine.md
  BRAINMAP_BUILD_SPEC.md
  CORE.nb
  CORE_VISION.md
  Constitutive law.nb
  Core logic.nb
  GEMATRIA_ALPHABET.md
  Latex summary .nb
  MEMORY_ALGORITHMS.md
  NeuralPhiCascade.ts
  PHILOSOPHICAL_FOUNDATION.md
  PhonemeRouting.ts
  PinealCore.ts
  Planck Foam.nb
  PredictiveCoder.ts
  QualiaCorrelate.ts
  RHUFT -appendix.txt
  RHUFT ontology.nb
  RHUFT-NEWEST.txt
  RHUFT_Ultimate_Framework.md
  RHUFT_v5.0_Master_Index.md
  RHUFT_v5.1_Integrated_Framework.md
  RHUFT_v6.0_Integrated_Framework.md
  RHUFT_v6.0_Master_Index.md
  ResonanceBands.ts
  RhuftArrowOfTime.ts
  RhuftConsciousnessThreshold.ts
  RhuftDuality.ts
  RhuftElectromagnetism.ts
  RhuftGalacticCoherence.ts
  RhuftGenerationsCascade.ts
  RhuftMassQuantum.ts
  RhuftMasterEquation.ts
  RhuftObserverEffect.ts
  ScaleDrift.ts
  SceneRecognition.ts
  SelfReflection.ts
  SuperpositionField.ts
  TOROIDAL_FLOW.md
  ThreeSixNine.ts
  TriadicLogic.ts
  Untitled-1.nb
  Untitled-11.nb
  Untitled-12.nb
  Untitled-13.nb
  Untitled-2.nb
  Untitled-3.nb
  Untitled-4.nb
  Untitled-5.nb
  Untitled-6.nb
  Untitled-8.nb
  Untitled-9.nb
  brain architecture.nb
  ensureSymlink.md
  math corridor.jpeg
  metatron math architectures.nb
  phenomenon_01_double_slit.md
  phenomenon_02_mass_emergence.md
  phenomenon_03_gravity_gradient.md
  phenomenon_04_inertia.md
  phenomenon_05_electromagnetism.md
  phenomenon_06_gravity_compression.md
  phenomenon_07_entanglement.md
  phenomenon_08_time.md
  phenomenon_09_consciousness.md
  phenomenon_10_light.md
  phenomenon_11_particle_diversity.md
  phenomenon_12_titius_bode.md
  phenomenon_13_dark_matter.md
  phenomenon_14_cmb.md
  phenomenon_15_baryon_asymmetry.md
  phenomenon_16_mass_values.md
  phenomenon_17_generations.md
  phenomenon_18_vacuum.md
  phenomenon_19_neutrinos.md
  phenomenon_20_black_holes.md
  phenomenon_21_tunneling.md
  phenomenon_22_duality.md
  phenomenon_23_proton_radius.md
  phenomenon_24_zpe.md
  phenomenon_25_nonlocality.md
  phenomenon_26_macroscopic.md
  phenomenon_27_inflation.md
  phenomenon_28_arrow_time.md
  phenomenon_29_vacuum_paradox.md
  phenomenon_30_dna.md
  phenomenon_31_toroidal.md
  phenomenon_32_spin.md
  phenomenon_33_propulsion.md
  phenomenon_34_time_crystals.md
  phenomenon_35_flower_of_life.md
  phenomenon_36_resonant_freq.md
  phenomenon_37_neural.md
  phenomenon_38_mass_illusion.md
  tech_01_qsps.md
  tech_02_rfs.md
  tech_03_mass_null.md
  tech_04_fbci.md
  tech_05_ceai.md
  tech_06_mind_mapper.md
  tech_07_nqhc.md
  tech_08_sensor.md
  tech_09_rhc.md
  tech_10_memory.md
  tech_11_energy.md
  tech_12_resonator.md
  tech_13_vacuum.md
  tech_14_bio.md
  tech_15_neural.md
  tech_16_psi.md
  v6_01_introduction.md
  v6_02_geometric_framework.md
  v6_03_frequency_correction.md
  v6_04_master_equation.md
  v6_phenomenon_01_double_slit.md
  v6_phenomenon_02_mass_emergence.md
  v6_phenomenon_03_gravity_gradient.md
  v6_phenomenon_04_inertia.md
  v6_phenomenon_05_electromagnetism.md
  v6_phenomenon_06_gravity_compression.md
  v6_phenomenon_07_entanglement.md
  v6_phenomenon_08_time.md
  v6_phenomenon_09_consciousness.md
  v6_phenomenon_10_light.md
  v6_phenomenon_11_particle_diversity.md
  v6_phenomenon_12_titius_bode.md
  v6_phenomenon_13_dark_matter.md
  v6_phenomenon_14_cmb.md
  v6_phenomenon_15_baryon_asymmetry.md
  v6_phenomenon_16_mass_values.md
  v6_phenomenon_17_generations.md
  v6_phenomenon_18_vacuum.md
  v6_phenomenon_19_neutrinos.md
  v6_phenomenon_20_black_holes.md
  v6_phenomenon_21_tunneling.md
  v6_phenomenon_22_duality.md
  v6_phenomenon_23_proton_radius.md
  v6_phenomenon_24_zpe.md
  v6_phenomenon_25_nonlocality.md
  v6_phenomenon_26_macroscopic.md
  v6_phenomenon_27_inflation.md
  v6_phenomenon_28_arrow_time.md
  v6_phenomenon_29_vacuum_paradox.md
  v6_phenomenon_30_dna.md
  v6_phenomenon_31_toroidal.md
  v6_phenomenon_32_spin.md
  v6_phenomenon_33_propulsion.md
  v6_phenomenon_34_time_crystals.md
  v6_phenomenon_35_flower_of_life.md
  v6_phenomenon_36_resonant_freq.md
  v6_phenomenon_37_neural.md
  v6_phenomenon_38_mass_illusion.md
  v6_tech_01_qsps.md
  v6_tech_02_rfs.md
  v6_tech_03_mass_null.md
  v6_tech_04_fbci.md
  v6_tech_05_ceai.md
  v6_tech_06_mind_mapper.md
  v6_tech_07_nqhc.md
  v6_tech_08_sensor.md
  v6_tech_09_rhc.md
  v6_tech_10_memory.md
  v6_tech_11_energy.md
  v6_tech_12_resonator.md
  v6_tech_13_vacuum.md
  v6_tech_14_bio.md
  v6_tech_15_neural.md
  v6_tech_16_psi.md
  verification_suite.py
scripts/
  wolfram/
    wa-utils.wls
    wolfram-utils.wls
  setup-compute-env.sh
  wolfram-smoke-test.wls
src/
  compute_engine/
    app/
      build/
        icon.ico
        icon.png
      electron/
        documentIngest.cjs
        llmClient.cjs
        main.cjs
        omega-bundle.cjs
        omegaLoop.cjs
        omegaResponder.cjs
        preload.cjs
        sensory.cjs
      renderer/
        chat.js
        fab.js
        index.html
        layout.js
        sensors.js
        styles.css
      scripts/
        build-driver.mjs
        bundle-omega.mjs
        make-icon.py
        pre-pack.mjs
        smoke.mjs
      BUILD-OMEGA.bat
      LAUNCH-OMEGA.bat
      README.md
      electron-builder.yml
      omega-split.png
      package-lock.json
      package.json
    omega/
      docs/
        BRAINMAP.md
      packages/
        field-kernel-core/
          src/
            cos.ts
            index.ts
            kernel.ts
            localUpdate.ts
            lyapunov.ts
            measurement.ts
            portFlags.ts
            state.ts
          package.json
          tsconfig.json
        trnn-core/
          src/
            algebra/
              clifford.ts
            cell/
              closure.ts
              memory.ts
              organs.ts
              update.ts
            cognition/
              concepts.ts
              mind.ts
              selfModel.ts
            core/
              complex.ts
              constants.ts
              determinism.ts
              dmath.ts
              fibonacci.ts
              indexing.ts
              scaleLadder.ts
              window.ts
            engine/
              MultiTorusEngine.ts
              SingleTorusEngine.ts
            fractal/
              nest.ts
              pool.ts
            genome/
              record.ts
            harness/
              abstention.ts
              battery.ts
              certify.ts
              conformal.ts
              golden.ts
              latency.ts
            learn/
              battery.ts
              cell.ts
              mixer.ts
              params.ts
              spectralAttention.ts
              spectralFilter.ts
              tiers.ts
            ledger/
              canonical.ts
              merkle.ts
              sth.ts
            measure/
              coherence.ts
              state.ts
              transcription.ts
            memory/
              braid.ts
              turingTape.ts
            runtime/
              calibrate.ts
              governor.ts
              hardware.ts
              host.ts
              profiles.ts
              runLedger.ts
              views.ts
            sense/
              encode.ts
              fusion.ts
              nodeArray.ts
              perception.ts
              plane.ts
              scan.ts
            spectral/
              fft.ts
              laplacian.ts
              radial.ts
              site.ts
              sphere.ts
            substrate/
              causal.ts
              coherenceKernel.ts
              correlation.ts
              dmd.ts
              phiSubstrate.ts
              plasticity.ts
              resonanceBus.ts
              signalStats.ts
              vsa.ts
            sweeps/
              tenSweep.ts
            torus/
              eigenmodes.ts
              lattice.ts
              superposition.ts
            web/
              coupling.ts
              fluxLedger.ts
              morphism.ts
              octave.ts
              ordering.ts
            index.ts
          test/
            a0-laplacian.test.ts
            b0-fft.test.ts
            b1-efit.test.ts
            f0-nesting.test.ts
            f1-clifford.test.ts
            g0-foundation.test.ts
            g1-single-torus.test.ts
            g2-spectral.test.ts
            g3-web.test.ts
            g4-runtime.test.ts
            g5-views.test.ts
            g6-sense-memory.test.ts
            g7-cognition.test.ts
            g8-learning.test.ts
            n0-organs.test.ts
            n1-sensory-nodes.test.ts
            n2-rung-scan.test.ts
            oracle.ts
            p8-perception.test.ts
            r0-substrate-parity.test.ts
            r1-innovation-coherence.test.ts
            r2-correlation-stack.test.ts
            r3-causal-layer.test.ts
            r4-resonance-bus.test.ts
            r5-vsa-plasticity-dmd.test.ts
            r6-ledger-genome.test.ts
            r7-ten-sweep.test.ts
            r8-harness.test.ts
            s0-oracle.test.ts
            s1-measurement.test.ts
            s2-constants.test.ts
            s3-window.test.ts
            s4-iss.test.ts
            s5-dmath.test.ts
            s5-environment.test.ts
            w2-warm-coherence.test.ts
          package.json
          tsconfig.json
      .gitignore
      .prettierignore
      .prettierrc
      README.md
      package-lock.json
      package.json
      tsconfig.json
      vitest.config.ts
    package-lock.json
    package.json
    tsconfig.base.json
    vitest.workspace.ts
.env
.gitignore
.mcp.example.json
CMakeLists.txt
Makefile
Untitled.base
devcontainer.compute.json
devcontainer.json
pyproject.toml
requirements.txt
