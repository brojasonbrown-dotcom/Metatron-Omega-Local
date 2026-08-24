# ADR-001 — Unified Training Loop (coherence-gated, Fourier-fused)

**Status:** accepted · **Date:** 2026-08-10 · **Track:** extends P6-D (learning mode) / P2 (vision) / P7 (telemetry)

## Decision

Close the self-training loop across the three surfaces so the mind learns from
**its own instruments as well as its senses**, retains only **measured-coherent**
information, and exposes the whole thing as a persisted **TRAINING** control.

Four additions, all opt-in and governor-bounded:

1. **RetainedMemory governor** (`cognition/retained_memory.ts`) — a pure gate:
   store a percept/thought only when its measured coherence **≥ 0.66** AND it is
   novel (z-gate) AND the HardwareGovernor reports RAM headroom. Disabled by
   default → byte-for-byte today's behaviour.
2. **TelemetryTape** (`cognition/telemetry_tape.ts`) — encodes the engine's live
   Fourier spectrum + the four continuity invariants (coherence, closure, drift,
   burden) into the SAME 28-element field contract and pushes it onto the
   SensorBus as an internal sense (`engine.fourier`). No new math invented.
3. **Loop closure** (`cognitive_loop.ts`) — every validated tool cycle is
   re-encoded and re-injected through the bus (`llm.answer`); coherent stable
   thoughts feed RetainedMemory. TRAINING raises the rate (governor-bounded);
   REPLAY adds idle genome sweeps.
4. **Persistence + UI** — the learning-mode dial and retention toggle persist in
   MemoryStore and restore on boot; a dedicated TRAINING FAB surfaces mode,
   retained count, coherence-gate readout, and tape rate.

## Why these choices (and not the alternatives)

- **0.66 as a measured gate, not a magic constant.** The codebase forbids
  unverified constants; the law is φ-scaled (0.382 / 0.618). 0.66 is therefore
  implemented as a *measured retention threshold* in a dedicated, tested module
  — its effect on retention quality is observable — never hardcoded as "exact".
- **Re-use the 28-field contract** for telemetry instead of a parallel schema:
  the SensorBus, validators, and NoveltyGate all already speak it. Exploit,
  don't invent.
- **Gate default OFF.** Every new path is inert until enabled, so the green
  baseline (engine 432 / brain 337 / app smoke) cannot regress by construction.

## What must never happen (the regression floor)

- The engine stays conservative; telemetry is read-only off the field.
- EFFICIENT mode behaviour is unchanged.
- No existing test is modified; all new code is additive and opt-in.
- Gate: full harness green before AND after each package.
