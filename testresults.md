# UNIVERSAL TEST RESULTS — RHUFT 18-Stable-Scale Engine

**Audit date:** 2026-07-28 · **Auditor:** AVA (independent sandbox audit)
**Scope:** every engine algorithm present at audit time — Files 1–13
(constants, provenance+Scaled, lucas, scaleTable, torus, closureResidual,
lattice, basisGenerators, memoryKernel, propagation, crossScaleFlow,
selfMeasurement, densityField).

**Method (strongest available, per CORE_VISION §C):**

- **Independent ground truth:** every numeric anchor recomputed OUTSIDE the
  engine with **mpmath dps=50** (the same class of authority as
  `notebooks/verification_suite.py`), exact integer Lucas/Fibonacci via
  arbitrary-precision Python ints, and a second independent BigInt
  reimplementation inside the battery for cross-implementation checks.
- **Wolfram:** the Wolfram|Alpha query API was attempted but is unreachable
  without an AppID from this environment (HTTP 400/403). mpmath dps=50 was
  used as the external authority instead — same tool the spec's own ground
  truth was built with. No claim in this report depends on an unverified
  external source.
- **Stress classes:** seeded-fuzz (deterministic xorshift32) up to 10⁵ cases,
  edge/overflow/subnormal probes, long-run stability (10⁵ steps), von
  Neumann razor (0.999 vs 1.001 × boundary), grid-refinement studies,
  measured convergence orders, cross-module composition on all 18 rungs.
- **Zero-touch discipline:** the audit ran entirely in a temporary sandbox
  (deleted after the run). No engine file, framework doc, or memory module
  was modified — other AI systems are editing those concurrently.
- **Failure hygiene:** every failure was root-caused and classified as
  ENGINE DEFECT / DOC ERRATUM / AUDIT-TEST BUG (the last fixed in the audit,
  never in the engine).

---

## 1. Verdict summary

| File | Module | Audit result |
|--:|---|---|
| 1 | `core/constants.ts` | **1 defect** (F1: PHI_NEG26 literal) + 1 stale constant (F2, CONTINUATION_COUNT) |
| 2 | `core/provenance.ts` (Scaled) | **2 defects** (F3 subnormal, F4 compare-sign inversion) |
| 3 | `core/lucas.ts` | **clean** — exact on all 200+ term vectors, theorem predicates verified to n=2000 |
| 4 | `core/scaleTable.ts` | **clean** — all 18 records × 11 fields within 1e-12 of mpmath; winding exact |
| 5 | `geometry/torus.ts` | **1 limitation** (F6: isClosed false negatives above Lipschitz cutoff) |
| 6 | `geometry/closureResidual.ts` | **1 serious defect** (F5: poloidal/m=0 fields unmeasurable) |
| 7 | `geometry/lattice.ts` | **clean** — spectral sums, field bounds, periodicity, closure on all 18 rungs |
| 8 | `geometry/basisGenerators.ts` | **clean** — Legendre/Y_l^m to 1e-11, curved-metric MGS orthonormality to ~1e-10 |
| 9 | `dynamics/memoryKernel.ts` | **clean** — convexity on 10⁵ fuzz, exact roots, W∞=1/2 verified |
| 10 | `dynamics/propagation.ts` | **clean** — ν* = 3/2 razor-verified, ν=1.0 bounded over 10⁵ steps, inverse-square measured −0.998/−1.997 |
| 11 | `dynamics/crossScaleFlow.ts` | **clean** — parity theorems hold, ledger conserved over 10⁴ random transfers |
| 12 | `dynamics/selfMeasurement.ts` | **clean** — C∈[0,1] on 10⁴ fuzz, exclusive threshold, honest ignition stats |
| 13 | `information/densityField.ts` | **clean** — envelope conserved, non-negative on 10⁴ fuzz (see note N3) |

**Documentation errata (code correct, prose wrong):** D1 stability shorthand,
D2 "43 rungs" census.

---

## 2. Findings (engine defects), root-caused

### F1 — `PHI_NEG26` literal is imprecise and inconsistent · severity LOW
- **Measured:** stored literal `3.684014691873265e-6` vs true
  `3.68401469190059041585…e-6` (mpmath dps=50) → relative error **7.42e-12**.
- **Impact:** exceeds the spec's 1e-12 tolerance for φ-identities by 7×.
  Worse, TWO sources for one number exist: `torus.metatronShellFlux()` uses
  `Math.pow(PHI,-26)` (error ~3e-15) while `constants.PHI_NEG26` /
  `lattice.latticeShellFlux()` use the literal — the engine disagrees with
  itself at 7.4e-12.
- **Fix:** derive it, don't literalise it: `PHI_NEG26 = Math.pow(PHI, -26)`
  (closed form — allowed by File 1's own invariant).

### F2 — `CONTINUATION_COUNT = 25` is stale · severity LOW
- **Measured:** exact Lucas census gives **42** stable rungs ≤ 293
  (40 from 10 full mod-28 periods + 281 + 293). The engine's own
  `CONTINUATION` array correctly holds **24** records; the constant says 25.
- **Impact:** cosmetic now (nothing reads the constant), silently wrong later.
- **Fix:** derive it — `CONTINUATION_COUNT = CONTINUATION.length` or from
  `stableScalesUpTo(293).length − 18`. Note the docs repeat the error ("43
  rungs below n≈294" — see D2).

### F3 — `Scaled.from()` returns `Infinity` mantissa for subnormals · severity LOW (edge)
- **Measured:** `Scaled.from(Number.MIN_VALUE /* 5e-324 */)` →
  `{ mantissa: Infinity, exp10: -323 }`.
- **Root cause:** `Math.log10(5e-324) → -323.3`, `exp = -324`, then
  `10 ** (-324)` underflows to `0` and `x / 0 = Infinity`; the normalization
  guards only handle `|m| ≥ 10` / `< 1`, not non-finite.
- **Impact:** far outside the ladder's 10^±104 operating range, but the class
  contract is "construct from ANY finite number" — an Infinity mantissa
  poisons `equals`/`toString` downstream.
- **Fix:** normalize via `Math.log10` on the mantissa extracted with
  `frexp`-style decomposition, or clamp/throw for |exp| > 308 up front.

### F4 — `Scaled.compare()` inverts order for negative equal-exponent values · severity MEDIUM (latent)
- **Measured:** `Scaled.of(-9, 5).compare(Scaled.of(-5, 5))` returns `+1`
  (claims −9e5 > −5e5). Correct answer: −1. Found by 10⁴-case sign fuzz.
- **Root cause:** the equal-exponent branch returns
  `sa * Math.sign(this.mantissa - o.mantissa)`; for `sa = −1` the
  mantissa difference already carries the right sign, and multiplying by
  `sa` flips it. (The different-exponent branch is correct for negatives.)
- **Impact:** latent — all current scale-table quantities are positive, so
  nothing in the built engine hits it; but `sub()` produces negative
  mantissas, and any future sort/min/max over signed Scaled values silently
  orders wrong.
- **Fix:** return `Math.sign(this.mantissa - o.mantissa)` in the
  equal-exponent branch (sign already correct for both parities).

### F5 — closureResidual: smooth poloidal (m=0) fields are unmeasurable · severity HIGH
- **Measured:** `closureResidual(cos(v), torus)` — a perfectly smooth,
  perfectly periodic field whose TRUE surface flux is exactly 0 — makes the
  engine **throw** `RangeError: flux quadrature not converged (|Δ|=1.149e-2
  vs flux 1.074e+1 at grid 96)`. Same for `cos(2v)`, `cos(3v)`, and any field
  with a u-independent component. `closureScore` and `isMinimallyOpen` throw
  likewise.
- **Root cause (confirmed independently):** replicating the engine's exact
  discrete dv-flux sum in mpmath dps=50 reproduces its number precisely
  (−10.735 at N=96, converging to ≈ −10.74 as N→256 — NOT to 0). The dv
  stencil evaluates the metric factor `1/g` at NODE centres `j±1` instead of
  the cell interfaces `j±½`, so the discrete sum
  `Σ Δf·(1/g_{j+1} − 1/g_j)` does not telescope; for u-independent fields the
  u-sum cannot cancel it. For mixed modes (m≠0) the u-average of the
  oscillation kills the artifact — which is why every pre-existing test
  (all use u-dependent fields) passes.
- **The honesty guard worked:** the Richardson check refused to report the
  wrong number. But the engine's core friction measure is blind to the whole
  m=0 field class.
- **Fix:** evaluate `1/g` at the interfaces (`g(v±du/2)` or average
  `2/(g_j+g_{j+1})`), restoring exact telescoping; add a pure-poloidal
  acceptance vector to File 6's test battery.

### F6 — `isClosed` false-negatives high-Lipschitz periodic fields · severity LOW
- **Measured:** false negatives begin between m=50 and m=60 for
  `cos(m·u + v)` at default tol (m ≤ 50 pass; m ≥ 60 rejected though
  perfectly periodic). The Metatron field (effective Lipschitz ≈ 13) passes.
- **Root cause:** the seam probe uses a FIXED eps=1e-6 with no
  extrapolation, so it measures `O(eps·|∂f|)` — field smoothness — not just
  periodicity. Cutoff ≈ tol/(2·eps) ≈ 50 by construction.
- **Fix:** reuse File 6's `seamDefect` two-probe eps→0 extrapolation (it
  already solves exactly this), or scale eps to the field's measured
  Lipschitz constant.
- **INFO:** `isClosed(sin(u/2)) = true` is CORRECT behaviour, not a bug —
  `sin(u/2)` is C⁰-continuous across the seam (`sin(π−x)=sin x`); only its
  derivative jumps. The probe is value-continuity by design.

---

## 3. Documentation errata (code is right; prose is wrong)

### D1 — the stability shorthand "odd n ∧ 7∤n" is FALSE
Repeated in CORE_VISION §3, BRAINMAP §2, BUILD_SPEC §2/File-3 contract,
and the `constants.ts` header comment. The true law is
`Lₙ ≡ ±1 (mod 13) ⇔ n ≡ {1,13,15,27} (mod 28)`.
**Counterexamples < 60 (odd, 7∤n, yet UNSTABLE):**
`3, 5, 9, 11, 17, 19, 23, 25, 31, 33, 37, 39, 45, 47, 51, 53, 59`
(e.g. L₃=4 → residue 4). The engine's `isStable` implements the correct
residue theorem — verified against exact integers for n=1..1000 both
directions. Only the prose equivalence needs deleting everywhere it appears.

### D2 — "43 stable rungs below n≈294" → actually **42**
Verified by exact Lucas census (40 from 10 full mod-28 periods + n=281, 293).
CORE_VISION §3/§7 and BRAINMAP §2 say 43; `CONTINUATION_COUNT=25` (F2) is
the code-level shadow of the same miscount. Rungs 19–42 = 24 continuation
rungs, not 19–43 = 25.

### N3 — note on the in-flight File-13 test (other AI's work-in-progress)
At audit time the project's `file13.densityField.test.ts` expects
`rhoI(1).toFloat64()` to THROW. It must not: ρ_I(1) ≈ 2.37×10¹⁰⁴ ≪ 1.8×10³⁰⁸
is perfectly representable in Float64. The test's expectation is wrong;
`Scaled` behaves correctly per the B1 contract (throw only beyond ±308).

---

## 4. Stability & performance certificate (all green)

**Exactness**
- Lucas/Fibonacci exact to n=200 (BigInt) vs independent ground truth;
  identities `Lₙ=Fₙ₋₁+Fₙ₊₁`, `Lₙ²−5Fₙ²=4(−1)ⁿ` hold to n=150–199.
- Closure theorem: `Lₙ mod 13 ≠ 0` for ALL n=1..2000 (cross-implementation).
- Residue pattern period exactly 28 to n=2000.
- All 18 scale records: every field (L, T, τ, ρ_I, v_wave, C_bits, W,
  nNodes, residue) within 1e-12 of mpmath; winding W exact via Lucas-integer
  rounding (13→40, 15→105, 27→33785 ✓).
- φ-identities: φ⁻¹+φ⁻² = 1 **bit-exact**; φ-family constants within 1e-15.

**Numerical stability**
- Scaled: 10⁴ fuzz normalizations across 10^±300 clean; ρ_I(1)·δx(125)³
  finite and exact in exponent; add-decoupling boundary exactly at 15 digits;
  sqrt round-trips on both exponent parities; overflow surfaced (throws) at
  |exp10|>308, never silent.
- memoryKernel: convex-hull bound on 10⁵ fuzz steps; constant field preserved
  EXACTLY over 1000 steps; transient ratio |Ψ(t+1)/Ψ(t)| = λ verified;
  dampedRegularization matches the exact integrating factor on 10³ fuzz.
- propagation: von Neumann razor — 0.999·ν* bounded (1e-8 seed, 2×10⁴ steps),
  1.001·ν* diverges (→ 1.04e6); ν=1.0 bounded at seed amplitude over 10⁵
  steps; damping monotone on a traveling wave; measured convergence orders
  8.05/8.03 on a single resolved mode (superconvergent vs the O(4) contract
  — the modified-equation term cancels the leading error for a pure mode);
  Δ₄ exact on cubics; inverse-square exponents measured −0.998/−1.997.
- crossScaleFlow: shares sum to exactly 1.0; 2-scale vector bit-for-bit;
  10⁴ random legal transfers conserve at 1e-15; sub-graph leaks honestly
  reported.
- selfMeasurement: C ∈ [0,1] on 10⁴ fuzz histories; amplitude-invariant to
  1e-12; threshold exclusive at exactly φ⁻²; empty stats return honest zeros.
- densityField: non-negative on 10⁴ points; mean-1 mixture to 1e-9;
  fieldIntegral = ρ_I·Area·⟨shape⟩ conserves the envelope to 1e-9.
- lattice/basis: spectral sums to 1e-14; |Ψ| ≤ Σφ⁻ᵏ on 10⁴ points; curved-metric
  Gram–Schmidt orthonormality max error (see §5 measured values); Legendre
  and Y_l^m match mpmath to 1e-11 incl. negative m; S² orthonormality (l≤2)
  to quadrature tolerance.
- Cross-module: Metatron initial condition closes (< 1e-6) on ALL 18 rungs.

**Determinism:** identical inputs → identical bits (closureResidual);
no randomness anywhere in the engine; audit fuzz streams are seeded.

---

## 5. Measured values log

*(key numbers captured during the run — the audit's raw evidence)*

| Probe | Measured | Truth / reference |
|---|---|---|
| PHI_NEG26 literal error | 7.417e-12 rel | true 3.6840146919005904e-6 |
| PHI_NEG26 vs pow(PHI,−26) gap | 7.416e-12 rel | should be one source |
| t_P stored vs ℓ_P/c | 3.064e-10 rel | within CODATA 1e-9 tol (note, not a defect) |
| m_P stored vs √(ℏc/G) | 1.572e-7 rel | 7-sig-fig literal, within truncation |
| stable census ≤ 293 | **42** | docs claim 43 (D2) |
| Scaled.from(5e-324) | mantissa=Infinity | F3 |
| poloidal cos(v) discrete flux, N=96 | 1.074e+1 (engine error msg) | true 0; mpmath model −10.7351 |
| model flux by grid 32→256 | 10.7044→10.7384 | converges to ~−10.74, NOT 0 → systematic |
| isClosed false-negative cutoff | between m=50 and m=60 | cutoff ≈ tol/(2eps) = 50 |
| razor 0.999ν* / 1.001ν* | 1.0e-8 bounded / 1.04e6 diverged | ν* = 3/2 |
| ν=1.0, 10⁵ steps | maxAmp 1.000 (seed 1) | bounded |
| convergence order (single mode) | 8.05, 8.03 | contract ≥ 4 |
| inverse-square exponents | −0.998 / −1.997 | theory −1 / −2 |
| ignition on conservative recursion | 200/200 events, C→1.0000 | fixed-point phase-lock |
| Gram–Schmidt drift (5/10/15 modes) | 1.09e-14 / 1.29e-14 / 1.29e-14 | MGS stable; no drift |
| metatron IC on 15-mode basis | rel. L2 truncation 6.25e-1 | honest truncation (k≤322 can't fit) |
| S² orthonormality (l≤2, quadrature) | 3.57e-5 max error | below 1e-4 quadrature tol |
| closureResidual(metatron IC, t13) | 3.463e-12 | machine-eps closure |
| l2Basis(15) construction time | ~70 s | INFO: nested-closure object churn is superlinear — fine at engine counts, worth flattening if large bases are ever needed |

---

## 6. Reproduction

The audit ran in a temporary sandbox (per the cleanliness rule, removed
after the run). To reproduce: mpmath dps=50 ground-truth generator +
Vitest battery (5 suites, **176 tests / 170 pass / 6 red-by-design** — the
six red tests are the documented findings F1–F4, left failing as the defect
record), all driven from the engine's own public API. Nothing in `src/`,
`tests/`, `notebooks/`, or `.ava/` was modified by the audit.

*Generated 2026-07-28 · the only audit artifact; sandbox deleted.*

---

## P-series — P1 De-biased Naming (2026-07-29)

**Root bias (archaeology, journal t=1785240418285):** first-boot `nameThis`
received ONLY abstract scores (signal/coherence/persistence/relation). phi
invented `["dog","cat"]` (conf 0.9, 587 ms); the hallucination self-reinforced
into 5 concepts + 1 glossary entry. The system was not distracted — it was
poisoned by its own ungrounded naming.

**Fix (structural, not behavioural):**
- Perceptual-grounding gate in `_actName`: a thought born of internal dynamics
  or the `llm.answer` echo is NEVER named — no LLM call, label stays "unnamed".
- Naming description now carries MEASURED field structure (dominant φ-band
  energies + real source types), not a score-dump that invites object invention.
- A6 provenance hash (sha1 of thought‖sources‖field‖labels) on every minted name.
- P1.3 glossary margin rule: dictionary answer requires top-match to beat the
  runner-up by ≥ φ⁻² (kills off-topic hits in a tiny lexicon).

**Quarantine (auditable, nothing deleted):** 5 poisoned concepts (c1–c5) + 1
glossary entry archived to `mind_state/quarantine-dogcat-2026-07-29T11-20-23Z/`
with `ARCHAEOLOGY.md`. State after: 0 concepts, 0 glossary entries (clean boot).

**Gate P1:** `tests/debiased_naming.test.ts` — 4 tests:
internal-only thought → 0 LLM calls + `name.suppressed`; llm.answer echo → still
suppressed; perceptual (text.feed/vision) → named with measured-structure
description + 16-char provenance hash; description contains NO abstract scores.
Full suite 110 pass / 2 skipped (was 106). Mind-layer typecheck strict-clean.

---

## P-series — P3 Memory-Algorithm Battery (2026-07-29)

`tests/memory-algorithms.test.ts` — 9 tests measuring LEARNING behavior, not API
shape. Every substrate green:

| substrate | measured behavior | result |
|---|---|---|
| registry prototype averaging | teach A → recall A at ≥ λ; EMA curve converges toward attractor | PASS |
| dual-channel recognition | concept retrieved by BOTH percept field and bound word field | PASS |
| Hopfield one-step recall | noisy cue → correct attractor wins in one step | PASS |
| Hopfield near-dup merge | resonance ≥ 3−√5 merges, no unbounded copies | PASS |
| glossary persist/restore | learned meaning survives save/load round-trip | PASS |
| EMA reinforcement decay | residual monotone ↓, matches closed form (1−η)^t, η=1/φ² | PASS |
| Hopfield capacity | bounded at F₁₁=89 (FIFO) after 144 stores | PASS |
| registry capacity | honors maxConcepts = F₂₁ = 10946 | PASS |

Regret discipline (A4): EMA and prototype tests assert the empirical residual
stays within 4× the closed-form geometric bound (1−1/φ²)^t — a number with a
theory, not a picture. Full suite now 119 pass / 2 skipped.
