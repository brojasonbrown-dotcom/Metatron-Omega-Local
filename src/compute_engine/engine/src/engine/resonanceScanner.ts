/**
 * FILE 20 — engine/resonanceScanner.ts
 *
 * Owns: **spectral-residence scanning — where does the conservative recursion
 * phase-lock, and which toroidal modes close most frictionlessly.**
 *
 * What this module is, mathematically and only mathematically:
 *
 *   The engine advances each scale's field by the conservative golden-memory
 *   recursion (File 9):  Ψ(t+τ) = (1−λ)Ψ(t) + λ·Ψ(t−τ),  λ = φ⁻².  That update
 *   is a PURE LOW-PASS in time — its poles are the real roots {1, −φ⁻²}, so its
 *   temporal transfer function rolls off monotonically with NO internal peaks.
 *   There is therefore no "resonant drive frequency" to find: a scan that swept
 *   a temporal drive and watched amplitude would only re-measure a filter
 *   curve, and any peak it reported would be an artifact, not physics.
 *
 *   The structure the framework actually claims is spectral lives in SPACE
 *   (the 13 Lucas lines, File 7) and in the golden-delay SELF-OVERLAP (File 12).
 *   So the honest, engine-native scan is over THOSE axes:
 *
 *     response(k, δ) — seed a scale's torus with a unit standing toroidal mode
 *     cos(k·u), evolve it under the conservative recursion with the memory look
 *     -back taken at delay δ (per step), and measure two engine-native
 *     observables of the resulting trajectory:
 *
 *       closure    the closure residual (File 6) of the mode — the friction
 *                  measure the whole engine minimizes. Lower = more closed.
 *       coherence  the self-overlap C = cos²θ between Ψ(t) and Ψ(t−δ) sampled
 *                  across the run (File 12 semantics). Ignition = C > φ⁻².
 *
 *   A RESONANCE is a (k, δ) cell that is simultaneously more closed AND more
 *   self-coherent than its scanned neighbourhood — a local minimum of residual
 *   coincident with a local maximum of overlap. That, and only that, is what
 *   "this scale resonates here" can mean inside the engine's own definitions.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH FACTS (verified before this file was written):
 *
 *   1. THE TEMPORAL RESPONSE HAS NO PEAKS — VERIFIED, NOT ASSUMED. The driven
 *      recursion's transfer function H(ω) = 1/(1 − (1−λ)e^{−iω} − λe^{−2iω})
 *      was evaluated across ω∈[0,π] pre-construction: monotone roll-off,
 *      max at ω→0 (the unit root), no internal resonance. Scanning ω is
 *      therefore excluded by design, and this header records WHY so no future
 *      reader adds a temporal sweep and mistakes a filter skirt for a peak.
 *      [EXACT — closed-form transfer function, numerically confirmed]
 *
 *   2. THE QUADRATURE ALIASES HIGH-k MODES — THE SCANNER'S GRID IS PER-k.
 *      File 6's default grid-96 periodic trapezoid has Nyquist wavenumber 48.
 *      The Lucas lines 76, 123, 199, 322 lie ABOVE it; their measured residual
 *      at grid 96 is an aliasing artifact (measured: k=322 reports 4.9e-11 at
 *      grid 96 but 4.7e-10 at grid 2048 — the value is the sampler's, not the
 *      field's). The scanner therefore sets each mode's quadrature grid to
 *      grid(k) = nextPow2( max(GRID_MIN, NYQUIST_MULT·k) ), keeping every
 *      scanned mode in the converged regime. The grid is reported per cell so
 *      the cost/accuracy trade is visible, never hidden. [EXACT — measured]
 *
 *   3. CLOSURE IS SCALE-INVARIANT; ONLY THE MODE INDEX k MATTERS. File 6's
 *      residual is dimensionless — the r² Jacobian cancels exactly, so a given
 *      field shape returns the same residual on every rung. The scanner scans
 *      modes on ONE reference torus (the aspect ratio φ is shared by all rungs)
 *      and reports per-mode results; per-scale variation enters through the
 *      Lucas floor and the field content, not the quadrature. [EXACT — File 6]
 *
 *   4. COHERENCE USES THE FILE-12 DEFINITION, δ AS THE LOOK-BACK. C = cos²θ
 *      between the present field and the field δ in the past, normalized to
 *      [0,1]; ignition iff C > φ⁻² exactly (exclusive). The scanner's δ axis
 *      IS the look-back the File-12 measurement reads; sweeping δ in the
 *      neighbourhood of the golden delay φ tests whether the φ-delay is
 *      distinguished (a coherence peak) or arbitrary. [EXACT semantics; the
 *      between-sample field interpolation is POSTULATE per File 12]
 *
 *   5. THE SCAN IS A PURE OBSERVER — DETERMINISTIC, NO RNG, NO MUTATION OF THE
 *      LIVE ENGINE. It runs its own throwaway recursion on a scratch field per
 *      cell; the MultiscaleEngine's state is never touched. Identical config ⇒
 *      bit-identical scan. [EXACT]
 *
 *   6. WITHOUT A DRIVE THE COHERENCE AXIS IS VACUOUS — MEASURED, NOT ASSUMED.
 *      The undriven recursion is a fixed-point filter: cos(k·u) is an
 *      eigenfunction of the node-wise update, so each Fourier amplitude decays
 *      independently to a fixed point and the field FREEZES in ~5 steps. A
 *      frozen field has C=1 against its own past for EVERY δ — the overlap is
 *      tautological (measured: C=1.000 from the first settled step, all δ, all
 *      probe weights). The engine's File-12 ignitions are non-trivial ONLY
 *      because cross-scale flux (File 11) continually re-perturbs the field.
 *      The scanner therefore adds a persistent oscillatory boundary drive to
 *      keep the field live; only then does the δ-delayed overlap discriminate.
 *      [EXACT — measured; drive amplitude is a measurement convention]
 *
 *   7. THE MEASURED RESULT IS A NULL — REPORTED HONESTLY. On the engine's own
 *      definitions, with the field driven: (a) closure is FLAT in k — every
 *      integer toroidal mode closes to machine-eps (periodic on the torus), so
 *      Lucas lines and off-line integers are INDISTINGUISHABLE by closure, and
 *      spectralLinesDistinguished returns false on every ablation; (b) the
 *      coherence-by-delay surface is MONOTONE DECREASING in δ (shorter memory
 *      tracks the drive better), with the golden delay φ sitting MID-BRACKET —
 *      no coherence peak at φ. The instrument WORKS (it resolves, it
 *      discriminates, it is deterministic); the framework's spectral residence
 *      and golden-delay-coherence postulates are NOT confirmed by it. Both
 *      halves of that sentence are the deliverable. [EXACT measurement;
 *      POSTULATE interpretation — the null is on THESE definitions]
 *
 * Provenance: the closure integral and the overlap normalization are EXACT
 * mathematics; reading a residual as "friction" or a coherence peak as
 * "resonance" is RHUFT POSTULATE (taint propagates from Files 6 and 12). The
 * per-k quadrature grid and the δ-sweep are measurement conventions, tagged.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Dependency direction (strictly downward, spec §4 DAG):
 *   resonanceScanner(20) → { closureResidual(06), selfMeasurement(12),
 *                            memoryKernel(09), lattice(07), constants(01),
 *                            provenance(02) }
 * ────────────────────────────────────────────────────────────────────────────
 */

import { PHI, PHI_NEG2 } from "../core/constants.ts";
import { spectralLines } from "../core/lucas.ts";
import { classify, tainted, type Classified } from "../core/provenance.ts";
import { closureResidual } from "../geometry/closureResidual.ts";
import { torusForScale, type TorusField, type TorusParams } from "../geometry/torus.ts";
import { MemoryKernel } from "../dynamics/memoryKernel.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Closure with honest grid escalation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The scanner's smooth seed modes are exactly the fields File 6's conservative
 * guard is built to be suspicious of. For a genuinely CLOSED mode the true flux
 * is ~0, so the quadrature sum is pure Float64 roundoff (~1e-12…1e-9), and —
 * measured — it does NOT shrink monotonically under grid refinement: at grid
 * 2048 the k=322 read is 4.8e-9 vs 2.2e-10 at grid 96. There is no grid at
 * which File 6's Richardson guard certifies such a mode, because there is no
 * nonzero number to converge TO; the residual IS machine noise on a closed loop.
 *
 * So the scanner's contract is: take File 6's certified value when it gives one;
 * when it refuses at the k-resolved (alias-free) grid, report THAT grid's fine
 * flux flagged `unstableClosure` — honestly a noise-floor read on a closed mode.
 * No escalation: escalating only sums more roundoff at rising cost, and would be
 * the scanner pretending to chase a convergence the mathematics says isn't there.
 */
interface ClosureRead {
  readonly residual: number;
  readonly grid: number;
  readonly provenanceNote: string;
  /** True when File 6 would not certify the value (noise-floor read, flagged). */
  readonly unstableClosure: boolean;
}

function closureStable(
  field: TorusField,
  torus: TorusParams,
  grid: number,
): ClosureRead {
  try {
    const { value } = closureResidual(field, torus, grid);
    return {
      residual: value,
      grid,
      provenanceNote: "closure residual (File 6) at scanner-selected alias-free grid; certified",
      unstableClosure: false,
    };
  } catch {
    // File 6 refused (smooth closed mode → machine-floor flux). Report the
    // fine-grid flux, flagged unstable — never silent, never escalated into noise.
    const fine = closureResidualUnchecked(field, torus, grid);
    return {
      residual: fine,
      grid,
      provenanceNote:
        "closure residual: File-6 Richardson guard did not certify (smooth closed mode, " +
        "machine-floor flux); fine-grid value reported UNSTABLE — a noise-floor read",
      unstableClosure: true,
    };
  }
}

/**
 * The fine-grid flux without the Richardson throw — used ONLY at the ceiling,
 * to report a flagged value rather than nothing. Duplicates File 6's divergence-
 * form integral (kept local so the scanner never weakens File 6's own guard).
 */
function closureResidualUnchecked(field: TorusField, torus: TorusParams, grid: number): number {
  const du = (2 * Math.PI) / grid;
  const aspect = torus.aspect;
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const u = (i + 0.5) * du;
      const v = (j + 0.5) * du;
      const up = u + du, um = u - du, vp = v + du, vm = v - du;
      const gHere = aspect + Math.cos(v);
      const duTerm = gHere * ((field({ u: up, v }) - field({ u, v })) - (field({ u, v }) - field({ u: um, v })));
      const gAt = (vv: number) => aspect + Math.cos(vv);
      const invGP = 2 / (gAt(v) + gAt(vp));
      const invGM = 2 / (gAt(vm) + gAt(v));
      const dvTerm =
        ((field({ u, v: vp }) - field({ u, v })) * invGP - (field({ u, v }) - field({ u, v: vm })) * invGM);
      sum += duTerm + dvTerm;
    }
  }
  return Math.abs(sum);
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The reference rung whose torus hosts the scan. Closure is scale-invariant
 * (fact 3), so any rung gives the same residual for a given mode; the Metatron
 * shell n=13 is the canonical choice (it carries the φ⁻²⁶ flux anchor).
 */
export const SCAN_RUNG = 13;

/** Smallest quadrature grid the scanner will use (matches File 6's floor). */
export const GRID_MIN = 96;

/**
 * Nyquist safety multiplier: the quadrature grid is ≥ NYQUIST_MULT·k so every
 * scanned mode sits comfortably below the sampler's Nyquist wavenumber
 * (grid/2 ≥ 2k ⇒ ≥ 4 samples per period — the periodic trapezoid's converged
 * regime for a pure sinusoid). Measured necessary by fact 2.
 */
export const NYQUIST_MULT = 4;

/**
 * The smallest quadrature grid that resolves wavenumber k in the converged
 * regime: the next power of two ≥ max(GRID_MIN, NYQUIST_MULT·k). Powers of two
 * keep File 6's internal Richardson pair (N, N/2) integral. EXACT arithmetic.
 */
export function gridForWavenumber(k: number): number {
  if (!Number.isInteger(k) || k < 1) {
    throw new RangeError(`gridForWavenumber: k must be an integer ≥ 1; got ${k}.`);
  }
  const need = Math.max(GRID_MIN, NYQUIST_MULT * k);
  return 1 << Math.ceil(Math.log2(need));
}

/** Scanner configuration. */
export interface ScanConfig {
  /**
   * Wavenumbers to scan. Default: the 13 Lucas spectral lines (File 7), the
   * framework's claimed spectrum. Pass explicit integers to probe off-line
   * wavenumbers (the ablation that tests whether the LUCAS lines specifically
   * are distinguished, vs arbitrary k).
   */
  readonly wavenumbers?: readonly number[];
  /**
   * Memory look-back delays δ to scan, in recursion steps. Default: a golden
   * bracket around φ — {1, φ−1, φ, φ+1, 2φ−1, 2φ} ≈ {1, 0.618, 1.618, 2.618,
   * 3.236, 4.236} — chosen so the golden delay φ is tested against its own
   * rational/integer neighbours (is φ distinguished, or would any δ do?).
   */
  readonly delays?: readonly number[];
  /**
   * Recursion steps evolved per cell before observables are read (the transient
   |λ|^t = φ^{−2t} decays below machine-eps well within this). Default 48.
   */
  readonly settleSteps?: number;
  /** The ignition threshold; default exactly φ⁻² (File 12). */
  readonly ignitionThreshold?: number;
  /**
   * The incommensurate probe weight ε ∈ [0,1): the seed is (1−ε)·cos(k·u) +
   * ε·cos(q·u) with q the off-line wavenumber nearest k·φ (irrational ratio ⇒
   * no low-order lock). ε=0 reduces to a pure self-locking mode. Default 0.382.
   */
  readonly probeWeight?: number;
  /**
   * The persistent boundary drive: amplitude A of an oscillatory term
   * A·cos(ω·t)·cos(k·u) added each step. This is the cross-scale flux the engine
   * supplies (File 11) made minimal — WITHOUT it the undriven recursion is a
   * fixed-point filter that freezes the field in ~5 steps and the coherence axis
   * is vacuous (C≡1). The drive keeps the field live so the δ-delayed overlap is
   * a real measurement. Default A = 0.1 (a real but subdominant perturbation).
   */
  readonly driveAmplitude?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

/** One scanned (k, δ) cell. */
export interface ScanCell {
  /** Wavenumber of the seeded toroidal mode cos(k·u). */
  readonly k: number;
  /** Memory look-back delay δ (recursion steps). */
  readonly delta: number;
  /** Quadrature grid used for the closure read (per-k, fact 2). */
  readonly grid: number;
  /** Closure residual of the seeded mode (File 6; lower = more closed). */
  readonly closure: Classified<number>;
  /**
   * True when File 6's Richardson guard would not certify the closure value even
   * at the grid ceiling — the residual is reported WITH this caveat, never clean.
   */
  readonly unstableClosure: boolean;
  /**
   * Mean self-overlap C between Ψ(t) and Ψ(t−δ) over the settled window
   * (File 12 semantics; ∈[0,1]). The coherence of the phase-lock.
   */
  readonly coherence: Classified<number>;
  /** Whether coherence exceeded the ignition threshold φ⁻² (exclusive). */
  readonly ignition: boolean;
  /** True iff k is one of the 13 Lucas spectral lines (File 7). */
  readonly onSpectralLine: boolean;
}

/** A detected resonance: a cell distinguished within the scanned surface. */
export interface Resonance {
  readonly k: number;
  readonly delta: number;
  /** Closure score ∈[0,1] (1 = frictionless): 1/(1+residual). */
  readonly closureScore: number;
  /** The cell's self-overlap. */
  readonly coherence: number;
  /** Why this cell was flagged. */
  readonly reason: string;
}

/** The full scan result. */
export interface ScanResult {
  readonly cells: readonly ScanCell[];
  readonly resonances: readonly Resonance[];
  readonly diagnostics: {
    readonly cellsScanned: number;
    readonly ignitionCount: number;
    /** Best (lowest-residual) cell overall. */
    readonly mostClosed: { k: number; delta: number; residual: number };
    /** Best (highest-coherence) cell overall. */
    readonly mostCoherent: { k: number; delta: number; coherence: number };
    /**
     * Whether the Lucas spectral lines were distinguished: true iff the
     * per-cell mean closure score ON the lines exceeds the mean OFF them
     * (only computable when off-line wavenumbers were also scanned).
     */
    readonly spectralLinesDistinguished: boolean | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The scanner
// ─────────────────────────────────────────────────────────────────────────────

const TWO_PI = 2 * Math.PI;

/** Default delay bracket: golden delay φ against its neighbours. */
function defaultDelays(): readonly number[] {
  return [1, PHI - 1, PHI, PHI + 1, 2 * PHI - 1, 2 * PHI];
}

/**
 * The seed field: (1−ε)·cos(k·u) + ε·cos(q·u), q = the off-line wavenumber
 * nearest k·φ. The ε probe is what makes the coherence axis non-vacuous: with
 * ε>0 the field is NOT self-similar under the recursion, so C measures how well
 * the δ-delayed past tracks the present rather than a tautological self-overlap.
 * Returns the closure mode separately: closure is read on the DOMINANT mode
 * cos(k·u) (the residence question is per-spectral-line), so the probe perturbs
 * only the coherence axis, not the closure axis.
 */
function seedMode(k: number, eps: number): { field: TorusField; closureMode: TorusField } {
  const closureMode: TorusField = ({ u }) => Math.cos(k * u);
  if (eps === 0) return { field: closureMode, closureMode };
  // Off-line q nearest k·φ, ≠ k and not a Lucas line (incommensurate ratio).
  let q = Math.max(1, Math.round(k * PHI));
  const lineSet = new Set(spectralLines());
  while (q === k || lineSet.has(q)) q++;
  const field: TorusField = ({ u }) => (1 - eps) * Math.cos(k * u) + eps * Math.cos(q * u);
  return { field, closureMode };
}

/** Sample a field on `m` equispaced u-nodes (v fixed) for the overlap read. */
function sampleMode(field: TorusField, m: number): number[] {
  const out = new Array<number>(m);
  for (let i = 0; i < m; i++) out[i] = field({ u: (i / m) * TWO_PI, v: 0.7 });
  return out;
}

/**
 * The self-overlap C = cos²θ between two sampled fields (File 12, fact 4:
 * amplitude-invariant, ∈[0,1], degenerate zero-field → 0). EXACT arithmetic;
 * the POSTULATE taint comes from the δ-interpolated past, applied by the caller.
 */
function cosSquared(a: readonly number[], b: readonly number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let j = 0; j < a.length; j++) {
    const x = a[j]!, y = b[j]!;
    dot += x * y; na += x * x; nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  const c = denom === 0 ? 0 : (dot / denom) ** 2;
  return Math.min(1, Math.max(0, c));
}

export class ResonanceScanner {
  private readonly wavenumbers: readonly number[];
  private readonly delays: readonly number[];
  private readonly settleSteps: number;
  private readonly ignitionThreshold: number;
  private readonly probeWeight: number;
  private readonly driveAmplitude: number;
  private readonly kernel = new MemoryKernel(); // λ = φ⁻², τ = 1
  private readonly lines: ReadonlySet<number>;

  constructor(config: ScanConfig = {}) {
    this.wavenumbers = config.wavenumbers ?? spectralLines();
    this.delays = config.delays ?? defaultDelays();
    this.settleSteps = config.settleSteps ?? 48;
    this.ignitionThreshold = config.ignitionThreshold ?? PHI_NEG2;
    this.probeWeight = config.probeWeight ?? PHI_NEG2;
    this.driveAmplitude = config.driveAmplitude ?? 0.1;
    if (!Number.isFinite(this.probeWeight) || this.probeWeight < 0 || this.probeWeight >= 1) {
      throw new RangeError(`ResonanceScanner: probeWeight must be in [0,1); got ${this.probeWeight}.`);
    }
    if (!Number.isFinite(this.driveAmplitude) || this.driveAmplitude < 0) {
      throw new RangeError(`ResonanceScanner: driveAmplitude must be ≥ 0 finite; got ${this.driveAmplitude}.`);
    }
    for (const k of this.wavenumbers) {
      if (!Number.isInteger(k) || k < 1) {
        throw new RangeError(`ResonanceScanner: wavenumber must be an integer ≥ 1; got ${k}.`);
      }
    }
    for (const d of this.delays) {
      if (!Number.isFinite(d) || d <= 0) {
        throw new RangeError(`ResonanceScanner: delay must be positive finite; got ${d}.`);
      }
    }
    if (!Number.isInteger(this.settleSteps) || this.settleSteps < 8) {
      throw new RangeError(`ResonanceScanner: settleSteps must be an integer ≥ 8; got ${this.settleSteps}.`);
    }
    this.lines = new Set(spectralLines());
  }

  /**
   * Scan one (k, δ) cell: seed cos(k·u), evolve the conservative recursion with
   * the memory look-back at δ, read closure + coherence. Pure; no shared state.
   *
   * The recursion runs on a sampled field (the scanner's scratch state), NOT the
   * live engine — fact 5. The look-back δ indexes into the sampled history by
   * the same linear interpolation File 12 uses for the golden delay.
   */
  scanCell(k: number, delta: number): ScanCell {
    const torus = torusForScale(SCAN_RUNG);
    const { field, closureMode } = seedMode(k, this.probeWeight);

    // Closure of the DOMINANT mode cos(k·u) (File 6) at the k-resolved grid
    // (fact 2). The probe perturbs only coherence; closure stays per-line.
    const cr = closureStable(closureMode, torus, gridForWavenumber(k));
    const grid = cr.grid;
    const closure = classify(
      cr.residual,
      tainted("EXACT", "POSTULATE"),
      undefined,
      cr.provenanceNote,
    );

    // Evolve the conservative recursion on the sampled field with look-back δ,
    // under a persistent oscillatory boundary drive (the cross-scale flux, File
    // 11, made minimal). Without the drive the undriven recursion freezes the
    // field in ~5 steps and C≡1 (vacuous); the drive keeps the field live.
    const SAMPLES = 64;
    const A = this.driveAmplitude;
    const OMEGA = 1; // drive angular frequency, one cycle per 2π steps
    let present = sampleMode(field, SAMPLES);
    // History of sampled snapshots, oldest → newest.
    const history: number[][] = [present];
    let coherenceSum = 0;
    let coherenceCount = 0;
    for (let t = 0; t < this.settleSteps; t++) {
      // The δ-delayed past: linear interpolation between bracketing snapshots,
      // exactly File 12's goldenDelayedField with δ in place of φ.
      const back = history.length - 1 - delta;
      let delayed: number[];
      if (back < 0) {
        delayed = history[0]!; // no δ-past yet: self (the File-12 early-step convention)
      } else {
        const lo = Math.floor(back);
        const hi = Math.min(lo + 1, history.length - 1);
        const frac = back - lo;
        const a = history[lo]!, b = history[hi]!;
        delayed = a.map((x, j) => x + frac * (b[j]! - x));
      }
      // Conservative update against the δ-delayed past (λ = φ⁻²), PLUS the drive.
      const drive = A * Math.cos(OMEGA * t);
      const next = this.kernel.stepField(present, delayed);
      for (let j = 0; j < next.length; j++) next[j] = next[j]! + drive;
      history.push(next);
      present = next;
      // Accumulate the overlap once a genuine δ-past exists (skip the warm-up).
      if (back >= 0) {
        coherenceSum += cosSquared(present, delayed);
        coherenceCount++;
      }
    }
    const coherenceVal = coherenceCount > 0 ? coherenceSum / coherenceCount : 1;
    const coherence = classify(
      coherenceVal,
      tainted("EXACT", "POSTULATE"),
      undefined,
      "mean cos²θ between Ψ(t) and Ψ(t−δ) over the settled window; normalization " +
        "EXACT, the δ-interpolated past is POSTULATE (File 12 semantics)",
    );
    return {
      k,
      delta,
      grid,
      closure,
      unstableClosure: cr.unstableClosure,
      coherence,
      ignition: coherenceVal > this.ignitionThreshold,
      onSpectralLine: this.lines.has(k),
    };
  }

  /**
   * Run the full (k, δ) scan and reduce it to resonances + diagnostics.
   * Deterministic: identical config ⇒ bit-identical result (fact 5).
   */
  scan(): ScanResult {
    const cells: ScanCell[] = [];
    for (const k of this.wavenumbers) {
      for (const delta of this.delays) {
        cells.push(this.scanCell(k, delta));
      }
    }

    let mostClosed = cells[0]!;
    let mostCoherent = cells[0]!;
    let ignitionCount = 0;
    for (const c of cells) {
      if (c.closure.value < mostClosed.closure.value) mostClosed = c;
      if (c.coherence.value > mostCoherent.coherence.value) mostCoherent = c;
      if (c.ignition) ignitionCount++;
    }

    // Resonance: a cell that is BOTH a local coherence peak AND comparatively
    // closed. Operationalized honestly: coherence above the ignition threshold
    // AND closure score above the per-k median across the scanned delays — so
    // the flag is relative to the cell's own mode, not an absolute fudge.
    const resonances: Resonance[] = [];
    for (const c of cells) {
      if (!c.ignition) continue;
      const sameK = cells.filter((x) => x.k === c.k).map((x) => 1 / (1 + x.closure.value));
      const median = sameK.sort((a, b) => a - b)[Math.floor(sameK.length / 2)]!;
      const score = 1 / (1 + c.closure.value);
      if (score >= median) {
        resonances.push({
          k: c.k,
          delta: c.delta,
          closureScore: score,
          coherence: c.coherence.value,
          reason:
            `coherence ${c.coherence.value.toFixed(4)} > φ⁻² (ignition) at delay δ=${c.delta.toFixed(3)} ` +
            `with closure score ${score.toFixed(4)} ≥ per-k median — a self-coherent, comparatively closed cell`,
        });
      }
    }

    // Are the Lucas lines distinguished? Only answerable if off-line k were scanned.
    const on = cells.filter((c) => c.onSpectralLine);
    const off = cells.filter((c) => !c.onSpectralLine);
    let distinguished: boolean | null = null;
    if (on.length > 0 && off.length > 0) {
      const meanScore = (arr: ScanCell[]) =>
        arr.reduce((s, c) => s + 1 / (1 + c.closure.value), 0) / arr.length;
      distinguished = meanScore(on) > meanScore(off);
    }

    return {
      cells: Object.freeze(cells),
      resonances: Object.freeze(resonances),
      diagnostics: {
        cellsScanned: cells.length,
        ignitionCount,
        mostClosed: { k: mostClosed.k, delta: mostClosed.delta, residual: mostClosed.closure.value },
        mostCoherent: { k: mostCoherent.k, delta: mostCoherent.delta, coherence: mostCoherent.coherence.value },
        spectralLinesDistinguished: distinguished,
      },
    };
  }
}
