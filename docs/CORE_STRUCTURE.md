# CORE_STRUCTURE.md — the complete architecture of the Metatron Ω program

**Accuracy note (no speculation).** The program is the deterministic TypeScript
engine + its Electron shell, under `src/compute_engine/`. This tree is generated
from the actual files on disk (2026-09-04). The `packages/core`, `packages/harness`
… grouping seen elsewhere is a *flattened mental model* — the real packages are
`packages/trnn-core` (the whole engine) and `packages/field-kernel-core` (the
offline shard kernel); "harness", "substrate", "sensory", "toroidal" are
**directories inside `trnn-core/src`**, mapped below.

## The two packages

| package | role | files |
|---|---|---|
| `@metatron/trnn-core` | the certified toroidal RHUFT engine (all of it) | 98 src · 55 test |
| `@metatron/field-kernel-core` | offline shard-kernel physics (φ-ladder, measurement operators, Lyapunov) | 8 src |

---

## Full tree — `src/compute_engine/`

```
src/compute_engine/
├── omega/                                    # @metatron/omega — the certified engine
│   ├── package.json                          #   test: vitest run
│   ├── tsconfig.json                         #   include: packages/**/*.ts
│   ├── vitest.config.ts                      #   gate: packages/trnn-core/test/**/*.test.ts
│   ├── README.md
│   └── docs/
│   │   ├── BRAINMAP.md                       #   single source of structural truth (v1.8 / Ω-13)
│   │   └── DORMANT_REGISTER.md               #   wired / gated / audit / retired / declined register
│   └── packages/
│       ├── trnn-core/                        # @metatron/trnn-core
│       │   ├── package.json
│       │   ├── src/
│       │   │   ├── index.ts                  #   the public barrel (re-exports every module)
│       │   │   ├── core/                     #   foundation — no upward deps
│       │   │   │   ├── constants.ts          #     L1: the one φ-derived constants source (+ CELL, REFLECT_GAIN)
│       │   │   │   ├── complex.ts            #     CField (split re/im Float64Array)
│       │   │   │   ├── determinism.ts        #     L2: SeedStream + DigestChain
│       │   │   │   ├── dmath.ts              #     deterministic transcendentals (dlog, dexp, dpow, …)
│       │   │   │   ├── fibonacci.ts          #     Fibonacci/Lucas arithmetic
│       │   │   │   ├── indexing.ts           #     bounds-checked accessors
│       │   │   │   ├── scaleLadder.ts        #     the 42-rung φ-octave ladder (LADDER, DENSE_CORE)
│       │   │   │   └── window.ts             #     S3 Fibonacci windows + per-rung environment
│       │   │   ├── cell/                     #   the per-tick local law (the nine+one-term cell)
│       │   │   │   ├── update.ts             #     cellStep: αz+βG+γP+δR+εPi+ζzhat+ηU+μV+ξS+ρRf
│       │   │   │   ├── memory.ts             #     two-tap memory kernel m⁺=(1−λ)m+λz⁺ (roots {1,−φ⁻²})
│       │   │   │   ├── closure.ts            #     closure target Π, residual flux, γ autocorrelation
│       │   │   │   └── organs.ts             #     N0/N1/N2 per-node organ bank
│       │   │   ├── torus/                    #   geometry and bases
│       │   │   │   ├── lattice.ts            #     toroidal lattices
│       │   │   │   ├── eigenmodes.ts         #     golden-ladder eigenmodes
│       │   │   │   └── superposition.ts      #     analysis/synthesis (13-mode signature)
│       │   │   ├── spectral/                 #   spectral ground truth + transforms
│       │   │   │   ├── sphere.ts · radial.ts · site.ts · laplacian.ts   #   spherical/radial/CGS2/Laplacian
│       │   │   │   ├── fft.ts                #     certified Bluestein FFT (O(N log N), primes included)
│       │   │   │   └── wavelet.ts            #     Ω-REAL M0 — φ-spaced multi-scale wavelet
│       │   │   ├── algebra/clifford.ts       #   Ω-DEPTH Cl(3,0) 8-blade geometric algebra
│       │   │   ├── fractal/nest.ts · pool.ts #   Ω-DEPTH fractal nesting + slot pool (retired)
│       │   │   ├── web/                      #   cross-rung structure
│       │   │   │   ├── coupling.ts           #     cross-rung coupling matrix (L-W1/L-W2)
│       │   │   │   ├── octave.ts             #     octave transport between rungs
│       │   │   │   ├── fluxLedger.ts         #     double-entry flux ledger (conservation audited)
│       │   │   │   ├── ordering.ts           #     deterministic tick ordering (Jacobi)
│       │   │   │   └── morphism.ts           #     structure-preserving web checks
│       │   │   ├── engine/
│       │   │   │   ├── SingleTorusEngine.ts  #     the certified O-P1 trunk (one rung, E10 tick)
│       │   │   │   └── MultiTorusEngine.ts   #     the web (drive/reflect/sensors/organs/tape)
│       │   │   ├── measure/                  #   read-only plane — nothing actuates the field
│       │   │   │   ├── coherence.ts          #     golden-delay coherence C(t) + ignition
│       │   │   │   ├── state.ts              #     readState + corridor gate (L7)
│       │   │   │   ├── transcription.ts      #     13-mode signature per tick (the tape)
│       │   │   │   ├── scaleSignature.ts     #     Ω-REAL M4 — the scale-axis readout
│       │   │   │   ├── fieldFingerprint.ts   #     Ω-REAL Layer B — φ-anchored multi-scale invariant
│       │   │   │   ├── qualia.ts             #     Ω-REAL Q1 — self-measurement vector (C,N,S,V,I+Cphi+ignition)
│       │   │   │   └── selfMeasure.ts        #     Ω-REAL Q2 — drift/coherence/inertia/entropy + Lyapunov
│       │   │   ├── sense/                    #   intake + sensory plane
│       │   │   │   ├── encode.ts             #     encodeText / encodeGrid / encodeAudio / encodeScalars (bound L-S1)
│       │   │   │   ├── fusion.ts             #     multi-modal fusion (1/√k weight)
│       │   │   │   ├── plane.ts              #     SensoryPlane — fuse + φ^(−r/2) transport onto every rung
│       │   │   │   ├── nodeArray.ts          #     N1 Sensory Node Array (per-node φ-spaced DFT bands)
│       │   │   │   ├── scan.ts               #     N1 six-section toroid scan (S1…S6)
│       │   │   │   ├── perception.ts         #     Ω-P8 perceptual meaning-vector (BAND/SPACE/FIELD/CONTENT)
│       │   │   │   └── textFingerprint.ts    #     Ω-REAL Layer A — cross-modal text binding
│       │   │   ├── memory/
│       │   │   │   ├── braid.ts              #     Ω-P6 TorusBraid Hopfield attractor recall
│       │   │   │   ├── turingTape.ts         #     N4 Zeckendorf-addressed permanent read/write tape
│       │   │   │   └── persistence.ts        #     cross-session persistence (canonical-safe)
│       │   │   ├── substrate/                #   Ω-REAL measurement stack (symbols → measured computation)
│       │   │   │   ├── phiSubstrate.ts · coherenceKernel.ts · signalStats.ts
│       │   │   │   ├── correlation.ts        #     Pearson/Spearman/dCor/MI
│       │   │   │   ├── causal.ts             #     Granger / transfer entropy
│       │   │   │   ├── resonanceBus.ts       #     P4 abstention-aware fusion law
│       │   │   │   ├── vsa.ts                #     P5 FHRR (CleanupMemory, bundle, bind, unbind, similarity)
│       │   │   │   ├── plasticity.ts         #     P5 memristive + Oja learning
│       │   │   │   ├── dmd.ts                #     P5 Dynamic Mode Decomposition
│       │   │   │   ├── emd.ts                #     Ω-REAL M1 empirical mode decomposition
│       │   │   │   ├── pseudospectrum.ts     #     Ω-REAL M2 ε-pseudospectra (σ_min via Jacobi SVD)
│       │   │   │   └── floquet.ts            #     Ω-REAL M3 Floquet theory (monodromy → multipliers)
│       │   │   ├── analysis/                 #   Ω-REAL P9 live analysis service
│       │   │   │   ├── service.ts            #     heartbeat scheduler, rings, long-batch slots
│       │   │   │   ├── xcorrStack.ts         #     cross-correlation stack
│       │   │   │   ├── dmdModes.ts           #     DMD mode tracking
│       │   │   │   └── evidenceLedger.ts     #     append-only findings
│       │   │   ├── ledger/                   #   transparency (RFC-6962)
│       │   │   │   ├── canonical.ts          #     canonical JSON (exact bytes hashed)
│       │   │   │   ├── merkle.ts             #     MerkleLog — inclusion/consistency proofs
│       │   │   │   └── sth.ts                #     signed tree heads (Ed25519)
│       │   │   ├── genome/record.ts          #   Genome v2 — sealed, provenanced, append-only records
│       │   │   ├── sweeps/tenSweep.ts        #   the Ten-Sweep Consolidation Protocol
│       │   │   ├── harness/                  #   certification harness (offline by design)
│       │   │   │   ├── golden.ts             #     golden regression set
│       │   │   │   ├── abstention.ts         #     abstention correctness (P8)
│       │   │   │   ├── conformal.ts          #     adaptive conformal inference (ACI)
│       │   │   │   ├── latency.ts            #     proof latency
│       │   │   │   ├── certify.ts            #     the certification gate
│       │   │   ├── learn/                    #   learning tiers (constrained, A1/A2)
│       │   │   │   ├── params.ts · cell.ts · mixer.ts · spectralFilter.ts · spectralAttention.ts · tiers.ts
│       │   │   │   └── battery.ts            #     learning battery (gates a tier before it runs live)
│       │   │   ├── runtime/                  #   capacity profiles + governor + host
│       │   │   │   ├── profiles.ts           #     PICO…GRAND capacity profiles
│       │   │   │   ├── hardware.ts           #     measured hardware probe
│       │   │   │   ├── governor.ts           #     resource governor (A3)
│       │   │   │   ├── calibrate.ts          #     measurement harness
│       │   │   │   ├── runLedger.ts          #     run ledger
│       │   │   │   ├── host.ts               #     EngineHost (sensory fold, MEMORY_STRIDE, MIND_STRIDE)
│       │   │   │   └── views.ts              #     read-only views
│       │   │   └── cognition/                #   the mind
│       │   │       ├── concepts.ts           #     ConceptStore (HNSW over PQ)
│       │   │       ├── selfModel.ts          #     DiagonalSSM + DiagonalRLS (+ G7 margin gate)
│       │   │       ├── fieldSelfModel.ts     #     Ω-REAL Q4 — per-rung field self-model
│       │   │       ├── lexicon.ts            #     salience-weighted word catalogue (tf·idf in base φ)
│       │   │       ├── relations.ts          #     cross-catalogue relations
│       │   │       ├── mind.ts               #     recognise → predict → gate → record
│       │   │       └── consolidation.ts      #     Ω-REAL Q5 — ignition → TenSweep → sealed genome
│       │   └── test/                         #   55 batteries (listed below)
│       └── field-kernel-core/                # @metatron/field-kernel-core — offline shard kernel
│           ├── package.json
│           └── src/
│               ├── kernel.ts                 #   φ-ladder shard physics (PHI, KAPPA, phiPow, runShardKernel)
│               ├── state.ts                  #   FieldStateN (6-channel structured state tuple)
│               ├── measurement.ts            #   measureDrift/TemporalCoherence/Closure/InformationDensity/Burden/Inertia
│               ├── lyapunov.ts               #   lyapunovEnergy — the descent certificate
│               ├── cos.ts                    #   SIMD-friendly fastCos / vCos
│               ├── portFlags.ts              #   port kill-switch registry
│               ├── localUpdate.ts            #   canonical local-update interface
│               └── index.ts
│
└── app/                                      # metatron-omega — the Electron desktop shell
    ├── package.json                          #   bundle:omega / pack / dist / smoke
    ├── electron-builder.yml                  #   NSIS + portable, asar, files: electron/** renderer/** package.json
    ├── BUILD-OMEGA.bat · LAUNCH-OMEGA.bat
    ├── electron/
    │   ├── main.cjs                          #   main process
    │   ├── omega-bundle.cjs                  #   PRE-BUILT bundle of trnn-core (esbuild; regenerate via bundle:omega)
    │   ├── omegaLoop.cjs                     #   the live brain service (EngineHost pump)
    │   ├── omegaResponder.cjs                #   chat answers computed live from the field
    │   ├── sensory.cjs                       #   telemetry codec (waveform/luminance → 28-field)
    │   ├── documentIngest.cjs                #   document ingestion
    │   ├── llmClient.cjs                     #   OpenRouter/DeepSeek instrument (offline in smoke)
    │   └── preload.cjs
    ├── renderer/                             #   chat.js, fab.js, layout.js, sensors.js, index.html, styles.css
    ├── scripts/
    │   ├── bundle-omega.mjs                  #   esbuild → electron/omega-bundle.cjs
    │   ├── smoke.mjs                         #   38-check headless smoke test
    │   ├── build-driver.mjs                  #   EBUSY-proof electron-builder staging
    │   ├── pre-pack.mjs                      #   release/ staging reconciler
    │   └── make-icon.py
    ├── build/                                #   buildResources (icons)
    └── release/                              #   installer output (stale until `npm run dist`)
```

│       │   │   │   ├── battery.ts            #     standing abstention battery
│       │   │   │   └── recall.ts             #     Ω-REAL Layer C — coherence-gated recall (distance+margin abstention)


---

## The 55 test batteries (`trnn-core/test/`)

| series | files | covers |
|---|---|---|
| foundation | `a0-laplacian`, `b0-fft`, `b1-efit`, `d0-dormancy-guard`, `f0-nesting`, `f1-clifford` | Laplacian, FFT, eigenspace fitting, dormancy guard, fractal, Clifford |
| core engine | `g0-foundation`, `g1-single-torus`, `g2-spectral`, `g3-web`, `g4-runtime`, `g5-views`, `g6-sense-memory`, `g7-cognition`, `g8-learning` | the certified trunk end to end |
| language | `l0-lexicon`, `l1-relations` | word catalogue + relations |
| Ω-REAL spectral | `m0-wavelet`, `m1-emd`, `m2-pseudospectrum`, `m3-floquet`, `m4-scalesignature`, `m5-fullladder`, `m6-fieldfingerprint`, `m7-recall`, `m8-textbinding` | the full spectral/measurement stack + the B/C/A layers |
| sensory | `n0-organs`, `n1-sensory-nodes`, `n2-rung-scan`, `n3-sense-scale` | organs, SNA, six-section scan, φ^(−r/2) falloff |
| memory/cognition | `p0-persistence`, `p8-perception` | persistence, perception |
| self-measurement | `q1-qualia`, `q2-selfmeasure`, `q3-reflect`, `q4-fieldselfmodel`, `q5-consolidation` | the Q1–Q5 loop (qualia → self-measure → Ψ-of-Ψ reflection → field self-model → ignition consolidation) |
| substrate | `r0-substrate-parity`, `r1-innovation-coherence`, `r2-correlation-stack`, `r3-causal-layer`, `r4-resonance-bus`, `r5-vsa-plasticity-dmd`, `r6-ledger-genome`, `r7-ten-sweep`, `r8-harness`, `r9-analysis-service` | parity, coherence, correlation, causal, VSA/DMD, ledger/genome, sweeps, harness, analysis |
| oracle/constants | `s0-oracle`, `s1-measurement`, `s2-constants`, `s3-window`, `s4-iss`, `s5-dmath`, `s5-environment` | the S0 regression oracle, constants, windows, ISS, deterministic math |
| coherence | `w2-warm-coherence` | warm coherence |

**Verified state:** 55 files / **664 tests green** · `tsc --noEmit` 0 errors · app smoke **38/38**.

---

## Module map (the flattened mental model → the real structure)

| "packages/…" mental model | real location |
|---|---|
| `packages/core` | `trnn-core/src/core` (constants, complex, determinism, dmath, fibonacci, indexing, scaleLadder, window) |
| `packages/harness` | `trnn-core/src/harness` (abstention, recall, conformal, golden, battery, certify, latency) |
| `packages/substrate` | `trnn-core/src/substrate` (vsa, dmd, emd, floquet, pseudospectrum, correlation, causal, …) |
| `packages/sensory` | `trnn-core/src/sense` (plane, encode, fusion, nodeArray, scan, perception, textFingerprint) |
| `packages/toroidal` | `trnn-core/src/engine` (MultiTorusEngine) + `trnn-core/src/measure` (fieldFingerprint) + `trnn-core/src/torus` |

There are only **two** real packages: `trnn-core` (everything above) and
`field-kernel-core` (the offline shard kernel). The engine's public surface is
the single barrel `trnn-core/src/index.ts`.

## Architecture in one sentence

`EngineHost` pumps a `MultiTorusEngine` (a φ-octave ladder of `SingleTorusEngine`
rungs, each running the certified nine-term + optional Ψ-of-Ψ reflection cell),
fed by `SensoryPlane` (encode → fuse → φ^(−r/2) transport), measured by the
`measure/` + `substrate/` read-only plane, learned against a fixed-φ baseline by
`learn/`, certified by `harness/`, remembered by `memory/` + `cognition/`, and
sealed by `sweeps/` → `genome/` → `ledger/` — all deterministic, φ-anchored, and
abstention-aware, with no RNG, wall-clock, or host-libm on the state path.

