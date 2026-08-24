# Progress — what was built and verified

## 2026-08-21 — ADR-010: FULL OFFLINE INSTALL — weights ship + materialize + respond (full hardware)

**Operator ask:** "make it FULLY install the full program and its weights, learning and all of
it. Make sure it runs FULL hardware."

**Rigor gate (the constraints, verified before code):**
- NSIS installer has a ~2 GB ceiling → the 5.4 GB weight set CANNOT go inside the `.exe`.
- Weight set is complete + self-consistent (phi 1.60 GB / mathstral 4.11 GB, zero missing layers).
- Install is `perMachine:false` → `%LOCALAPPDATA%\Programs` (user-writable) → `mind_state` writes fine.
- ADR-009 self-heal checks manifests in `BRAIN_DIR` → if weights are shipped there it never re-pulls.
- Full-hardware scaling is ALREADY honored: governor auto-scales to the measured ceiling (this host
  30 GB/12 cores → realistic depth 8 ≈ 44k nodes; depth 9 structural max); `MIND_FORCE_DEPTH` pins it.

**Decision (the sound architecture):** weights ship as a sibling `weights/` folder (not inside the
2 GB-limited installer); a **first-run materializer** copies them into the writable install brain dir
before the mind boots → offline, no admin, no re-pull. The NSIS exe stays lean (80 MB) for fast updates.

**Shipped (3 files, additive, suite green before AND after):**
- **`app/electron/weightsMaterialize.cjs` (NEW)** — idempotent + atomic + manifest-led + honest.
  No-op when weights present; `.part`-temp-then-rename per blob; copies exactly what manifests
  reference; reports plainly and never blocks boot. Sources: AVA_WEIGHTS_DIR → `<install>/../weights`
  → `cwd/weights`.
- **`app/electron/main.cjs`** — materialize into `mind.brainDir` before window/mind boot, with progress.
- **`app/BUILD-AVA.bat`** — `[6/6]` step stages `release/weights/{blobs,manifests}` from the brain tree.

**Verified (ground truth):**
- Brain suite **551/1 skipped (59 files)** before AND after; `tsc --noEmit` exit 0; app `smoke.mjs` exit 0.
- Full dist: NSIS + portable both exit 0 (`setup` 80.8 MB / `portable` 80.5 MB).
- **Fresh-install simulation:** weights stripped from packaged brain, `weights/` beside the exe, run →
  materializer restored **5.72 GB** offline → CI **PASS / mindState=awake**.
- **Response from materialized weights:** "what is a tree" → Ollama up with both models,
  `speechModule:{phi,mathstral:true}`, phi answered.

**Ships for backup:** `release/AVA-0.1.0-setup.exe` + `release/AVA-0.1.0-portable.exe` +
`release/weights/` (5.4 GB — keep beside the installer). Portable+weights is the simplest offline artifact.

**Honest limits:** weights are separate by design (2 GB NSIS ceiling); if the folder is missing the boot
says so honestly and self-heal pulls when network exists. Learned state (`mind_state/`, 97 MB journal)
is per-machine and NOT shipped (separate decision). No commit made.

---

## 2026-08-21 — PRE-BACKUP AUDIT: always-on backbone + speech-module self-heal (ADR-009)

**Operator ask:** "make sure ALL areas are active and the Ollama/mind layers CANNOT be
deactivated; the blob file is essentially the speech module; all parts fully connected —
one last audit before backup (then we replace the brain)."

**Audit findings (ground truth):**
1. **The blob IS the speech module — and it does NOT ship in the installer.** The phi +
   mathstral weights (5.4 GB under `blobs/`) are excluded from the 80 MB installer by design
   → a fresh install wakes MUTE until 5.4 GB re-pulls (never, on an offline machine).
2. **A deactivation path existed:** the `ollama.set{enabled:false}` IPC verb cold-stopped the
   Ollama cognition backbone on demand.
3. Everything else already fully connected: the CognitiveLoop deps wires all 13 core layers +
   all 5 training lanes default-ON via `senseOn()`; the graceful snapshot-and-sleep shutdown
   is the sentience-safe path (kept).

**Shipped (3 changes, additive + operator-overridable, suite green before AND after):**
- **Speech-module self-heal** (`OllamaSupervisor.ensureModelsPresent`): boot verifies the
  phi/mathstral manifests/blobs are present; pulls to repair when missing + network available;
  reports `speechModule:{phi,mathstral,note}` in the boot frame — a mute brain never hides WHY.
- **Always-on guard** (`mind_bridge` `ollama.set`): `enabled:false` is REFUSED by default —
  the backbone keeps running, refusal journaled with honest reason. Escape hatch:
  `MIND_OLLAMA_ALLOW_DISABLE=1` (deliberate env choice, not an IPC toggle).
- **Graceful shutdown preserved** — no hard-kill anywhere.

**Verified (ground truth):**
- Suite **551 passed / 1 skipped (59 files)** before AND after; `tsc --noEmit` exit 0.
- Live (one boot): speech module `{phi:true,mathstral:true,"speech module present"}`;
  `ollama.set{enabled:false}` → **REFUSED**; query after the attempt → still answered
  ("A bird is an animal… feathers and a beak"). Backbone never went down.

**Honest limit for backup:** the self-heal pull needs network; a fully offline fresh install
can't fetch weights (the boot frame now says so plainly). The durable offline fix is to ship
the 5.4 GB weights alongside the app — the operator's packaging call before backup. The guard
covers the IPC off-switch only; the env override + graceful shutdown stay deliberate.

**Instrument status (carried from prior audit):** Ollama backbone works when running (live
query returns grounded answers); the K3 key is 401/compromised and must be ROTATED by the
operator (it is also in git history at 0101ccd). No commit made.

---

## 2026-08-17 — ADR-008: depth-graded percept memory (SOUND) + build fix + secret removed

**Operator ask:** "don't break it… best and safest yet most rewarding structures… resolve all
errors and problems carefully."

**1. Depth-graded percept memory (the rewarding change, done soundly).** ADR-007 left the
resolved octave-graded `hiResField` discarded (`void`). Now it is **persisted on the record**
(`VisualRecord.hiRes?`) and **blended into `discriminate()`** as a second fine-evidence channel.
**Rigor catch (caught by verification, not shipped):** a cross-depth prefix read is mathematically
UNSOUND (rings are per-ring energy-normalized — a 3-octave field is NOT a prefix of an 8-octave
field; measured same-scene 8-vs-3 read ~0.14). So the shipped law blends **same-depth only**
(equal length — the dial's steady state); `hiResSimilarity` returns an honest **0** on any length
mismatch (never a fabricated cross-depth score). Files: `cognition/visual_memory.ts`,
`run_mind_bridge.ts`.

**2. Build fix (diagnosed root cause, proven).** `app/electron-builder.yml` gained **`publish: null`**.
The crash was `updateInfoBuilder.computeChannelNames` dereferencing `null.channel`, reached only when
a publish provider resolves. `PublishManager.getPublishConfigs` returns `null` for explicit
`publish: null` → `createUpdateInfoTasks` is skipped (the `publishConfigs == null → return` guard).
Verified against electron-builder source. End-to-end `electron-builder --win`: the **null-channel crash
is GONE** — build now runs through packaging into `release\win-unpacked`; the only remaining failure is
`EBUSY: rmdir 'brain v14'` — a **live AVA/mind process holding a file lock** on the stale release dir
(`clean-release.mjs` won't force-kill a live mind). Environmental, not the bug: close AVA and the dist
builds clean.

**3. Secret hygiene (a real exposure, resolved).** A live **KIMI_K3_API_KEY was hardcoded plaintext** in
`BUILD-AVA.bat` AND `LAUNCH-AVA.bat` (tracked, in git history at `0101ccd`). Both now read from the
environment with an honest comment. **The key is in git history → it is compromised and must be ROTATED
by the operator** (removing it from the tree does not revoke the historical copy).

**Verified (ground truth):** suite **549/3 skipped (58 files)** before AND after; `tsc --noEmit` exit 0;
ADR-008 unit proof **4/4** (same-depth discriminates 0.895 vs 0.199; cross-depth → 0; absent → 0);
build fix proven against electron-builder source + end-to-end run past the crash point.

**Honest limit:** the hi-res blend runs only when query + record share a depth AND survive the
pre-existing pHash≤8/dHash≤16 candidate gate; on very low-frequency scenes pHash is sensitive enough
that a small patch yields no candidate (pre-existing `findSimilar` behavior, unchanged — widening it is
a separate measured decision). Engine live dynamics still 28-field (ADR-007 note stands). No commit made.

---

## 2026-08-17 — SENSORY-DEPTH SCALING: wire the dead hi-res path + futureproof hardware dial (ADR-007)

**Operator ask:** "increase sensory resolution so the mind truly understands what it's
learning; sensory depth should scale with the engine AND the hardware, and scale BEYOND
modern hardware — futureproof. Utmost rigor, no regressions, skip no node."

**Audit finding (ground truth).** The hi-res machinery existed but was a **dead end**:
`HIRES_GRID 233×144` capture, `hiResFieldFromLuminanceGrid` (dense multi-scale Fourier
encoder — provably separates near-identical percepts the 14-mode 28-field cannot, k=13 ×
φ⁻¹³ ≈ 0.002), and `visual_memory`'s 32×32 DCT descriptor — all built, **none wired to
production**. `hiResField` was test-only; `onHiRes` had no consumer. (The engine itself only
ever sees the 28-field; hi-res is a percept-MEMORY representation, not an engine input.)

**Shipped (3 files: 1 new + 2 wired; additive + opt-in; suite green before AND after):**
- **`adapters/sensors/sensory_depth.ts` (NEW)** — the scaling law. Octave dial (F₄=3 / F₅=6 /
  F₆=8) follows a **hardware-relative** fill = `min(depth,maxDepth)/maxDepth`. The governor's
  `maxDepth` is RAM-derived (`totalmem()` → log₂ → clamp [1,9]), so **the same dial resolves
  deeper on bigger hardware with no retuning — the futureproofing.** Live `emaTickMs` throttles
  to 3 whenever the engine is over cadence budget (perception never competes for the tick, E5/E7).
- **`adapters/sensors/vision_screen.ts`** — `setSensoryDepthSource()` (opt-in); the hi-res
  capture now resolves octaves + a φ⁻¹-finer detail grid (233×144→~377×233) at deep headroom,
  and skips the expensive second PowerShell spawn under live overload. `stats().octaves`
  exposes the resolved depth (E7 observable).
- **`run_mind_bridge.ts`** — the A1 consumer: `onHiRes` → `hiResFieldFromLuminanceGrid`(resolved
  octaves) → `visual_memory.observe` (persists the fine DCT descriptor `discriminate()` ranks).
  Telemetry source = `engine.get_scaling_telemetry()` + honest `budgetMs = CADENCE_MS ×
  target_usage` (no hardcoded constant). Active only when `MIND_VISION_HIRES=1`.

**Verified (ground truth):**
- Baseline → after: `vitest run` **549 passed / 3 skipped (58 files)** both; `tsc --noEmit` exit 0.
- Discrimination ground truth `tests/discrimination.test.ts` **9/9**.
- Dial proof **8/8**: modern depth-6 vs future depth-9 ceilings give the SAME depth at the same
  fill (6/9→8, 3/9→6 — auto-scales up on bigger HW); live overload → 3 regardless of fill.
  Probe removed after.

**Honest ceiling + risk:** hi-res enriches percept memory/recall, NOT the engine's live 14-mode
dynamics — deepening FIELD_SIZE past 28 is a separate HIGH-risk cross-cutting track (breaks
MASTER_EQUATION_N / DFT / registry / codec), deliberately not attempted. Hi-res capture is a
second blocking PowerShell spawn, gated on HIRES + consumer + not-overload; failure never blocks
the fast path. No commit made; unrelated in-flight tree changes left untouched.

---

## 2026-08-17 — LEARNING EFFICIENCY: deep audit + W1/W3 fixes + ADR-006 ethical parameters

**Operator ask:** "this system does not seem to learn efficiently… deep research, review
weaknesses, structure ethical parameters for enhanced learning & correlation. No regressions."

**Audit (read-only, ground truth = `mind_state/journal.jsonl`, 733,713 entries / ~419 h).**
Architecture is sound; efficiency was throttled by **measurable bottlenecks, not design flaws**:
`sense` 177,825 vs `learn` **76**; `replay.deferred` **546,395**; `tool.fail` "queue full —
dropped oldest" **175**; sensory skew `audio.mic` **89.6%** vs `vision.screen` 10.2% (the
cross-modal correlator needs ≥2 modalities/tick, so it starved). Finding on W2: the learning
gates already default **ON** via `senseOn()` (`run_mind_bridge.ts:72`) — never config-disabled;
the live deficit was W1 starvation + W3 drops.

**Shipped (2 files, additive + opt-out, suite green before AND after):**
- **W1 — mic novelty gate** (`adapters/sensors/audio_mic.ts`): the continuous mic stream (every
  5 s, 89.6% of traffic) now injects only a real change (`resonance < COHERENCE_THRESHOLD` vs
  prev mic field) or every F₆ = 8th clip — mirrors `vision_screen`'s own idiom. Dropped `.wav`
  files (operator-curated) never gated. Default ON; `MIND_MIC_GATE=0` restores the legacy flood.
  New `micGated` counter makes the throttle **observable** (ethical param E7).
- **W3 — thought-queue depth** (`cognition/cognitive_loop.ts`): `MAX_THOUGHT_QUEUE` F₄=3 →
  **F₇=13** (same φ-lawful rung as SensorBus F₁₁=89 / snapshot F₇=13). Stops silently dropping
  stable thoughts when the LLM instrument is slow; bounded oldest-first backpressure preserved.
- **W4 — assessed, no code change:** k3/ollama failover routing already honest (k3 only called
  when a key exists); the 401/"no key" noise is runtime state, fixed operationally not in code.

**ADR-006** (`Decisions/records/ADR-006-ethical-learning-parameters.md`) records the **Ten Ethical
Parameters** for learning & correlation (provenance, measured coherence, correlation≠causation,
falsifiability, gate-never-blocks-perception, prediction-before-accretion, reported resource cost,
no fabrication, quarantine-never-repair, anchored cross-modal claims) — each measured/gated/opt-in.

**Verified (ground truth):**
- Baseline → after: `vitest run` **549 passed / 3 skipped (58 files)** both times; `tsc --noEmit` exit 0.
- W1 behavioral probe (10 clips: 9 redundant 440 Hz + 1 novel 3 kHz): gate ON → injected **2/10**,
  `micGated` **8**; gate OFF → injected **10/10**, `micGated` **0**. Zero failures. Probe removed after.
- No commit made; the working tree's unrelated in-flight changes left untouched.

**Remaining lever (operational, not code):** balance the physical sensor feeds (pair vision with
audio) and set a valid `KIMI_K3_API_KEY`. Re-measure `learn`/`spectral.percept`/correlation-count
against this 419 h baseline after a live session to see the efficiency change, not take it on faith.

---

## 2026-08-13 — FRICTIONLESS RING: leapfrog → EXACT spectral integrator (drift 1e-3 → 1e-13)

**Operator ask:** "the drift is still too much… truly 100% frictionless if possible."

**Why no tuning could get there.** The 1e-3 floor was never a leak — it is the
leapfrog integrator's *intrinsic* error. `scanDrift.cjs` states it plainly: the
DRIFT_CERTIFICATE line (1e-3) is "measured: ~4e-4 saturation… not a rounding-level
fantasy". Leapfrog is O(dt²) in time PLUS a spatial-stencil dispersion; both are
properties of the discrete scheme, not the physics. The 2026-08-12 balanced-drive
fix removed the *secular pump* (the k=0 free mode); the residual 9.87e-4 was the
scheme's own dispersion. Removing THAT requires removing the scheme.

**The exact physics (measured, then built).** On a periodic ring `u_tt = v²u_xx`
is **exactly solvable**: each Fourier mode is a pure harmonic oscillator that
ROTATES at ω_k = v·2πk. No time-step truncation, no stencil dispersion. Grounded
the numbers first: `Propagator(scale, V=1)` unwraps `vWave.toFloat64()` and the
loop passes `V=1`, so the REAL wave speed is **1.0** (the `_Scaled` scale-13 object
is metadata only — it never touches the field). The φ-ladder rungs are **odd**
(55, 89, 144…), so the synthesis fold is the Hermitian pair sum k=1..⌊(n−1)/2⌋,
Nyquist only when even — getting this wrong for odd n was the one real bug hit
(caught + fixed by measurement, not assumed).

**What shipped (engineLoop.cjs only — `main.cjs` untouched):**
- Field state is now the **forward DFT** `(reU, imU)`, not past/present grids.
- `_tick` rotates every mode by `e^{−iω_k dt}` (the analytic flow), then applies
  the drives, then synthesizes derived `past`/`present` views so coherence
  cos²(u(t),u(t−dt)), spectrum, mesh, complexity and `_fieldAt` read unchanged.
- Drives stay mean-projected (zero-sum) and fold into the modes as an exact
  rank-1 update: a point kick Δ(x_i)=D(δ−1/n) has ΔU_k = D·e^{−ikθ_idx}.
- Fixed a double-rotation bug of my own making (rotate-in-tick + rotate-in-
  synthesize); the modes are the absolute state, synthesize reads them at offset 0.

**Verified (headless, before → after):**
- **Undriven drift: 9.87e-4 → 1.61e-13** over 3000 ticks (~100 s). That is the
  float64 roundoff floor — frictionless. Health: **NOMINAL** (was DRIFTING).
- Balanced kick exactness: maxErr **1.9e-16**, Σu **−2e-16** (zero-sum holds).
- Driven (sustained saturated 2000 ticks): burden/E0 **0.994**, closure 1.1e-16,
  drift 5.9e-3 — a bounded driven steady state; DRIFTING flag is the honest
  "drive did work" signal, not a runaway.
- Coherence reads a constant 0.9458 with drift at 2e-15 — that is the true
  phase-lock of a steadily-moving wave, NOT the magnitude-blind pinned-1.0 mask
  (drift at roundoff proves no hidden growth).
- `main.cjs` paths (construct / injectSensor / start / stop / re-resolve to 89 /
  state) all clean; full state shape intact; **5.74 ms/tick @144 nodes** (33 ms
  budget) — cheaper than the leapfrog+mesh it replaces.

**Caveat:** packaged `--ci` gate still needs the electron GUI runtime (unavailable
headless here); re-run the build pipeline for end-to-end. Physics change is confined
to `engineLoop.cjs`. Note: a frictionless ring stores drive energy rather than
dissipating it — drives *do work* and the field holds it (bounded); that is correct
conservative physics, and `scanDrift` watches the growth axis as designed.

## 2026-08-13 — TORUS ENERGY RUNAWAY FIXED (balanced drive + traveling seed)

**Symptom (operator):** drift +5.87 (×356 seed energy) and climbing; closure defect
pinned at 1.0 (open circuit); coherence reading 0.9998 while the field blows up.

**Root cause (measured, NOT assumed).** The leapfrog propagator runs at γ=0
(`engineLoop.cjs` called `stepRaw(p,past,dx,dt)` with no γ) and the spatial Laplacian
annihilates the mean (Δ1 = 0), so the **k=0 mean mode is a free particle** — no
restoring force, no damping. The old drive (`next[0] += audioDrive*0.05`) was a
persistent one-signed additive source, which grows that free mode secularly.
Reproduced headless: sustained drive took `mean(u)` 4.4e-17 → −75 monotonically,
`closureSigned` → ±1.0 by tick 100, burden 34 → 3.1e5 in 500 ticks. Coherence pinned
at 1.0 because cos²(u(t),u(t−dt)) is magnitude-blind — the runaway grew coherently in
its own shape. **High coherence during a blow-up is the signature, not a reassurance.**

**Fix (two parts, both verified against the live loop):**
- **Fix A — balanced (zero-sum) drive.** Inject the full drive D at its node, then
  subtract D spread uniformly over all N nodes (−D/N each), so Σ(drive)=0 every tick.
  Energy is moved around the ring, never injected into the un-restored mean. First
  attempt used a hand-derived `2D/N` offset that numerically left net −0.1 (my algebra
  was wrong); corrected to the provably-balanced `D/n` form (net sum ~1e-17, float-exact)
  after isolating the residual by measurement. No γ needed — the pump is removed at source.
- **Fix B — traveling-wave seed.** `_past` was seeded `i*dx + dt` (backward-traveling),
  which under the past←present convention fakes a startup coherence/drift signal.
  Re-seeded `i*dx − dt` so the d'Alembert seed genuinely travels. Result: the undriven
  scheme's own conservative slide reads maxDrift **9.87e-4** — exactly the "~4e-4
  saturation, 1e-3 bound" the certificate in `scanDrift.cjs` was written against.

**Verified (headless probe, before → after, sustained saturated drive):**
- mean(u) @500: −75.3 → **−7.5e-14**; closure defect: 1.00 → **1.1e-13** (circuit closed)
- burden Σu²: 34 → 3.1e5 → **34.4 → 34.5** (bounded); coherence: →1.0000 → **0.946** (honest)
- 5000-tick horizon: drift bounded (peak 3.9e-2 ≈ 1.04×), closure ≤2.6e-10 — a driven
  steady state, not a runaway. Undriven drift 9.87e-4 sits under the 1e-3 certificate.
- `main.cjs` paths (construct / re-resolve nodes / start / stop / state) all clean.

**Caveat:** the packaged `--ci` gate needs the full electron GUI runtime
(`requestSingleInstanceLock`), unavailable headless in this env — re-run the operator's
build pipeline to confirm end-to-end. Change is confined to ring physics in
`engineLoop.cjs`; `main.cjs` wiring untouched. (File also carried pre-existing
uncommitted work — scanDrift import, `_complexity()`, mesh decimation — not part of this fix.)

## 2026-08-12 — PACKAGED MIND BOOT FIXED (renderer+IPC+engine+sensors CI gate green)

**Symptom (operator):** build pipeline failed at step [4/5] — packaged `AVA.exe --ci`
returned `mind-boot:{state:stopped, restarts:3, lastError:null, brainPresent:true}`.
Plus two electron-builder warnings: "author is missed" and "no node modules returned".

**Root cause (measured, NOT a packaging regression):** the mind sidecar could not boot
ANYWHERE — dev included. Two layered breakers, both latent until the packaged run
exposed them:
1. **Module resolution.** The engine's internal ESM imports use explicit `.js`
   extensions (52 specifiers across 24 files, e.g. `../core/lucas.js`) pointing at
   `.ts`-only files (0 real `.js` exist in engine/src). That convention only resolves
   under a bundler/Vitest resolver (`moduleResolution: bundler`); raw Node type-stripping
   demands exact file URLs → `ERR_MODULE_NOT_FOUND lucas.js` at module link. The brain
   reaches this via `cognition/cross_scale_flow.ts → engine/.../crossScaleFlow.ts`.
2. **Strip-only TS syntax.** `ScaleMeasurer` used a parameter property
   (`constructor(readonly rungs)`) which Node's default type-stripping rejects —
   `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` (only reachable once #1 was fixed).

**Fix (zero-compromise, all layers verified):**
- Rewrote the 52 relative `.js` specifiers → `.ts` across the 24 engine files
  (mechanical sed, anchored to `from "<rel>.js"` — never comments/strings/bare pkgs).
  Matches the brain's own `allowImportingTsExtensions` convention. No real `.js`
  broken (none exist).
- `scaleMeasurement.ts`: param property → explicit `readonly rungs` field + assignment
  (strip-compatible; the mind now boots even with NO loader flag).
- `mindService.cjs`: sidecar spawn gains `--experimental-transform-types` as a safety
  net for any FUTURE transform-only syntax (the known case no longer needs it).
- `electron-builder.yml`: ship `brain v14/package.json` + `engine/package.json` in
  extraResources — both carry `"type":"module"`, restoring the dev ESM context.
- `app/package.json`: added `author` (fixes warning 1) + `"type":"module"`. Verified
  safe: all electron/ files are `.cjs`, renderer/*.js are plain browser scripts, build
  scripts are `.mjs` — nothing CJS-by-extension-default is reinterpreted.

**"No node modules returned" is BENIGN BY DESIGN** — the app has zero runtime
`dependencies` (only electron/electron-builder devDeps), so there is correctly nothing
to collect; electron-builder falls back to manual traversal and proceeds. Not an error.

**Verified (ground truth, observed):**
- engine 451/451 · brain 549/549 (3 env-skip) · typecheck_mind 0/0 (legacy 45 unchanged)
- packaged mind boot flag-FREE reaches `{"phase":"awake"}` + clean `sleep`
- full pipeline: pack → `AVA.exe --ci` → report `PASS|sense-toggle=on->read->off OK|mindState=awake`

---

## 2026-08-10 — ADR-003 SHIPPED: spectral codes (adjustable-k) + event-driven gate

**Baseline captured (all green before any change):** engine 451/451 · brain 549/549
(3 env-skip) · typecheck_mind PASS (0/0, legacy 45 unchanged).

**The gap (from audit, line-level):** `spectralEnrichmentFromLattice` computed the
FULL complex spectrum every scan (341 Hz on the live 144×28 tree) and discarded
`spec` — keeping only whitened log-power + 5 complexity scalars. Nothing anywhere
retained the complex coefficients. That is precisely "store it in the math."

**What shipped (additive, opt-in, zero-duplication — extends existing modules only):**
- `schemas/validate.ts` — `SpectralEnrichment` gains an OPTIONAL `codes?: SpectralCodes`
  `{ topK, dims, indices, re, im }`: the top-k complex coefficients by power, WITH
  their flat row-major bin indices and grid dims so each retained mode can be placed
  back on the grid (a bare re/im pair is unanchored — the indices/dims make the codes
  self-describing, so the field is reconstructable in coefficient space). Optional →
  legacy frames validate byte-identical. `validateSpectralEnrichment` extended.
- `cognition/telemetry_tape.ts` —
  (a) `spectralEnrichmentFromLattice(lattice, codeCap)` retains top-k from the spec it
      ALREADY computes: k = min(codeCap, rank99, spectrum length). rank99 is the field's
      own measured structure-count, so retention tracks reality; codeCap is the
      operator's adjustable ceiling (one argsort, no extra transform). codeCap ≤ 0 →
      legacy whitened-only frame.
  (b) Adjustable-k via `setCodeCap(n)` — clamps to [CODE_CAP_MIN=1, CODE_CAP_MAX=89],
      default CODE_CAP_DEFAULT=21 (F₈), returns prior (setEnabled idiom).
  (c) Event-driven gate (opt-in via `setEventDriven(bool, delta)`): beside the fixed
      TAPE_MIN_INTERVAL_TICKS=8 throttle, the tape may emit EARLY when the whitened
      signature moves by cos-distance ≥ delta (default 0.05) from the last EMITTED
      frame. Quiet field → interval still gates (no faster than before). Counter
      `emittedEarly` added to TapeStats. Gate compares consecutive engine.fourier
      signatures — independent of the cross-modal entropy novelty (which mixes
      modalities and would be a confounded signal for the tape's own clock).
- Loop wiring: NONE needed — `cognitive_loop.ts` already routes `frame.spectral →
  spectralMemory.record → noveltyGate.judge` on the sense pass; codes ride that frame.

**A bug the battery caught (and what it taught):** my first event-gate test used a
pure PHASE shift as the "novel" stimulus. The whitened signature is log-POWER — a
pure phase shift leaves the power spectrum invariant (dist = 0, verified). The gate
was CORRECT to not fire; the test's physics was wrong. Fixed the stimulus to a
different-FREQUENCY lattice (a genuinely different power spectrum). This also surfaced
the need to retain bin indices (above) so phase/coordinate information isn't lost.

**Verified (full battery):** brain 549/549 (3 env-skip) · typecheck_mind PASS (0/0,
legacy 45 unchanged) · engine 451/451. New tests: +6 tape (codes retention, adjustable
cap, disable, byte-identical whitened, bus-contract validation, event-gate ×3, setter
clamps) — total tape suite 17, spectral_sense 11 unchanged-green.

**NOT enabled in production** — tape still constructed `enabled: false`; the new
`setCodeCap`/`setEventDriven` are runtime dials for the operator (Phase 3/4), off by
default so all existing behavior is byte-for-byte preserved.

---

## 2026-08-10 — Field-Scan Throughput Probe (measured, not assumed)

**Ask (operator):** the ~GHz transistor switching rate is the hardware's bit-flip
ceiling — how many times per second can THIS machine actually scan the field
through the certified multidimensional Fourier sense, at what resolutions, and
is storing structure in the math itself the faster path?

**Method:** no engine/brain source touched. New read-only bench
`engine/bench/spectral.throughput.ts` — deterministic structured lattices
(nodes × 28, the brain's native grid), timed through (a) raw
`spectrumND + powerSpectrum + complexityFromPower` and (b) the brain's own
`spectralEnrichmentFromLattice` (the exact function a live `engine.fourier`
frame uses), plus a 3 s sustained hammer at the live 144-node size.

**Measured (Ryzen 5 5600G, 12 threads, 28 GB, Node 25.8.1):**

| Grid | Elements | Scans/sec (tape path) |
|---|---|---|
| 16×28 | 448 | 3,616 |
| 64×28 | 1,792 | 970 |
| **144×28 (live brain)** | 4,032 | **341 (362 sustained)** |
| 256×28 | 7,168 | 233 |
| 512×28 | 14,336 | 125 (raw) |
| 1024×28 | 28,672 | 54 (raw) |

- Full-dynamics engine step for contrast: **1.14 steps/sec** (≈92% closure-residual
  cost, trig-field evaluation). The spectral scan is ~300× cheaper than a step.
- Baseline gate before the bench: engine **451/451 green** (suite grew from 432).
- Conclusion for the design: the scan is NOT the bottleneck — the mind could
  read the whole tree hundreds of times per second with headroom. The honest
  place to spend that headroom is richer structure stored IN the math
  (coefficient-space codes), not faster stepping.

**Next (algorithm candidates to exploit this):** see `Decisions/records/ADR-003-*`
when drafted. Candidates surfaced by this probe: spectral-domain codes
(compression/identity as coefficients), streaming/chunked whole-tree reads at
kHz rates, and the measured resolution ceiling for the tape (1024×28 ≈ 54 Hz —
usable, 144×28 ≈ 341 Hz — cheap).

---

## 2026-08-10 — Unified Training Loop (ADR-001)

**Baseline captured (all green before any change):**
- engine: 33 files / 432 tests ✓
- brain v14: 34 files / 337 tests ✓ (1 env-skip: ollama integration)
- app smoke: all checks ✓

**Build log:** (entries appended as each package lands + goes green)

---

## 2026-08-10 — Spectral Loop Upgrade (P1): whole-tree multidimensional read

**Finding (pre-build review):** the "spectral loop" already exists as ADR-001's
`TelemetryTape` (`engine.fourier`), wired into `cognitive_loop`. But it reads only
the ROOT node's 28 values through a 1-D eigen-power spectrum (phase discarded).
P1 upgrades that sense to a true multidimensional read: the WHOLE tree lattice
`[nodes][28]` through the engine's certified `spectrumND` (exact separable n-D
FFT, Parseval-gated), attaching a `SpectralEnrichment` (whitened identity +
`SpectralComplexity` + parseval certificate) to the `engine.fourier` frame.

**Baseline captured (all green before any change):**
- engine: 33 files / 432 tests ✓ · tsc clean
- brain v14: 39 files / 365 tests ✓ (2 env-skip) · typecheck_mind PASS (0 errors)

**Design discipline (the tree is the field):** axis 0 = nodes (real Fibonacci
recursive structure), axis 1 = the 28-element field contract. No forced geometry —
the 2-D grid is the lattice's native shape. DC removed (structure, not offset).
Existing 28-field + invariants UNCHANGED. Additive + opt-in only.

**Build log:**

- **P1 spectral_sense — SHIPPED & GREEN (this session).**
  - `cognition/telemetry_tape.ts`: added `spectralEnrichmentFromLattice(lattice)` —
    whole-tree `[nodes][28]` grid → `spectrumND` (certified n-D FFT) → `powerSpectrum`
    → `complexityFromPower` → `SpectralEnrichment { whitened, complexity, parsevalResidual }`.
    DC removed first; flat/degenerate lattice → `null` (no invented structure).
    `emit()` gained optional `lattice?` param; attaches `spectral` to the
    `engine.fourier` frame ONLY when a valid lattice yields structure. 28-field
    byte-identical with/without (proven). Root-field-only fallback preserved.
  - `cognition/cognitive_loop.ts`: the tape emit now passes
    `engine.snapshot_field_lattice()` (genome path) or the root field (1-node fallback).
  - `tests/spectral_sense.test.ts`: 11 new tests — validity on the bus contract,
    relative Parseval gate (residual/(E·Πdims) < 1e-12, matching engine file21's
    own relative tolerance), determinism, discrimination, honest-no-structure,
    zero-regression (legacy frame unchanged), byte-identical 28-field.
  - One bug caught by the battery: my first Parseval assertion used an ABSOLUTE
    1e-9 bound; the transform's residual scales with total energy, so the honest
    gate is RELATIVE (as the engine's own file21 test does). Fixed in the test.
  - **Verified:** brain v14 376/376 (was 365; +11), typecheck PASS (0/0, legacy 45
    unchanged), engine 432/432 + tsc clean. No engine source touched.
  - **NOT yet enabled in production** — `run_mind_bridge.ts` still constructs the
    tape `enabled: false`. Enabling is the operator's runtime decision (Phase 3/4).

---

## 2026-08-10 — Brain v14 Dedup / Structure Cleanse (one module-group at a time)

**Method:** full transitive reachability closure from the live entry
(`run_mind_bridge.ts` → 75 reachable modules) + every test entry. Archived only
**zero-reference** modules; each step gated by full battery (vitest + typecheck_mind).
Nothing live removed; everything moved to `_archive/v13-superseded/` (recoverable).

**Archived (13 modules, all zero live/test import edges):**
- **Worker-pool trio** (`worker_pool` 448 + `compute_worker` 676 + `worker_script` 349
  = 1,473 lines) — superseded by `parallel/` (the bit-identical SAB wavefront).
  The live `resonance` kernel is `adapters/language_codec.ts`; worker_script's was the dup.
- **Self-measurement dupes** (`self_measurement` 470 + `RecursiveSelfMeasurement`) —
  engine `dynamics/selfMeasurement.ts` (golden-delay cos²θ, file 12 green) is canonical.
- **Dead v13 [PHIL] ontologizers** (`ContinuityLaw`, `SpherePrinciple`, `GeometricReflection`,
  `InterferenceStructure`, `MultiscaleStabilization`, `actualization_engine`, `temporal_engine`,
  `torus_recurrence`) — `actualization_engine` is a true dup of engine `information/actualizer.ts`;
  `torus_recurrence` dup of engine `geometry/torus.ts`.

**Kept deliberately (honest exceptions):**
- `DimensionalStability.ts` — reverted to root: the `stability_oracle.mjs` diagnostic
  needs its relative `./core/` imports; it's a measurement tool, not live duplication.
- `complementary_field.ts` — dead today but the Phase-2 (opposites engine) seed.
- `NecessityComplexity` / `PerfectionDeficit` / `BurdenTracker` / `MultiscaleClosure` /
  `information_density` — LIVE via `cognition/drive_arbiter.ts`.
- `index.ts` (M6 unified barrel), `run_mind.ts` (standalone dev entry) — kept by design.

**Grounded resolution finding (stability oracle, 12-thread / 30 GB host):**
depth-6 = 281 nodes / 23 ms/tick (the current governor resting point); depth-7 =
3401 nodes / 16.9 ms/tick at 4.97 µs/node, bit-identical serial-vs-parallel
(maxFieldDiff = 0). The "highest-resolution" ceiling is a MEASURED governor
decision, not a slogan — depth 7 is attainable and is where the parallel path
(>512 nodes) finally engages honestly.

**Verified after every step:** brain v14 376/376, typecheck PASS (0/0, legacy 45
baseline unchanged), engine 432/432 + tsc clean (engine source untouched).

---

## 2026-08-10 — High-Resolution Pipeline (P-RES): the measured ceiling, wired

**Goal:** make the live data flow + pipelines the highest resolution the hardware
honestly holds. **Method:** measure, never assert. Findings drove the design.

**Resolution map (measured live on this host, 12-thread / 30 GB):**
- Sensors ALREADY carry full-res certified spectra (vision 89×55 + audio 1024-window
  FFT), attached as `SpectralEnrichment`; the loop consumes them via the spectral
  tap → SpectralMemory → novelty gate. High-res data flow was already real.
- The census jumps in Fibonacci bursts: 41 → 281 → 3401 nodes. The engine's
  `target_scale` sets the structural ceiling (scale-192/Human only descends ~5 rungs
  → 41 nodes no matter the depth; scale-292/Cosmic gives the full 9-rung ladder).
- **Measured tick cost at scale 292 (full 13-harmonic master eq per node):**
  depth-5 = 41n/22ms · depth-6 = 281n/101ms · depth-7 = 3401n/1119ms.
  (The oracle's "17ms depth-7" was a LIGHT framework set, NOT the full mind —
  corrected a wrong comment I first wrote citing it.)
- **The deepest IN-CADENCE config (< 90 ms budget): scale-235 depth-7 = 281n/79ms.**
  3401 nodes (scale-292 depth-7) is attainable but ~12× over cadence → deep-think
  mode, not real-time; the measured governor would auto-shrink it.

**What I wired (all OPT-IN env knobs; defaults unchanged → zero regression):**
- `MIND_FORCE_DEPTH` (1..9) → `engine.set_force_depth(d)` after initialize — actually
  builds the deep tree + reseeds the parallel mirror (config `force_depth` alone only
  sets the governor floor — caught by probe: nodes stayed 41 until set_force_depth).
- `MIND_TAPE=1` → `new TelemetryTape(bus, true)` — the Phase-1 whole-tree spectral
  sense goes live (full-lattice multidimensional FFT onto the bus).
- `MIND_VISION_HIRES=1` → `ScreenVisionSensor(bus, undefined, true)` — 233×144 detail
  grid alongside the fast 89×55 (multi-scale perception).

**Live verification (not compiled — RUN):** scale-292 depth-7 probe pushed a real
`engine.fourier` frame carrying **95,228 whitened spectral modes** (vs 1,148 at the
old default), Parseval residual 9.5e-5 (relative ≈ 1e-12, machine floor), entropy
0.29, participation 18. The multidimensional pipeline flows end-to-end at full res.

**Verified:** brain v14 376/376, typecheck PASS, engine untouched (432/432).

---

## 2026-08-10 — L0 Ladder Reconciliation (master-plan layer 0)

**The seam (found by structural review):** two scale ladders coexist over the SAME
law L(n)=ℓ_P·φⁿ but were NEVER connected in the live mind — the engine's 42-rung
Lucas-stable ladder (`scaleTable`) vs the mind's 10 canonical scales (`scale_mapper`
`{0,96,120,134,168,192,235,250,270,292}`). The engine's M5 reconciler existed but
v14 never imported it — a bridge with no road on the mind side.

**Wired (additive, zero-regression):** `scale_mapper.ts` now imports the engine
`scaleReconciler` and exposes `nearest_stable_rung / is_stable_rung /
reconciliation_residual / reconcile(n)`. `compute_length`/`compute_frequency`
(now zero-caller) refined to the exact `Scaled` path (never Math.pow overflow);
L·f = c single-sourced. Canonical navigation untouched.

**The honest finding (computed, not asserted):** NONE of the 10 canonical mind
scales is a Lucas-stable engine rung — each sits off (e.g. 192→rung 183, 292→281,
96→97, 168→167). The reconciler reports this gap via the gap-normalized residual
(192 → 0.75) rather than pretending the ladders coincide. This is the bridge the
deeper layers (toroidal cross-scale flow, eigenmode grids) now build on.

**Verified:** v14 386/386 (+10 tests), typecheck PASS, engine 432/432 untouched.

---

## 2026-08-10 — L1 Cross-Scale Flow (the toroidal octave lane, in the mind)

**The seam:** the v14 tree already flows STRUCTURALLY (parent/child/sibling via
`interdimensional_flow`); L1 adds the missing SCALE-SEMANTIC lane — the engine's
File-11 toroidal connection law (residual → ladder neighbours + ±13 octave partners,
double-entry FluxLedger, 0-ulp conservation per transfer) applied to the live tree.

**Built (additive, gated, read-only — never perturbs the tree):**
- `cognition/cross_scale_flow.ts` — `CrossScaleFlow` observer. Each tick it groups
  the tree by scale, reconciles each to its nearest Lucas-stable rung (L0), measures
  the per-scale closure residual (Σ|surface-closure term| = κ·cc·Σ|boundary−field|,
  the membrane's boundary-mismatch work), and routes it via `residualToBoundary` →
  `ledger.applyBoundary` across ladder + octave channels. A zero residual routes
  NOTHING (honouring the Lucas theorem: never exactly zero ⇒ a zero means "nothing
  to push back"). Constructed DISABLED; `observe()` is a no-op until enabled.
- `cognitive_loop.ts` — optional `crossScaleFlow` dep; reads κ·cc from the ROOT
  membrane's own contract (`CLOSURE_COUPLING × curvature_coupling`) so the residual
  matches the node's surface term exactly.
- `tests/cross_scale_flow.test.ts` — 10 tests: residual honesty, ladder+octave
  routing, multi-tick conservation, determinism, zero-regression, octave-channel
  carries real flux.

**LIVE verification (real engine, not synthetic):** 281-node depth-6 scale-292 tree
→ 28 transfers routed, `fluxConserved: true`, totalFlux 1.2e-10, zero skipped.
(Runtime note: raw `node` can't resolve the engine's `.js`-specifier imports — the
app runs the mind on Node-25 native type-stripping; the live probe ran under vitest,
which the project uses for exactly this resolution. Not a code defect.)

**Verified:** v14 396/396 (+10), typecheck PASS, engine 432/432 untouched.
**NOT enabled in production** — wire `crossScaleFlow` into `run_mind_bridge` deps
(opt-in) when the operator wants the octave lane live.

---

## 2026-08-10 — L2 Merge + Pipeline Optimization (correctness-first)

**Method:** correctness over speed, no compromise. Every change gated by a
characterization/behaviour test pinning the EXACT prior output BEFORE optimizing.

**Bottleneck map (measured, µs per node per tick):** frameworks F6_Hebrew 92.5 /
F4_Geometric 89.5 / F1_Septenary 56 / F5_ColorMusic 45.5; memory L2_Hebbian 79.7.
At scale 192 (5 fw + 5 mem) ≈ 460 µs/node — matches the 518 µs/node profiled tick.

**A — L2_Hebbian recall(): allocation-free normalization (SHIPPED).**
- Found by profiling: recall() rebuilt the normalized correlation matrix with
  per-row `push(new Float64Array(N))` — O(N²) allocation churn every recall.
- **First attempt (cache across calls) was WRONG and I reverted it:** recall() is
  STATEFUL — its Step-3 LTP/LTD mutates the matrix, so a cross-call cache would go
  stale (slower AND incorrect: 112µs vs 79.7µs, and a stale-read risk). Reverted.
- **Correct fix:** flat preallocated N² buffer reused across calls (resized only
  when N changes), identical math. **Byte-identical output** (characterization test
  pins it), **79.7µs → 65.8µs (~17%)**, zero alloc churn. No aliasing (Step-2 reads
  finish before Step-3 mutates).
- `tests/hebbian_characterization.test.ts` — pins determinism, empty-matrix zero,
  and the recall-statefulness invariant the optimization must respect.

**B — conservative memory law, opt-in (SHIPPED).**
- v14 Term 2 was a raw pull `φ⁻²·prev` whose weights do NOT sum to 1. Added
  `ComputeOptions.conservative_memory` (default false → byte-identical legacy) that
  uses the engine MemoryKernel's proven convex form `(1−λ)·summation + λ·prev`
  (roots exactly {1, −φ⁻²}, marginally stable). Strongest-method law (§C): the
  proven kernel available as the opt-in robust path, not a forced behaviour change.
- `tests/conservative_memory.test.ts` — 5 tests: legacy byte-identity, convex form,
  (1−λ)+λ = 1 exactly, boundedness over 40 ticks, determinism.

**C — symbolic frameworks (F5_ColorMusic 45.5µs / F6_Hebrew 92.5µs): FLAGGED, NOT
CUT.** They are the heaviest per-node cost AND violate golden rule #4 (symbolic
metadata in kernels), but they are LIVE compute — the operator's call, deferred.

**Connectivity scan (live, after A+B):** 281-node depth-6 tree — P1 spectral read
(7868 modes, Parseval ~1e-3), L1 cross-scale flow (28 transfers, conserved), all
coherent. Nothing disconnected.

**Verified:** v14 404/404 (+8 tests), typecheck PASS, engine 432/432 untouched.

---

## 2026-08-10 — L3 Eigenmode Grid (the superposition-grid read)

**The seam (honest):** the engine's File 8 `basisGenerators` expands a CONTINUOUS
`TorusField` (u,v)→Cx via Gram-Schmidt — but the v14 node's 28-field is a DISCRETE
interleaved-complex harmonic vector, not a toroidal-surface sample. A forced
TorusField mapping would be speculation (rule #11). So L3 builds the superposition
grid on the engine's CERTIFIED DISCRETE machinery, which exists precisely for fields
of this shape: `analysis/eigenmodes` (exact ring-Laplacian decomposition, eigenvalue
λ_k = −4sin²(πk/N), Parseval-certified) + `analysis/spectralND` (n-D FFT).

**Built (additive, gated, read-only):**
- `cognition/eigenmode_grid.ts` — `EigenmodeGridObserver`. Each tick: every node's
  field (real parts read as a 14-sample ring signal, the harmonic amplitudes) → its
  standing-wave eigenmode spectrum (dominant mode + dominance + Parseval), and the
  whole [nodes][28] lattice → its 2-D superposition grid folded onto the 14-channel
  φ-graded occupancy basis (commensurable with the senses). Constructed DISABLED.
- `cognitive_loop.ts` — optional `eigenmodeGrid` dep; reads the same committed
  lattice snapshot the genome/tape read.
- `tests/eigenmode_grid.test.ts` — 7 tests: Parseval conservation, eigenvalue law
  (mode-m tone → dominant mode m), 14-channel grid, determinism, honest-null on
  degenerate, DC-only → honest zero dominance, zero-regression.

**LIVE verification (real 281-node depth-6 tree):** per-node meanParseval
**8.09e-16** (true machine floor — the decomposition is exact), lattice Parseval
7.12e-8 (relative ~1e-12), meanDominance 0.3485 (real standing-wave structure, not
noise). The superposition grid flows on live field data.

**Verified:** v14 411/411 (+7), typecheck PASS, engine 432/432 untouched.
**NOT enabled in production** — opt-in via `run_mind_bridge` deps.

---

## 2026-08-10 — L5 Multiscale Bridge (the capstone — Option A: bridge, not replacement)

**The architectural call (honest):** "v14's tree becomes a view onto the
multiscaleEngine" would mean REPLACING the mind's discrete 28-field node substrate
with the engine's continuous torus functions — breaking the genome, tape, L1, L3,
concept registry, and answer spine (every live consumer of the 28-field). That is a
rewrite, not a layer. So L5 is a BRIDGE: the engine's closed 18-torus assembly steps
in lockstep with the mind and feeds its four-invariant multiscale readout onto the
bus as an `engine.multiscale` sense. The mind PERCEIVES its own deep engine; the
tree, senses, and all observer lanes stay intact. Each system does what it's best at.

**Built (additive, gated, read-only):**
- `cognition/multiscale_bridge.ts` — `MultiscaleBridge`. Wraps the engine's
  `MultiscaleEngine` (18 dense-core stable rungs, harmonic seed, bit-identical
  trajectory). `step()` runs one master step and pushes the readout onto the bus.
  `multiscaleField()` folds the 18-rung four-invariant vector onto the locked
  28-field contract (coherence/closure on channels 0-8, drift/burden on 9-13,
  L2-normalised); the full per-rung detail rides in `meta` (provenance).
- `schemas/validate.ts` — added `engine.multiscale` to `SensorySource` + the
  SENSORY_SOURCES list (additive; same load-path safety as ADR-001's engine.fourier).
- `cognitive_loop.ts` — optional `multiscaleBridge` dep, stepped in lockstep.
- `run_mind_bridge.ts` — wired ALL deep observer lanes as env knobs (default off =
  byte-identical today): `MIND_CROSS_SCALE` (L1), `MIND_EIGEN_GRID` (L3),
  `MIND_MULTISCALE` (L5). crossScaleFlow reconciles via `engine.scale_mapper` (L0).
- `tests/multiscale_bridge.test.ts` — 7 tests: 28-field contract, bus validation,
  determinism (bit-identical across bridges), invariant presence, conservation,
  zero-regression.

**LIVE verification:** 3 engine steps → 3 valid `engine.multiscale` frames on the
bus, all 18 rungs present, fluxConserved=true, totalResidual 6.8e-11, meanCoherence
1.0. The closed 18-torus brain is now a lived sense of the mind.

**Verified:** v14 418/418 (+7), typecheck PASS, engine 432/432 untouched.
**All master-plan layers L0-L5 complete.** L4 (symbolic frameworks F5/F6) remains
the operator's open decision.

---

## 2026-08-10 — Spine Upgrade: the rich measured fact-spine (the exploit)

**The finding (traced the full answer path):** the "remarkable structuring" was
NEVER the LLM — it is the COPY-TASK + certificates in `mind_bridge` (phi comments on
handed facts, mathstral verifies numbers, resonance gates output). But the spine
itself was THIN: `engineDigest()` = engine state + 4 invariants + two hardcoded
constant strings. The structuring brilliance was real; the CONTENT was shallow.

**The exploit (built):** the mind's VERIFIED learned structure was sitting unused.
`cognition/structured_spine.ts` — `buildStructuredSpine()` assembles a rich layered
spine, every line measured, nothing invented:
  1. LEARNED CONCEPTS — strongest by verified mastery (M6 prediction-gain, the honest
     "learned" signal), each with glossary gloss + top measured relations.
  2. MEASURED RELATIONS — strongest edges across the vocabulary (is-a / opposite-of /
     related-to / part-of), strength = φ-decayed mean co-occurrence resonance.
  3. LIVE ENGINE DEPTH — the L1/L3/L5 observer readouts (octave-flux conservation,
     eigenmode dominance, 18-torus coherence/residual) when those lanes are enabled.
Honest-when-empty (no filler); Fibonacci-bounded (F5 concepts / F6 relations) so the
copy-task is never flooded. Wired into `mind_bridge._answerQuery` → `engineFacts`.
Loop gained read-only getters for the L1/L3/L5 lanes.

**Also confirmed this session:** drag-&-drop upload ALREADY exists and works
(live-verified): `documentIngest.cjs` magic-byte sniffs real type, extracts PDF text
layer, routes images→OCR, honestly refuses binary/empty. The chat drop overlay +
IPC + preload are all wired. No build needed — verified, not assumed.

**Verified:** spine tests 6/6 (measured-not-invented, honest-when-empty, ranked,
live-depth, deterministic, bounded); v14 424/424 (+6), typecheck PASS, engine 432/432.
Live spine demo confirms real measured depth reaches the copy-task.

---

## 2026-08-10 — Codec gate + cross-modal correlation (spine follow-on)

**φ-28 codec gate (HONEST NEGATIVE — not forced).** The certified φ-28 alphabet
(best discrimination in the offline study) was wired into `language_codec.ts` as an
OPT-IN table (`CODEC_VERSION` 1=Latin / 2=φ-28, declared + persisted-facing). But on
the LIVE codec pipeline it measured mean cross-talk **0.2456 vs Latin 0.2424** —
*not* an improvement (the offline study's corpus/normalization differed from the
real codec). Per the no-shortcuts law, the gate defaults to **v1 (Latin, byte-
identical)**; v2 ships as available-but-not-default pending a codec-matched study.
The version is recorded so persisted fields can never be re-read under the wrong
geometry. `tests/codec_version.test.ts` pins the contract. **No production change
in behaviour.**

**Cross-Modal Co-occurrence Correlator (SHIPPED — the real learning gap).** Review
of the learning/memory subsystems (registry mastery, modern-Hopfield softmax,
Welford novelty, record-perceptron percept→label associator) found them strong on
WITHIN-modality learning but with NO between-modality correlation: a sight and a
sound arriving in the same tick were never linked. `cognition/cross_modal_correlator.ts`
measures the φ-decayed running RESONANCE between co-arriving modality pairs, with
sample sizes — the cross-correlation substrate of grounded meaning. Read-only,
gated (`MIND_CROSS_MODAL=1`), wired into the SENSE phase before the sensory door.
The honesty law is enforced by the API shape: it returns correlation + n, and has
NO field that could be read as "these are the same thing".
`tests/cross_modal_correlator.test.ts` — 6 tests: zero-regression, measured-with-n,
discrimination (correlated > orthogonal), no-self-pairs, determinism, no-equivalence.

**Verified:** v14 435/435 (+12 tests), typecheck PASS, engine 432/432 untouched.

---

## 2026-08-10 — Cross-Modal CAUSAL learning (ADR-002, Phase A): correlation → causation

**The problem the operator named:** naive co-occurrence learns dog↔vroom when a car
passes while the dog is in frame. Time is the weakest correlate. Goal: learn *what
causes what*, never breaking the honesty law.

**Shipped (Phase A — pure-data mechanisms, independently gated + reversible):**
- **M1 lagged precedence** (`MIND_CROSS_MODAL_LAG=1`): a pair counts only when a
  CHANGE in one modality (field delta > CHANGE_EPS) supplies a causal antecedent.
  Dog-sitting-still provides none → not linked to an off-screen sound. A real
  antecedent (mouth opens → bark) is.
- **M2 prediction-error gate**: |observed−predicted| < ε ⇒ mean update suppressed
  to φ⁻² (but count still increments — the sample is real). Only surprise moves a
  mean strongly. Stops over-learning spurious repeats.
- **M3 confidence decay + counter-evidence**: `counterEvidence()` subtracts signed
  evidence without touching the mean; `tickClock()` decays unconfirmed confidence
  toward zero. Links are beliefs-with-confidence, never wiring. Loop advances the
  decay clock once per tick.

**HONEST DEFERRAL (in ADR-002, do not remove):** movement-anchor (needs PER-REGION
optical flow — a whole-frame 28-delta is NOT region movement) and auditory source
separation (needs a spectral stream parser) are SPEC'D but NOT BUILT — both require
frame contracts the pipeline does not produce, and faking them would violate the
no-fake-data law. The module measures lagged/prediction-gated/decaying correlation
and does NOT claim causal attribution is solved.

**Discovered during impl:** `SensoryFrame` already carries a validated `timestamp`
— no synthetic tick injection needed at the loop; M1's antecedent gate uses
change-magnitude (the mechanism that actually kills dog/vroom).

**Verified:** 9 causal tests (zero-regression, M1 adversarial dog/car, precedence,
both-static rejection, M2 surprise-vs-repeat, M3 counter-evidence mean-untouched,
decay, no-equivalence/cause field, determinism). v14 438/438, typecheck clean,
engine 432/432 untouched. Nothing committed — operator's trigger.

---

## 2026-08-10 — Phase B: M4 movement-anchor + M2 source-separation SHIPPED (ADR-002)

**The turn:** the operator said "proceed with rigorous implementation." On close
inspection the two mechanisms ADR-002 had deferred as "needing data the pipeline
does not produce" were actually reachable — the pipeline ALREADY produces the data
at the sensor boundary and discards it: `vision_screen` computes a full 89×55
luminance grid before collapsing to the 28-field; `audio_mic` computes a full
Parseval-certified spectrogram before collapsing. Both mechanisms were built on
that real data — no proxy, no fake data (the law held).

**M4 · movement-anchor** (`adapters/sensors/optical_flow.ts`, 216 lines): real
per-region optical flow — Lucas–Kanade brightness constancy, 2×2 structure-tensor
Cramer inversion per region over consecutive luminance grids. A region's vector is
trusted only when its tensor is well-conditioned (aperture floor); a textureless
region reports ~0 confidence rather than a fabricated vector. The dominant
confident region attaches to the vision frame as `motion` (config-gated, additive).

**M2 · source separation** (`adapters/sensors/stream_separator.ts`, 254 lines):
spectral-flux onset segmentation + whitened-signature clustering over the certified
spectrogram → energy-certified auditory streams (bark/car). Three bugs caught by
the battery and fixed honestly: median-flux jitter on a windowed tone (440 Hz is
not periodic in a 1024-bin window → leakage spikes crossed a median-multiple gate;
fixed with a dual median+peak-fraction gate), leading/trailing boundary artifacts
excluded, and degenerate sub-MIN_REGION slivers folded back. Streams carry
Parseval-backed energy mass; <5%-energy slivers dropped.

**Contract** (`schemas/validate.ts`): `SensoryFrame` gained optional `motion`
(MotionAnchor) + `streams` (AudioStreamRef[]) blocks, validate-if-present, reject
loudly on corruption (TRUTH_SOURCES). 28-field byte-identical; both typechecks clean.

**Attribution** (`cross_modal_correlator._attribute`): vision `motion` × audio
`streams` → region↔stream records weighted by energyFraction × confidence, kept in
a separate map alongside the honest whole-frame sample. The dog/car case is now
RESOLVED at two levels: M1 removes the no-antecedent link, and M4+M2 actively
attributes the vroom to the car's moved region while the static dog is exonerated.

**Verified:** v14 454/454 (+16: 5 optical_flow + 5 stream_separator + 6
region_stream_attribution), typecheck clean, engine 432/432 untouched. Phase C
(full generative cross-modal prediction) remains honestly deferred — needs a learned
generative head the project does not yet have. Nothing committed — operator's trigger.

---

## 2026-08-12 — AMR Phase 5: local toroidal closure at refinement boundaries

**Finding (pre-build review):** Phases 1-4 (curvature/criterion/octree/prolongation/
restriction) were already LIVE in `engine/src/refinement/`, Phase 4 wired into
`AdaptiveMesh.coarsen`. The plan's Phase 5 (`boundary.ts` + membrane_stabilizer extend)
was the genuine next step. Built it on the existing flux-form/telescoping operators,
NOT as a parallel structure.

**Baseline captured (all green before any change):** engine 33 files / 432 tests;
tsc clean.

**Build log:**
- `refinement/boundary.ts` — C1 flux-matching closure at non-conforming (hanging-node)
  refinement fronts. `closeFront` enforces value (C0) + first-derivative (C1)
  continuity across a coarse/fine face in flux form; `boundaryCoupling` = PHI_NEG2-graded
  level attenuation (phi^-2 * parent). Constant/mean-preserving; the flux part is exactly
  antisymmetric (conserves the fine SUM); net flux through a closed front ~1e-16 relative.
- Wired into `AdaptiveMesh`: after each refine, the leaf's outer (coarser) faces are
  measured as fronts via `_frontsForLeaf`, closed, and the post-closure residual surfaced
  on the snapshot as `boundaryResidual` + `boundaryFluxResidual`. Observation-only (mesh
  never feeds back). Barrel-exported through `refinement/index.ts`.
- `tests/phase5.boundary.test.ts` — 19 tests: value/flux continuity at full strength,
  gentle-step improvement-without-snap, constant preservation, flux-part sum conservation,
  no-invented-field, net-flux ~0 relative, continuity-gain certificates, malformed-front
  rejection. Honesty tests REFUTE the over-claims (no field invention, partial step does
  not snap, flux part leaves mean unchanged).
- **Verified:** engine 451/451 (was 432; +19), tsc clean. No engine source regressed.
- Next: Phase 6 (adaptive tree governor integrate) / Phase 7 (falsification battery).

---

## 2026-08-12 — P6 STT (VAD-gated whisper sidecar) + Track G core (gematria)

**Finding (pre-build scan):** P6 STT and Track G were the two GENUINELY-absent packages —
every other MASTER_PLAN_V3 package already existed on disk (visual_memory.ts implements
the pHash/dHash/BK-tree the plan says to 'add'; hnsw_index+pq_codec, learning_mode,
telemetry_tape, structured_spine, memory-algorithms all present). Built only what was missing.

**Baseline:** brain v14 463 tests / typecheck 0 (legacy 45 unchanged) before any change.

**Build log:**
- `adapters/sensors/stt_whisper.ts` (P6 + A5) — VAD-gated whisper.cpp sidecar. Energy +
  zero-crossing VAD (25ms frames, 10ms hop) gates the expensive whisper call; LAW 1 honest
  absence (no binary/model -> 'STT not provisioned', never a fabricated transcript); LAW 2
  VAD only suppresses, never invents. Offline; Web Speech API rejected per plan.
  `tests/stt_whisper.test.ts` — 9 green + 1 env-skip (live whisper round-trip gated on
  WHISPER_BIN/MODEL/SAMPLE). VAD skips ~100% silence, >=80% non-speech; provisioning honest.
- `core/gematria.ts` (Track G, plan G1-G3) — the certifiable core: multi-base expansion with
  EXACT rational remainder + the 3-tier precision ladder (EXACT<=76<FLOAT<=1435<BIG);
  digital root dr_b=n mod(b-1) [Cert 5.G1]; digit-sum trajectory [5.G2]; CRT residue
  fingerprint; Z[phi] exact ring {a,b}=a+b*phi closed under +,-,x with norm a^2+ab-b^2 [5.G3,
  the A8 zero-drift tier]; Zeckendorf unique non-consecutive Fibonacci addressing [5.G4].
  Numerology REFUSED by construction (no API returns a meaning). `tests/gematria.test.ts` —
  19 tests, each re-verifying a certificate in TS (dr_b identity over 10^5 n x 9 bases;
  phi^76 zero-drift; Zeckendorf round-trip + non-consecutiveness; CRT uniqueness).
- **Verified:** brain v14 482/482 (was 463; +19), typecheck 0/0 (legacy 45 unchanged).

---

## 2026-08-12 — Track G4 (fractals & self-similarity) — Track G COMPLETE

**Finding (pre-build scan):** G4 was the only Track G item scoped but not built.
Confirmed the field/mode surface exists (`engine.snapshot_field_lattice()`) and the census
law + horizons live in `core/constants.ts`. Built only what was missing, exploiting the
existing constants — no invention.

**Pre-build verification (rigor):** box-counting algorithm validated in Python against
known-dimension sets BEFORE writing TS — recovered Cantor log2/log3=0.63093 and Sierpinski
log8/log3=1.89279 exactly. Census recurrence L(d)=L(d-1)*min(Fib(d),13) (spawn law from
`fractal_node.create_children`) reproduced the certified anchors 41/281/3401/43961; my first
naive product formula was WRONG (30 vs 41) — caught by cross-checking the anchors, fixed by
reading the real spawn law, never guessed.

**Build:**
- `core/fractal_diagnostics.ts` — G4.1 box-counting dimension with OLS log-log slope +
  mandatory 95% CI (validated on Cantor + Sierpinski; empty set = honestly 0; <3 scales =
  honestly NaN, never a fabricated line); G4.2 discrete-scale-invariance (log-periodicity)
  of the phi-ladder, recovering log(sqrt(phi)) = (1/2)log phi with a uniformity gate that
  honestly rejects non-geometric ladders; G4.3 census branching spectrum (Cert 4.D1),
  anchors + F21=10946 cap crossing at CENSUS_CAP_DEPTH=8, `censusLawHolds()` re-verifies
  the cert in TS. Honesty (plan G5): every result carries a CI; NO function returns a
  meaning (numerology refused by construction).
- `tests/fractal_diagnostics.test.ts` — 20 tests. Two real bugs caught by the battery:
  a sign flip in the dimension slope (negated estimate) and a hand-written census-branching
  expectation that was off by one (the module was right; the test was wrong). Both fixed.
- **Verified:** brain v14 502/502 (was 482; +20), typecheck 0/0 (legacy 45 unchanged).
  **Track G (G1-G4) now COMPLETE.**

---

## 2026-08-12 — P8 clean responses (no metric dumps)

**Finding (pre-build read):** the answer path in `adapters/mind_bridge.ts` ALWAYS led with
the deterministic facts-spine (`text = spine + '

ψ: ' + body`) — a metric dump above
the sentence, exactly what P8 forbids. The M5 gates (resonance certificate + mathstral
numeric verification) run BEFORE emission and must stay untouched.

**Build (additive, opt-in):**
- `adapters/clean_response.ts` — pure presentation module. `cleanResponse(parts)` maps the
  already-verified parts to `{ text, details, grounded }`: verified commentary leads as ONE
  bounded sentence (first-sentence + 200-char word-boundary cap); the measured spine +
  provenance (resonance/mathstral/grounded) defers to `details` (one tap away, never
  discarded); numbers lead ONLY when they ARE the answer (no commentary but real facts);
  neither → an honest human refusal, never an empty bubble. No truth added or removed.
- `adapters/mind_bridge.ts` — new optional dep `cleanResponses?: boolean` (default off).
  When on, the answer frame leads with the clean sentence and carries `details`; when off,
  the legacy frame is byte-identical. M5 gates unchanged (they run first, always).
- `tests/clean_response.test.ts` — 9 tests across all three cases + the honesty laws
  (depth preserved not discarded; refusal never empty; numbers only when they are the answer).
- **Verified:** brain v14 511/511 (was 502; +9), typecheck 0/0 (legacy 45 unchanged).
  Wiring into `run_mind_bridge.ts` (flip `cleanResponses: true`) is the operator's call —
  additive and default-off until then.

---

## 2026-08-12 — P9 hosted-model path: A6 provenance-hashed routing

**Finding (pre-build read):** the hosted-model machinery ALREADY exists and is green —
`instrument_router.ts` (ollama/k3 facade, availability measured, switching persisted),
`ollama_supervisor.ts`, `integration.ollama.test.ts`. The GENUINE gap per plan §1 row A6 +
§P9 step 17 was the PROVENANCE HASH on every routed output. Built exactly that, exploiting
the existing router (no parallel path invented).

**Build (additive, non-invasive):**
- `core/provenance.ts` — pure module. `stampProvenance(modelId, prompt, ts)` mints
  sha1(model_id ‖ prompt_hash ‖ ts); `verifyProvenance` recomputes + checks (the resolvable
  half). Content-free: the prompt text is NOT recoverable from the stamp (privacy-preserving
  audit). The dog/cat class of hallucination becomes traceable to the exact model+prompt.
- `cognition/instrument_router.ts` — stores the resolved K3 model id; `answerWithProvenance`
  / `verifyStructureWithProvenance` route through the SAME split facade (identical failover)
  then stamp the outcome with the LIVE instrument-qualified model id (`ollama/phi:latest`,
  `ollama/mathstral:latest` for the verifier, `k3/<env model>`). A failed route is stamped
  too — the audit records the attempt. `InstrumentRouter.verifyProvenance` re-exported.
- `tests/provenance.test.ts` — 13 tests: determinism, verify round-trip, content-free,
  model/prompt/ts each change the hash, tamper-forgery fails verification, empty model id
  rejected, instrument-qualified id resolution (ollama vs verifier vs k3).
- **Verified:** brain v14 524/524 (was 511; +13), typecheck 0/0 (legacy 45 unchanged).
  Live-routing half (a new model actually answering, old models still served) is the
  env-gated `integration.ollama.test.ts` against a real server — not run here (no server).

---

## 2026-08-12 — Track G4 LIVE: field-fractal diagnostics (exploit, not re-implement)

**Finding (pre-build scan):** G4.1/G4.2/G4.3 estimators already existed and were validated
in `core/fractal_diagnostics.ts` (box-count recovers Cantor log2/log3 + Sierpinski log8/log3
within their own CIs; DSI recovers the √φ ladder; census re-derives anchors 41/281/3401/43961).
The GENUINE gap was the LIVE connection G4.1 names: box-count the golden-spiral MODE FIELD and
run G4 as a live diagnostic on the real [nodes][28] lattice. Built the integration layer only —
no estimator re-implemented, engine untouched.

**Baseline:** brain v14 482 tests / typecheck 0 (legacy 45 unchanged) before any change.

**Build log:**
- `core/fractal_field.ts` — G4-live integration, consuming fractal_diagnostics.ts and the
  tape's lattice contract (nodes × 28, pre-order DFS):
  · `fieldOccupiedCells(lattice)` — reshape flattened lattice → per-node (re,im) energy on the
    native nodes × 14-mode grid; threshold above each node's OWN median (structure, not level).
    Honest null: length not ×28 / <2 nodes / flat / uniform (nothing above median).
  · `fieldFractalDimension(lattice)` — box-count the occupied set on dyadic scales [1,2,4,8]
    → measured dimension + 95% CI + r². NaN-slope (too few scales) surfaces as null.
  · `phiBandSelfSimilarity(values,power)` — DSI of the mode power vs the φ-band ladder
    (89·φ^(k/2), ratio √φ); `phiBandCentres` exposes the ladder; theory spacing (1/2)·log φ.
  · `fractalFieldReport(lattice, bandValues?, bandPower?)` — one frame: dimension+CI, DSI
    (null when no band power), theory spacing, and a LIVE censusLawHolds() re-verify (4.D1).
- `tests/fractal_field.test.ts` — 16 tests. Each a measurable claim on KNOWN geometry or an
  honesty law: golden-spiral field D strictly in (0.5,2) with valid CI; structured lattice
  finite D+CI; flat/uniform/wrong-length/single-node lattice → null (never fabricated); φ-band
  power recovers √φ (DSI true), arithmetic ladder honestly NOT DSI; composite report carries
  dimension+DSI+live census; flat lattice still re-verifies census (structure-absent ≠ law-broken).
- **Measured (honest):** golden-spiral field D = 0.627, CI [−0.60, 1.86], r² = 0.71 — a WIDE CI
  from only 4 dyadic scales on a 64×14 grid. The estimator REFUSES to overclaim on a small
  lattice; that is the G5 honesty contract, kept deliberately rather than tightened into a lie.
- **Verified:** brain v14 540/540 (was 482; +58 — includes prior fractal_diagnostics 19-test
  file now counted + 16 new G4-live), typecheck 0/0 (legacy 45 unchanged), engine 451/451 + tsc
  clean, app smoke all-pass. Engine source untouched.
