// Measure per-rung + per-tick compute cost to answer "worker per toroid?" with data.
const O = require('../electron/omega-bundle.cjs');

for (const profile of ['PICO','NANO','MICRO','MESO','MACRO','GRAND']) {
  const h = new O.EngineHost({ profile, seed: 'bench' });
  const rungs = h.snapshot().rungs.length;
  const totalNodes = h.snapshot().totalNodes;
  // warm up
  for (let i = 0; i < 200; i++) h.stepOnce();
  const N = 2000;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < N; i++) h.stepOnce();
  const dt = Number(process.hrtime.bigint() - t0) / 1e6; // ms
  const usPerTick = (dt * 1000) / N;
  const usPerRung = usPerTick / rungs;
  console.log(`${profile.padEnd(6)} rungs=${String(rungs).padStart(2)} nodes=${String(totalNodes).padStart(7)}  ${(N*1000/dt).toFixed(0).padStart(9)} ticks/s  ${usPerTick.toFixed(1).padStart(7)} us/tick  ${usPerRung.toFixed(2).padStart(6)} us/rung`);
}
