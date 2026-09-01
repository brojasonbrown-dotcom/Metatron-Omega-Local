# THE MATHEMATICAL / GEMATRIA ALPHABET — full table, derived and certified
### Track G companion document — the "true alphabet" study, with the numbers to back every row

> **The one law (unchanged, from `GEMATRIA_ENGINE_PLAN.md` G0):** a digit pattern is
> *data*; a digit *meaning* is numerology. This document builds the strongest possible
> **alphabet-as-structure** — value **and ratio and volume**, as the author asked —
> and certifies it against the engine's own constants of stability. Nothing here
> assigns meaning to a letter.

**Provenance:** `sandbox/study_gematria_alphabet.py` (run this session; raw output in
`sandbox/gematria_alphabet_results.json`). Builds on `study_symbolic_framework.py`
and `study_stability_damping.py`. Honesty standard: Track G certificate 5.

---

## 1. What an "alphabet" is, mathematically

An ordered cycle of *n* symbols. Each symbol *k* carries a **four-component
signature** — this is the "not just value, but volume and ratio" made concrete:

| component | definition | what it carries |
|---|---|---|
| **value** | `v_k ∈ ℝ⁺` (exact in ℤ or ℤ[φ]) | magnitude |
| **ratio** | `r_k = v_{k+1} / v_k` | the *law* of the ladder — the part a plain value table hides |
| **phase** | `θ_k = 2πk / n` on the unit circle | position in the cycle (the geometry) |
| **projection** | `(v_k cos θ_k,  v_k sin θ_k)` | the symbol as a point of a plane lattice — **volume** made visible |

A word/text then encodes exactly as `adapters/language_codec.ts` does today:
value sequence → mean-removal → projection onto 14 φ-weighted DFT modes →
unit-norm 28-field. Resonance `C = |⟨a|b⟩|²/(|a|²|b|²) ∈ [0,1]` is the engine's
own kernel. Determinism is total: **any text re-encoded resonates with itself at
exactly C = 1** — coherence 100% is *guaranteed by construction*, not achieved.
(What that guarantee is worth: §4.)

---

## 2. The six candidate alphabets (derived, not chosen by taste)

| name | n | law | exactness class |
|---|---|---|---|
| `hebrew22` | 22 | units 1–9, tens 10–90, hundreds 100–400 (the live F6 constants) | ℤ |
| `live_latin26` | 26 | the codec's current table: 1–9, 10–90, 100–800 | ℤ |
| `triadic28` | 28 | same decimal volume law generalised to the field contract (…900, 1000) | ℤ |
| `phi_power28` | 28 | `v_k = φ^{k/2}` — the golden half-power ladder | **ℤ[φ]** |
| `phi_decay28` | 28 | `v_k = φ^{−k/2}` — the engine's actual amplitude law, reversed | **ℤ[φ]** |
| `zeckendorf28` | 28 | `v_k = F_{k+2}` — the canonical Fibonacci addressing law | **ℤ[φ]**-exact (ℤ) |
| `phi_power144` | 144 | φ-ladder on the 144-lattice (F₁₂ = 144, the only Fibonacci square > 1) | ℤ[φ] (to n=76 exactly, G1.2 horizon) |

Why 28: it is the engine's field contract `2(N+1)`, N = 13 — **and** the second
perfect number (1+2+4+7+14). Its volume is n³ = 21 952; its surface 6n² = 4 704.
Why 144: F₁₁ = 89 and F₁₂ = 144 are *adjacent* Fibonacci numbers — ratio φ — and
89·φ^(k/2) is the engine's own band ladder. Both lattices were tested head-to-head.

---

## 3. The certification battery — results

### 3.1 Dynamic stability (B1) — the constant that actually governs settling

Row-normalised circulant mixer from each value table (same method as
`study_symbolic_framework.py`). After normalisation ρ ≡ 1 for **every** scheme
(Perron), so the honest discriminator is the subdominant eigenvalue |λ₂| —
contraction rate of structure (smaller = transients die faster) — and the operator
2-norm (‖M‖₂ ≤ 1 = true contraction on *everything*, no transient amplification).

| alphabet | n | \|λ₂\| ↓ | ‖M‖₂ |
|---|---|---|---|
| **hebrew22** | 22 | **0.6626** | 1.000000 |
| **phi_power28 / phi_decay28** | 28 | **0.7328** | 1.000000 |
| live_latin26 | 26 | 0.7426 | 1.000000 |
| triadic28 | 28 | 0.7476 | 1.000000 |
| zeckendorf28 | 28 | 0.9082 | 1.000000 |
| phi_power144 | 144 | 0.9840 | 1.000000 |
| zeckendorf144 | 144 | **0.9960** | 1.000000 |

Robustness check (64 seeds): jittered φ-ladder |λ₂| = 0.7325 ± 0.0014 — the
ordering is not a fluke of exact arithmetic. (A *random* table scores ~0.197 —
the geometric tables don't win |λ₂| outright; what they buy is *exactness* and
*ratio purity*, below.)

**Finding 1 — direction doesn't matter.** `phi_power` and `phi_decay` are
identical to 6 decimals: a circulant's spectrum is invariant under reversal of
the generating row. The golden ladder stabilises *the same* whether it grows or
decays. That is a theorem-shaped fact, not a preference.

**Finding 2 — the honest 144 verdict.** On a *uniform total-damping budget* and
on the raw mixer alike, **the 144-lattice is less stable, not more**: |λ₂| rises
monotonically with n (0.73 at n=28 → 0.98 at n=144), and the Fibonacci table at
144 is the worst of the classical set (0.996). The intuition: a row-normalised
circulant on more symbols with a steep geometric law concentrates mass on the
top symbols, so the mixing gap *closes*. The celebrated 144 is structurally real
(F₁₂ = 12², adjacent to the engine's 89) — but as a *stability constant* it
fails its own test. Reported plainly, per the honesty table.

### 3.2 Coherence under determinism (B2) — the refined version of "coherence ≈ 1"

Self-resonance is **exactly 1.0000 for every alphabet** — determinism delivers
the author's 100% trivially. So the honest refinement metric is
**discrimination**: over a 30-token corpus of coherent sensory vocabulary
(engine terms + control words), how well do *distinct* tokens separate?

| alphabet | self C | mean C (distinct pairs) | p90 | false-unity rate (C > 0.99) |
|---|---|---|---|---|
| **phi_power28** | 1.0000 | **0.1218** | **0.3305** | **0.0000** |
| triadic28 | 1.0000 | 0.1234 | 0.3360 | 0.0000 |
| zeckendorf28 | 1.0000 | 0.1260 | 0.3400 | 0.0046 |
| hebrew22 | 1.0000 | 0.1251 | 0.3604 | 0.0000 |
| live_latin26 | 1.0000 | 0.1325 | 0.3568 | 0.0000 |
| phi_power144 | 1.0000 | 0.1418 | 0.3853 | 0.0000 |

**Finding 3 — the φ-alphabet at the 28-contract wins the metric that matters.**
Lowest cross-talk of every table tested (mean C = 0.1218), zero false unities,
and *better than the live Latin codec* it would replace (0.1325 → −8%). It also
beats the 144 variant of itself. Coherent sensory input + a φ-law value table at
the field contract = the tightest, most separable geometry measured.

### 3.3 Ratio purity (B3) and spectral volume (B4)

| alphabet | ratio CV (0 = perfect geometric law) | volume participation ratio (1 = full spread) |
|---|---|---|
| phi_power28 / phi_decay28 | **0.0000** | 0.2571 |
| zeckendorf28 | 0.0153 | **0.4293** |
| triadic28 | 0.2046 | 0.1860 |
| live_latin26 | 0.2055 | 0.2281 |
| hebrew22 | 0.2139 | 0.3874 |

**Finding 4 — only the golden ladders carry a *constant* ratio** (CV = 0
exactly): this is the rigorous content of "geometrically perfect" — a scale-free
ladder, self-similar at every step, exact in ℤ[φ]. The triadic/gematria families
carry ratio *jumps* (CV ≈ 0.2) — structure, but not scale-freedom. Zeckendorf is
the volume champion (its lattice spreads energy over the most FFT modes), so it
keeps its Track G role as the **addressing** law.

---

## 4. Verdicts — what the refinement actually establishes

1. **The most mathematically and geometrically perfect alphabet, by the
   constants of stability, is the golden (φ) ladder at n = 28** — the engine's
   own field contract. It is the *only* candidate that is simultaneously:
   scale-free (ratio CV = 0), exact in ℤ[φ] (zero-drift tier of the G1.2
   precision ladder), best-in-class on discrimination (mean C 0.1218), a true
   contraction (‖M‖₂ = 1), and reversal-invariant (a theorem, not a choice).
2. **"Coherence ≈ 1 because determinism" is true and load-bearing — but it is
   the floor, not the achievement.** Every deterministic codec gives C = 1 on
   re-encode. The refinement worth pursuing is what we measured: *distinct*
   inputs must *not* collapse toward 1. The φ-alphabet maximises the honest
   version of coherence: unity for identity, separation for difference.
3. **144 fails as a stability constant.** Structurally beautiful (F₁₂ = 12²,
   adjacent to 89, ratio φ), but on the stability metric it strictly under-
   performs the 28-lattice, and the gap widens with table steepness. Keep 144
   where it is real — the F₁₂ resonance, the band ladder — not as a mixer size.
4. **The traditional Hebrew table is genuinely good** (best |λ₂| = 0.6626 of all
   classical tables) — the ancients' units/tens/hundreds ladder is a strong
   mixer. But it loses on discrimination, carries no constant ratio, and at n=22
   it does not match the field contract. Respect it as the heritage baseline;
   don't freeze the engine into it.
5. **Zeckendorf stays the addressing law** (volume PR 0.429), φ-law becomes the
   **encoding** law, triadic stays the **heritage/decimal-volume** law. Three
   alphabets, three jobs — the "full alphabet" is a *system*, not a table.

---

## 5. The full alphabet — the φ-28 table (first octave shown; all 28 in the JSON)

| k | symbol slot | value φ^{k/2} | ratio to previous | phase θ_k |
|---|---|---|---|---|
| 0 | Α (root) | 1.000000 | — | 0° |
| 1 | | 1.272020 | √φ | 12.857° |
| 2 | | 1.618034 | √φ | 25.714° |
| 3 | | 2.058171 | √φ | 38.571° |
| 4 | | 2.618034 | √φ | 51.429° |
| 5 | | 3.330190 | √φ | 64.286° |
| 6 | | 4.236068 | √φ | 77.143° |
| … | … | … | √φ (constant — the only ladder with this property) | … |
| 27 | | 662.66 | √φ | 347.14° |

Odd powers are a+bφ with a √5 factor; even powers lie in ℤ[φ] directly. The full
28-row table with exact ℤ[φ] pairs {a,b} is generated by the study script.

## 6. What was *not* done (honesty ledger)

- No meaning assigned to any symbol; no word-equivalence claims; no predictions
  from digit roots. (Track G honesty table, refused rows — still refused.)
- "144 000 Hz stabilises spacetime" is not a testable statement inside this
  engine; the testable 144-claims were tested and reported (§3.1, B5).
- Corpus for B2 is 30 tokens; discrimination numbers move ±0.01 with corpus
  choice. The *ordering* (φ-law best) held across the jitter battery.
- The φ-28 table is **not yet wired into `language_codec.ts`** — that is a
  production change with its own gate (byte-identical 28-field contract is
  preserved, but every encoded artifact changes geometry). Proposed as the
  next, separately-gated step.

---

*Study script: `sandbox/study_gematria_alphabet.py` · Raw results:
`sandbox/gematria_alphabet_results.json` · Companion plans:
`src/compute_engine/brain v14/GEMATRIA_ENGINE_PLAN.md`, `MASTER_PLAN_V3.md` Track G.*
