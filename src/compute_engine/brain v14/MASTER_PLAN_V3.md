# MASTER PLAN v3 — De-biased Learning, True Vision, Real Telemetry, **Rigor-Corrected & Depth-Resolved**

> Supersedes Kimi MASTER PLAN v2. v2's *direction* (de-bias, true vision, measured
> telemetry, no mock) is kept **entirely**. What changes is the *mathematical
> floor*: every claim that v2 asserted by vibe is now either **Wolfram-verified
> (and hardcoded)** or **deleted as false**. Two entire tracks are added:
> **Track D** (resolve the scaling/depth collision that v2 did not know existed)
> and **Track G** (multi-base / gematria / adaptive-precision — split off as its
> own plan because it is large and mathematically delicate).

---

## 0. Corrections to v2 (the rigor pass)

v2 was honest about *bias* but sloppy about *numbers*. Four claims are now fixed
against ground truth (Wolfram Certificates 4 & 5, `formal/cert_computational_depth.wl`,
`formal/cert_gematria_bases.wl` — all checks print `True`):

| v2 claim | Verdict | Corrected truth (verified) |
|---|---|---|
| "6.85 Hz = 1000/φ⁴ **exactly**" | **FALSE** | 1000/φ⁴ = **145.89803375 ms**; code uses `TICK_MS=146` — off by 0.102 ms (0.07%). It is a *declared* cadence, not an exact identity. Telemetry must show the measured value, never "exactly". (Cert 4.D5) |
| "capacity 10946" hardcoded with a comment admitting F₁₆·12≈11844 confusion | **muddled** | 10946 = **F₂₁ exactly**. The F₁₆ note was wrong-headed. Constant is F₂₁; the *derivation* is now RAM-measured (P4). |
| No notion of a census law | **missing** | **Census law (Cert 4.D1):** branching factor `b(d)=min(Fib(d+1),13)=1,1,2,3,5,8,13,13,…`; census = **41@d5, 281@d6, 3401@d7, 43961@d8**. Matches gate M2 *exactly*. |
| No depth↔memory coupling | **missing** | **Census crosses the F₂₁=10946 concept cap at depth 8.** The tree-depth ceiling and the memory cap are on a collision course (Track D). v2 scaled them independently — that is a latent bug. |
| No precision ladder | **missing** | **Precision horizons (Cert 4.D4 / 5.G6):** φⁿ is float64-integer-exact for **n≤76** (φ⁷⁶<2⁵³, φ⁷⁷>2⁵³); `Lucas(n)=round(φⁿ)` exact for **n∈[2,76]**; φ^k overflows binary64 at **k=1435**. New constants `PHI_EXACT_HORIZON=76`, `PHI_OVERFLOW_HORIZON=1435`, `CENSUS_CAP_DEPTH=8` are **already hardcoded** in `core/constants.ts`. |

**Root-bias archaeology (v2 §0) is preserved and still true** — the dog/cat
poison was an ungrounded `nameThis` from bare scores. P1 below still kills it.
What v2 got *right* and we keep verbatim: no mock, exploit-before-invent,
glossary-first margin, modular model store, whisper.cpp sidecar, measured
telemetry, one-gate-per-package.

---

## 1. Elite algorithm upgrades over v2 (the "beyond professional" pass)

These are concrete, better-than-v2 choices — each justified, each gateable.

| # | v2 approach | **v3 upgrade** | Why it is strictly better |
|---|---|---|---|
| A1 | Hamming NN over pHashes, linear scan | **Dual hash (pHash ⊕ dHash) + BK-tree** | Hamming distance is a *metric* → a BK-tree gives O(log n) "find similar" instead of O(n) scan; dHash adds gradient/structure sensitivity that pure DCT-pHash misses. Recall gate unchanged, latency collapses. |
| A2 | pHash "64-bit DCT" | **pHash (DCT, freq-domain) ⊕ dHash (gradient, spatial)** | Two hashes disagree exactly on the hard cases (blurry-vs-edge); AND-gate for "seen before", OR-gate for "candidate". Fewer false-positives *and* fewer misses than either alone. |
| A3 | HNSW at 144-dim float32 | **SQ8 scalar-quantized HNSW tiers** (the `pq_codec.ts` scaffold already exists) | 144×4B → 144×1B per vector = **4× RAM headroom** before eviction; recall drop <2% at 8-bit; the RAM governor (P4) can hold 4× the concepts at the same budget. |
| A4 | "learning curves measured" (P3) | **regret-bound reporting** on every substrate | A learning *curve* is a picture; a **regret bound** is a number with a theory. Each substrate reports empirical regret vs the closed-form optimum (Hopfield: energy-descent steps; Hebbian: correlation residual). Makes "is it learning?" a yes/no gate. |
| A5 | whisper.cpp always-on | **VAD-gated whisper** (energy + zero-crossing VAD before the STT call) | whisper is the expensive step; a 1 ms VAD pre-filter means it only runs on real speech → CPU cost drops ~10× in silence/noise. WER gate unchanged. |
| A6 | `MIND_MODELS` config | **provenance-hashed model routing** | Every LLM output is stamped `sha1(model_id ‖ prompt_hash ‖ ts)`. The dog/cat class of hallucination becomes *traceable to the exact model+prompt that produced it* — the audit trail P1 needs but v2 didn't specify. |
| A7 | governor scales depth | **governor co-scales depth *and* memory cap as one coupled knob** | Cert 4.D1 proves they collide at depth 8. A single resource Lagrangian allocates RAM between tree nodes and concept store; no independent ceilings that can fight. |
| A8 | floats everywhere | **Z[φ] exact arithmetic tier** (`{a,b}` = a+bφ, a,b∈ℤ) | Cert 5.G3: Z[φ] is closed under +,−,× with an exact multiplicative norm. φ-power *ratios* and coupling constants can be carried **exactly** (zero drift, ever) below the n=76 horizon — floats only above it. This is the "exploit all mathematical computational systems" the vision asked for, made rigorous. |

---

## 2. The work packages (v2 numbering kept; upgrades folded in)

> One package at a time; a package starts only when the previous gate is green.
> Execution order in §4.

### P1 — De-biased naming & speaking (the hallucination kill) — *with A6*
1. `nameThis` gets a **real percept description or stays silent**: dominant
   φ-band energies (audio), luminance-structure stats (vision), source types.
   No real content → honest label `"unnamed"`, **no LLM call**. *Never again a
   label invented from scores.*
2. Deterministic fact-spine (M3) extended to the naming path: concepts minted
   from real content only. Poisoned legacy (dog/cat) **quarantined** (renamed
   aside, auditable, not deleted).
3. Glossary-first margin: top match must beat runner-up by **margin ≥ φ⁻²**
   (0.382), not merely λ=0.382 tie.
4. **(A6)** Every minted name carries a provenance hash of the percept +
   model + prompt that produced it.
**Gate P1:** fresh boot, neutral text 10 min → zero concrete-object labels minted
without perceptual content (journal-verified); dog/cat archaeology in
`testresults.md`; every new label has a resolvable provenance hash.

### P2 — True vision (see, find-similar, remember) — *with A1 + A2*
5. Real local features per frame: **(a) 64-bit DCT pHash**, **(b) 64-bit dHash**
   (gradient), over the existing 144×89 luminance grid; (c) golden-spiral mode
   field (already an image descriptor); (d) block stats (edges, motion delta).
6. **(A1)** Local "find similar" = **BK-tree** over the dual hashes (+ field
   resonance). Matches surface as "seen before (similarity 0.94)". No internet,
   no keys, no fabrication.
7. Grounded identification: when a vision model is hosted (P9), frames are
   captioned → glossary entries + concept labels. Until then: honest "I see
   structure, I can't name it yet."
8. Long-term visual memory: novelty-gated `{pHash, dHash, field, caption?, ts}`
   persisted, loaded at boot, searched by the BK-tree.
**Gate P2:** two similar images → similarity ≥0.9 found; dissimilar → correctly
absent; novel frame logged & re-found after restart; find-similar latency measured
(log-scale, not linear).

### P3 — Memory-algorithm test battery — *with A4*
9. `brain v14/tests/memory-algorithms.test.mjs` **measures learning**, not API
   shape: registry prototype averaging; dual-channel recognition; Hopfield
   one-step recall + near-dup merge; glossary persist/restore; L2 Hebbian
   correlation; EMA reinforcement decay; capacity/eviction (F₂₁ cap, 89 Hopfield
   FIFO).
10. **(A4)** Each substrate reports an **empirical regret bound** vs its
    closed-form optimum; the gate is regret ≤ bound, not "curve looks nice".
**Gate P3:** every substrate has a measured learning curve *and* a passing regret
bound.

### P4 — RAM-scaled context memory — *with A3 + A7*
11. Concept/visual capacity derived from **measured available RAM** (φ-fraction,
    configurable floor/ceiling) — not hardcoded 10946. **(A7)** the governor
    allocates RAM between tree nodes and concept store as **one coupled budget**
    (Track D law).
12. **(A3)** HNSW served over **SQ8-quantized** vectors (144×1B) — 4× headroom.
    Retrieval latency measured at 1k/10k/100k entries (honest log curve).
**Gate P4:** capacity follows measured RAM; depth-8 collision cannot occur
(co-governor proven); retrieval log-scale; recall ≥ baseline −2%.

### P5 — TRAINING toggle (the 6th FAB)
13. Two honest modes: **EFFICIENT** (today) and **TRAINING** — deeper trees
    (within the co-governed ceiling), full-rate senses, every thought gets its
    tool cycle, glossary+visual capture everything, model warm-pinned. Live in
    the Σ panel. **(A7)** TRAINING never pushes past the depth-8 collision law.
**Gate P5:** toggle flips measurable behavior (tool-call rate, capture rate,
depth ceiling) with zero suite regressions.

### P6 — STT: understand speech in real time — *with A5*
14. **whisper.cpp sidecar** (offline; tiny/base model, explicit opt-in download).
    **(A5)** A cheap VAD (energy + zero-crossing) gates the whisper call so it
    only transcribes real speech. Speech → text → `text.feed` frames with REAL
    words. Rejected: Web Speech API (routes through Google — not offline/honest).
**Gate P6:** spoken sentence → correct words reach the bus (measured WER on a
recorded sample); without model file → honest "STT not provisioned"; VAD shown to
skip ≥80% of non-speech frames.

### P7 — True Hz/FPS telemetry — *corrected (see §0 row 1)*
15. Σ panel FREQUENCY section: engine-loop tick rate (measured ~30 Hz), mind
    cognitive tick (**measured** — declared 146 ms ≈ 6.85 Hz, shown *as measured*,
    never "exactly 1000/φ⁴"), sensor frame rates (mic 10 Hz, camera 2 Hz, screen
    0.39 Hz), camera capture FPS, and their ratios against φ-powers. Field-scanner
    resonance target 144,000 Hz (F₁₂×10³) and the 14 φ-spaced bands (89·φ^(k/2))
    get a live readout. **Every number measured per second.**
**Gate P7:** panel Hz matches an independent script measurement.

### P8 — Clean responses (no metric dumps)
16. Answers short & human; numbers only when they *are* the answer. A "details"
    expander (or the word "details") reveals spine, certificate, grounded
    concepts. Default clean; depth one tap away.
**Gate P8:** default answers ≤ spine + one sentence; details on request.

### P9 — Hosted-model upgrade path — *with A6*
17. Modular Ollama store: drop a new model in / `ollama pull`, map per-tool via
    `MIND_MODELS` (voice:, structure:, vision:). **(A6)** provenance hash on
    every routed output. Stronger chat model → voice/answer; mathstral keeps
    verification; vision model powers P2 captions. No code rewrites.
**Gate P9:** new model → voice answers from it (provenance shown & resolvable);
old models still served.

### P10 — Regression & integration gates (always)
18. Every P lands with: engine suite green, app smoke green, bridge gates 1/2/2b
    green, BUILD+INSTALL bats green, and its own new measured gate file.
    `testresults.md` gains the P-series results.

---

## 3. Track D — resolving the scaling / depth / node collision *(new)*

This is the "resolve scaling layers nodes depth issues" work, grounded in Cert 4.

- **D1 — the law is now known.** Census(d) with `b(d)=min(Fib(d+1),13)`:
  41@5, 281@6, 3401@7, 43961@8. The governor's "settled at 281" is *depth 6*;
  the next organic step is 3401 (12×) — a huge jump, which is why the measured
  governor (not a naive one) must own it.
- **D2 — the collision.** Census crosses the F₂₁ concept cap at **depth 8**
  (`CENSUS_CAP_DEPTH=8`, hardcoded). If the tree deepens to 8 while the concept
  store is also near cap, they compete for the same RAM. v2 would have hit this
  blind. **Resolution:** one resource Lagrangian (A7) allocates RAM across
  `{tree nodes, concept store, visual memory}`; depth and caps move together.
- **D3 — the depth≥7 lever.** gate M2 already measured it honestly: per-node
  parallelization is deferred because FractalNodes hold per-node learning state
  (L1–L4); at depth ≥7 (3401 nodes, ~256 ms > budget) the correct lever is
  **state-serializing subtree workers** — a dedicated module, not a rush job.
  v3 schedules it as part of P4/P5, gated by the co-governor.
- **D4 — precision-aware depth.** φ-power couplings carried **exactly** in Z[φ]
  below `PHI_EXACT_HORIZON=76` (A8); floats above. Depth-dependent constants never
  silently drift.

**Gate D:** co-governor holds tree+memory under one budget through a forced
depth-8 transition (simulated), no OOM, no eviction storm, regret bounds intact.

---

## 4. Execution order (dependency-honest)

```
W1,W2 (Wolfram certs — DONE)  →  P1 de-bias  →  P3 memory battery (baseline)
  →  P2 vision  →  P4 context memory (couples Track D)  →  P5 training toggle
  →  P6 STT  →  P9 model hosting  →  P7 telemetry  →  P8 clean responses
  →  P10 final sweep
Track G (gematria / multi-base / adaptive precision) runs as a SEPARATE plan
(GEMATRIA_ENGINE_PLAN.md) — it is large and must not block the AGI core.
```

One package at a time; a package starts only when the previous gate is green.

---

## 5. Laws (inherited, restated, and **strengthened**)

- **No mock, no fabrication, ever.** Absence is reported, never filled with
  invented content. LLMs phrase/name only from measured content.
- **No biased learning.** Nothing is taught from what we didn't measure. The
  dog/cat class is structurally impossible after P1 + provenance hashing (A6).
- **Exploit before invent.** Dual hash over the existing 144×89 grid; HNSW +
  existing `pq_codec` SQ8 scaffold; golden-spiral fields as descriptors; modular
  model store; Z[φ] exact tier using the already-verified φ algebra.
- **Measured telemetry only.** Every Hz/FPS/count/rate is computed live; nothing
  is "exactly" unless Wolfram proved it (and then it's a hardcoded constant with
  a certificate number).
- **Honest precision.** Constants carry their horizon (`PHI_EXACT_HORIZON`,
  `PHI_OVERFLOW_HORIZON`). Exact tier below the horizon, float tier above, never
  blurred.
- **Theorem, not numerology.** Only Wolfram-verified identities are hardcoded
  (Cert 5.G5 honesty table). Digit "meanings", gematria word-equivalence, and
  event prediction are *refused* by construction.
- **Honest risk statements.** STT: bounded opt-in sidecar. Vision captions: only
  with a vision model, else unnamed. Deeper trees: co-governor bounded, no blind
  depth-8 collision.
