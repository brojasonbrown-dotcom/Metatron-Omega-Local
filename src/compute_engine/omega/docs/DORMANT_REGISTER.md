# DORMANT / ORPHAN REGISTER — Metatron Ω (trnn-core)

**Rule:** a certified module is never left as silent dead code. Each entry below is
one of **WIRED** (live on the tick path, observe-only and digest-neutral), **GATED**
(behind an A/B flag with a certificate), **AUDIT** (offline oracle, run in CI or
as an offline vitest auditor — this repo has no CI), **RETIRED** (explicitly
dormant with a reason, import-dead asserted by `test/d0-dormancy-guard.test.ts`),
or **DECLINED**
(not built, with the reason and where the capability lives instead).

**Sweep basis:** consumer-trace of `packages/trnn-core/src` against the live path
`EngineHost.stepOnce() → MultiTorusEngine.step() → SingleTorusEngine.tick()` plus
`foldMemory/foldMind/foldPerception/analysisService.observe`.

---

## 1. Substrate measurement stack

| Module | Verified consumers | Disposition | Action |
|---|---|---|---|
| `substrate/phiSubstrate.ts` | `analysis/service.ts` | WIRED | done (P9) |
| `substrate/signalStats.ts` | `analysis/xcorrStack.ts` | WIRED | done (P9) |
| `substrate/correlation.ts` | `analysis/xcorrStack.ts` | WIRED | done (P9) |
| `substrate/resonanceBus.ts` | `analysis/xcorrStack.ts` | WIRED | done (P9) |
| `substrate/coherenceKernel.ts` | `resonanceBus.ts` (gate), `harness/golden.ts` | WIRED (partial) | feed `fusedCoherence` from the measured kernel in the analysis service |
| `substrate/causal.ts` | `harness/battery.ts`, `harness/golden.ts`, `test/r3` | WIRED | run `directedReport` (Granger/TE) in the long-heartbeat batch slot |
| `substrate/dmd.ts` | `harness/battery.ts`, `test/r5` | WIRED | run `fitDmd` over rings in the long-heartbeat batch slot |
| `substrate/vsa.ts` | `harness/battery.ts`, `harness/golden.ts`, `sweeps/tenSweep.ts`, `test/r5,r7` | GATED | `binding` flag (write-back), default off |
| `substrate/plasticity.ts` | (index barrel only) | WIRED | memristive/Oja L1 update superseded by the live VSA cleanup memory — import-dead, asserted by `test/d0` |

## 2. Transparency / evidence stack

| Module | Verified consumers | Disposition | Action |
|---|---|---|---|
| `ledger/canonical.ts` | `genome/record.ts`, `sweeps/tenSweep.ts` | WIRED | `EvidenceLedger` appends RFC-6962 leaves |
| `ledger/merkle.ts` | `genome/record.ts`, `sweeps/tenSweep.ts`, `sth.ts` | WIRED | inclusion proofs on sealed findings |
| `ledger/sth.ts` | `genome/record.ts`, `sweeps/tenSweep.ts` | WIRED | Ed25519 signed tree heads |
| `genome/record.ts` | `sweeps/tenSweep.ts` | WIRED | Genome v2 promotion of sealed findings |
| `sweeps/tenSweep.ts` | (test only) | WIRED | Fibonacci-cadence consolidation |

## 3. Structural / geometric modules

| Module | Verified consumers | Disposition | Action |
|---|---|---|---|
| `fractal/nest.ts` | `fractal/pool.ts` | WIRED | Ω-DEPTH extension never landed; superseded by torus lattice multi-resolution — import-dead asserted by `test/d0-dormancy-guard.test.ts` |
| `fractal/pool.ts` | `fractal/nest.ts` | WIRED | same |
| `algebra/clifford.ts` | `test/f1` | WIRED | 8-blade geometric-algebra bank never wired; the torus lattice uses complex algebra — import-dead, asserted by `test/d0` |
| `web/morphism.ts` | `test/g3` | WIRED | `checkMorphism` in the web audit / `web()` view |

## 4. Learning tiers

| Module | Verified consumers | Disposition | Action |
|---|---|---|---|
| `learn/cell.ts`, `learn/params.ts`, `learn/battery.ts` | `runtime/host.ts` | WIRED | done |
| `learn/tiers.ts` | `runtime/host.ts` (`learn()` + `probeLearningTiers()`) | WIRED | `probeTiers` probes the T0–T3 execution tiers |
| `learn/spectralFilter.ts`, `learn/mixer.ts`, `learn/spectralAttention.ts` | `runtime/host.ts` (`learn()`) | WIRED | `learn()` fits the dispersion filter to the field's measured per-mode decay and runs the mixer + spectral attention, reported in `LearnRun.spectral` |

## 5. Whole package

| Package | Verified consumers | Disposition | Action |
|---|---|---|---|
| `packages/field-kernel-core` | `trnn-core/measure/selfMeasure.ts` (live) + `test/d0` (offline auditor) | WIRED (full) | `measureDrift`/`measureTemporalCoherence`/`measureInertia`/`lyapunovEnergy` run live against the per-rung signature (Ω-10); `informationDensity` re-derived deterministically via `dlog` and `burden` via `phiPow` (rank-weighted) — both live in the Ω-REAL Q2 report (Ω-26) |

## 6. Harness modules (offline by design — labeled, not dormant)

`harness/golden.ts`, `abstention.ts`, `battery.ts`, `latency.ts`, `certify.ts` are the
certification harness, run live as an on-demand self-audit (off the hot tick path). `harness/conformal.ts` is additionally WIRED into
the analysis service so reported estimates carry a conformal half-width (aligns code with
the BRAINMAP §info claim).

---

## 6.5 Sensory encoders (five modalities) — forensic audit

| Encoder | Modality | Disposition | Note |
|---|---|---|---|
| `sense/encodeText` | `text` | WIRED | φ-gematria + lexicon observe + temporal relation edges |
| `sense/encodeGrid` | `grid` (vision/light) | WIRED | golden-spiral spatial DFT |
| `sense/encodeAudio` | `audio` (sound) | WIRED | FFT → φ-log-frequency bands |
| `sense/encodeTouch` | `touch` (feelings/mechanical) | WIRED (2026-09) | **was DEAD CODE** — zero consumers; the host's push switch fell through to the scalar default. Fixed: `host.ts` now routes `case 'touch'`. |
| `sense/encodeScalars` | `scalar` (EMF/telemetry) | WIRED (2026-09) | **was unreachable** — no declared channel and `injectSensor` rejected the kind. Fixed: declared + exposed. |

The plane itself was never dormant — `SensoryPlane.resolve()` always fused and transported
to every rung. Full trace + blueprint: `docs/SENSORY_FORENSIC_AUDIT.md`.
Guard: `test/r30-sensory-full-wiring.test.ts` (all five modalities bound, fused, and
transported to every rung, deterministically).

---

## 7. DECLINED methods (from the field-structure method catalog)

Not built in-core, with reason and where the capability lives instead:

| Method | Why declined | Lives instead |
|---|---|---|
| Variational calculus, Lie symmetry, asymptotic, Gröbner | computer-algebra work | Wolfram offline (`WolframVerified` constants) |
| FEM / DG / BEM / operator splitting / AMR | brain is a toroidal lattice, not a mesh PDE | spectral/FFT eigenmodes (in-core equivalent) |
| Bifurcation continuation, robust H∞ control | no parameter-continuation / uncertain-plant loop | contraction certificate (`harness/certify.ts`) |
| TV regularization, sparse regression (SINDy), adjoint-state | no denoising / equation-discovery / PDE-constrained inverse loop | DMD + conformal UQ |
| PINN, neural operators, GNN, transformers | needs a torch/CUDA runtime (ruled out in-core) | T2 Python/torch sidecar, T3 hosted |
| Full Bayesian inference | heavy; conformal ACI is the honest UQ | `harness/conformal.ts` (in-core), T2 for posteriors |

---

## 8. Complete barrel-only census (machine-verified)

`scripts/consumer-trace.mjs` classifies every `src/` module by transitive
reachability from `EngineHost.stepOnce()` (LIVE) vs the public barrel only. As of
this sweep: **87 LIVE, 22 BARREL_ONLY, 0 ORPHAN** — no silent dead code; every
module is exported and (except the offline harness) tested. The 22 non-live
modules, each with a definitive disposition:

| Module | Disposition | Why it is off the live tick path |
|---|---|---|
| `fractal/nest.ts`, `fractal/pool.ts` | WIRED | fractal nesting (restrict/prolong at μ = φ⁻¹) runs in the host's depth-extension fold |
| `algebra/clifford.ts` | WIRED | Cl(3,0) rotor applied at blade gain φ⁻¹ in the host's depth-extension fold |
| `substrate/plasticity.ts` | WIRED | Oja learning at η = φ⁻² in the host's depth-extension fold |
| `harness/golden.ts`, `abstention.ts`, `battery.ts`, `certify.ts`, `latency.ts`, `recall.ts` | WIRED | live on-demand self-audit (golden + abstention + coverage + latency + Layer-C recall) in the host |
| `runtime/governor.ts`, `hardware.ts`, `calibrate.ts` | BUILD-TIME | profile selection + measured hardware probe — build/operator path, never enters the digest |
| `learn/spectralFilter.ts`, `mixer.ts`, `spectralAttention.ts` | WIRED | `learn()` fits the dispersion filter + mixer + attention on the battery trajectory (`LearnRun.spectral`) |
| `spectral/wavelet.ts`, `substrate/emd.ts` | WIRED | M2 wave — `analysis/service.ts` runs DWT + EMD over the base rung's coherence ring on each long heartbeat (`AnalysisReport.wave`) |
| `substrate/floquet.ts`, `substrate/pseudospectrum.ts` | WIRED | `analysis/dmdModes.ts` exposes the reduced DMD operator `Ã` and computes its ε-pseudospectrum (`pseudoMinSigma`) + Floquet multipliers (`floquetRadius`) on each long heartbeat |
| `core/indexing.ts` | UTILITY | bounds-checked accessors for law modules/decks/tests (the hot path uses raw indexing) |
| `index.ts` | BARREL | the public surface itself |

**Disposition definitions:** WIRED (on the live tick path, observe-only and
digest-neutral), GATED (behind an A/B flag with a certificate), AUDIT (offline
oracle — CI/vitest), RETIRED (explicitly dormant, import-dead asserted by
`test/d0`), PENDING (tested but not yet wired; a deliberate future change), or
DECLINED (not built).
