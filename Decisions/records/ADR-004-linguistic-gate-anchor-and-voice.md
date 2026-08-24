# ADR-004 — Linguistic gate anchor geometry + voice reliability

**Date:** 2026-08-13 · **Status:** shipped + measured · **Files:** `cognition/linguistic_gate.ts`, `adapters/llm_tool.ts`, `adapters/ollama_supervisor.ts`, `tests/gate-soundness-dspace.mjs`

## Context
A pentest of the Ollama + linguistic layers (live phi/mathstral + persisted `mind_state`) found the belief-gate and voice had real, measurable defects that made the mind "forget" its own words and fall silent.

## Findings → Fixes (all measured, before → after)

**F1 — Gate rejected the concept's own bound labels (false negatives).**
`LinguisticGate` scored a word against a *normalized bundle* of label atoms. `bundle()` normalizes the sum, so a bound label's self-similarity decays as **1/√n** (measured: n=1→1.00, n=4→0.50, n=6→0.41) and drops below λ=φ⁻²=0.382 past ~4 labels. Real mind read ownMin 0.265–0.705; c2/c6 rejected their own names (`admitted 0/4`).
**Fix:** score a word by **max similarity over the individual bound-label atoms** (nearest anchor) instead of the bundle centroid. A label reads 1.0 against its own atom at any count; unrelated words stay at the 1/√D floor (≤0.022).
**Result:** own 1.000 / unrel ≤0.022 on every concept, at n=8 labels too; **0 false-accepts, 0 false-rejects**. Gate is sound at any label count.

**F2 + F4 — Voice silent ~8%/shot and persona-breaching 8/8.**
The old prompt ("You are the voice of a learning machine… speak first-person") left the speaker ambiguous: phi drifted to second person ("I notice that **you** have wings") in **8/8** shots, and returned empty ~1/12.
**Fix (all in `phrase()`):** (a) persona-anchored prompt — name the machine as actor, ban "you", give a worked example; (b) **one-sentence enforcement** in code (`_firstSentence`) — the ramble/echo/"can you help me?" tail is always sentence 2+, so cutting at the first sentence boundary drops it deterministically; (c) `_usableVoiceLine` validator rejects empty + second-person; (d) `_selfVoice` deterministic fallback speaks the machine's true current labels/mood with no model in the loop.
**Result:** 24/24 clean, **0 silent, 0 persona escapes**, avg 11.6 words. The voice can never go silent and never fabricates.

**F3 — Soundness harness tested the wrong geometry.**
`gate-soundness-dspace.mjs` tested `liftField(semantic28)` while production used `bundle(label atoms)` — and was FAILing misleadingly (3 FAILs).
**Fix:** rewrote it to drive the **production anchor path** (`LinguisticGate.measureWord`) on both a synthetic growing-label control and the real mind. Now passes (exit 0) and is a true F1 regression test (bound labels must hold ≥λ at n=1→8 labels).

**F5 — Warm-up proved "loaded", not "responsive".**
`warmModels()` sent an empty prompt and ignored the body. **Fix:** `_warmOne` drives a real bounded generate until the model returns non-empty (F_4=3 attempts/model). "Ready" now means "responsive".

## Verification
- `gate-soundness-dspace.mjs` → **SOUND** (exit 0).
- Full suite: **1002 passed / 1 skipped (93 files)**, zero regressions.
- `tsc --noEmit -p tsconfig.base.json`: no errors in the three edited files.

## Caveat (honest)
The supervisor warm-up fix (F5) is correct as far as it goes, but measurement showed phi's residual empties are **prompt-dependent, not load-state** — a different prompt immediately after a verified-warm model can still return empty ~8% of the time. That is now absorbed by the `phrase()` re-prime + validator + fallback stack (net silence 0/24), so F5 is defense-in-depth rather than the primary guard. The warm-up still helps (weights hot, sampler live) — it just isn't, by itself, a silence guarantee.
