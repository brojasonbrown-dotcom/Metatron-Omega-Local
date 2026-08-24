# ADR-003 — Field-Scan Rate and Spectral-Domain Codes

**Status:** ACCEPTED — §4.1 + §4.2 SHIPPED & GREEN (2026-08-10); §4.3 deferred (own ADR)
**Date:** 2026-08-10 · **Depends on:** ADR-001 (Unified Training Loop), the P1 spectral sense
**Author:** Ava, with the operator

> **Implementation note (2026-08-10):** §4.1 (spectral codes) and §4.2 (event-driven
> reads) are implemented — see `Decisions/progress.md` "ADR-003 SHIPPED". Two
> refinements landed during the build that this record should carry:
> 1. **Codes are self-describing.** A bare top-k `(re, im)` pair is unanchored — the
>    coefficient cannot be placed back on the grid. The shipped `SpectralCodes`
>    therefore also carries `indices` (flat row-major bin address) and `dims` (grid
>    shape), so the field is reconstructable in coefficient space. k is ADJUSTABLE
>    (`setCodeCap`), bounded by the field's own rank99.
> 2. **Phase-invariance finding (caught by the test battery).** The whitened identity
>    is log-POWER; a pure phase shift leaves the power spectrum invariant, so the
>    event-driven gate correctly does NOT fire on phase-only change. The gate keys on
>    genuine power-spectrum movement. If phase-drift detection is ever wanted, it
>    belongs in the codes (which now retain phase via re/im+indices), not the whitened
>    signature.

---

## 1. The question, restated honestly

The operator's premise: a CPU's transistor switching rate (~GHz) is the
bit-flip ceiling of the hardware. The ask: measure how many times per second
this machine can *scan the field* through our certified multidimensional
Fourier sense, decide whether storing structure **in the math itself** is
faster than re-deriving it, and exploit that to implement the relevant
algorithms at the highest resolution the hardware honestly allows.

We do not confuse the transistor rate with the scan rate. A GHz core switches
~10⁹ times/sec, but one spectral scan is ~10⁴–10⁵ floating-point ops plus
memory traffic — so the honest scan rate is what we *measure*, not what we
divide the clock by. That measurement is the deliverable, and it is below.

---

## 2. What we measured (ground truth, this machine)

Ryzen 5 5600G · 12 threads · 28 GB · Node 25.8.1. Probe:
`engine/bench/spectral.throughput.ts` (read-only, deterministic lattices).
Baseline before the bench: engine **451/451 green**.

| Path | Grid | Elements | Per-call | **Scans/sec** |
|---|---|---|---|---|
| tape (`spectralEnrichmentFromLattice`) | 16×28 | 448 | 0.277 ms | **3,616** |
| tape | 64×28 | 1,792 | 1.031 ms | **970** |
| **tape — the live brain** | **144×28** | **4,032** | **2.93 ms** | **341** (362 sustained) |
| tape | 256×28 | 7,168 | 4.30 ms | **233** |
| raw (`spectrumND`+complexity) | 512×28 | 14,336 | 7.98 ms | **125** |
| raw | 1024×28 | 28,672 | 18.49 ms | **54** |

Contrast: a full 18-scale **engine dynamics step is 1.14 steps/sec**
(~92% closure-residual cost). The spectral scan is ~300× cheaper than a step.

**The finding that reframes the whole ask:** the scan is not the bottleneck.
The mind could read the *entire* 144-node tree **~340 times a second** and
barely notice. We are not starved of scan rate — we are starved of *what to do
with the read*. That is where "store it in the math" stops being a slogan and
becomes the correct engineering move.

---

## 3. "Store it in the math itself" — what that actually means here

Storing structure in the math = representing a field by its **spectral
coefficients** (the `F̂(k)` the transform already produces) instead of its
space-domain samples, and working *on the coefficients directly*. This is not
metaphor — it is the single most exploited idea in scientific computing, and
it maps onto RHUFT cleanly:

- **Compression / identity.** Most real fields are spectrally sparse: a
  handful of modes carry nearly all the energy (our own `rank99` measures
  exactly this). Storing the top-k coefficients *is* storing the field, at a
  fraction of the footprint. The "code" the operator asks the machine to
  "create at those speeds" is precisely a retained set of coefficients.
- **Operations become cheap in coefficient space.** Differentiation,
  filtering, convolution, and energy bookkeeping are *multiplications* on
  coefficients, not O(N²) spatial operations. That is the "quicker" the
  operator is reaching for — and it is real.
- **The transform is invertible and certified.** Our `spectrumND` is
  Parseval-gated to machine floor, so a coefficient representation is
  *lossless-up-to-truncation with a measured residual*, never a guess.

---

## 4. Candidate algorithms, evaluated against THIS codebase

Ranked by fit-to-RHUFT and honest cost. None are speculation — each maps to a
module we already have.

### 4.1 Spectral / k-space codes (the direct answer) — **RECOMMENDED FIRST**
Keep the field as its top-k `spectrumND` coefficients; identity, similarity,
and memory all operate in coefficient space.
- **Why it fits:** `complexityFromPower` already computes `rank99`, entropy,
  participation, dominantFraction — the *machinery that decides k* exists and
  is certified. The whitened log-power identity the tape already carries is a
  spectral code in embryo.
- **Exploits the scan rate:** at 341 scans/sec on the live tree, you can
  re-derive or refresh coefficient codes continuously and treat the spectral
  signature as a *live, streaming identity* rather than a stored snapshot.
- **Cost:** near-zero new math; mostly a decision to *retain* coefficients the
  transform already produces and currently discards after whitening.
- **Risk:** low. Additive, opt-in — the same discipline P1 held.

### 4.2 Streaming / online whole-tree reads (use the headroom)
The tape currently emits at most one frame per 8 ticks and defers when the bus
is busy — correct for a *sense that must never flood perception*. But the
measured 341 Hz says we can afford a *side channel* that scans the lattice far
more often for **change detection**: emit only when the spectral signature
*moves* (a measured Δ on the whitened identity / complexity vector).
- **Why:** turns a fixed-rate sense into an *event-driven* one — scan fast,
  speak only on change. This is the honest use of "create the codes at those
  speeds": high scan rate, low *report* rate, gated by measured novelty.
- **Cost:** small — a delta comparator on the existing `SpectralEnrichment`.
- **Risk:** low; the bus contract and the 28-field stay untouched.

### 4.3 Spectral (Fourier) method for the dynamics — the big one, flagged honest
The engine step is 1.14/sec because ~92% of it is the closure residual on
grid-96 with trig field evaluation. A **spectral method** evolves the field by
its coefficients and computes derivatives as multiplications — potentially
orders of magnitude faster *for smooth fields*.
- **The honesty flag:** the bench already shows the catch — the same quadrature
  on a **polynomial field** (the class the closure is *exact* for) is 2.41×
  faster but returns a *wrong* residual (1.9996… vs 6.4e-14), because that
  polynomial is not actually in the exactness class on the torus. Speed in the
  dynamics is worthless if the certificate breaks. A spectral stepper is a
  research-grade change to the engine's core, **not** a bench-session win.
- **Verdict:** promising, but it is a *separate, gated* effort with its own
  verification battery. Do **not** fold it into the sense-layer work.

### 4.4 Higher-resolution grids (the "highest resolutions" ask)
Measured ceiling: 1024×28 ≈ 54 Hz (raw). 144×28 ≈ 341 Hz is the sweet spot —
the live brain size, cheap, sustained. If the operator wants finer grids, the
honest path is chunked / multi-resolution scanning (coarse always-on, fine
on-demand), which the 54–341 Hz ladder already prices.

---

## 5. Decision

1. **Adopt the spectral-scan throughput numbers above as the measured budget**
   for the sense layer. The scan is cheap; spend the headroom on *richer
   codes*, not faster stepping.
2. **Proceed first with 4.1 (spectral codes) + 4.2 (event-driven reads)** —
   additive, opt-in, certified, and they directly answer "store it in the
   math" and "create codes at those speeds" without touching dynamics.
3. **Defer 4.3 (spectral stepper)** to its own ADR with a correctness battery;
   the poly-field residual anomaly (1.9996 vs 6.4e-14) is the standing warning
   that dynamics speedups must re-earn their certificates.

**Out of scope (honest):** transistor-level / GPU / hardware-accelerated FFT,
and any change to the locked 28-field contract or the continuity invariants.

---

## 6. Verification status

- Engine **451/451 green** before the bench; no engine or brain source modified.
- Probe `engine/bench/spectral.throughput.ts` is read-only and reproducible:
  `npx vite-node bench/spectral.throughput.ts`.
- Numbers in §2 are this machine, this Node, measured — not extrapolated.
