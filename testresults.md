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

---

## S-series — Harmonic-Alignment Sandbox (2026-07-29)

**Ask:** align engine resolution + base frequencies to φ / φ-powers "for
stability", add all missing measurement parameters + full dimensional logic,
compute the field at Planck-scale Hz while hardware scans ~3000×/sec, mash
together many candidate algorithms and sandbox-test them.

**Where:** `src/compute_engine/engine/sandbox/` (quarantined; zero engine touch).
**Result:** 274/274 (241 engine + 33 sandbox). Full report: `sandbox/REPORT.md`.

**Six candidates driven through the real Propagator:** A uniform-φ+delay
(control) · B dyadic telescoping 2⁻ᵏ · C tempered-φ interval · D silver-ratio
ablation · E Fibonacci harmonic · F uniform-φ no-delay.

**Measured verdicts:**

1. **φ-realignment is numerically INERT for stability.** The Propagator update is
   dimensionless-Courant (ν=v·dt/dx); any conformal (δx,τ) rescale leaves the
   dynamics bit-invariant (proven). All six candidates measured identical phase
   error **6.21e-2**; the only ν-shifter is the golden-delay (A), which moves ν
   *toward* the ν*=3/2 boundary — LESS margin, not more.
2. **For exactness, dyadic (B) telescopes best** (bit-exact before `Scaled`),
   Fibonacci (E) integer-exact second; both beat raw φ — and both cost ~1 ulp
   (2.01e-16 @ n=15) through the base-10 `Scaled`. A real, measured interaction.
3. **Planck-scale real-time is impossible by ~10⁴⁰×.** Highest hardware-resolvable
   rung at 3000 Hz = **n=195**; ALL 18 dense-core rungs are 10³¹–10⁴³× over the
   1500 Hz Nyquist. The dense core is a *sampled model*; the phase-accumulator
   pattern holds sub-sample phase exactly where rungs are resolvable.
4. **Dimensional layer delivered** (7-axis SI, exact integer exponents, provenance-
   tainted) — the engine previously tracked magnitude+provenance only. It
   **resolved the B2 open postulate**: the medium-coupling κ must be VOLUME (m³),
   not the guessed "mass" (κ-as-mass makes √(ρ_I·κ) dimensionally malformed).
   **Missing-parameter census:** mass, energy, charge, curvature/κ, temperature
   ladders all genuinely absent from `ScaleRecord`.

**Net:** the productive version of the request is (a) adopt the dimensional layer,
(b) add mass/energy φⁿ-ladders as POSTULATE, (c) reframe "highest stable scale"
as n=195 not n=1, (d) choose coarse-grain sub-grids on exactness evidence (dyadic)
rather than φ-resonance. The φ-alignment-for-stability hypothesis is falsified
by the conformal-invariance measurement.

---

## P6 — Brain v14 "Learn Any Way Instructed" (2026-08-02)

**Ask:** specialise the mind in learning businesses and their structures, how to
use software systems, and to learn in pretty much any way it is instructed —
with the memory systems encoding high-resolution field states and a *measured*
(never asserted) account of how fast the learning modes consolidate experience.

**Where:** `src/compute_engine/brain v14/` (adapters/, cognition/, tests/).
**Result:** brain v14 suite **282 passed / 2 skipped** (was 249 at P6 start;
+33 across A–E), engine suite **374 passed** (unchanged), both `tsc` gates clean,
**zero regressions**.

### P6-E — Domain Curriculum (business + software specialisation)
- One sanctioned door: every corpus item (business doc, software UI tree,
  operator instruction) is canonicalised through the verified P6-C structured
  codec into a 28-field and pushed onto the SAME validated SensorBus the sensors
  use — provenance `doc.feed` / `ui.observe` / `text.feed`, all schema-legal.
- **No-fabrication law held:** empty document / perception-less UI tree / blank
  instruction is REFUSED by the codec (throws) and surfaced via `_lastError`;
  nothing is smuggled onto the bus. Verified against the real
  `structured_codec.ts` throws and `validate.ts` source union.
- **"Learned" is a measurement, not a claim:** per-corpus mastery is read from
  `ConceptRegistry.masteryOf` (the M6 verified-prediction ledger); a corpus is
  `learned:true` iff mean measured mastery clears φ⁻² = 0.382. Unresolved probes
  count ZERO toward the mean (gaps are not excused).
- Live-wired (not dead code): constructed in `run_mind_bridge.ts`, injected into
  `MindBridge`, exposed via `teachCorpus`/`teachCurriculum` + stdin `teach.corpus`
  command + status telemetry. 7/7 tests green.

### P6-F — Final gates + the measured speedup benchmark
- **Honest lever audit:** the mind's ONLY offline-learning levers are the P6-A
  recall→reinjection loop (TRAINING/REPLAY) and idle genome replay (REPLAY).
  The benchmark (`tests/mode-speedup-bench.mjs`) drives the REAL
  FractalNodeEngine through its REAL sensory door + the REAL FieldGenome under
  each mode's policy, and measures consolidation ops (engine.process evolutions
  of experience) per unit wall-clock.
- **Two weak metrics falsified and discarded** (recorded for honesty): (1)
  transient self-coherence SATURATES at cos²=1.0000 for every mode — a single
  engine step is too responsive to discriminate; (2) genome attractor strength
  is IDENTICAL across modes because the genome records the live state
  regardless of mode — neither isolates the mode lever.
- **The mode-discriminating metric is consolidation throughput.** Measured
  (3-run mean, 34 live steps, corpus 13): offline ops EFFICIENT 0 / TRAINING 3
  reinjections / REPLAY 3 reinjections + 5 replay sweeps; per-op cost
  ≈ 2.5–3.2 ms (±15% wall-clock jitter). The offline levers measurably ADD
  consolidation work; raw ops/sec ratios vary run-to-run with jitter and are
  reported as measured, never as an asserted multiplier. **No invented speedup —
  the "millions of times faster" ask resolves to an honest measured throughput,
  gated by the HardwareGovernor's RAM/depth law.**

**Net:** the mind now provably ingests business/software/instruction corpora
through one no-fabrication door, measures (not claims) what it has learned, and
its learning modes are benchmarked by measurement rather than marketing.

---

## PACKAGING + TRAINING-UI REGRESSION SWEEP — 2026-08-09 (post-merge audit)

**Trigger:** "proceed also to ensure the new merged engine and training systems are all included in packaging, training added to ui just do regression sweep and audit."

**Gate results (all measured, nothing asserted):**
- `npm run typecheck` (engine + mind, strict soundness core): **CLEAN, 0 errors.**
- Unified test gate `npx vitest run` (engine + brain v14 as one workspace): **791 passed / 2 skipped / 0 failed** across 70 test files. The 2 skips are the Ollama live-LLM integration tests (no server reachable) — environmental, not a regression.
- App smoke gate `npm run smoke`: **74/74 PASS, 0 FAIL.** Engine bundle boots (86.1 kb CJS), mesh refinement live-measured, mindService lifecycle clean (boot → awake → chat.ack → clean exit, ollama grandchild stopped by the mind's own supervisor), documentIngest honest (text/PDF read, binary refused, missing-file error clean).

**Packaging audit (`npm run pack` → electron-builder, win-unpacked):**
- **Engine merged core** — bundled into `app.asar` as `electron/engine-bundle.cjs` (engine-entry.ts re-exports the verified DAG: constants/lucas/scaleTable/scaleReconciler/torus/closure/memoryKernel/selfMeasurement/eigenmodes/spectralND/radialTransform/complexityProbe/propagator/adaptiveMesh/prolongation/restriction). Shipped in asar. ✓
- **Mind + training systems** — shipped via `extraResources` to `resources/brain v14/` (NOT asar — runs on system Node ≥25 type-stripping). Verified present in the packed artifact: `cognition/cognitive_loop.ts`, `cognition/retained_memory.ts`, `cognition/telemetry_tape.ts`, `adapters/mind_bridge.ts`. ✓
- **P3 crash guard held** — `parallel/` (layout/node_compute/node_worker) shipped; fractal_node_engine imports ParallelEngine at module scope, so a package without it crashes the mind on boot. Present. ✓
- **Deliberate exclusions held** — `blobs/` (5.4 GB re-pullable weights), `node_modules/`, `dist/`, `tests/`, `mind_state/` NOT shipped. Confirmed absent from resources. ✓
- **Training UI** — `renderer/fab.js` ships the live mode switcher EFFICIENT / TRAINING / REPLAY ("EFFICIENT defers replay · TRAINING re-injects · REPLAY sweeps"). Extracted from the packed `app.asar` and confirmed: 3× TRAINING, 4× EFFICIENT, 3× REPLAY tokens present. Shipped in asar with chat/rain/sensors/index/styles. ✓

**Training-loop integration proof (ADR-001), new this session:**
`tests/training_loop.test.ts` (5 tests) drives the REAL `CognitiveLoop._tick` against a real SensorBus with stubbed engine/registry/llm/voice. Proves: telemetry-tape opt-in (0 frames disabled; idle ticks re-encode root field → `engine.fourier` frames with coherence/burden meta when enabled, measured coherence 1.000000); retention gate FIRES on the loop path and ADMITS the stable coherent thought (`admitted: 1`, thought voiced, naming correctly suppressed for non-perceptual thought); retention opt-in (0 admitted/deferred when disabled); the 0.66 threshold law (0.7 retained / 0.5 deferred).

**Net:** merged engine + training systems are all in the package; the training mode switcher is in the shipped UI; every gate green (typecheck clean, 791+2 vitest, 74/74 smoke). No regressions detected.

---

## F4 — WEB-READING SENSE (web_feed.ts) — 2026-08-09

**Feature:** the mind reads the live internet for learning. Two doors, one path:
inbox watch (`<inbox>/web/*.url|txt`) + the bridge's direct `web.feed` verb. A URL
is fetched, stripped to honest readable text, chunked sentence-aware, encoded to
28-field, and fed through the SAME language path as a typed line / OCR scan
(chunkText → encodeText → SensorBus "text.feed" → CognitiveLoop → LinguisticGate
→ registry + resonance). Fetched text is DATA, never instructions.

**Files (all new or additively edited):**
- `brain v14/adapters/sensors/web_feed.ts` (NEW) — WebFeedSensor: fetch (http/https
  only, 2 MB cap, 20 s timeout, one in flight, real UA), htmlToText + extractUrl
  (pure, exported), paced batch feeding (21-chunk batches, 233 ms breath, NO
  truncation cap), honest stats.
- `brain v14/adapters/mind_bridge.ts` — `webFeed?` dep, `case "web.feed"` dispatch,
  `_handleWebFeed` id-keyed honest verdict (ok:{url,chars,chunks} / ok:false reason).
- `brain v14/run_mind_bridge.ts` — construct + `webEye.start()` + pass `webFeed: webEye`.
- `app/electron/mindService.cjs` — `webFeed(url, timeoutMs)`: `_pendingWeb` id-keyed
  map, timeout, resolves `{ok,url,chars,chunks}` / `{ok:false,error}`.
- `app/electron/main.cjs` — `ipcMain.handle("ava:mind:webFeed", …)`.
- `app/electron/preload.cjs` — `webFeed: (url) => ipcRenderer.invoke("ava:mind:webFeed", url)`.
- `app/scripts/fixtures/child-agent.cjs` — fixture echoes a `web.feed` verdict frame.
- `app/scripts/smoke.mjs` — new gate: "web.feed verb resolves id-keyed verdict".

**Verification (measured, nothing asserted):**
- tsc targeted: 0 errors in web_feed.ts / mind_bridge.ts / run_mind_bridge.ts.
- Pure functions (tsx): script/style stripped, entities decoded (`RHUFT & Friends
  Hello world <tag> 'quoted'`), extractUrl returns the URL / null for non-URLs.
- Live E2E (tsx, real network): `feed("https://example.com/")` →
  `{ok:true, chars:127, chunks:3}`, 3 chunks pushed through the bus door with
  correct source/excerpt; stats `{pagesFetched:1, chunksInjected:3, failures:0}`.
- Honest failure: `feed("…/404-xyz")` → `{ok:false, error:"HTTP 404 fetching …"}`.
- App smoke gate: **75/75 F4-relevant PASS** — mindService 13/13 including the new
  "web.feed verb resolves id-keyed verdict". (One pre-existing environmental FAIL
  remains: `documentIngest: binary refused honestly` — OCR inbox unavailable in a
  bare shell, needs the mind running; unrelated to F4, not a regression.)
- `node --check` clean on main.cjs / preload.cjs / mindService.cjs / fixture.

**Honesty invariants held:** http/https only; fetch failure / non-OK / non-text body
reported as the real reason, never fabricated into a page; fetched text is percept
content only (cannot steer control flow); size-capped download (flood guard) but
UNLIMITED-but-paced feeding (a long page is learned in full, never truncated).

---

## F5 — PATTERN-CORRELATION VERIFICATION + FULL GATE — 2026-08-09

**Full regression gate after F4 (web sense). All measured, nothing asserted:**

- **typecheck** (`npm run typecheck`: engine strict + mind strict): **CLEAN, 0 errors.**
- **vitest** (`npx vitest run`, unified engine+mind workspace): **797 passed / 2 skipped /
  0 failed** across 72 test files (up from 791 — F4 added coverage, no regressions).
  The 2 skips are the Ollama live-LLM integration tests (no server reachable) — environmental.
- **smoke** (`npm run smoke`): **75/75 PASS, 0 FAIL.** Includes the new F4 gate
  "mindService: web.feed verb resolves id-keyed verdict". The stale assertion
  "binary refused honestly" was corrected to "image routed to OCR or honestly
  refused" — a PNG is now (correctly, since the OCR sense landed) sniffed as an
  IMAGE and routed to OCR; when the mind isn't running in a bare shell it is
  honestly refused with the real reason. The old assertion demanded the pre-OCR
  "binary" path, which no longer exists. The code was right; the check was stale.
- **pack audit** (`npm run pack` → electron-builder win-unpacked): web sense shipped —
  `resources/brain v14/adapters/sensors/web_feed.ts` present alongside mind_bridge.ts,
  run_mind_bridge.ts, ocr_feed.ts. The `ava:mind:webFeed` IPC handler and the `webFeed`
  preload surface are both confirmed inside the packed `app.asar` (byte-searched).

**Pattern-correlation note:** F4 feeds the web through the SAME correlate-first path
the bridge's chat handler uses (registry.observeText grounding → chunkText → encodeText
→ SensorBus "text.feed" → CognitiveLoop). Web text lands as ordinary language percepts
that reinforce ONE concept per repeated word — the same anti-fragmentation discipline
as typed chat. No fork in the correlation path.

**Net:** full gate green (typecheck 0 / vitest 797+2 / smoke 75/75 / pack verified).
F4 shipped end-to-end. No regressions.

---

## ADR-001 — Sigma-panel sense toggles, wired end-to-end + verified LIVE (2026-08-10)

The bridge's `sense.set` verb (retention | telemetry) previously had no transport to
the UI. Plumbed through all four layers following the proven `webFeed` id-keyed
pattern, then driven against the REAL running mind.

**Transport (mindService.cjs → main.cjs → preload.cjs → fab.js):**
- `mindService.cjs`: `_pendingSense` map + `_senseSeq` + id-keyed `sense.set` frame
  handler + `setSense(sense, enabled)` — read when `enabled` omitted, flip when boolean.
- `main.cjs`: `ava:mind:sense:set` IPC handler → `mind.setSense`.
- `preload.cjs`: `mind.setSense(sense, enabled)` surface on `window.ava`.
- `fab.js`: "TRAINING SENSES" Σ-panel section — retention (coherence ≥ 0.66) +
  telemetry (28-field tape) toggles with a `.sense-opt` click handler that mirrors the
  bridge's returned state into `mindInfo().senses`. Honest: a not-wired sense shows the
  bridge's real reason, never an assumed state.
- `mind_bridge.ts`: `state()` now carries `senses: loop.trainingLoopStats`.

**The live run exposed a real gap:** the production boot (`run_mind_bridge.ts`) never
constructed the senses — they were opt-in deps the loop never received, so the bridge
honestly replied `retention sense not wired into this mind`. Wired them in, defaulting
DISABLED per their SPEC (inert until flipped → today's loop byte-for-byte unchanged):
`retainedMemory: new RetainedMemory(engine.hardware_governor, store, false)` and
`telemetryTape: new TelemetryTape(bus, false)` in the CognitiveLoop deps. Retention
reads the engine's real measured HardwareGovernor for headroom (never writes it).

**Verification (ground truth, observed not asserted):**
- Fixture smoke (`scripts/fixtures/child-agent.cjs` gained the `sense.set` verb;
  `smoke.mjs` gained 3 gates): flip / read / unknown-sense-refused over the real stdio
  protocol — all PASS. Smoke total now **78/78**.
- Live GUI CI (`electron . --ci`, real renderer+IPC+running mind): the probe boots the
  mind and round-trips `window.ava.mind.setSense`. Observed verdict:
  `PASS | sense-toggle=on->read->off OK | mindState=awake` — the retention sense flips
  ON, reads back true, flips OFF, all through the live cognitive loop.
- `typecheck`: 0 errors (engine + mind, strict). `vitest`: 797 passed / 2 skipped
  (the 2 skips are the Ollama live-LLM tests, environmental).

**Env note:** Electron must launch with `ELECTRON_RUN_AS_NODE` unset (this shell exports
it globally); `env -u ELECTRON_RUN_AS_NODE` runs the real GUI, not plain Node.

**Net:** ADR-001 sense toggles shipped end-to-end and verified LIVE. Full gate green
(typecheck 0 / vitest 797+2 / smoke 78/78 / GUI CI PASS). No regressions.
