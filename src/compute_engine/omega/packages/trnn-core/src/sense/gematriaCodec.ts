/**
 * gematriaCodec — a LOSSLESS text <-> field codec (the "transcribe meaning back"
 * answer).
 *
 * The live `encodeText` is a robust projection: a trigram identity hash + a
 * mean-removed φ-gematria DFT. That is deliberately lossy (dropout-resilient,
 * order-sensitive) and NOT intended to be inverted. This module is the
 * companion: a FULL, invertible DFT of the φ^(k/2) gematria value sequence,
 * with the DC kept, so the inverse DFT recovers the sequence exactly and an
 * alphabet match snaps it back to text.
 *
 * Encoding  c_p = φ^(k_p/2)  (k_p = alphabet index of char p)
 *           X_k = Σ_p c_p · e^{-i·2π·k·p/L}   (forward DFT, DC included)
 * Decoding  c_p = (1/L) Σ_k X_k · e^{+i·2π·k·p/L}   (exact inverse)
 *           k_p = argmin_k |c_p − φ^(k/2)|           (28-fold alphabet)
 *
 * Deterministic (L2): dpow + dcos + dsin only — no RNG, no clock. Lossless for
 * length L ≤ the coefficient count (the DFT is a bijection on real sequences).
 */

import { PHI } from '../core/constants';
import { dcos, dsin, dpow } from '../core/dmath';

const ALPHABET_SIZE = 28;

function alphabetIndex(cp: number): number {
  if (cp >= 0x61 && cp <= 0x7a) return cp - 0x61;
  if (cp === 0x20) return 26;
  return 27;
}

function indexToChar(k: number): string {
  if (k >= 0 && k <= 25) return String.fromCharCode(0x61 + k);
  if (k === 26) return ' ';
  return '\uFFFD';
}

export interface GematriaCode {
  readonly length: number;
  readonly re: Float64Array;
  readonly im: Float64Array;
}

/** Encode text into its φ-gematria DFT coefficients (lossless). */
export function encodeGematria(text: string): GematriaCode {
  const cps = Array.from(text.normalize('NFKD').toLowerCase().replace(/\s+/g, ' ').trim());
  const L = cps.length;
  const re = new Float64Array(L);
  const im = new Float64Array(L);
  for (let k = 0; k < L; k++) {
    let r = 0;
    let i = 0;
    for (let p = 0; p < L; p++) {
      const v = dpow(PHI, alphabetIndex(cps[p].codePointAt(0) ?? 0) / 2);
      const ph = (2 * Math.PI * k * p) / L;
      r += v * dcos(ph);
      i += v * dsin(ph);
    }
    re[k] = r;
    im[k] = i;
  }
  return { length: L, re, im };
}

/** Decode φ-gematria DFT coefficients back to text (inverse DFT + alphabet match). */
export function decodeGematria(code: GematriaCode): string {
  const L = code.length;
  const vals = new Float64Array(L);
  for (let p = 0; p < L; p++) {
    let v = 0;
    for (let k = 0; k < L; k++) {
      const ph = (2 * Math.PI * k * p) / L;
      v += code.re[k] * dcos(ph) + code.im[k] * dsin(ph);
    }
    vals[p] = v / L;
  }
  let out = '';
  for (let p = 0; p < L; p++) {
    let best = 0;
    let bestD = Infinity;
    for (let k = 0; k < ALPHABET_SIZE; k++) {
      const target = dpow(PHI, k / 2);
      const d = Math.abs(vals[p] - target);
      if (d < bestD) { bestD = d; best = k; }
    }
    out += indexToChar(best);
  }
  return out;
}
