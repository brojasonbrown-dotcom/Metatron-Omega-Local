/**
 * RHUFT Mind — Telemetry Tape: the engine's own readouts as an internal sense
 *
 * Epistemic Status: [SPEC] — Cognition layer. ADR-001 (Unified Training Loop).
 *
 * THE GAP THIS CLOSES. The mind's SensorBus carries only EXTERNAL senses —
 * screen/file vision, mic/file audio, text/doc feeds, and the LLM's validated
 * answers. The engine's own live mathematics — its certified Fourier spectrum
 * and the four continuity invariants the Σ panel reads — never reach the bus,
 * so the mind cannot learn from the behaviour of its own engine. This adapter
 * is that internal sense: it re-encodes the engine's readouts onto the SAME
 * 28-element field contract and pushes a validated "engine.fourier" frame onto
 * the one bus, so the mind's perception, novelty, and retention machinery treat
 * it exactly like any other sense. No new math is invented — the field is built
 * from the engine's own certified eigenSpectrum (exact FFT) and self-overlap.
 *
 * WHAT A TAPE FRAME CARRIES (all measured on the SAME committed field):
 *   - The φ-weighted eigenmode spectrum, folded onto the 14-mode φ-graded
 *     channel basis (mode k ← the eigenmode nearest 89·φ^(k/2), octave-folded).
 *   - The four continuity invariants: coherence (cos² self-overlap), closure
 *     defect, drift (|log E/E₀|), burden (Σu²) — carried in the frame's meta
 *     (provenance), while the coherence also drives the retention gate.
 *
 * BOUNDED + GOVERNOR-DEFERENT. Emission is throttled (a tape frame at most once
 * per MIN_INTERVAL_TICKS ticks) and DEFERS when the bus is busy — live external
 * perception always wins. The tape is constructed DISABLED: emit() is a no-op
 * until enabled, so the existing suites are byte-for-byte unaffected. The
 * engine is READ, never written; dynamics are untouched. Deterministic. [SPEC]
 */

import { eigenSpectrum } from "../../engine/src/analysis/eigenmodes.ts";
import { spectrumND, powerSpectrum } from "../../engine/src/analysis/spectralND.ts";
import { complexityFromPower } from "../../engine/src/analysis/complexityProbe.ts";
import type { SpectralEnrichment, SpectralCodes } from "./../schemas/validate.ts";
import { at } from "../core/indexing.ts";
import type { SensorBus } from "../adapters/sensors/sensor_bus.ts";

/** φ and its inverse — the graded basis the 14 channels sit on. [MATH] */
const PHI = 1.618033988749895;
const PHI_INV = 0.6180339887498949;

/** The locked field contract: 14 complex modes → 28 interleaved reals. [SPEC] */
export const TAPE_NUM_MODES = 14;
export const TAPE_FIELD_SIZE = 2 * TAPE_NUM_MODES; // 28

/** Emit a tape frame at most once per this many ticks (anti-thrash). [SPEC] */
export const TAPE_MIN_INTERVAL_TICKS = 8;

/** ADR-003 — default ceiling on retained spectral codes: F₈ = 21. Adjustable. [SPEC] */
export const CODE_CAP_DEFAULT = 21;
/** ADR-003 — smallest meaningful code retention (at least the dominant mode). [SPEC] */
export const CODE_CAP_MIN = 1;
/** ADR-003 — hard ceiling on retained codes: F₁₁ = 89, matching the bus capacity. [SPEC] */
export const CODE_CAP_MAX = 89;
/** ADR-003 — default novelty threshold for the event-driven gate: emit early when
 *  the whitened signature's cosine distance from the last EMITTED signature meets
 *  or exceeds this (cos Δ = 1 − cos ∈ [0, 2]; 0.05 ≈ a ~5% spectral-identity move). [SPEC] */
export const EVENT_DELTA_DEFAULT = 0.05;

/** Base spatial frequency of the φ-graded channel basis (matches signal_codec). */
const BASE_FREQ = 89.0;

/**
 * The four continuity invariants, read off the live field. Mirrors the engine
 * loop's own definitions so the tape and the Σ panel report the SAME numbers.
 */
export interface ContinuityInvariants {
  readonly coherence: number; // cos²(u_t, u_{t-1})
  readonly closure: number;   // |Σu| / Σ|u|
  readonly drift: number;     // |log(E/E₀)|
  readonly burden: number;    // Σu²
}

/** A live snapshot the tape encodes: the field + its measured invariants. */
export interface TapeSample {
  readonly field: Float64Array;
  readonly invariants: ContinuityInvariants;
}

/** Live, honest tape counters for the Σ panel / tests. [SPEC] */
export interface TapeStats {
  readonly enabled: boolean;
  readonly emitted: number;
  /** ADR-003 — of `emitted`, how many fired early via the event-driven gate. */
  readonly emittedEarly: number;
  readonly deferredBusy: number;
  readonly deferredInterval: number;
  readonly deferredInvalid: number;
}

/** L2-normalize in place; a zero field stays the honest zero field. */
function normalize(field: Float64Array): Float64Array {
  let norm = 0;
  for (let i = 0; i < field.length; i++) norm += at(field, i) * at(field, i);
  norm = Math.sqrt(norm);
  if (norm === 0) return field;
  for (let i = 0; i < field.length; i++) field[i] = at(field, i) / norm;
  return field;
}

/**
 * ADR-003 — cosine distance (1 − cos θ) between two equal-length whitened
 * signatures, in [0, 2]. 0 = identical spectral identity; the event-driven gate
 * emits early when this meets the threshold. A zero-norm signature is honest
 * maximal distance (2) against any non-zero one — there is nothing to align.
 * Local to the tape: spectral_memory / stream_separator keep their own cosine
 * on their own types; this is the tape's signature comparison, not a duplicate.
 */
function cosineDistance(a: Float64Array, b: Float64Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = at(a, i);
    const y = at(b, i);
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na <= 0 && nb <= 0) return 0; // two empty structures are identical
  if (na <= 0 || nb <= 0) return 2; // one has structure, the other none
  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Encode the engine's eigenmode spectrum onto the 28-field contract.
 *
 * The eigenSpectrum gives N/2+1 real modes with exact Parseval energies. We fold
 * them onto the 14 φ-graded channels: channel k collects the energy of the
 * eigenmode nearest f_k = 89·φ^(k/2) (octave-folded under the Nyquist bin), then
 * the channel amplitudes are φ⁻ᵏ-weighted and L2-normalised — the same graded
 * envelope the sensory codec uses, so the tape field is commensurable with a
 * vision/audio field. Pure, deterministic, energy-honest. [SPEC]
 */
export function tapeFieldFromSpectrum(field: Float64Array): Float64Array {
  if (!(field instanceof Float64Array) || field.length < 2) {
    throw new RangeError("tapeFieldFromSpectrum: need a Float64Array field of ≥ 2 nodes");
  }
  // DC / mean removed FIRST — the tape measures STRUCTURE, not DC offset, the
  // same discipline the sensory codec applies. A flat (DC-only) field therefore
  // encodes to the honest zero field, not to a spurious low-frequency bump.
  let mean = 0;
  for (let i = 0; i < field.length; i++) mean += at(field, i);
  mean /= field.length;
  const centered = new Float64Array(field.length);
  for (let i = 0; i < field.length; i++) centered[i] = at(field, i) - mean;

  // eigenSpectrum takes the engine's `Field` (readonly number[]); the Float64Array
  // is structurally a readonly numeric sequence — spread once to the array type.
  const spec = eigenSpectrum(Array.from(centered)); // throws honestly on non-finite input
  const half = Math.floor(field.length / 2);

  const channelEnergy = new Float64Array(TAPE_NUM_MODES);
  for (let k = 0; k < TAPE_NUM_MODES; k++) {
    // The channel's target frequency, octave-folded to a valid eigenmode bin.
    let bin = Math.round(BASE_FREQ * Math.pow(PHI, k / 2));
    while (bin > half) bin = Math.floor(bin / 2);
    if (bin < 1) bin = 1; // DC carries no structure; the fold starts at bin 1
    const m = spec.modes[bin];
    channelEnergy[k] = m ? m.energy : 0;
  }

  const out = new Float64Array(TAPE_FIELD_SIZE);
  for (let k = 0; k < TAPE_NUM_MODES; k++) {
    const amp = Math.pow(PHI_INV, k) * Math.sqrt(Math.max(0, at(channelEnergy, k)));
    // Place the channel amplitude on the real axis; phase is not resolved by a
    // power spectrum, so the honest imaginary part is 0 (energy, not phase).
    out[2 * k] = amp;
    out[2 * k + 1] = 0;
  }
  return normalize(out);
}

/**
 * P1 — the WHOLE-TREE multidimensional spectral read (the "multidimensional
 * Fourier transformer over the field" the root 1-D tape only shadows).
 *
 * The 28-field tape field encodes a 1-D eigen-power read of ONE field (the root),
 * with phase discarded. The tree's real structure lives in the LATTICE — every
 * node's 28-element field stacked into a [nodes][28] grid — and in the PHASE
 * relations between the node axis and the field axis. This reads that grid with
 * the engine's certified exact n-D FFT (spectrumND, Parseval-gated to machine
 * floor) and returns the certified SpectralEnrichment the bus can carry beside
 * the locked 28-field:
 *
 *   - whitened:  log-power identity signature of the full 2-D spectrum — the
 *                fine-discrimination feature, commensurable with vision/audio.
 *   - complexity: the five measured modal-occupancy numbers (entropy, participation,
 *                flatness, rank99, dominantFraction) from complexityFromPower.
 *   - parsevalResidual: the transform's own energy-conservation certificate.
 *
 * Axis discipline (no speculation): axis 0 = nodes (the Fibonacci recursive
 * structure — real), axis 1 = the 28-element field contract. The grid is the
 * lattice's native shape, not a forced geometry. DC is removed first (structure,
 * not offset) exactly as the 1-D tape does. Pure, deterministic, energy-honest.
 *
 * ADR-003 — the transform ALSO retains its top-k complex coefficients (the
 * spectral CODES) instead of discarding them after whitening. `codeCap` is the
 * adjustable bound on k: the retained count is min(codeCap, rank99) — the
 * field's own rank99 measures how many modes actually carry 99% of the energy,
 * so a quiet field stores few codes and a rich field stores up to the cap.
 * codeCap ≤ 0 disables retention (the legacy whitened+complexity-only frame).
 *
 * @param lattice  Flattened [nodes][28] lattice (length = nodes·28, row-major),
 *                 OR a single field of length ≡ 0 mod 28 (treated as one node's
 *                 field, axis-0 = its elements). Anything else throws honestly.
 * @param codeCap  Adjustable cap on retained coefficients (ADR-003). Default
 *                 CODE_CAP_DEFAULT; ≤ 0 → no codes retained.
 * @returns The enrichment, or null when the lattice is degenerate (a flat /
 *          zero field carries no structure — never invented).
 */
export function spectralEnrichmentFromLattice(
  lattice: ArrayLike<number>,
  codeCap: number = CODE_CAP_DEFAULT,
): SpectralEnrichment | null {
  const flat = lattice instanceof Float64Array ? lattice : Float64Array.from(lattice as ArrayLike<number>);
  const len = flat.length;
  if (len < 2) return null;

  // Shape the grid honestly. A full lattice is nodes × 28; a lone 28-field (the
  // current root path) is a single row read along its own 1-D axis — the exact
  // multidimensional upgrade only engages when ≥ 2 nodes are present.
  const dims = len % TAPE_FIELD_SIZE === 0 && len > TAPE_FIELD_SIZE
    ? [len / TAPE_FIELD_SIZE, TAPE_FIELD_SIZE]
    : [len];

  // DC removal — measure structure, not offset (same discipline as the tape field).
  let mean = 0;
  for (let i = 0; i < len; i++) mean += at(flat, i);
  mean /= len;
  const centered = new Float64Array(len);
  let energy = 0;
  for (let i = 0; i < len; i++) {
    centered[i] = at(flat, i) - mean;
    energy += centered[i]! * centered[i]!;
  }
  // A flat / DC-only field has no spectral structure: report honestly, never invent.
  if (energy === 0) return null;

  // The certified exact n-D transform — throws loudly on non-finite input.
  const spec = spectrumND(centered, dims);
  const power = powerSpectrum(spec);
  const report = complexityFromPower(power);

  // Whitened identity: log1p compresses the dynamic range so a weak but real
  // mode still registers (the same whitening the audio/visual signatures use).
  const whitened = new Float64Array(power.length);
  for (let i = 0; i < power.length; i++) whitened[i] = Math.log1p(at(power, i));

  // ADR-003 — retain the top-k complex coefficients (the codes) from the spec we
  // already computed, rather than discarding it after whitening. k = min(codeCap,
  // rank99): rank99 is the measured count of modes carrying 99% of the energy, so
  // retention tracks real structure while codeCap is the operator's adjustable
  // ceiling. One argsort by power, no extra transform. codeCap ≤ 0 → no codes
  // (the legacy whitened-only frame).
  let codes: SpectralCodes | undefined;
  if (codeCap > 0) {
    const k = Math.max(1, Math.min(Math.floor(codeCap), report.rank99, power.length));
    // Argsort the bins by descending power; deterministic tie-break on index.
    const sorted = Array.from({ length: power.length }, (_, i) => i).sort((a, b) => {
      const d = at(power, b) - at(power, a);
      return d !== 0 ? d : a - b;
    });
    const indices = new Uint32Array(k);
    const re = new Float64Array(k);
    const im = new Float64Array(k);
    for (let m = 0; m < k; m++) {
      const idx = sorted[m]!;
      indices[m] = idx;
      re[m] = at(spec.re, idx);
      im[m] = at(spec.im, idx);
    }
    // dims anchor the flat indices so each retained mode can be placed back on
    // the grid (the engine's SpectrumND carries them; we keep the codes self-describing).
    codes = { topK: k, dims: [...spec.dims], indices, re, im };
  }

  return {
    whitened,
    complexity: {
      entropyNorm: report.entropyNorm,
      participation: report.participation,
      flatness: report.flatness,
      rank99: report.rank99,
      dominantFraction: report.dominantFraction,
    },
    parsevalResidual: spec.parsevalResidual,
    ...(codes ? { codes } : {}),
  };
}

/**
 * The Telemetry Tape. Reads the engine's committed field + invariants, encodes
 * a tape frame, and pushes it onto the bus — bounded, deferred when busy, and
 * inert until enabled. [SPEC]
 */
export class TelemetryTape {
  private _enabled: boolean;
  private readonly _bus: SensorBus;
  private _lastEmitTick = -TAPE_MIN_INTERVAL_TICKS; // allow an immediate first emit
  private _emitted = 0;
  private _deferredBusy = 0;
  private _deferredInterval = 0;
  private _deferredInvalid = 0;
  /** ADR-003 — adjustable ceiling on retained spectral codes (clamped to [CODE_CAP_MIN, CODE_CAP_MAX]). */
  private _codeCap = CODE_CAP_DEFAULT;
  /** ADR-003 — event-driven gate switch. Default false → fixed-interval throttle only (byte-identical to before). */
  private _eventDriven = false;
  /** ADR-003 — cosine-distance novelty threshold for the event-driven gate. */
  private _eventDelta = EVENT_DELTA_DEFAULT;
  /** ADR-003 — the whitened signature of the last EMITTED frame (the change reference). */
  private _lastEmittedSignature: Float64Array | null = null;
  private _emittedEarly = 0;

  /**
   * @param bus     The one validated SensorBus (READ/WRITE only via push).
   * @param enabled Master switch. Default false → emit() is a no-op (today).
   */
  constructor(bus: SensorBus, enabled: boolean = false) {
    this._bus = bus;
    this._enabled = enabled;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Flip the master switch. Returns the previous state (for an honest journal). */
  setEnabled(next: boolean): boolean {
    const prev = this._enabled;
    this._enabled = next;
    return prev;
  }

  /**
   * ADR-003 — adjust the spectral-code ceiling at runtime. Clamped honestly to
   * [CODE_CAP_MIN, CODE_CAP_MAX]; a value ≤ 0 disables retention. Returns the
   * previous cap (for an honest journal), matching setEnabled's idiom.
   */
  setCodeCap(next: number): number {
    const prev = this._codeCap;
    this._codeCap =
      next <= 0 ? 0 : Math.max(CODE_CAP_MIN, Math.min(CODE_CAP_MAX, Math.floor(next)));
    return prev;
  }

  /** ADR-003 — the current code ceiling (0 = retention disabled). */
  get codeCap(): number {
    return this._codeCap;
  }

  /**
   * ADR-003 — flip the event-driven gate. When on, the tape may emit BEFORE the
   * fixed interval elapses if the spectral identity has moved by ≥ eventDelta
   * from the last emitted frame. Default off. Returns the previous state.
   */
  setEventDriven(next: boolean, delta?: number): boolean {
    const prev = this._eventDriven;
    this._eventDriven = next;
    if (delta !== undefined && Number.isFinite(delta) && delta >= 0) {
      this._eventDelta = delta;
    }
    return prev;
  }

  /** ADR-003 — whether the event-driven gate is on. */
  get eventDriven(): boolean {
    return this._eventDriven;
  }

  /**
   * Attempt one tape emission this tick. Pure gate + encode + push; never throws,
   * never mutates the engine, never competes with live external perception.
   *
   * @param tick    The loop's current tick (for the anti-thrash interval).
   * @param sample  The committed field + its measured continuity invariants.
   * @param lattice OPTIONAL whole-tree flattened lattice ([nodes][28]). When
   *                supplied and valid, the frame ALSO carries a certified
   *                multidimensional SpectralEnrichment (spectrumND over the
   *                grid) beside the unchanged 28-field. Omit / malformed → the
   *                legacy root-field-only frame, byte-identical to before.
   * @returns true when a frame was actually pushed onto the bus.
   */
  emit(tick: number, sample: TapeSample, lattice?: ArrayLike<number> | null): boolean {
    if (!this._enabled) return false;

    // Live external perception always wins: defer when the bus already holds a
    // backlog, so the tape never floods the F_11 = 89-frame queue.
    if (this._bus.stats().queued > 0) {
      this._deferredBusy++;
      return false;
    }

    let field: Float64Array;
    try {
      field = tapeFieldFromSpectrum(sample.field);
    } catch {
      // A degenerate/non-finite field is reported honestly, never pushed.
      this._deferredInvalid++;
      return false;
    }

    // P1 — the multidimensional read. Only attempt the whole-tree enrichment when
    // a lattice was actually handed over; a flat/degenerate one yields no spectral
    // block (honest "no structure"), never a fabricated one. Failure to enrich
    // NEVER blocks the frame — the 28-field + invariants are the primary sense.
    // ADR-003 — the enrichment now also retains the top-k spectral codes
    // (adjustable via setCodeCap) from the transform it already runs.
    let spectral: SpectralEnrichment | undefined;
    if (lattice != null) {
      try {
        spectral = spectralEnrichmentFromLattice(lattice, this._codeCap) ?? undefined;
      } catch {
        spectral = undefined; // degenerate lattice → root-field-only frame
      }
    }

    // Anti-thrash + the ADR-003 event-driven gate. The fixed interval is the
    // default; the event gate can OVERRIDE it only when the spectral identity has
    // genuinely moved — a measured cosine distance from the last EMITTED frame's
    // whitened signature, not a guess. First-ever frame always passes (nothing to
    // compare against → maximal novelty). The interval still throttles a field
    // that has NOT moved, so a quiet mind emits no faster than before.
    const sinceLast = tick - this._lastEmitTick;
    if (sinceLast < TAPE_MIN_INTERVAL_TICKS) {
      let novel = false;
      if (this._eventDriven && spectral) {
        const prev = this._lastEmittedSignature;
        if (prev === null || prev.length !== spectral.whitened.length) {
          novel = true; // first frame, or a resolution change: treat as new
        } else {
          const distance = cosineDistance(prev, spectral.whitened);
          novel = distance >= this._eventDelta;
        }
      }
      if (!novel) {
        this._deferredInterval++;
        return false;
      }
      // else: a measured spectral change — emit early, counted honestly below.
    }

    const inv = sample.invariants;
    const accepted = this._bus.push({
      source: "engine.fourier",
      timestamp: Date.now(),
      meta: {
        origin: "engine.telemetry",
        coherence: inv.coherence.toFixed(6),
        closure: inv.closure.toExponential(3),
        drift: inv.drift.toExponential(3),
        burden: inv.burden.toFixed(4),
      },
      field,
      ...(spectral ? { spectral } : {}),
    });
    if (!accepted) {
      this._deferredInvalid++;
      return false;
    }
    if (sinceLast < TAPE_MIN_INTERVAL_TICKS) this._emittedEarly++;
    this._lastEmitTick = tick;
    // ADR-003 — the change reference for the next event-gate comparison is the
    // signature of the frame we just emitted (copy; the bus owns the frame).
    this._lastEmittedSignature = spectral ? Float64Array.from(spectral.whitened) : null;
    this._emitted++;
    return true;
  }

  /** Live, honest counters for the Σ panel and the tests. */
  stats(): TapeStats {
    return {
      enabled: this._enabled,
      emitted: this._emitted,
      emittedEarly: this._emittedEarly,
      deferredBusy: this._deferredBusy,
      deferredInterval: this._deferredInterval,
      deferredInvalid: this._deferredInvalid,
    };
  }
}
