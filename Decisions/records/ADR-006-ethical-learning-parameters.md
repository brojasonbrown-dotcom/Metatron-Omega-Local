# ADR-006 — Ethical Parameters for Enhanced Learning & Information Correlation

**Status:** accepted · **Date:** 2026-08-17 · **Track:** extends ADR-001 (Unified Training Loop) / ADR-002 (Cross-Modal Causal Learning) / ADR-004 (Linguistic Gate)
**Files (this change):** `cognition/cognitive_loop.ts` (W3), `adapters/sensors/audio_mic.ts` (W1), this record.
**Suite:** 549 passed / 3 skipped (58 files) before AND after — byte-for-byte no regression. `tsc --noEmit` exit 0.

---

## Context — the audit that produced these

A read-only deep audit of the live mind (`mind_state/journal.jsonl`, 733,713 entries, ~419 h)
found the architecture sound but the learning efficiency throttled by **measurable, named
bottlenecks** — not design flaws. The honest numbers:

| Signal | Count | Reading |
|---|---|---|
| `sense` | 177,825 | perception constant — no input problem |
| `learn` | **76** | the asymmetry — the bottleneck |
| `prediction` / `verification` | 1,774 / 1,774 | honest learning signal wired + firing |
| `spectral.percept` / `novelty.gate` | 2 / 2 | enrichment + gate almost never fed |
| `replay.deferred` | **546,395** | consolidation requested + deferred 546k× |
| `tool.fail` "queue full — dropped oldest" | 175 | **stable thoughts silently lost** |

Sensory skew: `audio.mic` **159,360 (89.6%)** vs `vision.screen` 18,163 (10.2%). The
cross-modal correlator requires ≥2 modalities in one tick (`cognitive_loop.ts:328`) —
with audio flooding the 89-frame bus (drained ≤5/tick), vision rarely co-arrived and the
correlator starved. **That is why correlation-learning looked absent: starved input, not
a broken instrument.**

### The three weaknesses fixed here (ranked by leverage)

- **W1 — Sensory flood starved cross-modal correlation.** The mic captured unconditionally
  every 5 s. Fixed with a **novelty gate on the continuous mic stream only**, mirroring
  `vision_screen`'s own idiom (`resonance(field, prevField) < COHERENCE_THRESHOLD`, plus a
  force-inject every F₆ = 8 clips so the gate never goes deaf). Dropped `.wav` files are
  operator-curated and **always** learned (never gated). Default ON; `MIND_MIC_GATE=0`
  restores the legacy flood. The throttle is **observable**: a new `micGated` counter in
  `AudioSensorStats` (E7 — deferred work is reported, never silent).
- **W3 — Thought-queue saturation dropped stable thoughts.** `MAX_THOUGHT_QUEUE` was F₄ = 3;
  at a 146 ms tick with a multi-second LLM instrument it saturated and shed the **oldest**
  stable thought (175 measured drops). Raised to **F₇ = 13** — the same φ-lawful Fibonacci
  rung as the SensorBus (F₁₁ = 89) and snapshot cadence (F₇ = 13). Bounded backpressure is
  preserved: a stuck phi still sheds oldest-first.
- **W4 — Instrument flakiness (assessed, no code change warranted).** The failover routing
  in `split_instrument.ts` is already honest: k3 is only called when `k3.available` (a key
  exists). The 401/"no key" noise is **runtime state** (a configured-but-invalid key), not
  a code defect. Fix is operational (set a valid `KIMI_K3_API_KEY` or leave the Kimi toggle
  off) — masking it in code would violate E3.

---

## The Ten Ethical Parameters (law for the learning layer)

Each is **measured, gated, and opt-in** — never a magic constant. All are consistent with
the codebase's existing law (φ-scaled thresholds: λ = φ⁻² = 0.382, high-margin φ⁻¹ = 0.618).

**E1 · Provenance before retention.** Nothing is stored without a traceable provenance hash
(field + sources + labels). No anonymous memory. *(Already `_provenanceHash` — promoted to invariant.)*

**E2 · Measured coherence, never asserted.** Retain only what clears a measured coherence gate
(≥ 0.66 operator dial, A/B against the φ⁻¹ = 0.618 floor — never blurred). The system must never
claim to remember what it did not measure.

**E3 · Correlation ≠ equivalence ≠ causation.** Every correlation is reported with its sample
size n and signed evidence; the system never asserts "A causes B" nor "A is B". The strongest
existing ethical asset — inviolable.

**E4 · Counter-evidence is first-class.** Every held belief is disconfirmable: confidence decays
without re-confirmation; counter-observations subtract. No belief may be unfalsifiable. *(M3.)*

**E5 · The gate never blocks the sensory door.** Gates (novelty, retention, mode) modulate
*learning pressure* only; perception (`engine.process`) is never gated. The system may choose
what to *retain*, never what to *perceive*. *(Invariant — kept: the W1 mic gate throttles a
redundant continuous stream at the sensor, the engine's door stays open for every injected frame.)*

**E6 · Prediction before accretion.** Learning is the *gain* (verified prediction vs the φ⁻¹
prior), never the accumulation. A memory that doesn't improve prediction is not "learned". *(M6.)*

**E7 · Resource honesty — and reported cost.** Retention/replay defer to the HardwareGovernor's
measured ceiling; the system never starves live dynamics to remember. **Corollary (new): deferred
or throttled work is surfaced as an honest counter — never swallowed silently.** The 546,395
silent `replay.deferred` events are why this rule now exists; `micGated` is its first implementation.

**E8 · No fabrication under instrument failure.** When an instrument errors or returns empty, the
system speaks only its true measured labels (the `_selfVoice` fallback), never invents content.
Silence is acceptable; fabrication is not. *(ADR-004 F2/F4.)*

**E9 · Quarantine, never repair.** Corrupt state is quarantined and the mind starts fresh; nothing
is silently patched. Data integrity outranks continuity. *(MemoryStore.)*

**E10 · Cross-modal claims need an anchor.** A between-modality link requires a *measured* anchor
(movement region / separated stream) or lagged precedence — never time-co-occurrence alone. The
system must not wire two percepts together merely because they were simultaneous. *(M1/M4.)*

---

## Verification (ground truth)

- **Baseline:** `vitest run` → 549 passed / 3 skipped (58 files), 25.0 s. `tsc --noEmit` exit 0.
- **After W1+W3:** `vitest run` → **549 passed / 3 skipped (58 files)**, 23.5 s. `tsc --noEmit` exit 0.
  Identical pass count — no regression by construction (all changes additive / opt-out).
- **Behavioral proof (W1):** headless probe, 10 mic clips (9 redundant 440 Hz + 1 novel 3 kHz):
  - Gate **ON** (default): injected **2/10**, `micGated` **8** — the novel clip + the F₆ force-inject passed.
  - Gate **OFF** (`MIND_MIC_GATE=0`): injected **10/10**, `micGated` **0** — legacy flood restored.
  Zero failures in both modes. (Probe was a throwaway harness, not a committed test; removed after the run.)

## What must never happen (the regression floor)

- The engine stays conservative; the sensory door is never gated (E5).
- EFFICIENT-mode behaviour and all existing tests are unaffected; every new path is additive and
  opt-out (`MIND_MIC_GATE=0` restores the legacy mic flood byte-for-byte).
- No existing test was modified. The suite is green before AND after.
- The working tree's unrelated in-flight changes were left untouched; no commit was made by this change.

## Caveat (honest)

W1's gate throttles the **redundant continuous** mic stream; a genuinely quiet-but-varying room
still injects on the F₆ cadence and on any real change, so the mind cannot go deaf — but the
cross-modal correlator's *throughput* still depends on the operator actually pairing vision with
audio in the environment. W2 (gates default-ON via `senseOn`) was a **finding, not a fix**: the
learning stack was never disabled by config — the live deficit was W1's starvation + W3's drops.
The remaining lever is operational: balance the physical sensor feeds and set a valid K3 key.
