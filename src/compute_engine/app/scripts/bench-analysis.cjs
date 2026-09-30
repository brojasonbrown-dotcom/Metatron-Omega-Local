// Isolate the per-tick cost of the analysis service (xcorr stack) vs the rest of the folds.
const O = require('../electron/omega-bundle.cjs');

function bench(profile, opts, n = 200) {
  const h = new O.EngineHost({ profile, seed: 'bench', ...opts });
  for (let i = 0; i < 50; i++) h.stepOnce();
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) h.stepOnce();
  return Number(process.hrtime.bigint() - t0) / 1e6 / n * 1000; // us/tick
}

for (const profile of ['MESO', 'MACRO']) {
  const full = bench(profile, {});
  const noAnalysis = bench(profile, { analysis: null });
  console.log(
    profile.padEnd(6) +
      '  full: ' + full.toFixed(1).padStart(8) + ' us/tick' +
      '  analysis:null: ' + noAnalysis.toFixed(1).padStart(8) + ' us/tick' +
      '  analysis cost: ' + (full - noAnalysis).toFixed(1).padStart(8) + ' us/tick (' +
      ((1 - noAnalysis / full) * 100).toFixed(0) + '% saved)'
  );
}
