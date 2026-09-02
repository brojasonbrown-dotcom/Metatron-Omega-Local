# BRAINMAP — Metatron Ω Local (full project map)

Generated: 2026-09-02 · Repo: `brojasonbrown-dotcom/Metatron-Omega-Local` · Branch: `main`

## 1. Where things went wrong (diagnosis)

1. **`main` has diverged.** GitHub (`origin/main`) has commit `750b762` "Add files via upload" — a 22 MB `Metatron Omega.zip` at repo root containing only presentation material (27 JPEGs, 8 figure PNGs, 1 PPTX). Local `main` has commit `e235200` (obsidian MCP swap) that is **not pushed**. Neither side contains the other — this must be reconciled before any push.
2. **The brain IS on GitHub, but buried.** The actual Metatron Ω engine — 136 files — lives at `src/compute_engine/omega/` (the "certified trunk"), three levels deep. Browsing the repo root shows no obvious brain; the only root-level "Metatron Omega" artifact is the zip of slides/images. It *looks* missing even though the source is pushed.
3. **The mind's memory is local-only by design.** `.Omega/` (brain.json, graph.json, memory.json/md — the learned state), `sandbox/`, and `.obsidian/` are gitignored. They will never appear on GitHub unless that policy is deliberately changed.
4. **A stale duplicate exists only locally.** `src/compute_engine/Metatron Omega/` (29 MB, old vite/bun web export) is gitignored as superseded by `src/compute_engine/omega/` — it exists on disk but not in git, another source of confusion about "where the system is".
5. **Empty scaffold directories.** `docs/`, `include/compute/`, `tests/unit/`, `tests/benchmarks/` exist on disk but contain **zero files** — git tracks nothing in them.
6. **Orphaned root `node_modules/`** (with `.vite` cache) exists with **no root `package.json`** — leftover from the abandoned web build. Safe to delete.
7. **Secrets hygiene.** `.mcp.json` (gitignored, correct) contains a **live GitHub PAT in plaintext** — rotate it, it has been exposed in plain view. `.env` *is* tracked; per `.gitignore` comments it holds only devcontainer build config, but that should be re-verified.

## 2. What is on GitHub vs. local-only

| Area | Tracked | On GitHub | Notes |
|---|---|---|---|
| `src/compute_engine/omega/` (brain, 136 files) | yes | yes | the certified trunk |
| `src/compute_engine/app/` (Electron UI) | yes (src only) | yes | 779 MB local incl. node_modules/release — artifacts ignored |
| `notebooks/` (178 files incl. brain architecture.nb, BRAINMAP_*.md) | yes | yes | |
| `Decisions/` (ADRs 012–015) | yes | yes | |
| `scripts/`, `devcontainer*.json`, `Makefile`, `CMakeLists.txt` | yes | yes | |
| `Metatron Omega.zip` | — | **yes (only on GitHub)** | web upload, slides not code; candidate for removal |
| `.Omega/` (mind memory) | no | no | gitignored — local-only by design |
| `sandbox/` (study scripts, OMEGA reports) | no | no | gitignored |
| `src/compute_engine/Metatron Omega/` | no | no | stale duplicate, gitignored |
| `.mcp.json`, `.env.local`, `.obsidian/`, `.pytest_cache/` | no | no | secrets / local state |
| `docs/`, `include/`, `tests/` | — | — | empty dirs |

## 3. Full tracked file tree (368 files, every one — no skips)

.devcontainer/
  Decisions/
    context.md
    overview.md
.vscode/
  extensions.json
  settings.json
Decisions/
  records/
    ADR-012-installer-hardening-build-outside-tree.md
    ADR-013-sensory-actualization-single-encode.md
    ADR-014-sensory-grounding-perception-learning.md
    ADR-015-language-codec-certified-trunk.md
notebooks/
  01_introduction.md
  02_geometric_framework.md
  03_frequency_correction.md
  04_master_equation.md
  1-Planck foam.nb
  18scales testbed.nb
  18scales testbednb.nb
  2-Quark core.nb
  AdaptiveCA.ts
  BRAINMAP_18_Scale_Engine.md
  BRAINMAP_BUILD_SPEC.md
  CORE.nb
  CORE_VISION.md
  Constitutive law.nb
  Core logic.nb
  GEMATRIA_ALPHABET.md
  Latex summary .nb
  MEMORY_ALGORITHMS.md
  NeuralPhiCascade.ts
  PHILOSOPHICAL_FOUNDATION.md
  PhonemeRouting.ts
  PinealCore.ts
  Planck Foam.nb
  PredictiveCoder.ts
  QualiaCorrelate.ts
  RHUFT -appendix.txt
  RHUFT ontology.nb
  RHUFT-NEWEST.txt
  RHUFT_Ultimate_Framework.md
  RHUFT_v5.0_Master_Index.md
  RHUFT_v5.1_Integrated_Framework.md
  RHUFT_v6.0_Integrated_Framework.md
  RHUFT_v6.0_Master_Index.md
  ResonanceBands.ts
  RhuftArrowOfTime.ts
  RhuftConsciousnessThreshold.ts
  RhuftDuality.ts
  RhuftElectromagnetism.ts
  RhuftGalacticCoherence.ts
  RhuftGenerationsCascade.ts
  RhuftMassQuantum.ts
  RhuftMasterEquation.ts
  RhuftObserverEffect.ts
  ScaleDrift.ts
  SceneRecognition.ts
  SelfReflection.ts
  SuperpositionField.ts
  TOROIDAL_FLOW.md
  ThreeSixNine.ts
  TriadicLogic.ts
  Untitled-1.nb
  Untitled-11.nb
  Untitled-12.nb
  Untitled-13.nb
  Untitled-2.nb
  Untitled-3.nb
  Untitled-4.nb
  Untitled-5.nb
  Untitled-6.nb
  Untitled-8.nb
  Untitled-9.nb
  brain architecture.nb
  ensureSymlink.md
  math corridor.jpeg
  metatron math architectures.nb
  phenomenon_01_double_slit.md
  phenomenon_02_mass_emergence.md
  phenomenon_03_gravity_gradient.md
  phenomenon_04_inertia.md
  phenomenon_05_electromagnetism.md
  phenomenon_06_gravity_compression.md
  phenomenon_07_entanglement.md
  phenomenon_08_time.md
  phenomenon_09_consciousness.md
  phenomenon_10_light.md
  phenomenon_11_particle_diversity.md
  phenomenon_12_titius_bode.md
  phenomenon_13_dark_matter.md
  phenomenon_14_cmb.md
  phenomenon_15_baryon_asymmetry.md
  phenomenon_16_mass_values.md
  phenomenon_17_generations.md
  phenomenon_18_vacuum.md
  phenomenon_19_neutrinos.md
  phenomenon_20_black_holes.md
  phenomenon_21_tunneling.md
  phenomenon_22_duality.md
  phenomenon_23_proton_radius.md
  phenomenon_24_zpe.md
  phenomenon_25_nonlocality.md
  phenomenon_26_macroscopic.md
  phenomenon_27_inflation.md
  phenomenon_28_arrow_time.md
  phenomenon_29_vacuum_paradox.md
  phenomenon_30_dna.md
  phenomenon_31_toroidal.md
  phenomenon_32_spin.md
  phenomenon_33_propulsion.md
  phenomenon_34_time_crystals.md
  phenomenon_35_flower_of_life.md
  phenomenon_36_resonant_freq.md
  phenomenon_37_neural.md
  phenomenon_38_mass_illusion.md
  tech_01_qsps.md
  tech_02_rfs.md
  tech_03_mass_null.md
  tech_04_fbci.md
  tech_05_ceai.md
  tech_06_mind_mapper.md
  tech_07_nqhc.md
  tech_08_sensor.md
  tech_09_rhc.md
  tech_10_memory.md
  tech_11_energy.md
  tech_12_resonator.md
  tech_13_vacuum.md
  tech_14_bio.md
  tech_15_neural.md
  tech_16_psi.md
  v6_01_introduction.md
  v6_02_geometric_framework.md
  v6_03_frequency_correction.md
  v6_04_master_equation.md
  v6_phenomenon_01_double_slit.md
  v6_phenomenon_02_mass_emergence.md
  v6_phenomenon_03_gravity_gradient.md
  v6_phenomenon_04_inertia.md
  v6_phenomenon_05_electromagnetism.md
  v6_phenomenon_06_gravity_compression.md
  v6_phenomenon_07_entanglement.md
  v6_phenomenon_08_time.md
  v6_phenomenon_09_consciousness.md
  v6_phenomenon_10_light.md
  v6_phenomenon_11_particle_diversity.md
  v6_phenomenon_12_titius_bode.md
  v6_phenomenon_13_dark_matter.md
  v6_phenomenon_14_cmb.md
  v6_phenomenon_15_baryon_asymmetry.md
  v6_phenomenon_16_mass_values.md
  v6_phenomenon_17_generations.md
  v6_phenomenon_18_vacuum.md
  v6_phenomenon_19_neutrinos.md
  v6_phenomenon_20_black_holes.md
  v6_phenomenon_21_tunneling.md
  v6_phenomenon_22_duality.md
  v6_phenomenon_23_proton_radius.md
  v6_phenomenon_24_zpe.md
  v6_phenomenon_25_nonlocality.md
  v6_phenomenon_26_macroscopic.md
  v6_phenomenon_27_inflation.md
  v6_phenomenon_28_arrow_time.md
  v6_phenomenon_29_vacuum_paradox.md
  v6_phenomenon_30_dna.md
  v6_phenomenon_31_toroidal.md
  v6_phenomenon_32_spin.md
  v6_phenomenon_33_propulsion.md
  v6_phenomenon_34_time_crystals.md
  v6_phenomenon_35_flower_of_life.md
  v6_phenomenon_36_resonant_freq.md
  v6_phenomenon_37_neural.md
  v6_phenomenon_38_mass_illusion.md
  v6_tech_01_qsps.md
  v6_tech_02_rfs.md
  v6_tech_03_mass_null.md
  v6_tech_04_fbci.md
  v6_tech_05_ceai.md
  v6_tech_06_mind_mapper.md
  v6_tech_07_nqhc.md
  v6_tech_08_sensor.md
  v6_tech_09_rhc.md
  v6_tech_10_memory.md
  v6_tech_11_energy.md
  v6_tech_12_resonator.md
  v6_tech_13_vacuum.md
  v6_tech_14_bio.md
  v6_tech_15_neural.md
  v6_tech_16_psi.md
  verification_suite.py
scripts/
  wolfram/
    wa-utils.wls
    wolfram-utils.wls
  setup-compute-env.sh
  wolfram-smoke-test.wls
src/
  compute_engine/
    app/
      build/
        icon.ico
        icon.png
      electron/
        documentIngest.cjs
        llmClient.cjs
        main.cjs
        omega-bundle.cjs
        omegaLoop.cjs
        omegaResponder.cjs
        preload.cjs
        sensory.cjs
      renderer/
        chat.js
        fab.js
        index.html
        layout.js
        sensors.js
        styles.css
      scripts/
        build-driver.mjs
        bundle-omega.mjs
        make-icon.py
        pre-pack.mjs
        smoke.mjs
      BUILD-OMEGA.bat
      LAUNCH-OMEGA.bat
      README.md
      electron-builder.yml
      omega-split.png
      package-lock.json
      package.json
    omega/
      docs/
        BRAINMAP.md
      packages/
        field-kernel-core/
          src/
            cos.ts
            index.ts
            kernel.ts
            localUpdate.ts
            lyapunov.ts
            measurement.ts
            portFlags.ts
            state.ts
          package.json
          tsconfig.json
        trnn-core/
          src/
            algebra/
              clifford.ts
            cell/
              closure.ts
              memory.ts
              organs.ts
              update.ts
            cognition/
              concepts.ts
              mind.ts
              selfModel.ts
            core/
              complex.ts
              constants.ts
              determinism.ts
              dmath.ts
              fibonacci.ts
              indexing.ts
              scaleLadder.ts
              window.ts
            engine/
              MultiTorusEngine.ts
              SingleTorusEngine.ts
            fractal/
              nest.ts
              pool.ts
            genome/
              record.ts
            harness/
              abstention.ts
              battery.ts
              certify.ts
              conformal.ts
              golden.ts
              latency.ts
            learn/
              battery.ts
              cell.ts
              mixer.ts
              params.ts
              spectralAttention.ts
              spectralFilter.ts
              tiers.ts
            ledger/
              canonical.ts
              merkle.ts
              sth.ts
            measure/
              coherence.ts
              state.ts
              transcription.ts
            memory/
              braid.ts
              turingTape.ts
            runtime/
              calibrate.ts
              governor.ts
              hardware.ts
              host.ts
              profiles.ts
              runLedger.ts
              views.ts
            sense/
              encode.ts
              fusion.ts
              nodeArray.ts
              perception.ts
              plane.ts
              scan.ts
            spectral/
              fft.ts
              laplacian.ts
              radial.ts
              site.ts
              sphere.ts
            substrate/
              causal.ts
              coherenceKernel.ts
              correlation.ts
              dmd.ts
              phiSubstrate.ts
              plasticity.ts
              resonanceBus.ts
              signalStats.ts
              vsa.ts
            sweeps/
              tenSweep.ts
            torus/
              eigenmodes.ts
              lattice.ts
              superposition.ts
            web/
              coupling.ts
              fluxLedger.ts
              morphism.ts
              octave.ts
              ordering.ts
            index.ts
          test/
            a0-laplacian.test.ts
            b0-fft.test.ts
            b1-efit.test.ts
            f0-nesting.test.ts
            f1-clifford.test.ts
            g0-foundation.test.ts
            g1-single-torus.test.ts
            g2-spectral.test.ts
            g3-web.test.ts
            g4-runtime.test.ts
            g5-views.test.ts
            g6-sense-memory.test.ts
            g7-cognition.test.ts
            g8-learning.test.ts
            n0-organs.test.ts
            n1-sensory-nodes.test.ts
            n2-rung-scan.test.ts
            oracle.ts
            p8-perception.test.ts
            r0-substrate-parity.test.ts
            r1-innovation-coherence.test.ts
            r2-correlation-stack.test.ts
            r3-causal-layer.test.ts
            r4-resonance-bus.test.ts
            r5-vsa-plasticity-dmd.test.ts
            r6-ledger-genome.test.ts
            r7-ten-sweep.test.ts
            r8-harness.test.ts
            s0-oracle.test.ts
            s1-measurement.test.ts
            s2-constants.test.ts
            s3-window.test.ts
            s4-iss.test.ts
            s5-dmath.test.ts
            s5-environment.test.ts
            w2-warm-coherence.test.ts
          package.json
          tsconfig.json
      .gitignore
      .prettierignore
      .prettierrc
      README.md
      package-lock.json
      package.json
      tsconfig.json
      vitest.config.ts
    package-lock.json
    package.json
    tsconfig.base.json
    vitest.workspace.ts
.env
.gitignore
.mcp.example.json
CMakeLists.txt
Makefile
Untitled.base
devcontainer.compute.json
devcontainer.json
pyproject.toml
requirements.txt