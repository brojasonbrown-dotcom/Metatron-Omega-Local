# GEMATRIA ENGINE PLAN — Track G
## Multi-base decimals, gematria invariants, fractals & adaptive precision
### (separate from MASTER_PLAN_V3 — runs in parallel, never blocks the AGI core)

> The user's directive: *"decimals move up and down on different values, not just
> 10… exploit all mathematical computational and algorithmic systems… numerical
> gematria relationships and fractals… utmost rigor, no mock."*
>
> This plan makes that rigorous. The load-bearing rule is the **honesty table**
> (Wolfram Certificate 5.G5): we implement **theorems** and **refuse numerology**.
> Everything here is either (a) a proven identity with a certificate reference, or
> (b) explicitly labelled an *exploratory signal* that can never become a "fact"
> the mind asserts.

---

## G0. The one law

> **A digit pattern is data. A digit *meaning* is numerology.** We compute the
> former; we never assert the latter. Gematria "relationships" are surfaced as
> *measurable invariants and correlations with error bars*, never as "X means Y".

---

## G1. Multi-base decimal engine ("decimals move up and down bases")

Represent and compute with real numbers across bases b ∈ {2…64} (and the φ-base,
§G3), with the **precision tier chosen adaptively** per magnitude.

- **G1.1 Arbitrary-base expansion.** For x ∈ ℝ and base b, produce the greedy
  base-b expansion to k fractional digits, with the *exact* rational remainder
  carried alongside (so nothing is silently rounded). Fractional digits in base b
  of a rational p/q are eventually periodic — the period is a *computable
  invariant* (ord of b mod q′). We surface period length as a feature, not a meaning.
- **G1.2 The precision ladder (verified, Cert 5.G6 / 4.D4).** Three tiers,
  selected by magnitude, never blurred:
  | Tier | Domain | Representation | Guarantee |
  |---|---|---|---|
  | **EXACT** | φⁿ, n ≤ 76 (`PHI_EXACT_HORIZON`) | Z[φ] pair {a,b} = a+bφ, a,b∈ℤ | zero rounding, ever |
  | **FLOAT** | 76 < k < 1435 (`PHI_OVERFLOW_HORIZON`) | binary64 | ≤ 16 sig. digits, drift measured |
  | **BIG** | k ≥ 1435, or exact-window-exceeding ints | arbitrary precision (BigInt-scaled) | exact to requested digits |
- **G1.3 Adaptive-precision governor.** The same measured governor that owns RAM
  (P4/A7) owns the precision tier: under budget pressure it drops FLOAT→lower
  digits; for invariant-critical paths (coupling constants, φ-power ratios) it
  *pins* EXACT. Precision is a *resource*, allocated, never assumed.

**Gate G1:** round-trip x → base-b digits → back is bit-exact within tier
guarantee across b ∈ {2,3,7,10,12,16,36,60} and magnitudes 1e-6…1e6; EXACT tier
shows *zero* drift across 10⁴ φ-power ops; tier transitions are logged.

---

## G2. Gematria invariants (the rigorous part of "gematria relationships")

We implement the *provable* invariants and measure their correlations honestly.

- **G2.1 Digital-root operator, base-b.** `dr_b(n) = ((n−1) mod (b−1)) + 1`.
  **Theorem (Cert 5.G1):** `dr_b(n) ≡ n (mod b−1)`. This is a true invariant —
  basis-independent residue, revealed by base-b digits. Cheap, deterministic,
  safe to hardcode.
- **G2.2 Digit-sum dynamics.** The map n ↦ digitsum_b(n) terminates in
  O(log_b n) steps (**Cert 5.G2**). The *trajectory length* and *fixed point* are
  computable features. We do **not** attach meaning to the fixed point.
- **G2.3 Multi-base invariant vector.** For each concept/index n, compute the
  feature vector `[dr_2(n), dr_3(n), dr_7(n), dr_10(n), dr_12(n), dr_16(n), …]`.
  Because `dr_b(n) = n mod (b−1)`, this vector is just the **residue fingerprint**
  of n across coprime moduli — by the Chinese Remainder Theorem it *uniquely*
  identifies n mod lcm(b₁−1, b₂−1, …). This is a rigorous, reversible hash —
  **the honest version of "gematria"**. It is an addressing/fingerprinting tool,
  not a mystical one.
- **G2.4 Correlation, not equivalence.** If two concepts share a residue
  fingerprint, we *report the collision and its p-value under a null model*. We
  never say the concepts are "the same". Shared residues are a *coincidence
  statistic*, published with its error bar.

**Gate G2:** `dr_b` matches `n mod (b−1)` on 10⁵ random n across 9 bases
(Cert 5.G1 already proves it — this re-verifies in TS); residue-fingerprint
uniqueness holds below the CRT modulus; every reported "relationship" carries a
p-value.

---

## G3. φ-base & Zeckendorf addressing (the fractal/exact backbone)

This is where the user's "gematria relationships and fractals" becomes *real math*.

- **G3.1 Z[φ] exact ring (Cert 5.G3).** `{a,b} = a+bφ`, closed under +,−,×,
  exact multiplicative norm `N(a+bφ)=a²+ab−b²`. Implemented as a tiny type; used
  for all φ-coupling arithmetic below the n=76 horizon. **This is the single most
  powerful "exploit the math" move in the plan** — φ-arithmetic with zero drift.
- **G3.2 Zeckendorf representation (Cert 5.G4).** Every n has a *unique* sum of
  non-consecutive Fibonacci numbers (greedy works). This is a **canonical,
  reversible, fractal addressing scheme**: the Zeckendorf bit-string of n is a
  self-similar code. We use it to *address* memory slots and concept ids — a real
  efficiency (Fibonacci coding is a complete prefix code).
- **G3.3 Fibonacci prefix coding.** Zeckendorf bits + terminator give a universal
  code for the integers. Use it to compactly store journal indices / concept ids.
  Honest caveat (measured, not claimed): Fibonacci coding is *asymptotically
  slightly less dense* than binary for large n — we use it where its *fractal
  self-similarity* (alignment with the φ-cadence) matters, not where raw density
  does. The trade-off is measured in the gate, not asserted.
- **G3.4 Base-φ ("phinary") expansion.** Real numbers in base φ (β-expansion with
  β=φ). Greedy φ-expansion is well-defined; the digit set is {0,1} with the
  no-two-consecutive-1s rule (same as Zeckendorf for integers). We compute it for
  constants and report digit statistics. **Caveat:** base-φ expansions of
  arbitrary reals need care (non-uniqueness at boundaries); we carry the exact
  remainder and flag ambiguous prefixes. This is an *exploratory signal*, not a
  fact-source.

**Gate G3:** Zeckendorf encode/decode round-trips 1…10⁶ uniquely (Cert 5.G4
proves 1…2000; TS extends); Z[φ] ops exact vs Wolfram for 10³ random pairs;
Fibonacci-code density vs binary measured and reported honestly; base-φ expansion
flags its ambiguous cases.

---

## G4. Fractals & self-similarity (measurable, not decorative)

- **G4.1 Fractal dimension of the field/mode structure.** Box-counting estimate
  of the golden-spiral mode field (already an image descriptor, P2). Report the
  *measured* Hausdorff-ish dimension with confidence interval. A number, not a vibe.
- **G4.2 Self-similarity spectrum of φ-cadence.** The 14 φ-spaced bands
  (89·φ^(k/2)) form a geometric (self-similar) ladder. Measure the log-periodicity
  / discrete-scale-invariance signature. This is genuine math (DSI appears in
  critical systems); we *measure* whether the field shows it.
- **G4.3 Census self-similarity.** The node-census law (Cert 4.D1) is a
  Fibonacci-ramped geometric growth — itself a discrete fractal. We expose the
  branching-factor spectrum as a live diagnostic.

**Gate G4:** every fractal claim ships with a measured value + CI; nothing
asserted without a number.

---

## G5. The honesty table (hard contract — enforced in code)

| Quantity | Status | Use |
|---|---|---|
| digital root `dr_b(n) = n mod (b−1)` | **THEOREM** (Cert 5.G1) | hardcodable invariant |
| digit-sum termination O(log n) | **THEOREM** (Cert 5.G2) | feature |
| Z[φ] ring + norm | **THEOREM** (Cert 5.G3) | exact arithmetic tier |
| Zeckendorf existence+uniqueness | **THEOREM** (Cert 5.G4) | addressing/coding |
| φ²=φ+1, Binet, Lucas closed form, Q-matrix | **THEOREM** (Cert 1) | constants |
| residue fingerprint uniqueness (CRT) | **THEOREM** | fingerprinting |
| base-φ digit statistics | **exploratory signal** | diagnostics, never facts |
| fractal dimension (box-counting) | **measured estimate** | diagnostic + CI |
| *any "meaning"/"vibration" of a digit pattern* | **NUMEROLOGY — REFUSED** | never implemented |
| *gematria word-equivalence ("cat"≡"dog" via letter sum)* | **NUMEROLOGY — REFUSED** | never implemented |
| *predicting events from digit roots* | **NUMEROLOGY — REFUSED** | never implemented |

The engine **refuses the refused rows by construction**: there is no API that
turns a digit pattern into an asserted meaning.

---

## G6. What Track G gives the AGI core (and what it must never do)

**Gives:** exact φ-arithmetic (A8), a reversible residue-fingerprint hash for
concepts, a fractal addressing scheme, an honest adaptive-precision ladder, and a
set of *measured* self-similarity diagnostics. All of it feeds the core as
**rigorous tools**.

**Must never do:** attach semantic meaning to digit patterns; claim two things
are equivalent because they share a residue; assert a fractal dimension without
a confidence interval; or present exploratory signals as facts. Track G is a
*mathematical instrument panel*, not an oracle.

---

## G7. Execution order (within Track G)

```
G1 multi-base + precision ladder  →  G2 invariants  →  G3 φ-base/Zeckendorf
  →  G4 fractals  →  G5 honesty table enforced  →  G6 integration review
Runs parallel to MASTER_PLAN_V3 P-series; merges only at the exact-arithmetic
tier (A8) and the residue fingerprint, each behind its own green gate.
```
