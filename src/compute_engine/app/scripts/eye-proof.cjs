// The eye-of-observation proof: does perturbation cause the self-measurement loop
// to fire (qualia ignitions → consolidation → sealed genome), and does recall
// retrieve the perturbed patterns by resonance (timestamp-invariant)?
const O = require('../electron/omega-bundle.cjs');

const PHI = (1 + Math.sqrt(5)) / 2;
const phi = (n) => Math.pow(PHI, n);
const IGNITION_THRESHOLD = phi(-2);

function run(perturb) {
  const h = new O.EngineHost({ profile: 'PICO', seed: 'eye-proof', drive: phi(-1), reflect: phi(-3) });
  h.declareChannel('perturb', 'scalar', 89, 1);
  let ignitions = 0;
  let wasIgnited = false;
  let surpriseSum = 0;
  const N = 4000;
  for (let t = 0; t < N; t++) {
    if (perturb && t % 200 === 0 && t > 300) {
      // a sharp burst: one strong scalar pulse across the ring
      h.pushChannel('perturb', Array.from({ length: 89 }, (_, i) => (i % 7 === 0 ? 1 : 0)));
    }
    h.stepOnce();
    const s = h.snapshot();
    if (s.qualiaIgnited && !wasIgnited) ignitions++; // up-crossing of Cφ over φ⁻²
    wasIgnited = s.qualiaIgnited;
    surpriseSum += s.surprise;
  }
  const s = h.snapshot();
  return {
    ignitions,
    genomeCycles: s.genomeCycles,
    genomeSize: s.genomeSize,
    concepts: s.concepts,
    novelty: s.novelty,
    meanSurprise: surpriseSum / N,
    qualiaCphi: s.qualiaCphi,
    depth: s.depth,
    fsmEnabled: s.fieldSelfModelEnabled,
  };
}

const quiet = run(false);
const driven = run(true);
console.log('                     QUIET (no perturbation)      DRIVEN (bursts every 200 ticks)');
const fmt = (k, a, b) => console.log(`${k.padEnd(20)} ${String(a).padStart(24)}  ${String(b).padStart(24)}`);
fmt('ignitions (eye blinks)', quiet.ignitions, driven.ignitions);
fmt('genome cycles', quiet.genomeCycles, driven.genomeCycles);
fmt('genome sealed records', quiet.genomeSize, driven.genomeSize);
fmt('concepts formed', quiet.concepts, driven.concepts);
fmt('mean surprise', quiet.meanSurprise.toExponential(2), driven.meanSurprise.toExponential(2));
fmt('qualia Cφ', quiet.qualiaCphi.toFixed(4), driven.qualiaCphi.toFixed(4));
fmt('field self-model on', quiet.fsmEnabled, driven.fsmEnabled);
