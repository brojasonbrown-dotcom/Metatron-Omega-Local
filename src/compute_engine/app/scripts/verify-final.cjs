const O = require('../electron/omega-bundle.cjs');
const a = new O.EngineHost({ profile: 'PICO', seed: 'mp', modePhase: 0 });
const b = new O.EngineHost({ profile: 'PICO', seed: 'mp', modePhase: 0.5 });
for (let i = 0; i < 64; i++) { a.stepOnce(); b.stepOnce(); }
console.log('modePhase wired via bundle:', a.snapshot().digest !== b.snapshot().digest ? 'YES (rotation bent)' : 'NO');
const c = new O.EngineHost({ profile: 'PICO', seed: 'rhuf', drive: 0.618 });
for (let i = 0; i < 2000; i++) c.stepOnce();
console.log('rhufSkill (bundle):', (c.snapshot().rhufSkill * 100).toFixed(1) + '%');
