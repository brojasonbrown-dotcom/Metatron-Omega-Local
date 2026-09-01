# ADR-015 — Ω-P9: language returns to the certified trunk (two-channel text codec + content perception)

**Status:** accepted · **Date:** 2026-08-31 · **Track:** sensory meaning + deterministic learning
**Files:** `omega/packages/trnn-core/src/sense/{encode,perception}.ts`, `omega/packages/trnn-core/test/{g6-sense-memory,p8-perception}.test.ts`, `omega/docs/BRAINMAP.md` (§2.7, amendment log, R1)
**Verified:** see bottom — gate battery re-run after the change; S0 oracle hashes required bit-identical.

---

## The operator's ask

The live brain must not merely *register* text — it must learn and structure words. The
review found the certified trunk's text path was `encodeText`, a trigram *identity hash*:
excellent at dropout-robust occurrence recognition, structurally blind to what was said
(no letter values, no order geometry beyond sub-word shuffling, no resonance notion of
meaning). Meanwhile the deleted v14 `language_codec.ts` (gematria → φ-weighted DFT →
resonance) carried exactly the missing structure, and the operator's own
GEMATRIA_ALPHABET study had already certified a better alphabet than that codec used.

## Ground truth before the change

- `encode.ts::encodeText` — rolling-trigram token hash, 3 nodes/char, φ-comb weights,
  SplitMix64-seeded. Deterministic and robust, but `dog`/`god`/`quantum` are equidistant.
- `sense/perception.ts` — per-channel percept = BAND (10) + SPACE (4) + FIELD (8) = 22
  floats; the app's 3 channels make a 66-dim observation, and **66 % 8 ≠ 0 silently
  collapses the ConceptStore product quantiser to a single 16-centroid subspace**
  (`concepts.ts` falls back to `sub=1` when `dim % sub ≠ 0`).
- The perceptual Mind therefore saw only an 8-bin phase-free power smear of text —
  two utterances with similar power spectra collapsed to the same percept.

## The decision — two-channel code, structure observed directly

**Channel A (identity, unchanged):** the certified trigram hash. It carries the G6.5
contract — near-identical-string discrimination, recall ≥ 0.99 at rated capacity,
40%-dropout recovery — and it stays bit-exact.

**Channel B (meaning, new):** the language codec, re-derived to the letter of the
research instead of ported as code:

1. Normalise (NFKD, lowercase, collapse whitespace).
2. Char → alphabet index k ∈ [0, 27] (a–z, space, other) → **value v_k = φ^(k/2)** —
   the φ-power ladder the GEMATRIA_ALPHABET battery certified best (ratio CV = 0,
   exact in Z[φ], best cross-token discrimination, reversal-invariant). The old Latin
   units/tens/hundreds table is superseded by measurement, not taste.
3. Mean-removal (without it mode 0 dominates and all texts resonate near 1).
4. Project onto 13 golden DFT modes: `c_k = φ^(−k/2)·Σ_p (v_p − v̄)·e^{i(2πkp/L + θ_k)}`,
   `θ_k = 2πk·φ⁻¹/89`.
5. Synthesise onto the n-node ring as **pure orthogonal modes** (no per-node golden
   phase): ring-DFT bin k then recovers mode k *verbatim*, which is what makes the
   content observable downstream.
6. Mix `A + φ⁻¹·B`, each channel unit-normalised; bound ‖v‖∞ ≤ φ, down-scale only (L-S1).

**Perception CONTENT block (new, appended after FIELD):** 10 low-mode log-power bins
(`dlog1p|Z_m|²`, m = 1..10, L2-normalised) of the channel's own field. For the text
channel these bins *are* the gematria spectrum of the utterance — the perceptual Mind
now forms concepts over what was said, not just that something was. Per-channel width
becomes 32 → app observation dim 96, divisible by PQ sub=8: the silent quantiser
collapse is fixed as a side effect.

## Why no regression is provable, not assumed

- **L1/L2/L-S1 kept:** every constant φ-derived, no RNG/clock, every transcendental via
  `core/dmath`; the bound scales down only. Empty/degenerate text yields channel B = 0
  (pure identity code), never an exception.
- **Observer law kept (ADR-014):** perception reads staged state; the CONTENT block is
  more reads of the same `fft` already computed for FIELD. Digest parity test unchanged
  and green.
- **S0 oracle:** no text is injected on the oracle path, so the frozen 1000-tick hashes
  (PICO/NANO/MICRO) must reproduce bit-for-bit — verified below.
- **G6 contract:** order-sensitivity, determinism, bound, braid recall ≥ 0.99 at rated
  capacity, and 40%-dropout recovery re-run against the *new* encoder — the identity
  channel preserves the margins the braid cascade was certified on.
- New assertions are append-only: prefix resonance (`metatron` vs `metatronic` out-resonates
  `metatron` vs an unrelated string) and content-block separation/amplitude invariance.

## Honest limits / next (deliberately not in this ADR)

- The chat injection is still a **standing drive** (a pushed channel re-injects every
  tick until replaced). Pulse/decay semantics is a dynamics-affecting change and gets
  its own gated ADR.
- The Mind still learns *telemetry* concepts (Ω-P7) separately from *sensory* concepts
  (Ω-P8); binding them (a word ↔ the field response it causes) is the linguistic-gate
  resurrection, likewise separately gated.
- No decode path exists (field → words). Generation stays external by design.
- Learning-rate ceilings identified by the review (MIND_STRIDE 21, MEMORY_STRIDE 144,
  SNA depth 233 warm-up, SSM λ ≤ φ⁻¹ ≈ 2.6-fold time constant, braid linear scan,
  once-trained PQ codebook) are recorded in the review; each relaxation needs its own
  battery evidence.

## Verification (filled at landing)

- `npx tsc --noEmit` — clean.
- `npx vitest run` (full battery, `omega/`) — green, including `s0-oracle` frozen
  hashes bit-identical, `g6-sense-memory`, `g7-cognition`, `p8-perception` with the
  new append-only assertions.
- `cd app && npm run bundle:omega && npm run smoke` — bundle rebuilt, smoke green.
- No git commit made (operator's call).
