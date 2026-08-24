# ADR-005 — Second sweep: plan restructure into an as-built map (MASTER_PLAN_V4)

**Status:** accepted · **Date:** 2026-08-13

## Context

The operator directed a second sweep: review the plan, review genome-related areas
already in the codebase, understand the vision, and restructure the plan with utmost
rigor — explicitly to **avoid creating duplicates** and to work toward the most
efficient program possible.

## What the sweep found (ground-truthed, not asserted)

Reading `testresults.md`, `INTEGRATION_LEDGER.md`, and the live tree proved that the
genome machinery and **every** package in `MASTER_PLAN_V3.md` and
`GEMATRIA_ENGINE_PLAN.md` (Track G) are **already shipped and green**:

- **Genome:** `cognition/field_genome.ts` (Phase 5, F₈/F₉ ring, FNV-1a determinism
  oracle, sensory-door recall) and `cognition/genome_spectral_signature.ts` (the "DNA
  scan", F₁₂ window, Parseval-certified) — both wired into `run_mind_bridge.ts`,
  `learning_mode.ts`, `cognitive_loop.ts`, with full test batteries.
- **A1/A2/A3:** dual-hash BK-tree vision (`visual_memory.ts`), HNSW (`hnsw_index.ts`),
  PQ/SQ8 codec (`pq_codec.ts`) all exist.
- **A7 co-governor / Track D:** `CENSUS_CAP_DEPTH=8`, `PHI_EXACT_HORIZON=76`,
  `PHI_OVERFLOW_HORIZON=1435` hardcoded in `core/constants.ts`; co-governor defer in
  `learning_mode.ts`; measured depth-8 ceiling in `hardware_governor.ts`.
- **A8 Z[φ], G1–G5, P1–P10:** all present; the 2026-08-12 sweep built only the
  genuinely-absent G4/P8/P9. Final gate: engine 975/975, brain 540/540, tsc 0/0.

**Conclusion:** the duplication risk is at the *plan level* — v3 still reads as a
forward build-list for finished work. No code duplication exists and none may be added.

## Decision

1. Authored `MASTER_PLAN_V4.md` as the current plan: **§1 as-built map** (system →
   file → proof) + **§2 remaining frontier** (F1 vision-captions live seam, F2 HNSW∘SQ8
   at scale, F3 depth≥7 subtree workers, F4 packaged end-to-end gate) + **§3 efficiency
   directive** (φ-bounded memory, metric-index retrieval, exact-precision ladder, single
   co-governor).
2. **Preserved** `MASTER_PLAN_V3.md` and `GEMATRIA_ENGINE_PLAN.md` as certificate/rigor
   records; marked superseded-as-build-plan inside V4 §4. Provenance is law — the v3 §0
   corrections table documents *why* the constants are what they are.
3. No source code changed. This is a documentation/plan restructure only.

## Consequences

- Any future build consults V4 §1 first; capability that exists is integrated, never
  re-implemented.
- §2 items move to §1 as their gates go green.
