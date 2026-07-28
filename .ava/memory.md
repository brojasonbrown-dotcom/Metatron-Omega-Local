#### 2026-07-28
RHUFT 18-File Engine — canonical build plan & current state.

SOURCE OF TRUTH (2 docs, both in notebooks/):
- notebooks/BRAINMAP_18_Scale_Engine.md = WHAT (vision, 18-file roles, L0–L7 layers, build order 1→18, §8 engineering rules).
- notebooks/BRAINMAP_BUILD_SPEC.md = HOW (§3 per-file API/contracts/invariants/test-vectors/done-when; §4 dependency DAG; §2 ground-truth mpmath vectors; §0 blockers B1–B4).

BUILD ORDER: strictly 1→18, topological DAG. Groups: A Foundation (1–4, L0), B Geometry/Lattice (5–8, L1/L2), C Dynamics (9–12), D Information/Matter (13–15), E Assembly/Verification (16–18, L7). File N may only import lower-numbered files. Each file is DONE only when its BUILD_SPEC "Done when" gate passes (vitest + tsc --noEmit).

STATE (verified): Files 1–6 built & green (58 tests): 1 core/constants.ts, 2 core/provenance.ts(+Scaled), 3 core/lucas.ts, 4 core/scaleTable.ts, 5 geometry/torus.ts, 6 geometry/closureResidual.ts. Next: File 7 geometry/lattice.ts.

KNOWN ERRATUM in BUILD_SPEC: flux(13)=φ⁻²⁶ is printed as 5.05×10⁻⁶ (§2 line ~59 and File 7 contract). Correct recomputed value = 3.6840146919×10⁻⁶ (mpmath dps=60). Spec needs patching before File 7.

Tooling: src/compute_engine/engine/ has package.json (type:module), tsconfig (strict, NodeNext, allowImportingTsExtensions, noUncheckedIndexedAccess, exactOptionalPropertyTypes), Vitest. Tests in tests/file<N>.<name>.test.ts.

#### 2026-07-28
GOLDEN RULE — before building/editing ANY RHUFT engine file, EVERY prompt, in this order:
0. LOAD notebooks/CORE_VISION.md FIRST — the distilled brainmap+workflow+golden-rules (§5A build-integrity + §5B craft), always kept in context. It is the condensation of the two full docs and the first thing to read.
1. Read the target file's contract in notebooks/BRAINMAP_BUILD_SPEC.md §3 (API/Depends-on/contracts/test-vectors/Done-when) + confirm its §4 DAG position (imports point downward only).
2. Skim notebooks/BRAINMAP_18_Scale_Engine.md only if CORE_VISION lacks the needed detail (file role, layer, §8 engineering rules).
3. Confirm build state: glob src/compute_engine/engine/src/**/*.ts (which of 1–18 exist) + ensure existing vitest is green (no regression).
4. Verify every numeric test vector against BUILD_SPEC §2 ground truth BEFORE writing (mpmath-derived; never trust a number printed in prose without recomputing — see the φ⁻²⁶ erratum: correct = 3.6840146919×10⁻⁶, spec wrongly prints 5.05×10⁻⁶).
5. Build ONE file at a time, obeying the CRAFT RULES (CORE_VISION §5B): YAGNI, real computation only, never mock/speculate, robust insight over literals, airtight 800-IQ logic, foolproof by construction. Done only when its "Done when" gate passes (vitest green + tsc --noEmit exit 0). Never start file N+1 with N red.
6. After each file, update CORE_VISION.md §7 (build state) and this memory's sibling architecture memory (id 92e9b020).

Authority order: CORE_VISION.md → BUILD_SPEC.md → BRAINMAP vision doc. Conversation memory is volatile; these docs are the authority after any compaction.

#### 2026-07-28
Project folder map (verified) — stop hunting for folders that don't exist.

- The "VAULT" the user refers to = `notebooks/` — the brainmap, vision, build spec, and all RHUFT source `.nb` files (RHUFT_Ultimate_Framework.md, BRAINMAP_*.md, CORE_VISION.md, ~20 .nb notebooks, verification_suite.py).
- There is NO `VAULT/` or `KIMI/` folder in this project (searched, absent). If the user says "KIMI folder with your memories", they mean the assistant-memory store.
- Assistant memory/guidelines (editable) = `.ava/` : `memory.md` (human-readable), `memory.json` (structured entries), `memory/graph.json`. This is what I use to respond and it IS editable via memory_save/memory_update.
- Engine code = `src/compute_engine/engine/` (package.json type:module, tsconfig strict NodeNext, Vitest; src/**/*.ts, tests/file<N>.<name>.test.ts).
- Older engine v14 = `src/compute_engine/brain v14/` (legacy, has FIXES.md).
- Top-level dirs: docs/ (empty), include/, scripts/, tests/, notebooks/, src/, .ava/.

Core vision doc = notebooks/CORE_VISION.md (created 2026-07-28): the always-in-context distilled brainmap + workflow + golden rules. Load it first on any engine task.

#### 2026-07-28
CRAFT RULES — apply to ALL building/editing in this project, not just the RHUFT engine. Kept short; full version lives in notebooks/CORE_VISION.md §5B.

9. YAGNI — build only what the current contract demands; no speculative features, options, or abstraction "for later".
10. REAL COMPUTATION ONLY — every number computed from first principles or measured. NEVER mock, stub, fake, or hardcode a result; no placeholder return values.
11. NO SPECULATION — a value is EXACT / CODATA / POSTULATE / MEASURED; if it can't be computed or provenance-tagged, it does not enter the math.
12. ROBUST INSIGHT, not fragile literals — logic rests on derived relationships (the law), not a constant tuned until tests pass; assert the invariant, not the magic number.
13. 800-IQ RIGOR — structure logic airtight: prove edge cases, close loopholes, handle empty/error/overflow paths. No shortcuts a skeptic could find.
14. FOOLPROOF BY CONSTRUCTION — types + provenance make the wrong thing unrepresentable; the correct path is the only path that compiles and passes.

#### 2026-07-28
RHUFT compute_engine — verified ground truth (2026-07-28 audit).

HARDWARE: RTX 3060 12GB VRAM (compute 8.6), Ryzen 5 5600G (6C), 28GB RAM. 12GB VRAM runs small VLM + phi + mathstral concurrently, all local. Toolchain: Node 25, Python 3.12, git 2.51, gh CLI 2.96, Ollama 0.15.2. NOT a git repo (no undo — quarantine, never hard-delete).

THREE LAYERS under src/compute_engine/:
- engine/ (50M): the clean 18-torus RHUFT brain, 18 src files, 213/213 tests green, tsc exit 0. MultiscaleEngine.step() runs 18 tori × 4 invariants (coherence/closure/drift/burden), cross-scale flux via FluxLedger. DETERMINISTIC, RNG-free, step() takes NO sensory args. SACRED — do not contaminate with LLM.
- app/ (779M): Electron chat UI. Talks to engine/ ONLY. Zero Ollama at runtime. engineLoop.cjs = LIVE 64-node ring @~30Hz using MemoryKernel(λ=φ⁻²)+Propagator(CFL ν=1.0, boundary ν*=3/2 by von Neumann). sensory.cjs = real codec: audio→14 φ-Goertzel bands, vision→14 golden-spiral modes→28-elem unit field. THE REAL-TIME SENSORY LOOP ALREADY EXISTS HERE.
- brain v14/ (5.4G): LEGACY autonomous-mind. FAILS typecheck (frameworks.ts etc). Holds the ONLY LLM interface: adapters/ollama_supervisor.ts (lifecycle, φ-backoff), adapters/llm_tool.ts (LLM-as-instrument, json-schema-validated, Fibonacci timeout ladder 34/55/89s, temp=1/φ²), schemas/validate.ts (rejects invalid LLM output). Plus 5.4G Ollama phi(1.6G)+mathstral(4.1G) public blobs (re-pullable).

KEY HONESTY CONSTRAINTS (zero-mock):
- The ONLY sanctioned sensory injection port into engine dynamics = MemoryKernel.dampedRegularization (exact integrating factor, bounded, never secular). Raw additive form is REJECTED (diverges, dominant root 1.29).
- Engine has NO concept of words. Words live only in LLM layer. Grounding = link stable field-states → LLM labels. No dictionary exists yet.
- A real-time sensory version of the FULL 18-scale brain does NOT exist yet (live loop is a simpler 64-node ring). Must be built via the conservative boundary channel.

#### 2026-07-28
File 19 scaleMeasurement.ts built & calibrated (2026-07-28, commit ddc75af). Scale-native measurement layer for the 18-torus engine — a PURE OBSERVER (reads field state, never mutates dynamics → zero regression by construction; proven by a bit-identical-trajectory test).

WIRED IN: MultiscaleEngine got an opt-in read-only `measurement(fullSweep=true)` method + a persistent `ScaleMeasurer` (holds lag/drift bookkeeping). step() untouched.

PHYSICS (honest provenance):
- resolutionForScale(n): linear map of node-logφ-index (n−1) onto [RES_MIN=8, RES_MAX=128]. Larger scales (more nodes φⁿ⁻¹) resolve finer. Monotone ↑ with n. n=125→128, n=1→8.
- densityOversample(n): linear map of density span (125−n) onto [1, OVERSAMPLE_MAX=16]. Denser (small n, high ρ∝φ⁻ⁿ) oversamples harder. Monotone ↓ with n. n=1→16, n=125→1.
- samples = res²×oversample; total across all 18 ≈ 515k — computable in one live pass.
- phaseLag: MEASURED staleness (field steps since a scale's last completed measurement) + measuredCostMs (wall-clock). NOT asserted as physics — computational, honestly tagged POSTULATE. Dense scales are costlier → phase-skipped via cadenceForScale → observable lag. This is the "computational drift of dense information" the user described.

GOTCHA FIXED: first version had densityOversample = (φ^(125−n))^0.25 = combinatorial explosion (7 BILLION samples on n=27, 3M× on n=1) — demo caught it, tests didn't. Rewrote to info-linear bounded form. LESSON: always live-demo a schedule before trusting it; geometric multipliers on mesh² explode.

Tests: 8 new in tests/file19.scaleMeasurement.test.ts (resolution monotone, oversample bounded+monotone, largest-first, 4 invariants each, phase-lag measured, ZERO-REGRESSION purity, determinism, guards). Full battery 221/221 (was 213), tsc exit 0. Commits: 4bac30a baseline, 1f4ef3e file19, ddc75af calibration.

#### 2026-07-28
# Brain v14 — blobs/manifests handling + learning architecture

## Blobs (the 5.4GB) — handled 2026
- `src/compute_engine/brain v14/{blobs,manifests}/` = a local **Ollama model store** (phi 2.7B language + mathstral 7B math), NOT linguistic data files.
- The two big blobs are GGUF model weights (1.6GB + 4.1GB); small ones are license/template/params JSON.
- User decision: **never push blobs to GitHub**. Purged from git history (was in the 4bac30a baseline commit, removed via amend + gc). `.gitignore` now has `**/blobs/`. Repo .git went 5.34 GiB → 191 MB. Blobs remain on disk. Manifests ARE committed (tiny JSON, re-pullable models via `ollama pull phi` / `ollama pull mathstral`).
- Remote: github.com/brojasonbrown-dotcom/Brain-v14.4 — remote history (e3fb537) is UNRELATED to local (no common ancestor). Push requires force / reconcile — user to decide.

## How the mind learns (the loop)
1. **Engine is the learner, LLMs are instruments** ([PHIL]): "The LLMs are NOT the mind. The engine remains the sole locus of learning."
2. **Language codec** (`adapters/language_codec.ts`): text → 28-element interleaved-complex field via Latin gematria (a-i=1-9, j-r=10-90, s-z=100-800) + 14 φ-weighted DFT modes (amplitude φ^(-k/2), golden phase θ_k=2πkφ⁻¹/89), mean-removed, L2-normalized. Similarity = resonance kernel C(a,b)=|⟨a|b⟩|²/(|a|²|b|²) — same kernel everywhere.
3. **Cognitive loop** (146ms = 1000/φ⁴ tick): SENSE (drain ≤5 frames → engine.process) → DETECT (ExistenceDetector, stable thought after ≥3 ticks) → RECOGNIZE (resonance vs ConceptRegistry, λ=1/φ²≈0.382) → ACT (DriveArbiter picks name/define/relate/verify) → VOICE (phi phrases, spoken) → PERSIST.
4. **Closed learning loop**: every validated LLM answer is `encodeText`'d and pushed back through the SensorBus as "llm.answer" → next tick's engine.process() physically learns it (L1_Pattern/L2_Hebbian/L4′).
5. **ConceptRegistry**: prototype = 28-elem field, learning = φ-decayed reinforcement (η=1/φ²), recognition = top resonance ≥ λ; mints new concept below threshold; cap 10946 (F_21), evicts weakest; labels capped at 13/concept.
6. **DriveArbiter**: curiosity = φ-weighted (novelty φ⁻¹, surprise φ⁻², richness φ⁻³). Bootstrap = first 144 stable thoughts MUST act. After: curiosity gate rises as lexicon deepens. Unknown→name, shallow→define/relate, structure pressure→verify (mathstral).
7. **LLM instruments** (`llm_tool.ts`): phi (nameThis/define/relate/phrase), mathstral (verifyStructure). JSON format-constrained, schema-validated, retry on φ-ladder timeouts (34s/55s/89s), temp=1/φ²≈0.382, one call in flight per model. Never mocked.
8. **Persistence** (`memory_store.ts`): mind_state.json (schema-validated, atomic tmp+rename, corrupt→quarantine) + append-only journal.jsonl audit trail.

Everything is φ/Fibonacci-proportioned [SPEC]: tick 146ms, snapshot every 13 thoughts / 987 ticks, max frames 5, thought queue 3, 13 warmup attempts, labels ≤13.

#### 2026-07-28
# Brain v14 — No-Regression Baseline (captured 2026, before hardening work)

Run in `src/compute_engine/brain v14/`:
- `npm run typecheck` → **PASS**. Custom gate (scripts/typecheck_mind.mjs): mind-layer errors must be **0** (adapters/, cognition/, schemas/, tests/, run_mind.ts); legacy errors (frameworks.ts, RHUFTFrameworks.ts, compute_worker.ts, GeometricReflection.ts, membrane_stabilizer.ts, resonance_finder.ts, SpherePrinciple.ts) are gated at a **baseline of 45** — count may never EXCEED 45. Legacy errors don't affect runtime (Node ≥25 type-strips).
- `npm test` (vitest run) → **61 passed, 2 skipped** (integration.ollama.test.ts skips without a live Ollama). 5 test files: language_codec, drive_thought, sensors, registry_persistence, integration.ollama.
- Node v25.8.1. vitest 2.1.9. No vitest config file (defaults). TS 5.6.

Any hardening/memory work must keep: typecheck PASS (mind-layer 0, legacy ≤45) and all 61 unit tests green. Run both after every change before calling it done.