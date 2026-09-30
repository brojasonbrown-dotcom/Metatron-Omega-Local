const O = require('../electron/omega-bundle.cjs');

const h = new O.EngineHost({ profile: 'MICRO', seed: 'live-m2' });
h.start();
for (let i = 0; i < 2000; i++) h.stepOnce();

const a = h.analysis();
console.log('=== M2 wave + DMD operator analysis (live) ===');
if (a && a.wave) {
  console.log('wave      : DWT levels =', a.wave.waveletLevels, '· EMD imfs =', a.wave.emdImfs);
}
if (a && a.dmd) {
  console.log('DMD       : rank =', a.dmd.rank, '· spectralRadius =', a.dmd.spectralRadius.toFixed(4), '· relError =', a.dmd.relError.toExponential(2));
  console.log('pseudo    : min σ_min =', a.dmd.pseudoMinSigma.toExponential(3), '(non-normality / resonance horizon)');
  console.log('floquet   : spectralRadius =', a.dmd.floquetRadius.toFixed(4), '(period-1 monodromy)');
}
console.log('evidence  :', h.evidence() ? h.evidence().sealCount + ' seals' : 'off');

// learning still active
const run = h.learn({ iterations: 60, warmup: 55, trainTicks: 89, holdTicks: 55 });
console.log('learn     :', run.report.verdict.split('—')[0].trim(), '· applied =', run.applied);
h.stop();
