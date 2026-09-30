// Calibrate the sensory→self-model coupling: sweep drive DOWN while injecting a
// PREDICTABLE time-varying signal, and find where the self-model's gate flips
// ON (fieldSelfModelEnabled=true) and a genome record seals.
const O = require('../electron/omega-bundle.cjs');
const PHI = (1 + Math.sqrt(5)) / 2;
const phi = (n) => Math.pow(PHI, n);

function run(drive) {
  const h = new O.EngineHost({ profile: 'NANO', seed: 'calib', drive, reflect: 0 });
  h.declareChannel('sig', 'scalar', 89, 1);
  let surpriseSum = 0;
  const N = 4000;
  for (let t = 0; t < N; t++) {
    // predictable, slowly-modulated scalar (two-tone so it has learnable structure)
    const v = Math.sin(t / 23) * 0.5 + Math.sin(t / 47) * 0.5;
    h.pushChannel('sig', Array.from({ length: 89 }, (_, i) => v * (i % 5 === 0 ? 1 : 0)));
    h.stepOnce();
    surpriseSum += h.snapshot().surprise;
  }
  const s = h.snapshot();
  return {
    drive,
    fsmEnabled: s.fieldSelfModelEnabled,
    fsmSsmMse: s.fieldSelfModelSsmMse,
    fsmPersistMse: s.fieldSelfModelPersistenceMse,
    meanSurprise: surpriseSum / N,
    genomeCycles: s.genomeCycles,
    genomeSize: s.genomeSize,
    coherence: s.coherenceWarm,
    closure: s.rungs[0] ? s.rungs[0].closureQuality : NaN,
    scaleEntropy: s.scaleEntropy,
  };
}

console.log('drive        selfModel   SSM_MSE       persist_MSE   meanSurprise  genomeCycles  coherence  closure');
for (const d of [phi(-1), phi(-2), phi(-3), phi(-4), phi(-5), phi(-6)]) {
  const r = run(d);
  console.log(
    `${d.toExponential(2).padEnd(11)} ${String(r.fsmEnabled).padEnd(11)} ${r.fsmSsmMse.toExponential(2).padStart(12)} ${r.fsmPersistMse.toExponential(2).padStart(12)} ${r.meanSurprise.toExponential(2).padStart(13)} ${String(r.genomeCycles).padStart(12)} ${r.coherence.toFixed(4).padStart(10)} ${r.closure.toFixed(6).padStart(9)}`
  );
}
