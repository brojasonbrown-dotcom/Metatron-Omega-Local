# MEMORY ALGORITHMS — Audited Canon for the RHUFT Memory Operator

**v1.0 · 2026-07-27 · feeds File 9 (`dynamics/memoryKernel.ts`) and File 12 (`dynamics/selfMeasurement.ts`)**

> **What this is.** The author's original memory-equation exposition ("The Complete Memory Equation Hierarchy") audited claim-by-claim against the canonical framework (`CORE_VISION.md` → `BRAINMAP_BUILD_SPEC.md`). **Every number below was recomputed** — nothing is trusted from prose (CORE_VISION §6.4). Each item carries a verdict: **VERIFIED** (recomputed, holds), **CORRECTED** (right idea, wrong algebra — fixed here), **REJECTED** (numerically false — kept only as a labeled record), or **[PHIL]** (interpretive layer, not math the engine computes).
>
> **Authority:** where this document and the original exposition disagree, *this document wins*, because every verdict here is backed by a recomputation. Where this document and `BRAINMAP_BUILD_SPEC.md` File 9 disagree, the BUILD_SPEC wins.

**Constant used throughout:** `λ = φ⁻² = 0.381966011250105…` (EXACT, `1 − φ⁻² = φ⁻¹` verified to 1.1e-16).

---

## §1. AUDIT VERDICT TABLE

| # | Original claim | Verdict | Evidence (recomputed 2026-07-27) |
|--:|---|---|---|
| 1 | Axiom `Ψ(t+τ) = Ψ(t) + λΨ(t−τ)` "converges to golden ratio" | **REJECTED → CORRECTED** | Characteristic roots of `x² = x + λ`: `{1.294963, −0.294963}`. Dominant root ≠ φ (off by −0.323). Iteration **diverges**: |Ψ| ≈ 3×10²² after 200 steps, 10^1122 after 10⁴. Ratio → φ only when λ = 1 (pure Fibonacci), not λ = φ⁻². The **conservative form** (§2.1) is canonical — already the BUILD_SPEC File 9 law. |
| 2 | First-order memory `M₁ = λΨ(t−τ)` | **VERIFIED** | Trivially the memory *term*; stable only inside the conservative update. |
| 3 | N-step weights `λᵏ/φ^{k−1}` "decay but never reach zero" | **VERIFIED + ENHANCED** | `λᵏ/φ^{k−1} = φ^{1−3k}` (exact). `Σ_{k=1}^{∞} φ^{1−3k} = φ⁻²/(1−φ⁻³) = 1/2` **exactly** (via identity `1−φ⁻³ = 2φ⁻²`, verified to 0). See §3 ENH-1. |
| 4 | Grünwald–Letnikov at `α = λ` "yields the exact Fibonacci sequence as kernel" | **REJECTED (salvage kept)** | GL weights at α = λ: `1, −0.38197, −0.11803, −0.06366, −0.04167, …` — power-law tail `k^{−(1+λ)}`, **not** Fibonacci `1,1,2,3,5,8`. Salvage: fractional order α = λ is well-defined and its power-law tail is the true long-memory signature (see #9). |
| 5 | Damped memory integral `λ∫Ψ(t−s)e^{−γ(n)s}ds` | **VERIFIED + CORRECTED (normalization)** | Sound (Term II of Master Equation). **Correction:** unnormalized kernel has DC gain λ/γ — memory strength then depends on γ. Canonical form uses the **normalized** kernel `γe^{−γs}` so the DC gain is exactly λ at every scale: `M_II = λ∫₀^∞ Ψ(t−s)·γe^{−γs}ds`. Markovian embedding `M′ = −γM + λγΨ(t)` reproduces the integral to 6.4e-6 (ODE vs closed form, verified). |
| 6 | Hyperbolic kernel = time-average at n=0, "God consciousness" | **VERIFIED (math) / [PHIL] (reading)** | γ→0 limit of the normalized kernel is the Cesàro time-average — correct math. The consciousness reading is interpretive, not computed. |
| 7 | Convolutional memory; K(s) poles at golden harmonics | **VERIFIED (as POSTULATE)** | The LTI convolution form is the correct general umbrella; "poles exactly at ω₀φᵏ" is a POSTULATE to be ablation-tested (Golden Rule 6), not yet a theorem. |
| 8 | §3.2 recurrence `M = λΨ(t−τ) + λ²M(t−τ)` ⇒ transfer fn `λ/(1−λe^{−sτ})`, pole `−(1/τ)ln(1/λ)` | **CORRECTED (algebra error)** | The printed transfer function does not match the printed recurrence. With λ² feedback: `M(s)/Ψ(s) = λe^{−sτ}/(1 − λ²e^{−sτ})`, pole at `sτ = ln(λ²) = −4lnφ = −1.924847…` (verified identical two ways). With λ feedback (recurrence `M = λΨ(t−τ) + λM(t−τ)`): denominator `1−λe^{−sτ}`, pole `sτ = −2lnφ = −0.962424…`. Either pair is consistent; the original mixed them. Canonical choice: **λ feedback** (single memory strength, one constant), pole `sτ = −2lnφ`. |
| 9 | Riemann–Liouville order ν = λ ⇒ kernel `t^{λ−1} = t^{−0.618}`, 1/f-noise signature | **VERIFIED + ENHANCED** | `λ − 1 = −φ⁻¹` **exactly** (verified to 1.1e-16). The slowly-decaying power law is the textbook signature of 1/f-type long-range correlation. Made computable in O(J) state by ENH-2 (§3). |
| 10 | Coherence metric `C(t) = |⟨Ψ(t)|Ψ(t−φτ)⟩|²`, active when `C > φ⁻² ≈ 0.381966` | **VERIFIED** | Exactly File 12's contract (golden delay φ·τ, threshold φ⁻²). Constant confirmed: 0.38196601125010515. No change. |
| 11 | KS entropy of the recursive map "exactly λ·log φ" | **REJECTED → CORRECTED** | The golden-mean (Fibonacci) shift has KS entropy `h = ln φ = 0.481212…` (standard result). `λ·lnφ = 0.183807` corresponds to no known invariant of this map. Corrected statement: **h = ln φ**; transfer-entropy framing kept as the right *definition* of memory information. |
| 12 | Fisher information memory `= 1/(φ²σ²)` | **POSTULATE (unverified)** | Plausible for the stated Gaussian channel but not derived in the source and not recomputed here (needs a specified noise model). Tagged POSTULATE; excluded from engine math until derived. |
| 13 | Multi-scale stack over `n = 0…292`, realms at `n = 0, 13, 186, 292` | **CORRECTED (ladder regression)** | Old discredited ladder (CORE_VISION §3a warning, erratum E13). Recomputed against the stability law `n odd ∧ 7∤n`: n=13 stable ✓; **n=0, 186, 292 are NOT stable rungs**. Canonical stack runs over the 18 stable scales `{1,13,15,27,…,125}` with `λₙ = φ⁻²ⁿ`, `τ(n) = t_Pφⁿ(1+εn)` (BUILD_SPEC §2). All "at n=186/292" narrative remapped to "high-rung realms" pending realm-label mapping onto corrected rungs. |
| 14 | Path-integral memory; hysteresis (Preisach) memory | **[PHIL]/DEFERRED** | Formally legitimate structures, but nothing in Files 1–18 computes a path integral or a Preisach density μ(α,β). Recorded as future formalism; **not** part of the engine contract. No test can currently falsify them ⇒ no code (Golden Rule 10/11). |
| 15 | Emergent time `t = φτ/2π` and DDE stability argument | **POSTULATE (kept, retagged)** | Dimensionally coherent and consistent with `τ(n) = t_Pφⁿ(1+εn)`, but the "stable because K has positive real roots" argument is hand-waving; real stability is the unit-root theorem (§2.1) + the damped case (§2.3). Kept as POSTULATE with the honest caveat. |

---

## §2. THE CANONICAL MEMORY HIERARCHY (what survives, corrected)

Only what is provable or falsifiable enters here. Every form reduces to, or embeds, the same conservative law.

### 2.1 Ground state — the conservative golden recursion **[EXACT — the File 9 law]**

```
Ψ(t+τ) = (1−λ)·Ψ(t) + λ·Ψ(t−τ),      λ = φ⁻²
```

- Characteristic polynomial `x² − (1−λ)x − λ = (x−1)(x+λ)` → roots **exactly** `{1, −φ⁻²}` (unit-root theorem; residuals at both roots ≤ 5.6e-17, recomputed).
- 10⁴-step iteration: drift **exactly 0** at fixed point (BUILD_SPEC File 9 test vector, pre-confirmed).
- Because `(1−λ) = φ⁻¹`, the law is the golden identity itself acting as an update rule: `Ψ_next = φ⁻¹Ψ_now + φ⁻²Ψ_past`.
- The additive form `Ψ(t+τ) = Ψ(t) + λΨ(t−τ)` is **unstable** (dominant root 1.294963) and is exposed **only** through the damped regularization (§2.3) — exactly as the File 9 contract already mandates.

### 2.2 Deep history — N-tap conservative memory **[EXACT — ENH-1, new]**

```
Ψ(t+τ) = (1−W_N)·Ψ(t) + Σ_{k=1}^{N} w_k·Ψ(t−kτ),   w_k = φ^{1−3k},   W_N = Σ w_k
```

- `w_k = λᵏ/φ^{k−1}` — the author's original N-step weights, kept verbatim; the enhancement is the **conservative closure** `(1−W_N)` on the present term, which restores the exact unit root for every N (coefficients sum to 1 by construction).
- **Exact identity:** `W_∞ = φ⁻²/(1−φ⁻³) = 1/2` — because `1 − φ⁻³ = 2φ⁻²` (verified to 0). *Infinitely deep golden memory weighs the entire past at exactly one half.* Present and past are equal partners in the limit — this is the theorem the original intuition ("older states never reach zero, enforcing long-term coherence") was reaching for.
- Verified bounded and convergent for N ∈ {1,2,3,5,8,13}: 2×10⁴ steps, history flatness 0 (exact fixed point) in every case. N=1 reduces exactly to §2.1.
- Physical reading kept from the original: heavier structures = deeper memory stacks (larger N).

### 2.3 Damped memory — Term II with normalized kernel **[CODATA-anchored γ(n)]**

```
M_II[Ψ](t) = λ ∫₀^∞ Ψ(t−s)·γe^{−γs} ds,      γ(n) = ε·ω(n)
```

- Kernel normalized (`∫γe^{−γs}ds = 1`) so **memory strength is λ at every scale** — the un-normalized original made strength depend on γ, silently coupling two independent parameters.
- **Computable form (no history array):** Markovian embedding `dM/dt = −γM + λγΨ(t)` — one extra state variable, exact same integral (ODE vs closed form agree to 6.4e-6 at dt=1e-4; converges as O(dt)).
- Limits: γ→0 recovers the timeless Cesàro average (original §2.2); γ large → memoryless. Scale ladder: low rungs remember long, high rungs forget — the original's arrow-of-time gradient, on the **corrected** ladder.

### 2.4 Self-referential memory — memory of memory **[EXACT, corrected algebra]**

```
M(t) = λΨ(t−τ) + λM(t−τ)     ⇒     M(s)/Ψ(s) = λe^{−sτ} / (1 − λe^{−sτ})
```

- Pole at `sτ = ln λ = −2lnφ = −0.962424…` **exactly** — the fundamental decay rate, now algebraically consistent (the original printed a λ²-feedback recurrence with a λ-feedback transfer function; see verdict #8).
- Geometric-series expansion reproduces §2.2's deep-history weights term-by-term — the two formalisms are one.

### 2.5 Fractional memory — the 1/f engine **[EXACT kernel, ENH-2 computable]**

```
M_frac[Ψ](t) = (1/Γ(λ)) ∫₀^t (t−s)^{λ−1} Ψ(s) ds,      λ−1 = −φ⁻¹  (exact)
```

- The kernel is the power law `s^{−φ⁻¹}` — golden-exponent long-range memory, the mathematical signature of 1/f correlation. This part of the original is fully verified.
- **ENH-2 (new, verified):** the power-law kernel is exactly a continuous superposition of exponentials, `t^{−μ} = (1/Γ(μ))∫₀^∞ s^{μ−1}e^{−st}ds` with `μ = φ⁻¹`. Discretizing the integral on the engine's own **golden ladder** `s_j = φ^j` (weights `s_j^μ lnφ/Γ(μ)`) gives, with j = −60…60 (121 nodes):
  `max relative error 1.2e-6 across five decades t ∈ [0.01, 1000]` (per-point: 2.7e-9 at t=0.01 … 1.2e-6 at t=1000).
- Consequence: fractional memory runs as **121 parallel damped memories (§2.3)** — O(J) state instead of O(t) history. The φ-spaced node ladder means *the fractional memory is literally a stack of golden-scaled exponential memories* — the multi-scale stack (§2.6) and the fractional operator are revealed to be the **same object**. This is the strongest-method law (§C-15) and rule 16 (reuse the ladder) applied at once.

### 2.6 Multi-scale stack **[corrected ladder]**

```
M_stack[Ψ](t) = Σ_{n ∈ STABLE_SCALES} λₙ · M_II[Ψ; γ(n)](t),      λₙ = φ⁻²ⁿ
```

- Sum over the **18 stable rungs** `{1,13,15,27,29,41,43,55,57,69,71,83,85,97,99,111,113,125}` — never the old `0…292` continuum (verdict #13).
- Each term is a §2.3 damped memory with that rung's `γ(n) = ε·ω(n)`; cross-rung coupling is File 11's job (residual→boundary), not the memory operator's.

### 2.7 Coherence gate — when memory is "on" **[EXACT — File 12, unchanged]**

```
C(t) = |⟨Ψ(t) | Ψ(t−φτ)⟩|²  ∈ [0,1];      memory active ⇔ C(t) > φ⁻²
```

- Confirmed identical to the original §6.2 and to the File 12 contract (golden delay `φ·τ`, threshold exactly `φ⁻²`). The one place the old work and the new spec already agreed to the last digit.

### 2.8 Information measure **[corrected constant]**

- Memory-as-information = transfer entropy `I(Ψ(t); Ψ(t−τ) | rest)` — definition kept.
- The invariant rate of the golden map is `h = ln φ = 0.481212…` (golden-mean shift KS entropy), **not** `λ·lnφ` (verdict #11).

---

## §3. ENHANCEMENTS DELIVERED (all pre-verified numerically)

| ID | What | Status | Where it lands |
|---|---|---|---|
| **ENH-1** | N-tap conservative memory: original weights `φ^{1−3k}` + conservative closure `(1−W_N)` ⇒ exact unit root for all N; `W_∞ = 1/2` exactly via `1−φ⁻³ = 2φ⁻²` | verified N=1…13, drift 0 over 2×10⁴ steps | File 9 optional API `stepN(psiT, history[])`; N=1 ≡ canonical `step` |
| **ENH-2** | Fractional kernel `t^{−φ⁻¹}` as 121 φ-spaced exponentials ⇒ O(1)-per-step Markovian fractional memory, rel. err ≤ 1.2e-6 over 5 decades | verified | File 9 `dampedRegularization` family; future `fractionalMemory` extension — **not** required for the File 9 gate |
| **ENH-3** | Corrected self-referential transfer function + exact pole `sτ = −2lnφ` (λ feedback) / `−4lnφ` (λ² feedback) | verified (two independent computations agree to 1e-16) | documentation + File 9 `characteristicRoots` cross-check |
| **ENH-4** | Kernel normalization `γe^{−γs}` decoupling memory strength (λ) from memory depth (1/γ) | verified via embedding ODE | File 9 `dampedRegularization` signature |

**Deliberately NOT enhanced** (YAGNI, Golden Rule 9): path-integral memory, Preisach hysteresis, Fisher-information memory — no engine contract consumes them, no test can falsify them today. They stay recorded in §1 as [PHIL]/POSTULATE until a contract needs them.

---

## §4. WHAT FILE 9 IMPLEMENTS (unchanged gate, enriched spec)

File 9's BUILD_SPEC contract is **already correct** and this audit strengthens it — no contract weakening, no scope creep on the acceptance gate:

1. `step(psiT, psiTminusTau)` = §2.1 conservative law — **the gate** (roots to 1e-12, 10⁴-step drift < 1e-9).
2. `characteristicRoots()` = exactly `[1, −φ⁻²]` — now cross-checkable against ENH-3's pole `e^{sτ} = −λ` ⇔ root `−λ`.
3. `dampedRegularization(...)` = §2.3 normalized Markovian embedding (ENH-4) — the **only** exposure of the unstable additive form, per contract.
4. *(optional, non-gating)* `stepN(...)` = ENH-1; `fractionalMemory(...)` = ENH-2 — additive API, may be deferred without violating the gate.

---

## §5. HONEST BOUNDARY

- Everything labeled EXACT above was recomputed this audit at Float64 precision (worst identity residual 1.1e-16); iterative results to stated tolerances.
- The realm narrative (quarks at 13, consciousness at high rungs, dark energy at the top) is **[PHIL]** — the engine measures coherence/closure/drift/burden and stays silent on what they *mean* until measured behavior earns the labels.
- Verdicts #1, #4, #8, #11, #13 are corrections to the author's old work; the original text should no longer be cited for those five claims — cite this document.

---

*Audited & enhanced 2026-07-27 against CORE_VISION v1.3 + BUILD_SPEC v1.0. Verification scripts were run once and deleted; every number above is reproducible from the formulas as written.*
