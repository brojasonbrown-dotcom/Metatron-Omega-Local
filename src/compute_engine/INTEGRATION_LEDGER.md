# RHUFT Unified Engine — Master Integration Ledger

**Purpose:** the per-file checklist for the engine + mind unification. Every source
file in both trees, classified by role, integration status, and the pipeline /
connection it participates in. We work through this one file at a time, no skips,
no regressions. Status legend: `[x]` integrated/verified · `[~]` in progress · `[ ]` pending.

**Ground truth (verified 2026-08-09):** unified strict gate green — engine `tsc` exit 0,
v14 `tsc` exit 0, unified suite **759 passed / 2 skipped / 65 files**.

---

## A. ENGINE — verified multiscale core (34 src / 31 tests)

Public barrel: `engine/src/index.ts` (7 namespaced layers). All files compile under
the strict soundness core. Suite: 422 tests green.

### core/ — constants, provenance, Lucas ladder, scale table (no deps)
- [x] `core/constants.ts` — provenance-tagged constants (PHI full-precision, PLANCK_* CODATA, C exact). **Canonical source of truth for M4.**
- [x] `core/lucas.ts` — Lucas-stable rung computation, closure residue
- [x] `core/provenance.ts` — provenance tags (EXACT/CODATA/DERIVED/POSTULATE)
- [x] `core/scaleTable.ts` — `getScale(n)` stable-rung records (Scaled arithmetic)
- [x] `core/index.ts` — layer aggregator (barrel)

### geometry/ — torus, closure, lattice, basis
- [x] `geometry/torus.ts` — `torusForScale(n)` toroidal geometry
- [x] `geometry/closureResidual.ts` — closure residual of the recursion
- [x] `geometry/lattice.ts` — Metatron lattice / spectral amplitudes
- [x] `geometry/basisGenerators.ts` — L2 basis, Legendre/spherical modes
- [x] `geometry/index.ts` — aggregator

### dynamics/ — memory, propagation, self-measurement, cross-scale flow
- [x] `dynamics/memoryKernel.ts` — memory kernel (Field/FieldValue types)
- [x] `dynamics/propagation.ts` — field propagation
- [x] `dynamics/selfMeasurement.ts` — self-measurement operator
- [x] `dynamics/crossScaleFlow.ts` — cross-scale information flow
- [x] `dynamics/index.ts` — aggregator

### information/ — density, burden, actualizer
- [x] `information/densityField.ts` — information density field
- [x] `information/burden.ts` — burden integral
- [x] `information/actualizer.ts` — actualization
- [x] `information/index.ts` — aggregator

### analysis/ — read-only observers (spectral / eigenmode / radial / resolution)
- [x] `analysis/spectralND.ts` — N-dimensional spectral analysis
- [x] `analysis/eigenmodes.ts` — eigenmode decomposition
- [x] `analysis/radialTransform.ts` — radial transform
- [x] `analysis/complexityProbe.ts` — complexity probe
- [x] `analysis/resolutionLadder.ts` — φ-graded Fibonacci resolution ladder
- [x] `analysis/toroidalFlow.ts` — toroidal flow analysis
- [x] `analysis/index.ts` — aggregator

### refinement/ — adaptive mesh refinement (AMR)
- [x] `refinement/curvature.ts` — curvature estimate
- [x] `refinement/criterion.ts` — refinement criterion
- [x] `refinement/octree.ts` — octree partition (**M5 composition target**)
- [x] `refinement/node.ts` — mesh node
- [x] `refinement/prolongation.ts` — coarse→fine transfer
- [x] `refinement/restriction.ts` — fine→coarse transfer
- [x] `refinement/adaptiveMesh.ts` — AMR driver
- [x] `refinement/constants.ts` — refinement-local constants
- [x] `refinement/index.ts` — aggregator

### engine/ — assembly, morphism, measurement, gate
- [x] `engine/multiscaleEngine.ts` — the assembled multiscale engine
- [x] `engine/morphismPipeline.ts` — scale-to-scale morphism pipeline
- [x] `engine/scaleMeasurement.ts` — scale measurement
- [x] `engine/resonanceScanner.ts` — resonance scanner
- [x] `engine/verificationSuite.ts` — CI verification battery
- [x] `engine/index.ts` — aggregator

---

## B. BRAIN V14 — mind / cognition layer (82 src / 34 tests)

Public barrel: `index.ts` (already existed). Now compiles with **0 errors** under the
unified strict config (Option B complete). Suite: 335 tests green.

### core/ — v14's own constants + the new indexing accessor
- [~] `core/constants.ts` — v14 constants (LESS precise: PHI 15-digit, PLANCK_LENGTH 4-sig). **M4: re-export engine's proven constants as single source.**
- [x] `core/indexing.ts` — bounds-checked `at()` accessor (Option B deliverable)

### φ-power / scale-law re-derivation files (M4 single-source candidates)
These 25 files recompute φⁿ via `Math.pow(PHI, …)`. M4 routes them to the shared
Scaled φ-power helper (arbitrary n, exact) — NOT to the stable-only `getScale`.
- [ ] `scale_mapper.ts` — the scale-law API (compute_length/frequency/coherence)
- [ ] `types.ts` — shared types + φ-power usage
- [ ] `compute_worker.ts` — worker compute
- [ ] `fractal_node.ts` — fractal node (**M5 composition target**)
- [ ] `frameworks.ts` — framework assembly
- [ ] `ContinuityLaw.ts` — continuity law
- [ ] `DimensionalStability.ts` — dimensional stability
- [ ] `GeometricReflection.ts` — geometric reflection
- [ ] `InterferenceStructure.ts` — interference structure
- [ ] `MultiscaleStabilization.ts` — multiscale stabilization
- [ ] `RecursiveSelfMeasurement.ts` — recursive self-measurement
- [ ] `actualization_engine.ts` — actualization engine
- [ ] `existence_detector.ts` — existence detector
- [ ] `information_density.ts` — information density
- [ ] `membrane_stabilizer.ts` — membrane stabilizer
- [ ] `resonance_finder.ts` — resonance finder
- [ ] `self_measurement.ts` — self-measurement
- [ ] `sphere_geometry.ts` — sphere geometry
- [ ] `worker_script.ts` — worker script
- [ ] `adapters/language_codec.ts` — language codec
- [ ] `adapters/ollama_supervisor.ts` — ollama supervisor
- [ ] `adapters/sensors/signal_codec.ts` — signal codec
- [ ] `cognition/drive_arbiter.ts` — drive arbiter
- [ ] `parallel/node_compute.ts` — parallel node compute

### cognition/ — concept, memory, gating, learning (24 files)
- [x] `cognition/cognitive_loop.ts` — the main loop
- [x] `cognition/concept_registry.ts` — concept registry
- [x] `cognition/hopfield.ts` — Hopfield associative memory
- [x] `cognition/hnsw_index.ts` — HNSW nearest-neighbour index
- [x] `cognition/pq_codec.ts` — product-quantization codec
- [x] `cognition/memory_store.ts` — persistent memory store
- [x] `cognition/lexicon.ts` / `lexicon_triples.ts` — lexicon
- [x] `cognition/glossary.ts` — concept glossary
- [x] `cognition/linguistic_gate.ts` — linguistic gate
- [x] `cognition/instrument_router.ts` — instrument router
- [x] `cognition/learning_mode.ts` — learning mode
- [x] `cognition/novelty_gate.ts` — novelty gate
- [x] `cognition/prediction_ledger.ts` — prediction ledger
- [x] `cognition/record_perceptron.ts` — record perceptron
- [x] `cognition/resonance_manifold.ts` — resonance manifold
- [x] `cognition/spectral_memory.ts` — spectral memory
- [x] `cognition/thought.ts` — thought assembly
- [x] `cognition/visual_memory.ts` — visual memory
- [x] `cognition/field_genome.ts` / `genome_spectral_signature.ts` — genome
- [x] `cognition/drive_arbiter.ts` — drive arbiter

### adapters/ — I/O, LLM tools, sensors, codecs (20 files)
- [x] `adapters/llm_tool.ts` / `kimi_k3_tool.ts` — LLM tools
- [x] `adapters/split_instrument.ts` — split instrument (failover)
- [x] `adapters/language_instrument.ts` / `language_codec.ts` / `structured_codec.ts` — language
- [x] `adapters/mind_bridge.ts` — mind bridge (app seam)
- [x] `adapters/ollama_supervisor.ts` — model supervisor
- [x] `adapters/phasor_field.ts` — phasor field
- [x] `adapters/domain_curriculum.ts` — domain curriculum
- [x] `adapters/voice_out.ts` — voice output
- [x] `adapters/sensors/*` (8) — audio_mic, sensor_bus, signal_codec, spectral_audio, spectral_enrichment, spectral_perception, text_feed, vision_files, vision_screen

### parallel/ — worker parallelism (4 files)
- [x] `parallel/parallel_engine.ts` / `node_compute.ts` / `node_worker.ts` / `layout.ts`

### schemas/ — validation
- [x] `schemas/validate.ts` — schema validation

### root mind files (remaining)
- [x] `index.ts` — v14 barrel (pre-existing)
- [x] `run_mind.ts` / `run_mind_bridge.ts` — sidecar entry points (app spawns these)
- [x] `fractal_node_engine.ts`, `hardware_governor.ts`, `torus_recurrence.ts`, `MultiscaleClosure.ts`, `NecessityComplexity.ts`, `PerfectionDeficit.ts`, `SpherePrinciple.ts`, `complementary_field.ts`, `interdimensional_flow.ts`, `worker_pool.ts`, `BurdenTracker.ts`, `temporal_engine.ts`, `scale_mapper.ts`

---

## Integration milestones
- [x] **M1** — unified strict gate (tsconfig.base.json + vitest workspace); 757 green
- [x] **Option B** — v14 to zero strict errors (913→0); both typechecks exit 0
- [x] **M2** — engine public API barrel + 7 layer aggregators + runtime proof; 759 green
- [x] **M4** — single-source PLANCK_LENGTH/SPEED_OF_LIGHT from engine CODATA (the only real divergence; φ-family already Float64-identical). PLANCK_FREQUENCY now derived c/ℓ_P.
- [x] **M5** — dual-registry reconciler `engine/src/core/scaleReconciler.ts` (nearestStableRung / scaleLengthAt / scaleFrequencyAt / reconciliationResidual / stableRecordAt) + 8-test proof; 767 green. **Finding:** fractal_node↔octree direct composition is a CATEGORY ERROR — FractalNode recurses over the scale ladder (flat 1D field), Octree refines a 2D toroidal (u,v) domain; different trees over different spaces. The reconciler is the correct bridge.
- [x] **M6** — unified barrel `index.ts` (`core` + `mind` namespaces) + proof test (lives in the v14 project so the engine's NodeNext compilation stays pure); 769 green, both typechecks exit 0.

**Invariant throughout:** after EVERY file, `npm run typecheck` exit 0 AND
`npx vitest run` green (currently 759). One file at a time; tick off as verified.
