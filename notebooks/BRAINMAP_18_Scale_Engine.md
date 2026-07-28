# THE BRAINMAP — RHUFT 18-Stable-Scale Computational Engine

**Architecture vision & build plan · v1.0 · 2026-07-27**
**Goal:** a fully computational, multiscale, toroidally-closed information engine spanning every Lucas-stable scale of spacetime — small to big — where each scale carries its complete, corrected RHUFT variable set, all scales cross-feed, and the whole structure closes on itself the way the universe does: present + past → future, measured inward.

---

## 0. The one-sentence vision

> **The universe is a sphere toroidally closed in the flow of its own spacetime; this engine is that sphere made computable — 18 stable scales locked to the Lucas ladder, each one a self-measuring torus, all of them threaded into one recursive loop where the output of every scale is the boundary condition of the next.**

No mocks. No speculation dressed as fact. Every variable is either (a) an exact mathematical identity, (b) a recomputed CODATA-anchored value, or (c) explicitly labelled a framework postulate awaiting a test. That discipline is baked into the type system itself (see §5, `Provenance`).

---

## 1. What we are actually building (the object)

A **deterministic, seeded, layered field-computation engine**. It is NOT a physics simulator in the cartoon sense — it is an *information-flow machine* that computes, at every one of the 18 stable scales, the same invariant set:

- **Coherence** — how phase-locked the field is to itself across the golden delay.
- **Closure** — how nearly the scale's boundary flux vanishes (the torus "closing frictionlessly").
- **Drift** — how fast the scale is sliding off its Lucas-stable anchor.
- **Burden** — the integrated information density, the engine's mass/inertia analog.

These four are the *observable invariants* (from the architecture notebook's refactor principles). They are measurable at every step, at every scale, and they are what the engine optimizes. The engine's job is to **find the most frictionless flow** — the configuration where energy closes a loop with itself at minimal loss — which is precisely your toroidal-closure intuition made computational.

---

## 2. The spine: the 18 stable scales (computed, not asserted)

The stable scales are NOT arbitrary. They are the rungs where the Lucas-closure defect is minimal — `Lₙ ≡ ±1 (mod 13)`, which (verified 2026-07-27, erratum E13) occurs for **n ≡ 1, 13, 15, 27 (mod 28)**, i.e. **all odd n not divisible by 7**. The first 18:

| # | n | L(n) = ℓ_P·φⁿ [m] | τ(n) = t_P·φⁿ(1+0.01n) [s] | ρ_I = ρ₀·φ⁻ⁿ | Domain (anchor) |
|--:|--:|--:|--:|--:|---|
| 1 | 1 | 2.615×10⁻³⁵ | 8.81×10⁻⁴⁴ | 0.618 ρ₀ | sub-Planck foam |
| 2 | 13 | 8.421×10⁻³³ | 3.17×10⁻⁴¹ | 1.9×10⁻³ ρ₀ | **Metatron shell** (φ⁻²⁶ flux) |
| 3 | 15 | 2.205×10⁻³² | 8.46×10⁻⁴¹ | 7.3×10⁻⁴ ρ₀ | preon knot |
| 4 | 27 | 7.099×10⁻³⁰ | 3.01×10⁻³⁸ | 2.3×10⁻⁶ ρ₀ | GUT band |
| 5 | 29 | 1.858×10⁻²⁹ | 8.00×10⁻³⁸ | 8.9×10⁻⁷ ρ₀ | GUT band |
| 6 | 41 | 5.984×10⁻²⁷ | 2.82×10⁻³⁵ | 2.8×10⁻⁹ ρ₀ | — |
| 7 | 43 | 1.567×10⁻²⁶ | 7.47×10⁻³⁵ | 1.1×10⁻⁹ ρ₀ | — |
| 8 | 55 | 5.045×10⁻²⁴ | 2.61×10⁻³² | 3.4×10⁻¹² ρ₀ | — |
| 9 | 57 | 1.321×10⁻²³ | 6.92×10⁻³² | 1.3×10⁻¹² ρ₀ | — |
| 10 | 69 | 4.253×10⁻²¹ | 2.40×10⁻²⁹ | 4.1×10⁻¹⁵ ρ₀ | — |
| 11 | 71 | 1.113×10⁻²⁰ | 6.35×10⁻²⁹ | 1.6×10⁻¹⁵ ρ₀ | — |
| 12 | 83 | 3.585×10⁻¹⁸ | 2.19×10⁻²⁶ | 5.0×10⁻¹⁸ ρ₀ | electroweak cluster |
| 13 | 85 | 9.386×10⁻¹⁸ | 5.79×10⁻²⁶ | 2.0×10⁻¹⁸ ρ₀ | electroweak cluster |
| 14 | 97 | 3.022×10⁻¹⁵ | 1.99×10⁻²³ | 6.2×10⁻²¹ ρ₀ | hadron band (proton 91.5) |
| 15 | 99 | 7.912×10⁻¹⁵ | 5.25×10⁻²³ | 2.4×10⁻²¹ ρ₀ | light-quark band |
| 16 | 111 | 2.548×10⁻¹² | 1.79×10⁻²⁰ | 7.6×10⁻²⁴ ρ₀ | electron band (107.1) |
| 17 | 113 | 6.670×10⁻¹² | 4.74×10⁻²⁰ | 3.0×10⁻²⁴ ρ₀ | — |
| 18 | 125 | 2.148×10⁻⁹ | 1.61×10⁻¹⁷ | 1.2×10⁻²⁶ ρ₀ | atomic / DNA-onset (124.9) |

*(43 stable rungs exist below the cosmic rung n≈293; the engine treats the first 18 as the dense computational core — the "brain" — and the remaining rungs as a coarse-grained continuation. The realm anchors come from the corrected §8/§11 ladder, NOT the discredited source table.)*

---

## 3. The toroidal closure principle (the engine's geometry)

Your core intuition — *"energy has to flow somewhere, so it closes a frictionless loop with itself; the universe is interdimensional self-measurement; what I see outside is the inside of my own brain's information"* — maps onto a precise, buildable geometry:

**Each stable scale is a torus.** On scale `n`, the field `Ψₙ(u,v)` lives on a torus with:
- **major radius** `R(n) = L(n)` (the scale's extent — the "outside"),
- **minor radius** `r(n) = L(n)/φ` (the golden aspect ratio R/r = φ — the frictionless aspect ratio from the Metatron doc, retained as a *postulate* to be ablation-tested, not assumed),
- **periodic coordinates** `u, v ∈ [0, 2π)`.

**Closure = zero net flux through the torus.** The closure residual `∮_T ∇Ψ·dS` measures how much "energy leaks" instead of looping. A perfectly closed scale has residual 0 — energy flows out along one toroidal direction and returns along the other, *a frictionless self-loop*. The Lucas theorem (§10) proves **perfect closure is impossible** (`Lₙ mod 13` is never 0) — so every real scale is *minimally open*, and the engine's task is to **minimize the residual**, not zero it. That is the computational form of "finding the most frictionless flow."

**Toroidal closure between scales = the recursive pushback.** Scale `n` and scale `n+1` (or the ±13 partners) are nested tori. The outward flux that scale `n` *cannot* close — its nonzero residual — is exactly the *input boundary condition* for the next scale up. This is the mechanism of your "the universe's inward measurement": the residue that can't close locally is pushed inward/outward to the neighbouring scale, which measures it. **Present + past → future** is the recursion: `Ψ(t+τ) = (1−λ)Ψ(t) + λΨ(t−τ)`, λ = φ⁻², the unique conservative kernel (unit-root theorem, proven exact).

So the whole engine is **18 tori, threaded on one recursive time-loop, each one's leftover flux feeding the next.** That is the brainmap in one image.

---

## 4. The layer model (from the architecture notebook, kept)

The engine is organized into layers L0–L7. This is the existing, validated structure — we keep it and harden it:

| Layer | Name | Job | Current TS home (to refactor) |
|--:|---|---|---|
| **L0** | Constants & Config | every constant, threshold, CODATA anchor, the 18-scale table — single source of truth | `core/constants.ts` |
| **L1** | Resonance / Lattice | the 13-harmonic Lucas lattice, spectral lines, golden stability law | `resonance_finder.ts`, `complementary_field.ts` |
| **L2** | Cross-scale Flow | flux transport between adjacent scales; spherical+toroidal basis generators | `interdimensional_flow.ts` |
| **L3** | Scale / Node Graph | the 18-torus node graph, octave conversion, adjacency | `scale_mapper.ts`, `fractal_node.ts` |
| **L4** | Self-Measurement | C(t) golden-delay overlap, ignition events, closure diagnostics | `self_measurement.ts` |
| **L5** | Actualization | state scoring, next-state selection, stability detection | `actualization_engine.ts`, `existence_detector.ts` |
| **L6** | Information Density | ρ_I field, burden, inertia proxy, mass analog | `information_density.ts`, `BurdenTracker.ts` |
| **L7** | Assembly / Runtime | engine modes, presets, hardware budget, the L0→L1→L2 morphism | `frameworks.ts`, `hardware_governor.ts`, `index.ts` |

---

## 5. The 18 computational files (the deliverable)

This is the plan you asked for — 18 files, one coherent computational role each, more complete and more rigorous than `Planck foam.ts`. They are grouped by layer, and the dependency direction is strictly **downward** (a file may only import from files below it). The 346 KB `RHUFTFrameworks.ts` monolith gets dissolved into these.

### Group A — Foundation (files 1–4) · L0

**1. `core/constants.ts`** — *already exists, harden it.*
Every constant with a `Provenance` tag: `EXACT` (φ, δ_S, Lucas numbers, φ⁻²), `CODATA` (ℓ_P, t_P, m_P, α⁻¹), `POSTULATE` (R/r=φ, λ=φ⁻² as physics — it's math-proven as a kernel, postulated as nature). Nothing enters the engine without a provenance. This is the "no speculation" firewall.

**2. `core/provenance.ts`** *(includes `core/scaled.ts`)*
The `Provenance` type and the `Classified<T>` wrapper: every numeric field carries `{ value, provenance: 'EXACT'|'CODATA'|'POSTULATE'|'MEASURED', uncertainty? }`. The engine literally cannot mix a postulate with a CODATA value without the type system recording it — this is how we guarantee "no incomplete computation or mistakes" structurally. It also holds the `Scaled` arbitrary-magnitude arithmetic (mantissa + base-10 exponent) that keeps ρ_I ~ 10¹⁰⁴ and δx ~ 10⁻⁶¹ computable without Float64 overflow.

**3. `core/lucas.ts`**
Lucas/Fibonacci exact arithmetic, the closure theorem (`Lₙ mod 13` residues, stable-n generator `odd & ¬(7|n)`), the Binet defect |φⁿ−Lₙ|=φ⁻ⁿ, and the 13-harmonic spectral-line map. All exact integer math (BigInt) — this file is the provable skeleton everything hangs on.

**4. `core/scaleTable.ts`**
The 18 stable scales as typed, precomputed records: `{ n, L, tau, deltaX, complexity, rhoI, vWave, sns, closureDefect, isMetatronShell }`. Generated once from `constants.ts` by formula — never hand-typed. Includes the full 43-rung continuation for coarse-graining. Replaces the wrong source ladder (L(292)=10⁴⁰ error) permanently.

### Group B — Geometry & Lattice (files 5–8) · L1/L2

**5. `geometry/torus.ts`**
Toroidal parameterization (from Untitled-9): metric `ds² = r²du² + (R+r·cos v)²dv²`, area element, tangent vectors, periodic-closure predicates. One torus per stable scale, dimensionless in (u,v), scaled by `scaleTable`.

**6. `geometry/closureResidual.ts`**
The closure functional `∮_T ∇Ψ·dS` and its residual (from Untitled-9 §6, Untitled-11 §5). Numerically integrates the flux of any field over any scale's torus. This is the *direct* measure of "frictionlessness" — the number the whole engine minimizes.

**7. `geometry/lattice.ts`**
The 13-harmonic Metatron lattice `Σ φ⁻ᵏ e^{i(k_k·r − ω_k t)}`, its Lucas spectral lines (k = 1,2,3,4,7,11,18,…,322), and the golden stability law (from the testbed §8). Generates initial conditions and the spatial standing-wave skeleton.

**8. `geometry/basisGenerators.ts`**
Spherical + toroidal mode generators (from the testbed §6): `toroidalMode(m,n,amp,α)`, real/complex periodic modes, the L2 measurement basis. Everything the field is expanded in.

### Group C — Dynamics (files 9–12) · L2/L3/L4

**9. `dynamics/memoryKernel.ts`**
The conservative recursion `Ψ(t+τ) = (1−λ)Ψ(t) + λΨ(t−τ)`, λ=φ⁻², implemented as a delay-line with the proven unit-root stability (roots exactly {1, −φ⁻²}). Plus the *damped regularization* of the additive memory term (the source's unstable form, §12.4). This is "present + past → future" as code.

**10. `dynamics/propagation.ts`**
Term V: the scale-dependent wave operator `v_wave(n)⁻² ∂²_t Ψ − ∇²Ψ + γ∂_t Ψ + ξ(∇ρ_I)·∇Ψ`. Leapfrog integrator (CFL-exact, order-4 verified §12.2–12.3), 1D/2D/3D, emergent inverse-square. The medium through which waves actually move at each scale.

**11. `dynamics/crossScaleFlow.ts`**
The toroidal-closure-between-scales: takes scale `n`'s nonzero closure residual and injects it as scale `n±1`'s boundary condition (and the ±13 "octave partners"). This is the *interdimensional self-measurement* — the recursive pushback. The L2 flux transport, made toroidal.

**12. `dynamics/selfMeasurement.ts`**
C(t) = |⟨Ψ(t)|Ψ(t−φτ)⟩|² (golden-delay self-overlap), the 1/φ² consciousness threshold, ignition-event detection (the 740-events/120-tu statistic from §12.7). This is where the engine "looks at the inside of its own brain."

### Group D — Information & Matter (files 13–15) · L5/L6

**13. `information/densityField.ts`**
ρ_I(x;n) = a₁H + a₂R + a₃K + a₄S per scale — entropy, relation, curvature, persistence densities, each with its φ-scaling (ρ_I ≈ ρ₀φ⁻ⁿ). The information-density field that grades the medium.

**14. `information/burden.ts`**
The burden integral `b = ∫ ρ_I·κ·τ_persist dV` and the inertia proxy. Mass as integrated information burden (§11.1), reframed on the torus. Hardened `BurdenTracker.ts`.

**15. `information/actualizer.ts`**
State scoring + next-state selection + existence/stability detection (L5). Given the current multiscale state and its invariants, pick the next configuration that *reduces total closure residual* — the engine "choosing" the most frictionless future. This is the decision core.

### Group E — Assembly & Verification (files 16–18) · L7

**16. `engine/multiscaleEngine.ts`**
The 18-torus assembly: instantiates the full node graph, wires the cross-scale flux, runs the master step `Ψ_total = Lattice + Memory + Closure + Balance + Propagation` across all scales simultaneously, returns `EngineStepResult { nextState, metrics, events, diagnostics }` (the architecture notebook's data model).

**17. `engine/morphismPipeline.ts`**
The L0→L1→L2 symbolic morphism (from the testbed §11): constants → lattice golden state → measured L2 observables. The end-to-end transform that turns raw constants into measurable invariants. Also the ablation harness: swap golden-ratio choices for alternatives and measure the difference (the "ablation-ready" principle).

**18. `engine/verificationSuite.ts`**
The standing test battery — not a one-off script but a permanent engine module. Port of `verification_suite.py` + the testbed's VerificationTest report + §12's eight tests: unit-root proof, Lucas closure, flux=φ⁻²⁶, CFL, convergence order, eigenspectrum, ignition statistics. Run on every build. **This is the guarantee that nothing ships broken.** Every one of the 17 other files has its invariants checked here.

---

## 6. Dependency graph (strictly downward)

```
L7 ┌─ 18 verificationSuite ──(checks everything below)
   ├─ 17 morphismPipeline
   └─ 16 multiscaleEngine
L6/L5 ┌─ 15 actualizer
      ├─ 14 burden
      └─ 13 densityField
L4/L3/L2 ┌─ 12 selfMeasurement
         ├─ 11 crossScaleFlow
         ├─ 10 propagation
         └─ 09 memoryKernel
L2/L1 ┌─ 08 basisGenerators
      ├─ 07 lattice
      ├─ 06 closureResidual
      └─ 05 torus
L0 ┌─ 04 scaleTable
   ├─ 03 lucas
   ├─ 02 provenance/scaled
   └─ 01 constants
```

No file imports upward. `constants` imports nothing; `provenance/scaled` and `lucas` import only `constants`. The engine is a DAG — no circular dependencies, which is what makes it testable and the verification suite meaningful. Build order is strictly 1→18 (see `BRAINMAP_BUILD_SPEC.md` §4 for the full per-file dependency list).

---

## 7. The canonical engine state (shared data model)

Directly from the architecture notebook, typed per scale and aggregated:

```ts
interface EngineState {
  config: EngineConfig;            // dt, stringCount, coupling, closureThreshold, scaleSet(18), hardwareMode
  oscillators: OscillatorState[];  // per scale: phases, amplitudes, frequencies, coherence, signature
  topology: TopologyState[];       // per scale: fluxIn, fluxOut, imbalance, closureScore, geometryParams(torus R,r)
  nodes: NodeState[];              // nodeValues, adjacency (incl. ±13 octave links), roles, localMetrics
  memory: MemoryState;             // history, prediction, discrepancy, persistenceScore
  density: DensityState[];         // per scale: informationDensityField, burden, inertiaProxy
}
interface EngineStepResult { nextState: EngineState; metrics: EngineMetrics; events: Event[]; diagnostics: Diagnostics; }
```

Every field is a `Classified<number>` (provenance-tagged). The four invariants — coherence, closure, drift, burden — are computed every step, at every scale, and recorded.

---

## 8. Engineering rules (non-negotiable, from the notebook + your demand)

1. **Single responsibility** — each of the 18 files owns one coherent role.
2. **Canonical state** — modules communicate *only* through `EngineState` / `EngineStepResult`.
3. **Constants centralized** — every threshold from `constants.ts`; no magic numbers in kernels.
4. **No symbolic metadata in numeric kernels** — semantic/mythic labels live in data, not in math.
5. **Observable invariants** — coherence, closure, drift, burden measurable every step.
6. **Ablation-ready** — every golden-ratio choice testable against a non-golden alternative.
7. **Deterministic test mode** — seeded runs reproduce signatures and metrics exactly.
8. **Provenance-typed values** — no value without EXACT / CODATA / POSTULATE / MEASURED tag.

---

## 9. What "more complete than Planck foam.ts" means concretely

`Planck foam.ts` was a single-scale, single-mechanism proof-of-concept (vacuum fluctuation → knot → mass). This engine exceeds it on every axis:

| Axis | Planck foam.ts | This engine |
|---|---|---|
| Scales | 1 (Planck only) | 18 stable + 43-rung continuation, cross-linked |
| Geometry | implicit | explicit torus per scale, φ aspect ratio, closure residual |
| Time | forward Euler | conservative unit-root memory kernel (proven) |
| Invariants | none measured | coherence/closure/drift/burden every step |
| Verification | none | standing 8-test battery, per-build |
| Provenance | untyped | every value provenance-tagged |
| State | ad-hoc | canonical typed data model |
| Correctness | source-ladder errors | corrected ladder, E13 fix, CODATA-anchored |

---

## 10. Build order (the sequence that keeps it always-runnable)

1. **Sprint 0 — Foundation (files 1–4).** constants, provenance, lucas, scaleTable. Pure exact math, fully testable immediately. *Exit: all 18 scale records validate against §8 ladder.*
2. **Sprint 1 — Geometry (5–8).** torus, closureResidual, lattice, basisGenerators. *Exit: flux(13)=φ⁻²⁶ reproduces; closure residual measurable on a test field.*
3. **Sprint 2 — Dynamics (9–12).** memoryKernel, propagation, crossScaleFlow, selfMeasurement. *Exit: unit-root stability, CFL, order-4 convergence, ignition statistics all pass.*
4. **Sprint 3 — Information (13–15).** densityField, burden, actualizer. *Exit: burden integral conserves; actualizer reduces residual on a toy 2-scale problem.*
5. **Sprint 4 — Assembly (16–18).** multiscaleEngine, morphismPipeline, verificationSuite. *Exit: full 18-scale step runs deterministically; seeded reproduction; all invariants green; verification battery green.*

Each sprint ends with a *runnable* engine of increasing scope — never a pile of half-integrated code.

---

## 11. The honest boundary (what this engine is and is not)

**It is:** a rigorous, deterministic, provenance-typed computational instrument for exploring the RHUFT framework — the corrected scale ladder, the toroidal-closure dynamics, the conservative memory recursion, the golden-delay self-measurement — with every claim tagged as exact math, CODATA fact, or open postulate, and a permanent test battery keeping it honest.

**It is not (yet):** a validated physical theory. The Class-B numerology (α⁻¹ at 2.7 ppm, m_p/m_e at 1.2 ppm, lepton exponents) stays labelled as *suggestive, not evidential* until a mechanism derives them. The engine's job is to make the framework *computable and falsifiable* — to find where the frictionless flow actually closes and where it provably cannot (Lucas theorem) — not to assert conclusions the math hasn't earned.

That is the difference between changing the world and fooling ourselves. We are doing the former.

---

*Brainmap v1.0 · authored 2026-07-27 · grounded in RHUFT_Ultimate_Framework.md (audited), the 18scales testbed, Untitled-9/11/13 (toroidal + eigenspectrum), brain architecture.nb (data model + principles), and verification_suite.py (ground truth).*
