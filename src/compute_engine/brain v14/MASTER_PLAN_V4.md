# MASTER PLAN v4 — As-Built Map & Remaining Frontier
## Second sweep: deduplicated, reconciled against the live tree

> **Why v4 exists.** v3 (and GEMATRIA_ENGINE_PLAN Track G) are written as
> *forward-looking* plans. They are not. The **2026-08-12 pre-build sweep** already
> reconciled every plan "add" step against the live tree and built only the
> genuinely-absent packages. **Every package in v3 and Track G is now shipped and
> green.** Keeping v3 as "the plan" invites a future builder to re-implement what
> already exists — the exact duplication this sweep is charged with preventing.
>
> v4 is therefore not a build list. It is (§1) an **as-built map** — every system,
> where it lives, its proof — and (§2) the **genuine remaining frontier**: the small
> set of things that are honestly *not done*, each with a measurable gate. Nothing in
> §2 duplicates an existing system; each item names the file it would extend.
>
> **Ground-truth sources (verified, not asserted):**
> `testresults.md` (P-series + G-series sweeps), `INTEGRATION_LEDGER.md`
> (M1–M6, suite counts), `Decisions/progress.md`. Suite state at last full gate:
> **engine 975/975, brain 540/540, tsc 0/0 both packages, app smoke all-pass.**

---

## 0. The one law (unchanged, restated)

**Exploit before invent. No duplicates.** Before any new module is written, this map
is consulted and the live tree is grepped. If the capability exists, the work is
*integration*, not *implementation*. The four laws from v3 §5 hold verbatim:
no mock / no fabrication · no biased learning · measured telemetry only · theorem not
numerology (the G5 honesty table is enforced in `core/gematria.ts` by construction).

---

## 1. AS-BUILT MAP — what already exists (do not rebuild)

### 1.1 The genome (Phase 5) — *exists, wired, tested*
| System | File | What it is | Proof |
|---|---|---|---|
| Field-State Genome | `cognition/field_genome.ts` | Hot(F₈=21)/warm(F₉=34) φ-tiered ring of `[nodeCount][28]` lattice snapshots; FNV-1a checksums = determinism oracle; recall feeds the engine through its own sensory door | `tests/field_genome.test.ts` |
| Genome spectral signature ("DNA scan") | `cognition/genome_spectral_signature.ts` | F₁₂=144-tick rolling window; per-component 2-D `spectrumND(node,time)`; standing waves, tempo (centroid), diversity (entropy), whitened fingerprint, Parseval-certified | `tests/genome_spectral_signature.test.ts` |
| Genome replay lever | `cognition/learning_mode.ts`, `cognitive_loop.ts` | REPLAY mode relives genome snapshots through the deterministic door; co-governor defers at the depth ceiling | `tests/learning_mode.test.ts`, `tests/mode-speedup-bench.mjs` |
| Boot wiring | `run_mind_bridge.ts` | `FieldGenome` loaded beside concept geometry; corrupt genome quarantines, never repairs | bridge gates |

**No second genome may be written.** Any "record/replay field history" need is served
by `FieldGenome.record/recall/latest`; any "read the mind's spectrum" need by
`GenomeSpectralSignature.observe/signature`.

### 1.2 Memory & retrieval substrates — *exist, regret-gated*
| System | File | v3 upgrade | Status |
|---|---|---|---|
| HNSW ANN index | `cognition/hnsw_index.ts` | deterministic (hash-derived levels), `exactNearest` ground truth for recall@k | integrated |
| PQ / SQ8 codec (A3) | `cognition/pq_codec.ts` | m=4 subspaces, k=256, deterministic Lloyd, ADC distance, ~14× compression | integrated |
| Concept registry | `cognition/concept_registry.ts` | prototype averaging, capacity F₂₁=10946 | regret-gated |
| Hopfield memory | `cognition/hopfield.ts` | one-step recall, near-dup merge, F₁₁=89 FIFO | regret-gated |
| Memory battery (A4) | `tests/memory-algorithms.test.ts` | **regret bounds** (residual ≤ 4× closed form (1−1/φ²)^t), not curves | 9 tests green |

### 1.3 True vision (P2) — *exists*
`cognition/visual_memory.ts`: **dual hash (A2)** pHash(DCT) ⊕ dHash(gradient) over the
luminance grid; **BK-tree (A1)** O(log n) find-similar over the Hamming metric; AND-gate
"seen before" / OR-gate "candidate"; **hi-res 32×32 DCT descriptor** for discriminate/
verify; novelty-gated bounded store (F₁₄=377), persisted, quarantine-on-corrupt.

### 1.4 De-biasing & provenance (P1, A6) — *exists*
`tests/debiased_naming.test.ts`, `cognition/structured_spine.ts` (no concrete label
without perceptual content; glossary margin φ⁻²); `core/provenance.ts` sha1(model_id ‖
prompt_hash ‖ ts) on every routed output (P9).

### 1.5 Track G (gematria / multi-base / precision / fractals) — *complete*
| Piece | File | Note |
|---|---|---|
| Multi-base + precision ladder (G1) | `core/gematria.ts` | exact remainder; EXACT/FLOAT/BIG tiers |
| Digital-root invariants (G2) | `core/gematria.ts` | `dr_b(n)=n mod(b−1)` re-verified 10⁵×9 |
| Z[φ] exact ring (A8/G3) | `core/gematria.ts` | zero-drift below `PHI_EXACT_HORIZON=76` |
| Zeckendorf addressing (G3) | `core/gematria.ts` | unique non-consecutive Fibonacci sum |
| Fractal diagnostics (G4) | `core/fractal_diagnostics.ts`, `core/fractal_field.ts` | box-counting dim + CI; DSI log-periodicity; census spectrum re-derives Cert 4.D1 |

### 1.6 Track D (scaling/depth collision) — *resolved*
Constants `CENSUS_CAP_DEPTH=8`, `PHI_EXACT_HORIZON=76`, `PHI_OVERFLOW_HORIZON=1435`
hardcoded in `core/constants.ts`. The **A7 co-governor** is real: `hardware_governor.ts`
holds the measured depth-8 ceiling (43,961 nodes, ~282 ms/tick), `learning_mode.ts`
defers replay at the ceiling, `cognitive_loop.ts` journals deferrals honestly. Census
law (Cert 4.D1: 41/281/3401/43961) re-verified in TS by `fractal_diagnostics.ts`.

### 1.7 The rest of the P-series — *exists*
P5 training toggle (`learning_mode.ts`), P6 STT VAD-gated whisper (`adapters/sensors/
stt_whisper.ts`), P7 measured telemetry (`telemetry_tape.ts`), P8 clean responses
(`adapters/clean_response.ts`), AMR Phase-5 boundary closure (`refinement/boundary.ts`).

---

## 2. REMAINING FRONTIER — the honest "not done"

These are the only items the records show as genuinely open. Each is an *integration or
a hardening* of an existing system — none is a new substrate. Gate each before green.

- **F1 — Vision captions, live (P2↔P9 seam).** The vision model path is built but the
  *captioned-frame* loop is env-gated (`integration.ollama`). Work: host a vision model,
  run frames → captions → glossary entries through the existing `visual_memory.observe`
  caption slot. **Extends** `visual_memory.ts` + `ollama_supervisor.ts`; no new index.
  **Gate:** a real frame is captioned and re-found after restart; WER/latency measured.

- **F2 — HNSW served over SQ8 at scale (A3 full activation).** The PQ codec and the
  HNSW index both exist but are not yet composed into one quantized-serving path at the
  F₂₁ cap. Work: route registry vectors through `pq_codec` into the `hnsw_index` serving
  tier; measure recall@k drop (target <2%) and RAM headroom (target ~4×) at 1k/10k/100k.
  **Composes** `pq_codec.ts` + `hnsw_index.ts`; no new codec, no new index.
  **Gate:** recall ≥ baseline −2%, measured log-scale latency, co-governor holds.

- **F3 — Depth ≥7 subtree workers (Track D, D3 lever).** gate M2 deferred per-node
  parallelization because FractalNodes hold per-node learning state. Work: the
  state-serializing subtree-worker module, gated by the co-governor. **Extends**
  `parallel/` + `hardware_governor.ts`. This is the single genuinely-new *module* on the
  frontier — and it is scheduled, bounded, and does not touch the genome or memory tiers.
  **Gate:** forced depth-7→8 transition, no OOM, no eviction storm, regret bounds intact,
  measured tick-time within the 33 ms budget.

- **F4 — End-to-end packaged gate.** The headless `--ci` path needs the electron GUI
  runtime; the packaged build pipeline has not been re-run end-to-end after the recent
  physics/engine work. Work: run the full BUILD+INSTALL bats on a desktop with the GUI
  runtime. **Gate:** packaged app boots, smoke green, no headless-only assumptions.

> **Explicitly NOT on the frontier (already done — do not reopen):** the genome, the
> spectral signature, dual-hash vision, HNSW, PQ/SQ8 codec, Z[φ] exact tier, the
> co-governor, the census law, STT, clean responses, provenance hashing.

---

## 3. Efficiency directive (the "most efficient program" clause)

The project's efficiency is already a *measured* property, not an aspiration. Keep it so:
1. **Memory** — every store is φ-bounded (genome F₈/F₉, visual F₁₄=377, Hopfield F₁₁=89,
   concepts F₂₁). No unbounded structure may be introduced.
2. **Compute** — SQ8 (A3) and BK-tree (A1) exist precisely to collapse RAM and latency;
   F2 completes their composition. No O(n) scan where a metric index exists.
3. **Precision** — the EXACT/FLOAT/BIG ladder (G1) and Z[φ] (A8) keep φ-arithmetic
   drift-free below n=76; nothing exact is ever silently floated.
4. **Governance** — one co-governor owns RAM/depth/precision as coupled resources (A7);
   no independent ceilings that can fight.

---

## 4. Superseded documents

- `MASTER_PLAN_V3.md` — **superseded as a build plan.** Its *direction* and its rigor
  corrections (§0 table) remain the canonical record of *why* the constants are what
  they are; keep it for that. Do not execute it as a to-do list — it is done.
- `GEMATRIA_ENGINE_PLAN.md` (Track G) — **complete.** Keep as the G-series certificate
  record (G1–G5 honesty table). No open work.

*This file is the current plan. Amend §2 as frontier items gate green and move them to §1.*
