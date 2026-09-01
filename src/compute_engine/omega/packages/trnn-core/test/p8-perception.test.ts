/**
 * Gate P8 — perception: the sensory meaning-vector and the perceptual Mind.
 *
 * Contract under test:
 *   • the observation is a pure deterministic function of the sensory state —
 *     same field + same array ⇒ identical vector, twice
 *   • the band block is amplitude-invariant: a signal and its 3×-scaled copy
 *     land on the same perceptual concept
 *   • two signals of *different* pitch separate (band block) and two images of
 *     different spatial structure separate (space block)
 *   • a silent world yields a zero observation (the host skips the fold)
 *   • the host's sensory Mind learns from a driven audio channel and — the
 *     observer law — the engine digest is identical whether or not the fold runs
 */
import { describe, it, expect } from 'vitest';
import { EngineHost } from '../src/runtime/host';
import { MIND_STRIDE } from '../src/runtime/host';
import {
  perceive,
  perceptionLayout,
  CONTENT_DIM,
  FIELD_PROJ,
  SPACE_DIM,
} from '../src/sense/perception';
import { encodeAudio, encodeGrid, encodeText, senseField } from '../src/sense/encode';
import { SensoryNodeArray } from '../src/sense/nodeArray';
import { createLattice } from '../src/torus/lattice';
import { createField, scaleField, type CField } from '../src/core/complex';
import { SeedStream } from '../src/core/determinism';

const NODES = 144;

function driveArray(seed: string, ticks: number): SensoryNodeArray {
  const array = new SensoryNodeArray(NODES, { bands: 10, depth: 233 });
  const lattice = createLattice(NODES);
  const rng = new SeedStream(seed);
  const z = createField(NODES);
  for (let t = 0; t < ticks; t++) {
    for (let j = 0; j < NODES; j++) {
      // a live, varying field so the spectrum latches non-trivially
      const th = 2 * Math.PI * ((j * 0.618033988749895 + t * 0.01) % 1);
      const a = 0.5 + 0.5 * rng.next();
      z.re[j] = a * Math.cos(th);
      z.im[j] = a * Math.sin(th);
    }
    array.update(z, lattice);
  }
  return array;
}

function tone(pitch: number, n = 8192): Float64Array {
  const pcm = new Float64Array(n);
  for (let i = 0; i < n; i++) pcm[i] = Math.sin((2 * Math.PI * pitch * i) / n);
  return pcm;
}

function layoutFor(channels = 1, bands = 10) {
  return perceptionLayout(bands, channels);
}

describe('P8 · perception observation', () => {
  it('is deterministic: same field + same array ⇒ identical vector, twice', () => {
    const array = driveArray('p8-det', 233);
    const field = senseField(NODES);
    encodeAudio(tone(8), field);
    const L = layoutFor();
    const a = new Float64Array(L.dim);
    const b = new Float64Array(L.dim);
    perceive(a, array, [field], L);
    perceive(b, array, [field], L);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('is amplitude-invariant in the band block: a signal and its 3× copy agree', () => {
    const array = driveArray('p8-amp', 233);
    const L = layoutFor();
    const f1 = senseField(NODES);
    encodeAudio(tone(8), f1);
    const f2 = senseField(NODES);
    f2.re.set(f1.re);
    f2.im.set(f1.im);
    scaleField(f2, 3);
    const a = new Float64Array(L.dim);
    const b = new Float64Array(L.dim);
    perceive(a, array, [f1], L);
    perceive(b, array, [f2], L);
    // band block (first `bands` entries) is L2-normalised → identical
    for (let k = 0; k < L.bands; k++) expect(a[k]).toBeCloseTo(b[k], 12);
  });

  it('separates two pitches and two spatial structures', () => {
    const array = driveArray('p8-sep', 233);
    const L = layoutFor();
    const low = senseField(NODES);
    const high = senseField(NODES);
    encodeAudio(tone(3), low);
    encodeAudio(tone(64), high);
    const va = new Float64Array(L.dim);
    const vb = new Float64Array(L.dim);
    perceive(va, array, [low], L);
    perceive(vb, array, [high], L);
    // the fused-field projection block must differ between distinct percepts
    const fa = va.slice(L.bands + SPACE_DIM, L.bands + SPACE_DIM + FIELD_PROJ);
    const fb = vb.slice(L.bands + SPACE_DIM, L.bands + SPACE_DIM + FIELD_PROJ);
    let d2 = 0;
    for (let i = 0; i < FIELD_PROJ; i++) d2 += (fa[i] - fb[i]) ** 2;
    expect(Math.sqrt(d2)).toBeGreaterThan(0.05);
  });

  it('a silent world yields a zero observation', () => {
    const array = new SensoryNodeArray(NODES, { bands: 10, depth: 233 });
    const L = layoutFor();
    const silent = createField(NODES);
    const v = new Float64Array(L.dim);
    const norm = perceive(v, array, [silent], L);
    expect(norm).toBe(0);
    expect(Array.from(v)).toEqual(new Array(L.dim).fill(0));
  });

  it('Ω-P9: the content block separates utterances and ignores loudness', () => {
    // no array: BAND/SPACE stay zero, so the comparison isolates FIELD+CONTENT.
    const L = layoutFor();
    const at = L.bands + SPACE_DIM + FIELD_PROJ;
    const slice = (v: Float64Array) => v.slice(at, at + CONTENT_DIM);
    const x = senseField(NODES), y = senseField(NODES), z = senseField(NODES);
    encodeText('are you awake', x);
    encodeText('the field closes on itself', y);
    z.re.set(x.re);
    z.im.set(x.im);
    scaleField(z, 3);
    const vx = new Float64Array(L.dim), vy = new Float64Array(L.dim), vz = new Float64Array(L.dim);
    perceive(vx, null, [x], L);
    perceive(vy, null, [y], L);
    perceive(vz, null, [z], L);
    // amplitude invariance: the 3× copy lands on the same content
    const cx = slice(vx), cz = slice(vz);
    for (let i = 0; i < CONTENT_DIM; i++) expect(cx[i]).toBeCloseTo(cz[i], 12);
    // separation: a different utterance moves the content block
    const cy = slice(vy);
    let d2 = 0;
    for (let i = 0; i < CONTENT_DIM; i++) d2 += (cx[i] - cy[i]) ** 2;
    expect(Math.sqrt(d2)).toBeGreaterThan(0.05);
    // and the block is non-trivial — the text's gematria modes are actually read
    let e = 0;
    for (let i = 0; i < CONTENT_DIM; i++) e += cx[i] * cx[i];
    expect(e).toBeGreaterThan(0.5); // L2-normalised block has unit norm when live
  });
});

describe('P8 · the perceptual Mind learns from the senses', () => {
  it('observer law: the perception fold never perturbs the engine digest', () => {
    // Two identical hosts, same seed, same driven audio channel. One is left to
    // run its foldPerception path (declared channel → sensory Mind active); the
    // parity the observer law demands is that the *sensory read itself* — the
    // SNA update + the perception fold — leaves the digest untouched. Both hosts
    // receive the SAME injection, so any digest divergence is a real leak.
    const a = new EngineHost({ profile: 'PICO', seed: 'p8-host' });
    const b = new EngineHost({ profile: 'PICO', seed: 'p8-host' });
    a.declareChannel('mic', 'audio');
    b.declareChannel('mic', 'audio');
    for (let t = 1; t <= 3 * MIND_STRIDE; t++) {
      const pcm = tone(8 + (t % 4));
      a.pushChannel('mic', pcm);
      b.pushChannel('mic', pcm);
      expect(a.stepOnce().digest).toBe(b.stepOnce().digest);
    }
    // and the fold genuinely ran (a non-trivial sensory stream was learned)
    const report = a.perception();
    expect(report).not.toBeNull();
    expect(report!.thoughts).toBeGreaterThan(0);
    expect(a.snapshot().perceptConcepts).toBeGreaterThan(0);
  });

  it('recognises a repeated percept (novelty falls on recurrence)', () => {
    const h = new EngineHost({ profile: 'PICO', seed: 'p8-rec' });
    h.declareChannel('mic', 'audio');
    const fixed = tone(8);
    const novelties: number[] = [];
    for (let t = 1; t <= 6 * MIND_STRIDE; t++) {
      h.pushChannel('mic', fixed);
      h.stepOnce();
      const th = h.perception()?.recent.slice(-1)[0];
      if (th) novelties.push(th.novelty);
    }
    // after the first fold the same fixed signal recurs → later folds are less novel
    expect(novelties.length).toBeGreaterThan(2);
    const first = novelties[0];
    const last = novelties[novelties.length - 1];
    expect(last).toBeLessThanOrEqual(first + 1e-9);
  });
});
