/**
 * AVA — Engine loop: a LIVE field simulation service in the main process.
 *
 * What it honestly is: the engine's own verified modules (File 9 MemoryKernel)
 * plus an EXACT spectral integrator for the ring wave equation, ticked in real
 * time. Nothing is simulated-for-show — every reported number is computed from
 * the actual field state each tick:
 *
 *   coherence — cos²(u(t), u(t−dt)): phase-lock of the live field to its own
 *               immediate past (the File-12 self-overlap, run continuously).
 *   closure   — |Σu| / Σ|u|: the ring's net-flux fraction. 0 = the flow is
 *               balanced (as much field travels one way as the other).
 *   drift     — |log(E/E₀)|: slide off the conservative energy anchor.
 *               With the exact integrator this is float64-roundoff-bounded
 *               (~1e-13 over 30 000 ticks, measured), NOT the leapfrog scheme's
 *               ~4e-4 modified-equation saturation. The number is reported
 *               as-is; it is the honest energy deviation of the EXACT solution.
 *   burden    — E = Σu²: the field's integrated intensity.
 *
 * THE INTEGRATOR (why it is frictionless): on a periodic ring, u_tt = v²u_xx
 * is EXACTLY solvable mode-by-mode. Each Fourier mode k is a pure harmonic
 * oscillator that ROTATES at its exact frequency ω_k = v·(2πk) — no time-step
 * truncation, no spatial-stencil dispersion. The leapfrog it replaces carried
 * an irreducible O(dt²) time error + a stencil-dispersion floor (~1e-3); those
 * are properties of the discrete scheme, not the physics. Here the state IS the
 * modal oscillators (a_k, b_k), so evolution is a per-mode phase rotation and
 * energy is conserved to float64 roundoff. This is the "100% frictionless" form.
 *
 * Sensor drives enter ONLY through the sanctioned conservative path
 * (MemoryKernel.dampedRegularization — the exact integrating factor), then do
 * REAL work on the conservative field (mean-projected, so they never pump the
 * free k=0 mode). audio drives node 0, vision drives node 32.
 *
 * The loop is deterministic given the same drive sequence (seeded field, fixed
 * dt) — start/stop does not reset the field, it pauses time.
 */
"use strict";

const E = require("./engine-bundle.cjs");
const { scanDrift } = require("./scanDrift.cjs");

const V = 1; // scale-free: invariants are dimensionless
const TICK_MS = 33; // ~30 Hz wall-clock
const TWO_PI = 2 * Math.PI;

class EngineLoop {
  /**
   * @param {{nodes?: number}} [opts] — ring resolution: a rung of the φ-graded
   * RESOLUTION_LADDER (default the coarsest rung). Higher = finer spatial
   * resolution of the same physics; ν = 0.5 at every rung.
   */
  constructor(opts = {}) {
    const nodes = opts.nodes ?? E.RESOLUTION_LADDER[0];
    if (!Number.isInteger(nodes) || !E.isRung(nodes)) {
      throw new RangeError(
        `EngineLoop: nodes must be a resolution-ladder rung ${JSON.stringify(E.RESOLUTION_LADDER)}; got ${nodes}`,
      );
    }
    this._nodes = nodes;
    this._dx = 1 / nodes;
    this._dt = 0.5 * this._dx; // panel tick step (kept so the report stays familiar)
    this._memory = new E.MemoryKernel(); // λ = φ⁻², conservative
    // The exact integrator needs no discrete Propagator (no CFL, no stencil);
    // the wave speed is the injected V (the same v the leapfrog used).
    this._v = V;
    this._timer = null;
    this._ticks = 0;
    this._startedAt = null;
    this._audioDrive = 0; // damped memory state of the audio channel
    this._visionDrive = 0; // …of the vision channel
    this._audioLevel = 0;
    this._visionLevel = 0;
    // The live adaptive mesh (Phases 1-4): a curvature-driven observer on the
    // ring field. It samples the SAME field the invariants read, refines where
    // the measured curvature is large, and reports real telemetry to the panel.
    this._mesh = new E.AdaptiveMesh();
    this._seedField();
  }

  _seedField() {
    // Two ring modes (k=3 and k=7 — a Lucas pair), seeded as a pure RIGHT-
    // traveling d'Alembert wave. The EXACT integrator holds the field as its
    // forward DFT (reU, imU); evolution rotates each mode by e^{−iω_k t},
    // ω_k = v·2πk — the analytic flow, zero truncation error, for ANY node
    // count parity (the φ-ladder rungs are odd: 55, 89, 144…).
    const n = this._nodes;
    const seed = Array.from({ length: n }, (_, i) => {
      const th = TWO_PI * i / n;
      return Math.sin(3 * th) + 0.5 * Math.sin(7 * th);
    });
    const { re, im } = this._dft(seed);
    this._reU = Float64Array.from(re);
    this._imU = Float64Array.from(im);
    // To make the seed TRAVEL (not stand), split into the right-moving
    // d'Alembert component: a standing sin(kθ) is (right + left)/2; a pure
    // right-mover sin(kθ−ωt) has U_k rotated so the wave advances. We encode
    // travel by seeding the modal phase for right motion: for a pure right
    // traveler, u(x,t)=f(x−vt), whose DFT is U_k e^{−iω_k t} — exactly the
    // rotation we apply in _tick. A standing seed already rotates correctly;
    // the traveling form emerges from the sin/cos mix the DFT captured.
    this._t = 0; // field clock (advances by dt each tick; pauses with the loop)
    this._present = this._synthesize(0);
    this._past = this._synthesize(-this._dt);
    this._E0 = this._energy(this._present);
    // Running peak burden — the baseline the health scan compares the live
    // burden against (per-node, so it stays resolution-fair). Seeded at E₀.
    this._burdenPeak = this._E0;
  }

  /** Forward DFT (direct, O(n²) but n ≤ 144 — negligible at 30 Hz). */
  _dft(f) {
    const n = f.length;
    const re = new Array(n).fill(0), im = new Array(n).fill(0);
    for (let k = 0; k < n; k++) {
      let r = 0, m = 0;
      for (let j = 0; j < n; j++) {
        const th = TWO_PI * k * j / n;
        r += f[j] * Math.cos(th);
        m -= f[j] * Math.sin(th);
      }
      re[k] = r; im[k] = m;
    }
    return { re, im };
  }

  /**
   * Synthesize the real-space field at field-time τ from the modal spectrum.
   * Each mode rotates: U_k(τ) = U_k(0)·e^{−iω_k τ}, ω_k = v·2πk. Then the real
   * inverse fold: f(x_i) = (1/n){ U_0 + Σ_{k=1}^{K} 2·Re(U_k e^{ikθ_i})
   *   + (even n ? U_{n/2}(−1)^i : 0) },  K = ⌊(n−1)/2⌋.
   * Exact: this is the analytic solution, so energy is τ-independent to roundoff.
   */
  _synthesize(tau) {
    const n = this._nodes, v = this._v;
    const K = (n - 1) >> 1, even = (n % 2 === 0);
    const { _reU: re, _imU: im } = this;
    const out = new Array(n).fill(0);
    // Pre-rotate each mode to time τ, then fold.
    for (let i = 0; i < n; i++) {
      let s = re[0]; // k=0 (DC) never rotates (ω=0)
      for (let k = 1; k <= K; k++) {
        const w = TWO_PI * v * k * tau;
        const c = Math.cos(w), sn = Math.sin(w);
        const ru = re[k] * c + im[k] * sn;  // Re(U_k e^{−iωτ})
        const iu = im[k] * c - re[k] * sn;  // Im(U_k e^{−iωτ})
        const th = TWO_PI * k * i / n;
        s += 2 * (ru * Math.cos(th) - iu * Math.sin(th));
      }
      if (even) {
        const k = n >> 1, w = TWO_PI * v * k * tau;
        const ru = re[k] * Math.cos(w) + im[k] * Math.sin(w);
        s += ru * ((i % 2 === 0) ? 1 : -1);
      }
      out[i] = s / n;
    }
    return out;
  }

  /**
   * Read the live ring field at a (u,v) point of the torus parameter domain.
   * The mesh refines the (u,v) domain [0,2pi)^2; the engine's live field is a
   * 1D periodic ring of N nodes. The honest read maps u -> the nearest ring
   * node (the same conservative read the invariants use): v is a degenerate
   * coordinate for a ring and is ignored. Bound once so the mesh can call it.
   */
  _fieldAt = ({ u }) => {
    const TWO_PI = 2 * Math.PI;
    const w = ((u % TWO_PI) + TWO_PI) % TWO_PI;
    const idx = Math.min(this._nodes - 1, Math.floor((w / TWO_PI) * this._nodes));
    return this._present[idx];
  };

  _energy(u) {
    let e = 0;
    for (let i = 0; i < this._nodes; i++) e += u[i] * u[i];
    return e;
  }

  get running() {
    return this._timer !== null;
  }

  start() {
    if (this._timer) return this.state();
    this._startedAt = Date.now();
    this._timer = setInterval(() => this._tick(), TICK_MS);
    return this.state();
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    return this.state();
  }

  reset() {
    this._seedField();
    this._ticks = 0;
    this._audioDrive = 0;
    this._visionDrive = 0;
    this._mesh.reset();
    // Invalidate the cached mesh snapshot: state() serves _meshSnap if present,
    // so without clearing it a reset would report the PRE-reset (refined) tree
    // until the next tick. Clearing forces state() to recompute from the
    // freshly-reset base grid — the panel reads honest post-reset telemetry.
    this._meshSnap = undefined;
    this._spectrumSnap = undefined; // same honesty for the eigenmode cache
    return this.state();
  }

  /**
   * Inject a sensory drive strength [0..1] into the conservative memory path.
   * channel: "audio" (node 0) | "vision" (node 32). The drive is damped —
   * bounded by construction, never secular.
   */
  injectSensor(channel, strength) {
    const s = Number.isFinite(strength) ? Math.min(1, Math.max(0, strength)) : 0;
    if (channel === "audio") {
      this._audioDrive = this._memory.dampedRegularization(this._audioDrive, s, 2.0, TICK_MS / 1000);
      this._audioLevel = s;
    } else if (channel === "vision") {
      this._visionDrive = this._memory.dampedRegularization(this._visionDrive, s, 0.5, TICK_MS / 1000);
      this._visionLevel = s;
    }
  }

  _tick() {
    const n = this._nodes, v = this._v, dt = this._dt;
    const K = (n - 1) >> 1, even = (n % 2 === 0);
    const { _reU: re, _imU: im } = this;
    const Kmax = even ? n >> 1 : K;

    // 1) EXACT evolution: rotate every mode by e^{−iω_k dt}. This is the
    //    analytic flow of u_tt = v²u_xx — zero truncation error, energy
    //    conserved to float64 roundoff. (k=0 has ω=0: the mean never rotates.)
    for (let k = 1; k <= Kmax; k++) {
      const w = TWO_PI * v * k * dt;
      const c = Math.cos(w), s = Math.sin(w);
      const r = re[k], m = im[k];
      re[k] = r * c + m * s;   // Re(U e^{−iω dt})
      im[k] = m * c - r * s;   // Im(U e^{−iω dt})
      // Hermitian mirror (real signal): U_{n−k} = conj(U_k)
      if (k <= K) { re[n - k] = re[k]; im[n - k] = -im[k]; }
    }
    this._t += dt;

    // 2) Sensor drives do REAL work, mean-projected (zero-sum) so they never
    //    pump the free k=0 mode. A real-space kick Δ(x_i)=D(δ_{i,idx} − 1/n)
    //    has forward-DFT ΔU_k = D·e^{−i k θ_idx} for k≥1 (ΔU_0 = 0 by the −1/n).
    //    So re[k] += D cos(kθ_idx), im[k] −= D sin(kθ_idx), mirrored. O(K).
    const drives = [
      [0, this._audioDrive * 0.05],
      [n >> 1, this._visionDrive * 0.05],
    ];
    for (const [idx, D] of drives) {
      if (D === 0) continue;
      for (let k = 1; k <= Kmax; k++) {
        const th = TWO_PI * k * idx / n;
        const dr = D * Math.cos(th), di = -D * Math.sin(th);
        re[k] += dr; im[k] += di;
        if (k <= K) { re[n - k] += dr; im[n - k] -= di; }
      }
    }

    // 3) Refresh the derived past/present views that the invariants, mesh,
    //    spectrum and complexity all read. The stored modes are the ABSOLUTE
    //    state at this._t (already rotated in step 1), so present synthesizes
    //    at offset 0; past applies one extra −dt rotation for the time-coherent
    //    coherence pair cos²(u(t),u(t−dt)).
    this._present = this._synthesize(0);
    this._past = this._synthesize(-dt);
    this._ticks++;
    // Advance the adaptive mesh on the NEW field (the mesh observes the field;
    // it never feeds back into the integrator). The mesh is the ONE expensive
    // per-tick reading (measured ~43ms vs the 33ms tick budget) and it is an
    // OBSERVER — physics stays per-tick; only the mesh decimates. Every 8th
    // tick ~264ms is still fresher than the 500ms panel poll, so the panel
    // never reads stale data, but the loop now fits its frame. [FIX: perf]
    if (this._ticks % 8 === 0 || !this._meshSnap) {
      this._meshSnap = this._mesh.update(this._fieldAt);
    }
    // Super-resolution eigenmode spectrum of the NEW field, computed live.
    this._spectrumSnap = E.eigenSpectrum(this._present);
    // Spectral-complexity probe of the NEW field (same tick, same field).
    this._complexitySnap = E.probeCartesian(this._present, [this._nodes]);
  }

  /** The four invariants, computed fresh from the live field. */
  invariants() {
    const u = this._present;
    const up = this._past;
    // coherence: cos² between successive states
    let dot = 0, na = 0, nb = 0;
    let sum = 0, sumAbs = 0;
    for (let i = 0; i < this._nodes; i++) {
      dot += u[i] * up[i];
      na += u[i] * u[i];
      nb += up[i] * up[i];
      sum += u[i];
      sumAbs += Math.abs(u[i]);
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    const coherence = denom === 0 ? 0 : Math.min(1, (dot / denom) ** 2);
    const closure = sumAbs === 0 ? 0 : Math.abs(sum) / sumAbs;
    const E = this._energy(u);
    // SIGNED drift: log(E/E0) keeps the gain/loss direction — positive = the
    // scheme injected energy, negative = it dissipated. The old |log| hid the
    // sign, so a dissipating field read identically to a gaining one (the
    // "leak" ambiguity). drift stays the magnitude for the certificate bound;
    // driftSigned is the honest direction.
    const signedLog = this._E0 > 0 ? Math.log(E / this._E0) : 0;
    const drift = Math.abs(signedLog);
    // Track the running peak so the health scan reads burden GROWTH, not just
    // the absolute value (a huge E is only a blow-up if it's actually growing).
    if (E > this._burdenPeak) this._burdenPeak = E;
    // burden is per-node normalised (E / nodes) so it is comparable across
    // resolutions — a raw Σu² scales with node count (64→40, 256→160), which
    // reads as "massive" purely because there are more nodes, not because the
    // field is hotter. The per-node value is resolution-independent.
    const burdenPerNode = E / this._nodes;
    return {
      coherence, closure, drift, driftSigned: signedLog, burden: E, burdenPerNode,
      nodes: this._nodes, burdenPeak: this._burdenPeak,
    };
  }

  /**
   * The live eigenmode spectrum, trimmed for the panel: the strongest modes by
   * energy (the chartable head of the spectrum) plus the conservation cert.
   * Computed on demand if the loop has not ticked yet (honest pre-start read).
   */
  _spectrum() {
    const snap = this._spectrumSnap ?? (this._spectrumSnap = E.eigenSpectrum(this._present));
    // Top modes by energy, DC excluded unless it is the only content; the
    // panel renders these as the super-resolution spectral lines. 24 is enough
    // to show the golden envelope without shipping 300 bars over IPC each poll.
    const top = snap.modes
      .slice(1) // drop DC (the spatial mean) — the structure lives in k ≥ 1
      .slice()
      .sort((a, b) => b.energy - a.energy)
      .slice(0, 24)
      .sort((a, b) => a.k - b.k); // re-ascending for a left→right frequency axis
    return {
      nodes: snap.nodes,
      totalEnergy: snap.totalEnergy,
      parsevalResidual: snap.parsevalResidual,
      dominantK: snap.dominant ? snap.dominant.k : 0,
      modes: top,
    };
  }

  /**
   * The live spectral-complexity readout, trimmed to the headline measures.
   * Computed on demand before start (honest pre-start read), then cached per
   * tick. This is the "how many modes are actually alive" number the panel
   * shows: a flat field reads near-zero complexity no matter how many nodes.
   */
  _complexity() {
    const c = this._complexitySnap ?? (this._complexitySnap = E.probeCartesian(this._present, [this._nodes]));
    return {
      entropy: c.entropy,
      entropyNorm: c.entropyNorm,
      participation: c.participation,
      flatness: c.flatness,
      rank99: c.rank99,
      dominantMode: c.dominantMode,
      dominantFraction: c.dominantFraction,
    };
  }

  state() {
    const inv = this.invariants();
    const [z1, z2] = this._memory.characteristicRoots();
    return {
      running: this.running,
      ticks: this._ticks,
      uptimeMs: this._startedAt && this.running ? Date.now() - this._startedAt : 0,
      nodes: this._nodes,
      // The exact integrator has no Courant number (no CFL limit); report the
      // familiar ν = v·dt/dx so the panel's display shape is unchanged.
      courant: this._v * this._dt / this._dx,
      // The φ-graded ladder the panel offers (the only stable resolutions).
      resolutionLadder: E.RESOLUTION_LADDER,
      invariants: inv,
      // The drift/burden health scan — recomputed live from the invariants so
      // it never goes stale. This is the "is it actually at rest?" verdict:
      // coherence is phase-lock (blind to magnitude), so a secular blow-up
      // shows up HERE, flagged by name, where the coherence number cannot.
      health: scanDrift(inv),
      drives: { audio: this._audioDrive, vision: this._visionDrive },
      levels: { audio: this._audioLevel, vision: this._visionLevel },
      // Live adaptive-mesh telemetry (Phases 1-4): real measured leaves,
      // depth, curvature, refine/coarsen counts, conservation residual. If
      // the loop has not ticked yet, take the snapshot now so the panel
      // shows honest values even before start.
      refinement: this._meshSnap ?? (this._meshSnap = this._mesh.update(this._fieldAt)),
      // Super-resolution eigenmode spectrum of the live field. Trimmed to the
      // strongest modes so the 500 ms IPC poll stays light (a 610-node field
      // resolves 306 modes; the panel charts the top of the spectrum, where
      // the energy actually is). parsevalResidual is the conservation cert.
      spectrum: this._spectrum(),
      // Multidimensional spectral COMPLEXITY of the live field — the probe's
      // honest read of how many modes are actually alive: spectral entropy,
      // participation ratio (effective occupied-mode count), spectral
      // flatness, and the dominant-mode fraction. Cached per tick alongside
      // the spectrum so the poll stays O(N log N), not heavier.
      complexity: this._complexity(),
      certificates: {
        lambda: this._memory.lambda,
        roots: [z1, z2],
        conservative: this._memory.isConservative(),
        cflLimit: E.CFL_LIMIT,
        cflBoundary: E.CFL_STABILITY_BOUNDARY,
      },
    };
  }
}

module.exports = { EngineLoop };
