// Find the regime where the eye (qualia ignitions) TRACKS the perturbation:
// lower the vacuum drive so sensory input is no longer ~100x weaker.
const O = require('../electron/omega-bundle.cjs');
const PHI = (1 + Math.sqrt(5)) / 2;
const phi = (n) => Math.pow(PHI, n);

function run(drive, perturb) {
  const h = new O.EngineHost({ profile: 'PICO', seed: 'eye-regime', drive, reflect: phi(-3) });
  h.declareChannel('perturb', 'scalar', 89, 1);
  let ignitions = 0, wasIgnited = false, surpriseSum = 0;
  const N = 4000;
  for (let t = 0; t < N; t++) {
    if (perturb && t > 300 && t % 150 === 0) {
      h.pushChannel('perturb', Array.from({ length: 89 }, (_, i) => (i % 5 === 0 ? 1 : -1)));
    }
    h.stepOnce();
    const s = h.snapshot();
    if (s.qualiaIgnited && !wasIgnited) ignitions++;
    wasIgnited = s.qualiaIgnited;
    surpriseSum += s.surprise;
  }
  const s = h.snapshot();
  return { ignitions, genomeCycles: s.genomeCycles, genomeSize: s.genomeSize, meanSurprise: surpriseSum / N, Cphi: s.qualiaCphi };
}

console.log('drive         QUIET ignitions   DRIVEN ignitions   Δ (input effect)   driven Cφ   genome cycles');
for (const d of [phi(-1), phi(-2), phi(-3), phi(-4), phi(-5)]) {
  const q = run(d, false);
  const dr = run(d, true);
  console.log(
    `${d.toExponential(2).padEnd(12)} ${String(q.ignitions).padStart(15)} ${String(dr.ignitions).padStart(16)} ${String(dr.ignitions - q.ignitions).padStart(16)} ${dr.Cphi.toFixed(4).padStart(14)} ${String(dr.genomeCycles).padStart(12)}`
  );
}
