# Decisions — Project Decision Log

This folder tracks the design choices and architecture decisions for this
workspace. It exists so that **why** a thing was built is never lost, and so a
change can be audited back to the reasoning that justified it.

## How it works

- `overview.md` (this file) — what the folder is and how to use it.
- `context.md` — the standing context: what the project is, the invariants it
  must never break, the laws it obeys.
- `records/` — one Architecture Decision Record (ADR) per significant decision,
  numbered. Immutable once written; a superseded decision is marked, not edited.
- `design/` — design/taste decisions (colour, layout, hierarchy, voice).
- `ideas.md` — captured ideas not yet decided.
- `progress.md` — running log of what was built and verified.

## The standing laws every decision must respect (inherited)

- **No mock, no fabrication, ever.** Absence is reported, never filled.
- **Exploit before invent.** Use the verified module that already exists.
- **Measured telemetry only.** A number is computed live, or it is a hardcoded
  constant carrying a certificate — never "exactly" unless proven.
- **Honest precision.** Constants carry their horizon; exact tier below, float
  above, never blurred.
- **One package at a time; a package starts only when the previous gate is green.**
