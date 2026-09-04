# METATRON Ω — the certified toroidal RHUFT engine

Pure-TypeScript, zero-runtime-dependency, **deterministic** realization of the
toroidal RHUFT brain. Every number is computed live from the field, never canned;
every claim is `[MATH]` (proven) or `[MEASURED]` (a green battery). No RNG, no
wall-clock, no host-libm on the state path (Law L2).

- **Complete architecture / file tree:** `../../docs/CORE_STRUCTURE.md`
- **Single source of structural truth:** `docs/BRAINMAP.md` (v1.8, Ω-13)
- **Dormant/orphan register:** `docs/DORMANT_REGISTER.md`

## Packages

| package | role |
|---|---|
| `packages/trnn-core` | the engine — 98 src files, 55 test batteries |
| `packages/field-kernel-core` | offline shard-kernel physics (measurement operators, Lyapunov) |

The engine is one flat barrel (`packages/trnn-core/src/index.ts`) over these
areas: `core` (constants/φ/determinism) → `cell` (the nine+one-term cell) →
`torus`/`spectral`/`web`/`engine` (lattice, bases, coupling, the two engines) →
`measure`/`substrate`/`analysis` (read-only measurement) → `sense`/`memory`
(intake, recall) → `cognition`/`learn` (mind, self-model, learning tiers) →
`sweeps`/`genome`/`ledger`/`harness` (consolidation, sealing, certification).

## Commands

```sh
npm test                                # vitest run — 55 files / 664 tests
npx tsc --noEmit -p tsconfig.json       # typecheck (0 errors)
```

## The electron shell

`../app/` is the Electron desktop shell. `npm run bundle:omega` (in `app/`)
rebuilds `electron/omega-bundle.cjs` from this barrel via esbuild; `npm run smoke`
runs the 38-check headless smoke test against the bundle.

