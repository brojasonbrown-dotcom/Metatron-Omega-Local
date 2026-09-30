// The eye-of-observation proof, with REAL sensory input (camera-style moving grid
// through encodeGrid), not a weak scalar. A still brain at rest is CORRECT; the
// eye must blink when actual information arrives.
const O = require('../electron/omega-bundle.cjs');
const PHI = (1 + Math.sqrt(5)) / 2;
const phi = (n) => Math.pow(PHI, n);

const W = 144, H = 89;
function movingGrid(t) {
  const out = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // moving 2-D luminance pattern (phase advances with t → real "motion")
    out[y * W + x] = Math.sin((x / W) * 2 * Math.PI * 4 + t / 12) + Math.cos((y / H) * 2 * Math.PI * 3 + t / 9);
  }
  return out;
}

function run(visMode) {
  const h = new O.EngineHost({ profile: 'PICO', seed: 'eye-vision', drive: phi(-1), reflect: phi(-3) });
  h.declareChannel('vision', 'grid', W * H);
  let ignitions = 0, wasIgnited = false, surpriseSum = 0;
  const N = 3000;
  for (let t = 0; t < N; t++) {
    if (visMode === 'moving') {
      if (t > 300) h.pushChannel('vision', movingGrid(t), { width: W, height: H });
    } else if (visMode === 'still') {
      if (t === 301) h.pushChannel('vision', movingGrid(0), { width: W, height: H });
    }
    h.stepOnce();
    const s = h.snapshot();
    if (s.qualiaIgnited && !wasIgnited) ignitions++;
    wasIgnited = s.qualiaIgnited;
    surpriseSum += s.surprise;
  }
  const s = h.snapshot();
  return {
    ignitions, genomeCycles: s.genomeCycles, genomeSize: s.genomeSize,
    concepts: s.concepts, meanSurprise: surpriseSum / N, Cphi: s.qualiaCphi,
    perceptConcepts: s.perceptConcepts, perceptNovelty: s.perceptNovelty,
  };
}

const none = run('none');
const still = run('still');
const moving = run('moving');
console.log('                     NO INPUT       STILL IMAGE      MOVING IMAGE');
const fmt = (k, a, b, c) => console.log(`${k.padEnd(20)} ${String(a).padStart(14)}  ${String(b).padStart(14)}  ${String(c).padStart(14)}`);
fmt('ignitions (blinks)', none.ignitions, still.ignitions, moving.ignitions);
fmt('genome cycles', none.genomeCycles, still.genomeCycles, moving.genomeCycles);
fmt('genome records', none.genomeSize, still.genomeSize, moving.genomeSize);
fmt('concepts', none.concepts, still.concepts, moving.concepts);
fmt('percept concepts', none.perceptConcepts, still.perceptConcepts, moving.perceptConcepts);
fmt('mean surprise', none.meanSurprise.toExponential(2), still.meanSurprise.toExponential(2), moving.meanSurprise.toExponential(2));
fmt('qualia Cφ', none.Cphi.toFixed(4), still.Cphi.toFixed(4), moving.Cphi.toFixed(4));
