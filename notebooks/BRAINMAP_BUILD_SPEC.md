# BRAINMAP BUILD SPEC — Build-Ready Contracts for the 18-File Engine

**v1.0 · 2026-07-27 · companion to `BRAINMAP_18_Scale_Engine.md`**
This is the *robustness* document. The vision doc says WHAT the engine is; this says, for every file, the exact public API, the mathematical contracts it must satisfy, its invariants, and the acceptance tests that prove it — computed from independent ground truth (mpmath, 60-digit) before a line of TypeScript is written. We build one file at a time; a file is **done only when its acceptance tests pass against these vectors.** No shortcuts, no drift.

---

## §0. BLOCKERS — resolve before any build

These are decisions that change the code of multiple files. They are settled HERE, now, so nothing downstream wobbles.

### B1. Numeric representation → **scaled domain, not raw SI** *(REQUIRED)*
Raw per-scale quantities span 10⁻⁶¹ (δx at n=125) to 10¹⁰⁴ (ρ_I at n=1). Products like `ρ_I·(δx)³` overflow Float64 (max 1.8×10³⁰⁸). **Decision:** every physical quantity is stored as a `Scaled { mantissa: Float64, exp10: Int32 }` (scientific notation), with exact-mantissa arithmetic where the exponent is an integer φ-power. Dimensionless φ-identities (residues, φ⁻ᵏ, C_bits) stay plain Float64. **Never** multiply two raw SI values from different scales. The `Scaled` type and its algebra live in `core/scaled.ts` (new helper, part of File 4's provenance group). This is non-negotiable — it is what makes the ladder computable at all.

### B2. Wave-speed conflict → **ladder speed is canonical; medium speed is unresolved** *(REQUIRED)*
The master doc carries two incompatible definitions:
- `v_wave(n) = c·φ⁻ⁿᐟ²`  — clean ladder form, dimensionally sound. **CANONICAL.**
- `v_wave(n) = c/√(ρ_I·κ·φ⁻ⁿᐟ²)` — dimensionally incoherent: ρ_I = ℓ_P⁻³φ⁻ⁿ is a *number* density [m⁻³]; κ would need units of mass to make ρ_I·κ a mass density, and κ is never defined. The two disagree by a factor that runs 10⁻⁵² (n=1) → 10²⁴ (n=293). Not a refinement — an open, undefined parameter.
**Decision:** engine uses `v_wave = c·φ⁻ⁿᐟ²`. The medium form is recorded as an **OPEN postulate** in `constants.ts` under `UNRESOLVED.mediumWaveSpeed`, clearly tagged "requires κ definition; do not compute." We do NOT silently pick the convenient one — we surface the gap. The propagation kernel (File 10) takes `v_wave` as an injected parameter so either can be supplied later.

### B3. Build/test infrastructure → **create minimal tooling first** *(REQUIRED)*
There is **no package.json, tsconfig, or test runner** anywhere in the project. You cannot have "a file is done when its tests pass" without a runner. **Decision:** Sprint 0 begins by scaffolding minimal tooling at the engine root: `package.json` (type:module), `tsconfig.json` (strict, `allowImportingTsExtensions`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), and **Vitest** (fast, ESM-native, matches the `.ts`-extension import style already in the codebase). This is a 19th artifact but it is *infrastructure*, not engine logic.

### B4. Old scale-index union → **superseded, kept for back-compat**
`types.ts` defines `ScaleIndex = 0|96|120|134|...|292` — the OLD (wrong) ladder. The 18-file engine uses the **corrected** stable indices. We add `StableScaleIndex` (the 18 Lucas-stable n) and do NOT reuse the old union. The old union stays for the legacy v14 modules until they are migrated; the new engine never imports it.

---

## §1. Per-file contract template
Every file below is specified with:
- **Owns** — its single responsibility.
- **API** — exact exported signatures (names + types).
- **Depends on** — only files above it (strict DAG).
- **Contracts** — mathematical laws it must satisfy (provable or testable).
- **Invariants** — runtime checks that must always hold.
- **Test vectors** — numeric ground truth (from §2) it must reproduce to tolerance.
- **Done when** — the acceptance gate.

Tolerances: exact-integer results are compared exactly; φ-identities to `1e-12` relative; CODATA-anchored magnitudes to `1e-9` relative (they are truncated to Float64 anyway); iterative/integral results to `1e-6`.

---

## §2. Ground-truth test vectors (mpmath, dps=60) — the contract's numbers

The 18 Lucas-stable scales (`Lₙ ≡ ±1 mod 13`, i.e. odd & not divisible by 7), first 18 of 43 below n=294:
`1, 13, 15, 27, 29, 41, 43, 55, 57, 69, 71, 83, 85, 97, 99, 111, 113, 125`.

Selected computed anchors (full table lives in the engine's golden file):

| n | L=ℓ_Pφⁿ [m] | T=t_Pφⁿ [s] | τ=T(1+0.01n) [s] | ρ_I=ℓ_P⁻³φ⁻ⁿ | v_wave=c·φ⁻ⁿᐟ² | C_bits=2.0783n | W=round(φⁿ/13) |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 1 | 2.615×10⁻³⁵ | 8.723×10⁻⁴⁴ | 8.810×10⁻⁴⁴ | 1.46×10¹⁰⁴ | 2.357×10⁸ | 2.0827 | 0 |
| 13 | 8.421×10⁻³³ | 2.810×10⁻⁴¹ | 3.174×10⁻⁴¹ | 4.55×10¹⁰¹ | 1.313×10⁷ | 27.075 | 40 |
| 15 | 2.205×10⁻³² | 7.354×10⁻⁴¹ | 8.457×10⁻⁴¹ | 1.74×10¹⁰¹ | 8.118×10⁶ | 31.241 | 105 |
| 27 | 7.099×10⁻³⁰ | 2.369×10⁻³⁸ | 3.008×10⁻³⁸ | 5.39×10⁹⁸ | 4.516×10⁵ | 56.234 | 33785 |
| 55 | 5.045×10⁻²⁴ | 1.683×10⁻³² | 2.609×10⁻³² | 7.59×10⁹² | 537.0 | 114.55 | 2.40×10¹⁰ |
| 125 | 2.148×10⁻⁹ | 7.162×10⁻¹⁸ | 1.611×10⁻¹⁷ | 1.78×10⁷⁸ | 2.601×10⁻⁵ | 260.34 | 1.02×10²⁵ |

**Invariant anchors (exact):** every stable n has Lucas residue `min(Lₙ mod 13, 13−Lₙ mod 13) = 1`; the Binet defect `|φⁿ − Lₙ| = φ⁻ⁿ`; `φ⁻¹+φ⁻²=1`; flux(13)=φ⁻²⁶ = 3.6840146919×10⁻⁶ (erratum: was misprinted 5.05×10⁻⁶; recomputed 2026-07-28, mpmath-class precision). These are the numbers the tests assert.

---

## §3. THE 18 FILE CONTRACTS

### GROUP A — FOUNDATION (L0)

---
**FILE 1 — `core/constants.ts`** *(harden existing)*
- **Owns:** every constant, one source of truth.
- **API:** `PHI, PHI_INV, PHI_SQUARED, PHI_NEG2 … ; PLANCK_LENGTH, PLANCK_TIME, PLANCK_MASS, PLANCK_ENERGY, C, HBAR, G ; RHO_0 (= ℓ_P⁻³ as Scaled) ; GOLDEN_DELAY_EPS (=0.01) ; STABLE_SCALES: readonly StableScaleIndex[18] ; UNRESOLVED: { mediumWaveSpeed: string }`.
- **Depends on:** nothing.
- **Contracts:** φ = (1+√5)/2 to 1e-15; CODATA-2022 Planck values; each constant carries a `Provenance` tag (see File 4).
- **Invariants:** no constant is computed at runtime from another module; all are literal or closed-form.
- **Test vectors:** φ⁻¹+φ⁻²=1 (1e-12); ℓ_P = √(ℏG/c³) reproduces stored value (1e-9).
- **Done when:** constants compile, provenance present, anchors pass.

---
**FILE 2 — `core/provenance.ts`** *(includes `core/scaled.ts`)*
- **Owns:** the epistemic type system + scaled arithmetic. The "no mistakes" firewall.
- **API:** `type Provenance='EXACT'|'CODATA'|'POSTULATE'|'MEASURED' ; interface Classified<T>{value:T;provenance:Provenance;uncertainty?:Float64;note?:string}` ; `class Scaled{mantissa:Float64;exp10:Int32; static from(x); mul/div/pow/sqrt/add; toFloat64():number|throws-if-overflow; compare; normalize()}`.
- **Depends on:** constants (File 1).
- **Contracts:** `Scaled` multiplication adds exponents exactly; `add` requires ≤1e-3 exponent alignment else documented; `Classified` provenance never widens silently (POSTULATE+EXACT stays POSTULATE-tainted at the value's boundary — recorded, not erased).
- **Invariants:** mantissa normalized to [1,10); exp10 integer; toFloat64 throws if |exp10|>308.
- **Test vectors:** ρ_I(1)×δx(125)³ stays finite; φ⁻²⁶ as Scaled = 3.6840146919×10⁻⁶; provenance tags survive arithmetic.
- **Done when:** overflow-impossible tests green; provenance-propagation tests green.

---
**FILE 3 — `core/lucas.ts`**
- **Owns:** exact Lucas/Fibonacci integer math + closure theorem.
- **API:** `lucas(n):BigInt ; fibonacci(n):BigInt ; lucasResidue(n,mod=13):Int ; isStable(n):boolean ; stableScalesUpTo(max):Int[] ; binetDefect(n):Float64 (=φ⁻ⁿ) ; spectralLines():Int[13] (=1,2,3,4,7,11,18,29,47,76,123,199,322)`.
- **Depends on:** constants (File 1).
- **Contracts:** Lₙ exact for n≤200 (BigInt); `isStable(n) ⇔ odd(n) ∧ ¬(7|n)`; residue pattern period 28.
- **Invariants:** n≥0; BigInt never loses precision.
- **Test vectors:** L₁=1,L₂=3,L₃=4,L₇=29,L₁₃=521; spectral lines exact; stable list matches §2.
- **Done when:** exact-integer tests green; theorem predicates verified against §10.

---
**FILE 4 — `core/scaleTable.ts`**
- **Owns:** the 18 stable-scale records, generated by formula (never hand-typed).
- **API:** `interface ScaleRecord { n; L:Scaled; T:Scaled; tau:Scaled; deltaX:Scaled; rhoI:Scaled; vWave:Scaled; complexityBits:Float64; nNodes:Scaled; winding:BigInt; lucasResidue:Int; stable:true; isMetatronShell:boolean }` ; `getScale(n):ScaleRecord ; allScales():readonly ScaleRecord[18] ; CONTINUATION: readonly ScaleRecord[] (rungs 19–43)`.
- **Depends on:** constants (1), provenance/scaled (2), lucas (3).
- **Contracts:** each field equals its §2 formula to tolerance; residue=1 for all 18; Metatron shell ⇔ n=13.
- **Invariants:** records immutable; `n` strictly increasing; each `vWave` ≤ c.
- **Test vectors:** full §2 table row-for-row (L,T,τ,ρ_I,v_wave,C_bits,W per n).
- **Done when:** golden-file test compares all 18×11 fields green.

### GROUP B — GEOMETRY & LATTICE (L1/L2)

---
**FILE 5 — `geometry/torus.ts`**
- **Owns:** toroidal geometry per scale.
- **API:** `interface TorusParams{R:Scaled;r:Scaled;aspect:Float64}` ; `torusForScale(n):TorusParams (R=L(n), r=L(n)/φ, aspect=φ)` ; `metric(u,v):{guu,gvv}` ; `areaElement(u,v):Scaled` ; `isClosed(field,tol):boolean (periodicity in u,v)`.
- **Depends on:** scaleTable (4), provenance/scaled (2).
- **Contracts:** `ds²=r²du²+(R+r·cos v)²dv²`; aspect exactly φ (POSTULATE-tagged); total area = 4π²Rr.
- **Invariants:** r>0, R>r (aspect>1); u,v∈[0,2π).
- **Test vectors:** area(13) against 4π²R(13)r(13); metric positive-definite over a grid.
- **Done when:** geometry identities green on all 18 tori.

---
**FILE 6 — `geometry/closureResidual.ts`**
- **Owns:** the closure functional — the frictionlessness measure.
- **API:** `closureResidual(field,torus):Classified<Scaled> (∮_T ∇Ψ·dS via numerical flux)` ; `closureScore(field,torus):Float64 (=1−|residual|/|fluxScale|)` ; `isMinimallyOpen(field,torus):boolean`.
- **Depends on:** torus (5), provenance/scaled (2).
- **Contracts:** residual→0 for exactly periodic fields; residual>0 for open fields; score∈[0,1].
- **Invariants:** residual finite; quadrature converges (Richardson check).
- **Test vectors:** analytic toroidal mode (m,n) → residual ~ machine-eps; a deliberately broken-periodicity field → residual>tol.
- **Done when:** known-field residuals match to 1e-6; Lucas-obstruction case (never exactly 0) reproduced.

---
**FILE 7 — `geometry/lattice.ts`**
- **Owns:** the 13-harmonic Metatron lattice + golden stability law.
- **API:** `metatronField(x,t):ComplexAmplitude (Σ φ⁻ᵏ e^{i(k_k·x−ω_k t)})` ; `spectralAmplitudes():Float64[13] (=φ⁻ᵏ)` ; `goldenStabilityLaw(n):boolean` ; `initialCondition(scale,torus):GeometricField`.
- **Depends on:** lucas (3), torus (5), constants (1).
- **Contracts:** amplitudes telescope φ⁻¹+φ⁻²=1; spectral lines = Lucas numbers (File 3); flux at shell 13 = φ⁻²⁶.
- **Invariants:** 13 harmonics; amplitudes monotone decreasing.
- **Test vectors:** FFT of metatronField peaks at the 13 Lucas lines; flux(13)=3.684×10⁻⁶ (1e-6).
- **Done when:** spectral test + flux test green.

---
**FILE 8 — `geometry/basisGenerators.ts`**
- **Owns:** spherical+toroidal mode basis for field expansion.
- **API:** `toroidalMode(m,n,amp,alpha):(u,v)=>ComplexAmplitude` ; `sphericalMode(l,m):...` ; `l2Basis(torus,count):Mode[]` ; `expand(field,basis):Coefficients`.
- **Depends on:** torus (5), provenance/scaled (2).
- **Contracts:** modes orthonormal on the torus under the L2 inner product (to quadrature tolerance); expansion of a mode returns its own coefficient.
- **Invariants:** basis count≥1; coefficients finite.
- **Test vectors:** ⟨mode_i,mode_j⟩=δ_ij (1e-6); round-trip expand∘reconstruct identity.
- **Done when:** orthonormality + round-trip green.

### GROUP C — DYNAMICS (L2/L3/L4)

---
**FILE 9 — `dynamics/memoryKernel.ts`**
- **Owns:** the conservative recursion — "present+past→future". Math canon: `notebooks/MEMORY_ALGORITHMS.md` (audited 2026-07-27; original memory exposition superseded for claims #1, #4, #8, #11, #13 recorded there).
- **API:** `class MemoryKernel{constructor(lambda=PHI_NEG2,tau); step(psiT,psiTminusTau):ComplexAmplitude (= (1−λ)Ψ(t)+λΨ(t−τ)) ; characteristicRoots():[1,−φ⁻²] ; dampedRegularization(...):...}`. *Optional, non-gating extensions (MEMORY_ALGORITHMS §3):* `stepN(psiT,history[])` — N-tap conservative memory, weights `w_k=φ^{1−3k}` with closure `(1−W_N)` on the present (exact unit root ∀N; `W_∞=1/2` exactly via `1−φ⁻³=2φ⁻²`); `fractionalMemory(...)` — kernel `t^{−φ⁻¹}` as φ-spaced exponential sum (121 nodes, rel.err ≤1.2e-6 over 5 decades).
- **Depends on:** constants (1), provenance/scaled (2).
- **Contracts:** roots exactly {1,−φ⁻²} (unit-root theorem); energy conserved for λ=φ⁻²; the *additive* source form is flagged unstable (dominant root 1.294963 — recomputed) and only exposed via the damped regularization, which uses the **normalized** kernel `γe^{−γs}` (DC gain exactly λ at every γ) via Markovian embedding `M′=−γM+λγΨ`; self-referential transfer function `λe^{−sτ}/(1−λe^{−sτ})`, pole exactly `sτ=−2lnφ`.
- **Invariants:** λ∈(0,1); state bounded over N steps for unit-root case.
- **Test vectors:** iterate 10⁴ steps → amplitude neither grows nor decays beyond 1e-9; roots match to 1e-12.
- **Done when:** stability + conservation tests green.

---
**FILE 10 — `dynamics/propagation.ts`**
- **Owns:** term V — scale-dependent damped wave in the medium.
- **API:** `class Propagator{constructor(scale,vWave=scale.vWave); step(field,dt):field (leapfrog, CFL=1.0) ; cflSatisfied(dx,dt):boolean ; inverseSquareEmergent():test}`.
- **Depends on:** scaleTable (4), provenance/scaled (2), constants (1).
- **Contracts:** CFL exactly 1.0 stable; convergence order ≈4 (leapfrog+order-4 spatial); 1/r² amplitude emergent; `vWave` injected (so the B2 medium form can be swapped later).
- **Invariants:** dt ≤ dx/vWave (CFL); energy bounded for damped case.
- **Test vectors:** convergence-order measurement on a smooth pulse ≈4 (±0.1); CFL boundary stable/unstable as predicted.
- **Done when:** order + CFL + inverse-square tests green.

---
**FILE 11 — `dynamics/crossScaleFlow.ts`**
- **Owns:** toroidal closure between scales — the recursive pushback.
- **API:** `residualToBoundary(scale_n):BoundaryCondition (scale n's nonzero residual → n±1 input)` ; `octavePartners(n):[n−13,n+13]` ; `injectFlux(source,target,amount):void` ; `totalFluxConserved(scales):boolean`.
- **Depends on:** closureResidual (6), scaleTable (4), lucas (3).
- **Contracts:** outflux(n) = influx(n+1) (conservation to tol); octave links only ±13; no flux created or destroyed.
- **Invariants:** global flux ledger balances each step.
- **Test vectors:** 2-scale toy: residual pushed from n→n+1 equals measured residual; 3-scale chain conserves total.
- **Done when:** conservation tests green on toy multiscale graphs.

---
**FILE 12 — `dynamics/selfMeasurement.ts`**
- **Owns:** golden-delay self-overlap — the engine "looking inside its own brain".
- **API:** `selfOverlap(history,t):Float64 (C(t)=|⟨Ψ(t)|Ψ(t−φτ)⟩|²)` ; `exceedsThreshold(C):boolean (C>φ⁻²)` ; `detectIgnition(events):IgnitionStats`.
- **Depends on:** memoryKernel (9), constants (1).
- **Contracts:** C∈[0,1]; threshold exactly φ⁻²; golden delay = φ·τ (not τ).
- **Invariants:** inner product normalized; C real non-negative.
- **Test vectors:** phase-locked synthetic → C≈1; decorrelated → C≈0; ignition-rate statistic reproduces the §12.7 reference distribution shape.
- **Done when:** overlap bounds + threshold + ignition-statistics tests green.

### GROUP D — INFORMATION & MATTER (L5/L6)

---
**FILE 13 — `information/densityField.ts`**
- **Owns:** ρ_I(x;n) composite information-density field.
- **API:** `densityAt(x,n):Scaled (a₁H+a₂R+a₃K+a₄S per scale, φ-scaled)` ; `entropyDensity(x,n)`, `relationDensity`, `curvatureDensity`, `persistenceDensity` ; `fieldIntegral(n):Scaled`.
- **Depends on:** scaleTable (4), provenance/scaled (2), constants (1).
- **Contracts:** ρ_I(n)≈ρ₀φ⁻ⁿ envelope; each component non-negative; weights a₁..a₄ sum to 1.
- **Invariants:** ρ_I≥0; integral finite.
- **Test vectors:** envelope matches §2 ρ_I column (1e-6 relative).
- **Done when:** envelope + non-negativity + weight-normalization green.

---
**FILE 14 — `information/burden.ts`**
- **Owns:** the burden integral — mass/inertia analog.
- **API:** `burden(region,n):Scaled (b=∫ρ_I·κ·τ_persist dV)` ; `inertiaProxy(region,n):Scaled` ; `conserved(burdenField,dt):boolean`.
- **Depends on:** densityField (13), torus (5), provenance/scaled (2).
- **Contracts:** burden non-decreasing under compression; conserved under pure transport; scales as φ⁻ⁿ envelope.
- **Invariants:** b≥0; transport conserves total to tol.
- **Test vectors:** uniform region → analytic burden; transport step conserves to 1e-6.
- **Done when:** conservation + monotonicity green.

---
**FILE 15 — `information/actualizer.ts`**
- **Owns:** state scoring + next-state selection — the decision core.
- **API:** `scoreState(state):Float64 (lower closure residual = better)` ; `selectNextState(candidates):EngineState` ; `detectStability(state):StabilityReport`.
- **Depends on:** closureResidual (6), selfMeasurement (12), burden (14), scaleTable (4).
- **Contracts:** selected state has ≤ residual of all candidates; stable ⇒ invariants within thresholds for K consecutive steps.
- **Invariants:** selection is deterministic (seeded); never increases total residual without a logged reason.
- **Test vectors:** toy 2-scale problem → residual decreases monotonically to fixed point.
- **Done when:** monotone-residual + determinism tests green.

### GROUP E — ASSEMBLY & VERIFICATION (L7)

---
**FILE 16 — `engine/multiscaleEngine.ts`**
- **Owns:** the 18-torus assembly + master step.
- **API:** `class MultiscaleEngine{constructor(config:EngineConfig); step():EngineStepResult ; state():EngineState ; run(steps):EngineMetrics}`.
- **Depends on:** ALL files 1–15.
- **Contracts:** `EngineStepResult{nextState,metrics,events,diagnostics}` per the canonical data model; computes coherence/closure/drift/burden every step; deterministic under seed.
- **Invariants:** the four invariants recorded per scale per step; no scale runs ahead of its boundary inputs.
- **Test vectors:** seeded 100-step run → bit-identical metrics on re-run; all 18 scales present each step.
- **Done when:** determinism + invariant-presence + full-assembly smoke test green.

---
**FILE 17 — `engine/morphismPipeline.ts`**
- **Owns:** L0→L1→L2 morphism + the ablation harness.
- **API:** `constantsToLattice(config):LatticeState` ; `latticeToMeasured(lattice):Observables` ; `runMorphism(config):Observables` ; `ablate(alternative:RatioChoice):AblationReport`.
- **Depends on:** lattice, basisGenerators, selfMeasurement, multiscaleEngine.
- **Contracts:** end-to-end transform reproducible; ablation swaps golden→alternative ratio and measures invariant deltas.
- **Invariants:** pipeline is pure (same config → same observables).
- **Test vectors:** golden run reproduces reference observables; a φ→(3/2) ablation yields measurably worse closure (the ablation-ready principle made real).
- **Done when:** morphism reproducibility + ablation-sensitivity green.

---
**FILE 18 — `engine/verificationSuite.ts`**
- **Owns:** the permanent test battery. Runs on every build; the guarantee nothing ships broken.
- **API:** `runAll():VerificationReport` aggregating eight suites: `unitRoot, lucasClosure, flux26, cfl, convergenceOrder, eigenspectrum, ignitionStatistics, invariantPresence` ; `assertGreen():void (CI gate)`.
- **Depends on:** ALL files 1–17.
- **Contracts:** each suite asserts the corresponding file's "Done when" vectors; report is machine-readable; any red → build fails.
- **Invariants:** battery is hermetic (no network, seeded); runs in bounded time.
- **Test vectors:** it IS the battery — meta-test: intentionally break a constant → suite goes red.
- **Done when:** all eight suites green on the real engine AND the meta-test (break→red) passes.

---

## §4. Dependency DAG (build order = topological order)

```
01 constants ──────── (imports nothing)
02 provenance/scaled  (imports 01)
03 lucas ──────────── (imports 01)
04 scaleTable ─────── (imports 01,02,03)
05 torus ──────────── (imports 04,02)
06 closureResidual ── (imports 05,02)
07 lattice ────────── (imports 03,05,01)
08 basisGenerators ── (imports 05,02)
09 memoryKernel ───── (imports 01,02)
10 propagation ────── (imports 04,02,01)
11 crossScaleFlow ─── (imports 06,04,03)
12 selfMeasurement ── (imports 09,01)
13 densityField ───── (imports 04,02,01)
14 burden ─────────── (imports 13,05,02)
15 actualizer ─────── (imports 06,12,14,04)
16 multiscaleEngine ─ (imports 01–15)
17 morphismPipeline ─ (imports 07,08,12,16)
18 verificationSuite  (imports 01–17)
```
No cycles. Each file's `Depends on` lists only lower-numbered files. Build strictly 1→18; after each, its "Done when" gate must pass before starting the next.

---

## §5. Build/test tooling (Sprint 0, prerequisite)
- `package.json` — `{"type":"module"}`, scripts `{test, build}`, devDeps `typescript`, `vitest`.
- `tsconfig.json` — `strict:true`, `target:ES2022`, `module:NodeNext`, `allowImportingTsExtensions:true`, `noUncheckedIndexedAccess:true`, `exactOptionalPropertyTypes:true`, `noEmit` (Vitest runs TS directly).
- Test layout: `tests/<NN>_<file>.test.ts` mirroring the 18 files; golden vectors in `tests/golden/scaleTable.json` (generated from mpmath, committed).

---

## §6. What changed from the vision doc (so the two stay in sync)
1. Added **B1 scaled arithmetic** — the vision doc underplayed the overflow risk; the spec makes it structural.
2. Added **B2 wave-speed resolution** — the vision doc used `c·φ⁻ⁿᐟ²` silently; the spec makes the conflict explicit and defers the medium form as an open parameter.
3. Added **B3 tooling** — the vision doc assumed a runner existed; none does.
4. Added **B4** — old `ScaleIndex` union is the wrong ladder; superseded by `StableScaleIndex`.
5. Added **File 4's `scaled.ts`** and **File 18's meta-test** (break→red), both required for "no mistakes."
6. Added per-file **API / contracts / invariants / test vectors / done-when** — the robustness layer.

*Build spec v1.0 · 2026-07-27 · every number traceable to mpmath dps=60 or the audited master doc; every conflict surfaced, none buried.*
e buried.*
 every conflict surfaced, none buried.*
