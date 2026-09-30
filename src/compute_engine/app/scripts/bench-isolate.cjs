// Isolate the engine tick from the observe-only fold stack (measure/mind/memory/perception/analysis).
const O = require('../electron/omega-bundle.cjs');

for (const profile of ['MESO', 'MACRO']) {
  // Raw engine: MultiTorusEngine.step() with NO host folds.
  const host = new O.EngineHost({ profile, seed: 'bench' });
  const snap = host.snapshot();
  const rungs = snap.rungs.length;

  // Raw engine step via a fresh MultiTorusEngine (same geometry).
  const ladder = Array.from({ length: rungs }, (_, r) => ({ n: r, qrf: 1 }));
  const eng = new O.MultiTorusEngine({ rungs: ladder, nodes: snap.nodes.map((n) => n), seed: 'bench' });
  for (let i = 0; i < 50; i++) eng.step();
  let t0 = process.hrtime.bigint();
  for (let i = 0; i < 1000; i++) eng.step();
  const engUs = Number(process.hrtime.bigint() - t0) / 1e6 / 1000 * 1000; // us/tick

  // Full stepOnce (engine + all folds).
  for (let i = 0; i < 50; i++) host.stepOnce();
  t0 = process.hrtime.bigint();
  const N = 300;
  for (let i = 0; i < N; i++) host.stepOnce();
  const stepUs = Number(process.hrtime.bigint() - t0) / 1e6 / N * 1000;

  console.log(
    profile.padEnd(6) +
      '  raw engine: ' + engUs.toFixed(1).padStart(7) + ' us/tick' +
      '  full stepOnce: ' + stepUs.toFixed(1).padStart(8) + ' us/tick' +
      '  fold overhead: ' + (stepUs - engUs).toFixed(1).padStart(8) + ' us/tick (' +
      ((1 - engUs / stepUs) * 100).toFixed(0) + '% folds)'
  );
}
