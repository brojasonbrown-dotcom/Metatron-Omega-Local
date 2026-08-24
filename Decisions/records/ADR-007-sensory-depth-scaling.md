# ADR-007 — Sensory-Depth Scaling (hardware-relative, futureproof)

**Status:** accepted · **Date:** 2026-08-17 · **Track:** extends ADR-001 (training loop) / ADR-002 (cross-modal) / P3 (hi-res percept field)
**Files:** `adapters/sensors/sensory_depth.ts` (NEW — the scaling law), `adapters/sensors/vision_screen.ts` (dial + throttle + observable depth), `run_mind_bridge.ts` (consumer + governor wiring).
**Suite:** 549 passed / 3 skipped (58 files) before AND after — no regression. `tsc --noEmit` exit 0. Dial behavioral proof 8/8.

---

## Context — the gap

The operator's law: *"increase the resolution of the sensory systems so the mind truly
understands what it's learning; sensory depth should scale with the engine and the
hardware, and scale BEYOND modern hardware — futureproof."*

The audit found the machinery existed but was a **dead end**: `HIRES_GRID 233×144`
capture, `hiResFieldFromLuminanceGrid` (a dense multi-scale Fourier encoder that provably
separates near-identical percepts the 14-mode 28-field cannot — k=13 is attenuated φ⁻¹³ ≈
0.002), and `visual_memory`'s 32×32 DCT descriptor — **all built, none wired to production.**
`hiResFieldFromLuminanceGrid` was referenced only by tests; `onHiRes` had no registered
consumer. The engine itself only ever sees the 28-field; hi-res is a *percept-memory*
representation, not an engine input (the honest ceiling — see Risk note below).

## Decision

**A1 — wire the hi-res path.** `run_mind_bridge` now registers a real `onHiRes` consumer:
detail grid → `hiResFieldFromLuminanceGrid` at the resolved octave depth →
`visual_memory.observe` (the persisted 32×32 DCT descriptor that `discriminate()` ranks).
The 28-field fast path is untouched; the registry/gate/codec contract is unchanged.

**A2 — the futureproof scaling dial** (`sensory_depth.ts`). The octave count (the
fine-structure dial: F₄=3 / F₅=6 / F₆=8) follows a **hardware-relative** fill:

    fill = min(depth, maxDepth) / maxDepth

`maxDepth` is the governor's RAM-derived ceiling (`totalmem()` → BYTES_PER_NODE → log₂ →
clamp [1,9]). **Because it scales with the machine, the same dial resolves deeper on bigger
hardware with no retuning — that is the futureproofing.** Bands (φ-lawful thirds): fill ≥ 2/3
→ 8 octaves; ≥ 1/3 → 6; else 3. The live `emaTickMs` throttles to 3 whenever the engine is
over its cadence budget, regardless of structural headroom — perception never competes with
the engine for the tick (E5/E7). At deep headroom the detail grid itself grows φ⁻¹-finer
(233×144 → ~377×233).

## Why hardware-relative and not absolute

An absolute octave count is calibrated to one machine and rots on the next. The fill ratio
is dimensionless: a future machine with more RAM raises `maxDepth`, so the same engine depth
reads as a *smaller* fill and the dial stays honest — or the engine grows deeper into the
new headroom and the dial follows. No per-machine constants; no retuning on upgrade.

## Verification (ground truth)

- **Baseline → after:** `vitest run` **549 passed / 3 skipped (58 files)** both runs; `tsc --noEmit` exit 0.
- **Discrimination ground truth:** `tests/discrimination.test.ts` **9/9** (hi-res field separates percepts the 28-field cannot).
- **Dial behavioral proof (8/8)** — modern depth-6 ceiling vs future depth-9 ceiling:
  - modern 6/6 → 8; 4/6 (fill .67) → 8; 3/6 → 6; 1/6 → 3
  - **future 9/9 → 8; 6/9 (fill .67) → 8; 3/9 → 6** (same fill ⇒ same depth — auto-scales up on bigger hardware)
  - **live overload (ema > budget) → 3 regardless of fill** (throttle holds)
  Probe was a throwaway harness, removed after the run.

## Risks (honest)

1. **PowerShell spawn cost** — the hi-res capture is a second blocking child process per frame.
   *Mitigated:* gated on `MIND_VISION_HIRES=1` AND a registered consumer AND not-live-overload;
   it never blocks the fast path (failure is swallowed, the 28-field still flows).
2. **Encode cost is linear** — O(octaves·angles·W·H); the octave dial is the bound, the
   live throttle is the guard.
3. **The 28-field ceiling is honest** — hi-res enriches *percept memory/recall*, not the
   engine's live 14-mode dynamics. Deepening the engine field itself (FIELD_SIZE > 28) is a
   separate, HIGH-risk cross-cutting track (breaks MASTER_EQUATION_N / DFT / registry / codec)
   and was deliberately NOT attempted here.
4. **Opt-in by construction** — without `MIND_VISION_HIRES=1` + a registered depth source the
   behavior is byte-identical to before. No existing test was modified; none pin the cadence,
   octaves, or grid dims.

## Regression floor (unchanged)

The engine stays conservative; the sensory door is never gated (E5); the fast 89×55→28-field
path is the untouched default. Suite green before AND after; no commit made by this change.
