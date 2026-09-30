// Measure the wall-clock cost of each view the state() path recomputes. Every
// number is a real timing of the live host's methods (MICRO profile, the honest
// auto-selected profile).
const O = require('../electron/omega-bundle.cjs');

const h = new O.EngineHost({ profile: 'MICRO', seed: 'bench-views' });
h.start();
for (let i = 0; i < 1500; i++) h.stepOnce();

const time = (name, fn) => {
  const t0 = process.hrtime.bigint();
  let r;
  try { r = fn(); } catch (e) { r = 'ERR:' + e.message; }
  const dt = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`${name.padEnd(20)} ${dt.toFixed(2)} ms  ${typeof r === 'string' ? r : ''}`);
};

time('snapshot()', () => h.snapshot());
time('memory()', () => h.memory());
time('cognition()', () => h.cognition());
time('lexiconView()', () => h.lexiconView());
time('relationsView()', () => h.relationsView());
time('deepReflect()', () => h.deepReflect());
time('describe()', () => h.describe());
time('web()', () => h.web());
time('spectral(0)', () => h.spectral(0));
time('organSnapshot()', () => h.organSnapshot());
time('learnState()', () => h.learnState());
time('scan(0)', () => h.scan(0));
time('perception()', () => h.perception());
time('sense()', () => h.sense());
h.stop();
