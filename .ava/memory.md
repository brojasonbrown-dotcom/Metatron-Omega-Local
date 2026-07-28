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