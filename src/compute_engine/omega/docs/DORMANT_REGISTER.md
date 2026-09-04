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
| `substrate/plasticity.ts` | (index barrel only) | GATED or RETIRED | `plasticity` flag (write-back), default off; otherwise retire |

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
| `fractal/nest.ts` | `fractal/pool.ts` | RETIRED | Ω-DEPTH extension never landed; superseded by torus lattice multi-resolution — import-dead asserted by `test/d0-dormancy-guard.test.ts` |
| `fractal/pool.ts` | `fractal/nest.ts` | RETIRED | same |
| `algebra/clifford.ts` | `test/f1` | GATED or RETIRED | wire into `cell/organs.ts` as 8-blade bank (A/B), or retire + correct BRAINMAP §info |
| `web/morphism.ts` | `test/g3` | WIRED | `checkMorphism` in the web audit / `web()` view |

## 4. Learning tiers

| Module | Verified consumers | Disposition | Action |
|---|---|---|---|
| `learn/cell.ts`, `learn/params.ts`, `learn/battery.ts` | `runtime/host.ts` | WIRED | done |
| `learn/spectralFilter.ts`, `learn/mixer.ts`, `learn/spectralAttention.ts`, `learn/tiers.ts` | `test/b1-efit`, `test/g8-learning` | WIRED | execute tier probes in `host.learn()` |

## 5. Whole package

| Package | Verified consumers | Disposition | Action |
|---|---|---|---|
| `packages/field-kernel-core` | `trnn-core/measure/selfMeasure.ts` (live) + `test/d0` (offline auditor) | WIRED (partial) | `measureDrift`/`measureTemporalCoherence`/`measureInertia`/`lyapunovEnergy` now run live against the per-rung signature (Ω-10); `measureInformationDensity`/`measureBurden` remain offline (host-libm, audit-only) |

## 6. Harness modules (offline by design — labeled, not dormant)

`harness/golden.ts`, `abstention.ts`, `battery.ts`, `latency.ts`, `certify.ts` are the
certification harness and run offline. `harness/conformal.ts` is additionally WIRED into
the analysis service so reported estimates carry a conformal half-width (aligns code with
the BRAINMAP §info claim).

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
