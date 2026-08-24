# Context — what this project is, and the floors it stands on

## The system

A local, offline computational environment with three cooperating surfaces:

- **`engine/`** — the RHUFT 18-stable-scale engine (TypeScript, vitest).
  Conservative wave propagation, MemoryKernel (λ=φ⁻²), Propagator (ν*=3/2),
  n-D spectral analysis, adaptive mesh. Verified: 432 tests green at baseline.
- **`brain v14/`** — the cognitive mind (TypeScript, Node ≥25 type-stripping,
  vitest). CognitiveLoop (≈146 ms tick ≈ 1000/φ⁴), SensorBus, ConceptRegistry,
  FieldGenome, SpectralMemory, NoveltyGate, LearningModeGovernor (P6-D),
  Hopfield + visual + spectral memory. Verified: 337 tests green at baseline.
- **`app/`** — the Electron desktop UI (vanilla renderer, one IPC bridge).
  EngineLoop service (30 Hz ring), sensory codec (Goertzel φ-band audio +
  golden-spiral Fourier vision → 28-field), MindService sidecar, the Σ
  stability panel. Verified: app smoke (28+ checks) green at baseline.

## The mathematical floor (verified, hardcoded)

- φ = 1.618033988749895; λ = φ⁻² = 0.381966; φ⁻¹ = 0.618034.
- Census law: b(d)=min(Fib(d+1),13); census 41@5, 281@6, 3401@7, 43961@8.
- Concept cap F₂₁ = 10946; census crosses it at depth 8 (CENSUS_CAP_DEPTH=8).
- Precision horizons: φⁿ float64-exact n≤76; overflow k=1435.
- Spectral: 14 φ-spaced modes, 28-element interleaved-complex field.

## Sensory / Fourier / continuity — how they already meet

- Audio: waveform → 14 φ-spaced Goertzel bands (single-bin DFTs).
- Vision: luminance grid → 14 golden-spiral spatial-frequency Fourier modes.
- Both normalise to the SAME 28-element field → one contract, fused by
  coherence in `L4_Sensory` (multi-modal integration).
- Continuity: `ContinuityLaw`, `temporal_engine` (temporal coherence
  C=|<Ψ_t|Ψ_{t-1}>|²/|Ψ_t|²|Ψ_{t-1}|²), `engineLoop` invariants
  (coherence = cos² self-overlap, closure, drift, burden).

## The gap the training-loop work closes

The mind learns only from live external sensors. It does not yet (a) feed
itself the engine's own Fourier/continuity readouts as a first-class internal
sense, (b) apply an explicit measured-coherence retention gate, (c) persist its
learning-mode dial, or (d) surface a dedicated TRAINING FAB. See ADR-001.
