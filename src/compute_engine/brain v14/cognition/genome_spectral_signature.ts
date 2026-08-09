/**
 * cognition/genome_spectral_signature.ts — THE GENOME'S SPECTRAL SIGNATURE
 * ("the DNA scan").
 *
 * Epistemic Status: [SPEC] — cognition-layer analysis. The field lattice it
 * reads is real engine state (the same [nodeCount][28] lattice the Field-State
 * Genome records); the transform is the certified, machine-floor `spectrumND`
 * the perception layer already trusts. Nothing here is canned or estimated —
 * every certificate is computed live from the recorded history.
 *
 * What this honestly is: the mind's own spectral fingerprint, read off the
 * lattice HISTORY rather than a single snapshot. For each of the 28 field
 * components we keep a rolling window of the last W ticks across the node
 * lattice, then run a 2-D certified transform `spectrumND(node, time)` per
 * component. The 2-D power spectrum answers the two questions a single-snapshot
 * read cannot:
 *
 *   - SPACE axis  — WHERE on the lattice a component's energy concentrates
 *                   (low spatial bin = broad, global structure; high spatial
 *                   bin = fine, local patchiness).
 *   - TIME axis   — HOW that structure evolves (DC bin = static; low temporal
 *                   bin = slow drift / contemplation; high temporal bin = fast
 *                   oscillation / churn).
 *
 * Aggregating the 28 component spectra yields the fingerprint: which standing
 * waves the field is actually composed of, the "thinking tempo" (spectral
 * centroid), the "cognitive diversity" (how many modes are alive — spectral
 * entropy), and a whitened identity vector comparable across minds and across
 * epochs via cosine similarity — reading the DNA by resonance.
 *
 * Why a dedicated window (not the genome's tiered rings): the genome's hot ring
 * is F₈ = 21 snapshots — too coarse for frequency resolution — and its warm
 * tier is a persistence boundary the analyzer should not couple to. This module
 * keeps its OWN bounded ring (F₁₂ = 144 ticks) fed from the loop, independent
 * of genome constants and independently testable. The genome's recording
 * contract is untouched. [SPEC]
 *
 * Additive tap, zero regression: `observe` copies one lattice column per tick
 * (never aliases the engine's buffers) and `signature` computes on demand, off
 * the tick hot-path. RNG-free; the scan is a pure function of the window.
 */

import { spectrumND, powerSpectrum } from "../../engine/src/analysis/spectralND.ts";
import { FIELD_COMPONENTS } from "./field_genome.ts";

/** Rolling window depth: F₁₂ = 144 ticks of lattice history. [MATH] */
export const SPECTRAL_WINDOW_TICKS = 144;
/** Minimum ticks before a signature is meaningful (2-D transform needs ≥ 2 per axis). */
export const MIN_WINDOW_TICKS = 8;
/** Parseval machine-floor tolerance — the bit-level honesty gate. [MATH] */
export const PARSEVAL_TOLERANCE = 1e-6;

/** One standing wave: a (component, spatial-bin, temporal-bin) mode that is alive. */
export interface StandingWave {
  /** Which of the 28 field components carries this mode. */
  readonly component: number;
  /** Spatial wavevector bin across the node lattice (0 = global/DC). */
  readonly spatialBin: number;
  /** Temporal wavevector bin across the window (0 = static/DC). */
  readonly temporalBin: number;
  /** Modal power |F̂|² (real-space energy units, Parseval-folded). */
  readonly power: number;
  /** Share of the total live power this mode carries, in (0, 1]. */
  readonly fraction: number;
  /** Oscillation frequency in cycles per tick (temporalBin / windowTicks). */
  readonly frequency: number;
}

/** The mind's spectral fingerprint at one moment. */
export interface GenomeDNA {
  /** Ticks of history actually analysed (≤ SPECTRAL_WINDOW_TICKS). */
  readonly windowTicks: number;
  /** Node lattice width analysed. */
  readonly nodeCount: number;
  /** Field components analysed (always FIELD_COMPONENTS = 28). */
  readonly components: number;
  /** Top standing waves, descending by power (static DC modes excluded). */
  readonly standingWaves: readonly StandingWave[];
  /**
   * Thinking tempo: power-weighted mean temporal frequency, cycles/tick.
   * Low = slow, sustained thought; high = rapid churn. 0 on a static field.
   */
  readonly spectralCentroid: number;
  /**
   * Cognitive diversity: normalised spectral entropy of the temporal power
   * distribution in [0, 1]. 1 = energy spread across all modes (rich); 0 = one
   * dominant drone. [MATH]
   */
  readonly spectralEntropy: number;
  /**
   * Whitened fingerprint vector (log1p of the aggregated temporal power
   * spectrum). Compare two scans with `signatureSimilarity` to measure the
   * mind's DNA drifting across epochs. [MATH]
   */
  readonly fingerprint: Float64Array;
  /**
   * Honesty gate: worst Parseval residual across all 28 certified transforms.
   * Must sit at machine floor; a scan that fails is not the Fourier transform.
   */
  readonly maxParsevalResidual: number;
  /** True when every component transform conserved energy within tolerance. */
  readonly certified: boolean;
}

/**
 * The rolling lattice-history window and the certified scan over it. Owns its
 * buffers; `observe` copies, `signature` never mutates the window.
 */
export class GenomeSpectralSignature {
  /** Ring buffer: `ring[c]` is the flattened [node][tick-in-window] plane for component c. */
  private readonly _ring: Float64Array[] = [];
  private readonly _window: number;
  private _nodeCount = 0;
  private _filled = 0; // ticks written so far (saturates at _window)
  private _head = 0; // next write position within the window
  /** Previous scan's fingerprint, for drift measurement across epochs. */
  private _prevFingerprint: Float64Array | null = null;

  constructor(window: number = SPECTRAL_WINDOW_TICKS) {
    if (!Number.isInteger(window) || window < MIN_WINDOW_TICKS) {
      throw new RangeError(`genome_spectral_signature: window must be ≥ ${MIN_WINDOW_TICKS}; got ${window}.`);
    }
    this._window = window;
  }

  get windowTicks(): number {
    return this._window;
  }

  get filled(): number {
    return Math.min(this._filled, this._window);
  }

  /**
   * Record one tick's lattice. `lattice` is the flattened [nodeCount][28]
   * row-major field (the same layout `FieldGenome.record` receives). The bytes
   * are COPIED into the component planes; the caller's buffer is never aliased,
   * so feeding the scan never perturbs the engine or the genome. [SPEC]
   */
  observe(lattice: Float64Array, nodeCount: number): void {
    if (nodeCount < 2) return; // a single node has no spatial spectrum to read
    if (lattice.length !== nodeCount * FIELD_COMPONENTS) {
      throw new RangeError(
        `genome_spectral_signature.observe: lattice length ${lattice.length} ≠ ${nodeCount}×${FIELD_COMPONENTS}.`
      );
    }
    // (Re)allocate the ring if this is the first tick or the lattice resized.
    if (this._nodeCount !== nodeCount) {
      this._nodeCount = nodeCount;
      this._ring.length = 0;
      for (let c = 0; c < FIELD_COMPONENTS; c++) {
        this._ring.push(new Float64Array(nodeCount * this._window));
      }
      this._filled = 0;
      this._head = 0;
    }
    const t = this._head;
    for (let c = 0; c < FIELD_COMPONENTS; c++) {
      const plane = this._ring[c]!;
      // plane[node * window + t] = lattice[node * 28 + c]
      for (let n = 0; n < nodeCount; n++) {
        plane[n * this._window + t] = lattice[n * FIELD_COMPONENTS + c]!;
      }
    }
    this._head = (this._head + 1) % this._window;
    this._filled++;
  }

  /**
   * Compute the spectral fingerprint over the current window. Returns null until
   * at least MIN_WINDOW_TICKS of history have accumulated — a scan on 2 ticks is
   * numerology, not a spectrum. On-demand and off the tick hot-path.
   *
   * The window is linearised (oldest→newest) before transforming so the temporal
   * axis is a genuine time series, not a ring with a phase wrap. The transform
   * itself is the certified `spectrumND`, gated per component by Parseval.
   */
  signature(topModes = 8): GenomeDNA | null {
    const T = this.filled;
    if (T < MIN_WINDOW_TICKS || this._nodeCount < 2) return null;
    const N = this._nodeCount;
    const W = this._window;

    // Aggregated temporal power spectrum (temporal axis, length T), summed over
    // components and spatial bins — the basis of tempo, entropy, fingerprint.
    const temporalPower = new Float64Array(T);
    let totalPower = 0;
    let maxResidual = 0;
    const waves: StandingWave[] = [];

    for (let c = 0; c < FIELD_COMPONENTS; c++) {
      const plane = this._ring[c]!;
      // Linearise this component's [node][tick] plane into time order.
      const field = new Float64Array(N * T);
      for (let n = 0; n < N; n++) {
        const rowBase = n * W;
        const outBase = n * T;
        for (let i = 0; i < T; i++) {
          // oldest→newest: read the ring starting just after the head.
          const t = (this._head - T + i + 2 * W) % W;
          field[outBase + i] = plane[rowBase + t]!;
        }
      }
      const spec = spectrumND(field, [N, T]);
      maxResidual = Math.max(maxResidual, spec.parsevalResidual);
      const power = powerSpectrum(spec);
      // power is row-major over (spatialBin, temporalBin), temporal fastest.
      for (let s = 0; s < N; s++) {
        for (let t = 0; t < T; t++) {
          const p = power[s * T + t]!;
          temporalPower[t] = (temporalPower[t] ?? 0) + p;
          totalPower += p;
          // Standing-wave candidates: a wave of THOUGHT must oscillate in time,
          // so temporalBin 0 (static spatial structure, however rich) is excluded
          // alongside the full DC mode. [SPEC]
          if (t !== 0) {
            waves.push({
              component: c,
              spatialBin: s,
              temporalBin: t,
              power: p,
              fraction: 0, // filled below once totalPower is known
              frequency: t / T,
            });
          }
        }
      }
    }

    // Normalise, pick the live modes, and derive the summary statistics. A
    // perfectly static field has all power in DC; then totalPower>0 but every
    // wave's share is ~0 and centroid/entropy read 0 honestly.
    waves.sort((a, b) => b.power - a.power);
    const standingWaves: StandingWave[] = [];
    const limit = Math.min(topModes, waves.length);
    for (let i = 0; i < limit; i++) {
      const w = waves[i]!;
      if (totalPower > 0 && w.power / totalPower > 1e-9) {
        standingWaves.push({ ...w, fraction: w.power / totalPower });
      }
    }

    // Tempo (centroid) and diversity (entropy) over the temporal distribution,
    // excluding the DC bin so a static offset does not fake "fast thought". A
    // perfectly static field leaves only machine-floor roundoff outside DC; gate
    // that to an honest zero rather than dividing noise by noise.
    let centroidNum = 0;
    let dynamicPower = 0;
    for (let t = 1; t < T; t++) {
      const p = temporalPower[t]!;
      centroidNum += (t / T) * p;
      dynamicPower += p;
    }
    const liveFloor = Math.max(temporalPower[0]!, totalPower) * 1e-9; // numerical zero
    const isDynamic = dynamicPower > liveFloor;
    const spectralCentroid = isDynamic ? centroidNum / dynamicPower : 0;

    let entropy = 0;
    if (isDynamic) {
      for (let t = 1; t < T; t++) {
        const q = temporalPower[t]! / dynamicPower;
        if (q > 0) entropy -= q * Math.log(q);
      }
      entropy /= Math.log(T - 1); // normalise to [0, 1]
    }

    // Whitened fingerprint: log-power over the temporal spectrum compresses the
    // dynamic range so structure registers proportionally, not by raw energy.
    const fingerprint = new Float64Array(T);
    for (let t = 0; t < T; t++) fingerprint[t] = Math.log1p(temporalPower[t]!);
    this._prevFingerprint = fingerprint;

    return {
      windowTicks: T,
      nodeCount: N,
      components: FIELD_COMPONENTS,
      standingWaves,
      spectralCentroid,
      spectralEntropy: entropy,
      fingerprint,
      maxParsevalResidual: maxResidual,
      certified: maxResidual <= PARSEVAL_TOLERANCE,
    };
  }

  /**
   * Drift of the mind's DNA: cosine similarity between the current fingerprint
   * and the previous scan's, in [0, 1]. 1 = the spectral signature is stable
   * epoch-over-epoch; falling values mean the thinking is genuinely changing.
   * Returns null until two scans have run. [MATH]
   */
  driftFrom(previous: Float64Array, current: Float64Array): number {
    if (previous.length !== current.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < previous.length; i++) {
      const x = previous[i]!;
      const y = current[i]!;
      dot += x * y;
      na += x * x;
      nb += y * y;
    }
    if (na <= 0 || nb <= 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}

/**
 * Cosine similarity between two fingerprints (whitened temporal power spectra),
 * in [0, 1]. Compares minds, or one mind across epochs, by resonance — the
 * translation-invariant identity of the DNA. [MATH]
 */
export function signatureSimilarity(a: Float64Array, b: Float64Array): number {
  if (a.length !== b.length) {
    throw new Error(`genome_spectral_signature.signatureSimilarity: length ${a.length} !== ${b.length}.`);
  }
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na <= 0 || nb <= 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
