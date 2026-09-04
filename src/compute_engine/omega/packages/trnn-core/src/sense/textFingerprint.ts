/**
 * textFingerprint — the cross-modal binding (Ω-REAL: Layer A).
 *
 * Closes the B→C→A loop from the semantic end: a text string is encoded to a
 * bounded torus field by the certified Ω-P9 text codec (`sense/encode`), and the
 * field's φ-anchored power spectrum is folded into one deterministic, unit-norm
 * fingerprint that `harness/recall` can resolve. Same text ⇒ same field ⇒ same
 * fingerprint; different text ⇒ different spectrum ⇒ a fingerprint that lands
 * far away (or abstains).
 *
 * The spectrum is read with the certified Bluestein FFT (never a host FFT), the
 * DC bin is dropped (mean-invariant), and the power shape is normalised →
 * dlog1p-compressed → renormalised (loudness-invariant, the same law the
 * perception FIELD block uses), so a quiet and a loud instance of the same
 * utterance land on the identical fingerprint.
 *
 * Deterministic (L2): `encodeText` + `fft` + `dmath` only — no RNG, no clock.
 */

import { encodeText, senseField } from './encode';
import { fft } from '../spectral/fft';
import { dlog1p } from '../core/dmath';
import type { CField } from '../core/complex';

/** φ-aligned default spectrum width — the same count the text codec uses. */
export const TEXT_FINGERPRINT_BINS = 13;

/** Encode a text string onto a bounded field of `nodes` complex cells. */
export function textToField(text: string, nodes: number): CField {
  const f = senseField(nodes);
  encodeText(text, f);
  return f;
}

/**
 * The canonical text fingerprint: normalised, log-compressed, DC-dropped power
 * spectrum of the encoded field (unit L2 norm). Length = `bins`.
 */
export function textFingerprint(text: string, nodes: number, bins = TEXT_FINGERPRINT_BINS): Float64Array {
  const f = textToField(text, nodes);
  const spec = fft(f.re, f.im, false);
  const M = Math.min(bins, nodes - 1); // drop DC (mode 0) — mean-invariant

  const pow = new Float64Array(M);
  let rawNorm = 0;
  for (let m = 1; m <= M; m++) {
    const p = spec.re[m] * spec.re[m] + spec.im[m] * spec.im[m];
    pow[m - 1] = p;
    rawNorm += p * p;
  }

  const out = new Float64Array(M);
  if (rawNorm > 1e-300) {
    const rawInv = 1 / Math.sqrt(rawNorm);
    let s2 = 0;
    for (let m = 0; m < M; m++) {
      const v = dlog1p(pow[m] * rawInv);
      out[m] = v;
      s2 += v * v;
    }
    const inv = s2 > 1e-300 ? 1 / Math.sqrt(s2) : 0;
    for (let m = 0; m < M; m++) out[m] *= inv;
  }
  return out;
}
