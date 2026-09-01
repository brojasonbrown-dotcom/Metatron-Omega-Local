/**
 * PHONEME ROUTING — speech → F6 (Color/Music) and F7 (Hebrew Numerology)
 *
 * Two honest routes out of the phonetic frame:
 *
 *  F6 — harmonic probe. The F2/F1 ratio of a voiced frame is tested against
 *       φ and against the simple rational ladder (3:2, 4:3, 5:4, 2:1, 5:3,
 *       8:5). Reported as the relative error to the nearest member and to φ.
 *       No claim is made that speech "is" φ-tuned — the number is a distance.
 *
 *  F7 — symbolic route. Phoneme posteriors are projected onto the 22-node
 *       HEBREW_22 / PINEAL_LABELS basis through a FIXED articulatory-place
 *       map (place × manner), giving a live Gematria distribution from
 *       speech in the same coordinate system as text histograms and the
 *       pineal node vector. It is a routing device, never physics.
 */

import { PHI } from '@/constants/metatron';
import { GEMATRIA_N, HEBREW_22 } from '@/lib/gematria';
import type { PhonemePosterior } from './Phonetics';

/**
 * Articulatory-place map: each phone contributes to one or two of the 22
 * nodes. Assignment follows the Sefer Yetzirah articulatory grouping already
 * encoded in PINEAL_LABELS order (gutturals א ח ה ע, labials ב ו מ פ,
 * dentals ד ט ל נ ת, sibilants ז ס ש ר צ, palatals ג י כ ק).
 *
 * Index values are positions in HEBREW_22 (identical to PINEAL_LABELS order).
 */
const IDX = new Map<string, number>(HEBREW_22.map((l, i) => [l.name, i]));
const n = (name: string): number => IDX.get(name) ?? 0;

export const PHONE_TO_NODES: Readonly<Record<string, readonly number[]>> = Object.freeze({
  // Vowels — gutturals / breath letters
  iy: [n('Yod')], ih: [n('Yod'), n('He')],
  eh: [n('He')], ae: [n('Aleph'), n('He')],
  aa: [n('Aleph')], ao: [n('Ayin')],
  uh: [n('Vav'), n('Ayin')], uw: [n('Vav')],
  er: [n('Resh'), n('Ayin')], ax: [n('Aleph'), n('Chet')],
  // Fricatives — sibilants
  s: [n('Samekh')], z: [n('Zayin')],
  sh: [n('Shin')], zh: [n('Shin'), n('Zayin')],
  f: [n('Pe')], v: [n('Vav'), n('Bet')],
  th: [n('Tav')], dh: [n('Dalet'), n('Tav')],
  hh: [n('He'), n('Chet')],
  // Stops
  p: [n('Pe')], b: [n('Bet')],
  t: [n('Tet')], d: [n('Dalet')],
  k: [n('Kaf')], g: [n('Gimel')],
  ch: [n('Tsadi')], jh: [n('Gimel'), n('Zayin')],
  // Nasals, liquids, glides
  m: [n('Mem')], n: [n('Nun')], ng: [n('Nun'), n('Gimel')],
  l: [n('Lamed')], r: [n('Resh')],
  w: [n('Vav')], y: [n('Yod')],
});

/** Simple rational intervals a formant ratio can legitimately be near. */
export const RATIONAL_LADDER: readonly { label: string; r: number }[] = Object.freeze([
  { label: '5:4', r: 5 / 4 },
  { label: '4:3', r: 4 / 3 },
  { label: '3:2', r: 3 / 2 },
  { label: '8:5', r: 8 / 5 },
  { label: '5:3', r: 5 / 3 },
  { label: '2:1', r: 2 },
  { label: '5:2', r: 5 / 2 },
  { label: '3:1', r: 3 },
  { label: '4:1', r: 4 },
]);

export interface HarmonicProbe {
  /** F2/F1 as measured; 0 when unavailable. */
  ratio: number;
  /** Relative distance to φ (|r/φ − 1|); 1 when unavailable. */
  phiError: number;
  /** Nearest simple rational and its relative error. */
  nearest: string;
  rationalError: number;
  /** 1 when the ratio sits on a recognised structure, 0 when it does not. */
  harmonicity: number;
}

export function harmonicProbe(formantRatio: number): HarmonicProbe {
  if (!Number.isFinite(formantRatio) || formantRatio <= 0) {
    return { ratio: 0, phiError: 1, nearest: 'n/a', rationalError: 1, harmonicity: 0 };
  }
  const phiError = Math.abs(formantRatio / PHI - 1);
  let nearest = RATIONAL_LADDER[0].label;
  let rationalError = Infinity;
  for (const c of RATIONAL_LADDER) {
    const e = Math.abs(formantRatio / c.r - 1);
    if (e < rationalError) { rationalError = e; nearest = c.label; }
  }
  const best = Math.min(phiError, rationalError);
  // Gaussian on relative error, σ = φ⁻⁶ ≈ 0.05573. The rational ladder is dense
  // (max gap ~11 %), so a wide kernel would score everything high and measure
  // nothing; at this width a 5 % miss scores ~0.67 and a 10 % miss ~0.20.
  const sigma = Math.pow(PHI, -6);
  return {
    ratio: formantRatio,
    phiError,
    nearest,
    rationalError,
    harmonicity: Math.exp(-(best * best) / (2 * sigma * sigma)),
  };
}

/**
 * Project a phoneme posterior onto the 22-node Gematria basis.
 * Probability mass is split evenly across the nodes a phone maps to.
 * Returns an L1-normalised distribution (all zeros when input is empty).
 */
export function posteriorToGematria(post: readonly PhonemePosterior[]): Float64Array {
  const v = new Float64Array(GEMATRIA_N);
  let z = 0;
  for (const { phone, p } of post) {
    const nodes = PHONE_TO_NODES[phone];
    if (!nodes || nodes.length === 0 || !(p > 0)) continue;
    const share = p / nodes.length;
    for (const i of nodes) { v[i] += share; z += share; }
  }
  if (z > 0) for (let i = 0; i < GEMATRIA_N; i += 1) v[i] /= z;
  return v;
}

/** Shannon entropy of a distribution, normalised to [0,1] over N nodes. */
export function distributionEntropy(v: ArrayLike<number>): number {
  let z = 0;
  for (let i = 0; i < v.length; i += 1) z += v[i];
  if (z <= 0) return 1;
  let h = 0;
  for (let i = 0; i < v.length; i += 1) {
    const q = v[i] / z;
    if (q > 0) h -= q * Math.log(q);
  }
  return Math.min(1, h / Math.log(v.length));
}

export interface SpeechRouting {
  f6: HarmonicProbe;
  /** 22-node Gematria distribution derived from phoneme posteriors. */
  f7: Float64Array;
  /** Dominant node index and its label. */
  dominantNode: number;
  dominantLabel: string;
  /** 1 − normalised entropy: how sharply speech is routed right now. */
  routingSharpness: number;
}

export function routeSpeech(
  posteriors: readonly PhonemePosterior[],
  formantRatio: number,
): SpeechRouting {
  const f7 = posteriorToGematria(posteriors);
  let dominantNode = 0;
  for (let i = 1; i < f7.length; i += 1) if (f7[i] > f7[dominantNode]) dominantNode = i;
  const total = f7.reduce((a, b) => a + b, 0);
  return {
    f6: harmonicProbe(formantRatio),
    f7,
    dominantNode,
    dominantLabel: total > 0 ? HEBREW_22[dominantNode].name : 'n/a',
    routingSharpness: total > 0 ? 1 - distributionEntropy(f7) : 0,
  };
}

export const PHONEME_ROUTING_PROVENANCE =
  'Phoneme→Gematria mapping is a FIXED articulatory-place convention (Sefer ' +
  'Yetzirah groupings: gutturals, labials, dentals, sibilants, palatals), used ' +
  'as a routing address only. The F6 harmonic probe reports the DISTANCE from ' +
  'the measured F2/F1 ratio to φ and to simple rationals — it never asserts ' +
  'that speech is φ-tuned, and it is never CODATA-compared.';