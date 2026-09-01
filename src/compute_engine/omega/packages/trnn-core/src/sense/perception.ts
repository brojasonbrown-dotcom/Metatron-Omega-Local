/**
 * Ω-P8 — perception: the sensory meaning-vector.
 *
 * This is the bridge between what the brain *feels* (the live sensory plane and
 * the per-node Sensory Node Array) and what the Mind *learns* (the concept store
 * and self-model). Ω-P7 taught the Mind the shape of the ladder's own telemetry —
 * coherence, energy, obstruction. Perception teaches it the shape of the *world*:
 * the spectral and spatial signature of whatever is currently on the senses, so a
 * recurring sound or sight becomes a recognisable, predictable concept.
 *
 * One observation is folded per cognitive stride into a fixed-length real vector,
 * laid out in four blocks. Every block is a pure function of state the engine
 * already computes — the array is a pure observer (N1) and the plane's fused field
 * is staged state — so nothing here feeds back into the dynamics and the
 * determinism oracle (S0) is untouched.
 *
 *   BAND (B per channel)   the φ-band occupancy profile of the sensory array's
 *                          latched spectrum, summed over nodes — *what* the
 *                          signal is, by its vibration shape. Amplitude-invariant:
 *                          each channel block is L2-normalised, so a quiet bird
 *                          and a loud bird land on the same concept.
 *
 *   SPACE (4 per channel)  where the energy sits on the lattice — the first
 *                          circular moments of the energy distribution (the
 *                          resultant's angle and length) plus peak share and the
 *                          normalised entropy. Two images with identical spectra
 *                          but different structure separate here.
 *
 *   FIELD (FP per channel) the circular power spectrum |Z_m|² of the fused
 *                          percept, folded onto φ-spaced bins. The raw power
 *                          shape is L2-normalised FIRST (removing loudness before
 *                          any nonlinearity), then dlog1p-compressed, then
 *                          renormalised to unit norm — amplitude-invariant by
 *                          construction. This is the direct trace of what was
 *                          sensed, beneath any abstraction.
 *
 *   CONTENT (10 per channel, Ω-P9)
 *                          the fine low-mode log-power spectrum |Z_m|², m = 1..10,
 *                          of the same field, *unfolded*. FIELD folds the whole
 *                          spectrum onto 8 bins (what kind of signal, coarsely);
 *                          CONTENT keeps the lowest modes uncompressed — which is
 *                          exactly where the Ω-P9 text codec writes its gematria
 *                          modes, so for the text channel these bins ARE the
 *                          utterance's meaning spectrum. CONTENT follows the same
 *                          normalise → compress → renormalise law, so loudness is
 *                          amplitude-removed and per-channel width stays 32 (a
 *                          3-channel observation is 96 dims, divisible by the PQ
 *                          subspace count 8 — the old 22-wide block silently
 *                          collapsed PQ to one subspace).
 *
 * Determinism (Law L2): no RNG, no wall clock, and every transcendental routes
 * through `core/dmath`. The projection basis is the golden angle — the same
 * phyllotaxis the encoders use — so the mapping is fixed and reproducible.
 */

import type { CField } from '../core/complex';
import { PHI_INV } from '../core/constants';
import { datan2, dcos, dlog, dlog1p, dmag, dsin } from '../core/dmath';
import { fft } from '../spectral/fft';
import type { SensoryNodeArray } from './nodeArray';

const TWO_PI = 2 * Math.PI;

/**
 * Field-projection dimensions per channel (Fibonacci). 8 bins is the highest
 * resolution that keeps a 2-channel observation comfortably inside the Mind's
 * product-quantiser subspace budget while still separating two fields that share
 * a spectrum.
 */
export const FIELD_PROJ = 8;

/** Spatial-moment features per channel: angle, length, peak share, entropy. */
export const SPACE_DIM = 4;

/**
 * Ω-P9 — fine low-mode content bins per channel. 10 keeps the block width at
 * 32 (bands + 4 + 8 + 10), so multi-channel observations stay divisible by
 * the concept store's PQ subspace count (8); and modes 1..10 cover the band
 * where the text codec's 13 gematria modes live (DC excluded, the remainder
 * attenuated by the codec's own φ^(−k/2) decay).
 */
export const CONTENT_DIM = 10;

export interface PerceptionLayout {
  /** φ-bands per channel block (the array's band count). */
  readonly bands: number;
  /** Total observation dimension for `channels` live channels. */
  readonly dim: number;
  readonly channels: number;
  readonly perChannel: number;
}

/**
 * The per-channel block width. `bands` comes from the array plan; the layout is
 * identical for every channel so the vector is self-describing by index.
 */
export function perceptionLayout(bands: number, channels: number): PerceptionLayout {
  const perChannel = bands + SPACE_DIM + FIELD_PROJ + CONTENT_DIM;
  return { bands, channels, perChannel, dim: perChannel * channels };
}

/**
 * Fold one channel's sensory state into its block of the observation vector.
 *
 * @param out      the observation vector, written in place at `off`
 * @param off      offset of this channel's block inside `out`
 * @param array    the rung-0 Sensory Node Array (the spectral + spatial source)
 * @param fused    the plane's fused field for this channel's modality, or null
 *                 when the channel is silent this stride
 * @param layout   the shared layout (band count, block width)
 */
function foldChannel(
  out: Float64Array,
  off: number,
  array: SensoryNodeArray | null,
  fused: CField | null,
  layout: PerceptionLayout,
): void {
  const { bands } = layout;
  const n = array ? array.n : fused?.n ?? 0;
  const base = off;
  const spaceAt = base + bands;
  const fieldAt = spaceAt + SPACE_DIM;
  const contentAt = fieldAt + FIELD_PROJ;

  // --- BAND: φ-occupancy profile, L2-normalised (amplitude-invariant "what") --
  let bandNorm = 0;
  if (array && array.report().windowsClosed > 0) {
    for (let k = 0; k < bands; k++) {
      let acc = 0;
      for (let j = 0; j < array.n; j++) acc += array.bandAmp[j * bands + k];
      out[base + k] = acc;
      bandNorm += acc * acc;
    }
  }
  if (bandNorm > 1e-300) {
    const inv = 1 / Math.sqrt(bandNorm);
    for (let k = 0; k < bands; k++) out[base + k] *= inv;
  }

  // --- SPACE: first circular moments of the lattice energy distribution ------
  // The nodes sit on a ring; node j has angle 2πj/n. The energy distribution's
  // first resultant (Σ e_j·e^{iθ_j}) gives a translation-invariant "centre of
  // gravity" direction and a concentration length in [0,1] — the spatial "where".
  if (array && n > 0) {
    let sr = 0;
    let si = 0;
    let total = 0;
    let peak = 0;
    let entropy = 0;
    for (let j = 0; j < n; j++) {
      const e = array.energy[j];
      total += e;
      if (e > peak) peak = e;
      const th = (TWO_PI * j) / n;
      sr += e * dcos(th);
      si += e * dsin(th);
    }
    if (total > 1e-300) {
      // concentration length R/Σe in [0,1]; angle of the resultant in [0,1)
      const R = dmag(sr, si);
      const len = R / total;
      const ang = datan2(si, sr) / TWO_PI + 0.5; // (−π,π] → (0,1]
      out[spaceAt + 0] = ang;
      out[spaceAt + 1] = len;
      out[spaceAt + 2] = peak / total;
      for (let j = 0; j < n; j++) {
        const s = array.energy[j] / total;
        if (s > 0) entropy -= s * dlog(s);
      }
      out[spaceAt + 3] = entropy / dlog(n > 1 ? n : 2);
    }
  }

  // --- FIELD: circular power spectrum of the fused percept, φ-folded ----------
  // The right invariant of "what was sensed" is the field's own spectrum: the
  // squared magnitude of its circular DFT, |Z_m|², folded onto FIELD_PROJ
  // φ-spaced bins (bin = ⌊(m·φ⁻¹)·FP⌋ of the positive-frequency half). This is
  //   • deterministic   — the certified Bluestein fft, exact to the same bits;
  //   • shift-invariant — a percept slid around the ring has the same power
  //     spectrum, so identity survives translation;
  //   • amplitude-normalisable — dlog1p compresses, then L2-normalise, so a loud
  //     and a quiet instance of the *same* signal land together while different
  //     signals separate by where their energy lives on the ladder.
  // The signed/phase content is deliberately dropped here: phase is what makes
  // two percepts *occurrent* (this one, now), power is what makes them the
  // *same kind* — and a concept is a kind, not an occurrence.
  if (fused && fused.n > 0) {
    const spec = fft(fused.re, fused.im);
    const half = fused.n >> 1;
    if (half > 0) {
      const fp = FIELD_PROJ;
      for (let m = 1; m <= half; m++) {
        const p = spec.re[m] * spec.re[m] + spec.im[m] * spec.im[m];
        if (p <= 0) continue;
        const bin = Math.min(fp - 1, Math.floor(((m - 1) * PHI_INV * fp) % fp));
        out[fieldAt + bin] += p;
      }
      // Amplitude-invariant compression: dlog1p is NOT equivariant under scaling,
      // so a loud percept compressed first would keep its loudness in the shape.
      // Normalise the raw power SHAPE first (removing loudness before the
      // nonlinearity), then compress, then renormalise to unit norm.
      let rawNorm = 0;
      for (let b = 0; b < fp; b++) rawNorm += out[fieldAt + b] * out[fieldAt + b];
      if (rawNorm > 1e-300) {
        const rawInv = 1 / Math.sqrt(rawNorm);
        let norm = 0;
        for (let b = 0; b < fp; b++) {
          const v = dlog1p(out[fieldAt + b] * rawInv);
          out[fieldAt + b] = v;
          norm += v * v;
        }
        if (norm > 1e-300) {
          const inv = 1 / Math.sqrt(norm);
          for (let b = 0; b < fp; b++) out[fieldAt + b] *= inv;
        }
      }

      // --- CONTENT (Ω-P9): the low modes, unfolded -----------------------------
      // FIELD folds the whole spectrum onto 8 coarse bins; CONTENT keeps modes
      // 1..CONTENT_DIM verbatim (dlog1p-compressed, L2-normalised). The Ω-P9 text
      // codec synthesises its gematria modes as pure ring modes, so for the text
      // channel these bins recover the utterance's mode powers exactly — the
      // perceptual Mind learns what was said, not merely that something was.
      // Modes above `half` stay zero (fixed layout, small fields); phase is
      // dropped for the same kind-not-occurrence law as FIELD.
      const cTop = Math.min(CONTENT_DIM, half);
      // Raw low-mode powers first, then the same normalise → compress →
      // renormalise law as FIELD, so a quiet and a loud instance of the same
      // utterance land on the identical content vector.
      let cRawNorm = 0;
      for (let m = 1; m <= cTop; m++) {
        const p = spec.re[m] * spec.re[m] + spec.im[m] * spec.im[m];
        out[contentAt + m - 1] = p;
        cRawNorm += p * p;
      }
      if (cRawNorm > 1e-300) {
        const rawInv = 1 / Math.sqrt(cRawNorm);
        let cNorm = 0;
        for (let m = 0; m < cTop; m++) {
          const v = dlog1p(out[contentAt + m] * rawInv);
          out[contentAt + m] = v;
          cNorm += v * v;
        }
        if (cNorm > 1e-300) {
          const inv = 1 / Math.sqrt(cNorm);
          for (let m = 0; m < cTop; m++) out[contentAt + m] *= inv;
        }
      }
    }
  }
}

/**
 * One perception fold: read the rung-0 sensory array and each live channel's
 * fused field, write the observation vector, return its energy norm so the host
 * can skip a quiescent fold (a silent world teaches nothing).
 *
 * The vector is fully rewritten each call — a channel that went silent this
 * stride contributes zeros, so a vanished sense is itself a recognisable shape.
 *
 * @returns the squared L2 norm of the observation (0 ⇒ quiescent, skip)
 */
export function perceive(
  out: Float64Array,
  array: SensoryNodeArray | null,
  fusedByChannel: readonly (CField | null)[],
  layout: PerceptionLayout,
): number {
  out.fill(0);
  for (let c = 0; c < layout.channels; c++) {
    foldChannel(out, c * layout.perChannel, array, fusedByChannel[c] ?? null, layout);
  }
  let norm = 0;
  for (let i = 0; i < layout.dim; i++) norm += out[i] * out[i];
  return norm;
}
